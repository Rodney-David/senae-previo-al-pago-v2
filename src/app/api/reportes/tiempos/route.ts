import { NextRequest, NextResponse } from "next/server";
import { obtenerAuditoriaTramites, FiltrosReportesTiempos } from "@/services/reportesTiemposService";

export const dynamic = "force-dynamic";

/**
 * GET /api/reportes/tiempos
 * Pestaña 1: Auditoría de Tiempos y Expedientes
 * 
 * Retorna la lista paginada de trámites con sus dos relojes calculados (Reloj A y Reloj B),
 * calidad del dato, estado SLA e invariante, junto con los 4 KPIs institucionales de la población.
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    const padreGestion = searchParams.get("padre_gestion") || "TODOS";
    const codigoProceso = searchParams.get("codigo_proceso") || searchParams.get("codigo_proceso_canonico") || undefined;

    const filtros: FiltrosReportesTiempos = {
      padre_gestion: padreGestion,
      fecha_desde: searchParams.get("fecha_desde") || undefined,
      fecha_hasta: searchParams.get("fecha_hasta") || undefined,
      criterio_fecha: searchParams.get("criterio_fecha") || "INGRESO",
      id_tipo_tramite: searchParams.get("id_tipo_tramite") || undefined,
      codigo_proceso: codigoProceso,
      codigo_proceso_canonico: codigoProceso,
      id_area: searchParams.get("id_area") || undefined,
      id_funcionario: searchParams.get("id_funcionario") || undefined,
      estado_general: searchParams.get("estado_general") || undefined,
      calidad_dato: searchParams.get("calidad_dato") || undefined,
      estado_filtro: searchParams.get("estado_filtro") || undefined,
      busqueda: searchParams.get("busqueda") || searchParams.get("q") || undefined,
    };

    const pagina = parseInt(searchParams.get("pagina") || "1", 10);
    const limiteParam = searchParams.get("limite");
    const limite = limiteParam ? parseInt(limiteParam, 10) : 5000;

    const resultado = await obtenerAuditoriaTramites(filtros, { pagina, limite });

    return NextResponse.json({
      success: true,
      filtros: {
        padre_gestion: filtros.padre_gestion,
        fecha_desde: filtros.fecha_desde || null,
        fecha_hasta: filtros.fecha_hasta || null,
        criterio_fecha: filtros.criterio_fecha,
        calidad_dato: filtros.calidad_dato || "TODOS",
        estado_filtro: filtros.estado_filtro || "TODOS",
        busqueda: filtros.busqueda || null,
      },
      ...resultado,
    });
  } catch (error) {
    console.error("Error en GET /api/reportes/tiempos:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Error al generar la auditoría de tiempos de expedientes",
        detalle: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
