import { NextRequest, NextResponse } from "next/server";
import { obtenerRendimientoFuncionarios, FiltrosReportesTiempos } from "@/services/reportesTiemposService";

export const dynamic = "force-dynamic";

/**
 * GET /api/reportes/funcionarios
 * Pestaña 2: Rendimiento y Desempeño por Funcionario
 * 
 * Agrupa los expedientes por analista o custodio, calcula mediana de despacho,
 * percentil 90 (P90), tasa de cumplimiento SLA, y segrega los expedientes con
 * análisis compartido en una sección dedicada para evitar sesgos metodológicos.
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    const padreGestion = searchParams.get("padre_gestion") || "TODOS";

    const filtros: FiltrosReportesTiempos = {
      padre_gestion: padreGestion,
      fecha_desde: searchParams.get("fecha_desde") || undefined,
      fecha_hasta: searchParams.get("fecha_hasta") || undefined,
      criterio_fecha: searchParams.get("criterio_fecha") || "INGRESO",
      id_area: searchParams.get("id_area") || undefined,
      id_funcionario: searchParams.get("id_funcionario") || undefined,
      calidad_dato: searchParams.get("calidad_dato") || undefined,
      estado_filtro: searchParams.get("estado_filtro") || undefined,
      busqueda: searchParams.get("busqueda") || searchParams.get("q") || undefined,
    };

    const resultado = await obtenerRendimientoFuncionarios(filtros);

    return NextResponse.json({
      success: true,
      filtros: {
        padre_gestion: filtros.padre_gestion,
        fecha_desde: filtros.fecha_desde || null,
        fecha_hasta: filtros.fecha_hasta || null,
        criterio_fecha: filtros.criterio_fecha,
        id_area: filtros.id_area || "TODAS",
        id_funcionario: filtros.id_funcionario || "TODOS",
      },
      ...resultado,
    });
  } catch (error) {
    console.error("Error en GET /api/reportes/funcionarios:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Error al generar el reporte de rendimiento por funcionarios",
        detalle: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
