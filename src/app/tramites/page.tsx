"use client";

import React, { useEffect, useState, useCallback, useMemo } from "react";
import { TramiteCompletoDTO, UsuarioInstitucional } from "@/types";
import { formatCurrency, formatDate } from "@/lib/utils";
import { BadgeEstado, SemaforoSLA } from "@/components/ui";
import Link from "next/link";
import {
  FileText,
  Search,
  RefreshCw,
  Filter,
  User,
  FilePlus2,
  LayoutGrid,
  List,
  ChevronRight,
} from "lucide-react";
import { useRouter } from "next/navigation";

export default function TramitesCatalogoPage() {
  const router = useRouter();
  const [tramites, setTramites] = useState<TramiteCompletoDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filtroArea, setFiltroArea] = useState("TODAS");
  const [filtroFuncionario, setFiltroFuncionario] = useState("TODOS");
  const [filtroEstado, setFiltroEstado] = useState("TODOS");
  const [filtroGestion, setFiltroGestion] = useState("TODAS");
  const [vistaModo, setVistaModo] = useState<"auto" | "tabla" | "tarjetas">("auto");
  const [usuariosList, setUsuariosList] = useState<{ id_usuario: number; nombre_completo: string; cargo?: string | null; iniciales?: string | null }[]>([]);
  const [currentUser, setCurrentUser] = useState<UsuarioInstitucional | null>(null);

  const isAdmin = currentUser?.rol === "ADMIN" || currentUser?.rol === "ADMINISTRADOR";

  useEffect(() => {
    fetch("/api/auth/session")
      .then((r) => r.json())
      .then((d) => setCurrentUser(d.user || d.usuario || null))
      .catch((err) => console.error("Error loading session:", err));

    fetch("/api/auth/usuarios")
      .then((r) => r.json())
      .then((d) => {
        if (d.usuarios) setUsuariosList(d.usuarios);
      })
      .catch((err) => console.error("Error loading usuarios:", err));
  }, []);

  const fetchTramites = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/tramites?tipo=todos");
      const data = await res.json();
      if (data.tramites) {
        setTramites(data.tramites);
      }
    } catch (error) {
      console.error("Error fetching tramites catalog:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTramites();
  }, [fetchTramites]);

  // Lista consolidada de funcionarios para el selector de filtro
  const funcionariosOpciones = useMemo(() => {
    const map = new Map<string, { id: string; nombre: string; cargo?: string; iniciales?: string }>();
    usuariosList.forEach((u) => {
      map.set(String(u.id_usuario), {
        id: String(u.id_usuario),
        nombre: u.nombre_completo,
        cargo: u.cargo || undefined,
        iniciales: u.iniciales || undefined,
      });
    });
    tramites.forEach((t) => {
      if (t.usuarios?.id_usuario && !map.has(String(t.usuarios.id_usuario))) {
        map.set(String(t.usuarios.id_usuario), {
          id: String(t.usuarios.id_usuario),
          nombre: t.usuarios.nombre_completo,
          cargo: t.usuarios.cargo || undefined,
          iniciales: t.usuarios.iniciales || undefined,
        });
      }
    });
    return Array.from(map.values()).sort((a, b) => a.nombre.localeCompare(b.nombre));
  }, [usuariosList, tramites]);

  const ESTADOS_LISTA = [
    { value: "TODOS", label: "TODOS LOS ESTADOS" },
    { value: "INGRESADO", label: "INGRESADO" },
    { value: "REVISION", label: "REVISION" },
    { value: "REVISADO", label: "REVISADO" },
    { value: "FACTURA", label: "FACTURA" },
    { value: "CONTABILIDAD", label: "CONTABILIDAD" },
    { value: "DFI", label: "DFI" },
    { value: "PAGO_APROBADO", label: "PAGO APROBADO" },
    { value: "PAGADO", label: "PAGADO" },
    { value: "ARCHIVO", label: "ARCHIVO" },
    { value: "OBSERVADO", label: "OBSERVADO" },
    { value: "INSUBSISTENTE", label: "INSUBSISTENTE" },
    { value: "DEVUELTO", label: "DEVUELTO" },
    { value: "ANULADO", label: "ANULADO" },
  ];

  // Búsqueda global (NÚMERO DE QUIPUX, GESTIÓN, BENEFICIARIO, TIPO DE PROCESO, FUNCIONARIO, ESTADO) y Filtros
  const filteredTramites = useMemo(() => {
    const q = search.trim().toLowerCase();

    return tramites.filter((t) => {
      // 1. Filtro por Área
      if (filtroArea !== "TODAS" && String(t.id_area_actual) !== filtroArea) {
        return false;
      }

      // 2. Filtro por Funcionario (Custodio Actual)
      if (filtroFuncionario !== "TODOS") {
        const idCustodio = String(t.id_custodio_actual);
        if (idCustodio !== filtroFuncionario) {
          return false;
        }
      }

      // 3. Filtro por Estado General
      if (filtroEstado !== "TODOS") {
        const estadoG = (t.estado_general || "").toUpperCase();
        if (estadoG !== filtroEstado.toUpperCase()) {
          if (filtroEstado === "OBSERVADO" && (estadoG === "OBSERVADO" || estadoG === "OBSERVADO_72H")) {
            // match
          } else if (filtroEstado === "ARCHIVO" && (estadoG === "ARCHIVO" || estadoG === "FINALIZADO_ARCHIVADO")) {
            // match
          } else {
            return false;
          }
        }
      }

      // 4. Filtro por Gestión (padre_gestion: PAGO / GARANTIA)
      if (filtroGestion !== "TODAS") {
        const gestionPadre = (t.padre_gestion || "").toUpperCase();
        if (gestionPadre !== filtroGestion.toUpperCase()) {
          return false;
        }
      }

      // 5. Búsqueda Global: NÚMERO DE QUIPUX, GESTION, BENEFICIARIO, TIPO DE PROCESO, FUNCIONARIO, ESTADO
      if (q) {
        const quipux = (t.numero_quipux || "").toLowerCase();
        const codigo = (t.codigo_tramite || "").toLowerCase();
        const gestion = `${t.padre_gestion || ""} ${t.tipo_gestion || ""} ${t.tipo_flujo || ""}`.toLowerCase();
        const beneficiario = `${t.proveedor_beneficiario || ""} ${t.ruc_proveedor || ""}`.toLowerCase();
        const tipoProceso = `${t.tipos_tramite?.nombre || ""} ${t.nro_tramite || ""}`.toLowerCase();
        const funcionario = `${t.usuarios?.nombre_completo || ""} ${t.usuarios?.cargo || ""} ${t.usuarios?.iniciales || ""}`.toLowerCase();
        const estado = `${t.estado_general || ""} ${t.sub_estado || ""}`.toLowerCase();
        const factura = (t.numero_factura || "").toLowerCase();

        const match =
          quipux.includes(q) ||
          codigo.includes(q) ||
          gestion.includes(q) ||
          beneficiario.includes(q) ||
          tipoProceso.includes(q) ||
          funcionario.includes(q) ||
          estado.includes(q) ||
          factura.includes(q);

        if (!match) return false;
      }

      return true;
    });
  }, [tramites, filtroArea, filtroFuncionario, filtroEstado, filtroGestion, search]);

  return (
    <div className="w-full max-w-full min-w-0 space-y-5">
      {/* Header Institucional */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 sm:p-5 rounded-xl border border-slate-200 shadow-xs">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-blue-600 shrink-0" />
            <h1 className="text-sm sm:text-base font-bold text-slate-900 uppercase tracking-wide truncate">
              Catálogo General de Trámites y Expedientes
            </h1>
          </div>
          <p className="text-xs text-slate-500 mt-1 uppercase">
            Consulta consolidada de todos los trámites institucionales del SENAE con búsqueda y trazabilidad. Haga clic en cualquier registro para abrir el expediente.
          </p>
        </div>
      </div>

      {/* Barra de Filtros y Búsqueda Fluida */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-3">
        {/* Fila superior / barra principal: Buscador global fluido + Botón 'Nuevo Trámite' y 'Actualizar' */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="BUSCAR QUIPUX, GESTIÓN, BENEFICIARIO, PROCESO, FUNCIONARIO, ESTADO..."
              className="w-full pl-9 pr-8 py-2 text-xs bg-slate-50 hover:bg-white focus:bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-xs uppercase font-medium placeholder:text-slate-400 transition-colors"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch("")}
                className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600 text-xs font-bold"
                title="Limpiar búsqueda"
              >
                ✕
              </button>
            )}
          </div>

          <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
            {/* Toggle de Vista: Tabla vs Tarjetas */}
            <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200">
              <button
                type="button"
                onClick={() => setVistaModo("tabla")}
                className={`p-1.5 rounded-md text-xs font-semibold transition-colors flex items-center gap-1 ${
                  vistaModo === "tabla"
                    ? "bg-white text-blue-700 shadow-2xs font-bold"
                    : vistaModo === "auto"
                    ? "hidden sm:flex bg-white text-blue-700 shadow-2xs font-bold"
                    : "text-slate-600 hover:text-slate-900"
                }`}
                title="Vista en Tabla"
              >
                <List className="w-4 h-4" />
                <span className="hidden md:inline text-[11px]">Tabla</span>
              </button>
              <button
                type="button"
                onClick={() => setVistaModo("tarjetas")}
                className={`p-1.5 rounded-md text-xs font-semibold transition-colors flex items-center gap-1 ${
                  vistaModo === "tarjetas"
                    ? "bg-white text-blue-700 shadow-2xs font-bold"
                    : vistaModo === "auto"
                    ? "flex sm:hidden bg-white text-blue-700 shadow-2xs font-bold"
                    : "text-slate-600 hover:text-slate-900"
                }`}
                title="Vista en Tarjetas"
              >
                <LayoutGrid className="w-4 h-4" />
                <span className="hidden md:inline text-[11px]">Tarjetas</span>
              </button>
            </div>

            {isAdmin && (
              <Link
                href="/recepcion"
                className="inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-2xs transition-colors shrink-0"
                title="Radicar un nuevo trámite institucional directamente"
              >
                <FilePlus2 className="w-4 h-4" />
                <span>Nuevo Trámite</span>
              </Link>
            )}

            <button
              onClick={fetchTramites}
              disabled={loading}
              className="p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg border border-slate-200 transition-colors shrink-0"
              title="Actualizar catálogo"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin text-blue-600" : ""}`} />
            </button>
          </div>
        </div>

        {/* Fila de filtros: Grid o flex-wrap inteligente */}
        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100">
          <div className="flex items-center gap-1.5 text-xs text-slate-500 font-bold uppercase tracking-wider shrink-0">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <span>Filtros:</span>
          </div>

          {/* 1. ÁREAS */}
          <select
            value={filtroArea}
            onChange={(e) => setFiltroArea(e.target.value)}
            className="w-full sm:w-auto text-xs min-w-[140px] max-w-full sm:max-w-[200px] bg-slate-50 hover:bg-slate-100 border border-slate-300 rounded-lg py-2 px-3 focus:ring-2 focus:ring-blue-500 focus:outline-none uppercase font-semibold text-slate-700 cursor-pointer transition-colors truncate"
            title="Filtrar por Área Institucional"
          >
            <option value="TODAS">TODAS LAS ÁREAS</option>
            <option value="1">DIRECCIÓN FINANCIERA (DFI)</option>
            <option value="2">PRESUPUESTO</option>
            <option value="3">CONTABILIDAD</option>
            <option value="4">TESORERÍA / PAGOS</option>
            <option value="5">COBRANZAS</option>
            <option value="6">ARCHIVO</option>
          </select>

          {/* 2. FUNCIONARIOS */}
          <select
            value={filtroFuncionario}
            onChange={(e) => setFiltroFuncionario(e.target.value)}
            className="w-full sm:w-auto text-xs min-w-[140px] max-w-full sm:max-w-[200px] bg-slate-50 hover:bg-slate-100 border border-slate-300 rounded-lg py-2 px-3 focus:ring-2 focus:ring-blue-500 focus:outline-none uppercase font-semibold text-slate-700 cursor-pointer transition-colors truncate"
            title="Filtrar por Funcionario Custodio"
          >
            <option value="TODOS">TODOS LOS FUNCIONARIOS</option>
            {funcionariosOpciones.map((f) => (
              <option key={f.id} value={f.id}>
                {f.nombre} {f.iniciales ? `(${f.iniciales})` : ""}
              </option>
            ))}
          </select>

          {/* 3. ESTADOS */}
          <select
            value={filtroEstado}
            onChange={(e) => setFiltroEstado(e.target.value)}
            className="w-full sm:w-auto text-xs min-w-[140px] max-w-full sm:max-w-[200px] bg-slate-50 hover:bg-slate-100 border border-slate-300 rounded-lg py-2 px-3 focus:ring-2 focus:ring-blue-500 focus:outline-none uppercase font-semibold text-slate-700 cursor-pointer transition-colors truncate"
            title="Filtrar por Estado General del Trámite"
          >
            {ESTADOS_LISTA.map((est) => (
              <option key={est.value} value={est.value}>
                {est.label}
              </option>
            ))}
          </select>

          {/* 4. GESTIÓN (padre_gestion) */}
          <select
            value={filtroGestion}
            onChange={(e) => setFiltroGestion(e.target.value)}
            className="w-full sm:w-auto text-xs min-w-[140px] max-w-full sm:max-w-[200px] bg-slate-50 hover:bg-slate-100 border border-slate-300 rounded-lg py-2 px-3 focus:ring-2 focus:ring-blue-500 focus:outline-none uppercase font-semibold text-slate-700 cursor-pointer transition-colors truncate"
            title="Filtrar por Gestión (Pago / Garantía)"
          >
            <option value="TODAS">TODAS LAS GESTIONES</option>
            <option value="PAGO">PAGO</option>
            <option value="GARANTIA">GARANTÍA</option>
          </select>

          {/* Botón para restablecer filtros si hay alguno activo */}
          {(filtroArea !== "TODAS" ||
            filtroFuncionario !== "TODOS" ||
            filtroEstado !== "TODOS" ||
            filtroGestion !== "TODAS" ||
            search.trim() !== "") && (
            <button
              onClick={() => {
                setFiltroArea("TODAS");
                setFiltroFuncionario("TODOS");
                setFiltroEstado("TODOS");
                setFiltroGestion("TODAS");
                setSearch("");
              }}
              className="px-2.5 py-1.5 text-[11px] font-bold text-rose-600 hover:text-rose-800 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-lg transition-colors uppercase tracking-wider cursor-pointer shrink-0"
              title="Restablecer todos los filtros"
            >
              Limpiar
            </button>
          )}
        </div>
      </div>

      {/* Contador de resultados */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between text-xs text-slate-500 px-1 gap-1">
        <span className="font-medium uppercase tracking-wider text-[11px]">
          Mostrando <strong className="text-slate-900 font-bold">{filteredTramites.length}</strong> de{" "}
          <strong className="text-slate-900 font-bold">{tramites.length}</strong> trámites institucionales
        </span>
        <span className="text-[10px] text-slate-400 font-medium hidden sm:inline">
          Haga clic en cualquier trámite para consultar el expediente institucional
        </span>
      </div>

      {/* Vista Móvil / Tarjetas en < sm (menos de 640px o según toggle) */}
      <div
        className={`w-full max-w-full min-w-0 space-y-3 ${
          vistaModo === "tabla" ? "hidden" : vistaModo === "tarjetas" ? "block" : "block sm:hidden"
        }`}
      >
        {loading ? (
          <div className="bg-white p-8 rounded-xl border border-slate-200 text-center text-xs text-slate-500 flex flex-col items-center gap-2 shadow-xs">
            <RefreshCw className="w-5 h-5 animate-spin text-blue-600" />
            <span className="uppercase font-semibold">Consultando registros...</span>
          </div>
        ) : filteredTramites.length === 0 ? (
          <div className="bg-white p-8 rounded-xl border border-slate-200 text-center text-xs text-slate-500 uppercase font-semibold shadow-xs">
            No se encontraron trámites que coincidan con los filtros de búsqueda.
          </div>
        ) : (
          filteredTramites.map((t) => (
            <div
              key={t.id_tramite}
              onClick={() => router.push(isAdmin ? `/tramite/${t.id_tramite}` : `/tramite/${t.id_tramite}?readonly=true`)}
              className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs hover:border-blue-400 hover:shadow-sm active:bg-blue-50/50 transition-all cursor-pointer space-y-3"
            >
              {/* Encabezado: Quipux + Estado */}
              <div className="flex items-start justify-between gap-2 border-b border-slate-100 pb-2.5">
                <div className="min-w-0">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    N° Quipux
                  </span>
                  <span className="font-mono font-bold text-blue-700 text-sm truncate block" title={t.numero_quipux}>
                    {t.numero_quipux}
                  </span>
                  {(t.fecha_ingreso || t.fecha_recepcion_fisica || t.fecha_memorando) && (
                    <span className="text-[10px] text-slate-400 font-mono block mt-0.5">
                      Ingreso: {formatDate(t.fecha_ingreso || t.fecha_recepcion_fisica || t.fecha_memorando)}
                    </span>
                  )}
                </div>
                <div className="shrink-0 text-right">
                  <BadgeEstado estado={t.estado_general} subEstado={t.sub_estado} />
                </div>
              </div>

              {/* Contenido: Beneficiario + Tipo de Proceso */}
              <div className="space-y-1.5 text-xs">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    Beneficiario / RUC
                  </span>
                  <p className="font-bold text-slate-900 uppercase truncate text-xs" title={t.proveedor_beneficiario}>
                    {t.proveedor_beneficiario}
                  </p>
                  <p className="text-[11px] font-mono text-slate-500">
                    RUC: {t.ruc_proveedor || "SIN RUC"}
                  </p>
                </div>

                <div className="pt-1 flex items-center justify-between text-[11px] gap-2 border-t border-slate-50">
                  <div className="truncate">
                    <span className="text-slate-500 font-semibold uppercase">{t.padre_gestion || t.tipo_flujo || "PAGO"}</span>
                    <span className="text-slate-400 mx-1">·</span>
                    <span className="text-slate-700 font-medium truncate">{t.tipos_tramite?.nombre || "CONTRATACIÓN"}</span>
                  </div>
                  {t.usuarios?.nombre_completo && (
                    <div className="flex items-center gap-1 text-slate-600 truncate shrink-0 max-w-[130px]" title={t.usuarios.nombre_completo}>
                      <User className="w-3 h-3 text-blue-600 shrink-0" />
                      <span className="text-[10px] font-semibold truncate">{t.usuarios.nombre_completo}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Pie: Monto + SLA */}
              <div className="flex items-center justify-between pt-2.5 border-t border-slate-100 bg-slate-50/70 -mx-4 -mb-4 px-4 py-2.5 rounded-b-xl">
                <div>
                  <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider block">
                    Monto Total
                  </span>
                  <span className="font-mono font-bold text-slate-900 text-sm">
                    {formatCurrency(t.monto_total)}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="text-right">
                    <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider block">
                      SLA (6 Días)
                    </span>
                    <SemaforoSLA sla={t.sla} />
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-400 shrink-0 ml-1" />
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Contenedor de la Tabla Institucional */}
      <div
        className={`w-full max-w-full min-w-0 bg-white border border-slate-200 rounded-xl overflow-x-auto shadow-xs ${
          vistaModo === "tarjetas" ? "hidden" : vistaModo === "tabla" ? "block" : "hidden sm:block"
        }`}
      >
        {loading ? (
          <div className="p-12 text-center text-xs text-slate-500 flex flex-col items-center gap-2">
            <RefreshCw className="w-5 h-5 animate-spin text-blue-600" />
            <span className="uppercase font-semibold">Consultando registros...</span>
          </div>
        ) : filteredTramites.length === 0 ? (
          <div className="p-12 text-center text-xs text-slate-500 uppercase font-semibold">
            No se encontraron trámites que coincidan con los filtros de búsqueda.
          </div>
        ) : (
          <table className="min-w-[900px] w-full border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                <th className="py-3 px-3 text-center w-40 min-w-[140px] sticky left-0 bg-slate-50 z-20 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">
                  NÚMERO QUIPUX
                </th>
                <th className="py-3 px-3 text-left w-24 min-w-[80px] whitespace-nowrap">
                  GESTIÓN
                </th>
                <th className="py-3 px-3 text-left min-w-[160px] max-w-[220px]">
                  BENEFICIARIO / RUC
                </th>
                <th className="py-3 px-3 text-left min-w-[130px] max-w-[170px]">
                  TIPO DE PROCESO
                </th>
                <th className="py-3 px-3 text-left min-w-[120px] max-w-[150px]">
                  FUNCIONARIO
                </th>
                <th className="py-3 px-3 text-right w-28 min-w-[95px]">
                  MONTO TOTAL
                </th>
                <th className="py-3 px-2 text-center w-20 min-w-[70px]">
                  SLA (6D)
                </th>
                <th className="py-3 px-3 text-center w-28 min-w-[100px]">
                  ESTADO
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {filteredTramites.map((t) => (
                <tr
                  key={t.id_tramite}
                  onClick={() => router.push(isAdmin ? `/tramite/${t.id_tramite}` : `/tramite/${t.id_tramite}?readonly=true`)}
                  onDoubleClick={() => router.push(isAdmin ? `/tramite/${t.id_tramite}` : `/tramite/${t.id_tramite}?readonly=true`)}
                  title={isAdmin ? "Doble clic para gestionar o supervisar el expediente (Superusuario)" : "Doble clic para consultar el expediente institucional"}
                  className="hover:bg-blue-50/70 transition-colors cursor-pointer select-none group"
                >
                  {/* NÚMERO QUIPUX: Columna fija a la izquierda al hacer scroll horizontal */}
                  <td className="py-3 px-3 align-middle text-center whitespace-nowrap w-40 min-w-[140px] sticky left-0 bg-white z-10 group-hover:bg-blue-50/90 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)] transition-colors overflow-hidden">
                    <div className="font-mono font-bold text-blue-700 group-hover:text-blue-900 transition-colors text-xs max-w-[160px] truncate overflow-hidden mx-auto" title={t.numero_quipux}>
                      {t.numero_quipux}
                    </div>
                    {(t.fecha_ingreso || t.fecha_recepcion_fisica || t.fecha_memorando) && (
                      <div
                        className="text-[10px] text-slate-400 font-mono mt-0.5 max-w-[160px] truncate overflow-hidden mx-auto"
                        title={`Fecha de Ingreso: ${formatDate(t.fecha_ingreso || t.fecha_recepcion_fisica || t.fecha_memorando)}`}
                      >
                        {formatDate(t.fecha_ingreso || t.fecha_recepcion_fisica || t.fecha_memorando)}
                      </div>
                    )}
                  </td>

                  {/* GESTIÓN */}
                  <td className="py-3 px-3 align-middle w-24 min-w-[80px] whitespace-nowrap">
                    <div className="flex flex-col gap-0.5">
                      <span className="text-[10px] uppercase font-bold text-slate-500 truncate">
                        {t.padre_gestion || t.tipo_flujo || "PAGO"}
                      </span>
                      <span className="font-semibold text-slate-800 text-[11px] truncate" title={t.tipo_gestion || "PAGO"}>
                        {t.tipo_gestion || "PAGO"}
                      </span>
                    </div>
                  </td>

                  {/* BENEFICIARIO / RUC */}
                  <td className="py-3 px-3 align-middle min-w-[160px] max-w-[220px]">
                    <div
                      className="font-semibold text-slate-800 uppercase truncate text-[11px]"
                      title={t.proveedor_beneficiario}
                    >
                      {t.proveedor_beneficiario}
                    </div>
                    <div className="text-[10px] font-mono text-slate-500 mt-0.5 truncate" title={`RUC: ${t.ruc_proveedor || "SIN RUC"}`}>
                      RUC: {t.ruc_proveedor || "SIN RUC"}
                    </div>
                  </td>

                  {/* TIPO DE PROCESO */}
                  <td className="py-3 px-3 align-middle min-w-[130px] max-w-[170px]">
                    <div
                      className="text-slate-800 uppercase truncate text-[11px] font-semibold"
                      title={t.tipos_tramite?.nombre || "CONTRATACIÓN"}
                    >
                      {t.tipos_tramite?.nombre || "CONTRATACIÓN"}
                    </div>
                    {t.nro_tramite && (
                      <div className="text-[10px] font-mono text-slate-400 truncate">
                        Trámite: {t.nro_tramite}
                      </div>
                    )}
                  </td>

                  {/* FUNCIONARIO */}
                  <td className="py-3 px-3 align-middle min-w-[120px] max-w-[150px] whitespace-nowrap">
                    <div
                      className="font-bold text-slate-800 text-[11px] truncate uppercase flex items-center gap-1.5"
                      title={t.usuarios?.nombre_completo || "Sin Asignar"}
                    >
                      <User className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                      <span className="truncate">{t.usuarios?.nombre_completo || "Sin Asignar"}</span>
                    </div>
                    {t.usuarios?.cargo && (
                      <div className="text-[10px] text-slate-400 font-medium truncate uppercase pl-5" title={t.usuarios.cargo}>
                        {t.usuarios.cargo}
                      </div>
                    )}
                  </td>

                  {/* MONTO TOTAL */}
                  <td className="py-3 px-3 align-middle text-right w-28 min-w-[95px] whitespace-nowrap">
                    <div className="font-mono font-bold text-slate-900 text-xs">
                      {formatCurrency(t.monto_total)}
                    </div>
                  </td>

                  {/* SLA (6D) */}
                  <td className="py-3 px-2 align-middle text-center w-20 min-w-[70px] whitespace-nowrap">
                    <SemaforoSLA sla={t.sla} />
                  </td>

                  {/* ESTADO */}
                  <td className="py-3 px-3 align-middle text-center w-28 min-w-[100px] whitespace-nowrap">
                    <BadgeEstado estado={t.estado_general} subEstado={t.sub_estado} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
