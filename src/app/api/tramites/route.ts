import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { TramiteService } from "@/services/tramiteService";
import { calculateTramiteSLA } from "@/lib/slaCalculator";
import { getAuthenticatedUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const tipo = searchParams.get("tipo") || "todos";
    const search = searchParams.get("search") || "";

    // Obtener datos del usuario real autenticado
    const currentUser = await getAuthenticatedUser(request);
    if (!currentUser) {
      return NextResponse.json({ error: "No autorizado. Sesión requerida." }, { status: 401 });
    }

    const whereClause: Record<string, unknown> = {};

    if (search.trim()) {
      whereClause.OR = [
        { codigo_tramite: { contains: search.trim() } },
        { numero_quipux: { contains: search.trim() } },
        { proveedor_beneficiario: { contains: search.trim() } },
        { ruc_proveedor: { contains: search.trim() } },
        { numero_factura: { contains: search.trim() } },
      ];
    }

    if (tipo === "escritorio" && currentUser) {
      // Trámites asignados directamente al usuario o a su departamento si es jefe
      if (currentUser.rol === "ADMIN") {
        // Admin ve todos
      } else if (currentUser.rol === "JEFE" || currentUser.rol === "DIRECTORA") {
        whereClause.OR = [
          { id_custodio_actual: currentUser.id_usuario },
          { id_area_actual: currentUser.id_area },
        ];
      } else {
        whereClause.id_custodio_actual = currentUser.id_usuario;
      }
    } else if (tipo === "observados") {
      whereClause.estado_general = "OBSERVADO_72H";
    } else if (tipo === "pausados") {
      whereClause.esta_pausado = true;
    } else if (tipo === "finalizados") {
      whereClause.estado_general = "FINALIZADO_ARCHIVADO";
    }

    // Consulta ordenada estrictamente por fecha_ultimo_movimiento DESC (prioridad por Última Novedad)
    const tramites = await prisma.tramites.findMany({
      where: whereClause,
      include: {
        areas: true,
        usuarios: true,
        tipos_tramite: true,
      },
      orderBy: {
        fecha_ultimo_movimiento: "desc",
      },
    });

    // Calcular SLA para cada trámite
    const tramitesConSLA = await Promise.all(
      tramites.map(async (t) => {
        const sla = await calculateTramiteSLA(t);
        return {
          ...t,
          sla,
        };
      })
    );

    return NextResponse.json({ tramites: tramitesConSLA });
  } catch (error) {
    console.error("Error fetching tramites:", error);
    return NextResponse.json(
      { error: "Error al consultar los trámites" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const currentUser = await getAuthenticatedUser(request);
    if (!currentUser) {
      return NextResponse.json({ error: "No autorizado. Sesión requerida para registrar trámites." }, { status: 401 });
    }
    const currentUserId = currentUser.id_usuario;

    const body = await request.json();

    const {
      tipo_gestion,
      numero_quipux,
      fecha_memorando,
      fecha_recepcion_fisica,
      id_tipo_tramite,
      proveedor_beneficiario,
      ruc_proveedor,
      subtotal,
      monto_iva,
      monto_retenciones,
      monto_multas,
      monto_total,
      numero_factura,
      fecha_factura,
      comentarios,
    } = body;

    if (!numero_quipux || !id_tipo_tramite || !proveedor_beneficiario || monto_total === undefined) {
      return NextResponse.json(
        { error: "Faltan campos obligatorios para el ingreso del trámite" },
        { status: 400 }
      );
    }

    const nuevoTramite = await TramiteService.crearTramite({
      tipo_gestion: tipo_gestion || "PAGO",
      numero_quipux,
      fecha_memorando,
      fecha_recepcion_fisica,
      id_tipo_tramite: Number(id_tipo_tramite),
      proveedor_beneficiario,
      ruc_proveedor,
      subtotal: subtotal ? Number(subtotal) : undefined,
      monto_iva: monto_iva ? Number(monto_iva) : undefined,
      monto_retenciones: monto_retenciones ? Number(monto_retenciones) : undefined,
      monto_multas: monto_multas ? Number(monto_multas) : undefined,
      monto_total: Number(monto_total),
      numero_factura,
      fecha_factura,
      id_usuario_creador: currentUserId,
      comentarios,
    });

    return NextResponse.json({ success: true, tramite: nuevoTramite }, { status: 201 });
  } catch (error: any) {
    console.error("Error creating tramite:", error);
    return NextResponse.json(
      { error: error?.message || "Error al crear el trámite en recepción" },
      { status: 500 }
    );
  }
}
