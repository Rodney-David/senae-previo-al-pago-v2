"use client";

import React, { useState, useRef, useEffect } from "react";
import {
  Calendar,
  Filter,
  Download,
  Search,
  RotateCcw,
  Building2,
  Users,
  Layers,
  ChevronDown,
  FileSpreadsheet,
  CheckCircle2,
  Clock,
  ShieldCheck,
  CreditCard,
  Scale,
  Sparkles,
} from "lucide-react";
import { SearchableSelect } from "@/components/ui/SearchableSelect";

export interface BarraFiltrosProps {
  padreGestion: "TODOS" | "PAGO" | "GARANTIA";
  onChangePadreGestion: (val: "TODOS" | "PAGO" | "GARANTIA") => void;

  fechaDesde: string;
  onChangeFechaDesde: (val: string) => void;
  fechaHasta: string;
  onChangeFechaHasta: (val: string) => void;
  criterioFecha: "recepcion" | "memorando" | "ultimo_movimiento";
  onChangeCriterioFecha: (val: "recepcion" | "memorando" | "ultimo_movimiento") => void;

  procesoCanonico: string;
  onChangeProcesoCanonico: (val: string) => void;
  catalogoTipos: Array<{ id_tipo_tramite: number; nombre: string; codigo: string }>;

  area: string;
  onChangeArea: (val: string) => void;
  catalogoAreas: Array<{ id_area: number; nombre: string; codigo: string }>;

  funcionario: string;
  onChangeFuncionario: (val: string) => void;
  catalogoUsuarios: Array<{ id_usuario: number; nombre_completo: string; cargo: string; id_area: number }>;

  estadoOficial: string;
  onChangeEstadoOficial: (val: string) => void;

  calidadDato: "TODOS" | "COMPLETO" | "HISTORICO_PARCIAL" | "INCOMPLETO";
  onChangeCalidadDato: (val: "TODOS" | "COMPLETO" | "HISTORICO_PARCIAL" | "INCOMPLETO") => void;

  filtroEstadoRapido: "TODOS" | "COMPLETADOS" | "EN_CURSO";
  onChangeFiltroEstadoRapido: (val: "TODOS" | "COMPLETADOS" | "EN_CURSO") => void;

  busqueda: string;
  onChangeBusqueda: (val: string) => void;

  onExportarExcel: (modulo: "tramites" | "funcionarios" | "procesos" | "consolidado") => void;
  onLimpiarFiltros: () => void;

  conteoTodos?: number;
  conteoPago?: number;
  conteoGarantia?: number;
  totalFiltrados: number;
  cargando?: boolean;
}

export const BarraFiltrosReporte: React.FC<BarraFiltrosProps> = ({
  padreGestion,
  onChangePadreGestion,
  fechaDesde,
  onChangeFechaDesde,
  fechaHasta,
  onChangeFechaHasta,
  criterioFecha,
  onChangeCriterioFecha,
  procesoCanonico,
  onChangeProcesoCanonico,
  catalogoTipos,
  area,
  onChangeArea,
  catalogoAreas,
  funcionario,
  onChangeFuncionario,
  catalogoUsuarios,
  estadoOficial,
  onChangeEstadoOficial,
  calidadDato,
  onChangeCalidadDato,
  filtroEstadoRapido,
  onChangeFiltroEstadoRapido,
  busqueda,
  onChangeBusqueda,
  onExportarExcel,
  onLimpiarFiltros,
  conteoTodos,
  conteoPago,
  conteoGarantia,
  totalFiltrados,
  cargando = false,
}) => {
  const [menuExportarOpen, setMenuExportarOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Cerrar menú exportar al hacer clic fuera
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setMenuExportarOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Opciones de tipos de proceso
  const opcionesProcesos = [
    { value: "TODOS", label: "Todos los Tipos de Procesos" },
    ...catalogoTipos.map((t) => ({
      value: String(t.id_tipo_tramite),
      label: t.nombre,
      sublabel: `Código: ${t.codigo}`,
    })),
  ];

  // Opciones de áreas
  const opcionesAreas = [
    { value: "TODAS", label: "Todas las Áreas Institucionales" },
    ...catalogoAreas.map((a) => ({
      value: String(a.id_area),
      label: a.nombre,
      sublabel: a.codigo,
    })),
  ];

  // Filtrar funcionarios disponibles según el área elegida
  const usuariosFiltrados =
    area === "TODAS"
      ? catalogoUsuarios
      : catalogoUsuarios.filter((u) => String(u.id_area) === area);

  const opcionesFuncionarios = [
    { value: "TODOS", label: "Todos los Funcionarios" },
    ...usuariosFiltrados.map((u) => ({
      value: String(u.id_usuario),
      label: u.nombre_completo,
      sublabel: u.cargo,
    })),
  ];

  // Opciones de estado oficial
  const estadosOficiales = [
    "TODOS",
    "INGRESADO",
    "REVISION",
    "CONTABILIDAD",
    "DFI",
    "CAJA",
    "PAGADO",
    "OBSERVADO",
    "FACTURA",
    "ARCHIVO",
    "DEVUELTO",
    "INSUBSISTENTE",
    "ANULADO",
  ];

  const aplicarRangoPredefinido = (diasAtras: number) => {
    const h = new Date();
    const d = new Date();
    d.setDate(d.getDate() - diasAtras);
    onChangeFechaHasta(h.toISOString().split("T")[0]);
    onChangeFechaDesde(d.toISOString().split("T")[0]);
  };

  const aplicarAnio2026 = () => {
    onChangeFechaDesde("2026-01-01");
    onChangeFechaHasta("2026-12-31");
  };

  return (
    <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-5 space-y-4">
      {/* 1. SELECTOR DE GESTIÓN: TODOS, PAGOS, GARANTÍAS */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
        <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-xl border border-slate-200/80">
          <button
            type="button"
            onClick={() => onChangePadreGestion("TODOS")}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all ${
              padreGestion === "TODOS"
                ? "bg-slate-900 text-white shadow-md shadow-slate-900/20"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/60"
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>Todos</span>
            {(conteoTodos !== undefined || conteoPago !== undefined || conteoGarantia !== undefined) && (
              <span
                className={`text-xs px-2 py-0.5 rounded-full font-mono ${
                  padreGestion === "TODOS"
                    ? "bg-slate-800 text-slate-100"
                    : "bg-slate-200 text-slate-700"
                }`}
              >
                {conteoTodos !== undefined
                  ? conteoTodos
                  : (conteoPago || 0) + (conteoGarantia || 0) || totalFiltrados}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => onChangePadreGestion("PAGO")}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all ${
              padreGestion === "PAGO"
                ? "bg-blue-700 text-white shadow-md shadow-blue-700/20"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/60"
            }`}
          >
            <CreditCard className="w-4 h-4" />
            <span>Pagos</span>
            {conteoPago !== undefined && (
              <span
                className={`text-xs px-2 py-0.5 rounded-full font-mono ${
                  padreGestion === "PAGO"
                    ? "bg-blue-800 text-blue-100"
                    : "bg-slate-200 text-slate-700"
                }`}
              >
                {conteoPago}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => onChangePadreGestion("GARANTIA")}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all ${
              padreGestion === "GARANTIA"
                ? "bg-purple-700 text-white shadow-md shadow-purple-700/20"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/60"
            }`}
          >
            <Scale className="w-4 h-4" />
            <span>Garantías</span>
            {conteoGarantia !== undefined && (
              <span
                className={`text-xs px-2 py-0.5 rounded-full font-mono ${
                  padreGestion === "GARANTIA"
                    ? "bg-purple-800 text-purple-100"
                    : "bg-slate-200 text-slate-700"
                }`}
              >
                {conteoGarantia}
              </span>
            )}
          </button>
        </div>

        {/* ACCIÓN EXPORTAR EXCEL CON DROPDOWN ELEGANTE */}
        <div className="relative flex items-center gap-2" ref={dropdownRef}>
          <button
            type="button"
            onClick={() => setMenuExportarOpen((prev) => !prev)}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold shadow-sm transition active:scale-95"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Exportar Excel</span>
            <ChevronDown className="w-3.5 h-3.5 opacity-80" />
          </button>

          {menuExportarOpen && (
            <div className="absolute right-0 top-full mt-2 w-64 bg-white border border-slate-200 rounded-xl shadow-xl z-30 py-1 text-xs divide-y divide-slate-100">
              <div className="px-3 py-2 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                Seleccione libro a descargar
              </div>
              <button
                type="button"
                onClick={() => {
                  onExportarExcel("tramites");
                  setMenuExportarOpen(false);
                }}
                className="w-full text-left px-4 py-2.5 hover:bg-slate-50 flex items-center gap-2.5 text-slate-700 hover:text-slate-900 transition"
              >
                <div className="w-2 h-2 rounded-full bg-blue-500" />
                <div>
                  <span className="font-semibold block">Libro de Trámites y Auditoría</span>
                  <span className="text-[10px] text-slate-400">Detalle de expedientes y doble reloj</span>
                </div>
              </button>
              <button
                type="button"
                onClick={() => {
                  onExportarExcel("funcionarios");
                  setMenuExportarOpen(false);
                }}
                className="w-full text-left px-4 py-2.5 hover:bg-slate-50 flex items-center gap-2.5 text-slate-700 hover:text-slate-900 transition"
              >
                <div className="w-2 h-2 rounded-full bg-emerald-500" />
                <div>
                  <span className="font-semibold block">Rendimiento de Funcionarios</span>
                  <span className="text-[10px] text-slate-400">Mediana, SLA y expedientes en mesa</span>
                </div>
              </button>
              <button
                type="button"
                onClick={() => {
                  onExportarExcel("procesos");
                  setMenuExportarOpen(false);
                }}
                className="w-full text-left px-4 py-2.5 hover:bg-slate-50 flex items-center gap-2.5 text-slate-700 hover:text-slate-900 transition"
              >
                <div className="w-2 h-2 rounded-full bg-amber-500" />
                <div>
                  <span className="font-semibold block">Auditoría por Procesos y Fases</span>
                  <span className="text-[10px] text-slate-400">Cuellos de botella y demoras</span>
                </div>
              </button>
              <button
                type="button"
                onClick={() => {
                  onExportarExcel("consolidado");
                  setMenuExportarOpen(false);
                }}
                className="w-full text-left px-4 py-2.5 hover:bg-slate-50 flex items-center gap-2.5 text-slate-900 font-semibold transition"
              >
                <div className="w-2 h-2 rounded-full bg-purple-600" />
                <div>
                  <span className="block">Consolidado Completo (Todas las Hojas)</span>
                  <span className="text-[10px] text-slate-400">Libro integral de auditoría SENAE</span>
                </div>
              </button>
            </div>
          )}

          <button
            type="button"
            onClick={onLimpiarFiltros}
            title="Restablecer todos los filtros"
            className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition border border-slate-200"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* 2. FILTROS DE RANGO Y CRITERIO DE FECHA */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
        {/* Selector de Criterio de Fecha */}
        <div className="md:col-span-4">
          <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block mb-1">
            Criterio de Fecha
          </label>
          <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200">
            <button
              type="button"
              onClick={() => onChangeCriterioFecha("recepcion")}
              className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition ${
                criterioFecha === "recepcion"
                  ? "bg-white text-slate-900 shadow-sm"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Recepción / Ingreso
            </button>
            <button
              type="button"
              onClick={() => onChangeCriterioFecha("memorando")}
              className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition ${
                criterioFecha === "memorando"
                  ? "bg-white text-slate-900 shadow-sm"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Memorando
            </button>
            <button
              type="button"
              onClick={() => onChangeCriterioFecha("ultimo_movimiento")}
              className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition ${
                criterioFecha === "ultimo_movimiento"
                  ? "bg-white text-slate-900 shadow-sm"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Último Movimiento
            </button>
          </div>
        </div>

        {/* Inputs de Fecha Desde y Hasta */}
        <div className="md:col-span-5 flex items-center gap-2">
          <div className="flex-1">
            <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block mb-1">
              Desde
            </label>
            <input
              type="date"
              value={fechaDesde}
              onChange={(e) => onChangeFechaDesde(e.target.value)}
              className="w-full px-3 py-1.5 text-xs font-medium border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-slate-800"
            />
          </div>

          <div className="flex-1">
            <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block mb-1">
              Hasta
            </label>
            <input
              type="date"
              value={fechaHasta}
              onChange={(e) => onChangeFechaHasta(e.target.value)}
              className="w-full px-3 py-1.5 text-xs font-medium border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-slate-800"
            />
          </div>
        </div>

        {/* Botones de Rango Rápido */}
        <div className="md:col-span-3">
          <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block mb-1">
            Rangos Rápidos
          </label>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => aplicarRangoPredefinido(30)}
              className="px-2.5 py-1 text-[11px] font-medium bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition"
            >
              30 días
            </button>
            <button
              type="button"
              onClick={() => aplicarRangoPredefinido(60)}
              className="px-2.5 py-1 text-[11px] font-medium bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition"
            >
              60 días
            </button>
            <button
              type="button"
              onClick={() => aplicarRangoPredefinido(90)}
              className="px-2.5 py-1 text-[11px] font-medium bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition"
            >
              90 días
            </button>
            <button
              type="button"
              onClick={aplicarAnio2026}
              className="px-2.5 py-1 text-[11px] font-semibold bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg transition border border-blue-200"
            >
              2026
            </button>
          </div>
        </div>
      </div>

      {/* 3. SELECTORES DE DIMENSIONES: PROCESO, ÁREA, FUNCIONARIO, ESTADO, CALIDAD */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3 pt-1">
        {/* Selector de Tipo de Proceso */}
        <div>
          <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block mb-1">
            Tipo de Proceso
          </label>
          <SearchableSelect
            options={opcionesProcesos}
            value={procesoCanonico}
            onChange={onChangeProcesoCanonico}
            placeholder="Todos los procesos..."
            searchPlaceholder="Buscar proceso..."
          />
        </div>

        {/* Selector de Área */}
        <div>
          <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block mb-1">
            Área Institucional
          </label>
          <SearchableSelect
            options={opcionesAreas}
            value={area}
            onChange={onChangeArea}
            placeholder="Todas las áreas..."
            searchPlaceholder="Buscar área..."
          />
        </div>

        {/* Selector de Funcionario */}
        <div>
          <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block mb-1">
            Funcionario / Analista
          </label>
          <SearchableSelect
            options={opcionesFuncionarios}
            value={funcionario}
            onChange={onChangeFuncionario}
            placeholder="Todos los funcionarios..."
            searchPlaceholder="Buscar funcionario..."
          />
        </div>

        {/* Selector de Estado Oficial */}
        <div>
          <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block mb-1">
            Estado Oficial
          </label>
          <select
            value={estadoOficial}
            onChange={(e) => onChangeEstadoOficial(e.target.value)}
            className="w-full px-3 py-2 text-xs font-medium border border-slate-300 rounded-xl bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-slate-800"
          >
            {estadosOficiales.map((est) => (
              <option key={est} value={est}>
                {est === "TODOS" ? "Todos los Estados" : est}
              </option>
            ))}
          </select>
        </div>

        {/* Selector de Calidad del Dato */}
        <div>
          <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block mb-1">
            Calidad del Dato
          </label>
          <select
            value={calidadDato}
            onChange={(e) =>
              onChangeCalidadDato(e.target.value as "TODOS" | "COMPLETO" | "HISTORICO_PARCIAL" | "INCOMPLETO")
            }
            className="w-full px-3 py-2 text-xs font-semibold border border-slate-300 rounded-xl bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-slate-800"
          >
            <option value="TODOS">Todas las Calidades</option>
            <option value="COMPLETO">Completo (Doble Reloj)</option>
            <option value="HISTORICO_PARCIAL">Histórico Parcial (Migrado)</option>
            <option value="INCOMPLETO">Incompleto (Para Corrección)</option>
          </select>
        </div>
      </div>

      {/* 4. BARRA DE FILTRO RÁPIDO, BÚSQUEDA Y RESUMEN */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-2 border-t border-slate-100">
        {/* Filtro Rápido de Estado: Todos / Completados / En Curso */}
        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200">
          <button
            type="button"
            onClick={() => onChangeFiltroEstadoRapido("TODOS")}
            className={`px-3 py-1 rounded-lg text-xs font-semibold transition ${
              filtroEstadoRapido === "TODOS"
                ? "bg-white text-slate-900 shadow-sm"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Todos
          </button>
          <button
            type="button"
            onClick={() => onChangeFiltroEstadoRapido("COMPLETADOS")}
            className={`px-3 py-1 rounded-lg text-xs font-semibold transition flex items-center gap-1 ${
              filtroEstadoRapido === "COMPLETADOS"
                ? "bg-emerald-600 text-white shadow-sm"
                : "text-slate-600 hover:text-emerald-700"
            }`}
          >
            <CheckCircle2 className="w-3 h-3" />
            <span>Completados (Pagados/Arch.)</span>
          </button>
          <button
            type="button"
            onClick={() => onChangeFiltroEstadoRapido("EN_CURSO")}
            className={`px-3 py-1 rounded-lg text-xs font-semibold transition flex items-center gap-1 ${
              filtroEstadoRapido === "EN_CURSO"
                ? "bg-amber-600 text-white shadow-sm"
                : "text-slate-600 hover:text-amber-700"
            }`}
          >
            <Clock className="w-3 h-3" />
            <span>En Curso</span>
          </button>
        </div>

        {/* Buscador de Texto Libre y Conteo de Resultados */}
        <div className="flex items-center gap-3">
          <div className="relative w-full sm:w-64">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={busqueda}
              onChange={(e) => onChangeBusqueda(e.target.value)}
              placeholder="Buscar Quipux, proveedor, código..."
              className="w-full pl-9 pr-3 py-1.5 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-slate-800"
            />
          </div>

          <span className="text-xs text-slate-500 whitespace-nowrap font-medium">
            <strong>{totalFiltrados}</strong> trámites filtrados
          </span>
        </div>
      </div>
    </div>
  );
};
