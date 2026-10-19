import { NextRequest, NextResponse } from "next/server";
import { obtenerAuditoriaProcesos, FiltrosReportesTiempos } from "@/services/reportesTiemposService";

export const dynamic = "force-dynamic";

/**
 * GET /api/reportes/procesos
 * Pestaña 3: Auditoría y Tardanza por Procesos Institucionales
 * 
 * Agrupa los trámites según el catálogo de tipos_tramite y las 10 familias canónicas,
 * calcula mediana, P90, identifica la fase con mayor demora (Secretaría, Presupuesto,
 * Contabilidad, DFI o Tesorería) y emite la frase diagnóstica de causa raíz.
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
      calidad_dato: searchParams.get("calidad_dato") || undefined,
      estado_filtro: searchParams.get("estado_filtro") || undefined,
      busqueda: searchParams.get("busqueda") || searchParams.get("q") || undefined,
    };

    const resultado = await obtenerAuditoriaProcesos(filtros);

    return NextResponse.json({
      success: true,
      filtros: {
        padre_gestion: filtros.padre_gestion,
        fecha_desde: filtros.fecha_desde || null,
        fecha_hasta: filtros.fecha_hasta || null,
        criterio_fecha: filtros.criterio_fecha,
        id_tipo_tramite: filtros.id_tipo_tramite || "TODOS",
        codigo_proceso_canonico: filtros.codigo_proceso_canonico || "TODOS",
      },
      ...resultado,
    });
  } catch (error) {
    console.error("Error en GET /api/reportes/procesos:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Error al generar la auditoría por procesos institucionales",
        detalle: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
