"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  FileText,
  Clock,
  UserCheck,
  Calendar,
  Building2,
  Users,
  Search,
  Download,
  RefreshCw,
  TrendingDown,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Info,
  ShieldCheck,
  FileSpreadsheet,
  Layers,
} from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/utils";
import Link from "next/link";
import { SemaforoSLA } from "@/components/ui";

interface AreaCatalogo {
  id_area: number;
  nombre: string;
  codigo: string;
}

interface UsuarioCatalogo {
  id_usuario: number;
  nombre_completo: string;
  cargo: string;
  id_area: number;
}

interface SLAConfigInfo {
  limite_dias: number;
  punto_inicio: string;
  punto_fin: string;
}

interface TramiteReporte {
  id_tramite: number;
  id_area_actual: number;
  id_custodio_actual: number;
  id_tipo_tramite: number;
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
  alerta_sla: "VERDE" | "AMBAR" | "ROJO" | "EXENTO" | "PENDIENTE" | string;
  monto_solicitado: number;
  fasesTiempos: {
    dfi_dias: number;
    presupuesto_dias: number;
    pausa_factura_dias: number;
    contabilidad_dias: number;
    caja_dias: number;
  };
  total_observaciones: number;
}

interface ProcesoTiempoStat {
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

export default function ReportesPage() {
  // Las 3 vistas principales
  const [vistaActiva, setVistaActiva] = useState<"tramites" | "tiempos" | "desempeno">(
    "tramites"
  );

  // Filtros unificados compartidos
  const [fechaDesde, setFechaDesde] = useState<string>("2026-08-01");
  const [fechaHasta, setFechaHasta] = useState<string>("2026-10-31");
  const [filtroArea, setFiltroArea] = useState<string>("TODAS");
  const [filtroFuncionario, setFiltroFuncionario] = useState<string>("TODOS");
  const [busquedaTexto, setBusquedaTexto] = useState<string>("");

  // Funcionario expandido en Vista 3 (Evidencia)
  const [funcionarioExpandido, setFuncionarioExpandido] = useState<number | null>(null);

  // Estados de datos
  const [loading, setLoading] = useState<boolean>(true);
  const [tramites, setTramites] = useState<TramiteReporte[]>([]);
  const [procesosTiempos, setProcesosTiempos] = useState<ProcesoTiempoStat[]>([]);
  const [funcionariosDesempeno, setFuncionariosDesempeno] = useState<FuncionarioDesempeno[]>([]);
  const [catalogoAreas, setCatalogoAreas] = useState<AreaCatalogo[]>([]);
  const [catalogoUsuarios, setCatalogoUsuarios] = useState<UsuarioCatalogo[]>([]);
  const [slaConfig, setSlaConfig] = useState<SLAConfigInfo>({
    limite_dias: 6,
    punto_inicio: "RECEPCION_PRESUPUESTO",
    punto_fin: "AUTORIZACION_PAGO",
  });

  // Modal de opciones de exportación
  const [modalExportarOpen, setModalExportarOpen] = useState(false);

  // Carga de datos centralizada
  const cargarDatos = async () => {
    setLoading(true);
    try {
      const url = `/api/reportes?fecha_desde=${fechaDesde}&fecha_hasta=${fechaHasta}`;
      const res = await fetch(url);
      const json = await res.json();

      if (json.success) {
        setTramites(json.reporte_ingresos_custodia?.tramites || []);
        setProcesosTiempos(json.reporte_tardanza_procesos?.por_tipo_proceso || []);
        setFuncionariosDesempeno(json.reporte_desempeno_funcionarios || []);
        if (json.catalogo_areas) setCatalogoAreas(json.catalogo_areas);
        if (json.catalogo_usuarios) setCatalogoUsuarios(json.catalogo_usuarios);
        if (json.sla_config) setSlaConfig(json.sla_config);
      }
    } catch (err) {
      console.error("Error al cargar datos de reportería:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargarDatos();
  }, [fechaDesde, fechaHasta]);

  // Accesos rápidos de rango
  const aplicarRangoRapido = (diasAtras: number) => {
    const hasta = new Date();
    const desde = new Date();
    desde.setDate(desde.getDate() - diasAtras);
    setFechaHasta(hasta.toISOString().split("T")[0]);
    setFechaDesde(desde.toISOString().split("T")[0]);
  };

  // Filtrar funcionarios disponibles según el área seleccionada
  const usuariosDisponibles = useMemo(() => {
    if (filtroArea === "TODAS") return catalogoUsuarios;
    return catalogoUsuarios.filter((u) => String(u.id_area) === filtroArea);
  }, [catalogoUsuarios, filtroArea]);

  // ---------------------------------------------------------------------------
  // FILTRADO DINÁMICO EN MEMORIA (Aplica a todas las vistas)
  // ---------------------------------------------------------------------------
  const tramitesFiltrados = useMemo(() => {
    return tramites.filter((t) => {
      // Filtro Área
      if (filtroArea !== "TODAS" && String(t.id_area_actual) !== filtroArea) {
        return false;
      }
      // Filtro Funcionario
      if (filtroFuncionario !== "TODOS" && String(t.id_custodio_actual) !== filtroFuncionario) {
        return false;
      }
      // Filtro Búsqueda
      if (busquedaTexto.trim()) {
        const term = busquedaTexto.toLowerCase();
        const match =
          t.numero_quipux.toLowerCase().includes(term) ||
          t.proveedor_nombre.toLowerCase().includes(term) ||
          t.tipo_proceso.toLowerCase().includes(term) ||
          t.custodio_nombre.toLowerCase().includes(term) ||
          (t.proveedor_ruc && t.proveedor_ruc.toLowerCase().includes(term));
        if (!match) return false;
      }
      return true;
    });
  }, [tramites, filtroArea, filtroFuncionario, busquedaTexto]);

  // KPIs de la Vista 1 (Trámites Generales)
  const kpisGenerales = useMemo(() => {
    const total = tramitesFiltrados.length;
    let enPlazo = 0;
    let porVencer = 0;
    let vencidos = 0;
    let sumaDias = 0;
    let tramitesComputables = 0;

    tramitesFiltrados.forEach((t) => {
      if (t.alerta_sla === "VERDE") enPlazo++;
      else if (t.alerta_sla === "AMBAR") porVencer++;
      else if (t.alerta_sla === "ROJO") vencidos++;

      if (t.alerta_sla !== "EXENTO" && t.alerta_sla !== "PENDIENTE") {
        sumaDias += t.dias_habiles_efectivos;
        tramitesComputables++;
      }
    });

    const mediaDias = tramitesComputables > 0 ? Number((sumaDias / tramitesComputables).toFixed(1)) : 0;
    const tasaCumplimiento =
      total > 0 ? Math.round(((enPlazo + porVencer) / (total || 1)) * 100) : 100;

    return { total, enPlazo, porVencer, vencidos, mediaDias, tasaCumplimiento };
  }, [tramitesFiltrados]);

  // Ranking de Trámites Más Tardíos y Más Veloces (Para Vista 2)
  const rankingTiempos = useMemo(() => {
    // Procesos ordenados por promedio de días
    const procesosValidos = [...procesosTiempos].filter((p) => p.total_tramites > 0);
    const masTardios = [...procesosValidos].sort(
      (a, b) => b.promedio_dias_habiles - a.promedio_dias_habiles
    );
    const masVeloces = [...procesosValidos].sort(
      (a, b) => a.promedio_dias_habiles - b.promedio_dias_habiles
    );

    // Promedio por área institucional
    let dfiSuma = 0;
    let presSuma = 0;
    let contSuma = 0;
    let cajaSuma = 0;
    let count = 0;

    tramitesFiltrados.forEach((t) => {
      if (t.fasesTiempos) {
        dfiSuma += t.fasesTiempos.dfi_dias || 0;
        presSuma += t.fasesTiempos.presupuesto_dias || 0;
        contSuma += t.fasesTiempos.contabilidad_dias || 0;
        cajaSuma += t.fasesTiempos.caja_dias || 0;
        count++;
      }
    });

    const promAreas = {
      dfi: count > 0 ? Number((dfiSuma / count).toFixed(1)) : 0,
      presupuesto: count > 0 ? Number((presSuma / count).toFixed(1)) : 0,
      contabilidad: count > 0 ? Number((contSuma / count).toFixed(1)) : 0,
      tesoreria: count > 0 ? Number((cajaSuma / count).toFixed(1)) : 0,
    };

    return {
      masTardios: masTardios.slice(0, 5),
      masVeloces: masVeloces.slice(0, 5),
      promAreas,
    };
  }, [procesosTiempos, tramitesFiltrados]);

  // Filtrado de Funcionarios para Vista 3
  const funcionariosFiltrados = useMemo(() => {
    return funcionariosDesempeno.filter((f) => {
      if (filtroArea !== "TODAS") {
        // Encontrar el área por id
        const areaObj = catalogoAreas.find((a) => String(a.id_area) === filtroArea);
        if (areaObj && !f.area_nombre.toLowerCase().includes(areaObj.nombre.toLowerCase())) {
          return false;
        }
      }
      if (filtroFuncionario !== "TODOS" && String(f.id_usuario) !== filtroFuncionario) {
        return false;
      }
      if (busquedaTexto.trim()) {
        const term = busquedaTexto.toLowerCase();
        if (
          !f.nombre_completo.toLowerCase().includes(term) &&
          !f.cargo.toLowerCase().includes(term)
        ) {
          return false;
        }
      }
      return true;
    });
  }, [funcionariosDesempeno, filtroArea, filtroFuncionario, busquedaTexto, catalogoAreas]);

  // Exportar Excel de la vista actual con filtros activos
  const handleExportarVistaActual = (modulo: string = "actual") => {
    let modulosParam = "custodia";
    if (modulo === "actual") {
      if (vistaActiva === "tramites") modulosParam = "custodia";
      else if (vistaActiva === "tiempos") modulosParam = "tiempos";
      else if (vistaActiva === "desempeno") modulosParam = "desempeno";
    } else if (modulo === "completo") {
      modulosParam = "custodia,tiempos,desempeno,carga,indicadores";
    }

    let url = `/api/reportes/exportar?fecha_desde=${fechaDesde}&fecha_hasta=${fechaHasta}&modulos=${modulosParam}`;
    if (filtroArea !== "TODAS") {
      url += `&id_area=${encodeURIComponent(filtroArea)}`;
    }
    if (filtroFuncionario !== "TODOS") {
      url += `&id_usuario=${encodeURIComponent(filtroFuncionario)}`;
    }

    window.open(url, "_blank");
    setModalExportarOpen(false);
  };

  return (
    <div className="space-y-5">
      {/* ------------------------------------------------------------------- */}
      {/* 1. ENCABEZADO Y BARRA DE CONTROL PRINCIPAL                           */}
      {/* ------------------------------------------------------------------- */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-blue-600 text-white rounded-lg shadow-2xs">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-slate-900 tracking-tight uppercase">
                Reportería de Gestión y Control Previo al Pago
              </h1>
              <p className="text-xs text-slate-500 mt-0.5">
                Seguimiento integral de tiempos de ciclo, semáforo SLA normativo ({slaConfig.limite_dias} días) y evidencia de gestión por servidor.
              </p>
            </div>
          </div>
        </div>

        {/* Botonera de Exportación */}
        <div className="flex items-center gap-2 self-start lg:self-auto">
          <button
            onClick={() => handleExportarVistaActual("actual")}
            className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-2xs transition-colors"
            title="Descarga la hoja de cálculo con los filtros aplicados en esta vista"
          >
            <Download className="w-4 h-4" />
            Exportar Vista Actual (Excel)
          </button>

          <button
            onClick={() => setModalExportarOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors border border-slate-200"
            title="Abrir opciones de exportación modular"
          >
            <Layers className="w-4 h-4 text-slate-500" />
            Opciones
          </button>

          <button
            onClick={cargarDatos}
            disabled={loading}
            className="p-2 text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors border border-slate-200"
            title="Refrescar datos"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {/* ------------------------------------------------------------------- */}
      {/* 2. BARRA DE FILTROS UNIFICADA                                       */}
      {/* ------------------------------------------------------------------- */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 items-end">
          {/* Periodo Desde */}
          <div>
            <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">
              Fecha Desde
            </label>
            <input
              type="date"
              value={fechaDesde}
              onChange={(e) => setFechaDesde(e.target.value)}
              className="w-full px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-lg font-medium text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          {/* Periodo Hasta */}
          <div>
            <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">
              Fecha Hasta
            </label>
            <input
              type="date"
              value={fechaHasta}
              onChange={(e) => setFechaHasta(e.target.value)}
              className="w-full px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-lg font-medium text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          {/* Departamento / Área */}
          <div>
            <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">
              Departamento
            </label>
            <select
              value={filtroArea}
              onChange={(e) => {
                setFiltroArea(e.target.value);
                setFiltroFuncionario("TODOS");
              }}
              className="w-full px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-lg font-medium text-slate-800 uppercase focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="TODAS">TODOS LOS DEPARTAMENTOS</option>
              {catalogoAreas.map((a) => (
                <option key={a.id_area} value={String(a.id_area)}>
                  {a.nombre}
                </option>
              ))}
            </select>
          </div>

          {/* Funcionario */}
          <div>
            <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">
              Funcionario
            </label>
            <select
              value={filtroFuncionario}
              onChange={(e) => setFiltroFuncionario(e.target.value)}
              className="w-full px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-lg font-medium text-slate-800 uppercase focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="TODOS">TODOS LOS FUNCIONARIOS</option>
              {usuariosDisponibles.map((u) => (
                <option key={u.id_usuario} value={String(u.id_usuario)}>
                  {u.nombre_completo}
                </option>
              ))}
            </select>
          </div>

          {/* Búsqueda por texto */}
          <div>
            <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">
              Buscar Quipux / Proveedor
            </label>
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
              <input
                type="text"
                value={busquedaTexto}
                onChange={(e) => setBusquedaTexto(e.target.value)}
                placeholder="N° Quipux, RUC..."
                className="w-full pl-8 pr-2.5 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-lg text-slate-800 uppercase font-medium focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>

        {/* Accesos Rápidos de Periodo */}
        <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-[11px] text-slate-500">
          <div className="flex items-center gap-1.5">
            <span className="font-semibold text-slate-700">Rangos rápidos:</span>
            <button
              onClick={() => aplicarRangoRapido(30)}
              className="px-2 py-0.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded transition-colors"
            >
              Últimos 30d
            </button>
            <button
              onClick={() => aplicarRangoRapido(60)}
              className="px-2 py-0.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded transition-colors"
            >
              Últimos 60d
            </button>
            <button
              onClick={() => aplicarRangoRapido(90)}
              className="px-2 py-0.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded transition-colors"
            >
              Últimos 90d
            </button>
            <button
              onClick={() => {
                setFechaDesde("2026-01-01");
                setFechaHasta("2026-12-31");
              }}
              className="px-2 py-0.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded transition-colors font-bold"
            >
              Año 2026 Completo
            </button>
          </div>

          <div className="font-medium text-slate-500">
            Mostrando <strong>{tramitesFiltrados.length}</strong> expedientes filtrados
          </div>
        </div>
      </div>

      {/* ------------------------------------------------------------------- */}
      {/* 3. TABS DE NAVEGACIÓN (3 VISTAS CLARAS)                             */}
      {/* ------------------------------------------------------------------- */}
      <div className="flex border-b border-slate-200 bg-white rounded-t-xl px-4 pt-2 gap-2 shadow-2xs">
        {/* TAB 1 */}
        <button
          onClick={() => setVistaActiva("tramites")}
          className={`px-4 py-2.5 text-xs font-bold uppercase transition-all flex items-center gap-2 border-b-2 ${
            vistaActiva === "tramites"
              ? "border-blue-600 text-blue-900 bg-blue-50/50"
              : "border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-50"
          }`}
        >
          <FileText className="w-4 h-4 text-blue-600" />
          1. Trámites Generales & KPIs
        </button>

        {/* TAB 2 */}
        <button
          onClick={() => setVistaActiva("tiempos")}
          className={`px-4 py-2.5 text-xs font-bold uppercase transition-all flex items-center gap-2 border-b-2 ${
            vistaActiva === "tiempos"
              ? "border-blue-600 text-blue-900 bg-blue-50/50"
              : "border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-50"
          }`}
        >
          <Clock className="w-4 h-4 text-blue-600" />
          2. Tiempos & Cuellos de Botella
        </button>

        {/* TAB 3 */}
        <button
          onClick={() => setVistaActiva("desempeno")}
          className={`px-4 py-2.5 text-xs font-bold uppercase transition-all flex items-center gap-2 border-b-2 ${
            vistaActiva === "desempeno"
              ? "border-blue-600 text-blue-900 bg-blue-50/50"
              : "border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-50"
          }`}
        >
          <UserCheck className="w-4 h-4 text-blue-600" />
          3. Desempeño & Evidencia de Servidores
        </button>
      </div>

      {/* ------------------------------------------------------------------- */}
      {/* VISTA 1: TRÁMITES GENERALES & KPIS                                  */}
      {/* ------------------------------------------------------------------- */}
      {vistaActiva === "tramites" && (
        <div className="space-y-4">
          {/* Tarjetas de KPIs Minimalistas */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            {/* Total */}
            <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
              <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">
                Total Trámites
              </div>
              <div className="text-xl font-bold font-mono text-slate-900 mt-0.5">
                {kpisGenerales.total}
              </div>
              <div className="text-[10px] text-slate-400 mt-1">En periodo seleccionado</div>
            </div>

            {/* En Plazo */}
            <div className="bg-emerald-50/80 p-3.5 rounded-xl border border-emerald-200 shadow-2xs">
              <div className="text-[10px] font-bold text-emerald-800 uppercase tracking-wide flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                En Plazo
              </div>
              <div className="text-xl font-bold font-mono text-emerald-900 mt-0.5">
                {kpisGenerales.enPlazo}
              </div>
              <div className="text-[10px] text-emerald-700 mt-1">≤ {slaConfig.limite_dias} días hábiles</div>
            </div>

            {/* Por Vencer */}
            <div className="bg-amber-50/80 p-3.5 rounded-xl border border-amber-200 shadow-2xs">
              <div className="text-[10px] font-bold text-amber-800 uppercase tracking-wide flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-amber-500" />
                Por Vencer
              </div>
              <div className="text-xl font-bold font-mono text-amber-900 mt-0.5">
                {kpisGenerales.porVencer}
              </div>
              <div className="text-[10px] text-amber-700 mt-1">Alerta preventiva</div>
            </div>

            {/* Vencidos */}
            <div className="bg-rose-50/80 p-3.5 rounded-xl border border-rose-200 shadow-2xs">
              <div className="text-[10px] font-bold text-rose-800 uppercase tracking-wide flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-rose-500" />
                Fuera de Plazo
              </div>
              <div className="text-xl font-bold font-mono text-rose-900 mt-0.5">
                {kpisGenerales.vencidos}
              </div>
              <div className="text-[10px] text-rose-700 mt-1">&gt; {slaConfig.limite_dias} días de retraso</div>
            </div>

            {/* Media Global */}
            <div className="bg-blue-50/80 p-3.5 rounded-xl border border-blue-200 shadow-2xs col-span-2 md:col-span-1">
              <div className="text-[10px] font-bold text-blue-800 uppercase tracking-wide">
                Tiempo Medio
              </div>
              <div className="text-xl font-bold font-mono text-blue-900 mt-0.5">
                {kpisGenerales.mediaDias} <span className="text-xs font-normal text-blue-700">Días</span>
              </div>
              <div className="text-[10px] text-blue-700 mt-1">
                Efectividad: {kpisGenerales.tasaCumplimiento}%
              </div>
            </div>
          </div>

          {/* Tabla de Trámites Completa */}
          <div className="bg-white border border-slate-200 rounded-xl overflow-x-auto shadow-2xs">
            {loading ? (
              <div className="p-10 text-center text-xs text-slate-500 flex flex-col items-center gap-2">
                <RefreshCw className="w-5 h-5 animate-spin text-blue-600" />
                <span className="font-semibold uppercase">Cargando expedientes...</span>
              </div>
            ) : tramitesFiltrados.length === 0 ? (
              <div className="p-10 text-center text-xs text-slate-500 font-semibold uppercase">
                No se encontraron trámites con los filtros especificados.
              </div>
            ) : (
              <table className="w-full text-left text-xs border-collapse min-w-[950px]">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-bold text-slate-700 uppercase">
                    <th className="py-3 px-4">N° Quipux</th>
                    <th className="py-3 px-4">Tipo de Proceso</th>
                    <th className="py-3 px-4">Beneficiario / RUC</th>
                    <th className="py-3 px-4">Departamento</th>
                    <th className="py-3 px-4">Funcionario Custodio</th>
                    <th className="py-3 px-3 text-center">Fecha Ingreso</th>
                    <th className="py-3 px-3 text-center">Días SLA ({slaConfig.limite_dias}d)</th>
                    <th className="py-3 px-4 text-center">Estado</th>
                    <th className="py-3 px-3 text-center">Ficha</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {tramitesFiltrados.map((t) => (
                    <tr key={t.id_tramite} className="hover:bg-slate-50 transition-colors">
                      <td className="py-3 px-4 font-mono font-bold text-blue-700 whitespace-nowrap">
                        {t.numero_quipux}
                      </td>
                      <td className="py-3 px-4 uppercase text-[11px] font-semibold text-slate-800">
                        {t.tipo_proceso}
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-900 uppercase truncate max-w-[200px]" title={t.proveedor_nombre}>
                          {t.proveedor_nombre}
                        </div>
                        <div className="text-[10px] font-mono text-slate-400">
                          {t.proveedor_ruc || "SIN RUC"}
                        </div>
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap uppercase text-[11px] font-bold text-slate-600">
                        {t.area_nombre}
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        <div className="font-bold text-slate-800 text-[11px] uppercase">
                          {t.custodio_nombre}
                        </div>
                        <div className="text-[10px] text-slate-400 uppercase">{t.custodio_cargo}</div>
                      </td>
                      <td className="py-3 px-3 text-center font-mono text-[11px] whitespace-nowrap">
                        {formatDate(t.fecha_ingreso_dfi)}
                      </td>
                      <td className="py-3 px-3 text-center whitespace-nowrap">
                        {t.alerta_sla === "EXENTO" ? (
                          <span className="px-2 py-0.5 text-[10px] font-bold rounded bg-slate-100 text-slate-600 border border-slate-200 uppercase">
                            Exento
                          </span>
                        ) : t.alerta_sla === "PENDIENTE" ? (
                          <span className="px-2 py-0.5 text-[10px] font-bold rounded bg-slate-50 text-slate-500 border border-slate-200 uppercase">
                            Pendiente
                          </span>
                        ) : (
                          <span
                            className={`px-2 py-0.5 text-[11px] font-mono font-bold rounded border ${
                              t.alerta_sla === "ROJO"
                                ? "bg-rose-50 text-rose-800 border-rose-300"
                                : t.alerta_sla === "AMBAR"
                                ? "bg-amber-50 text-amber-800 border-amber-300"
                                : "bg-emerald-50 text-emerald-800 border-emerald-300"
                            }`}
                          >
                            {t.dias_habiles_efectivos}d
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-center whitespace-nowrap">
                        <span className="px-2 py-0.5 text-[10px] font-bold rounded uppercase bg-slate-100 text-slate-700 border border-slate-200">
                          {t.estado_actual}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-center whitespace-nowrap">
                        <Link
                          href={`/tramite/${t.id_tramite}?readonly=true`}
                          className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg transition-colors"
                        >
                          <ExternalLink className="w-3 h-3" />
                          Ver
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------------- */}
      {/* VISTA 2: TIEMPOS, MÁS VELOCES Y MÁS TARDÍOS                         */}
      {/* ------------------------------------------------------------------- */}
      {vistaActiva === "tiempos" && (
        <div className="space-y-5">
          {/* Promedio de Tiempo por Departamento Institucional */}
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs space-y-3">
            <h2 className="text-xs font-bold text-slate-900 uppercase flex items-center gap-2">
              <Clock className="w-4 h-4 text-blue-600" />
              Permanencia Promedio en Días por Departamento Institucional
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-center">
                <div className="text-[10px] font-bold text-slate-500 uppercase">DFI (Ventanilla)</div>
                <div className="text-lg font-bold font-mono text-slate-900 mt-0.5">
                  {rankingTiempos.promAreas.dfi}d
                </div>
                <div className="text-[10px] text-slate-400">Recepción / Radicación</div>
              </div>
              <div className="p-3 bg-blue-50/60 border border-blue-200 rounded-lg text-center">
                <div className="text-[10px] font-bold text-blue-800 uppercase">Presupuesto</div>
                <div className="text-lg font-bold font-mono text-blue-900 mt-0.5">
                  {rankingTiempos.promAreas.presupuesto}d
                </div>
                <div className="text-[10px] text-blue-600">Control Previo</div>
              </div>
              <div className="p-3 bg-indigo-50/60 border border-indigo-200 rounded-lg text-center">
                <div className="text-[10px] font-bold text-indigo-800 uppercase">Contabilidad</div>
                <div className="text-lg font-bold font-mono text-indigo-900 mt-0.5">
                  {rankingTiempos.promAreas.contabilidad}d
                </div>
                <div className="text-[10px] text-indigo-600">Devengado / Contable</div>
              </div>
              <div className="p-3 bg-emerald-50/60 border border-emerald-200 rounded-lg text-center">
                <div className="text-[10px] font-bold text-emerald-800 uppercase">Tesorería / Pagos</div>
                <div className="text-lg font-bold font-mono text-emerald-900 mt-0.5">
                  {rankingTiempos.promAreas.tesoreria}d
                </div>
                <div className="text-[10px] text-emerald-600">Autorización y Pago SPI</div>
              </div>
            </div>
          </div>

          {/* Dos Bloques: Más Tardíos vs Más Veloces */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Top Más Tardíos */}
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs space-y-3">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <h3 className="text-xs font-bold text-rose-900 uppercase flex items-center gap-2">
                  <TrendingDown className="w-4 h-4 text-rose-600" />
                  Top Procesos con Mayor Tardanza (Cuellos de Botella)
                </h3>
                <span className="text-[10px] font-bold text-rose-600 bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
                  Mayor Demora
                </span>
              </div>

              <div className="space-y-2.5">
                {rankingTiempos.masTardios.map((p, idx) => (
                  <div
                    key={p.id_tipo}
                    className="p-3 rounded-lg border border-slate-200 bg-slate-50 flex items-center justify-between text-xs"
                  >
                    <div>
                      <div className="font-bold text-slate-900 uppercase">
                        {idx + 1}. {p.nombre}
                      </div>
                      <div className="text-[10px] text-slate-500 mt-0.5">
                        {p.total_tramites} trámites | Fase crítica:{" "}
                        <strong className="text-rose-700">{p.fase_mayor_demora}</strong>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-mono font-bold text-rose-700 text-sm">
                        {p.promedio_dias_habiles}d
                      </div>
                      <div className="text-[10px] text-slate-400">Media de gestión</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Top Más Veloces */}
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs space-y-3">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <h3 className="text-xs font-bold text-emerald-900 uppercase flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-emerald-600" />
                  Top Procesos con Despacho Más Veloz
                </h3>
                <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                  Mayor Celeridad
                </span>
              </div>

              <div className="space-y-2.5">
                {rankingTiempos.masVeloces.map((p, idx) => (
                  <div
                    key={p.id_tipo}
                    className="p-3 rounded-lg border border-slate-200 bg-slate-50 flex items-center justify-between text-xs"
                  >
                    <div>
                      <div className="font-bold text-slate-900 uppercase">
                        {idx + 1}. {p.nombre}
                      </div>
                      <div className="text-[10px] text-slate-500 mt-0.5">
                        {p.total_tramites} trámites | Tasa cumplimiento:{" "}
                        <strong className="text-emerald-700">{p.tasa_cumplimiento}%</strong>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-mono font-bold text-emerald-700 text-sm">
                        {p.promedio_dias_habiles}d
                      </div>
                      <div className="text-[10px] text-slate-400">Media de gestión</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Tabla Comparativa de Procesos Completa */}
          <div className="bg-white border border-slate-200 rounded-xl overflow-x-auto shadow-2xs">
            <div className="p-4 bg-slate-50 border-b border-slate-200 font-bold text-xs text-slate-800 uppercase flex items-center justify-between">
              <span>Desglose Completo de Tiempos por Tipo de Proceso</span>
              <span className="text-[11px] font-normal text-slate-500">
                Norma SLA institucional: {slaConfig.limite_dias} días hábiles
              </span>
            </div>

            <table className="w-full text-left text-xs border-collapse min-w-[850px]">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/50 text-[11px] font-bold text-slate-700 uppercase">
                  <th className="py-3 px-4">Proceso Normativo</th>
                  <th className="py-3 px-3 text-center">Total</th>
                  <th className="py-3 px-3 text-center">Promedio (Días)</th>
                  <th className="py-3 px-3 text-center">% Cumplimiento SLA</th>
                  <th className="py-3 px-3 text-center">Prom. DFI</th>
                  <th className="py-3 px-3 text-center">Prom. Presupuesto</th>
                  <th className="py-3 px-3 text-center">Prom. Contabilidad</th>
                  <th className="py-3 px-4">Fase con Mayor Demora</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {procesosTiempos.map((p) => (
                  <tr key={p.id_tipo} className="hover:bg-slate-50 transition-colors">
                    <td className="py-3 px-4 font-bold text-slate-900 uppercase">{p.nombre}</td>
                    <td className="py-3 px-3 text-center font-mono">{p.total_tramites}</td>
                    <td className="py-3 px-3 text-center font-mono font-bold text-slate-800">
                      {p.promedio_dias_habiles}d
                    </td>
                    <td className="py-3 px-3 text-center font-mono font-bold">
                      <span
                        className={`px-2 py-0.5 rounded text-[11px] ${
                          p.tasa_cumplimiento >= 85
                            ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                            : p.tasa_cumplimiento >= 65
                            ? "bg-amber-50 text-amber-800 border border-amber-200"
                            : "bg-rose-50 text-rose-800 border border-rose-200"
                        }`}
                      >
                        {p.tasa_cumplimiento}%
                      </span>
                    </td>
                    <td className="py-3 px-3 text-center font-mono text-slate-600">
                      {p.fases_promedio?.dfi || 0}d
                    </td>
                    <td className="py-3 px-3 text-center font-mono text-slate-600">
                      {p.fases_promedio?.presupuesto || 0}d
                    </td>
                    <td className="py-3 px-3 text-center font-mono text-slate-600">
                      {p.fases_promedio?.contabilidad || 0}d
                    </td>
                    <td className="py-3 px-4 uppercase text-[11px] font-semibold text-slate-700">
                      {p.fase_mayor_demora}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------------- */}
      {/* VISTA 3: DESEMPEÑO & EVIDENCIA FORENSE                              */}
      {/* ------------------------------------------------------------------- */}
      {vistaActiva === "desempeno" && (
        <div className="space-y-4">
          <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl text-xs text-blue-900 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Info className="w-4 h-4 text-blue-600 shrink-0" />
              <span>
                Haga clic en <strong>"Ver Evidencia"</strong> sobre cualquier servidor para auditar los expedientes exactos que gestionó, las fechas de entrada/salida y los días de demora.
              </span>
            </div>
            <span className="font-bold uppercase text-[10px] text-blue-700">
              Auditoría Individual
            </span>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
            <table className="w-full text-left text-xs border-collapse min-w-[900px]">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-bold text-slate-700 uppercase">
                  <th className="py-3 px-4">Funcionario / Cargo</th>
                  <th className="py-3 px-4">Departamento</th>
                  <th className="py-3 px-3 text-center">Recibidos</th>
                  <th className="py-3 px-3 text-center">Despachados</th>
                  <th className="py-3 px-3 text-center">A Tiempo</th>
                  <th className="py-3 px-3 text-center">Con Retraso</th>
                  <th className="py-3 px-3 text-center">Tiempo Promedio</th>
                  <th className="py-3 px-3 text-center">Cumplimiento</th>
                  <th className="py-3 px-4 text-center">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {funcionariosFiltrados.map((f) => {
                  const isExpanded = funcionarioExpandido === f.id_usuario;
                  const tramitesConRetraso = (f.detalle_tramites || []).filter(
                    (t) => t.estado_entrega === "CON_RETRASO"
                  );

                  return (
                    <React.Fragment key={f.id_usuario}>
                      <tr className={`hover:bg-slate-50 transition-colors ${isExpanded ? "bg-blue-50/40" : ""}`}>
                        <td className="py-3 px-4">
                          <div className="font-bold text-slate-900 uppercase">{f.nombre_completo}</div>
                          <div className="text-[10px] text-slate-400 uppercase">{f.cargo}</div>
                        </td>
                        <td className="py-3 px-4 uppercase text-[11px] font-semibold text-slate-600">
                          {f.area_nombre}
                        </td>
                        <td className="py-3 px-3 text-center font-mono font-bold text-slate-800">
                          {f.total_tramites_recibidos}
                        </td>
                        <td className="py-3 px-3 text-center font-mono text-slate-700">
                          {f.tramites_despachados}
                        </td>
                        <td className="py-3 px-3 text-center font-mono font-bold text-emerald-700">
                          {f.entregados_a_tiempo}
                        </td>
                        <td className="py-3 px-3 text-center font-mono font-bold text-rose-700">
                          {f.entregados_con_retraso}
                        </td>
                        <td className="py-3 px-3 text-center font-mono font-bold text-slate-800">
                          {f.tiempo_promedio_dias}d
                        </td>
                        <td className="py-3 px-3 text-center whitespace-nowrap">
                          <span
                            className={`px-2 py-0.5 text-[11px] font-mono font-bold rounded border ${
                              f.tasa_cumplimiento >= 85
                                ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                                : f.tasa_cumplimiento >= 65
                                ? "bg-amber-50 text-amber-800 border-amber-200"
                                : "bg-rose-50 text-rose-800 border-rose-200"
                            }`}
                          >
                            {f.tasa_cumplimiento}%
                          </span>
                        </td>
                        <td className="py-3 px-4 text-center whitespace-nowrap">
                          <button
                            type="button"
                            onClick={() =>
                              setFuncionarioExpandido(isExpanded ? null : f.id_usuario)
                            }
                            className={`inline-flex items-center gap-1.5 px-3 py-1 text-[11px] font-bold rounded-lg border transition-colors ${
                              isExpanded
                                ? "bg-blue-600 text-white border-blue-600 shadow-2xs"
                                : "bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-300"
                            }`}
                          >
                            <span>Evidencia ({f.detalle_tramites?.length || 0})</span>
                            {isExpanded ? (
                              <ChevronUp className="w-3.5 h-3.5" />
                            ) : (
                              <ChevronDown className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </td>
                      </tr>

                      {/* FILA EXPANDIBLE DE EVIDENCIA FORENSE */}
                      {isExpanded && (
                        <tr>
                          <td colSpan={9} className="p-4 bg-slate-100/80 border-b border-slate-200">
                            <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-3 shadow-2xs">
                              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                                <div className="font-bold text-xs uppercase text-slate-900 flex items-center gap-2">
                                  <ShieldCheck className="w-4 h-4 text-blue-600" />
                                  Evidencia de Expedientes Tramitados por {f.nombre_completo}
                                </div>
                                <span className="text-[10px] text-slate-500 font-medium">
                                  Límite por mesa reglamentario: {f.sla_limite_dias} días
                                </span>
                              </div>

                              {(!f.detalle_tramites || f.detalle_tramites.length === 0) ? (
                                <div className="text-center py-4 text-xs text-slate-500">
                                  No hay expedientes registrados en este periodo para este servidor.
                                </div>
                              ) : (
                                <div className="overflow-x-auto">
                                  <table className="w-full text-left text-[11px] border-collapse">
                                    <thead>
                                      <tr className="border-b border-slate-200 bg-slate-50 text-[10px] font-bold text-slate-600 uppercase">
                                        <th className="py-2 px-3">Quipux</th>
                                        <th className="py-2 px-3">Proveedor / Beneficiario</th>
                                        <th className="py-2 px-3">Proceso</th>
                                        <th className="py-2 px-3 text-center">Llegada a Mesa</th>
                                        <th className="py-2 px-3 text-center">Salida / Despacho</th>
                                        <th className="py-2 px-3 text-center">Días en Mesa</th>
                                        <th className="py-2 px-3 text-center">Diagnóstico</th>
                                        <th className="py-2 px-3 text-center">Ficha</th>
                                      </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                      {f.detalle_tramites.map((det, dIdx) => {
                                        const diasDemora = det.dias_en_mesa - det.sla_limite_dias;
                                        return (
                                          <tr
                                            key={dIdx}
                                            className={
                                              det.estado_entrega === "CON_RETRASO"
                                                ? "bg-rose-50/40"
                                                : "hover:bg-slate-50"
                                            }
                                          >
                                            <td className="py-2 px-3 font-mono font-bold text-blue-700 whitespace-nowrap">
                                              {det.numero_quipux}
                                            </td>
                                            <td className="py-2 px-3 uppercase text-slate-800 font-semibold truncate max-w-[180px]">
                                              {det.proveedor}
                                            </td>
                                            <td className="py-2 px-3 uppercase text-slate-600 truncate max-w-[160px]">
                                              {det.tipo_proceso}
                                            </td>
                                            <td className="py-2 px-3 text-center font-mono whitespace-nowrap">
                                              {formatDate(det.fecha_llegada)}
                                            </td>
                                            <td className="py-2 px-3 text-center font-mono whitespace-nowrap">
                                              {det.fecha_salida ? formatDate(det.fecha_salida) : "En Gestión"}
                                            </td>
                                            <td className="py-2 px-3 text-center font-mono font-bold">
                                              {det.dias_en_mesa}d
                                            </td>
                                            <td className="py-2 px-3 text-center whitespace-nowrap">
                                              {det.estado_entrega === "A_TIEMPO" ? (
                                                <span className="px-2 py-0.5 text-[9px] font-bold uppercase rounded bg-emerald-100 text-emerald-800 border border-emerald-200">
                                                  A Tiempo
                                                </span>
                                              ) : det.estado_entrega === "CON_RETRASO" ? (
                                                <span className="px-2 py-0.5 text-[9px] font-bold uppercase rounded bg-rose-100 text-rose-800 border border-rose-200 font-mono">
                                                  Retraso (+{diasDemora}d)
                                                </span>
                                              ) : (
                                                <span className="px-2 py-0.5 text-[9px] font-bold uppercase rounded bg-amber-100 text-amber-800 border border-amber-200">
                                                  En Curso
                                                </span>
                                              )}
                                            </td>
                                            <td className="py-2 px-3 text-center whitespace-nowrap">
                                              <Link
                                                href={`/tramite/${det.id_tramite}?readonly=true`}
                                                className="text-blue-600 hover:text-blue-800 font-bold"
                                              >
                                                Ver
                                              </Link>
                                            </td>
                                          </tr>
                                        );
                                      })}
                                    </tbody>
                                  </table>
                                </div>
                              )}
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
      )}

      {/* ------------------------------------------------------------------- */}
      {/* 4. MODAL DE EXPORTACIÓN MODULAR                                     */}
      {/* ------------------------------------------------------------------- */}
      {modalExportarOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md border border-slate-200 overflow-hidden text-xs">
            <div className="p-4 bg-blue-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileSpreadsheet className="w-5 h-5 text-blue-200" />
                <span className="font-bold uppercase tracking-wide">
                  Descarga de Reportes Excel
                </span>
              </div>
              <button
                onClick={() => setModalExportarOpen(false)}
                className="text-white/80 hover:text-white"
              >
                ✕
              </button>
            </div>

            <div className="p-5 space-y-3">
              <p className="text-slate-600 text-xs">
                Seleccione el modo de exportación para el periodo seleccionado (
                <strong>
                  {fechaDesde} al {fechaHasta}
                </strong>
                ):
              </p>

              <button
                type="button"
                onClick={() => handleExportarVistaActual("actual")}
                className="w-full p-3.5 rounded-xl border border-blue-200 bg-blue-50 hover:bg-blue-100 text-left transition-colors flex items-center justify-between"
              >
                <div>
                  <div className="font-bold text-blue-900 uppercase text-xs">
                    Exportar Únicamente la Vista Actual
                  </div>
                  <div className="text-[11px] text-blue-700 mt-0.5">
                    Descarga solo la información visible de{" "}
                    <strong>
                      {vistaActiva === "tramites"
                        ? "Trámites Generales"
                        : vistaActiva === "tiempos"
                        ? "Tiempos y Procesos"
                        : "Desempeño de Servidores"}
                    </strong>{" "}
                    respetando los filtros activos.
                  </div>
                </div>
                <Download className="w-5 h-5 text-blue-600 shrink-0 ml-2" />
              </button>

              <button
                type="button"
                onClick={() => handleExportarVistaActual("completo")}
                className="w-full p-3.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-left transition-colors flex items-center justify-between"
              >
                <div>
                  <div className="font-bold text-slate-900 uppercase text-xs">
                    Exportar Paquete Institucional Completo
                  </div>
                  <div className="text-[11px] text-slate-500 mt-0.5">
                    Genera el archivo .XLSX con todas las hojas consolidadas (Catálogo, Tiempos, Desempeño y Métricas SLA).
                  </div>
                </div>
                <Download className="w-5 h-5 text-slate-600 shrink-0 ml-2" />
              </button>
            </div>

            <div className="p-3 bg-slate-50 border-t border-slate-100 flex justify-end">
              <button
                type="button"
                onClick={() => setModalExportarOpen(false)}
                className="px-4 py-1.5 text-xs font-semibold text-slate-600 hover:text-slate-800"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
