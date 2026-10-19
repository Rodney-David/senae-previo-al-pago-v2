import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifySessionToken, SESSION_COOKIE_NAME } from "@/lib/session";
import { getSLAConfig } from "@/lib/slaCalculator";
import {
  obtenerAuditoriaTramites,
  obtenerRendimientoFuncionarios,
  obtenerAuditoriaProcesos,
  FiltrosReportesTiempos,
} from "@/services/reportesTiemposService";
import {
  exportarExcelAuditoriaTramites,
  exportarExcelFuncionarios,
  exportarExcelProcesos,
} from "@/services/reportesExcelService";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const tipoLibroParam = searchParams.get("tipo_libro");
    const modulosParam = searchParams.get("modulos") || searchParams.get("modulo");

    // 1. Determinar el libro oficial solicitado: "TRAMITES" | "FUNCIONARIOS" | "PROCESOS" (default "TRAMITES")
    let tipoLibro: "TRAMITES" | "FUNCIONARIOS" | "PROCESOS" = "TRAMITES";

    if (tipoLibroParam) {
      const cleanTipo = tipoLibroParam.trim().toUpperCase();
      if (cleanTipo === "FUNCIONARIOS" || cleanTipo === "DESEMPENO") {
        tipoLibro = "FUNCIONARIOS";
      } else if (cleanTipo === "PROCESOS" || cleanTipo === "TIEMPOS") {
        tipoLibro = "PROCESOS";
      } else {
        tipoLibro = "TRAMITES";
      }
    } else if (modulosParam) {
      const modClean = modulosParam.toLowerCase();
      if (modClean === "desempeno" || modClean === "funcionarios") {
        tipoLibro = "FUNCIONARIOS";
      } else if (modClean === "tiempos" || modClean === "procesos") {
        tipoLibro = "PROCESOS";
      } else {
        tipoLibro = "TRAMITES";
      }
    }

    // 2. Resolver usuario que exporta desde la sesión o parámetro
    const cookieToken = request.cookies.get(SESSION_COOKIE_NAME)?.value;
    const payload = await verifySessionToken(cookieToken);
    let usuarioGenerador = "Auditor SENAE - Control Previo";

    if (payload) {
      const dbUser = await prisma.usuarios.findUnique({
        where: { id_usuario: payload.userId },
        select: { nombre_completo: true, cargo: true },
      });
      if (dbUser) {
        usuarioGenerador = `${dbUser.nombre_completo} (${dbUser.cargo || "SENAE"})`;
      }
    }
    if (searchParams.get("usuario")) {
      usuarioGenerador = searchParams.get("usuario")!;
    }

    // 3. Normalizar filtros de consulta y soportar padre_gestion = "TODOS" | "PAGO" | "GARANTIA"
    const padreParam = searchParams.get("padre_gestion")?.trim().toUpperCase();
    let padreGestionFiltro: "TODOS" | "PAGO" | "GARANTIA" = "PAGO";
    if (padreParam === "GARANTIA") {
      padreGestionFiltro = "GARANTIA";
    } else if (padreParam === "TODOS" || padreParam === "ALL") {
      padreGestionFiltro = "TODOS";
    } else {
      padreGestionFiltro = "PAGO";
    }

    const filtros: FiltrosReportesTiempos = {
      fecha_desde: searchParams.get("fecha_desde") || undefined,
      fecha_hasta: searchParams.get("fecha_hasta") || undefined,
      padre_gestion: padreGestionFiltro,
      id_area: searchParams.get("id_area") || undefined,
      id_funcionario: searchParams.get("id_usuario") || searchParams.get("id_funcionario") || undefined,
      id_tipo_tramite: searchParams.get("id_tipo_tramite") || searchParams.get("proceso") || undefined,
      codigo_proceso_canonico: searchParams.get("codigo_proceso_canonico") || undefined,
      estado_general: searchParams.get("estado_general") || undefined,
      calidad_dato: searchParams.get("calidad_dato") || undefined,
      estado_filtro: searchParams.get("estado_filtro") || undefined,
      busqueda: searchParams.get("busqueda") || undefined,
    };

    const now = new Date();
    const fechaHoyStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(
      now.getDate()
    ).padStart(2, "0")}`;

    let buffer: Buffer;
    let filename: string;

    // 4. Generación del libro solicitado
    if (tipoLibro === "FUNCIONARIOS") {
      const { funcionarios, analisis_compartido } = await obtenerRendimientoFuncionarios(filtros);
      const slaLimite = (funcionarios[0]?.sla_limite_dias) || 6;

      buffer = await exportarExcelFuncionarios({
        funcionarios,
        analisis_compartido,
        filtros,
        slaLimite,
        usuarioGenerador,
      });

      filename = `reporte_senae_rendimiento_funcionarios_${fechaHoyStr}.xlsx`;
    } else if (tipoLibro === "PROCESOS") {
      const { procesos, familias } = await obtenerAuditoriaProcesos(filtros);
      const slaConfig = await getSLAConfig();
      const slaLimite = slaConfig.limite_dias || 6;

      buffer = await exportarExcelProcesos({
        familias_canonicas: familias,
        procesos,
        filtros,
        slaLimite,
        usuarioGenerador,
      });

      filename = `reporte_senae_rendimiento_procesos_${fechaHoyStr}.xlsx`;
    } else {
      // Default: LIBRO 1: Auditoría Integral de Trámites (hasta 50,000 registros para descarga completa)
      const { tramites, kpis } = await obtenerAuditoriaTramites(filtros, {
        limite: 50000,
        pagina: 1,
      });
      const slaConfig = await getSLAConfig();

      buffer = await exportarExcelAuditoriaTramites({
        tramites,
        kpis,
        filtros,
        slaLimite: slaConfig.limite_dias || 6,
        usuarioGenerador,
      });

      filename = `reporte_senae_auditoria_tramites_${fechaHoyStr}.xlsx`;
    }

    // 5. Devolver archivo Excel con cabeceras HTTP correctas
    return new Response(new Uint8Array(buffer), {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
        Pragma: "no-cache",
        Expires: "0",
      },
    });
  } catch (error) {
    console.error("Error al exportar reporte oficial Excel SENAE:", error);
    return NextResponse.json(
      { success: false, error: "Error interno al generar el libro Excel de reporte oficial" },
      { status: 500 }
    );
  }
}
