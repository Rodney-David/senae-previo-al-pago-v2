import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthenticatedUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const currentUser = await getAuthenticatedUser(request);
    if (!currentUser) {
      return NextResponse.json({ error: "Sesión requerida" }, { status: 401 });
    }

    const idCaja = parseInt(params.id, 10);
    if (isNaN(idCaja)) {
      return NextResponse.json({ error: "ID de caja inválido" }, { status: 400 });
    }

    const caja = await prisma.cajas.findUnique({
      where: { id_caja: idCaja },
    });

    if (!caja) {
      return NextResponse.json({ error: "Caja no encontrada" }, { status: 404 });
    }

    const userRole = (currentUser.rol || "").toUpperCase();
    const isAdminOrDFI = currentUser.id_area === 1 || userRole === "ADMIN" || userRole === "DIRECTORA";
    const isAdmCaja = currentUser.id_area === 4 || userRole.includes("TESOR") || userRole.includes("CAJA") || isAdminOrDFI;

    if (!isAdmCaja) {
      return NextResponse.json(
        { error: "La asignación y retiro de expedientes de las cajas es exclusiva de Administración de Caja." },
        { status: 403 }
      );
    }

    if (caja.estado !== "ABIERTA") {
      return NextResponse.json(
        { error: `Esta caja se encuentra en estado "${caja.estado}". Para agregar o retirar trámites debe estar ABIERTA (puede reabrirla si está CERRADA).` },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { accion, id_tramite, ids_tramites } = body;

    const idsParaProcesar: number[] = [];
    if (Array.isArray(ids_tramites)) {
      idsParaProcesar.push(...ids_tramites.map((id: any) => Number(id)).filter(Boolean));
    } else if (id_tramite) {
      idsParaProcesar.push(Number(id_tramite));
    }

    if (idsParaProcesar.length === 0) {
      return NextResponse.json(
        { error: "Debe especificar al menos un trámite para la operación" },
        { status: 400 }
      );
    }

    const now = new Date();

    if (accion === "ASIGNAR") {
      // Regla de negocio estricta: Únicamente en estado PAGADO puede llegar a almacenarse en una caja!
      const tramitesValidos = await prisma.tramites.findMany({
        where: {
          id_tramite: { in: idsParaProcesar },
          estado_general: "PAGADO",
        },
      });

      if (tramitesValidos.length === 0) {
        return NextResponse.json(
          { error: "Los trámites seleccionados no se encuentran en estado PAGADO o ya están en otra caja." },
          { status: 400 }
        );
      }

      for (const t of tramitesValidos) {
        await prisma.tramites.update({
          where: { id_tramite: t.id_tramite },
          data: {
            id_caja: caja.id_caja,
            codigo_tomo_caja: caja.codigo_caja,
            estado_general: "CAJA",
            sub_estado: "EN_CAJA",
            fecha_ultimo_movimiento: now,
            fecha_ultima_modificacion: now,
          },
        });

        await prisma.historial_movimientos.create({
          data: {
            id_tramite: t.id_tramite,
            id_usuario_entrega: currentUser.id_usuario,
            id_usuario_recibe: currentUser.id_usuario,
            id_area_origen: 4, // ADM CAJA
            id_area_destino: 4, // Permanece en ADM CAJA física
            tipo_accion: "ALMACENADO_EN_CAJA",
            comentarios: `Trámite almacenado físicamente en caja: "${caja.codigo_caja}". Semáforo SLA finalizado.`,
          },
        });
      }

      return NextResponse.json({
        message: `${tramitesValidos.length} trámite(s) asignados a la caja "${caja.codigo_caja}".`,
        total_asignados: tramitesValidos.length,
      });
    } else if (accion === "REMOVER") {
      // Remover trámite de la caja abierta
      for (const idTr of idsParaProcesar) {
        await prisma.tramites.update({
          where: { id_tramite: idTr },
          data: {
            id_caja: null,
            codigo_tomo_caja: null,
            estado_general: "PAGADO",
            sub_estado: "PAGADO_EN_CUSTODIA_CAJA",
            fecha_ultimo_movimiento: now,
            fecha_ultima_modificacion: now,
          },
        });

        await prisma.historial_movimientos.create({
          data: {
            id_tramite: idTr,
            id_usuario_entrega: currentUser.id_usuario,
            id_usuario_recibe: currentUser.id_usuario,
            id_area_origen: 4,
            id_area_destino: 4,
            tipo_accion: "REMOVIDO_DE_CAJA",
            comentarios: `Trámite removido de la caja: "${caja.codigo_caja}". Regresa a estado PAGADO libre.`,
          },
        });
      }

      return NextResponse.json({
        message: `${idsParaProcesar.length} trámite(s) removidos de la caja "${caja.codigo_caja}".`,
      });
    }

    return NextResponse.json({ error: "Acción no soportada" }, { status: 400 });
  } catch (error: any) {
    console.error("Error en POST /api/cajas/[id]/tramites:", error);
    return NextResponse.json(
      { error: "Error al modificar trámites en la caja" },
      { status: 500 }
    );
  }
}
