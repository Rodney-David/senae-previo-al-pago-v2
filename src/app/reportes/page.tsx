"use client";

import React, { useState, useEffect } from "react";
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
  TrendingDown,
  Timer,
  AlertOctagon,
  FileText,
  PauseCircle,
  HelpCircle,
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

export default function ReportesPage() {
  const [tabActiva, setTabActiva] = useState<"custodia" | "tardanza">("custodia");
  const [fechaDesde, setFechaDesde] = useState<string>("2026-08-01");
  const [fechaHasta, setFechaHasta] = useState<string>("2026-10-31");
  const [filtroTexto, setFiltroTexto] = useState<string>("");

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
  } | null>(null);

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
  }, [fechaDesde, fechaHasta]);

  // Accesos rápidos de rango
  const setPresetRange = (diasAtras: number) => {
    const hasta = new Date();
    const desde = new Date();
    desde.setDate(desde.getDate() - diasAtras);
    setFechaHasta(hasta.toISOString().split("T")[0]);
    setFechaDesde(desde.toISOString().split("T")[0]);
  };

  // Filtrado de trámites en memoria
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

  return (
    <div className="space-y-6">
      {/* Encabezado Principal */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-blue-50 text-blue-700 rounded-lg">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900 tracking-tight">
                Módulo de Reportería Institucional
              </h1>
              <p className="text-xs text-slate-500 mt-0.5">
                Ingresos y custodia actual de expedientes físicos, y análisis estadístico de cuellos de botella y tardanza.
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
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-slate-400" />
            <span className="text-xs font-semibold text-slate-700">Rango de Ingreso:</span>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="date"
              value={fechaDesde}
              onChange={(e) => setFechaDesde(e.target.value)}
              className="px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <span className="text-xs text-slate-400">hasta</span>
            <input
              type="date"
              value={fechaHasta}
              onChange={(e) => setFechaHasta(e.target.value)}
              className="px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Botones de Selección Rápida */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0">
          <span className="text-[11px] text-slate-400 mr-1 hidden sm:inline">Rápido:</span>
          <button
            onClick={() => setPresetRange(15)}
            className="px-2.5 py-1 text-[11px] font-medium bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-md text-slate-600 transition-colors"
          >
            15 días
          </button>
          <button
            onClick={() => setPresetRange(30)}
            className="px-2.5 py-1 text-[11px] font-medium bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-md text-slate-600 transition-colors"
          >
            30 días
          </button>
          <button
            onClick={() => setPresetRange(90)}
            className="px-2.5 py-1 text-[11px] font-medium bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-md text-slate-600 transition-colors"
          >
            90 días
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
      <div className="flex border-b border-slate-200 gap-2">
        <button
          onClick={() => setTabActiva("custodia")}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold rounded-t-lg transition-all border-b-2 ${
            tabActiva === "custodia"
              ? "border-blue-600 text-blue-600 bg-white shadow-xs"
              : "border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-50"
          }`}
        >
          <Users className="w-4 h-4" />
          1. Ingresos y Custodia Actual
          {data?.resumen.total_ingresados ? (
            <span className="ml-1.5 px-2 py-0.5 rounded-full text-[10px] bg-blue-100 text-blue-700">
              {data.resumen.total_ingresados}
            </span>
          ) : null}
        </button>

        <button
          onClick={() => setTabActiva("tardanza")}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold rounded-t-lg transition-all border-b-2 ${
            tabActiva === "tardanza"
              ? "border-amber-600 text-amber-700 bg-white shadow-xs"
              : "border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-50"
          }`}
        >
          <Clock className="w-4 h-4" />
          2. Tardanza y Cuellos de Botella
          <span className="ml-1.5 px-2 py-0.5 rounded-full text-[10px] bg-amber-100 text-amber-800">
            ¿Dónde y por qué?
          </span>
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
                Pagados Efectivos
              </div>
              <div className="text-2xl font-bold text-emerald-800 mt-1">
                {data?.resumen.total_pagados || 0}
              </div>
              <div className="text-[11px] text-emerald-600 mt-1">
                Ciclo completado satisfactoriamente
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
                En espera de factura o subsanación
              </div>
            </div>
          </div>

          {/* Grilla: Quién los tiene (Custodia por Funcionario) y Distribución por Área */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Custodia por Funcionario (2 columnas) */}
            <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
              <div className="p-4 border-b border-slate-100 flex items-center justify-between">
                <div>
                  <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                    <Users className="w-4 h-4 text-blue-600" />
                    Custodia Actual por Funcionario Responsable
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    ¿Quién tiene físicamente los expedientes en este momento?
                  </p>
                </div>
                <span className="text-xs font-semibold px-2 py-0.5 bg-slate-100 text-slate-700 rounded">
                  {data?.custodio_por_usuario.length || 0} funcionarios
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-600 border-b border-slate-200">
                    <tr>
                      <th className="py-2.5 px-3 font-semibold">Funcionario Custodio</th>
                      <th className="py-2.5 px-3 font-semibold">Área / Departamento</th>
                      <th className="py-2.5 px-3 font-semibold text-center">Trámites a Cargo</th>
                      <th className="py-2.5 px-3 font-semibold text-center">Estado SLA</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {data?.custodio_por_usuario.map((c) => (
                      <tr key={c.id_usuario} className="hover:bg-slate-50 transition-colors">
                        <td className="py-2.5 px-3">
                          <div className="font-semibold text-slate-900">{c.nombre_completo}</div>
                          <div className="text-[11px] text-slate-400">{c.cargo}</div>
                        </td>
                        <td className="py-2.5 px-3">
                          <span className="inline-block px-2 py-0.5 rounded text-[11px] font-medium bg-slate-100 text-slate-700 border border-slate-200">
                            {c.area_nombre}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          <span className="inline-block px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200">
                            {c.total_tramites}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            {c.en_plazo > 0 && (
                              <span
                                title="En plazo (<5 días)"
                                className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800"
                              >
                                {c.en_plazo} OK
                              </span>
                            )}
                            {c.en_riesgo > 0 && (
                              <span
                                title="En riesgo (5-6 días)"
                                className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800"
                              >
                                {c.en_riesgo} Riesgo
                              </span>
                            )}
                            {c.vencidos > 0 && (
                              <span
                                title="Vencidos (>6 días)"
                                className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-800"
                              >
                                {c.vencidos} Vencido
                              </span>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                    {(!data?.custodio_por_usuario || data.custodio_por_usuario.length === 0) && (
                      <tr>
                        <td colSpan={4} className="py-6 text-center text-slate-400">
                          No hay trámites registrados en el rango de fechas.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Custodia por Área (1 columna) */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-4 space-y-4">
              <div>
                <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-blue-600" />
                  Carga por Área Institucional
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Porcentaje del total de expedientes en cada área
                </p>
              </div>

              <div className="space-y-3 pt-2">
                {data?.custodia_por_area.map((area) => (
                  <div key={area.id_area} className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="font-medium text-slate-700">{area.nombre}</span>
                      <span className="font-bold text-slate-900">
                        {area.total} trámites ({area.porcentaje}%)
                      </span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                      <div
                        className="bg-blue-600 h-2 rounded-full transition-all"
                        style={{ width: `${Math.max(4, area.porcentaje)}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>

              {/* Estados actuales */}
              <div className="border-t border-slate-100 pt-4">
                <h3 className="text-xs font-bold text-slate-700 uppercase mb-2">
                  Distribución de Estados
                </h3>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  {Object.entries(data?.distribucion_estados || {}).map(([est, count]) => (
                    <div
                      key={est}
                      className="p-2 bg-slate-50 rounded-lg border border-slate-100 flex items-center justify-between"
                    >
                      <span className="text-[11px] text-slate-600 truncate">{est}</span>
                      <span className="font-bold text-slate-900">{count}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Listado Detallado de Trámites */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 className="text-sm font-bold text-slate-900">
                  Listado Detallado de Trámites Ingresados ({tramitesFiltrados.length})
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Auditoría completa de número, Quipux, custodio actual y días hábiles consumidos.
                </p>
              </div>

              <div className="relative w-full sm:w-64">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                <input
                  type="text"
                  placeholder="Buscar en el reporte..."
                  value={filtroTexto}
                  onChange={(e) => setFiltroTexto(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 text-xs border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-600 border-b border-slate-200">
                  <tr>
                    <th className="py-2.5 px-3 font-semibold">Trámite / Quipux</th>
                    <th className="py-2.5 px-3 font-semibold">Tipo de Proceso</th>
                    <th className="py-2.5 px-3 font-semibold">Proveedor</th>
                    <th className="py-2.5 px-3 font-semibold">Ingreso DFI</th>
                    <th className="py-2.5 px-3 font-semibold">Custodio Actual</th>
                    <th className="py-2.5 px-3 font-semibold">Área</th>
                    <th className="py-2.5 px-3 font-semibold text-center">Días Hábiles</th>
                    <th className="py-2.5 px-3 font-semibold text-center">Estado</th>
                    <th className="py-2.5 px-3 font-semibold text-center">Acción</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {tramitesFiltrados.map((t) => (
                    <tr key={t.id_tramite} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-2.5 px-3">
                        <div className="font-bold text-blue-700">{t.numero_tramite}</div>
                        <div className="text-[11px] text-slate-500 font-mono">{t.numero_quipux}</div>
                      </td>
                      <td className="py-2.5 px-3">
                        <span className="text-slate-800 font-medium">{t.tipo_proceso}</span>
                      </td>
                      <td className="py-2.5 px-3">
                        <span className="text-slate-700">{t.proveedor_nombre}</span>
                      </td>
                      <td className="py-2.5 px-3 text-slate-600 font-mono text-[11px]">
                        {new Date(t.fecha_ingreso_dfi).toLocaleDateString("es-EC")}
                      </td>
                      <td className="py-2.5 px-3">
                        <div className="font-medium text-slate-900">{t.custodio_nombre}</div>
                        <div className="text-[10px] text-slate-400">{t.custodio_cargo}</div>
                      </td>
                      <td className="py-2.5 px-3">
                        <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-slate-100 text-slate-700">
                          {t.area_nombre}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <div className="inline-flex flex-col items-center">
                          <span
                            className={`px-2 py-0.5 rounded font-bold text-xs ${
                              t.alerta_sla === "ROJO"
                                ? "bg-rose-100 text-rose-800"
                                : t.alerta_sla === "AMBAR"
                                ? "bg-amber-100 text-amber-800"
                                : "bg-emerald-100 text-emerald-800"
                            }`}
                          >
                            {t.dias_habiles_efectivos}d
                          </span>
                          {t.dias_pausa_factura > 0 && (
                            <span className="text-[10px] text-amber-600 mt-0.5">
                              (+{t.dias_pausa_factura}d pausa)
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-700 border border-slate-200 uppercase">
                          {t.estado_actual}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <Link
                          href={`/tramites/${t.id_tramite}`}
                          className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-800 hover:underline"
                        >
                          Ver Ficha
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
      {/* PESTAÑA 2: TARDANZA POR TIPO DE PROCESO (CUELLOS DE BOTELLA)  */}
      {/* ------------------------------------------------------------- */}
      {tabActiva === "tardanza" && (
        <div className="space-y-6">
          {/* Banner explicativo del análisis */}
          <div className="bg-gradient-to-r from-slate-900 to-blue-950 text-white p-5 rounded-xl shadow-md border border-slate-800 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Timer className="w-5 h-5 text-amber-400" />
                <h2 className="text-base font-bold">
                  Diagnóstico Estadístico de Cuellos de Botella (SLA 6 Días Hábiles)
                </h2>
              </div>
              <p className="text-xs text-slate-300 max-w-3xl leading-relaxed">
                Este reporte analiza matemáticamente los tiempos transcurridos en cada fase
                a partir de la bitácora inmutable del historial de movimientos, identificando en qué
                departamento se concentra la mayor demora y cuáles son los motivos reales de los retrasos.
              </p>
            </div>
            <div className="bg-white/10 px-4 py-2 rounded-lg border border-white/10 text-center shrink-0">
              <div className="text-[10px] uppercase tracking-wider text-slate-300 font-medium">
                Normativa SENAE
              </div>
              <div className="text-xl font-bold text-amber-300">6 Días Hábiles</div>
            </div>
          </div>

          {/* PARTE A: ¿DÓNDE SE DEMORA MÁS? (Comparativo por Fases) */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-5 space-y-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <AlertOctagon className="w-4 h-4 text-rose-600" />
                1. ¿Dónde se demora más? — Tiempo Promedio por Fase Institucional
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
                      ? "border-rose-300 bg-rose-50/30"
                      : fase.alerta === "MEDIO"
                      ? "border-amber-300 bg-amber-50/20"
                      : "border-slate-200 bg-white"
                  }`}
                >
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-600 truncate">{fase.area}</span>
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        fase.alerta === "ALTO"
                          ? "bg-rose-100 text-rose-800"
                          : fase.alerta === "MEDIO"
                          ? "bg-amber-100 text-amber-800"
                          : "bg-emerald-100 text-emerald-800"
                      }`}
                    >
                      {fase.alerta === "ALTO" ? "Cuello de Botella" : fase.alerta}
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
                          ? "bg-rose-600"
                          : fase.alerta === "MEDIO"
                          ? "bg-amber-500"
                          : "bg-blue-600"
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

          {/* PARTE B: ¿POR QUÉ SE DEMORA? (Ranking de Causas de Retraso) */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-5 space-y-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <HelpCircle className="w-4 h-4 text-amber-600" />
                2. ¿Por qué se demora? — Factores y Causas Principales de Retraso
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Variables externas e internas que impactan el cumplimiento del plazo de 6 días
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
                      <span className="font-bold text-rose-700">
                        +{causa.impacto_promedio_dias} días
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* PARTE C: MATRIZ DE RENDIMIENTO POR TIPO DE PROCESO */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="p-4 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <FileText className="w-4 h-4 text-blue-600" />
                3. Matriz de Tardanza y SLA por Tipo de Proceso
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Comparativa de tiempos promedio totales y fase crítica de mayor demora en cada tipo de trámite
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
                        <span className="inline-block px-2 py-0.5 rounded text-[11px] font-semibold bg-rose-50 text-rose-800 border border-rose-200">
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
    </div>
  );
}
