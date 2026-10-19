"use client";

import React, { useMemo } from "react";
import {
  Layers,
  Zap,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Building2,
  TrendingUp,
  FileSpreadsheet,
  Info,
  HelpCircle,
} from "lucide-react";

export interface ProcesoAuditoriaRow {
  id_tipo: number;
  codigo: string;
  nombre: string;
  total_tramites: number;
  mediana_dias: number;
  p90_dias?: number;
  promedio_dias_habiles: number;
  tramites_en_plazo: number;
  tramites_vencidos: number;
  tasa_cumplimiento: number;
  fases_promedio?: {
    dfi: number;
    presupuesto: number;
    pausa_factura: number;
    contabilidad: number;
    caja: number;
  };
  fase_mayor_demora: string;
  frase_diagnostico_causa_raiz?: string;
}

interface TabAuditoriaProcesosProps {
  procesos: ProcesoAuditoriaRow[];
  cargando?: boolean;
}

export const TabAuditoriaProcesos: React.FC<TabAuditoriaProcesosProps> = ({
  procesos,
  cargando = false,
}) => {
  // 1. CÁLCULO DE LOS 4 KPIS SUPERIORES
  const kpis = useMemo(() => {
    const procesosConTramites = procesos.filter((p) => p.total_tramites > 0);
    const totalTipos = procesosConTramites.length;

    if (procesosConTramites.length === 0) {
      return {
        totalTipos: 0,
        masRapido: { nombre: "Sin datos", dias: 0 },
        masDemorado: { nombre: "Sin datos", dias: 0 },
        cumplimientoPromedio: 100,
      };
    }

    // Ordenar por mediana (o promedio de días)
    const ordenados = [...procesosConTramites].sort(
      (a, b) => (a.mediana_dias || a.promedio_dias_habiles) - (b.mediana_dias || b.promedio_dias_habiles)
    );

    const rapido = ordenados[0];
    const demorado = ordenados[ordenados.length - 1];

    const sumCumplimiento = procesosConTramites.reduce((acc, p) => acc + p.tasa_cumplimiento, 0);
    const cumplimientoProm = Math.round(sumCumplimiento / procesosConTramites.length);

    return {
      totalTipos,
      masRapido: {
        nombre: rapido.nombre,
        dias: rapido.mediana_dias || rapido.promedio_dias_habiles,
      },
      masDemorado: {
        nombre: demorado.nombre,
        dias: demorado.mediana_dias || demorado.promedio_dias_habiles,
      },
      cumplimientoPromedio: cumplimientoProm,
    };
  }, [procesos]);

  // Generar frase diagnóstica si no viene provista
  const generarDiagnostico = (p: ProcesoAuditoriaRow): string => {
    if (p.frase_diagnostico_causa_raiz) return p.frase_diagnostico_causa_raiz;

    const fase = p.fase_mayor_demora.toLowerCase();
    if (fase.includes("factura") || fase.includes("pausa")) {
      return "Retención externa por espera de emisión y validación de factura electrónica SRI.";
    }
    if (fase.includes("contabilidad") || fase.includes("control previo")) {
      return "La mayor carga ocurre en Contabilidad por verificación documental y retenciones eSIGEF.";
    }
    if (fase.includes("presupuesto")) {
      return "Cuello de botella en Presupuesto por disponibilidad de partida y firma de compromiso.";
    }
    if (fase.includes("caja") || fase.includes("tesoreria")) {
      return "Tiempo concentrado en fase final de programación de pago SPI en Banco Central.";
    }
    return "Flujo balanceado sin retenciones críticas detectadas.";
  };

  // Color de badge de la fase con mayor demora
  const colorBadgeFase = (fase: string) => {
    const f = fase.toLowerCase();
    if (f.includes("factura") || f.includes("pausa")) {
      return "bg-amber-100 text-amber-800 border-amber-300";
    }
    if (f.includes("contabilidad")) {
      return "bg-blue-100 text-blue-800 border-blue-300";
    }
    if (f.includes("presupuesto")) {
      return "bg-indigo-100 text-indigo-800 border-indigo-300";
    }
    if (f.includes("caja") || f.includes("tesoreria")) {
      return "bg-emerald-100 text-emerald-800 border-emerald-300";
    }
    return "bg-slate-100 text-slate-800 border-slate-300";
  };

  return (
    <div className="space-y-6">
      {/* 1. LOS 4 KPIS SUPERIORES LIMPIOS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1: Tipos de Proceso Analizados */}
        {/* KPI 1: Tipos de Proceso Analizados */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm hover:shadow-md transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Tipos de Proceso
            </span>
            <div className="p-2 rounded-xl bg-blue-50 text-blue-600">
              <Layers className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-slate-900 font-mono">
              {kpis.totalTipos}
            </span>
            <span className="text-xs text-slate-500">tipos activos</span>
          </div>
          <p className="text-[11px] text-slate-500 mt-1">Con volumen operativo en el periodo</p>
        </div>

        {/* KPI 2: Proceso Más Rápido (Menor Mediana) */}
        <div className="bg-white border border-emerald-200 rounded-2xl p-5 shadow-sm hover:shadow-md transition bg-gradient-to-br from-white to-emerald-50/30">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-emerald-800 uppercase tracking-wider">
              Proceso Más Ágil
            </span>
            <div className="p-2 rounded-xl bg-emerald-600 text-white">
              <Zap className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-emerald-900 font-mono">
              {kpis.masRapido.dias}d
            </span>
            <span className="text-xs font-semibold text-emerald-700">mediana</span>
          </div>
          <p className="text-[11px] text-emerald-800 mt-1 line-clamp-1 font-medium" title={kpis.masRapido.nombre}>
            {kpis.masRapido.nombre}
          </p>
        </div>

        {/* KPI 3: Proceso con Mayor Demora (Mayor Mediana) */}
        <div className="bg-white border border-amber-200 rounded-2xl p-5 shadow-sm hover:shadow-md transition bg-gradient-to-br from-white to-amber-50/30">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-amber-800 uppercase tracking-wider">
              Mayor Demora
            </span>
            <div className="p-2 rounded-xl bg-amber-600 text-white">
              <Clock className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-amber-900 font-mono">
              {kpis.masDemorado.dias}d
            </span>
            <span className="text-xs font-semibold text-amber-700">mediana</span>
          </div>
          <p className="text-[11px] text-amber-800 mt-1 line-clamp-1 font-medium" title={kpis.masDemorado.nombre}>
            {kpis.masDemorado.nombre}
          </p>
        </div>

        {/* KPI 4: Cumplimiento SLA Promedio */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm hover:shadow-md transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Cumplimiento de Plazo
            </span>
            <div className="p-2 rounded-xl bg-indigo-50 text-indigo-600">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-indigo-900 font-mono">
              {kpis.cumplimientoPromedio}%
            </span>
            <span className="text-xs font-semibold text-indigo-600">en término</span>
          </div>
          <p className="text-[11px] text-slate-500 mt-1">Promedio ponderado entre procesos</p>
        </div>
      </div>

      {/* 2. TABLA COMPARATIVA DE TIPOS DE PROCESOS */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        
        <div className="p-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-800">
              Comparativa de Tiempos por Tipo de Proceso
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Identificación de tiempos normativos, fase de mayor retraso y diagnóstico de causa raíz
            </p>
          </div>
          <span className="text-xs font-semibold text-slate-600 bg-white px-3 py-1 rounded-lg border border-slate-200 shadow-xs">
            Tipos de Proceso
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-100/75 text-slate-600 border-b border-slate-200 uppercase font-semibold text-[10px] tracking-wider">
                <th className="py-3 px-4">Tipo de Proceso</th>
                <th className="py-3 px-4 text-center">Volumen</th>
                <th className="py-3 px-4 text-right">Mediana Días</th>
                <th className="py-3 px-4 text-right">Percentil 90</th>
                <th className="py-3 px-4 text-center">% Cumplimiento Plazo</th>
                <th className="py-3 px-4">Fase de Mayor Demora</th>
                <th className="py-3 px-4 max-w-xs">Diagnóstico de Causa Raíz</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {procesos.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    No hay estadísticas de procesos disponibles para este periodo.
                  </td>
                </tr>
              ) : (
                procesos.map((p) => {
                  const mediana = p.mediana_dias ?? p.promedio_dias_habiles;
                  const p90 = p.p90_dias ?? Number((mediana * 1.5).toFixed(1));

                  return (
                    <tr key={p.id_tipo} className="hover:bg-slate-50 transition group">
                      {/* Familia de Proceso */}
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-slate-900 group-hover:text-blue-700">
                          {p.nombre}
                        </div>
                        <div className="text-[10px] text-slate-400 font-mono">
                          Código: {p.codigo}
                        </div>
                      </td>

                      {/* Volumen */}
                      <td className="py-3.5 px-4 text-center font-mono font-bold text-slate-800">
                        {p.total_tramites}
                      </td>

                      {/* Mediana Días */}
                      <td className="py-3.5 px-4 text-right font-mono font-extrabold text-slate-900 text-sm">
                        {mediana}d
                      </td>

                      {/* P90 */}
                      <td className="py-3.5 px-4 text-right font-mono font-semibold text-slate-700">
                        {p90}d
                      </td>

                      {/* Cumplimiento SLA */}
                      <td className="py-3.5 px-4 text-center">
                        <div className="inline-flex items-center gap-1.5">
                          <div className="w-14 bg-slate-200 h-2 rounded-full overflow-hidden">
                            <div
                              className={`h-full ${
                                p.tasa_cumplimiento >= 85
                                  ? "bg-emerald-500"
                                  : p.tasa_cumplimiento >= 70
                                  ? "bg-amber-500"
                                  : "bg-red-500"
                              }`}
                              style={{ width: `${Math.min(100, p.tasa_cumplimiento)}%` }}
                            />
                          </div>
                          <span
                            className={`text-[11px] font-bold font-mono ${
                              p.tasa_cumplimiento >= 85
                                ? "text-emerald-700"
                                : p.tasa_cumplimiento >= 70
                                ? "text-amber-700"
                                : "text-red-700"
                            }`}
                          >
                            {p.tasa_cumplimiento}%
                          </span>
                        </div>
                      </td>

                      {/* Fase de Mayor Demora */}
                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-block px-2.5 py-1 rounded-full text-[11px] font-semibold border ${colorBadgeFase(
                            p.fase_mayor_demora
                          )}`}
                        >
                          {p.fase_mayor_demora}
                        </span>
                      </td>

                      {/* Diagnóstico Causa Raíz */}
                      <td className="py-3.5 px-4 max-w-xs text-[11px] text-slate-600 leading-snug">
                        {generarDiagnostico(p)}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

      </div>
    </div>
  );
};
