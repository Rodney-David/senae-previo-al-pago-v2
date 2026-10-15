import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { calculateTramiteSLA } from "@/lib/slaCalculator";
import { getAuthenticatedUser } from "@/lib/auth";

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
        caja: true,
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

    const historial_movimientos = (tramite.historial_movimientos || []).map((m: any) => ({
      id_movimiento: m.id_movimiento,
      id_tramite: m.id_tramite,
      tipo_accion: m.tipo_accion,
      comentarios: m.comentarios,
      fecha_hora: m.fecha_hora,
      id_usuario_entrega: m.id_usuario_entrega,
      id_usuario_recibe: m.id_usuario_recibe,
      id_area_origen: m.id_area_origen,
      id_area_destino: m.id_area_destino,
      usuario_entrega: m.usuarios_historial_movimientos_id_usuario_entregaTousuarios
        ? {
            id_usuario: m.usuarios_historial_movimientos_id_usuario_entregaTousuarios.id_usuario,
            nombre_completo: m.usuarios_historial_movimientos_id_usuario_entregaTousuarios.nombre_completo,
            cargo: m.usuarios_historial_movimientos_id_usuario_entregaTousuarios.cargo,
            rol: m.usuarios_historial_movimientos_id_usuario_entregaTousuarios.rol,
          }
        : null,
      usuario_recibe: m.usuarios_historial_movimientos_id_usuario_recibeTousuarios
        ? {
            id_usuario: m.usuarios_historial_movimientos_id_usuario_recibeTousuarios.id_usuario,
            nombre_completo: m.usuarios_historial_movimientos_id_usuario_recibeTousuarios.nombre_completo,
            cargo: m.usuarios_historial_movimientos_id_usuario_recibeTousuarios.cargo,
            rol: m.usuarios_historial_movimientos_id_usuario_recibeTousuarios.rol,
          }
        : null,
      area_origen: m.areas_historial_movimientos_id_area_origenToareas
        ? {
            id_area: m.areas_historial_movimientos_id_area_origenToareas.id_area,
            nombre: m.areas_historial_movimientos_id_area_origenToareas.nombre,
            codigo: m.areas_historial_movimientos_id_area_origenToareas.codigo,
          }
        : null,
      area_destino: m.areas_historial_movimientos_id_area_destinoToareas
        ? {
            id_area: m.areas_historial_movimientos_id_area_destinoToareas.id_area,
            nombre: m.areas_historial_movimientos_id_area_destinoToareas.nombre,
            codigo: m.areas_historial_movimientos_id_area_destinoToareas.codigo,
          }
        : null,
    }));

    const observaciones = (tramite.observaciones || []).map((o: any) => ({
      ...o,
      usuario_reporta: o.usuarios_observaciones_id_usuario_reportaTousuarios
        ? {
            id_usuario: o.usuarios_observaciones_id_usuario_reportaTousuarios.id_usuario,
            nombre_completo: o.usuarios_observaciones_id_usuario_reportaTousuarios.nombre_completo,
            cargo: o.usuarios_observaciones_id_usuario_reportaTousuarios.cargo,
          }
        : null,
      area_reporta: o.areas
        ? {
            id_area: o.areas.id_area,
            nombre: o.areas.nombre,
            codigo: o.areas.codigo,
          }
        : null,
    }));

    return NextResponse.json({
      tramite: {
        ...tramite,
        historial_movimientos,
        observaciones,
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
      area_requirente,
      ciudad,
      asunto,
      fecha_memorando,
      fecha_recepcion_fisica,
      id_tipo_tramite,
      proveedor_beneficiario,
      ruc_proveedor,
      monto_total,
      numero_liquidacion,
      numero_juicio,
    } = body;

    // RBAC: Solo DFI (Directora, Secretaria), Presupuesto (Jefe, Analista) y Admin pueden modificar datos generales
    const authenticatedUser = await getAuthenticatedUser(request);
    const userRole = (authenticatedUser?.rol || rol || "").toUpperCase();
    const userAreaId = authenticatedUser?.id_area || (body.id_area ? Number(body.id_area) : undefined);

    const isDFI = userAreaId === 1 || ["DIRECTORA", "SECRETARIA", "DIRECTORA_FINANCIERA", "SECRETARIA_DFI"].includes(userRole);
    const isPresupuesto = (userAreaId === 2 && (["JEFE", "ANALISTA"].includes(userRole) || userRole.includes("PRESUPUESTO"))) || ["JEFE_PRESUPUESTO", "ANALISTA_PRESUPUESTO"].includes(userRole);
    const isAdmin = ["ADMIN", "ADMINISTRADOR"].includes(userRole);

    if (!isDFI && !isPresupuesto && !isAdmin) {
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

    const subtotalNum = body.subtotal !== undefined ? Number(body.subtotal) : undefined;
    const montoNum = monto_total !== undefined ? Number(monto_total) : (subtotalNum !== undefined ? subtotalNum : undefined);
    const esAlta = montoNum !== undefined ? montoNum >= 10000 : undefined;

    const datosNuevos: Record<string, any> = {
      ...(tipo_flujo && { tipo_flujo }),
      ...(numero_quipux && { numero_quipux }),
      ...(area_requirente !== undefined && { area_requirente }),
      ...(ciudad !== undefined && { ciudad: ciudad ? String(ciudad).trim() : null }),
      ...(asunto !== undefined && { asunto }),
      ...(fecha_memorando && { fecha_memorando: new Date(fecha_memorando) }),
      ...(fecha_recepcion_fisica && {
        fecha_recepcion_fisica: new Date(fecha_recepcion_fisica),
      }),
      ...(id_tipo_tramite && { id_tipo_tramite: Number(id_tipo_tramite) }),
      ...(proveedor_beneficiario && { proveedor_beneficiario }),
      ...(ruc_proveedor !== undefined && { ruc_proveedor }),
      ...(subtotalNum !== undefined && { subtotal: subtotalNum }),
      ...(montoNum !== undefined && { monto_total: montoNum }),
      ...(esAlta !== undefined && { es_alta_cuantia: esAlta }),
      ...(numero_liquidacion !== undefined && { numero_liquidacion }),
      ...(numero_juicio !== undefined && { numero_juicio }),
      ...(body.padre_gestion && { padre_gestion: body.padre_gestion }),
      ...(body.tipo_gestion && { tipo_gestion: body.tipo_gestion }),
      ...(body.nro_tramite !== undefined && { nro_tramite: body.nro_tramite ? String(body.nro_tramite).trim() : null }),
      ...(body.periodo_pago !== undefined && { periodo_pago: body.periodo_pago ? String(body.periodo_pago).trim() : null }),
      ...(body.numero_cur_compromiso !== undefined && { numero_cur_compromiso: body.numero_cur_compromiso ? String(body.numero_cur_compromiso).trim() : null }),
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

    // RBAC: Solo DFI (Directora, Secretaria) y Admin pueden anular/eliminar un trámite
    const { searchParams } = new URL(request.url);
    const rolParam = searchParams.get("rol");
    const authenticatedUser = await getAuthenticatedUser(request);
    const userRole = (authenticatedUser?.rol || rolParam || "").toUpperCase();
    const userAreaId = authenticatedUser?.id_area;

    const isDFI = userAreaId === 1 || ["DIRECTORA", "SECRETARIA", "DIRECTORA_FINANCIERA", "SECRETARIA_DFI"].includes(userRole);
    const isAdmin = ["ADMIN", "ADMINISTRADOR"].includes(userRole);

    if (!isDFI && !isAdmin) {
      return NextResponse.json(
        { error: "Solo Dirección Financiera (DFI) o Administración pueden eliminar o anular trámites." },
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
