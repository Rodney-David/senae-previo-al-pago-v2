import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { calculateTramiteSLA } from "@/lib/slaCalculator";

export const dynamic = "force-dynamic";

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const idTramite = parseInt(params.id, 10);
    if (isNaN(idTramite)) {
      return NextResponse.json({ error: "ID de trámite inválido" }, { status: 400 });
    }

    const tramite = await prisma.tramites.findUnique({
      where: { id_tramite: idTramite },
      include: {
        tipos_tramite: true,
        areas: true,
        usuarios: true,
        tramite_referencias: {
          include: {
            usuarios: true,
          },
          orderBy: { created_at: "desc" },
        },
        historial_movimientos: {
          include: {
            usuarios_historial_movimientos_id_usuario_entregaTousuarios: true,
            usuarios_historial_movimientos_id_usuario_recibeTousuarios: true,
            areas_historial_movimientos_id_area_origenToareas: true,
            areas_historial_movimientos_id_area_destinoToareas: true,
          },
          orderBy: { fecha_hora: "desc" },
        },
        observaciones: {
          include: {
            usuarios_observaciones_id_usuario_reportaTousuarios: true,
            areas: true,
          },
          orderBy: { fecha_reporte: "desc" },
        },
      },
    });

    if (!tramite) {
      return NextResponse.json({ error: "Trámite no encontrado" }, { status: 404 });
    }

    // Calcular SLA
    const sla = await calculateTramiteSLA(tramite);

    return NextResponse.json({
      tramite: {
        ...tramite,
        sla,
      },
    });
  } catch (error) {
    console.error("Error fetching tramite detail:", error);
    return NextResponse.json(
      { error: "Error al consultar el expediente del trámite" },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const idTramite = parseInt(params.id, 10);
    if (isNaN(idTramite)) {
      return NextResponse.json({ error: "ID inválido" }, { status: 400 });
    }

    const body = await request.json();
    const {
      id_usuario,
      rol,
      tipo_flujo,
      numero_quipux,
      fecha_memorando,
      fecha_recepcion_fisica,
      id_tipo_tramite,
      proveedor_beneficiario,
      ruc_proveedor,
      monto_total,
      numero_liquidacion,
      numero_juicio,
    } = body;

    // RBAC: Solo DFI (roles 1, 2), Presupuesto (roles 3, 4) y Admin (rol 10) pueden modificar datos generales
    const rolesPermitidos = [
      "ADMINISTRADOR",
      "DIRECTORA_FINANCIERA",
      "SECRETARIA_DFI",
      "JEFE_PRESUPUESTO",
      "ANALISTA_PRESUPUESTO",
    ];
    if (rol && !rolesPermitidos.includes(rol)) {
      return NextResponse.json(
        { error: "Su rol no tiene autorización para modificar los datos generales del trámite (Solo Lectura)." },
        { status: 403 }
      );
    }

    const tramiteAnterior = await prisma.tramites.findUnique({
      where: { id_tramite: idTramite },
    });
    if (!tramiteAnterior) {
      return NextResponse.json({ error: "Trámite no encontrado" }, { status: 404 });
    }

    const montoNum = monto_total !== undefined ? Number(monto_total) : undefined;
    const esAlta = montoNum !== undefined ? montoNum >= 10000 : undefined;

    const datosNuevos: Record<string, any> = {
      ...(tipo_flujo && { tipo_flujo }),
      ...(numero_quipux && { numero_quipux }),
      ...(fecha_memorando && { fecha_memorando: new Date(fecha_memorando) }),
      ...(fecha_recepcion_fisica && {
        fecha_recepcion_fisica: new Date(fecha_recepcion_fisica),
      }),
      ...(id_tipo_tramite && { id_tipo_tramite: Number(id_tipo_tramite) }),
      ...(proveedor_beneficiario && { proveedor_beneficiario }),
      ...(ruc_proveedor !== undefined && { ruc_proveedor }),
      ...(montoNum !== undefined && { monto_total: montoNum }),
      ...(esAlta !== undefined && { es_alta_cuantia: esAlta }),
      ...(numero_liquidacion !== undefined && { numero_liquidacion }),
      ...(numero_juicio !== undefined && { numero_juicio }),
    };

    const tramiteActualizado = await prisma.tramites.update({
      where: { id_tramite: idTramite },
      data: {
        ...datosNuevos,
        fecha_ultimo_movimiento: new Date(),
        fecha_ultima_modificacion: new Date(),
      },
    });

    // Calcular diff forense institucional
    const { computeAuditDiff } = await import("@/lib/auditDiff");
    const diff = computeAuditDiff(tramiteAnterior as any, datosNuevos);

    // Registrar en historial_movimientos con detalle forense
    try {
      await prisma.historial_movimientos.create({
        data: {
          id_tramite: idTramite,
          id_usuario_entrega: id_usuario ? Number(id_usuario) : 1,
          id_usuario_recibe: id_usuario ? Number(id_usuario) : 1,
          id_area_origen: tramiteActualizado.id_area_actual || 1,
          id_area_destino: tramiteActualizado.id_area_actual || 1,
          tipo_accion: "MODIFICACION_DATOS_GENERALES",
          comentarios: `Modificación de datos por ${rol || "AUTORIZADO"}. ${diff.resumenTexto}`,
        },
      });
    } catch (bitErr) {
      console.error("Error creating historial entry:", bitErr);
    }

    return NextResponse.json({
      success: true,
      tramite: tramiteActualizado,
      auditoria_diff: diff.cambios,
    });
  } catch (error: any) {
    console.error("Error actualizando trámite:", error);
    return NextResponse.json(
      { error: error?.message || "Error al modificar el trámite" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const idTramite = parseInt(params.id, 10);
    if (isNaN(idTramite)) {
      return NextResponse.json({ error: "ID inválido" }, { status: 400 });
    }

    const { searchParams } = new URL(request.url);
    const rol = searchParams.get("rol");

    // RBAC: Solo DFI (Director/Secretaria) y Admin pueden anular/eliminar un trámite
    const rolesPermitidos = ["ADMINISTRADOR", "DIRECTORA_FINANCIERA", "SECRETARIA_DFI"];
    if (rol && !rolesPermitidos.includes(rol)) {
      return NextResponse.json(
        { error: "Solo Dirección Financiera o Administración pueden eliminar o anular trámites." },
        { status: 403 }
      );
    }

    // Marcar como anulado o eliminar
    await prisma.tramites.update({
      where: { id_tramite: idTramite },
      data: {
        estado_general: "ANULADO",
        sub_estado: "ELIMINADO_POR_USUARIO",
        fecha_ultimo_movimiento: new Date(),
      },
    });

    return NextResponse.json({ success: true, message: "Trámite marcado como ANULADO correctamente" });
  } catch (error) {
    console.error("Error eliminando trámite:", error);
    return NextResponse.json({ error: "Error al eliminar el trámite" }, { status: 500 });
  }
}
