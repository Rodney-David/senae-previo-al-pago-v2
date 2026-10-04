import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { registrarBitacora } from "@/services/bitacoraService";

export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const idTramite = parseInt(params.id, 10);
    if (isNaN(idTramite)) {
      return NextResponse.json({ error: "ID de trámite inválido" }, { status: 400 });
    }

    const solicitudes = await prisma.solicitudes_devolucion.findMany({
      where: { id_tramite: idTramite },
      orderBy: { fecha_solicitud: "desc" },
    });

    return NextResponse.json({ solicitudes });
  } catch (error: any) {
    console.error("Error fetching return requests:", error);
    return NextResponse.json(
      { error: error?.message || "Error al consultar solicitudes de devolución" },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const idTramite = parseInt(params.id, 10);
    if (isNaN(idTramite)) {
      return NextResponse.json({ error: "ID de trámite inválido" }, { status: 400 });
    }

    const userIdCookie = request.cookies.get("senae_simulated_user_id")?.value;
    const currentUserId = userIdCookie ? parseInt(userIdCookie, 10) : 1;

    const currentUser = await prisma.usuarios.findUnique({
      where: { id_usuario: currentUserId },
    });
    if (!currentUser) {
      return NextResponse.json({ error: "Usuario activo no válido" }, { status: 401 });
    }

    const tramite = await prisma.tramites.findUnique({
      where: { id_tramite: idTramite },
      include: { usuarios: true, areas: true },
    });
    if (!tramite) {
      return NextResponse.json({ error: "Trámite no encontrado" }, { status: 404 });
    }

    const body = await request.json();
    const { accion, motivo, id_solicitud, respuesta } = body;
    const now = new Date();

    if (accion === "CREAR_SOLICITUD") {
      if (!motivo || !motivo.trim()) {
        return NextResponse.json(
          { error: "Debe especificar el motivo formal de la solicitud de devolución" },
          { status: 400 }
        );
      }

      if (tramite.id_custodio_actual === currentUserId) {
        return NextResponse.json(
          { error: "Usted ya es el custodio actual de este trámite. Si desea devolverlo use Devolución Formal." },
          { status: 400 }
        );
      }

      const nuevaSolicitud = await prisma.solicitudes_devolucion.create({
        data: {
          id_tramite: idTramite,
          id_area_solicita: currentUser.id_area,
          id_usuario_solicita: currentUserId,
          id_area_custodio: tramite.id_area_actual,
          id_usuario_custodio: tramite.id_custodio_actual,
          motivo_solicitud: motivo.trim(),
          estado_solicitud: "PENDIENTE",
          fecha_solicitud: now,
        },
      });

      await prisma.tramites.update({
        where: { id_tramite: idTramite },
        data: {
          sub_estado: "SOLICITUD_DEVOLUCION_PENDIENTE",
          fecha_ultimo_movimiento: now,
        },
      });

      await registrarBitacora({
        id_tramite: idTramite,
        id_usuario_entrega: currentUserId,
        id_usuario_recibe: tramite.id_custodio_actual,
        id_area_origen: currentUser.id_area,
        id_area_destino: tramite.id_area_actual,
        tipo_accion: "SOLICITUD_DEVOLUCION_INTER_AREA",
        comentarios: `Solicitud de devolución emitida por ${currentUser.nombre_completo}. Motivo: ${motivo.trim()}`,
      });

      return NextResponse.json({ success: true, solicitud: nuevaSolicitud }, { status: 201 });
    } else if (accion === "ACEPTAR_SOLICITUD") {
      if (!id_solicitud) {
        return NextResponse.json({ error: "ID de solicitud requerido" }, { status: 400 });
      }

      const sol = await prisma.solicitudes_devolucion.findUnique({
        where: { id_solicitud: Number(id_solicitud) },
      });
      if (!sol) {
        return NextResponse.json({ error: "Solicitud no encontrada" }, { status: 404 });
      }

      await prisma.solicitudes_devolucion.update({
        where: { id_solicitud: sol.id_solicitud },
        data: {
          estado_solicitud: "ACEPTADA",
          respuesta_solicitud: respuesta || "Solicitud de devolución aceptada formalmente",
          fecha_respuesta: now,
        },
      });

      // Mover el trámite de regreso al área y usuario que solicitó
      const tramiteActualizado = await prisma.tramites.update({
        where: { id_tramite: idTramite },
        data: {
          id_area_actual: sol.id_area_solicita,
          id_custodio_actual: sol.id_usuario_solicita,
          es_devuelto: true,
          motivo_devolucion: `Devuelto a solicitud: ${sol.motivo_solicitud}`,
          estado_general: "DEVUELTO_FORMALMENTE",
          sub_estado: "RETORNO_POR_SOLICITUD_ACEPTADA",
          fecha_ultimo_movimiento: now,
          fecha_ultima_modificacion: now,
        },
      });

      await registrarBitacora({
        id_tramite: idTramite,
        id_usuario_entrega: currentUserId,
        id_usuario_recibe: sol.id_usuario_solicita,
        id_area_origen: tramite.id_area_actual,
        id_area_destino: sol.id_area_solicita,
        tipo_accion: "DEVOLUCION_POR_SOLICITUD_ACEPTADA",
        comentarios: `Custodio aceptó devolver el trámite. Retorna a usuario ${sol.id_usuario_solicita}. Respuesta: ${
          respuesta || "Aceptada"
        }`,
      });

      return NextResponse.json({ success: true, tramite: tramiteActualizado });
    } else if (accion === "RECHAZAR_SOLICITUD") {
      if (!id_solicitud || !respuesta) {
        return NextResponse.json(
          { error: "ID de solicitud y justificación del rechazo son obligatorios" },
          { status: 400 }
        );
      }

      const sol = await prisma.solicitudes_devolucion.findUnique({
        where: { id_solicitud: Number(id_solicitud) },
      });
      if (!sol) {
        return NextResponse.json({ error: "Solicitud no encontrada" }, { status: 404 });
      }

      await prisma.solicitudes_devolucion.update({
        where: { id_solicitud: sol.id_solicitud },
        data: {
          estado_solicitud: "RECHAZADA",
          respuesta_solicitud: respuesta.trim(),
          fecha_respuesta: now,
        },
      });

      await prisma.tramites.update({
        where: { id_tramite: idTramite },
        data: {
          sub_estado: "SOLICITUD_DEVOLUCION_DENEGADA",
          fecha_ultimo_movimiento: now,
        },
      });

      await registrarBitacora({
        id_tramite: idTramite,
        id_usuario_entrega: currentUserId,
        id_usuario_recibe: sol.id_usuario_solicita,
        id_area_origen: tramite.id_area_actual,
        id_area_destino: sol.id_area_solicita,
        tipo_accion: "SOLICITUD_DEVOLUCION_RECHAZADA",
        comentarios: `Custodio rechazó solicitud de devolución. Justificación: ${respuesta.trim()}`,
      });

      return NextResponse.json({ success: true });
    } else {
      return NextResponse.json({ error: "Acción no reconocida" }, { status: 400 });
    }
  } catch (error: any) {
    console.error("Error managing return request:", error);
    return NextResponse.json(
      { error: error?.message || "Error al procesar la solicitud de devolución" },
      { status: 500 }
    );
  }
}
