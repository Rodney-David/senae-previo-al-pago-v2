import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { registrarBitacora } from "@/services/bitacoraService";

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

    const userIdCookie = request.cookies.get("senae_simulated_user_id")?.value;
    const currentUserId = userIdCookie ? parseInt(userIdCookie, 10) : 1;

    const currentUser = await prisma.usuarios.findUnique({
      where: { id_usuario: currentUserId },
    });
    if (!currentUser) {
      return NextResponse.json({ error: "Usuario activo no autenticado" }, { status: 401 });
    }

    const tramite = await prisma.tramites.findUnique({
      where: { id_tramite: idTramite },
      include: {
        areas: true,
      },
    });
    if (!tramite) {
      return NextResponse.json({ error: "Trámite no encontrado" }, { status: 404 });
    }

    if (!tramite.es_devuelto && tramite.estado_general !== "DEVUELTO_FORMALMENTE") {
      return NextResponse.json(
        { error: "El trámite no se encuentra en estado de devolución formal." },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { memo_alcance, detalle } = body;

    if (!memo_alcance || typeof memo_alcance !== "string" || !memo_alcance.trim()) {
      return NextResponse.json(
        { error: "El Número Oficial de Memorando de Alcance Quipux es obligatorio." },
        { status: 400 }
      );
    }

    if (!detalle || typeof detalle !== "string" || !detalle.trim()) {
      return NextResponse.json(
        { error: "Debe ingresar el detalle de los justificativos o alcances presentados." },
        { status: 400 }
      );
    }

    const now = new Date();

    // 1. Encontrar el movimiento de devolución previo para retornar al analista/área de origen
    const ultimoMovDevolucion = await prisma.historial_movimientos.findFirst({
      where: {
        id_tramite: idTramite,
        tipo_accion: "DEVOLUCION_FORMAL_QUIPUX",
      },
      orderBy: { fecha_hora: "desc" },
    });

    const idAreaRetorno = ultimoMovDevolucion?.id_area_origen || 2; // Default a Presupuesto
    const idCustodioRetorno = ultimoMovDevolucion?.id_usuario_entrega || 4; // Default a Analista Presupuesto

    // 2. Calcular días pausados para agregarlos al acumulador de pausa de SLA
    let diasPausadosSumar = 0;
    if (tramite.fecha_pausa) {
      const diffMs = now.getTime() - new Date(tramite.fecha_pausa).getTime();
      diasPausadosSumar = Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));
    }
    const diasAcumulados = (tramite.dias_pausa_acumulados || 0) + diasPausadosSumar;

    // 3. Registrar Memorando de Alcance en tramite_referencias
    await prisma.tramite_referencias.create({
      data: {
        id_tramite: idTramite,
        tipo_documento: "MEMORANDO_ALCANCE",
        numero_documento: memo_alcance.trim().toUpperCase(),
        fecha_documento: now,
        asunto_sumilla: `Memorando de Alcance (Reingreso): ${detalle.trim()}`,
        id_usuario_registro: currentUserId,
      },
    });

    // 4. Actualizar el trámite para reactivarlo en el flujo activo
    const tramiteReingresado = await prisma.tramites.update({
      where: { id_tramite: idTramite },
      data: {
        es_devuelto: false,
        motivo_devolucion: null,
        esta_pausado: false,
        fecha_pausa: null,
        motivo_pausa: null,
        dias_pausa_acumulados: diasAcumulados,
        estado_general: "EN_GESTION",
        sub_estado: "REINGRESADO_POR_ALCANCE",
        id_area_actual: idAreaRetorno,
        id_custodio_actual: idCustodioRetorno,
        fecha_ultimo_movimiento: now,
        fecha_ultima_modificacion: now,
      },
    });

    // 5. Registrar en la bitácora institucional (historial_movimientos)
    await registrarBitacora({
      id_tramite: idTramite,
      id_usuario_entrega: currentUserId,
      id_usuario_recibe: idCustodioRetorno,
      id_area_origen: currentUser.id_area,
      id_area_destino: idAreaRetorno,
      tipo_accion: "REINGRESO_POR_ALCANCE",
      comentarios: `Expediente reingresado mediante Memorando de Alcance Quipux Nro: ${memo_alcance.trim().toUpperCase()}. Subsanación: ${detalle.trim()}. Semáforo reactivado (pausa acumulada: ${diasAcumulados} días). Retorna a área de revisión asignada.`,
    });

    return NextResponse.json({
      success: true,
      mensaje: "Trámite reingresado exitosamente por Memorando de Alcance.",
      tramite: tramiteReingresado,
    });
  } catch (error: any) {
    console.error("Error al procesar reingreso por alcance:", error);
    return NextResponse.json(
      { error: error?.message || "Error al registrar el reingreso por alcance" },
      { status: 500 }
    );
  }
}
