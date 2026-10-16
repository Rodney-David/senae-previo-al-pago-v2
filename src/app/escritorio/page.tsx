"use client";

import React, { useEffect, useState, useCallback, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { TramiteCompletoDTO, UsuarioInstitucional } from "@/types";
import { formatCurrency, formatDate } from "@/lib/utils";
import { BadgeEstado, SemaforoSLA } from "@/components/ui";
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
  User,
} from "lucide-react";

export default function EscritorioPage() {
  const router = useRouter();
  const [tramites, setTramites] = useState<TramiteCompletoDTO[]>([]);
  const [loading, setLoading] = useState(true);
  type TabType =
    | "escritorio"
    | "reasignados"
    | "aprobacion"
    | "observados"
    | "todos_area"
    | "ingresados"
    | "caja";
  const [activeTab, setActiveTab] = useState<TabType>("escritorio");
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
        if (data.user) {
          setCurrentUser(data.user);
          if (data.user.rol === "ADMIN" || data.user.rol === "ADMINISTRADOR") {
            router.replace("/tramites");
            return;
          }
        }
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

  // Estados para modal de confirmación de entrega
  const [modalConfirmarEntregaOpen, setModalConfirmarEntregaOpen] = useState(false);
  const [downloadingExcel, setDownloadingExcel] = useState(false);

  // MODO 1: Descargar Acta Excel (Solo genera y descarga sin despachar ni alterar estados)
  const handleDescargarActaExcel = async () => {
    if (selectedIds.length === 0) return;
    setDownloadingExcel(true);
    setBatchSuccessMessage(null);
    setBatchErrorMessage(null);

    try {
      const res = await fetch("/api/tramites/entregar-lote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: selectedIds, accion: "EXCEL" }),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || "Error al generar el Acta Excel");
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
        `Acta Excel generada y descargada exitosamente (${selectedIds.length} trámites). Revise el documento antes de confirmar el envío.`
      );
    } catch (err: any) {
      setBatchErrorMessage(err.message || "Error al descargar el Acta Excel");
    } finally {
      setDownloadingExcel(false);
    }
  };

  // MODO 2: Confirmar y realizar entrega definitiva a Control Previo
  const handleConfirmarEntregaLote = async () => {
    if (selectedIds.length === 0) return;
    setDeliveringBatch(true);
    setBatchSuccessMessage(null);
    setBatchErrorMessage(null);

    try {
      const res = await fetch("/api/tramites/entregar-lote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: selectedIds, accion: "ENTREGAR" }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Error al entregar los trámites a Control Previo");
      }

      setBatchSuccessMessage(
        `¡Entrega completada! ${selectedIds.length} trámite(s) entregados formalmente a Control Previo (Presupuesto).`
      );
      setModalConfirmarEntregaOpen(false);
      setSelectedIds([]);
      fetchTramites();
    } catch (err: any) {
      setBatchErrorMessage(err.message || "Error al entregar los trámites");
    } finally {
      setDeliveringBatch(false);
    }
  };

  const isJefeOrAdmin = useMemo(() => {
    if (!currentUser) return false;
    const rol = (currentUser.rol || "").toUpperCase();
    return (
      rol === "JEFE" ||
      rol === "DIRECTORA" ||
      rol === "DIRECTORA_FINANCIERA" ||
      rol === "ADMIN" ||
      rol === "ADMINISTRADOR"
    );
  }, [currentUser]);

  const isDFIOrAdmin = useMemo(() => {
    if (!currentUser) return false;
    const rol = (currentUser.rol || "").toUpperCase();
    return (
      currentUser.id_area === 1 ||
      ["DIRECTORA", "SECRETARIA", "DIRECTORA_FINANCIERA", "SECRETARIA_DFI"].includes(rol) ||
      ["ADMIN", "ADMINISTRADOR"].includes(rol)
    );
  }, [currentUser]);

  const isPresupuestoOrAdmin = useMemo(() => {
    if (!currentUser) return false;
    const rol = (currentUser.rol || "").toUpperCase();
    return currentUser.id_area === 2 || ["ADMIN", "ADMINISTRADOR"].includes(rol);
  }, [currentUser]);

  const selectedSonDePresupuesto = useMemo(() => {
    const selectedTramites = tramites.filter((t) => selectedIds.includes(t.id_tramite));
    return (
      selectedTramites.length > 0 &&
      selectedTramites.every((t) => t.id_area_actual === 2 && t.estado_general === "INGRESADO")
    );
  }, [tramites, selectedIds]);

  const handleRecibirFisicamenteLote = async () => {
    if (selectedIds.length === 0) return;
    setDeliveringBatch(true);
    setBatchSuccessMessage(null);
    setBatchErrorMessage(null);

    try {
      const res = await fetch("/api/tramites/recibir-lote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: selectedIds }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Error al recibir físicamente los trámites");
      }

      setBatchSuccessMessage(
        `¡Recepción física completada! ${data.recibidos || selectedIds.length} trámite(s) ingresados a Control Previo (Presupuesto) en estado REVISION. Inicia cómputo de SLA.`
      );
      setSelectedIds([]);
      fetchTramites();
    } catch (err: any) {
      setBatchErrorMessage(err.message || "Error al recibir los trámites");
    } finally {
      setDeliveringBatch(false);
    }
  };

  const canManageCajas = useMemo(() => {
    if (!currentUser) return false;
    const rol = (currentUser.rol || "").toUpperCase();
    const cargo = (currentUser.cargo || "").toUpperCase();
    return (
      currentUser.id_area === 4 ||
      currentUser.id_area === 6 ||
      rol === "ADMIN" ||
      rol === "ADMINISTRADOR" ||
      rol.includes("CAJA") ||
      rol.includes("TESOR") ||
      rol.includes("ARCHIVO") ||
      rol.includes("CUSTODIO") ||
      cargo.includes("CAJA") ||
      cargo.includes("ARCHIVO") ||
      cargo.includes("CUSTODIO")
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

      {/* Barra Flotante de Despacho por Lote (Fija al pie de pantalla, sin desplazar el contenido de la tabla) */}
      {selectedIds.length > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 w-[95%] max-w-4xl p-3.5 bg-blue-950/95 backdrop-blur-md text-white rounded-2xl shadow-2xl border border-blue-600/60 flex flex-col sm:flex-row items-center justify-between gap-3 animate-in fade-in slide-in-from-bottom-5 duration-200">
          <div className="flex items-center gap-3">
            <span className="px-2.5 py-1 bg-blue-700 rounded-md text-xs font-mono font-bold">
              {selectedIds.length} seleccionado(s)
            </span>
            <span className="text-xs font-medium text-slate-100">
              {selectedSonDePresupuesto
                ? "Expedientes físicos entregados a Presupuesto listos para confirmar recepción e iniciar SLA institucional."
                : "Trámites en estado INGRESADO listos para entregar a Control Previo (Presupuesto)."}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setSelectedIds([])}
              className="px-3 py-1.5 text-xs text-blue-200 hover:text-white transition-colors"
            >
              Deseleccionar
            </button>
            {selectedSonDePresupuesto && isPresupuestoOrAdmin ? (
              <button
                onClick={handleRecibirFisicamenteLote}
                disabled={deliveringBatch}
                className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold rounded-lg transition-all shadow-md flex items-center gap-2"
                title="Recibir formalmente el lote físico en Presupuesto e iniciar cómputo de SLA"
              >
                <CheckCircle2 className="w-4 h-4" />
                {deliveringBatch ? "Recibiendo..." : `Recibir Físicamente (${selectedIds.length})`}
              </button>
            ) : (
              <>
                <button
                  onClick={handleDescargarActaExcel}
                  disabled={downloadingExcel}
                  className="px-3.5 py-2 bg-blue-800/80 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg border border-blue-400/30 transition-all shadow-xs flex items-center gap-2"
                  title="Generar y revisar el Excel oficial sin enviar los trámites aún"
                >
                  <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
                  {downloadingExcel ? "Generando..." : "Generar Acta Excel"}
                </button>
                <button
                  onClick={() => setModalConfirmarEntregaOpen(true)}
                  disabled={deliveringBatch}
                  className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold rounded-lg transition-all shadow-md flex items-center gap-2"
                  title="Confirmar envío definitivo de los trámites a Control Previo"
                >
                  <Send className="w-4 h-4" />
                  {deliveringBatch ? "Entregando..." : "Entregar a Control Previo"}
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {/* Modal de Confirmación de Entrega Definitiva a Control Previo */}
      {modalConfirmarEntregaOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-lg w-full overflow-hidden p-6 space-y-5">
            <div className="flex items-start gap-3">
              <div className="p-2.5 bg-emerald-100 text-emerald-700 rounded-xl shrink-0">
                <Send className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-bold text-slate-900">
                  Confirmar Entrega a Control Previo
                </h3>
                <p className="text-xs text-slate-500">
                  ¿Está seguro de enviar formalmente estos expedientes a la Jefatura de Control Previo (Presupuesto)?
                </p>
              </div>
            </div>

            <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
              <div className="flex items-center justify-between text-xs font-semibold text-slate-700">
                <span>Trámites seleccionados:</span>
                <span className="font-mono bg-blue-100 text-blue-800 px-2 py-0.5 rounded font-bold">
                  {selectedIds.length} trámite(s)
                </span>
              </div>
              <div className="text-[11px] text-slate-500 max-h-36 overflow-y-auto space-y-1 divide-y divide-slate-100">
                {tramites
                  .filter((t) => selectedIds.includes(t.id_tramite))
                  .map((t) => (
                    <div key={t.id_tramite} className="pt-1 flex items-center justify-between">
                      <span className="font-mono font-medium text-slate-700">
                        {t.numero_quipux}
                      </span>
                      <span className="text-[10px] text-slate-500 truncate max-w-[200px]">
                        {t.proveedor_beneficiario}
                      </span>
                    </div>
                  ))}
              </div>
            </div>

            <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-[11px] text-amber-800 leading-relaxed">
              💡 <strong>Recomendación:</strong> Si aún no ha verificado el listado físico, puede presionar <em>Cancelar</em> y pulsar <em>"Generar Acta Excel"</em> para constatar los números de quipux antes del envío.
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setModalConfirmarEntregaOpen(false)}
                disabled={deliveringBatch}
                className="px-3.5 py-2 text-xs font-medium text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors"
              >
                Cancelar y Revisar
              </button>
              <button
                type="button"
                onClick={handleConfirmarEntregaLote}
                disabled={deliveringBatch}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg transition-all shadow-md flex items-center gap-1.5"
              >
                <CheckCircle2 className="w-4 h-4" />
                {deliveringBatch ? "Procesando Entrega..." : "Confirmar y Enviar Trámites"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Tabs & Search */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex flex-wrap p-1 bg-slate-200/80 rounded-lg border border-slate-300 text-xs font-medium self-start gap-1">
          {/* 1. En Mi Escritorio: únicamente lo que tengo físicamente en mi poder */}
          <button
            onClick={() => {
              setActiveTab("escritorio");
              setSelectedIds([]);
            }}
            className={`px-3 py-1.5 rounded-md transition-all ${
              activeTab === "escritorio"
                ? "bg-white text-blue-900 shadow-xs font-bold"
                : "text-slate-600 hover:text-slate-900"
            }`}
            title="Trámites que están bajo su custodia física directa en este momento"
          >
            En Mi Escritorio
          </button>

          {/* 2. Reasignados / Derivados: trámites en mi misma área en custodia de otros compañeros */}
          <button
            onClick={() => {
              setActiveTab("reasignados");
              setSelectedIds([]);
            }}
            className={`px-3 py-1.5 rounded-md transition-all ${
              activeTab === "reasignados"
                ? "bg-white text-blue-900 shadow-xs font-bold"
                : "text-slate-600 hover:text-slate-900"
            }`}
            title="Trámites de su área reasignados o derivados a otros funcionarios del equipo"
          >
            Reasignados
          </button>

          {/* 3. Todos: la totalidad de trámites activos en el área */}
          <button
            onClick={() => {
              setActiveTab("todos_area");
              setSelectedIds([]);
            }}
            className={`px-3 py-1.5 rounded-md transition-all ${
              activeTab === "todos_area"
                ? "bg-white text-blue-900 shadow-xs font-bold"
                : "text-slate-600 hover:text-slate-900"
            }`}
            title="Totalidad de expedientes activos dentro de su departamento"
          >
            Todos del Área
          </button>

          {/* 4. En Aprobación: SOLO para Jefaturas, Directora y Admin */}
          {isJefeOrAdmin && (
            <button
              onClick={() => {
                setActiveTab("aprobacion");
                setSelectedIds([]);
              }}
              className={`px-3 py-1.5 rounded-md transition-all ${
                activeTab === "aprobacion"
                  ? "bg-white text-blue-900 shadow-xs font-bold"
                  : "text-slate-600 hover:text-slate-900"
              }`}
              title="Expedientes pendientes de visto bueno formal de jefatura"
            >
              En Aprobación
            </button>
          )}

          {/* 5. Observados: trámites con novedad u observación activa en el área */}
          <button
            onClick={() => {
              setActiveTab("observados");
              setSelectedIds([]);
            }}
            className={`px-3 py-1.5 rounded-md transition-all ${
              activeTab === "observados"
                ? "bg-white text-amber-900 shadow-xs font-bold"
                : "text-slate-600 hover:text-slate-900"
            }`}
            title="Trámites observados en seguimiento o subsanación (72h)"
          >
            Observados
          </button>

          {/* 6. Por Entregar: SOLO para Secretaría DFI y Admin */}
          {isDFIOrAdmin && (
            <button
              onClick={() => {
                setActiveTab("ingresados");
                setSelectedIds([]);
              }}
              className={`px-3 py-1.5 rounded-md transition-all ${
                activeTab === "ingresados"
                  ? "bg-white text-blue-900 shadow-xs font-bold"
                  : "text-slate-600 hover:text-slate-900"
              }`}
              title="Expedientes ingresados en ventanilla listos para despachar a Control Previo"
            >
              Por Entregar
            </button>
          )}

          {/* 7. En Caja: SOLO para Tesorería, Adm. Caja, Archivo o Admin */}
          {canManageCajas && (
            <button
              onClick={() => {
                setActiveTab("caja");
                setSelectedIds([]);
              }}
              className={`px-3 py-1.5 rounded-md transition-all ${
                activeTab === "caja"
                  ? "bg-white text-blue-900 shadow-xs font-bold"
                  : "text-slate-600 hover:text-slate-900"
              }`}
              title="Expedientes pagados o en proceso de almacenamiento en cajas"
            >
              En Caja
            </button>
          )}
        </div>

        {/* Search */}
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por Quipux, beneficiario, RUC..."
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
                <th className="py-3 px-4 text-center w-48 min-w-[160px]">NÚMERO QUIPUX</th>
                <th className="py-3 px-4 text-left whitespace-nowrap">GESTIÓN</th>
                <th className="py-3 px-4 text-left w-64 min-w-[210px]">BENEFICIARIO / RUC</th>
                <th className="py-3 px-4 text-left w-56 min-w-[190px]">TIPO DE PROCESO</th>
                <th className="py-3 px-4 text-left w-48 min-w-[160px]">FUNCIONARIO</th>
                <th className="py-3 px-4 text-center w-32 min-w-[120px]">MONTO TOTAL</th>
                <th className="py-3 px-3 text-center w-28 min-w-[100px]">SLA (6D)</th>
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

                    {/* Número Quipux */}
                    <td className="py-3.5 px-4 align-middle text-center whitespace-nowrap">
                      <div className="font-mono font-bold text-blue-700 group-hover:text-blue-900 transition-colors text-xs" title={t.numero_quipux}>
                        {t.numero_quipux}
                      </div>
                    </td>

                    {/* Gestión */}
                    <td className="py-3.5 px-4 align-middle whitespace-nowrap">
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
                    </td>

                    {/* Funcionario (Custodio Actual del Trámite) */}
                    <td className="py-3.5 px-4 align-middle whitespace-nowrap">
                      <div
                        className="font-bold text-slate-800 text-[11px] truncate uppercase flex items-center gap-1.5"
                        title={t.usuarios?.nombre_completo || "Sin Asignar"}
                      >
                        <User className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                        <span className="truncate">{t.usuarios?.nombre_completo || "Sin Asignar"}</span>
                      </div>
                      {t.usuarios?.cargo && (
                        <div className="text-[10px] text-slate-400 font-medium truncate uppercase pl-5">
                          {t.usuarios.cargo}
                        </div>
                      )}
                    </td>

                    {/* Monto Total */}
                    <td className="py-3.5 px-4 align-middle text-center whitespace-nowrap">
                      <div className="font-mono font-bold text-slate-900 text-xs">
                        {formatCurrency(t.monto_total || t.subtotal || 0)}
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
