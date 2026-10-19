"use client";

import React, { useState, useMemo } from "react";
import {
  Users,
  Clock,
  TrendingUp,
  Award,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Info,
  CheckCircle2,
  AlertTriangle,
  UserCheck,
  Building2,
  Search,
} from "lucide-react";
import Link from "next/link";
import { formatCurrency, formatDate } from "@/lib/utils";

export interface TramiteMesaFuncionario {
  id_tramite: number;
  nro_tramite?: string;
  numero_quipux: string;
  proveedor: string;
  tipo_proceso: string;
  fecha_llegada: string;
  fecha_salida: string | null;
  dias_en_mesa: number;
  estado_entrega: "A_TIEMPO" | "CON_RETRASO" | "EN_CURSO";
  sla_limite_dias: number;
}

export interface FuncionarioRendimientoRow {
  id_usuario: number;
  nombre_completo: string;
  cargo: string;
  area_nombre: string;
  total_tramites_recibidos: number;
  tramites_despachados: number;
  entregados_a_tiempo: number;
  entregados_con_retraso: number;
  en_curso: number;
  tasa_cumplimiento: number;
  tiempo_promedio_dias: number;
  mediana_dias?: number;
  p90_dias?: number;
  sla_limite_dias: number;
  detalle_tramites?: TramiteMesaFuncionario[];
}

export interface TramiteCompartidoItem {
  id_tramite: number;
  codigo_tramite: string;
  numero_quipux: string;
  proveedor_nombre: string;
  tipo_proceso: string;
  analistas_detectados: string[];
  dias_totales: number;
  estado: string;
}

interface TabRendimientoFuncionariosProps {
  funcionarios: FuncionarioRendimientoRow[];
  tramitesCompartidos?: TramiteCompartidoItem[];
  cargando?: boolean;
}

function calcularMediana(nums: number[]): number {
  if (nums.length === 0) return 0;
  const s = [...nums].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  if (s.length % 2 !== 0) return Number(s[mid].toFixed(1));
  return Number(((s[mid - 1] + s[mid]) / 2).toFixed(1));
}

function calcularPercentil(nums: number[], p: number): number {
  if (nums.length === 0) return 0;
  const s = [...nums].sort((a, b) => a - b);
  const idx = Math.ceil((p / 100) * s.length) - 1;
  return Number(s[Math.max(0, Math.min(idx, s.length - 1))].toFixed(1));
}

export const TabRendimientoFuncionarios: React.FC<TabRendimientoFuncionariosProps> = ({
  funcionarios,
  tramitesCompartidos = [],
  cargando = false,
}) => {
  const [funcionarioExpandido, setFuncionarioExpandido] = useState<number | null>(null);
  const [filtroTexto, setFiltroTexto] = useState("");
  const [pestañaSub, setPestañaSub] = useState<"ranking" | "compartidos">("ranking");

  // Calcular mediana y P90 por funcionario a partir de su detalle_tramites
  const funcionariosEnriquecidos = useMemo(() => {
    return funcionarios.map((f) => {
      const diasDespacho = (f.detalle_tramites || [])
        .filter((t) => t.fecha_salida !== null)
        .map((t) => t.dias_en_mesa);

      const mediana = diasDespacho.length > 0 ? calcularMediana(diasDespacho) : f.tiempo_promedio_dias;
      const p90 = diasDespacho.length > 0 ? calcularPercentil(diasDespacho, 90) : Number((mediana * 1.5).toFixed(1));

      return {
        ...f,
        mediana_dias: mediana,
        p90_dias: p90,
      };
    });
  }, [funcionarios]);

  // 1. CÁLCULO DE LOS 4 KPIS SUPERIORES (MÁXIMO 4 KPIS)
  const kpis = useMemo(() => {
    const totalActivos = funcionarios.length;

    // Recolectar todos los tiempos de despacho individuales institucionales
    const todosLosTiempos: number[] = [];
    let sumCumplimiento = 0;
    let totalEvaluados = 0;

    funcionariosEnriquecidos.forEach((f) => {
      if (f.detalle_tramites) {
        f.detalle_tramites.forEach((t) => {
          if (t.fecha_salida !== null) {
            todosLosTiempos.push(t.dias_en_mesa);
          }
        });
      }
      if (f.total_tramites_recibidos > 0) {
        sumCumplimiento += f.tasa_cumplimiento;
        totalEvaluados++;
      }
    });

    const medianaGeneral = calcularMediana(todosLosTiempos);
    const p90Institucional = calcularPercentil(todosLosTiempos, 90);
    const cumplimientoGlobal =
      totalEvaluados > 0 ? Math.round(sumCumplimiento / totalEvaluados) : 100;

    return {
      totalActivos,
      medianaGeneral,
      p90Institucional,
      cumplimientoGlobal,
    };
  }, [funcionarios, funcionariosEnriquecidos]);

  // Filtrado de funcionarios por texto
  const funcionariosFiltrados = useMemo(() => {
    if (!filtroTexto.trim()) return funcionariosEnriquecidos;
    const t = filtroTexto.toLowerCase();
    return funcionariosEnriquecidos.filter(
      (f) =>
        f.nombre_completo.toLowerCase().includes(t) ||
        f.cargo.toLowerCase().includes(t) ||
        f.area_nombre.toLowerCase().includes(t)
    );
  }, [funcionariosEnriquecidos, filtroTexto]);

  const toggleExpandir = (id: number) => {
    setFuncionarioExpandido((prev) => (prev === id ? null : id));
  };

  return (
    <div className="space-y-6">
      {/* 1. LOS 4 KPIS SUPERIORES LIMPIOS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1: Total Funcionarios Activos */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm hover:shadow-md transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Funcionarios Activos
            </span>
            <div className="p-2 rounded-xl bg-blue-50 text-blue-600">
              <Users className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-slate-900 font-mono">
              {kpis.totalActivos}
            </span>
            <span className="text-xs text-slate-500">analistas evaluados</span>
          </div>
          <p className="text-[11px] text-slate-500 mt-1">Con expedientes asignados en el periodo</p>
        </div>

        {/* KPI 2: Mediana General de Despacho (MÉTRICA REINA DESTACADA) */}
        <div className="bg-white border border-blue-200 rounded-2xl p-5 shadow-sm hover:shadow-md transition bg-gradient-to-br from-white to-blue-50/30">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-blue-900 uppercase tracking-wider flex items-center gap-1">
              <Award className="w-3.5 h-3.5 text-blue-600" />
              Mediana de Despacho
            </span>
            <div className="p-2 rounded-xl bg-blue-600 text-white shadow-sm">
              <Clock className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-blue-800 font-mono">
              {kpis.medianaGeneral}
            </span>
            <span className="text-xs font-bold text-blue-600">días en mesa</span>
          </div>
          <p className="text-[11px] text-blue-800 mt-1 font-medium">
            Métrica reina institucional (no afectada por atípicos)
          </p>
        </div>

        {/* KPI 3: Percentil 90 (P90) Institucional */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm hover:shadow-md transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Percentil 90 (P90)
            </span>
            <div className="p-2 rounded-xl bg-amber-50 text-amber-600">
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-amber-900 font-mono">
              {kpis.p90Institucional}
            </span>
            <span className="text-xs font-semibold text-amber-600">días límite P90</span>
          </div>
          <p className="text-[11px] text-slate-500 mt-1">El 90% de trámites se despacha en este plazo</p>
        </div>

        {/* KPI 4: Tasa de Cumplimiento Global */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm hover:shadow-md transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Cumplimiento Global
            </span>
            <div className="p-2 rounded-xl bg-emerald-50 text-emerald-600">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-emerald-800 font-mono">
              {kpis.cumplimientoGlobal}%
            </span>
            <span className="text-xs font-semibold text-emerald-600">dentro del SLA</span>
          </div>
          <p className="text-[11px] text-slate-500 mt-1">Con apego estricto a la meta por área</p>
        </div>
      </div>

      {/* 2. SELECTOR DE VISTA: RANKING INDIVIDUAL vs ANÁLISIS COMPARTIDO */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        
        <div className="p-4 border-b border-slate-200 bg-slate-50 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-1 bg-white p-1 rounded-xl border border-slate-200 shadow-xs">
            <button
              type="button"
              onClick={() => setPestañaSub("ranking")}
              className={`px-4 py-1.5 rounded-lg text-xs font-bold transition ${
                pestañaSub === "ranking"
                  ? "bg-blue-700 text-white shadow-sm"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Ranking de Funcionarios ({funcionarios.length})
            </button>
            <button
              type="button"
              onClick={() => setPestañaSub("compartidos")}
              className={`px-4 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                pestañaSub === "compartidos"
                  ? "bg-purple-700 text-white shadow-sm"
                  : "text-purple-800 hover:bg-purple-50"
              }`}
            >
              <span>Trámites con Análisis Compartido</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-purple-100 text-purple-800 font-mono">
                {tramitesCompartidos.length}
              </span>
            </button>
          </div>

          {pestañaSub === "ranking" && (
            <div className="relative w-full sm:w-64">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={filtroTexto}
                onChange={(e) => setFiltroTexto(e.target.value)}
                placeholder="Buscar analista o área..."
                className="w-full pl-9 pr-3 py-1.5 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>
          )}
        </div>

        {/* 3. TABLA PRINCIPAL DE FUNCIONARIOS */}
        {pestañaSub === "ranking" ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-100/75 text-slate-600 border-b border-slate-200 uppercase font-semibold text-[10px] tracking-wider">
                  <th className="py-3 px-4">Funcionario / Analista</th>
                  <th className="py-3 px-4">Área / Cargo</th>
                  <th className="py-3 px-4 text-center">Recibidos</th>
                  <th className="py-3 px-4 text-center">Despachados</th>
                  <th className="py-3 px-4 text-center">En Curso</th>
                  <th className="py-3 px-4 text-right bg-blue-50/50 text-blue-900 font-bold">
                    Tiempo en Mesa (Mediana)
                  </th>
                  <th className="py-3 px-4 text-right">P90 (Días)</th>
                  <th className="py-3 px-4 text-center">% Cumplimiento SLA</th>
                  <th className="py-3 px-4 text-center">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {funcionariosFiltrados.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-12 text-center text-slate-400">
                      No se encontraron funcionarios activos para los filtros actuales.
                    </td>
                  </tr>
                ) : (
                  funcionariosFiltrados.map((f) => {
                    const expandido = funcionarioExpandido === f.id_usuario;

                    return (
                      <React.Fragment key={f.id_usuario}>
                        <tr
                          onClick={() => toggleExpandir(f.id_usuario)}
                          className="hover:bg-slate-50/80 transition cursor-pointer group"
                        >
                          {/* Nombre */}
                          <td className="py-3.5 px-4">
                            <div className="font-bold text-slate-900 group-hover:text-blue-700">
                              {f.nombre_completo}
                            </div>
                          </td>

                          {/* Cargo y Área */}
                          <td className="py-3.5 px-4 text-slate-600">
                            <div>{f.cargo}</div>
                            <div className="text-[10px] text-slate-400">{f.area_nombre}</div>
                          </td>

                          {/* Recibidos */}
                          <td className="py-3.5 px-4 text-center font-mono font-semibold text-slate-800">
                            {f.total_tramites_recibidos}
                          </td>

                          {/* Despachados */}
                          <td className="py-3.5 px-4 text-center font-mono text-emerald-700 font-semibold">
                            {f.tramites_despachados}
                          </td>

                          {/* En Curso */}
                          <td className="py-3.5 px-4 text-center font-mono text-amber-700 font-semibold">
                            {f.en_curso}
                          </td>

                          {/* Mediana Días (MÉTRICA REINA DESTACADA) */}
                          <td className="py-3.5 px-4 text-right bg-blue-50/50 font-mono font-extrabold text-blue-800 text-sm">
                            {f.mediana_dias}d
                          </td>

                          {/* P90 Días */}
                          <td className="py-3.5 px-4 text-right font-mono font-medium text-slate-700">
                            {f.p90_dias}d
                          </td>

                          {/* Cumplimiento SLA */}
                          <td className="py-3.5 px-4 text-center">
                            <div className="inline-flex items-center gap-1.5">
                              <div className="w-16 bg-slate-200 h-2 rounded-full overflow-hidden">
                                <div
                                  className={`h-full ${
                                    f.tasa_cumplimiento >= 85
                                      ? "bg-emerald-500"
                                      : f.tasa_cumplimiento >= 70
                                      ? "bg-amber-500"
                                      : "bg-red-500"
                                  }`}
                                  style={{ width: `${Math.min(100, f.tasa_cumplimiento)}%` }}
                                />
                              </div>
                              <span
                                className={`text-[11px] font-bold font-mono ${
                                  f.tasa_cumplimiento >= 85
                                    ? "text-emerald-700"
                                    : f.tasa_cumplimiento >= 70
                                    ? "text-amber-700"
                                    : "text-red-700"
                                }`}
                              >
                                {f.tasa_cumplimiento}%
                              </span>
                            </div>
                          </td>

                          {/* Botón Ver Detalle */}
                          <td className="py-3.5 px-4 text-center">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleExpandir(f.id_usuario);
                              }}
                              className="px-2.5 py-1 text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-lg text-xs font-semibold inline-flex items-center gap-1 transition"
                            >
                              <span>{expandido ? "Ocultar" : "Expedientes"}</span>
                              {expandido ? (
                                <ChevronUp className="w-3.5 h-3.5" />
                              ) : (
                                <ChevronDown className="w-3.5 h-3.5" />
                              )}
                            </button>
                          </td>
                        </tr>

                        {/* FILA EXPANDIBLE: EXPEDIENTES ESPECÍFICOS ATENDIDOS */}
                        {expandido && (
                          <tr className="bg-slate-50/90 border-b border-slate-200">
                            <td colSpan={9} className="p-4">
                              <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-inner space-y-3">
                                <div className="flex items-center justify-between">
                                  <span className="text-xs font-bold text-slate-800 uppercase tracking-wide">
                                    Expedientes atendidos por {f.nombre_completo} ({f.detalle_tramites?.length || 0})
                                  </span>
                                  <span className="text-[11px] text-slate-500 font-medium">
                                    Meta SLA del Área: <strong>{f.sla_limite_dias} días hábiles</strong>
                                  </span>
                                </div>

                                {f.detalle_tramites && f.detalle_tramites.length > 0 ? (
                                  <div className="overflow-x-auto max-h-60 overflow-y-auto">
                                    <table className="w-full text-left text-xs">
                                      <thead>
                                        <tr className="text-slate-500 border-b border-slate-200 font-semibold text-[10px] uppercase">
                                          <th className="py-2 px-3">Quipux / Nro</th>
                                          <th className="py-2 px-3">Proveedor</th>
                                          <th className="py-2 px-3">Proceso</th>
                                          <th className="py-2 px-3 text-center">Llegada a Mesa</th>
                                          <th className="py-2 px-3 text-center">Salida</th>
                                          <th className="py-2 px-3 text-right">Días en Mesa</th>
                                          <th className="py-2 px-3 text-center">Estado Entrega</th>
                                          <th className="py-2 px-3 text-center">Ver</th>
                                        </tr>
                                      </thead>
                                      <tbody className="divide-y divide-slate-100">
                                        {f.detalle_tramites.map((dt, idx) => (
                                          <tr key={idx} className="hover:bg-slate-50">
                                            <td className="py-2 px-3 font-mono font-medium text-slate-900">
                                              {dt.numero_quipux}
                                            </td>
                                            <td className="py-2 px-3 font-medium text-slate-800 line-clamp-1">
                                              {dt.proveedor}
                                            </td>
                                            <td className="py-2 px-3 text-slate-600">{dt.tipo_proceso}</td>
                                            <td className="py-2 px-3 text-center text-slate-500">
                                              {dt.fecha_llegada}
                                            </td>
                                            <td className="py-2 px-3 text-center text-slate-500">
                                              {dt.fecha_salida || <span className="text-amber-600 font-semibold">En mesa</span>}
                                            </td>
                                            <td className="py-2 px-3 text-right font-mono font-bold text-slate-800">
                                              {dt.dias_en_mesa}d
                                            </td>
                                            <td className="py-2 px-3 text-center">
                                              {dt.estado_entrega === "A_TIEMPO" ? (
                                                <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                                                  A Tiempo
                                                </span>
                                              ) : dt.estado_entrega === "CON_RETRASO" ? (
                                                <span className="text-[10px] font-semibold text-red-700 bg-red-50 px-2 py-0.5 rounded border border-red-200">
                                                  Con Retraso
                                                </span>
                                              ) : (
                                                <span className="text-[10px] font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                                                  En Curso
                                                </span>
                                              )}
                                            </td>
                                            <td className="py-2 px-3 text-center">
                                              <Link
                                                href={`/tramites/${dt.id_tramite}`}
                                                target="_blank"
                                                className="text-blue-600 hover:text-blue-800 p-1 inline-block"
                                              >
                                                <ExternalLink className="w-3.5 h-3.5" />
                                              </Link>
                                            </td>
                                          </tr>
                                        ))}
                                      </tbody>
                                    </table>
                                  </div>
                                ) : (
                                  <p className="text-xs text-slate-400 py-4 text-center">
                                    No hay expedientes detallados en este periodo.
                                  </p>
                                )}
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        ) : (
          /* 4. SECCIÓN SEPARADA PARA TRÁMITES CON ANÁLISIS COMPARTIDO */
          <div className="p-5 space-y-4">
            <div className="bg-purple-50 border border-purple-200 rounded-xl p-4 flex items-start gap-3">
              <Info className="w-5 h-5 text-purple-600 mt-0.5 flex-shrink-0" />
              <div className="text-xs text-purple-900 space-y-1">
                <span className="font-bold block text-sm">
                  Metodología de Segregación para Análisis Compartido
                </span>
                <p>
                  Los trámites que fueron trabajados conjuntamente por dos o más analistas (ej. RG / DB, NM / MS)
                  se segregan en este apartado para <strong>no duplicar el conteo ni distorsionar la mediana y el percentil 90 individual</strong>.
                </p>
              </div>
            </div>

            <div className="overflow-x-auto border border-slate-200 rounded-xl">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-slate-100 text-slate-600 font-semibold text-[10px] uppercase border-b border-slate-200">
                    <th className="py-3 px-4">Código / Quipux</th>
                    <th className="py-3 px-4">Proveedor</th>
                    <th className="py-3 px-4">Proceso</th>
                    <th className="py-3 px-4">Analistas Detectados</th>
                    <th className="py-3 px-4 text-right">Días Totales</th>
                    <th className="py-3 px-4 text-center">Estado</th>
                    <th className="py-3 px-4 text-center">Acción</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {tramitesCompartidos.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-10 text-center text-slate-400">
                        No se detectaron expedientes con análisis compartido en el periodo.
                      </td>
                    </tr>
                  ) : (
                    tramitesCompartidos.map((tc) => (
                      <tr key={tc.id_tramite} className="hover:bg-slate-50">
                        <td className="py-3 px-4">
                          <span className="font-mono font-bold text-slate-900 block">{tc.codigo_tramite}</span>
                          <span className="text-[11px] text-slate-500 font-mono">{tc.numero_quipux}</span>
                        </td>
                        <td className="py-3 px-4 font-medium text-slate-800">{tc.proveedor_nombre}</td>
                        <td className="py-3 px-4 text-slate-600">{tc.tipo_proceso}</td>
                        <td className="py-3 px-4">
                          <span className="font-semibold text-purple-800 bg-purple-50 px-2.5 py-1 rounded-full border border-purple-200 text-xs">
                            {tc.analistas_detectados.join(" / ")}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-bold text-slate-900">
                          {tc.dias_totales}d
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                            {tc.estado}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-center">
                          <Link
                            href={`/tramites/${tc.id_tramite}`}
                            target="_blank"
                            className="text-blue-600 hover:text-blue-800 font-semibold text-xs"
                          >
                            Ver
                          </Link>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
