"use client";

import React, { useEffect, useState, useCallback, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { TramiteCompletoDTO, UsuarioInstitucional } from "@/types";
import { formatCurrency, formatDate } from "@/lib/utils";
import { BadgeEstado } from "@/components/ui/BadgeEstado";
import { SemaforoSLA } from "@/components/ui/SemaforoSLA";
import {
  Inbox,
  Search,
  RefreshCw,
  FileSpreadsheet,
  CheckSquare,
  Square,
  Send,
  AlertCircle,
  CheckCircle2,
  Filter,
  Package,
} from "lucide-react";

export default function EscritorioPage() {
  const router = useRouter();
  const [tramites, setTramites] = useState<TramiteCompletoDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"escritorio" | "ingresados" | "observados" | "caja">("escritorio");
  const [search, setSearch] = useState("");
  const [currentUser, setCurrentUser] = useState<UsuarioInstitucional | null>(null);

  // Selección de trámites para despacho por lote
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [deliveringBatch, setDeliveringBatch] = useState(false);
  const [batchSuccessMessage, setBatchSuccessMessage] = useState<string | null>(null);
  const [batchErrorMessage, setBatchErrorMessage] = useState<string | null>(null);

  const fetchTramites = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/tramites?tipo=${activeTab}&search=${encodeURIComponent(search)}`);
      const data = await res.json();
      if (data.tramites) {
        setTramites(data.tramites);
      }
    } catch (error) {
      console.error("Error fetching tramites for escritorio:", error);
    } finally {
      setLoading(false);
    }
  }, [activeTab, search]);

  useEffect(() => {
    async function loadUser() {
      try {
        const res = await fetch("/api/auth/session");
        const data = await res.json();
        if (data.user) setCurrentUser(data.user);
      } catch (err) {
        console.error(err);
      }
    }
    loadUser();
  }, []);

  useEffect(() => {
    fetchTramites();
  }, [fetchTramites]);

  // Trámites seleccionables en estado INGRESADO
  const tramitesIngresadosEnVista = useMemo(() => {
    return tramites.filter((t) => t.estado_general === "INGRESADO");
  }, [tramites]);

  const allIngresadosSelected =
    tramitesIngresadosEnVista.length > 0 &&
    tramitesIngresadosEnVista.every((t) => selectedIds.includes(t.id_tramite));

  const toggleSelectAllIngresados = () => {
    if (allIngresadosSelected) {
      setSelectedIds([]);
    } else {
      setSelectedIds(tramitesIngresadosEnVista.map((t) => t.id_tramite));
    }
  };

  const toggleSelectOne = (id: number) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  // Despacho por lote y descarga de Acta Excel Oficial
  const handleEntregarControlPrevioLote = async () => {
    if (selectedIds.length === 0) return;
    setDeliveringBatch(true);
    setBatchSuccessMessage(null);
    setBatchErrorMessage(null);

    try {
      const res = await fetch("/api/tramites/entregar-lote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: selectedIds }),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || "Error al despachar el lote a Control Previo");
      }

      // Descargar archivo Excel binario
      const blob = await res.blob();
      const contentDisposition = res.headers.get("content-disposition");
      let filename = "Acta_Entrega_Control_Previo.xlsx";
      if (contentDisposition) {
        const match = contentDisposition.match(/filename="?([^"]+)"?/);
        if (match && match[1]) filename = match[1];
      }

      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);

      setBatchSuccessMessage(
        `¡Éxito! ${selectedIds.length} trámite(s) entregados a Control Previo (Presupuesto) y Acta Excel descargada.`
      );
      setSelectedIds([]);
      fetchTramites();
    } catch (err: any) {
      setBatchErrorMessage(err.message || "Error al entregar a Control Previo");
    } finally {
      setDeliveringBatch(false);
    }
  };

  const isDFIOrAdmin = useMemo(() => {
    if (!currentUser) return false;
    const rol = (currentUser.rol || "").toUpperCase();
    return (
      currentUser.id_area === 1 ||
      ["DIRECTORA", "SECRETARIA", "DIRECTORA_FINANCIERA", "SECRETARIA_DFI"].includes(rol) ||
      ["ADMIN", "ADMINISTRADOR"].includes(rol)
    );
  }, [currentUser]);

  const canManageCajas = useMemo(() => {
    if (!currentUser) return false;
    const rol = (currentUser.rol || "").toUpperCase();
    return (
      currentUser.id_area === 4 ||
      currentUser.id_area === 6 ||
      currentUser.id_area === 1 ||
      rol === "ADMIN" ||
      rol === "ADMINISTRADOR" ||
      rol === "DIRECTORA" ||
      rol === "SECRETARIA" ||
      rol.includes("CAJA") ||
      rol.includes("TESOR")
    );
  }, [currentUser]);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <Inbox className="w-5 h-5 text-blue-600" />
            <h1 className="text-lg font-bold text-slate-900 tracking-tight">
              Mi Escritorio de Trabajo
            </h1>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Bandeja transaccional ordenada por última novedad. Gestione expedientes individuales o
            despache por lote a Control Previo con Acta Excel oficial.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchTramites}
            disabled={loading}
            className="p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg border border-slate-200 transition-colors"
            title="Actualizar bandeja"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin text-blue-600" : ""}`} />
          </button>
          {canManageCajas && (
            <Link
              href="/cajas"
              className="px-3.5 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded-lg transition-colors shadow-2xs flex items-center gap-1.5"
            >
              <Package className="w-4 h-4 text-slate-600" />
              <span>Gestión de Cajas</span>
            </Link>
          )}
          {isDFIOrAdmin && (
            <Link
              href="/recepcion"
              className="px-3.5 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors shadow-xs"
            >
              + Nuevo Trámite (DFI)
            </Link>
          )}
        </div>
      </div>

      {/* Alertas de Éxito / Error de Despacho */}
      {batchSuccessMessage && (
        <div className="p-4 bg-emerald-50 border border-emerald-300 text-emerald-800 text-xs rounded-xl flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            <span className="font-semibold">{batchSuccessMessage}</span>
          </div>
          <button
            onClick={() => setBatchSuccessMessage(null)}
            className="text-emerald-700 hover:text-emerald-900 font-bold px-2"
          >
            ✕
          </button>
        </div>
      )}

      {batchErrorMessage && (
        <div className="p-4 bg-rose-50 border border-rose-300 text-rose-800 text-xs rounded-xl flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
            <span className="font-semibold">{batchErrorMessage}</span>
          </div>
          <button
            onClick={() => setBatchErrorMessage(null)}
            className="text-rose-700 hover:text-rose-900 font-bold px-2"
          >
            ✕
          </button>
        </div>
      )}

      {/* Barra de Despacho por Lote (Sticky si hay seleccionados) */}
      {selectedIds.length > 0 && (
        <div className="p-4 bg-blue-900 text-white rounded-xl shadow-md flex flex-col sm:flex-row items-center justify-between gap-3 animate-in fade-in duration-200">
          <div className="flex items-center gap-3">
            <span className="px-2.5 py-1 bg-blue-700 rounded-md text-xs font-mono font-bold">
              {selectedIds.length} seleccionado(s)
            </span>
            <span className="text-xs font-medium">
              Trámites en estado <strong>INGRESADO</strong> listos para entregar a Control Previo (Presupuesto).
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setSelectedIds([])}
              className="px-3 py-1.5 text-xs text-blue-200 hover:text-white transition-colors"
            >
              Deseleccionar
            </button>
            <button
              onClick={handleEntregarControlPrevioLote}
              disabled={deliveringBatch}
              className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold rounded-lg transition-all shadow-sm flex items-center gap-2"
            >
              <FileSpreadsheet className="w-4 h-4" />
              {deliveringBatch
                ? "Generando Acta y Despachando..."
                : "Entregar a Control Previo y Descargar Acta Excel"}
            </button>
          </div>
        </div>
      )}

      {/* Tabs & Search */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex flex-wrap p-1 bg-slate-200/80 rounded-lg border border-slate-300 text-xs font-medium self-start gap-1">
          <button
            onClick={() => {
              setActiveTab("escritorio");
              setSelectedIds([]);
            }}
            className={`px-3.5 py-1.5 rounded-md transition-all ${
              activeTab === "escritorio"
                ? "bg-white text-slate-900 shadow-xs font-semibold"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            En Mi Gestión
          </button>

          {isDFIOrAdmin && (
            <button
              onClick={() => {
                setActiveTab("ingresados");
                setSelectedIds([]);
              }}
              className={`px-3.5 py-1.5 rounded-md transition-all ${
                activeTab === "ingresados"
                  ? "bg-white text-slate-900 shadow-xs font-semibold"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Por Entregar (Ingresados)
            </button>
          )}

          <button
            onClick={() => {
              setActiveTab("caja");
              setSelectedIds([]);
            }}
            className={`px-3.5 py-1.5 rounded-md transition-all ${
              activeTab === "caja"
                ? "bg-white text-slate-900 shadow-xs font-semibold"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            En Caja
          </button>
          <button
            onClick={() => {
              setActiveTab("observados");
              setSelectedIds([]);
            }}
            className={`px-3.5 py-1.5 rounded-md transition-all ${
              activeTab === "observados"
                ? "bg-white text-slate-900 shadow-xs font-semibold"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Observados
          </button>
        </div>

        {/* Search */}
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por código, Quipux, RUC..."
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-xs"
          />
        </div>
      </div>

      {/* Responsive Table Container */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-x-auto shadow-xs">
        {loading ? (
          <div className="p-12 text-center text-xs text-slate-500 flex flex-col items-center gap-2">
            <RefreshCw className="w-5 h-5 animate-spin text-blue-600" />
            <span className="uppercase font-semibold">Cargando expedientes institucionales...</span>
          </div>
        ) : tramites.length === 0 ? (
          <div className="p-12 text-center text-xs text-slate-500 uppercase font-semibold">
            No hay trámites pendientes en esta pestaña de trabajo.
          </div>
        ) : (
          <table className="min-w-[1000px] w-full border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                {/* Columna de Checkbox para despacho por lote (Solo DFI / Admin) */}
                {isDFIOrAdmin && (
                  <th className="py-3 px-3 text-center w-12 min-w-[48px]">
                    {tramitesIngresadosEnVista.length > 0 && (
                      <button
                        type="button"
                        onClick={toggleSelectAllIngresados}
                        className="p-1 hover:bg-slate-200 rounded transition-colors"
                        title={allIngresadosSelected ? "Deseleccionar todos" : "Seleccionar todos los Ingresados"}
                      >
                        {allIngresadosSelected ? (
                          <CheckSquare className="w-4 h-4 text-blue-600" />
                        ) : (
                          <Square className="w-4 h-4 text-slate-400" />
                        )}
                      </button>
                    )}
                  </th>
                )}
                <th className="py-3 px-4 text-center w-40 min-w-[150px]">CÓDIGO / QUIPUX</th>
                <th className="py-3 px-4 text-left w-52 min-w-[190px]">GESTIÓN</th>
                <th className="py-3 px-4 text-left w-64 min-w-[210px]">BENEFICIARIO / RUC</th>
                <th className="py-3 px-4 text-left w-56 min-w-[190px]">TIPO DE PROCESO</th>
                <th className="py-3 px-4 text-center w-32 min-w-[120px]">SUBTOTAL / NETO</th>
                <th className="py-3 px-3 text-center w-28 min-w-[100px]">TIEMPO SLA</th>
                <th className="py-3 px-4 text-center w-48 min-w-[160px]">ESTADO</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {tramites.map((t) => {
                const isIngresado = t.estado_general === "INGRESADO";
                const isSelected = selectedIds.includes(t.id_tramite);

                return (
                  <tr
                    key={t.id_tramite}
                    onDoubleClick={() => router.push(`/tramite/${t.id_tramite}`)}
                    onClick={() => {
                      if (isDFIOrAdmin && isIngresado) toggleSelectOne(t.id_tramite);
                    }}
                    title="Doble clic para revisar el trámite"
                    className={`transition-colors cursor-pointer select-none group ${
                      isSelected
                        ? "bg-blue-50/90 font-medium"
                        : "hover:bg-slate-50/80"
                    }`}
                  >
                    {/* Checkbox de selección (Solo DFI / Admin) */}
                    {isDFIOrAdmin && (
                      <td
                        className="py-3.5 px-3 text-center align-middle"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (isIngresado) toggleSelectOne(t.id_tramite);
                        }}
                      >
                        {isIngresado ? (
                          <button
                            type="button"
                            className="p-1 hover:bg-blue-100 rounded transition-colors"
                          >
                            {isSelected ? (
                              <CheckSquare className="w-4 h-4 text-blue-600" />
                            ) : (
                              <Square className="w-4 h-4 text-slate-400" />
                            )}
                          </button>
                        ) : (
                          <span className="text-[10px] text-slate-300">—</span>
                        )}
                      </td>
                    )}

                    {/* Código / Quipux */}
                    <td className="py-3.5 px-4 align-middle text-center whitespace-nowrap">
                      <div className="font-mono font-bold text-slate-900 group-hover:text-blue-700 transition-colors">
                        {t.codigo_tramite}
                      </div>
                      <div className="text-[11px] font-mono text-blue-700 truncate" title={t.numero_quipux}>
                        {t.numero_quipux}
                      </div>
                    </td>

                    {/* Gestión */}
                    <td className="py-3.5 px-4 align-middle">
                      <div className="flex flex-col gap-0.5">
                        <span className="text-[10px] uppercase font-bold text-slate-500">
                          {t.padre_gestion || t.tipo_flujo || "PAGO"}
                        </span>
                        <span className="font-semibold text-slate-800 text-[11px] truncate">
                          {t.tipo_gestion || "PAGO"}
                        </span>
                      </div>
                    </td>

                    {/* Beneficiario / RUC */}
                    <td className="py-3.5 px-4 align-middle">
                      <div
                        className="font-semibold text-slate-800 uppercase line-clamp-2 leading-tight"
                        title={t.proveedor_beneficiario}
                      >
                        {t.proveedor_beneficiario || "N/A"}
                      </div>
                      <div className="text-[11px] font-mono text-slate-500 mt-0.5">
                        RUC: {t.ruc_proveedor || "SIN RUC"}
                      </div>
                    </td>

                    {/* Tipo de Proceso */}
                    <td className="py-3.5 px-4 align-middle">
                      <div
                        className="text-slate-800 uppercase line-clamp-2 leading-snug text-[11px] font-semibold"
                        title={t.tipos_tramite?.nombre || "CONTRATACIÓN"}
                      >
                        {t.tipos_tramite?.nombre || "CONTRATACIÓN"}
                      </div>
                      {t.area_requirente && (
                        <div className="mt-1 flex items-center gap-1 text-[10px] text-blue-700 font-medium truncate" title={`Área Requirente: ${t.area_requirente}`}>
                          <span className="px-1.5 py-0.5 rounded bg-blue-50 border border-blue-200 text-[9px] uppercase font-bold tracking-tight">
                            {t.area_requirente}
                          </span>
                        </div>
                      )}
                      {t.asunto && (
                        <p className="text-[10px] text-slate-500 line-clamp-1 italic mt-0.5" title={t.asunto}>
                          {t.asunto}
                        </p>
                      )}
                    </td>

                    {/* Subtotal / Monto Total */}
                    <td className="py-3.5 px-4 align-middle text-center whitespace-nowrap">
                      <div className="font-mono font-bold text-slate-900 text-xs">
                        {formatCurrency(t.subtotal || t.monto_total || 0)}
                      </div>
                    </td>

                    {/* Semáforo SLA */}
                    <td className="py-3.5 px-3 align-middle text-center whitespace-nowrap">
                      <SemaforoSLA sla={t.sla} />
                    </td>

                    {/* Estado Oficial & Indicador de Caja */}
                    <td className="py-3.5 px-4 align-middle text-center whitespace-nowrap">
                      <div className="flex flex-col items-center gap-1">
                        <BadgeEstado estado={t.estado_general} subEstado={t.sub_estado} />
                        {(t.caja?.codigo_caja || t.codigo_tomo_caja) && (
                          <span
                            className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-cyan-50 text-cyan-800 border border-cyan-200"
                            title={`Almacenado en: ${t.caja?.codigo_caja || t.codigo_tomo_caja}`}
                          >
                            <Package className="w-3 h-3 text-cyan-600" />
                            <span>{t.caja?.codigo_caja || t.codigo_tomo_caja}</span>
                          </span>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
