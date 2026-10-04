import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

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

    const tramite = await prisma.tramites.findUnique({
      where: { id_tramite: idTramite },
      include: { tipos_tramite: true },
    });

    if (!tramite) {
      return NextResponse.json({ error: "Trámite no encontrado" }, { status: 404 });
    }

    // Obtener requisitos configurados para este tipo de trámite
    let requisitos = await prisma.requisitos_checklist.findMany({
      where: {
        id_tipo_tramite: tramite.id_tipo_tramite,
        activo: true,
      },
      orderBy: { orden: "asc" },
    });

    // Si este tipo específico no tiene requisitos, buscar los requisitos generales de contratación
    if (requisitos.length === 0) {
      const tipoGeneral = await prisma.tipos_tramite.findFirst({
        where: { codigo: "CONTRATACION_SNCP" },
      });
      if (tipoGeneral) {
        requisitos = await prisma.requisitos_checklist.findMany({
          where: {
            id_tipo_tramite: tipoGeneral.id_tipo_tramite,
            activo: true,
          },
          orderBy: { orden: "asc" },
        });
      }
    }

    // Obtener respuestas existentes para este trámite
    const respuestas = await prisma.respuestas_checklist.findMany({
      where: { id_tramite: idTramite },
      include: {
        usuarios: {
          select: {
            id_usuario: true,
            nombre_completo: true,
            cargo: true,
          },
        },
      },
    });

    const respuestasMap = new Map();
    for (const r of respuestas) {
      respuestasMap.set(r.id_requisito, r);
    }

    const items = requisitos.map((req) => {
      const resp = respuestasMap.get(req.id_requisito);
      return {
        id_requisito: req.id_requisito,
        orden: req.orden,
        descripcion: req.descripcion,
        es_obligatorio: req.es_obligatorio,
        fase: req.fase,
        estado_cumplimiento: resp ? resp.estado_cumplimiento : null,
        observacion_especifica: resp ? resp.observacion_especifica : "",
        evaluador: resp?.usuarios?.nombre_completo || null,
        fecha_evaluacion: resp?.fecha_evaluacion || null,
      };
    });

    const evaluados = items.filter((i) => i.estado_cumplimiento !== null).length;
    const cumplidos = items.filter((i) => i.estado_cumplimiento === "CUMPLE").length;
    const noCumplidos = items.filter((i) => i.estado_cumplimiento === "NO_CUMPLE").length;
    const noAplica = items.filter((i) => i.estado_cumplimiento === "NO_APLICA").length;
    const total = items.length;
    const porcentaje = total > 0 ? Math.round((evaluados / total) * 100) : 0;

    return NextResponse.json({
      tramite: {
        id_tramite: tramite.id_tramite,
        codigo_tramite: tramite.codigo_tramite,
        numero_quipux: tramite.numero_quipux,
        tipo_proceso: tramite.tipos_tramite?.nombre,
      },
      metricas: {
        total,
        evaluados,
        cumplidos,
        noCumplidos,
        noAplica,
        porcentaje,
        esCompleto: total > 0 && evaluados === total,
      },
      items,
    });
  } catch (error: any) {
    console.error("Error al consultar checklist:", error);
    return NextResponse.json(
      { error: error?.message || "Error al consultar checklist del trámite" },
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
      return NextResponse.json({ error: "ID inválido" }, { status: 400 });
    }

    const body = await request.json();
    const { id_requisito, estado_cumplimiento, observacion_especifica, id_usuario } = body;

    if (!id_requisito || !estado_cumplimiento) {
      return NextResponse.json(
        { error: "id_requisito y estado_cumplimiento son obligatorios" },
        { status: 400 }
      );
    }

    const evaluadorId = id_usuario ? Number(id_usuario) : 1;

    // Upsert respuesta de checklist
    const respuesta = await prisma.respuestas_checklist.upsert({
      where: {
        id_tramite_id_requisito: {
          id_tramite: idTramite,
          id_requisito: Number(id_requisito),
        },
      },
      update: {
        estado_cumplimiento,
        observacion_especifica: observacion_especifica || null,
        id_usuario_evaluador: evaluadorId,
        fecha_evaluacion: new Date(),
      },
      create: {
        id_tramite: idTramite,
        id_requisito: Number(id_requisito),
        estado_cumplimiento,
        observacion_especifica: observacion_especifica || null,
        id_usuario_evaluador: evaluadorId,
      },
    });

    // Registrar en auditoría
    try {
      const tramite = await prisma.tramites.findUnique({
        where: { id_tramite: idTramite },
        select: { id_area_actual: true },
      });

      await prisma.historial_movimientos.create({
        data: {
          id_tramite: idTramite,
          id_usuario_entrega: evaluadorId,
          id_usuario_recibe: evaluadorId,
          id_area_origen: tramite?.id_area_actual || 2,
          id_area_destino: tramite?.id_area_actual || 2,
          tipo_accion: "CHECKLIST_ACTUALIZADO",
          comentarios: `Requisito #${id_requisito} marcado como ${estado_cumplimiento}. ${observacion_especifica ? `Obs: ${observacion_especifica}` : ""}`,
        },
      });
    } catch (auditErr) {
      console.error("Error registrando auditoría de checklist:", auditErr);
    }

    return NextResponse.json({ success: true, respuesta });
  } catch (error: any) {
    console.error("Error guardando respuesta checklist:", error);
    return NextResponse.json(
      { error: error?.message || "Error al guardar verificación de checklist" },
      { status: 500 }
    );
  }
}
