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
      include: { tramites: true },
    });

    if (!caja) {
      return NextResponse.json({ error: "Caja no encontrada" }, { status: 404 });
    }

    if (caja.estado === "ARCHIVADA") {
      return NextResponse.json(
        { error: "Esta caja ya fue archivada previamente." },
        { status: 400 }
      );
    }

    if (caja.tramites.length === 0) {
      return NextResponse.json(
        { error: "No se puede archivar una caja vacía. Asigne al menos un trámite pagado." },
        { status: 400 }
      );
    }

    const now = new Date();

    // Obtener custodio del Archivo Contable
    const archivero = await prisma.usuarios.findFirst({
      where: { id_area: 6, activo: true },
    });
    const idArchivero = archivero?.id_usuario || 10;

    // 1. Cerrar caja
    await prisma.cajas.update({
      where: { id_caja: idCaja },
      data: {
        estado: "ARCHIVADA",
        fecha_cierre: now,
      },
    });

    // 2. Marcar todos los trámites dentro de la caja como ARCHIVO y transferir a Archivo Central
    await prisma.tramites.updateMany({
      where: { id_caja: idCaja },
      data: {
        estado_general: "ARCHIVO",
        sub_estado: "ARCHIVADO_DEFINITIVO",
        id_area_actual: 6, // ARCHIVO
        id_custodio_actual: idArchivero,
        fecha_ultimo_movimiento: now,
        fecha_ultima_modificacion: now,
      },
    });

    // 3. Registrar bitácora por cada trámite
    for (const t of caja.tramites) {
      await prisma.historial_movimientos.create({
        data: {
          id_tramite: t.id_tramite,
          id_usuario_entrega: currentUser.id_usuario,
          id_usuario_recibe: idArchivero,
          id_area_origen: 4, // ADM CAJA
          id_area_destino: 6, // ARCHIVO
          tipo_accion: "CAJA_ARCHIVADA_DEFINITIVO",
          comentarios: `Caja "${caja.codigo_caja}" cerrada y entregada formalmente al Archivo Central. Trámite pasa a ARCHIVO definitivo.`,
        },
      });
    }

    return NextResponse.json({
      message: `Caja "${caja.codigo_caja}" cerrada con éxito. ${caja.tramites.length} trámite(s) transferidos al ARCHIVO central.`,
      total_archivados: caja.tramites.length,
    });
  } catch (error: any) {
    console.error("Error en POST /api/cajas/[id]/archivar:", error);
    return NextResponse.json(
      { error: "Error al archivar la caja física" },
      { status: 500 }
    );
  }
}
