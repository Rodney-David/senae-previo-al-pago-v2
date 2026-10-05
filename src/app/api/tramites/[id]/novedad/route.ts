import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { registrarBitacora } from "@/services/bitacoraService";
import { getAuthenticatedUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const idTramite = parseInt(params.id, 10);
    if (isNaN(idTramite)) {
      return NextResponse.json({ error: "ID de trámite inválido" }, { status: 400 });
    }

    const currentUser = await getAuthenticatedUser(request);
    if (!currentUser) {
      return NextResponse.json({ error: "No autorizado. Sesión inválida o expirada." }, { status: 401 });
    }
    const currentUserId = currentUser.id_usuario;

    const tramite = await prisma.tramites.findUnique({
      where: { id_tramite: idTramite },
    });
    if (!tramite) {
      return NextResponse.json({ error: "Trámite no encontrado" }, { status: 404 });
    }

    const body = await request.json();
    const { tipo, motivo, id_area_destino, id_observacion, respuesta, memo_quipux } = body;
    const now = new Date();

    if (tipo === "OBSERVAR_72H") {
      if (!motivo) {
        return NextResponse.json(
          { error: "Debe ingresar el motivo de la observación preventiva" },
          { status: 400 }
        );
      }

      const areaDestino = id_area_destino ? Number(id_area_destino) : 1;

      // Crear registro de observación
      const obs = await prisma.observaciones.create({
        data: {
          id_tramite: idTramite,
          id_area_origen: currentUser.id_area,
          id_usuario_origen: currentUserId,
          id_area_destino: areaDestino,
          id_area_reporta: currentUser.id_area,
          id_usuario_reporta: currentUserId,
          detalle_observacion: motivo,
          estado_observacion: "PENDIENTE",
          fecha_reporte: now,
        },
      });

      // Actualizar trámite
      await prisma.tramites.update({
        where: { id_tramite: idTramite },
        data: {
          estado_general: "OBSERVADO_72H",
          sub_estado: "EN_ESPERA_SUBSANACION_72H",
          id_area_actual: areaDestino,
          fecha_ultimo_movimiento: now,
          fecha_ultima_modificacion: now,
        },
      });

      await registrarBitacora({
        id_tramite: idTramite,
        id_usuario_entrega: currentUserId,
        id_usuario_recibe: currentUserId,
        id_area_origen: currentUser.id_area,
        id_area_destino: areaDestino,
        tipo_accion: "OBSERVACION_PREVENTIVA_72H",
        comentarios: `Observación preventiva (plazo 72h) emitida por ${currentUser.nombre_completo}. Motivo: ${motivo}`,
      });

      return NextResponse.json({ success: true, observacion: obs });
    } else if (tipo === "SUBSANAR_OBSERVACION") {
      if (!id_observacion || !respuesta) {
        return NextResponse.json(
          { error: "Debe proporcionar la respuesta y el ID de observación" },
          { status: 400 }
        );
      }

      const obs = await prisma.observaciones.findUnique({
        where: { id_observacion: Number(id_observacion) },
      });
      if (!obs) {
        return NextResponse.json({ error: "Observación no encontrada" }, { status: 404 });
      }

      // Actualizar observación
      await prisma.observaciones.update({
        where: { id_observacion: obs.id_observacion },
        data: {
          estado_observacion: "SUBSANADO",
          respuesta_observacion: respuesta,
          id_usuario_responde: currentUserId,
          fecha_respuesta: now,
          fecha_resolucion: now,
        },
      });

      // Retornar trámite al área y usuario que reportó
      await prisma.tramites.update({
        where: { id_tramite: idTramite },
        data: {
          estado_general: "EN_GESTION",
          sub_estado: "OBSERVACION_SUBSANADA",
          id_area_actual: obs.id_area_reporta,
          id_custodio_actual: obs.id_usuario_reporta,
          fecha_ultimo_movimiento: now,
          fecha_ultima_modificacion: now,
        },
      });

      await registrarBitacora({
        id_tramite: idTramite,
        id_usuario_entrega: currentUserId,
        id_usuario_recibe: obs.id_usuario_reporta,
        id_area_origen: currentUser.id_area,
        id_area_destino: obs.id_area_reporta,
        tipo_accion: "SUBSANACION_DE_OBSERVACION",
        comentarios: `Observación atendida y subsanada por ${currentUser.nombre_completo}. Respuesta: ${respuesta}. Retorna a quien observó.`,
      });

      return NextResponse.json({ success: true });
    } else if (tipo === "DEVOLUCION_FORMAL") {
      if (!memo_quipux || !motivo) {
        return NextResponse.json(
          { error: "El número de Memorando Quipux y la justificación son obligatorios para la devolución formal" },
          { status: 400 }
        );
      }

      const areaDestino = id_area_destino ? Number(id_area_destino) : 1;

      // Registrar referencia Quipux
      await prisma.tramite_referencias.create({
        data: {
          id_tramite: idTramite,
          tipo_documento: "MEMORANDO_DEVOLUCION",
          numero_documento: memo_quipux,
          fecha_documento: now,
          asunto_sumilla: `Devolución formal: ${motivo}`,
          id_usuario_registro: currentUserId,
        },
      });

      // Actualizar trámite (Pausar el cómputo de SLA mientras se encuentra devuelto)
      await prisma.tramites.update({
        where: { id_tramite: idTramite },
        data: {
          estado_general: "DEVUELTO_FORMALMENTE",
          sub_estado: "DEVUELTO_CON_MEMORANDO_QUIPUX",
          es_devuelto: true,
          esta_pausado: true,
          fecha_pausa: now,
          motivo_pausa: `Expediente devuelto formalmente mediante Memo Quipux ${memo_quipux}`,
          motivo_devolucion: `[Memo ${memo_quipux}] ${motivo}`,
          id_area_actual: areaDestino,
          fecha_ultimo_movimiento: now,
          fecha_ultima_modificacion: now,
        },
      });

      await registrarBitacora({
        id_tramite: idTramite,
        id_usuario_entrega: currentUserId,
        id_usuario_recibe: currentUserId,
        id_area_origen: currentUser.id_area,
        id_area_destino: areaDestino,
        tipo_accion: "DEVOLUCION_FORMAL_QUIPUX",
        comentarios: `Devolución formal emitida mediante Memo Quipux Nro: ${memo_quipux}. Justificación: ${motivo}`,
      });

      return NextResponse.json({ success: true });
    } else {
      return NextResponse.json({ error: "Tipo de novedad no soportado" }, { status: 400 });
    }
  } catch (error: any) {
    console.error("Error processing novedad:", error);
    return NextResponse.json(
      { error: error?.message || "Error al procesar la novedad del trámite" },
      { status: 500 }
    );
  }
}
