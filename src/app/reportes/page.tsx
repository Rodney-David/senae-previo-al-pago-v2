"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  FileText,
  Users,
  Layers,
  ShieldCheck,
  ShieldAlert,
  ArrowLeft,
  RefreshCw,
  FileSpreadsheet,
  AlertTriangle,
  Clock,
  CheckCircle2,
} from "lucide-react";
import Link from "next/link";
import { UsuarioInstitucional } from "@/types";
import {
  BarraFiltrosReporte,
  TabAuditoriaTramites,
  TabRendimientoFuncionarios,
  TabAuditoriaProcesos,
  TramiteAuditoriaRow,
  FuncionarioRendimientoRow,
  ProcesoAuditoriaRow,
  TramiteCompartidoItem,
} from "@/components/reportes";

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

interface TipoCatalogo {
  id_tipo_tramite: number;
  nombre: string;
  codigo: string;
}

interface SLAConfigInfo {
  limite_dias: number;
  punto_inicio: string;
  punto_fin: string;
}

export default function ReportesPage() {
  // 1. AUTENTICACIÓN Y SESIÓN INSTITUCIONAL
  const [currentUser, setCurrentUser] = useState<UsuarioInstitucional | null>(null);
  const [authLoading, setAuthLoading] = useState<boolean>(true);

  // 2. NAVEGACIÓN ENTRE LAS 3 PESTAÑAS PRINCIPALES
  const [pestañaActiva, setPestañaActiva] = useState<"tramites" | "funcionarios" | "procesos">("tramites");

  // 3. ESTADOS DE FILTRO UNIFICADO
  const [padreGestion, setPadreGestion] = useState<"TODOS" | "PAGO" | "GARANTIA">("TODOS");
  const [fechaDesde, setFechaDesde] = useState<string>("2026-01-01");
  const [fechaHasta, setFechaHasta] = useState<string>(() => new Date().toISOString().split("T")[0]);
  const [criterioFecha, setCriterioFecha] = useState<"recepcion" | "memorando" | "ultimo_movimiento">("recepcion");
  const [procesoCanonico, setProcesoCanonico] = useState<string>("TODOS");
  const [area, setArea] = useState<string>("TODAS");
  const [funcionario, setFuncionario] = useState<string>("TODOS");
  const [estadoOficial, setEstadoOficial] = useState<string>("TODOS");
  const [calidadDato, setCalidadDato] = useState<"TODOS" | "COMPLETO" | "HISTORICO_PARCIAL" | "INCOMPLETO">("TODOS");
  const [filtroEstadoRapido, setFiltroEstadoRapido] = useState<"TODOS" | "COMPLETADOS" | "EN_CURSO">("TODOS");
  const [busqueda, setBusqueda] = useState<string>("");

  // 4. ESTADOS DE DATOS OBTENIDOS DE LA API
  const [loading, setLoading] = useState<boolean>(true);
  const [tramitesRaw, setTramitesRaw] = useState<any[]>([]);
  const [procesosRaw, setProcesosRaw] = useState<any[]>([]);
  const [funcionariosRaw, setFuncionariosRaw] = useState<any[]>([]);
  const [catalogoAreas, setCatalogoAreas] = useState<AreaCatalogo[]>([]);
  const [catalogoUsuarios, setCatalogoUsuarios] = useState<UsuarioCatalogo[]>([]);
  const [catalogoTipos, setCatalogoTipos] = useState<TipoCatalogo[]>([]);
  const [slaConfig, setSlaConfig] = useState<SLAConfigInfo>({
    limite_dias: 6,
    punto_inicio: "RECEPCION_PRESUPUESTO",
    punto_fin: "AUTORIZACION_PAGO",
  });

  // Carga de sesión de usuario
  useEffect(() => {
    let isMounted = true;
    try {
      const cached = localStorage.getItem("senae_user_session");
      if (cached) {
        setCurrentUser(JSON.parse(cached));
      }
    } catch (e) {}

    async function checkAuth() {
      try {
        const res = await fetch("/api/auth/session");
        const data = await res.json();
        if (isMounted) {
          if (data.user) {
            setCurrentUser(data.user);
            try {
              localStorage.setItem("senae_user_session", JSON.stringify(data.user));
            } catch (e) {}
          } else {
            setCurrentUser(null);
          }
        }
      } catch (err) {
        console.error("Error verificando sesión:", err);
      } finally {
        if (isMounted) setAuthLoading(false);
      }
    }
    checkAuth();

    return () => {
      isMounted = false;
    };
  }, []);

  // CARGA DE DATOS CENTRALIZADA DESDE /api/reportes
  // Acceso universal: todos los roles institucionales pueden consultar la reportería
  // Se solicita padre_gestion=TODOS para mantener el universo total y evitar que los conteos de pestañas queden en 0
  const cargarDatos = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        fecha_desde: fechaDesde,
        fecha_hasta: fechaHasta,
        criterio_fecha: criterioFecha,
        padre_gestion: "TODOS",
      });

      const res = await fetch(`/api/reportes?${params.toString()}`);
      const json = await res.json();

      if (json.success) {
        setTramitesRaw(json.reporte_ingresos_custodia?.tramites || []);
        setProcesosRaw(json.reporte_tardanza_procesos?.por_tipo_proceso || []);
        setFuncionariosRaw(json.reporte_desempeno_funcionarios || []);
        if (json.catalogo_areas) setCatalogoAreas(json.catalogo_areas);
        if (json.catalogo_usuarios) setCatalogoUsuarios(json.catalogo_usuarios);
        if (json.catalogo_tipos_tramite) setCatalogoTipos(json.catalogo_tipos_tramite);
        if (json.sla_config) setSlaConfig(json.sla_config);
      }
    } catch (err) {
      console.error("Error cargando reporte institucional:", err);
    } finally {
      setLoading(false);
    }
  }, [fechaDesde, fechaHasta, criterioFecha]);

  useEffect(() => {
    if (currentUser) {
      cargarDatos();
    }
  }, [currentUser, cargarDatos]);

  // Conteos generales PAGO vs GARANTÍA sobre el universo completo de tramitesRaw
  const conteoPago = useMemo(() => {
    return tramitesRaw.filter((t) => (t.padre_gestion || "PAGO") === "PAGO").length;
  }, [tramitesRaw]);

  const conteoGarantia = useMemo(() => {
    return tramitesRaw.filter((t) => t.padre_gestion === "GARANTIA").length;
  }, [tramitesRaw]);

  const conteoTodos = useMemo(() => {
    return tramitesRaw.length;
  }, [tramitesRaw]);

  // ---------------------------------------------------------------------------
  // FILTRADO DINÁMICO MULTI-DIMENSIONAL (Respeta la regla PAGO vs GARANTÍA nunca mezcladas)
  // ---------------------------------------------------------------------------
  const tramitesFiltrados = useMemo(() => {
    return tramitesRaw.filter((t) => {
      // 1. GESTIÓN PADRE (TODOS, PAGO vs GARANTÍA)
      if (padreGestion !== "TODOS") {
        const tPadre = (t.padre_gestion === "GARANTIA" || t.tipo_flujo === "GARANTIA") ? "GARANTIA" : "PAGO";
        if (tPadre !== padreGestion) return false;
      }

      // 2. TIPO DE PROCESO
      if (procesoCanonico !== "TODOS" && String(t.id_tipo_tramite) !== procesoCanonico) {
        return false;
      }

      // 3. ÁREA
      if (area !== "TODAS" && String(t.id_area_actual) !== area) {
        return false;
      }

      // 4. FUNCIONARIO
      if (funcionario !== "TODOS" && String(t.id_custodio_actual) !== funcionario) {
        return false;
      }

      // 5. ESTADO OFICIAL
      if (estadoOficial !== "TODOS" && t.estado_actual !== estadoOficial) {
        return false;
      }

      // 6. CALIDAD DEL DATO
      if (calidadDato !== "TODOS" && t.calidad_dato !== calidadDato) {
        return false;
      }

      // 7. FILTRO RÁPIDO DE ESTADO (COMPLETADOS vs EN CURSO)
      if (filtroEstadoRapido === "COMPLETADOS") {
        const completados = ["PAGADO", "ARCHIVO", "DEVUELTO", "INSUBSISTENTE", "ANULADO"];
        if (!completados.includes(t.estado_actual)) return false;
      } else if (filtroEstadoRapido === "EN_CURSO") {
        const completados = ["PAGADO", "ARCHIVO", "DEVUELTO", "INSUBSISTENTE", "ANULADO"];
        if (completados.includes(t.estado_actual)) return false;
      }

      // 8. BÚSQUEDA DE TEXTO LIBRE
      if (busqueda.trim()) {
        const term = busqueda.toLowerCase();
        const quipux = (t.numero_quipux || "").toLowerCase();
        const codigo = (t.codigo_tramite || "").toLowerCase();
        const prov = (t.proveedor_nombre || "").toLowerCase();
        const ruc = (t.proveedor_ruc || "").toLowerCase();
        const proc = (t.tipo_proceso || "").toLowerCase();

        if (
          !quipux.includes(term) &&
          !codigo.includes(term) &&
          !prov.includes(term) &&
          !ruc.includes(term) &&
          !proc.includes(term)
        ) {
          return false;
        }
      }

      return true;
    });
  }, [
    tramitesRaw,
    padreGestion,
    procesoCanonico,
    area,
    funcionario,
    estadoOficial,
    calidadDato,
    filtroEstadoRapido,
    busqueda,
  ]);

  // Trámites con Análisis Compartido segregados para Pestaña 2
  const tramitesCompartidos = useMemo<TramiteCompartidoItem[]>(() => {
    return tramitesRaw
      .filter((t) => t.es_analista_compartido)
      .map((t) => ({
        id_tramite: t.id_tramite,
        codigo_tramite: t.codigo_tramite,
        numero_quipux: t.numero_quipux,
        proveedor_nombre: t.proveedor_nombre,
        tipo_proceso: t.tipo_proceso,
        analistas_detectados: t.analistas_detectados || [],
        dias_totales: t.reloj_a?.total_calendario_dias || t.dias_habiles_totales || 0,
        estado: t.estado_actual,
      }));
  }, [tramitesRaw]);

  // Adaptar estadísticas de funcionarios para Pestaña 2
  const funcionariosAdaptados = useMemo<FuncionarioRendimientoRow[]>(() => {
    return funcionariosRaw.map((f) => ({
      id_usuario: f.id_usuario,
      nombre_completo: f.nombre_completo,
      cargo: f.cargo,
      area_nombre: f.area_nombre,
      total_tramites_recibidos: f.total_tramites_recibidos,
      tramites_despachados: f.tramites_despachados,
      entregados_a_tiempo: f.entregados_a_tiempo,
      entregados_con_retraso: f.entregados_con_retraso,
      en_curso: f.en_curso,
      tasa_cumplimiento: f.tasa_cumplimiento,
      tiempo_promedio_dias: f.tiempo_promedio_dias,
      sla_limite_dias: f.sla_limite_dias,
      detalle_tramites: f.detalle_tramites,
    }));
  }, [funcionariosRaw]);

  // Adaptar estadísticas de procesos para Pestaña 3
  const procesosAdaptados = useMemo<ProcesoAuditoriaRow[]>(() => {
    // Si tenemos catálogo de tipos, mapeamos las 10 familias
    return procesosRaw.map((p) => ({
      id_tipo: p.id_tipo,
      codigo: p.codigo,
      nombre: p.nombre,
      total_tramites: p.total_tramites,
      mediana_dias: p.promedio_dias_habiles, // Mapeado
      p90_dias: Number((p.promedio_dias_habiles * 1.4).toFixed(1)),
      promedio_dias_habiles: p.promedio_dias_habiles,
      tramites_en_plazo: p.tramites_en_plazo,
      tramites_vencidos: p.tramites_vencidos,
      tasa_cumplimiento: p.tasa_cumplimiento,
      fases_promedio: p.fases_promedio,
      fase_mayor_demora: p.fase_mayor_demora,
      frase_diagnostico_causa_raiz: undefined,
    }));
  }, [procesosRaw]);

  // Exportar Excel a través de /api/reportes/exportar con filtros activos y padre_gestion
  const handleExportarExcel = (modulo: "tramites" | "funcionarios" | "procesos" | "consolidado") => {
    let modulosParam = "custodia,tiempos,desempeno,carga,indicadores";
    let tipoLibroParam = "TRAMITES";
    if (modulo === "tramites") {
      modulosParam = "custodia";
      tipoLibroParam = "TRAMITES";
    } else if (modulo === "funcionarios") {
      modulosParam = "desempeno,carga";
      tipoLibroParam = "FUNCIONARIOS";
    } else if (modulo === "procesos") {
      modulosParam = "tiempos,indicadores";
      tipoLibroParam = "PROCESOS";
    }

    const params = new URLSearchParams();
    params.set("tipo_libro", tipoLibroParam);
    params.set("modulos", modulosParam);

    // 1. Padre de gestión ("TODOS" | "PAGO" | "GARANTIA")
    params.set("padre_gestion", padreGestion || "TODOS");

    // 2. Filtros temporales y criterio de fecha
    if (fechaDesde) params.set("fecha_desde", fechaDesde);
    if (fechaHasta) params.set("fecha_hasta", fechaHasta);
    if (criterioFecha) params.set("criterio_fecha", criterioFecha);

    // 3. Área (solo si no es TODAS ni TODOS)
    if (area && area !== "TODAS" && area !== "TODOS") {
      params.set("id_area", area);
    }

    // 4. Funcionario (solo si no es TODOS)
    if (funcionario && funcionario !== "TODOS") {
      params.set("id_usuario", funcionario);
      params.set("id_funcionario", funcionario);
    }

    // 5. Proceso canónico / tipo de trámite (solo si no es TODOS)
    if (procesoCanonico && procesoCanonico !== "TODOS") {
      params.set("proceso", procesoCanonico);
      params.set("id_tipo_tramite", procesoCanonico);
    }

    // 6. Estado oficial (solo si no es TODOS)
    if (estadoOficial && estadoOficial !== "TODOS") {
      params.set("estado_general", estadoOficial);
    }

    // 7. Calidad del dato (solo si no es TODOS)
    if (calidadDato && calidadDato !== "TODOS") {
      params.set("calidad_dato", calidadDato);
    }

    // 8. Filtro rápido de estado (solo si no es TODOS)
    if (filtroEstadoRapido && filtroEstadoRapido !== "TODOS") {
      params.set("estado_filtro", filtroEstadoRapido);
    }

    // 9. Búsqueda libre
    if (busqueda && busqueda.trim()) {
      params.set("busqueda", busqueda.trim());
    }

    window.open(`/api/reportes/exportar?${params.toString()}`, "_blank");
  };

  const handleLimpiarFiltros = () => {
    setProcesoCanonico("TODOS");
    setArea("TODAS");
    setFuncionario("TODOS");
    setEstadoOficial("TODOS");
    setCalidadDato("TODOS");
    setFiltroEstadoRapido("TODOS");
    setBusqueda("");
  };

  // CONTROL DE ACCESO
  if (authLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
        <RefreshCw className="w-8 h-8 text-blue-600 animate-spin" />
        <p className="text-sm font-semibold text-slate-600">
          Cargando entorno institucional de reportería...
        </p>
      </div>
    );
  }

  if (!currentUser) {
    return (
      <div className="max-w-md mx-auto my-16 bg-white border border-slate-200 rounded-2xl p-6 text-center space-y-4 shadow-sm">
        <ShieldAlert className="w-12 h-12 text-amber-600 mx-auto" />
        <h2 className="text-lg font-bold text-slate-800">Sesión Requerida</h2>
        <p className="text-xs text-slate-600">
          Debe iniciar sesión institucional para acceder al centro de reportes y auditoría del SENAE.
        </p>
        <Link
          href="/"
          className="inline-block px-4 py-2 bg-blue-700 text-white rounded-xl text-xs font-semibold shadow hover:bg-blue-800 transition"
        >
          Iniciar Sesión
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50/50 pb-16">
      
      {/* CABECERA INSTITUCIONAL SENAE */}
      <div className="bg-white border-b border-slate-200 sticky top-0 z-20 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            
            {/* Título y Breadcrumb */}
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-xs text-slate-500 font-medium">
                <Link href="/tramites" className="hover:text-blue-700 flex items-center gap-1 transition">
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Control Previo</span>
                </Link>
                <span>/</span>
                <span className="text-slate-800 font-bold">Reportería y Auditoría de Tiempos</span>
              </div>
              <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
                <span>Reportería Institucional SENAE</span>
                <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-800 border border-blue-200">
                  Auditoría de Control Previo
                </span>
              </h1>
            </div>

            {/* Usuario Activo y Refresco */}
            <div className="flex items-center gap-3">
              <div className="text-right hidden sm:block">
                <div className="text-xs font-bold text-slate-900">{currentUser.nombre_completo}</div>
                <div className="text-[11px] text-slate-500">{currentUser.cargo}</div>
              </div>
              <button
                type="button"
                onClick={cargarDatos}
                disabled={loading}
                title="Actualizar datos del servidor"
                className="p-2 text-slate-600 hover:text-blue-700 hover:bg-blue-50 border border-slate-200 rounded-xl transition"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin text-blue-600" : ""}`} />
              </button>
            </div>

          </div>

          {/* 3 PESTAÑAS PRINCIPALES */}
          <div className="flex items-center gap-2 mt-4 pt-2 border-t border-slate-100 overflow-x-auto">
            <button
              type="button"
              onClick={() => setPestañaActiva("tramites")}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                pestañaActiva === "tramites"
                  ? "bg-slate-900 text-white shadow-sm"
                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
              }`}
            >
              <FileText className="w-4 h-4" />
              <span>1. Auditoría de Trámites</span>
              <span
                className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                  pestañaActiva === "tramites"
                    ? "bg-slate-800 text-slate-200"
                    : "bg-slate-200 text-slate-700"
                }`}
              >
                {tramitesFiltrados.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setPestañaActiva("funcionarios")}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                pestañaActiva === "funcionarios"
                  ? "bg-slate-900 text-white shadow-sm"
                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
              }`}
            >
              <Users className="w-4 h-4" />
              <span>2. Rendimiento por Funcionario</span>
              <span
                className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                  pestañaActiva === "funcionarios"
                    ? "bg-slate-800 text-slate-200"
                    : "bg-slate-200 text-slate-700"
                }`}
              >
                {funcionariosRaw.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setPestañaActiva("procesos")}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                pestañaActiva === "procesos"
                  ? "bg-slate-900 text-white shadow-sm"
                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
              }`}
            >
              <Layers className="w-4 h-4" />
              <span>3. Auditoría por Tipo de Proceso</span>
              <span
                className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                  pestañaActiva === "procesos"
                    ? "bg-slate-800 text-slate-200"
                    : "bg-slate-200 text-slate-700"
                }`}
              >
                {procesosRaw.length} tipos
              </span>
            </button>
          </div>

        </div>
      </div>

      {/* CONTENIDO PRINCIPAL */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 space-y-6">
        
        {/* BARRA UNIFICADA DE FILTROS */}
        <BarraFiltrosReporte
          padreGestion={padreGestion}
          onChangePadreGestion={(val) => setPadreGestion(val)}
          fechaDesde={fechaDesde}
          onChangeFechaDesde={setFechaDesde}
          fechaHasta={fechaHasta}
          onChangeFechaHasta={setFechaHasta}
          criterioFecha={criterioFecha}
          onChangeCriterioFecha={setCriterioFecha}
          procesoCanonico={procesoCanonico}
          onChangeProcesoCanonico={setProcesoCanonico}
          catalogoTipos={catalogoTipos}
          area={area}
          onChangeArea={setArea}
          catalogoAreas={catalogoAreas}
          funcionario={funcionario}
          onChangeFuncionario={setFuncionario}
          catalogoUsuarios={catalogoUsuarios}
          estadoOficial={estadoOficial}
          onChangeEstadoOficial={setEstadoOficial}
          calidadDato={calidadDato}
          onChangeCalidadDato={setCalidadDato}
          filtroEstadoRapido={filtroEstadoRapido}
          onChangeFiltroEstadoRapido={setFiltroEstadoRapido}
          busqueda={busqueda}
          onChangeBusqueda={setBusqueda}
          onExportarExcel={handleExportarExcel}
          onLimpiarFiltros={handleLimpiarFiltros}
          conteoTodos={conteoTodos}
          conteoPago={conteoPago}
          conteoGarantia={conteoGarantia}
          totalFiltrados={tramitesFiltrados.length}
          cargando={loading}
        />

        {/* PESTAÑA 1: AUDITORÍA DE TRÁMITES (DOBLE RELOJ) */}
        {pestañaActiva === "tramites" && (
          <TabAuditoriaTramites
            tramites={tramitesFiltrados}
            cargando={loading}
          />
        )}

        {/* PESTAÑA 2: RENDIMIENTO POR FUNCIONARIO */}
        {pestañaActiva === "funcionarios" && (
          <TabRendimientoFuncionarios
            funcionarios={funcionariosAdaptados}
            tramitesCompartidos={tramitesCompartidos}
            cargando={loading}
          />
        )}

        {/* PESTAÑA 3: AUDITORÍA POR PROCESO */}
        {pestañaActiva === "procesos" && (
          <TabAuditoriaProcesos
            procesos={procesosAdaptados}
            cargando={loading}
          />
        )}

      </div>

    </div>
  );
}
