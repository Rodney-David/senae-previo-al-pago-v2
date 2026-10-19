"use client";

import React, { useState, useMemo } from "react";
import {
  FileText,
  Clock,
  AlertTriangle,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Eye,
  ArrowUpDown,
  Filter,
  Layers,
  ArrowRight,
  Sparkles,
  Info,
} from "lucide-react";
import { BarraDesglose } from "./BarraDesglose";
import { DrawerDetalleTramite, TramiteDetalleDrawerData } from "./DrawerDetalleTramite";
import { BadgeEstado } from "@/components/ui/BadgeEstado";
import { formatCurrency, formatDate } from "@/lib/utils";
import { CalidadDato, MetricasRelojA, MetricasRelojB, MetricasHistoricoParcial } from "@/lib/tiemposCalculator";

export interface TramiteAuditoriaRow {
  id_tramite: number;
  codigo_tramite: string;
  numero_quipux: string;
  proveedor_nombre: string;
  proveedor_ruc?: string;
  tipo_proceso: string;
  tipo_codigo?: string;
  padre_gestion: "PAGO" | "GARANTIA";
  monto_solicitado: number;
  estado_actual: string;
  sub_estado?: string | null;
  esta_pausado?: boolean;
  custodio_nombre?: string;
  custodio_cargo?: string;
  area_nombre?: string;
  fecha_ingreso?: string | Date | null;
  fecha_recepcion_fisica?: string | Date | null;
  fecha_memorando?: string | Date | null;
  fecha_pago?: string | Date | null;
  fecha_autorizacion_pago?: string | Date | null;
  calidad_dato: CalidadDato;
  alerta_inconsistencia: boolean;
  motivos_alerta?: string[];
  propuestas_correccion?: string[];
  es_analista_compartido?: boolean;
  analistas_detectados?: string[];
  reloj_a?: MetricasRelojA;
  reloj_b?: MetricasRelojB;
  historico_parcial?: MetricasHistoricoParcial;
  resultado_tiempos?: any;
}

interface TabAuditoriaTramitesProps {
  tramites: TramiteAuditoriaRow[];
  cargando?: boolean;
}

function calcularMediana(nums: number[]): number {
  if (nums.length === 0) return 0;
  const s = [...nums].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  if (s.length % 2 !== 0) return Number(s[mid].toFixed(1));
  return Number(((s[mid - 1] + s[mid]) / 2).toFixed(1));
}

export const TabAuditoriaTramites: React.FC<TabAuditoriaTramitesProps> = ({
  tramites,
  cargando = false,
}) => {
  // Estado para el Drawer
  const [tramiteSeleccionado, setTramiteSeleccionado] = useState<TramiteDetalleDrawerData | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  // Sub-vista: "principal" vs "inconsistencias"
  const [modoRevisionInconsistencias, setModoRevisionInconsistencias] = useState(false);

  // Paginación y ordenamiento
  const [pagina, setPagina] = useState(1);
  const [filasPorPagina, setFilasPorPagina] = useState(15);
  const [ordenCampo, setOrdenCampo] = useState<"fecha" | "dias_a" | "dias_b" | "codigo">("fecha");
  const [ordenAsc, setOrdenAsc] = useState(false);

  // 1. CÁLCULO DE LOS 4 KPIS SUPERIORES LIMPIOS
  const kpis = useMemo(() => {
    const total = tramites.length;

    // Mediana Reloj A (Total calendario)
    const tiemposA = tramites
      .map((t) => t.reloj_a?.total_calendario_dias)
      .filter((n): n is number => typeof n === "number" && !isNaN(n));
    const medianaRelojA = calcularMediana(tiemposA);

    // Mediana Reloj B (Trabajo real en días hábiles)
    const tiemposB = tramites
      .filter((t) => t.reloj_b?.aplica && typeof t.reloj_b.dias_laborables_efectivos === "number")
      .map((t) => t.reloj_b!.dias_laborables_efectivos as number);
    const medianaRelojB = tiemposB.length > 0 ? calcularMediana(tiemposB) : null;

    // Trámites Finalizados vs En Curso
    const completados = ["PAGADO", "ARCHIVO", "DEVUELTO", "INSUBSISTENTE", "ANULADO"];
    const totalFinalizados = tramites.filter((t) => completados.includes(t.estado_actual)).length;
    const totalEnCurso = total - totalFinalizados;

    // Inconsistencias
    const totalInconsistencias = tramites.filter((t) => t.alerta_inconsistencia).length;

    return {
      totalAnalizados: total,
      medianaRelojA,
      medianaRelojB,
      totalFinalizados,
      totalEnCurso,
      totalInconsistencias,
    };
  }, [tramites]);

  // Filtrar según modo revisión
  const listaProcesada = useMemo(() => {
    let list = modoRevisionInconsistencias
      ? tramites.filter((t) => t.alerta_inconsistencia || t.calidad_dato === "INCOMPLETO")
      : tramites;

    // Ordenar
    list = [...list].sort((a, b) => {
      let valA: any = 0;
      let valB: any = 0;

      if (ordenCampo === "fecha") {
        valA = new Date(a.fecha_ingreso || a.fecha_recepcion_fisica || 0).getTime();
        valB = new Date(b.fecha_ingreso || b.fecha_recepcion_fisica || 0).getTime();
      } else if (ordenCampo === "dias_a") {
        valA = a.reloj_a?.total_calendario_dias || 0;
        valB = b.reloj_a?.total_calendario_dias || 0;
      } else if (ordenCampo === "dias_b") {
        valA = typeof a.reloj_b?.dias_laborables_efectivos === "number" ? a.reloj_b.dias_laborables_efectivos : -1;
        valB = typeof b.reloj_b?.dias_laborables_efectivos === "number" ? b.reloj_b.dias_laborables_efectivos : -1;
      } else if (ordenCampo === "codigo") {
        valA = a.codigo_tramite;
        valB = b.codigo_tramite;
      }

      if (valA < valB) return ordenAsc ? -1 : 1;
      if (valA > valB) return ordenAsc ? 1 : -1;
      return 0;
    });

    return list;
  }, [tramites, modoRevisionInconsistencias, ordenCampo, ordenAsc]);

  // Paginación
  const totalPaginas = Math.max(1, Math.ceil(listaProcesada.length / filasPorPagina));
  const tramitesPaginados = useMemo(() => {
    const inicio = (pagina - 1) * filasPorPagina;
    return listaProcesada.slice(inicio, inicio + filasPorPagina);
  }, [listaProcesada, pagina, filasPorPagina]);

  const cambiarOrden = (campo: "fecha" | "dias_a" | "dias_b" | "codigo") => {
    if (ordenCampo === campo) {
      setOrdenAsc(!ordenAsc);
    } else {
      setOrdenCampo(campo);
      setOrdenAsc(false);
    }
    setPagina(1);
  };

  const abrirDetalle = (t: TramiteAuditoriaRow) => {
    setTramiteSeleccionado(t as TramiteDetalleDrawerData);
    setDrawerOpen(true);
  };

  return (
    <div className="space-y-6">
      {/* 1. LOS 4 KPIS SUPERIORES LIMPIOS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1: Total Trámites */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm hover:shadow-md transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Total Trámites
            </span>
            <div className="p-2 rounded-xl bg-blue-50 text-blue-600">
              <FileText className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-slate-900 font-mono">
              {kpis.totalAnalizados}
            </span>
            <span className="text-xs text-slate-500">expedientes</span>
          </div>
          <p className="text-[11px] text-slate-500 mt-1">Trámites registrados en el periodo</p>
        </div>

        {/* KPI 2: Tiempo Total Promedio/Mediana */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm hover:shadow-md transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Tiempo Total (Días)
            </span>
            <div className="p-2 rounded-xl bg-indigo-50 text-indigo-600">
              <Clock className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-indigo-900 font-mono">
              {kpis.medianaRelojA}
            </span>
            <span className="text-xs font-semibold text-indigo-600">días calendario</span>
          </div>
          <p className="text-[11px] text-slate-500 mt-1">Mediana de días calendario transcurridos</p>
        </div>

        {/* KPI 3: Tiempo Real Trabajado Promedio/Mediana */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm hover:shadow-md transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Tiempo Real Trabajado
            </span>
            <div className="p-2 rounded-xl bg-emerald-50 text-emerald-600">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            {kpis.medianaRelojB !== null ? (
              <>
                <span className="text-3xl font-extrabold text-emerald-900 font-mono">
                  {kpis.medianaRelojB}
                </span>
                <span className="text-xs font-semibold text-emerald-600">días hábiles</span>
              </>
            ) : (
              <>
                <span className="text-2xl font-bold text-slate-400 font-mono">n/d</span>
                <span className="text-[11px] text-slate-500">Histórico</span>
              </>
            )}
          </div>
          <p className="text-[11px] text-slate-500 mt-1">Días hábiles netos sin fines de semana ni pausas</p>
        </div>

        {/* KPI 4: Trámites Finalizados vs En Curso */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm hover:shadow-md transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Finalizados vs En Curso
            </span>
            <div className="p-2 rounded-xl bg-purple-50 text-purple-600">
              <Layers className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-extrabold text-emerald-700 font-mono">
              {kpis.totalFinalizados}
            </span>
            <span className="text-xs text-slate-400 font-bold">/</span>
            <span className="text-2xl font-extrabold text-amber-600 font-mono">
              {kpis.totalEnCurso}
            </span>
          </div>
          <div className="flex items-center gap-3 text-[11px] mt-1 font-medium">
            <span className="text-emerald-700 flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
              {kpis.totalFinalizados} Finalizados
            </span>
            <span className="text-amber-700 flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-amber-500 inline-block" />
              {kpis.totalEnCurso} En Curso
            </span>
          </div>
        </div>
      </div>

      {/* 2. BARRA DE CONTROL DE TABLA Y LEYENDA UNIFICADA */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        
        {/* Cabecera superior con selector de modo de vista y leyenda */}
        <div className="p-4 border-b border-slate-200 bg-slate-50 flex flex-col md:flex-row md:items-center justify-between gap-4">
          
          {/* Selector de Pestaña Secundaria / Modo */}
          <div className="flex items-center gap-1 bg-white p-1 rounded-xl border border-slate-200 shadow-xs">
            <button
              type="button"
              onClick={() => {
                setModoRevisionInconsistencias(false);
                setPagina(1);
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                !modoRevisionInconsistencias
                  ? "bg-blue-700 text-white shadow-sm"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Auditoría General ({tramites.length})
            </button>
            <button
              type="button"
              onClick={() => {
                setModoRevisionInconsistencias(true);
                setPagina(1);
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                modoRevisionInconsistencias
                  ? "bg-amber-600 text-white shadow-sm"
                  : "text-amber-800 hover:bg-amber-50"
              }`}
            >
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>Revisión de Inconsistencias ({kpis.totalInconsistencias})</span>
            </button>
          </div>

          {/* LEYENDA UNIFICADA ÚNICA ARRIBA DE LA TABLA */}
          <div className="flex items-center gap-3 flex-wrap text-[11px] text-slate-600">
            <span className="font-semibold text-slate-400 uppercase text-[10px] tracking-wider">
              Leyenda de Tiempos:
            </span>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-600" />
              <span>Trabajo</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
              <span>Pausa Factura</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-red-500" />
              <span>Observado 72h</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-gray-400" />
              <span>No laborables</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
              <span>Post-Autorización</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-slate-500" />
              <span>Tramos Migrados</span>
            </div>
          </div>
        </div>

        {/* 3. TABLA PRINCIPAL LIMPIA O VISTA DE REVISIÓN */}
        {!modoRevisionInconsistencias ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-100/75 text-slate-600 border-b border-slate-200 uppercase font-semibold text-[10px] tracking-wider">
                  <th
                    className="py-3 px-4 cursor-pointer hover:text-slate-900"
                    onClick={() => cambiarOrden("codigo")}
                  >
                    <div className="flex items-center gap-1">
                      <span>Quipux / Código</span>
                      <ArrowUpDown className="w-3 h-3 text-slate-400" />
                    </div>
                  </th>
                  <th className="py-3 px-4 text-center">Gestión</th>
                  <th className="py-3 px-4">Tipo de Proceso</th>
                  <th className="py-3 px-4">Proveedor / Beneficiario</th>
                  <th className="py-3 px-4 text-right">Monto ($)</th>
                  <th className="py-3 px-4 text-center">Estado</th>
                  <th
                    className="py-3 px-4 text-center cursor-pointer hover:text-slate-900 bg-slate-100 font-bold text-slate-900"
                    onClick={() => cambiarOrden("dias_a")}
                  >
                    <div className="flex items-center justify-center gap-1">
                      <span>Tiempo Total (Calendario)</span>
                      <ArrowUpDown className="w-3 h-3 text-slate-500" />
                    </div>
                  </th>
                  <th
                    className="py-3 px-4 text-center cursor-pointer hover:text-blue-900 bg-blue-50/80 font-bold text-blue-900"
                    onClick={() => cambiarOrden("dias_b")}
                  >
                    <div className="flex items-center justify-center gap-1">
                      <span>Tiempo Real Trabajado (Hábiles)</span>
                      <ArrowUpDown className="w-3 h-3 text-blue-500" />
                    </div>
                  </th>
                  <th className="py-3 px-4 text-center">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {tramitesPaginados.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-12 text-center text-slate-400 text-xs">
                      No se encontraron trámites con los criterios y filtros seleccionados.
                    </td>
                  </tr>
                ) : (
                  tramitesPaginados.map((t) => (
                    <tr
                      key={t.id_tramite}
                      onClick={() => abrirDetalle(t)}
                      className="hover:bg-blue-50/40 transition cursor-pointer group"
                    >
                      {/* Quipux / Código */}
                      <td className="py-3.5 px-4">
                        <div className="font-mono font-bold text-slate-900 group-hover:text-blue-700">
                          {t.numero_quipux || t.codigo_tramite}
                        </div>
                        <div className="text-[11px] text-slate-500 font-mono">
                          {t.codigo_tramite}
                        </div>
                      </td>

                      {/* Gestión (Pago / Garantía) */}
                      <td className="py-3.5 px-4 text-center">
                        <span
                          className={`inline-block text-[11px] font-bold px-2.5 py-0.5 rounded-full ${
                            t.padre_gestion === "GARANTIA"
                              ? "bg-purple-100 text-purple-800 border border-purple-200"
                              : "bg-blue-100 text-blue-800 border border-blue-200"
                          }`}
                        >
                          {t.padre_gestion === "GARANTIA" ? "Garantía" : "Pago"}
                        </span>
                      </td>

                      {/* Tipo de Proceso */}
                      <td className="py-3.5 px-4">
                        <div className="text-slate-800 font-medium line-clamp-1 max-w-[190px]">
                          {t.tipo_proceso}
                        </div>
                        <div className="text-[10px] text-slate-400">{t.area_nombre || "General"}</div>
                      </td>

                      {/* Proveedor / Beneficiario */}
                      <td className="py-3.5 px-4">
                        <div className="text-slate-900 font-medium line-clamp-1 max-w-[200px]">
                          {t.proveedor_nombre}
                        </div>
                        {t.proveedor_ruc && (
                          <div className="text-[10px] text-slate-400 font-mono">
                            RUC: {t.proveedor_ruc}
                          </div>
                        )}
                      </td>

                      {/* Monto ($) */}
                      <td className="py-3.5 px-4 text-right font-mono font-semibold text-slate-900 whitespace-nowrap">
                        {formatCurrency(t.monto_solicitado)}
                      </td>

                      {/* Estado */}
                      <td className="py-3.5 px-4 text-center whitespace-nowrap">
                        <BadgeEstado estado={t.estado_actual} />
                      </td>

                      {/* Tiempo Total (Calendario) - DESTACADO */}
                      <td className="py-3.5 px-4 text-center bg-slate-50/60">
                        <span className="inline-block font-mono font-bold text-slate-900 bg-white px-3 py-1 rounded-lg text-xs border border-slate-300 shadow-2xs">
                          {t.reloj_a?.total_calendario_dias ?? 0} días
                        </span>
                      </td>

                      {/* Tiempo Real Trabajado (Hábiles) - DESTACADO */}
                      <td className="py-3.5 px-4 text-center bg-blue-50/40">
                        {t.reloj_b?.aplica && typeof t.reloj_b.dias_laborables_efectivos === "number" ? (
                          <span className="inline-block font-mono font-bold text-blue-800 bg-blue-100/90 px-3 py-1 rounded-lg text-xs border border-blue-300 shadow-2xs">
                            {t.reloj_b.dias_laborables_efectivos} días
                          </span>
                        ) : (
                          <span className="inline-block font-mono font-medium text-slate-400 bg-slate-100 px-2.5 py-1 rounded-lg text-xs">
                            n/d
                          </span>
                        )}
                      </td>

                      {/* Acción */}
                      <td className="py-3.5 px-4 text-center whitespace-nowrap">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            abrirDetalle(t);
                          }}
                          className="px-3 py-1.5 bg-blue-700 hover:bg-blue-800 text-white rounded-lg text-xs font-semibold shadow-xs transition active:scale-95 flex items-center gap-1 mx-auto"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>Ver Detalle</span>
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        ) : (
          /* TABLA DE REVISIÓN DE INCONSISTENCIAS / DATOS INCOMPLETOS */
          <div className="overflow-x-auto">
            <div className="bg-amber-50/70 p-3 text-xs text-amber-900 border-b border-amber-200 flex items-center gap-2">
              <Info className="w-4 h-4 text-amber-700 flex-shrink-0" />
              <span>
                Esta vista prioriza los expedientes que presentan fechas incoherentes, marcas de tiempo
                pre-sistema o discrepancias cronológicas para facilitar la revisión humana.
              </span>
            </div>
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-amber-100/50 text-amber-900 border-b border-amber-200 uppercase font-semibold text-[10px] tracking-wider">
                  <th className="py-3 px-4">Trámite / Quipux</th>
                  <th className="py-3 px-4">Proveedor</th>
                  <th className="py-3 px-4">Calidad</th>
                  <th className="py-3 px-4">Motivos de la Alerta</th>
                  <th className="py-3 px-4">Propuesta de Corrección Humana</th>
                  <th className="py-3 px-4 text-center">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-amber-100">
                {tramitesPaginados.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-emerald-700 text-xs font-semibold">
                      ¡Excelente! No hay inconsistencias en este conjunto de trámites.
                    </td>
                  </tr>
                ) : (
                  tramitesPaginados.map((t) => (
                    <tr
                      key={t.id_tramite}
                      onClick={() => abrirDetalle(t)}
                      className="hover:bg-amber-50 transition cursor-pointer"
                    >
                      <td className="py-3 px-4">
                        <div className="font-mono font-bold text-slate-900">{t.codigo_tramite}</div>
                        <div className="text-[11px] text-slate-500 font-mono">{t.numero_quipux}</div>
                      </td>
                      <td className="py-3 px-4 font-medium text-slate-800">{t.proveedor_nombre}</td>
                      <td className="py-3 px-4">
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-100 text-amber-800 border border-amber-200">
                          {t.calidad_dato}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-amber-950 font-medium">
                        {t.motivos_alerta && t.motivos_alerta.length > 0 ? (
                          <ul className="list-disc list-inside space-y-0.5">
                            {t.motivos_alerta.map((m, idx) => (
                              <li key={idx}>{m}</li>
                            ))}
                          </ul>
                        ) : (
                          <span className="text-slate-400">Sin motivo específico</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-slate-800">
                        {t.propuestas_correccion && t.propuestas_correccion.length > 0 ? (
                          <ul className="space-y-0.5">
                            {t.propuestas_correccion.map((p, idx) => (
                              <li key={idx} className="flex items-start gap-1">
                                <ArrowRight className="w-3 h-3 text-amber-600 mt-0.5 flex-shrink-0" />
                                <span>{p}</span>
                              </li>
                            ))}
                          </ul>
                        ) : (
                          <span className="text-slate-400">Verificar expediente físico</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            abrirDetalle(t);
                          }}
                          className="px-2.5 py-1 bg-amber-600 text-white hover:bg-amber-700 rounded-lg text-xs font-semibold shadow-xs transition"
                        >
                          Corregir
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* 4. PAGINACIÓN ELEGANTE */}
        <div className="p-4 border-t border-slate-200 bg-white flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-600">
          <div className="flex items-center gap-2">
            <span>Mostrar</span>
            <select
              value={filasPorPagina}
              onChange={(e) => {
                setFilasPorPagina(Number(e.target.value));
                setPagina(1);
              }}
              className="border border-slate-300 rounded-lg px-2 py-1 outline-none text-slate-800"
            >
              <option value={10}>10</option>
              <option value={15}>15</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
            </select>
            <span>por página • Total {listaProcesada.length} trámites</span>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-slate-500">
              Página <strong>{pagina}</strong> de <strong>{totalPaginas}</strong>
            </span>
            <div className="flex items-center gap-1">
              <button
                type="button"
                disabled={pagina <= 1}
                onClick={() => setPagina((p) => Math.max(1, p - 1))}
                className="p-1.5 border border-slate-300 rounded-lg hover:bg-slate-100 disabled:opacity-40 transition"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                type="button"
                disabled={pagina >= totalPaginas}
                onClick={() => setPagina((p) => Math.min(totalPaginas, p + 1))}
                className="p-1.5 border border-slate-300 rounded-lg hover:bg-slate-100 disabled:opacity-40 transition"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

      </div>

      {/* DRAWER DETALLE TRAMITE */}
      <DrawerDetalleTramite
        isOpen={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        tramite={tramiteSeleccionado}
      />
    </div>
  );
};
