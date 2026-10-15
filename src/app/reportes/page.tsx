"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import {
  FileSpreadsheet,
  Calendar,
  Users,
  Clock,
  AlertTriangle,
  CheckCircle2,
  Download,
  RefreshCw,
  Search,
  Building2,
  ChevronRight,
  ChevronDown,
  TrendingDown,
  TrendingUp,
  Timer,
  AlertOctagon,
  FileText,
  PauseCircle,
  HelpCircle,
  UserCheck,
  Briefcase,
  Layers,
  PieChart,
  BarChart3,
  XCircle,
  FolderOpen,
  Archive,
} from "lucide-react";

interface Custodio {
  id_usuario: number;
  nombre_completo: string;
  cargo: string;
  area_nombre: string;
  total_tramites: number;
  en_plazo: number;
  en_riesgo: number;
  vencidos: number;
}

interface AreaStat {
  id_area: number;
  nombre: string;
  codigo: string;
  total: number;
  porcentaje: number;
}

interface TramiteDetalle {
  id_tramite: number;
  numero_tramite: string;
  numero_quipux: string;
  proveedor_nombre: string;
  proveedor_ruc?: string;
  tipo_proceso: string;
  tipo_codigo: string;
  fecha_ingreso_dfi: string;
  estado_actual: string;
  esta_pausado: boolean;
  custodio_nombre: string;
  custodio_cargo: string;
  area_nombre: string;
  dias_habiles_totales: number;
  dias_pausa_factura: number;
  dias_habiles_efectivos: number;
  alerta_sla: string;
  monto_solicitado?: number;
  total_observaciones: number;
}

interface TipoProcesoStat {
  id_tipo: number;
  codigo: string;
  nombre: string;
  total_tramites: number;
  promedio_dias_habiles: number;
  tramites_en_plazo: number;
  tramites_vencidos: number;
  tasa_cumplimiento: number;
  fases_promedio: {
    dfi: number;
    presupuesto: number;
    pausa_factura: number;
    contabilidad: number;
    caja: number;
  };
  fase_mayor_demora: string;
}

interface FaseComparativo {
  fase: string;
  area: string;
  dias_promedio: number;
  porcentaje_tiempo: number;
  diagnostico: string;
  alerta: string;
}

interface CausaDemora {
  causa: string;
  descripcion: string;
  tramites_afectados: number;
  porcentaje_afectacion: number;
  impacto_promedio_dias: number;
  categoria: string;
}

interface FuncionarioDesempeno {
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
  sla_limite_dias: number;
  detalle_tramites: Array<{
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
  }>;
}

interface FuncionarioCargaActual {
  id_usuario: number;
  nombre_completo: string;
  cargo: string;
  area_nombre: string;
  total_tramites_actuales: number;
  tiempo_promedio_dias: number;
  en_plazo: number;
  en_riesgo: number;
  vencidos: number;
  tramites: Array<{
    id_tramite: number;
    nro_tramite?: string;
    numero_quipux: string;
    proveedor_beneficiario: string;
    tipo_proceso: string;
    monto_total: number;
    fecha_llegada: string;
    dias_en_mesa: number;
    sla_limite_dias: number;
    semaforo_sla: "VERDE" | "AMARILLO" | "ROJO";
    estado_general: string;
  }>;
}

export default function ReportesPage() {
  const [tabActiva, setTabActiva] = useState<
    "custodia" | "tiempos" | "desempeno" | "carga_actual" | "indicadores"
  >("custodia");
  const [metricasSLA, setMetricasSLA] = useState<any>(null);
  const [loadingMetricasSLA, setLoadingMetricasSLA] = useState<boolean>(false);
  const [fechaDesde, setFechaDesde] = useState<string>("2026-08-01");
  const [fechaHasta, setFechaHasta] = useState<string>("2026-10-31");
  const [filtroTexto, setFiltroTexto] = useState<string>("");
  const [filtroFuncionario, setFiltroFuncionario] = useState<string>("");

  const [funcionarioExpandidoDesempeno, setFuncionarioExpandidoDesempeno] =
    useState<number | null>(null);
  const [funcionarioExpandidoCarga, setFuncionarioExpandidoCarga] = useState<
    number | null
  >(null);

  const [loading, setLoading] = useState<boolean>(true);
  const [data, setData] = useState<{
    resumen: {
      total_ingresados: number;
      total_en_proceso: number;
      total_pagados: number;
      total_observados_o_pausados: number;
    };
    custodio_por_usuario: Custodio[];
    custodia_por_area: AreaStat[];
    distribucion_estados: Record<string, number>;
    tramites: TramiteDetalle[];
    por_tipo_proceso: TipoProcesoStat[];
    fases_comparativo: FaseComparativo[];
    causas_demora: CausaDemora[];
    reporte_desempeno_funcionarios: FuncionarioDesempeno[];
    reporte_carga_actual_funcionarios: FuncionarioCargaActual[];
  } | null>(null);

  const cargarMetricasSLA = async () => {
    setLoadingMetricasSLA(true);
    try {
      const res = await fetch("/api/dashboard/metricas");
      const json = await res.json();
      if (json.metricas) {
        setMetricasSLA(json.metricas);
      }
    } catch (err) {
      console.error("Error al cargar métricas SLA:", err);
    } finally {
      setLoadingMetricasSLA(false);
    }
  };

  const cargarReportes = async () => {
    setLoading(true);
    try {
      const url = `/api/reportes?fecha_desde=${fechaDesde}&fecha_hasta=${fechaHasta}`;
      const res = await fetch(url);
      const json = await res.json();
      if (json.success) {
        setData({
          resumen: json.reporte_ingresos_custodia.resumen,
          custodio_por_usuario: json.reporte_ingresos_custodia.custodia_por_usuario,
          custodia_por_area: json.reporte_ingresos_custodia.custodia_por_area,
          distribucion_estados: json.reporte_ingresos_custodia.distribucion_estados,
          tramites: json.reporte_ingresos_custodia.tramites,
          por_tipo_proceso: json.reporte_tardanza_procesos.por_tipo_proceso,
          fases_comparativo: json.reporte_tardanza_procesos.fases_comparativo,
          causas_demora: json.reporte_tardanza_procesos.causas_demora,
          reporte_desempeno_funcionarios:
            json.reporte_desempeno_funcionarios || [],
          reporte_carga_actual_funcionarios:
            json.reporte_carga_actual_funcionarios || [],
        });
      }
    } catch (err) {
      console.error("Error al cargar reportes:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargarReportes();
    cargarMetricasSLA();
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const tab = params.get("tab");
      if (tab === "indicadores") {
        setTabActiva("indicadores");
      }
    }
  }, [fechaDesde, fechaHasta]);

  // Accesos rápidos de rango
  const setPresetRange = (diasAtras: number) => {
    const hasta = new Date();
    const desde = new Date();
    desde.setDate(desde.getDate() - diasAtras);
    setFechaHasta(hasta.toISOString().split("T")[0]);
    setFechaDesde(desde.toISOString().split("T")[0]);
  };

  // Filtrado de trámites en pestaña 1
  const tramitesFiltrados = (data?.tramites || []).filter((t) => {
    if (!filtroTexto.trim()) return true;
    const term = filtroTexto.toLowerCase();
    return (
      t.numero_tramite.toLowerCase().includes(term) ||
      t.numero_quipux.toLowerCase().includes(term) ||
      t.proveedor_nombre.toLowerCase().includes(term) ||
      t.custodio_nombre.toLowerCase().includes(term) ||
      t.area_nombre.toLowerCase().includes(term) ||
      t.estado_actual.toLowerCase().includes(term)
    );
  });

  // Totales globales para cálculo de gráficos en Desempeño
  const metricasDesempenoGlobal = useMemo(() => {
    const list = data?.reporte_desempeno_funcionarios || [];
    let totalRecibidos = 0;
    let totalDespachados = 0;
    let totalATiempo = 0;
    let totalConRetraso = 0;
    let totalEnCurso = 0;

    list.forEach((f) => {
      totalRecibidos += f.total_tramites_recibidos;
      totalDespachados += f.tramites_despachados;
      totalATiempo += f.entregados_a_tiempo;
      totalConRetraso += f.entregados_con_retraso;
      totalEnCurso += f.en_curso;
    });

    const tasaGlobal =
      totalDespachados > 0
        ? Math.round((totalATiempo / totalDespachados) * 100)
        : totalRecibidos > 0
        ? 100
        : 100;

    return {
      totalRecibidos,
      totalDespachados,
      totalATiempo,
      totalConRetraso,
      totalEnCurso,
      tasaGlobal,
    };
  }, [data?.reporte_desempeno_funcionarios]);

  // Totales globales para cálculo de gráficos en Carga Actual
  const metricasCargaGlobal = useMemo(() => {
    const list = data?.reporte_carga_actual_funcionarios || [];
    let totalTramites = 0;
    let totalEnPlazo = 0;
    let totalEnRiesgo = 0;
    let totalVencidos = 0;

    list.forEach((f) => {
      totalTramites += f.total_tramites_actuales;
      totalEnPlazo += f.en_plazo;
      totalEnRiesgo += f.en_riesgo;
      totalVencidos += f.vencidos;
    });

    return {
      totalTramites,
      totalEnPlazo,
      totalEnRiesgo,
      totalVencidos,
    };
  }, [data?.reporte_carga_actual_funcionarios]);

  // Filtrado de lista de funcionarios en pestaña desempeño
  const funcionariosDesempenoFiltrados = useMemo(() => {
    const list = data?.reporte_desempeno_funcionarios || [];
    if (!filtroFuncionario.trim()) return list;
    const term = filtroFuncionario.toLowerCase();
    return list.filter(
      (f) =>
        f.nombre_completo.toLowerCase().includes(term) ||
        f.cargo.toLowerCase().includes(term) ||
        f.area_nombre.toLowerCase().includes(term)
    );
  }, [data?.reporte_desempeno_funcionarios, filtroFuncionario]);

  // Filtrado de lista de funcionarios en pestaña carga actual
  const funcionariosCargaFiltrados = useMemo(() => {
    const list = data?.reporte_carga_actual_funcionarios || [];
    if (!filtroFuncionario.trim()) return list;
    const term = filtroFuncionario.toLowerCase();
    return list.filter(
      (f) =>
        f.nombre_completo.toLowerCase().includes(term) ||
        f.cargo.toLowerCase().includes(term) ||
        f.area_nombre.toLowerCase().includes(term)
    );
  }, [data?.reporte_carga_actual_funcionarios, filtroFuncionario]);

  return (
    <div className="space-y-6">
      {/* Encabezado Principal */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 bg-blue-50 text-blue-700 rounded-xl shadow-xs">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900 tracking-tight">
                Módulo de Reportería Institucional
              </h1>
              <p className="text-xs text-slate-500 mt-0.5">
                Custodia de expedientes físicos, desempeño por funcionario y tiempos por fase institucional.
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 self-start lg:self-auto">
          <a
            href={`/api/reportes/exportar?fecha_desde=${fechaDesde}&fecha_hasta=${fechaHasta}`}
            download
            className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-xs transition-colors"
          >
            <Download className="w-4 h-4" />
            Descargar Excel Oficial
          </a>

          <button
            onClick={cargarReportes}
            disabled={loading}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors border border-slate-200"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            Actualizar
          </button>
        </div>
      </div>

      {/* Barra de Filtros de Fecha */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 text-xs text-slate-600 font-medium">
            <Calendar className="w-4 h-4 text-slate-400" />
            <span>Periodo de análisis:</span>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="date"
              value={fechaDesde}
              onChange={(e) => setFechaDesde(e.target.value)}
              className="px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500 font-medium"
            />
            <span className="text-xs text-slate-400 font-semibold">hasta</span>
            <input
              type="date"
              value={fechaHasta}
              onChange={(e) => setFechaHasta(e.target.value)}
              className="px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500 font-medium"
            />
          </div>
        </div>

        {/* Accesos rápidos de rango */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <button
            onClick={() => setPresetRange(30)}
            className="px-2.5 py-1 text-[11px] font-medium bg-slate-100 hover:bg-slate-200 rounded-md text-slate-700 transition-colors"
          >
            Últimos 30 días
          </button>
          <button
            onClick={() => setPresetRange(60)}
            className="px-2.5 py-1 text-[11px] font-medium bg-slate-100 hover:bg-slate-200 rounded-md text-slate-700 transition-colors"
          >
            Últimos 60 días
          </button>
          <button
            onClick={() => setPresetRange(90)}
            className="px-2.5 py-1 text-[11px] font-medium bg-slate-100 hover:bg-slate-200 rounded-md text-slate-700 transition-colors"
          >
            Últimos 90 días
          </button>
          <button
            onClick={() => {
              setFechaDesde("2026-01-01");
              setFechaHasta("2026-12-31");
            }}
            className="px-2.5 py-1 text-[11px] font-medium bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-md text-blue-700 transition-colors"
          >
            Año 2026
          </button>
        </div>
      </div>

      {/* Tabs Selectoras */}
      <div className="flex border-b border-slate-200 gap-2 overflow-x-auto">
        <button
          onClick={() => setTabActiva("custodia")}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold rounded-t-lg transition-all border-b-2 whitespace-nowrap ${
            tabActiva === "custodia"
              ? "border-blue-600 text-blue-600 bg-white shadow-xs"
              : "border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-50"
          }`}
        >
          <Users className="w-4 h-4" />
          1. Ingresos y Custodia Actual
          {data?.resumen.total_ingresados ? (
            <span className="ml-1 px-2 py-0.5 rounded-full text-[10px] bg-blue-100 text-blue-700 font-bold">
              {data.resumen.total_ingresados}
            </span>
          ) : null}
        </button>

        <button
          onClick={() => setTabActiva("tiempos")}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold rounded-t-lg transition-all border-b-2 whitespace-nowrap ${
            tabActiva === "tiempos"
              ? "border-indigo-600 text-indigo-700 bg-white shadow-xs"
              : "border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-50"
          }`}
        >
          <Clock className="w-4 h-4" />
          2. Tiempos y Causas de Retraso
        </button>

        <button
          onClick={() => setTabActiva("desempeno")}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold rounded-t-lg transition-all border-b-2 whitespace-nowrap ${
            tabActiva === "desempeno"
              ? "border-emerald-600 text-emerald-700 bg-white shadow-xs"
              : "border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-50"
          }`}
        >
          <UserCheck className="w-4 h-4" />
          3. Desempeño por Funcionario
          {data?.reporte_desempeno_funcionarios?.length ? (
            <span className="ml-1 px-2 py-0.5 rounded-full text-[10px] bg-emerald-100 text-emerald-800 font-bold">
              {data.reporte_desempeno_funcionarios.length}
            </span>
          ) : null}
        </button>

        <button
          onClick={() => setTabActiva("carga_actual")}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold rounded-t-lg transition-all border-b-2 whitespace-nowrap ${
            tabActiva === "carga_actual"
              ? "border-amber-600 text-amber-800 bg-white shadow-xs"
              : "border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-50"
          }`}
        >
          <Layers className="w-4 h-4" />
          4. Carga Actual en Mesa
          {metricasCargaGlobal.totalTramites > 0 ? (
            <span className="ml-1 px-2 py-0.5 rounded-full text-[10px] bg-amber-100 text-amber-900 font-bold">
              {metricasCargaGlobal.totalTramites} en mesa
            </span>
          ) : null}
        </button>

        <button
          onClick={() => setTabActiva("indicadores")}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold rounded-t-lg transition-all border-b-2 whitespace-nowrap ${
            tabActiva === "indicadores"
              ? "border-blue-600 text-blue-700 bg-white shadow-xs"
              : "border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-50"
          }`}
        >
          <BarChart3 className="w-4 h-4" />
          5. Indicadores y Semáforos SLA
          {metricasSLA?.enFlujoActivo > 0 ? (
            <span className="ml-1 px-2 py-0.5 rounded-full text-[10px] bg-blue-100 text-blue-800 font-bold">
              {metricasSLA.enFlujoActivo} activos
            </span>
          ) : null}
        </button>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* PESTAÑA 1: INGRESOS Y CUSTODIA ACTUAL                          */}
      {/* ------------------------------------------------------------- */}
      {tabActiva === "custodia" && (
        <div className="space-y-6">
          {/* Tarjetas KPI */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
              <div className="text-xs font-semibold text-slate-500 uppercase">
                Total Ingresados
              </div>
              <div className="text-2xl font-bold text-slate-900 mt-1">
                {data?.resumen.total_ingresados || 0}
              </div>
              <div className="text-[11px] text-slate-400 mt-1">
                En el rango seleccionado
              </div>
            </div>

            <div className="bg-white p-4 rounded-xl border border-blue-200 bg-blue-50/20 shadow-xs">
              <div className="text-xs font-semibold text-blue-700 uppercase">
                En Gestión Activa
              </div>
              <div className="text-2xl font-bold text-blue-800 mt-1">
                {data?.resumen.total_en_proceso || 0}
              </div>
              <div className="text-[11px] text-blue-600 mt-1">
                Fluyendo en departamentos
              </div>
            </div>

            <div className="bg-white p-4 rounded-xl border border-emerald-200 bg-emerald-50/20 shadow-xs">
              <div className="text-xs font-semibold text-emerald-700 uppercase">
                Trámites Pagados
              </div>
              <div className="text-2xl font-bold text-emerald-800 mt-1">
                {data?.resumen.total_pagados || 0}
              </div>
              <div className="text-[11px] text-emerald-600 mt-1">
                Ciclo institucional completado
              </div>
            </div>

            <div className="bg-white p-4 rounded-xl border border-amber-200 bg-amber-50/20 shadow-xs">
              <div className="text-xs font-semibold text-amber-700 uppercase">
                Pausados / Observados
              </div>
              <div className="text-2xl font-bold text-amber-800 mt-1">
                {data?.resumen.total_observados_o_pausados || 0}
              </div>
              <div className="text-[11px] text-amber-600 mt-1">
                Factura SRI pendiente o 72h
              </div>
            </div>
          </div>

          {/* Gráfico y Distribución por Custodio y Área */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Custodia por Funcionario */}
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <Users className="w-4 h-4 text-blue-600" />
                  Custodia Física por Funcionario
                </h3>
                <span className="text-xs text-slate-400">
                  {data?.custodio_por_usuario.length || 0} funcionarios con trámites
                </span>
              </div>

              <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
                {data?.custodio_por_usuario.map((c) => (
                  <div
                    key={c.id_usuario}
                    className="p-3 bg-slate-50 hover:bg-slate-100 rounded-lg border border-slate-100 transition-colors flex items-center justify-between gap-3 text-xs"
                  >
                    <div className="min-w-0">
                      <div className="font-semibold text-slate-900 truncate">
                        {c.nombre_completo}
                      </div>
                      <div className="text-[11px] text-slate-500 truncate">
                        {c.cargo} • {c.area_nombre}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <span className="px-2 py-0.5 rounded font-bold bg-blue-100 text-blue-800 text-[11px]">
                        {c.total_tramites} trámites
                      </span>
                    </div>
                  </div>
                ))}

                {(!data?.custodio_por_usuario || data.custodio_por_usuario.length === 0) && (
                  <div className="py-8 text-center text-xs text-slate-400">
                    No hay información de custodios en este periodo.
                  </div>
                )}
              </div>
            </div>

            {/* Distribución por Área */}
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-emerald-600" />
                  Distribución de Expedientes por Área
                </h3>
              </div>

              <div className="space-y-3">
                {data?.custodia_por_area.map((a) => (
                  <div key={a.id_area} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-medium text-slate-700">{a.nombre}</span>
                      <span className="font-bold text-slate-900">
                        {a.total} ({a.porcentaje}%)
                      </span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                      <div
                        className="bg-blue-600 h-2 rounded-full transition-all"
                        style={{ width: `${a.porcentaje}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Tabla de Expedientes Ingresados */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  Detalle de Trámites Ingresados en el Periodo
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Lista completa con tiempos transcurridos, alertas SLA y custodio actual.
                </p>
              </div>

              <div className="relative w-full sm:w-72">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Buscar por trámite, proveedor, custodio..."
                  value={filtroTexto}
                  onChange={(e) => setFiltroTexto(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-600 border-b border-slate-200">
                  <tr>
                    <th className="py-2.5 px-3 font-semibold">Trámite Quipux</th>
                    <th className="py-2.5 px-3 font-semibold">Proveedor</th>
                    <th className="py-2.5 px-3 font-semibold">Tipo Proceso</th>
                    <th className="py-2.5 px-3 font-semibold">Fecha Ingreso</th>
                    <th className="py-2.5 px-3 font-semibold">Estado</th>
                    <th className="py-2.5 px-3 font-semibold">Custodio Actual</th>
                    <th className="py-2.5 px-3 font-semibold">Área</th>
                    <th className="py-2.5 px-3 font-semibold text-center">Días Hábiles (SLA 6d)</th>
                    <th className="py-2.5 px-3 font-semibold text-center">Acción</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {tramitesFiltrados.map((t) => (
                    <tr key={t.id_tramite} className="hover:bg-slate-50 transition-colors">
                      <td className="py-2.5 px-3">
                        <div className="font-bold font-mono text-blue-700">{t.numero_quipux}</div>
                      </td>
                      <td className="py-2.5 px-3 text-slate-700 max-w-[200px] truncate">
                        {t.proveedor_nombre}
                      </td>
                      <td className="py-2.5 px-3 text-slate-600 max-w-[180px] truncate">
                        {t.tipo_proceso}
                      </td>
                      <td className="py-2.5 px-3 text-slate-600 font-mono">
                        {t.fecha_ingreso_dfi}
                      </td>
                      <td className="py-2.5 px-3">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700">
                          {t.estado_actual}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-slate-800 font-medium">
                        {t.custodio_nombre}
                      </td>
                      <td className="py-2.5 px-3 text-slate-500 text-[11px]">
                        {t.area_nombre}
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <span
                          className={`px-2 py-0.5 rounded font-bold ${
                            t.alerta_sla === "FUERA_DE_PLAZO"
                              ? "bg-rose-100 text-rose-800"
                              : t.alerta_sla === "EN_RIESGO"
                              ? "bg-amber-100 text-amber-800"
                              : "bg-emerald-100 text-emerald-800"
                          }`}
                        >
                          {t.dias_habiles_efectivos}d
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <Link
                          href={`/tramite/${t.id_tramite}`}
                          className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-800 font-semibold"
                        >
                          Ficha
                          <ChevronRight className="w-3.5 h-3.5" />
                        </Link>
                      </td>
                    </tr>
                  ))}
                  {tramitesFiltrados.length === 0 && (
                    <tr>
                      <td colSpan={9} className="py-8 text-center text-slate-400">
                        No se encontraron trámites coincidentes con los filtros.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* PESTAÑA 2: TIEMPOS Y CAUSAS DE RETRASO                        */}
      {/* ------------------------------------------------------------- */}
      {tabActiva === "tiempos" && (
        <div className="space-y-6">
          {/* Banner institucional */}
          <div className="bg-gradient-to-r from-slate-900 to-blue-950 text-white p-5 rounded-xl shadow-md border border-slate-800 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Timer className="w-5 h-5 text-amber-400" />
                <h2 className="text-base font-bold">
                  Diagnóstico Estadístico de Tiempos Institucionales (SLA 6 Días Hábiles)
                </h2>
              </div>
              <p className="text-xs text-slate-300 max-w-3xl leading-relaxed">
                Este reporte analiza matemáticamente los tiempos transcurridos en cada fase
                a partir de la bitácora inmutable del historial de movimientos, detallando los tiempos promedio
                por departamento y los factores reales de retraso.
              </p>
            </div>
            <div className="bg-white/10 px-4 py-2 rounded-lg border border-white/10 text-center shrink-0">
              <div className="text-[10px] uppercase tracking-wider text-slate-300 font-medium">
                Normativa SENAE
              </div>
              <div className="text-xl font-bold text-amber-300">6 Días Hábiles</div>
            </div>
          </div>

          {/* PARTE 1: Tiempo Promedio por Fase Institucional */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-5 space-y-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Clock className="w-4 h-4 text-blue-600" />
                1. Tiempo Promedio por Fase Institucional
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Desglose del ciclo total de pago entre las 4 áreas departamentales
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {data?.fases_comparativo.map((fase) => (
                <div
                  key={fase.fase}
                  className={`p-4 rounded-xl border transition-all ${
                    fase.alerta === "ALTO"
                      ? "border-amber-300 bg-amber-50/20"
                      : "border-slate-200 bg-white"
                  }`}
                >
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-700 truncate">{fase.area}</span>
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        fase.alerta === "ALTO"
                          ? "bg-amber-100 text-amber-900"
                          : fase.alerta === "MEDIO"
                          ? "bg-blue-100 text-blue-800"
                          : "bg-emerald-100 text-emerald-800"
                      }`}
                    >
                      {fase.alerta === "ALTO" ? "Mayor Carga" : fase.alerta}
                    </span>
                  </div>

                  <div className="mt-2">
                    <div className="text-2xl font-bold text-slate-900">
                      {fase.dias_promedio} <span className="text-sm font-normal text-slate-500">días hábiles</span>
                    </div>
                    <div className="text-xs font-semibold text-blue-700 mt-0.5">
                      {fase.porcentaje_tiempo}% del tiempo total de trámite
                    </div>
                  </div>

                  <div className="mt-3 w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                    <div
                      className={`h-2 rounded-full ${
                        fase.alerta === "ALTO"
                          ? "bg-amber-500"
                          : fase.alerta === "MEDIO"
                          ? "bg-blue-500"
                          : "bg-emerald-500"
                      }`}
                      style={{ width: `${Math.max(8, fase.porcentaje_tiempo)}%` }}
                    />
                  </div>

                  <p className="text-[11px] text-slate-500 mt-2.5 leading-snug">
                    {fase.diagnostico}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* PARTE 2: Factores y Causas Principales de Retraso */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-5 space-y-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-600" />
                2. Factores y Causas Principales de Retraso
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Variables externas e internas que impactan el cumplimiento del plazo institucional
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {data?.causas_demora.map((causa, idx) => (
                <div
                  key={causa.causa}
                  className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-slate-50 transition-colors space-y-2.5"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-800 flex items-center justify-center font-bold text-xs shrink-0">
                        {idx + 1}
                      </span>
                      <h4 className="text-xs font-bold text-slate-900">
                        {causa.causa}
                      </h4>
                    </div>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-200 text-slate-700 shrink-0">
                      {causa.categoria}
                    </span>
                  </div>

                  <p className="text-xs text-slate-600 leading-relaxed">
                    {causa.descripcion}
                  </p>

                  <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-200 text-slate-600 font-medium">
                    <div>
                      Trámites afectados:{" "}
                      <span className="font-bold text-slate-900">
                        {causa.tramites_afectados} ({causa.porcentaje_afectacion}%)
                      </span>
                    </div>
                    <div>
                      Impacto prom.:{" "}
                      <span className="font-bold text-amber-700">
                        +{causa.impacto_promedio_dias} días
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* PARTE 3: MATRIZ DE RENDIMIENTO POR TIPO DE PROCESO */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="p-4 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <FileText className="w-4 h-4 text-blue-600" />
                3. Matriz de Tiempos y SLA por Tipo de Proceso
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Comparativa de tiempos promedio totales y fase de mayor permanencia en cada tipo de trámite
              </p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-600 border-b border-slate-200">
                  <tr>
                    <th className="py-2.5 px-3 font-semibold">Tipo de Proceso</th>
                    <th className="py-2.5 px-3 font-semibold text-center">Total</th>
                    <th className="py-2.5 px-3 font-semibold text-center">Promedio Total</th>
                    <th className="py-2.5 px-3 font-semibold text-center">% Cumplimiento (≤6d)</th>
                    <th className="py-2.5 px-3 font-semibold text-center">DFI</th>
                    <th className="py-2.5 px-3 font-semibold text-center">Presupuesto</th>
                    <th className="py-2.5 px-3 font-semibold text-center">Factura (Pausa)</th>
                    <th className="py-2.5 px-3 font-semibold text-center">Contabilidad</th>
                    <th className="py-2.5 px-3 font-semibold text-center">Tesorería</th>
                    <th className="py-2.5 px-3 font-semibold">Fase con Mayor Demora</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {data?.por_tipo_proceso.map((t) => (
                    <tr key={t.id_tipo} className="hover:bg-slate-50 transition-colors">
                      <td className="py-2.5 px-3">
                        <div className="font-bold text-slate-900">{t.nombre}</div>
                        <div className="text-[10px] text-slate-400 font-mono">{t.codigo}</div>
                      </td>
                      <td className="py-2.5 px-3 text-center font-bold text-slate-800">
                        {t.total_tramites}
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <span
                          className={`px-2 py-0.5 rounded font-bold ${
                            t.promedio_dias_habiles > 6
                              ? "bg-rose-100 text-rose-800"
                              : t.promedio_dias_habiles >= 5
                              ? "bg-amber-100 text-amber-800"
                              : "bg-emerald-100 text-emerald-800"
                          }`}
                        >
                          {t.promedio_dias_habiles}d
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-center font-bold">
                        <span
                          className={`${
                            t.tasa_cumplimiento >= 80
                              ? "text-emerald-700"
                              : t.tasa_cumplimiento >= 60
                              ? "text-amber-700"
                              : "text-rose-700"
                          }`}
                        >
                          {t.tasa_cumplimiento}%
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-center text-slate-600 font-mono">
                        {t.fases_promedio.dfi}d
                      </td>
                      <td className="py-2.5 px-3 text-center text-slate-600 font-mono">
                        {t.fases_promedio.presupuesto}d
                      </td>
                      <td className="py-2.5 px-3 text-center text-slate-600 font-mono">
                        {t.fases_promedio.pausa_factura}d
                      </td>
                      <td className="py-2.5 px-3 text-center text-slate-600 font-mono">
                        {t.fases_promedio.contabilidad}d
                      </td>
                      <td className="py-2.5 px-3 text-center text-slate-600 font-mono">
                        {t.fases_promedio.caja}d
                      </td>
                      <td className="py-2.5 px-3">
                        <span className="inline-block px-2 py-0.5 rounded text-[11px] font-semibold bg-blue-50 text-blue-800 border border-blue-200">
                          {t.fase_mayor_demora}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {(!data?.por_tipo_proceso || data.por_tipo_proceso.length === 0) && (
                    <tr>
                      <td colSpan={10} className="py-6 text-center text-slate-400">
                        No hay estadísticas para el periodo seleccionado.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* PESTAÑA 3: REPORTE DE DESEMPEÑO POR FUNCIONARIO (HISTÓRICO)    */}
      {/* ------------------------------------------------------------- */}
      {tabActiva === "desempeno" && (
        <div className="space-y-6">
          {/* Tarjetas KPI de Desempeño */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
              <div className="text-xs font-semibold text-slate-500 uppercase">
                Trámites en Escritorios
              </div>
              <div className="text-2xl font-bold text-slate-900 mt-1">
                {metricasDesempenoGlobal.totalRecibidos}
              </div>
              <div className="text-[11px] text-slate-400 mt-1">
                Pasaron por mesas en el periodo
              </div>
            </div>

            <div className="bg-white p-4 rounded-xl border border-emerald-200 bg-emerald-50/20 shadow-xs">
              <div className="text-xs font-semibold text-emerald-700 uppercase">
                Despachados a Tiempo
              </div>
              <div className="text-2xl font-bold text-emerald-800 mt-1">
                {metricasDesempenoGlobal.totalATiempo}
              </div>
              <div className="text-[11px] text-emerald-600 mt-1">
                Dentro del SLA de fase institucional
              </div>
            </div>

            <div className="bg-white p-4 rounded-xl border border-rose-200 bg-rose-50/20 shadow-xs">
              <div className="text-xs font-semibold text-rose-700 uppercase">
                Con Retraso de Fase
              </div>
              <div className="text-2xl font-bold text-rose-800 mt-1">
                {metricasDesempenoGlobal.totalConRetraso}
              </div>
              <div className="text-[11px] text-rose-600 mt-1">
                Superaron los días permitidos en mesa
              </div>
            </div>

            <div className="bg-white p-4 rounded-xl border border-blue-200 bg-blue-50/20 shadow-xs">
              <div className="text-xs font-semibold text-blue-700 uppercase">
                Tasa Global de Cumplimiento
              </div>
              <div className="text-2xl font-bold text-blue-800 mt-1">
                {metricasDesempenoGlobal.tasaGlobal}%
              </div>
              <div className="text-[11px] text-blue-600 mt-1">
                Promedio ponderado institucional
              </div>
            </div>
          </div>

          {/* Gráficos Visuales: Barras de Cumplimiento y Donut Pastel */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Gráfico Donut Pastel de Distribución */}
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <PieChart className="w-4 h-4 text-emerald-600" />
                  Efectividad Global de Entrega
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Proporción de entregas a tiempo vs retrasos
                </p>
              </div>

              {/* Donut SVG Moderno */}
              <div className="py-6 flex flex-col items-center justify-center">
                <div className="relative w-44 h-44 flex items-center justify-center">
                  <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                    {/* Círculo base gris */}
                    <circle
                      cx="50"
                      cy="50"
                      r="40"
                      fill="transparent"
                      stroke="#f1f5f9"
                      strokeWidth="12"
                    />
                    {/* Segmento A Tiempo (verde menta pastel) */}
                    <circle
                      cx="50"
                      cy="50"
                      r="40"
                      fill="transparent"
                      stroke="#10b981"
                      strokeWidth="12"
                      strokeDasharray={`${(metricasDesempenoGlobal.tasaGlobal * 251.2) / 100} 251.2`}
                      strokeLinecap="round"
                    />
                  </svg>
                  <div className="absolute flex flex-col items-center justify-center text-center">
                    <span className="text-3xl font-extrabold text-slate-900 tracking-tight">
                      {metricasDesempenoGlobal.tasaGlobal}%
                    </span>
                    <span className="text-[10px] font-semibold uppercase text-emerald-700 tracking-wider">
                      Cumplimiento
                    </span>
                  </div>
                </div>

                <div className="mt-4 flex items-center justify-center gap-4 text-xs font-medium">
                  <div className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded-full bg-emerald-500 shrink-0" />
                    <span className="text-slate-700">
                      A tiempo ({metricasDesempenoGlobal.totalATiempo})
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded-full bg-rose-400 shrink-0" />
                    <span className="text-slate-700">
                      Con retraso ({metricasDesempenoGlobal.totalConRetraso})
                    </span>
                  </div>
                </div>
              </div>

              <div className="p-3 bg-slate-50 rounded-lg border border-slate-100 text-[11px] text-slate-500 leading-relaxed text-center">
                Mide los trámites que el funcionario despachó dentro de los plazos reglamentarios de su área institucional.
              </div>
            </div>

            {/* Gráfico de Barras de Cumplimiento por Funcionario */}
            <div className="lg:col-span-2 bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                    <BarChart3 className="w-4 h-4 text-blue-600" />
                    Tasa de Cumplimiento por Funcionario
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Comparativa de cumplimiento de entregas a tiempo en mesa
                  </p>
                </div>
                <span className="text-xs font-semibold text-slate-400">
                  {funcionariosDesempenoFiltrados.length} funcionarios
                </span>
              </div>

              <div className="space-y-3.5 max-h-[340px] overflow-y-auto pr-2">
                {funcionariosDesempenoFiltrados.map((f) => (
                  <div key={f.id_usuario} className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900 truncate">
                          {f.nombre_completo}
                        </span>
                        <span className="text-[11px] text-slate-400 font-normal truncate">
                          ({f.cargo})
                        </span>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-[11px] text-slate-500 font-mono">
                          {f.entregados_a_tiempo} de {f.tramites_despachados} a tiempo
                        </span>
                        <span
                          className={`font-bold px-1.5 py-0.5 rounded text-[11px] ${
                            f.tasa_cumplimiento >= 80
                              ? "bg-emerald-100 text-emerald-800"
                              : f.tasa_cumplimiento >= 60
                              ? "bg-amber-100 text-amber-800"
                              : "bg-rose-100 text-rose-800"
                          }`}
                        >
                          {f.tasa_cumplimiento}%
                        </span>
                      </div>
                    </div>

                    {/* Barra visual suave */}
                    <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden flex">
                      <div
                        className="bg-emerald-500 h-full transition-all"
                        style={{
                          width: `${
                            f.tramites_despachados > 0
                              ? (f.entregados_a_tiempo / f.tramites_despachados) * 100
                              : 100
                          }%`,
                        }}
                        title={`A tiempo: ${f.entregados_a_tiempo}`}
                      />
                      <div
                        className="bg-rose-400 h-full transition-all"
                        style={{
                          width: `${
                            f.tramites_despachados > 0
                              ? (f.entregados_con_retraso / f.tramites_despachados) * 100
                              : 0
                          }%`,
                        }}
                        title={`Con retraso: ${f.entregados_con_retraso}`}
                      />
                    </div>
                  </div>
                ))}

                {funcionariosDesempenoFiltrados.length === 0 && (
                  <div className="py-12 text-center text-xs text-slate-400">
                    No se encontraron funcionarios coincidentes.
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Tabla Detallada con Desglose por Funcionario */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  Desglose Detallado de Trámites por Mesa de Funcionario
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Haz clic en cualquier funcionario para inspeccionar cada expediente que pasó por su escritorio.
                </p>
              </div>

              <div className="relative w-full sm:w-72">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Filtrar por nombre, cargo, área..."
                  value={filtroFuncionario}
                  onChange={(e) => setFiltroFuncionario(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-600 border-b border-slate-200">
                  <tr>
                    <th className="py-2.5 px-3 font-semibold">Funcionario</th>
                    <th className="py-2.5 px-3 font-semibold">Área</th>
                    <th className="py-2.5 px-3 font-semibold text-center">Recibidos</th>
                    <th className="py-2.5 px-3 font-semibold text-center">Despachados</th>
                    <th className="py-2.5 px-3 font-semibold text-center">A Tiempo</th>
                    <th className="py-2.5 px-3 font-semibold text-center">Con Retraso</th>
                    <th className="py-2.5 px-3 font-semibold text-center">En Mesa</th>
                    <th className="py-2.5 px-3 font-semibold text-center">Cumplimiento</th>
                    <th className="py-2.5 px-3 font-semibold text-center">Prom. Mesa</th>
                    <th className="py-2.5 px-3 font-semibold text-center">Expedientes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {funcionariosDesempenoFiltrados.map((f) => {
                    const isExpanded = funcionarioExpandidoDesempeno === f.id_usuario;
                    return (
                      <React.Fragment key={f.id_usuario}>
                        <tr
                          className={`hover:bg-slate-50 transition-colors ${
                            isExpanded ? "bg-blue-50/30" : ""
                          }`}
                        >
                          <td className="py-2.5 px-3">
                            <div className="font-bold text-slate-900">
                              {f.nombre_completo}
                            </div>
                            <div className="text-[11px] text-slate-500">
                              {f.cargo}
                            </div>
                          </td>
                          <td className="py-2.5 px-3 text-slate-600 text-[11px]">
                            {f.area_nombre}
                          </td>
                          <td className="py-2.5 px-3 text-center font-bold text-slate-800">
                            {f.total_tramites_recibidos}
                          </td>
                          <td className="py-2.5 px-3 text-center text-slate-700">
                            {f.tramites_despachados}
                          </td>
                          <td className="py-2.5 px-3 text-center font-semibold text-emerald-700">
                            {f.entregados_a_tiempo}
                          </td>
                          <td className="py-2.5 px-3 text-center font-semibold text-rose-700">
                            {f.entregados_con_retraso}
                          </td>
                          <td className="py-2.5 px-3 text-center text-slate-500">
                            {f.en_curso}
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            <span
                              className={`px-2 py-0.5 rounded font-bold ${
                                f.tasa_cumplimiento >= 80
                                  ? "bg-emerald-100 text-emerald-800"
                                  : f.tasa_cumplimiento >= 60
                                  ? "bg-amber-100 text-amber-800"
                                  : "bg-rose-100 text-rose-800"
                              }`}
                            >
                              {f.tasa_cumplimiento}%
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-center font-mono text-slate-700">
                            {f.tiempo_promedio_dias}d
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            <button
                              onClick={() =>
                                setFuncionarioExpandidoDesempeno(
                                  isExpanded ? null : f.id_usuario
                                )
                              }
                              className="inline-flex items-center gap-1 px-2 py-1 text-[11px] font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-md transition-colors"
                            >
                              {isExpanded ? "Ocultar" : "Ver detalle"}
                              {isExpanded ? (
                                <ChevronDown className="w-3.5 h-3.5" />
                              ) : (
                                <ChevronRight className="w-3.5 h-3.5" />
                              )}
                            </button>
                          </td>
                        </tr>

                        {/* Desglose de Trámites Expandido */}
                        {isExpanded && (
                          <tr className="bg-slate-50/70">
                            <td colSpan={10} className="p-4">
                              <div className="bg-white rounded-lg border border-slate-200 p-4 space-y-3 shadow-xs">
                                <div className="flex items-center justify-between text-xs">
                                  <span className="font-bold text-slate-900">
                                    Historial de Expedientes que pasaron por el escritorio de {f.nombre_completo}
                                  </span>
                                  <span className="text-slate-500">
                                    SLA permitido en mesa: <strong className="text-blue-700">{f.sla_limite_dias} días hábiles</strong>
                                  </span>
                                </div>

                                <div className="overflow-x-auto">
                                  <table className="w-full text-left text-xs">
                                    <thead className="bg-slate-100 text-slate-600 border-b border-slate-200">
                                      <tr>
                                        <th className="py-2 px-3">N° Trámite Quipux</th>
                                        <th className="py-2 px-3">Proveedor</th>
                                        <th className="py-2 px-3">Tipo Proceso</th>
                                        <th className="py-2 px-3 text-center">Llegada a Mesa</th>
                                        <th className="py-2 px-3 text-center">Despacho</th>
                                        <th className="py-2 px-3 text-center">Días en Mesa</th>
                                        <th className="py-2 px-3 text-center">Cumplimiento</th>
                                        <th className="py-2 px-3 text-center">Acción</th>
                                      </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                      {f.detalle_tramites.map((dt) => (
                                        <tr key={dt.id_tramite} className="hover:bg-slate-50">
                                          <td className="py-2 px-3 font-mono font-bold text-blue-700">
                                            {dt.numero_quipux || dt.nro_tramite}
                                          </td>
                                          <td className="py-2 px-3 text-slate-700 max-w-[200px] truncate">
                                            {dt.proveedor}
                                          </td>
                                          <td className="py-2 px-3 text-slate-600 max-w-[160px] truncate">
                                            {dt.tipo_proceso}
                                          </td>
                                          <td className="py-2 px-3 text-center font-mono text-slate-600">
                                            {dt.fecha_llegada}
                                          </td>
                                          <td className="py-2 px-3 text-center font-mono text-slate-600">
                                            {dt.fecha_salida || "En curso"}
                                          </td>
                                          <td className="py-2 px-3 text-center font-mono font-bold text-slate-800">
                                            {dt.dias_en_mesa}d
                                          </td>
                                          <td className="py-2 px-3 text-center">
                                            <span
                                              className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                                dt.estado_entrega === "A_TIEMPO"
                                                  ? "bg-emerald-100 text-emerald-800"
                                                  : dt.estado_entrega === "CON_RETRASO"
                                                  ? "bg-rose-100 text-rose-800"
                                                  : "bg-blue-100 text-blue-800"
                                              }`}
                                            >
                                              {dt.estado_entrega === "A_TIEMPO"
                                                ? "A Tiempo"
                                                : dt.estado_entrega === "CON_RETRASO"
                                                ? "Con Retraso"
                                                : "En Mesa"}
                                            </span>
                                          </td>
                                          <td className="py-2 px-3 text-center">
                                            <Link
                                              href={`/tramite/${dt.id_tramite}`}
                                              className="text-blue-600 hover:text-blue-800 font-semibold"
                                            >
                                              Ficha →
                                            </Link>
                                          </td>
                                        </tr>
                                      ))}
                                      {f.detalle_tramites.length === 0 && (
                                        <tr>
                                          <td colSpan={8} className="py-4 text-center text-slate-400">
                                            No se registran trámites recibidos en este periodo.
                                          </td>
                                        </tr>
                                      )}
                                    </tbody>
                                  </table>
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* PESTAÑA 4: REPORTE DE CARGA ACTUAL EN MESA (TIEMPO REAL)       */}
      {/* ------------------------------------------------------------- */}
      {tabActiva === "carga_actual" && (
        <div className="space-y-6">
          {/* Tarjetas KPI de Carga Actual */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
              <div className="text-xs font-semibold text-slate-500 uppercase">
                Total Expedientes en Mesa
              </div>
              <div className="text-2xl font-bold text-slate-900 mt-1">
                {metricasCargaGlobal.totalTramites}
              </div>
              <div className="text-[11px] text-slate-400 mt-1">
                Físicamente en custodia en este instante
              </div>
            </div>

            <div className="bg-white p-4 rounded-xl border border-emerald-200 bg-emerald-50/20 shadow-xs">
              <div className="text-xs font-semibold text-emerald-700 uppercase">
                En Plazo Normal (Verde)
              </div>
              <div className="text-2xl font-bold text-emerald-800 mt-1">
                {metricasCargaGlobal.totalEnPlazo}
              </div>
              <div className="text-[11px] text-emerald-600 mt-1">
                Menos del 75% del SLA de área transcurrido
              </div>
            </div>

            <div className="bg-white p-4 rounded-xl border border-amber-200 bg-amber-50/20 shadow-xs">
              <div className="text-xs font-semibold text-amber-700 uppercase">
                En Riesgo (Amarillo)
              </div>
              <div className="text-2xl font-bold text-amber-800 mt-1">
                {metricasCargaGlobal.totalEnRiesgo}
              </div>
              <div className="text-[11px] text-amber-600 mt-1">
                Cerca de alcanzar el límite de tiempo
              </div>
            </div>

            <div className="bg-white p-4 rounded-xl border border-rose-200 bg-rose-50/20 shadow-xs">
              <div className="text-xs font-semibold text-rose-700 uppercase">
                Fuera de Plazo (Rojo)
              </div>
              <div className="text-2xl font-bold text-rose-800 mt-1">
                {metricasCargaGlobal.totalVencidos}
              </div>
              <div className="text-[11px] text-rose-600 mt-1">
                Superaron los días permitidos en la mesa
              </div>
            </div>
          </div>

          {/* Gráfico Visual de Carga por Funcionario */}
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <Layers className="w-4 h-4 text-amber-600" />
                  Distribución de Carga de Expedientes en Tiempo Real
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Cantidad de carpetas físicas en cada escritorio clasificadas por semáforo de tiempo
                </p>
              </div>

              <div className="flex items-center gap-3 text-xs font-medium">
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                  En Plazo
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
                  En Riesgo
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
                  Vencidos
                </span>
              </div>
            </div>

            <div className="space-y-3 pt-2">
              {funcionariosCargaFiltrados
                .filter((f) => f.total_tramites_actuales > 0)
                .map((f) => (
                  <div key={f.id_usuario} className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <div>
                        <span className="font-bold text-slate-900">{f.nombre_completo}</span>
                        <span className="text-slate-400 font-normal ml-1.5">
                          • {f.area_nombre}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-slate-500">
                          {f.tiempo_promedio_dias}d prom. en mesa
                        </span>
                        <span className="font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded text-[11px]">
                          {f.total_tramites_actuales} carpetas
                        </span>
                      </div>
                    </div>

                    {/* Barra apilada con tonos pastel */}
                    <div className="w-full bg-slate-100 rounded-full h-3.5 overflow-hidden flex shadow-inner">
                      {f.en_plazo > 0 && (
                        <div
                          className="bg-emerald-500 h-full transition-all flex items-center justify-center text-[9px] text-white font-bold"
                          style={{
                            width: `${(f.en_plazo / f.total_tramites_actuales) * 100}%`,
                          }}
                          title={`En plazo: ${f.en_plazo}`}
                        >
                          {f.en_plazo}
                        </div>
                      )}
                      {f.en_riesgo > 0 && (
                        <div
                          className="bg-amber-400 h-full transition-all flex items-center justify-center text-[9px] text-white font-bold"
                          style={{
                            width: `${(f.en_riesgo / f.total_tramites_actuales) * 100}%`,
                          }}
                          title={`En riesgo: ${f.en_riesgo}`}
                        >
                          {f.en_riesgo}
                        </div>
                      )}
                      {f.vencidos > 0 && (
                        <div
                          className="bg-rose-500 h-full transition-all flex items-center justify-center text-[9px] text-white font-bold"
                          style={{
                            width: `${(f.vencidos / f.total_tramites_actuales) * 100}%`,
                          }}
                          title={`Vencidos: ${f.vencidos}`}
                        >
                          {f.vencidos}
                        </div>
                      )}
                    </div>
                  </div>
                ))}

              {funcionariosCargaFiltrados.filter((f) => f.total_tramites_actuales > 0)
                .length === 0 && (
                <div className="py-12 text-center text-xs text-slate-400">
                  No hay expedientes activos en mesas actualmente.
                </div>
              )}
            </div>
          </div>

          {/* Tabla de Carga Actual por Funcionario */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  Inventario Físico de Expedientes en Mesas
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Inspecciona qué trámites tiene actualmente cada funcionario y cuántos días llevan en su escritorio.
                </p>
              </div>

              <div className="relative w-full sm:w-72">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Filtrar funcionario o área..."
                  value={filtroFuncionario}
                  onChange={(e) => setFiltroFuncionario(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-600 border-b border-slate-200">
                  <tr>
                    <th className="py-2.5 px-3 font-semibold">Funcionario</th>
                    <th className="py-2.5 px-3 font-semibold">Área</th>
                    <th className="py-2.5 px-3 font-semibold text-center">Total en Mesa</th>
                    <th className="py-2.5 px-3 font-semibold text-center">En Plazo</th>
                    <th className="py-2.5 px-3 font-semibold text-center">En Riesgo</th>
                    <th className="py-2.5 px-3 font-semibold text-center">Vencidos</th>
                    <th className="py-2.5 px-3 font-semibold text-center">Promedio en Mesa</th>
                    <th className="py-2.5 px-3 font-semibold text-center">Detalle Físico</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {funcionariosCargaFiltrados.map((f) => {
                    const isExpanded = funcionarioExpandidoCarga === f.id_usuario;
                    return (
                      <React.Fragment key={f.id_usuario}>
                        <tr
                          className={`hover:bg-slate-50 transition-colors ${
                            isExpanded ? "bg-amber-50/20" : ""
                          }`}
                        >
                          <td className="py-2.5 px-3">
                            <div className="font-bold text-slate-900">
                              {f.nombre_completo}
                            </div>
                            <div className="text-[11px] text-slate-500">
                              {f.cargo}
                            </div>
                          </td>
                          <td className="py-2.5 px-3 text-slate-600 text-[11px]">
                            {f.area_nombre}
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            <span
                              className={`px-2.5 py-0.5 rounded-full font-bold text-xs ${
                                f.total_tramites_actuales > 0
                                  ? "bg-blue-100 text-blue-800"
                                  : "bg-slate-100 text-slate-500"
                              }`}
                            >
                              {f.total_tramites_actuales}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-center font-bold text-emerald-700">
                            {f.en_plazo}
                          </td>
                          <td className="py-2.5 px-3 text-center font-bold text-amber-700">
                            {f.en_riesgo}
                          </td>
                          <td className="py-2.5 px-3 text-center font-bold text-rose-700">
                            {f.vencidos}
                          </td>
                          <td className="py-2.5 px-3 text-center font-mono text-slate-700">
                            {f.tiempo_promedio_dias}d
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            <button
                              onClick={() =>
                                setFuncionarioExpandidoCarga(
                                  isExpanded ? null : f.id_usuario
                                )
                              }
                              disabled={f.total_tramites_actuales === 0}
                              className={`inline-flex items-center gap-1 px-2 py-1 text-[11px] font-semibold rounded-md transition-colors ${
                                f.total_tramites_actuales > 0
                                  ? "text-blue-700 bg-blue-50 hover:bg-blue-100"
                                  : "text-slate-400 bg-slate-50 cursor-not-allowed"
                              }`}
                            >
                              {isExpanded ? "Cerrar" : "Ver trámites"}
                              {isExpanded ? (
                                <ChevronDown className="w-3.5 h-3.5" />
                              ) : (
                                <ChevronRight className="w-3.5 h-3.5" />
                              )}
                            </button>
                          </td>
                        </tr>

                        {/* Desglose de Trámites en Mesa */}
                        {isExpanded && f.total_tramites_actuales > 0 && (
                          <tr className="bg-amber-50/15">
                            <td colSpan={8} className="p-4">
                              <div className="bg-white rounded-lg border border-slate-200 p-4 space-y-3 shadow-xs">
                                <div className="flex items-center justify-between text-xs">
                                  <span className="font-bold text-slate-900 flex items-center gap-2">
                                    <FolderOpen className="w-4 h-4 text-amber-600" />
                                    Expedientes físicos actualmente en el escritorio de {f.nombre_completo}
                                  </span>
                                  <span className="text-slate-500">
                                    Total: <strong>{f.total_tramites_actuales} trámites</strong>
                                  </span>
                                </div>

                                <div className="overflow-x-auto">
                                  <table className="w-full text-left text-xs">
                                    <thead className="bg-slate-100 text-slate-600 border-b border-slate-200">
                                      <tr>
                                        <th className="py-2 px-3">N° Trámite Quipux</th>
                                        <th className="py-2 px-3">Proveedor / Beneficiario</th>
                                        <th className="py-2 px-3">Tipo de Proceso</th>
                                        <th className="py-2 px-3 text-right">Monto Total</th>
                                        <th className="py-2 px-3 text-center">Llegada a Mesa</th>
                                        <th className="py-2 px-3 text-center">Días en Mesa</th>
                                        <th className="py-2 px-3 text-center">Semáforo</th>
                                        <th className="py-2 px-3 text-center">Acción</th>
                                      </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                      {f.tramites.map((tr) => (
                                        <tr key={tr.id_tramite} className="hover:bg-slate-50">
                                          <td className="py-2 px-3 font-mono font-bold text-blue-700">
                                            {tr.numero_quipux || tr.nro_tramite}
                                          </td>
                                          <td className="py-2 px-3 text-slate-700 max-w-[200px] truncate">
                                            {tr.proveedor_beneficiario}
                                          </td>
                                          <td className="py-2 px-3 text-slate-600 max-w-[160px] truncate">
                                            {tr.tipo_proceso}
                                          </td>
                                          <td className="py-2 px-3 text-right font-mono font-medium text-slate-700">
                                            ${tr.monto_total.toLocaleString("es-EC", { minimumFractionDigits: 2 })}
                                          </td>
                                          <td className="py-2 px-3 text-center font-mono text-slate-600">
                                            {tr.fecha_llegada}
                                          </td>
                                          <td className="py-2 px-3 text-center font-mono font-bold text-slate-800">
                                            {tr.dias_en_mesa}d
                                          </td>
                                          <td className="py-2 px-3 text-center">
                                            <span
                                              className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                                tr.semaforo_sla === "VERDE"
                                                  ? "bg-emerald-100 text-emerald-800"
                                                  : tr.semaforo_sla === "AMARILLO"
                                                  ? "bg-amber-100 text-amber-800"
                                                  : "bg-rose-100 text-rose-800"
                                              }`}
                                            >
                                              {tr.semaforo_sla === "VERDE"
                                                ? "En Plazo"
                                                : tr.semaforo_sla === "AMARILLO"
                                                ? "En Riesgo"
                                                : "Vencido"}
                                            </span>
                                          </td>
                                          <td className="py-2 px-3 text-center">
                                            <Link
                                              href={`/tramite/${tr.id_tramite}`}
                                              className="text-blue-600 hover:text-blue-800 font-semibold"
                                            >
                                              Abrir →
                                            </Link>
                                          </td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* PESTAÑA 5: INDICADORES Y SEMÁFOROS SLA (6 DÍAS HÁBILES)         */}
      {/* ------------------------------------------------------------- */}
      {tabActiva === "indicadores" && (
        <div className="space-y-6">
          {/* Header de la pestaña */}
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2.5">
                <div className="p-2.5 bg-blue-50 text-blue-700 rounded-xl">
                  <BarChart3 className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-900 tracking-tight">
                    Tablero de Cumplimiento y Semáforos SLA Institucional (6 Días Hábiles)
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Monitoreo en tiempo real del ciclo operativo, estados de alerta y plazos según la normativa SENAE.
                  </p>
                </div>
              </div>
            </div>

            <button
              onClick={cargarMetricasSLA}
              disabled={loadingMetricasSLA}
              className="inline-flex items-center gap-2 px-3 py-2 text-xs font-medium text-slate-700 bg-slate-50 hover:bg-slate-100 rounded-lg transition-colors border border-slate-200 self-start sm:self-auto cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loadingMetricasSLA ? "animate-spin text-blue-600" : ""}`} />
              Actualizar Indicadores
            </button>
          </div>

          {/* Tarjetas KPI */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* 1. Total Registrados */}
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-2">
              <div className="flex items-center justify-between text-slate-500 text-xs font-semibold uppercase">
                <span>Total Trámites</span>
                <BarChart3 className="w-4 h-4 text-slate-400" />
              </div>
              <div className="text-2xl font-bold font-mono text-slate-900">
                {loadingMetricasSLA ? "..." : metricasSLA?.totalRegistrados ?? 0}
              </div>
              <p className="text-[11px] text-slate-500">Expedientes radicados en sistema</p>
            </div>

            {/* 2. En Flujo Activo */}
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-2">
              <div className="flex items-center justify-between text-blue-600 text-xs font-semibold uppercase">
                <span>En Flujo Activo</span>
                <Clock className="w-4 h-4 text-blue-500" />
              </div>
              <div className="text-2xl font-bold font-mono text-blue-700">
                {loadingMetricasSLA ? "..." : metricasSLA?.enFlujoActivo ?? 0}
              </div>
              <p className="text-[11px] text-slate-500">Expedientes en trámite operativo</p>
            </div>

            {/* 3. Pausados SLA */}
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-2">
              <div className="flex items-center justify-between text-amber-600 text-xs font-semibold uppercase">
                <span>Pausados SLA</span>
                <PauseCircle className="w-4 h-4 text-amber-500" />
              </div>
              <div className="text-2xl font-bold font-mono text-amber-700">
                {loadingMetricasSLA ? "..." : metricasSLA?.pausadosSLA ?? 0}
              </div>
              <p className="text-[11px] text-slate-500">En espera de factura u observación</p>
            </div>

            {/* 4. Alta Cuantía */}
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-2">
              <div className="flex items-center justify-between text-slate-700 text-xs font-semibold uppercase">
                <span>Alta Cuantía</span>
                <span className="text-xs font-bold text-amber-600">$$$</span>
              </div>
              <div className="text-2xl font-bold font-mono text-slate-900">
                {loadingMetricasSLA ? "..." : metricasSLA?.altaCuantia ?? 0}
              </div>
              <p className="text-[11px] text-slate-500">Monto ≥ $10.000 (Aprobación Jefatura)</p>
            </div>

            {/* 5. En Plazo 🟢 */}
            <div className="bg-emerald-50/50 p-5 rounded-xl border border-emerald-200 shadow-xs space-y-2">
              <div className="flex items-center justify-between text-emerald-800 text-xs font-semibold uppercase">
                <span>En Plazo (1-3 días)</span>
                <span className="text-sm">🟢</span>
              </div>
              <div className="text-2xl font-bold font-mono text-emerald-700">
                {loadingMetricasSLA ? "..." : metricasSLA?.enPlazo ?? 0}
              </div>
              <p className="text-[11px] text-emerald-700">Flujo ágil dentro de término</p>
            </div>

            {/* 6. Por Vencer 🟡 */}
            <div className="bg-amber-50/50 p-5 rounded-xl border border-amber-200 shadow-xs space-y-2">
              <div className="flex items-center justify-between text-amber-800 text-xs font-semibold uppercase">
                <span>Por Vencer (4-5 días)</span>
                <span className="text-sm">🟡</span>
              </div>
              <div className="text-2xl font-bold font-mono text-amber-700">
                {loadingMetricasSLA ? "..." : metricasSLA?.porVencer ?? 0}
              </div>
              <p className="text-[11px] text-amber-700">Alerta de prioridad preventiva</p>
            </div>

            {/* 7. Vencidos / En Mora 🔴 */}
            <div className="bg-rose-50/50 p-5 rounded-xl border border-rose-200 shadow-xs space-y-2">
              <div className="flex items-center justify-between text-rose-800 text-xs font-semibold uppercase">
                <span>Vencidos / Mora (≥ 6d)</span>
                <span className="text-sm">🔴</span>
              </div>
              <div className="text-2xl font-bold font-mono text-rose-700">
                {loadingMetricasSLA ? "..." : metricasSLA?.vencidos ?? 0}
              </div>
              <p className="text-[11px] text-rose-700">Fuera del término normativo de 6 días</p>
            </div>

            {/* 8. Archivados Definitivos */}
            <div className="bg-slate-50 p-5 rounded-xl border border-slate-200 shadow-xs space-y-2">
              <div className="flex items-center justify-between text-slate-700 text-xs font-semibold uppercase">
                <span>Archivados</span>
                <Archive className="w-4 h-4 text-slate-500" />
              </div>
              <div className="text-2xl font-bold font-mono text-slate-800">
                {loadingMetricasSLA ? "..." : metricasSLA?.finalizadosArchivados ?? 0}
              </div>
              <p className="text-[11px] text-slate-500">Ciclo completado y en custodia</p>
            </div>
          </div>

          {/* Barra de Cumplimiento Global */}
          {(() => {
            const activos = (metricasSLA?.enPlazo || 0) + (metricasSLA?.porVencer || 0) + (metricasSLA?.vencidos || 0);
            const pctEnPlazo = activos > 0 ? Math.round(((metricasSLA?.enPlazo || 0) / activos) * 100) : 100;
            const pctPorVencer = activos > 0 ? Math.round(((metricasSLA?.porVencer || 0) / activos) * 100) : 0;
            const pctVencidos = activos > 0 ? Math.round(((metricasSLA?.vencidos || 0) / activos) * 100) : 0;

            return (
              <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <h3 className="text-sm font-bold text-slate-800">
                      Tasa de Cumplimiento de Plazo Operativo Activo
                    </h3>
                    <p className="text-xs text-slate-500">
                      Proporción de trámites activos dentro del umbral de 6 días hábiles normativos.
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="text-xl font-bold font-mono text-emerald-700">{pctEnPlazo}%</span>
                    <span className="text-xs font-semibold text-slate-500 ml-1.5">en término</span>
                  </div>
                </div>

                {/* Barra multicolor */}
                <div className="w-full bg-slate-100 rounded-full h-3.5 flex overflow-hidden">
                  <div
                    style={{ width: `${pctEnPlazo}%` }}
                    className="bg-emerald-500 transition-all duration-500"
                    title={`En Plazo: ${pctEnPlazo}%`}
                  />
                  <div
                    style={{ width: `${pctPorVencer}%` }}
                    className="bg-amber-400 transition-all duration-500"
                    title={`Por Vencer: ${pctPorVencer}%`}
                  />
                  <div
                    style={{ width: `${pctVencidos}%` }}
                    className="bg-rose-500 transition-all duration-500"
                    title={`Vencidos / Mora: ${pctVencidos}%`}
                  />
                </div>

                <div className="flex flex-wrap items-center justify-between text-xs text-slate-600 pt-1">
                  <div className="flex items-center gap-4">
                    <span className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                      🟢 En Plazo: {metricasSLA?.enPlazo ?? 0} ({pctEnPlazo}%)
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
                      🟡 Por Vencer: {metricasSLA?.porVencer ?? 0} ({pctPorVencer}%)
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
                      🔴 Vencidos: {metricasSLA?.vencidos ?? 0} ({pctVencidos}%)
                    </span>
                  </div>
                  <div className="text-slate-500 font-medium text-[11px]">
                    Meta institucional SENAE: ≥ 95%
                  </div>
                </div>
              </div>
            );
          })()}

          {/* Guía Metodológica Oficial del SLA Normativo SENAE */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 space-y-3">
            <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
              <Clock className="w-4 h-4 text-blue-600" />
              Reglas Oficiales del Cómputo de Plazos Institucionales (SLA 6 Días)
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 text-xs text-slate-600">
              <div className="bg-white p-3.5 rounded-lg border border-slate-200/80 shadow-2xs space-y-1">
                <div className="font-semibold text-slate-800 flex items-center gap-1.5">
                  <span className="text-blue-600 font-bold">1.</span> Inicio del Cómputo
                </div>
                <p className="text-[11px] text-slate-500 leading-relaxed">
                  Inicia en el momento exacto en que la Jefatura de Presupuesto marca como <strong>Recibido Físicamente</strong> el expediente (<code className="text-[10px] bg-slate-100 px-1 py-0.5 rounded">INGRESADO ➔ REVISION</code>).
                </p>
              </div>

              <div className="bg-white p-3.5 rounded-lg border border-slate-200/80 shadow-2xs space-y-1">
                <div className="font-semibold text-slate-800 flex items-center gap-1.5">
                  <span className="text-emerald-600 font-bold">2.</span> Fin del Cómputo
                </div>
                <p className="text-[11px] text-slate-500 leading-relaxed">
                  Concluye cuando se efectúa la <strong>Autorización de Pago</strong> (<code className="text-[10px] bg-slate-100 px-1 py-0.5 rounded">AUTORIZADO_PAGO</code>) en Tesorería.
                </p>
              </div>

              <div className="bg-white p-3.5 rounded-lg border border-slate-200/80 shadow-2xs space-y-1">
                <div className="font-semibold text-slate-800 flex items-center gap-1.5">
                  <span className="text-amber-600 font-bold">3.</span> Días Descontados
                </div>
                <p className="text-[11px] text-slate-500 leading-relaxed">
                  No computan fines de semana, feriados nacionales, días no laborables configurados en Administración y pausas por factura u observación formal.
                </p>
              </div>

              <div className="bg-white p-3.5 rounded-lg border border-slate-200/80 shadow-2xs space-y-1">
                <div className="font-semibold text-slate-800 flex items-center gap-1.5">
                  <span className="text-purple-600 font-bold">4.</span> Trámites Exentos
                </div>
                <p className="text-[11px] text-slate-500 leading-relaxed">
                  Los trámites declarados <strong>INSUBSISTENTES</strong> o <strong>DEVUELTOS FORMALMENTE</strong> quedan congelados y marcados como <span className="font-bold text-slate-700">EXENTOS</span> del semáforo.
                </p>
              </div>

              <div className="bg-white p-3.5 rounded-lg border border-slate-200/80 shadow-2xs space-y-1">
                <div className="font-semibold text-slate-800 flex items-center gap-1.5">
                  <span className="text-indigo-600 font-bold">5.</span> Tiempo Calendario Global
                </div>
                <p className="text-[11px] text-slate-500 leading-relaxed">
                  El sistema registra de forma paralela el tiempo calendario total real hasta el archivo definitivo para fines de auditoría y bitácora, sin afectar el SLA legal.
                </p>
              </div>

              <div className="bg-white p-3.5 rounded-lg border border-slate-200/80 shadow-2xs space-y-1">
                <div className="font-semibold text-slate-800 flex items-center gap-1.5">
                  <span className="text-rose-600 font-bold">6.</span> Resoluciones & 72h
                </div>
                <p className="text-[11px] text-slate-500 leading-relaxed">
                  Las observaciones normativas deben subsanarse en un plazo máximo de 72 horas hábiles; el levantamiento solo puede realizarlo el creador o Administrador.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
