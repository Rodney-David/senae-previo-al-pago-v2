"use client";

import React, { useEffect, useState, useCallback, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CajaDTO, TramiteCompletoDTO, UsuarioInstitucional } from "@/types";
import { formatCurrency } from "@/lib/utils";
import { BadgeEstado } from "@/components/ui/BadgeEstado";
import {
  Package,
  Plus,
  RefreshCw,
  FileSpreadsheet,
  Printer,
  Archive,
  Trash2,
  X,
  CheckCircle2,
  AlertCircle,
  ChevronRight,
  FolderOpen,
  Search,
  CheckSquare,
  Square,
  ArrowLeft,
} from "lucide-react";

export default function CajasPage() {
  const router = useRouter();
  const [cajas, setCajas] = useState<CajaDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [tabEstado, setTabEstado] = useState<"TODAS" | "ABIERTA" | "ARCHIVADA">("TODAS");
  const [selectedCaja, setSelectedCaja] = useState<CajaDTO | null>(null);
  const [loadingCajaDetail, setLoadingCajaDetail] = useState(false);
  const [currentUser, setCurrentUser] = useState<UsuarioInstitucional | null>(null);

  // Modales
  const [modalNuevaCajaOpen, setModalNuevaCajaOpen] = useState(false);
  const [nombreNuevaCaja, setNombreNuevaCaja] = useState("");
  const [obsNuevaCaja, setObsNuevaCaja] = useState("");
  const [creandoCaja, setCreandoCaja] = useState(false);

  // Modal para agregar trámites pagados a la caja
  const [modalAgregarTramitesOpen, setModalAgregarTramitesOpen] = useState(false);
  const [tramitesPagadosDisponibles, setTramitesPagadosDisponibles] = useState<TramiteCompletoDTO[]>([]);
  const [loadingDisponibles, setLoadingDisponibles] = useState(false);
  const [selectedTramitesIds, setSelectedTramitesIds] = useState<number[]>([]);
  const [guardandoAsignacion, setGuardandoAsignacion] = useState(false);
  const [searchDisponibles, setSearchDisponibles] = useState("");

  // Modal vista previa de impresión oficial
  const [modalImprimirOpen, setModalImprimirOpen] = useState(false);

  // Mensajes de éxito / error
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Cargar sesión
  useEffect(() => {
    async function loadUser() {
      try {
        const res = await fetch("/api/auth/session");
        const data = await res.json();
        if (data.user) setCurrentUser(data.user);
      } catch (err) {
        console.error("Error al cargar sesión:", err);
      }
    }
    loadUser();
  }, []);

  // Cargar lista de cajas
  const fetchCajas = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/cajas?estado=${tabEstado}`);
      const data = await res.json();
      if (data.cajas) {
        setCajas(data.cajas);
        // Si hay una caja seleccionada, actualizarla
        if (selectedCaja) {
          const updated = data.cajas.find((c: CajaDTO) => c.id_caja === selectedCaja.id_caja);
          if (updated) {
            fetchCajaDetail(updated.id_caja);
          }
        }
      }
    } catch (err) {
      console.error("Error al cargar cajas:", err);
    } finally {
      setLoading(false);
    }
  }, [tabEstado, selectedCaja?.id_caja]);

  const fetchCajaDetail = async (idCaja: number) => {
    setLoadingCajaDetail(true);
    try {
      const res = await fetch(`/api/cajas/${idCaja}`);
      const data = await res.json();
      if (data.caja) {
        setSelectedCaja(data.caja);
      }
    } catch (err) {
      console.error("Error al cargar detalle de caja:", err);
    } finally {
      setLoadingCajaDetail(false);
    }
  };

  useEffect(() => {
    fetchCajas();
  }, [tabEstado]);

  // Cargar trámites pagados disponibles (sin caja)
  const fetchTramitesPagadosDisponibles = async () => {
    setLoadingDisponibles(true);
    setSelectedTramitesIds([]);
    try {
      const res = await fetch("/api/cajas?disponibles=true");
      const data = await res.json();
      if (data.tramites) {
        setTramitesPagadosDisponibles(data.tramites);
      }
    } catch (err) {
      console.error("Error al cargar trámites pagados:", err);
    } finally {
      setLoadingDisponibles(false);
    }
  };

  // Crear nueva caja
  const handleCrearCaja = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nombreNuevaCaja.trim()) return;

    setCreandoCaja(true);
    setErrorMsg(null);
    try {
      const res = await fetch("/api/cajas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          codigo_caja: nombreNuevaCaja.trim(),
          observaciones: obsNuevaCaja.trim() || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Error al crear la caja");

      setSuccessMsg(`Caja "${nombreNuevaCaja.trim()}" creada exitosamente.`);
      setModalNuevaCajaOpen(false);
      setNombreNuevaCaja("");
      setObsNuevaCaja("");
      fetchCajas();
      if (data.caja) {
        fetchCajaDetail(data.caja.id_caja);
      }
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setCreandoCaja(false);
    }
  };

  // Asignar trámites seleccionados a la caja actual
  const handleAsignarTramitesACaja = async () => {
    if (!selectedCaja || selectedTramitesIds.length === 0) return;

    setGuardandoAsignacion(true);
    setErrorMsg(null);
    try {
      const res = await fetch(`/api/cajas/${selectedCaja.id_caja}/tramites`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          accion: "ASIGNAR",
          ids_tramites: selectedTramitesIds,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Error al asignar trámites");

      setSuccessMsg(`¡Éxito! ${selectedTramitesIds.length} trámite(s) almacenados en la caja "${selectedCaja.codigo_caja}".`);
      setModalAgregarTramitesOpen(false);
      setSelectedTramitesIds([]);
      fetchCajas();
      fetchCajaDetail(selectedCaja.id_caja);
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setGuardandoAsignacion(false);
    }
  };

  // Remover trámite de la caja
  const handleRemoverTramiteDeCaja = async (idTramite: number) => {
    if (!selectedCaja) return;
    if (!confirm("¿Desea retirar este trámite de la caja física? Volverá al estado PAGADO sin caja.")) {
      return;
    }

    try {
      const res = await fetch(`/api/cajas/${selectedCaja.id_caja}/tramites`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          accion: "REMOVER",
          id_tramite: idTramite,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Error al remover trámite");

      setSuccessMsg("Trámite retirado de la caja física.");
      fetchCajas();
      fetchCajaDetail(selectedCaja.id_caja);
    } catch (err: any) {
      setErrorMsg(err.message);
    }
  };

  // Cerrar y archivar caja definitivamente
  const handleArchivarCaja = async (caja: CajaDTO) => {
    const totalTr = caja.tramites?.length || caja.total_tramites || 0;
    if (totalTr === 0) {
      alert("No se puede archivar una caja vacía. Asigne al menos un trámite pagado.");
      return;
    }

    const conf = confirm(
      `¿Está seguro de cerrar y archivar la caja "${caja.codigo_caja}"?\n\n` +
      `Se transferirán ${totalTr} trámite(s) al estado ARCHIVO central definitivamente.`
    );
    if (!conf) return;

    try {
      const res = await fetch(`/api/cajas/${caja.id_caja}/archivar`, {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Error al archivar la caja");

      setSuccessMsg(data.message || `Caja "${caja.codigo_caja}" archivada exitosamente.`);
      fetchCajas();
      if (selectedCaja?.id_caja === caja.id_caja) {
        fetchCajaDetail(caja.id_caja);
      }
    } catch (err: any) {
      setErrorMsg(err.message);
    }
  };

  // Eliminar caja vacía / abierta
  const handleEliminarCaja = async (caja: CajaDTO) => {
    if (!confirm(`¿Desea eliminar la caja "${caja.codigo_caja}"? Los trámites que contenga regresarán a estado PAGADO libre.`)) {
      return;
    }

    try {
      const res = await fetch(`/api/cajas/${caja.id_caja}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Error al eliminar la caja");

      setSuccessMsg(`Caja "${caja.codigo_caja}" eliminada.`);
      if (selectedCaja?.id_caja === caja.id_caja) {
        setSelectedCaja(null);
      }
      fetchCajas();
    } catch (err: any) {
      setErrorMsg(err.message);
    }
  };

  // Descargar archivo Excel oficial
  const handleDescargarExcel = (idCaja: number, codigoCaja: string) => {
    window.open(`/api/cajas/${idCaja}/exportar`, "_blank");
  };

  // Filtrado de trámites disponibles para agregar
  const tramitesDisponiblesFiltrados = useMemo(() => {
    if (!searchDisponibles.trim()) return tramitesPagadosDisponibles;
    const s = searchDisponibles.toLowerCase().trim();
    return tramitesPagadosDisponibles.filter((t) =>
      t.codigo_tramite.toLowerCase().includes(s) ||
      t.numero_quipux.toLowerCase().includes(s) ||
      t.proveedor_beneficiario.toLowerCase().includes(s) ||
      (t.asunto && t.asunto.toLowerCase().includes(s))
    );
  }, [tramitesPagadosDisponibles, searchDisponibles]);

  const allDisponiblesSelected =
    tramitesDisponiblesFiltrados.length > 0 &&
    tramitesDisponiblesFiltrados.every((t) => selectedTramitesIds.includes(t.id_tramite));

  const toggleSelectAllDisponibles = () => {
    if (allDisponiblesSelected) {
      setSelectedTramitesIds([]);
    } else {
      setSelectedTramitesIds(tramitesDisponiblesFiltrados.map((t) => t.id_tramite));
    }
  };

  const toggleSelectOneDisponible = (id: number) => {
    setSelectedTramitesIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <Package className="w-5 h-5 text-blue-600" />
            <h1 className="text-lg font-bold text-slate-900 tracking-tight">
              Gestión de Cajas Físicas y Archivo
            </h1>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Almacene expedientes en estado <strong>PAGADO</strong> dentro de cajas físicas, exporte el documento de entrega oficial e ingréselos al archivo definitivo.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/escritorio"
            className="px-3 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded-lg transition-colors flex items-center gap-1.5"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Volver a Escritorio
          </Link>
          <button
            onClick={() => fetchCajas()}
            disabled={loading}
            className="p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg border border-slate-200 transition-colors"
            title="Actualizar listado de cajas"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin text-blue-600" : ""}`} />
          </button>
          <button
            onClick={() => setModalNuevaCajaOpen(true)}
            className="px-3.5 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors shadow-xs flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" /> Nueva Caja
          </button>
        </div>
      </div>

      {/* Alertas */}
      {successMsg && (
        <div className="p-4 bg-emerald-50 border border-emerald-300 text-emerald-800 text-xs rounded-xl flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            <span className="font-semibold">{successMsg}</span>
          </div>
          <button onClick={() => setSuccessMsg(null)} className="font-bold text-emerald-700 hover:text-emerald-900 px-2">
            ✕
          </button>
        </div>
      )}

      {errorMsg && (
        <div className="p-4 bg-rose-50 border border-rose-300 text-rose-800 text-xs rounded-xl flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
            <span className="font-semibold">{errorMsg}</span>
          </div>
          <button onClick={() => setErrorMsg(null)} className="font-bold text-rose-700 hover:text-rose-900 px-2">
            ✕
          </button>
        </div>
      )}

      {/* Selector de Pestañas de Cajas */}
      <div className="flex flex-wrap p-1 bg-slate-200/80 rounded-lg border border-slate-300 text-xs font-medium self-start gap-1 w-fit">
        <button
          onClick={() => setTabEstado("TODAS")}
          className={`px-3.5 py-1.5 rounded-md transition-all ${
            tabEstado === "TODAS"
              ? "bg-white text-slate-900 shadow-xs font-semibold"
              : "text-slate-600 hover:text-slate-900"
          }`}
        >
          Todas las Cajas ({cajas.length})
        </button>
        <button
          onClick={() => setTabEstado("ABIERTA")}
          className={`px-3.5 py-1.5 rounded-md transition-all ${
            tabEstado === "ABIERTA"
              ? "bg-white text-slate-900 shadow-xs font-semibold"
              : "text-slate-600 hover:text-slate-900"
          }`}
        >
          En Llenado (Abiertas)
        </button>
        <button
          onClick={() => setTabEstado("ARCHIVADA")}
          className={`px-3.5 py-1.5 rounded-md transition-all ${
            tabEstado === "ARCHIVADA"
              ? "bg-white text-slate-900 shadow-xs font-semibold"
              : "text-slate-600 hover:text-slate-900"
          }`}
        >
          Archivadas (Cerradas)
        </button>
      </div>

      {/* Grid de Cajas */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {loading ? (
          <div className="col-span-full p-12 text-center text-xs text-slate-500 flex flex-col items-center gap-2">
            <RefreshCw className="w-5 h-5 animate-spin text-blue-600" />
            <span>Cargando cajas registradas...</span>
          </div>
        ) : cajas.length === 0 ? (
          <div className="col-span-full p-12 bg-white rounded-xl border border-slate-200 text-center text-xs text-slate-500 uppercase font-semibold">
            No hay cajas registradas en esta categoría. Haga clic en &quot;+ Nueva Caja&quot; para crear una.
          </div>
        ) : (
          cajas.map((c) => {
            const isSelected = selectedCaja?.id_caja === c.id_caja;
            const isAbierta = c.estado === "ABIERTA";

            return (
              <div
                key={c.id_caja}
                className={`bg-white rounded-xl border transition-all p-5 shadow-xs flex flex-col justify-between gap-4 ${
                  isSelected
                    ? "border-blue-500 ring-2 ring-blue-500/20"
                    : "border-slate-200 hover:border-slate-300"
                }`}
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2">
                      <div className={`p-2 rounded-lg ${isAbierta ? "bg-cyan-50 text-cyan-700" : "bg-slate-100 text-slate-600"}`}>
                        <Package className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="font-bold text-slate-900 text-sm tracking-tight uppercase">
                          {c.codigo_caja}
                        </h3>
                        {c.nombre && (
                          <p className="text-[11px] text-slate-500">{c.nombre}</p>
                        )}
                      </div>
                    </div>
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border ${
                        isAbierta
                          ? "bg-cyan-50 text-cyan-800 border-cyan-200"
                          : "bg-slate-100 text-slate-700 border-slate-300"
                      }`}
                    >
                      {isAbierta ? "En Llenado" : "Archivada"}
                    </span>
                  </div>

                  {/* Métricas de la Caja */}
                  <div className="grid grid-cols-3 gap-2 py-3 border-y border-slate-100 text-center my-2 bg-slate-50/50 rounded-lg">
                    <div>
                      <span className="text-[10px] text-slate-500 uppercase font-medium block">Expedientes</span>
                      <span className="text-xs font-bold text-slate-800 font-mono">
                        {c.total_tramites || c.tramites?.length || 0}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-500 uppercase font-medium block">Total Hojas</span>
                      <span className="text-xs font-bold text-slate-800 font-mono">
                        {c.total_hojas || 0}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-500 uppercase font-medium block">Valor Total</span>
                      <span className="text-xs font-bold text-emerald-700 font-mono">
                        {formatCurrency(c.total_monto || 0)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Acciones de la Caja */}
                <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100">
                  <button
                    onClick={() => {
                      if (selectedCaja?.id_caja === c.id_caja) {
                        setSelectedCaja(null);
                      } else {
                        fetchCajaDetail(c.id_caja);
                      }
                    }}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase transition-colors flex items-center gap-1 ${
                      isSelected
                        ? "bg-blue-600 text-white"
                        : "bg-slate-100 hover:bg-slate-200 text-slate-800"
                    }`}
                  >
                    <FolderOpen className="w-3.5 h-3.5" />
                    {isSelected ? "Ocultar Trámites" : "Ver Trámites"}
                  </button>

                  <div className="flex items-center gap-1">
                    {/* Botón Imprimir / Exportar Documento */}
                    <button
                      onClick={() => {
                        setSelectedCaja(c);
                        fetchCajaDetail(c.id_caja);
                        setModalImprimirOpen(true);
                      }}
                      className="p-1.5 text-slate-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors border border-slate-200"
                      title="Imprimir / Exportar Documento Oficial"
                    >
                      <Printer className="w-4 h-4" />
                    </button>

                    <button
                      onClick={() => handleDescargarExcel(c.id_caja, c.codigo_caja)}
                      className="p-1.5 text-slate-600 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition-colors border border-slate-200"
                      title="Descargar Excel Oficial (.xlsx)"
                    >
                      <FileSpreadsheet className="w-4 h-4" />
                    </button>

                    {/* Botón Cerrar y Archivar Caja */}
                    {isAbierta && (
                      <button
                        onClick={() => handleArchivarCaja(c)}
                        className="p-1.5 text-slate-600 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition-colors border border-slate-200"
                        title="Cerrar y enviar al Archivo Central"
                      >
                        <Archive className="w-4 h-4" />
                      </button>
                    )}

                    {/* Botón Eliminar si está abierta */}
                    {isAbierta && (
                      <button
                        onClick={() => handleEliminarCaja(c)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                        title="Eliminar caja abierta"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Detalle y Trámites de la Caja Seleccionada */}
      {selectedCaja && (
        <div className="bg-white rounded-xl border border-blue-200 shadow-md p-6 space-y-4 animate-in fade-in duration-200">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded text-xs font-bold font-mono uppercase bg-blue-100 text-blue-800 border border-blue-300">
                  {selectedCaja.codigo_caja}
                </span>
                <h2 className="text-base font-bold text-slate-900 tracking-tight">
                  Expedientes en esta Caja ({selectedCaja.tramites?.length || 0})
                </h2>
                <span
                  className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${
                    selectedCaja.estado === "ABIERTA"
                      ? "bg-cyan-50 text-cyan-800 border-cyan-200"
                      : "bg-slate-100 text-slate-700 border-slate-300"
                  }`}
                >
                  {selectedCaja.estado === "ABIERTA" ? "En Llenado" : "Archivada"}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Total de Hojas: <strong>{selectedCaja.total_hojas || 0}</strong> | Monto Acumulado:{" "}
                <strong className="text-emerald-700">{formatCurrency(selectedCaja.total_monto || 0)}</strong>
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {selectedCaja.estado === "ABIERTA" && (
                <button
                  onClick={() => {
                    fetchTramitesPagadosDisponibles();
                    setModalAgregarTramitesOpen(true);
                  }}
                  className="px-3.5 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-colors shadow-2xs flex items-center gap-1.5"
                >
                  <Plus className="w-3.5 h-3.5" /> Almacenar Trámites Pagados
                </button>
              )}

              <button
                onClick={() => setModalImprimirOpen(true)}
                className="px-3 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded-lg transition-colors flex items-center gap-1.5"
              >
                <Printer className="w-3.5 h-3.5" /> Imprimir Documento
              </button>

              <button
                onClick={() => handleDescargarExcel(selectedCaja.id_caja, selectedCaja.codigo_caja)}
                className="px-3 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded-lg transition-colors flex items-center gap-1.5"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" /> Exportar Excel
              </button>

              {selectedCaja.estado === "ABIERTA" && (
                <button
                  onClick={() => handleArchivarCaja(selectedCaja)}
                  className="px-4 py-2 text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors shadow-2xs flex items-center gap-1.5"
                >
                  <Archive className="w-3.5 h-3.5 text-amber-400" /> Cerrar Caja y Archivar
                </button>
              )}
            </div>
          </div>

          {/* Tabla de Trámites dentro de la Caja */}
          {loadingCajaDetail ? (
            <div className="p-8 text-center text-xs text-slate-500 flex flex-col items-center gap-2">
              <RefreshCw className="w-5 h-5 animate-spin text-blue-600" />
              <span>Cargando expedientes de la caja...</span>
            </div>
          ) : !selectedCaja.tramites || selectedCaja.tramites.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-400 uppercase font-semibold">
              Esta caja aún no tiene expedientes almacenados. Haga clic en &quot;Almacenar Trámites Pagados&quot; para agregar expedientes.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                    <th className="py-2.5 px-3">No. Cartón</th>
                    <th className="py-2.5 px-3">CÓDIGO / QUIPUX</th>
                    <th className="py-2.5 px-3 text-center">No. CUR</th>
                    <th className="py-2.5 px-3 text-center">No. Hojas</th>
                    <th className="py-2.5 px-3">Proveedor y Asunto</th>
                    <th className="py-2.5 px-3 text-right">Valor</th>
                    <th className="py-2.5 px-3 text-center">Estado</th>
                    {selectedCaja.estado === "ABIERTA" && (
                      <th className="py-2.5 px-3 text-center w-16">Acciones</th>
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {selectedCaja.tramites.map((t) => {
                    const curDisplay = [
                      t.numero_cur_devengado,
                      t.numero_cur_contable,
                      t.numero_cur_compromiso,
                    ].filter(Boolean).join(", ") || "-";

                    return (
                      <tr
                        key={t.id_tramite}
                        onDoubleClick={() => router.push(`/tramite/${t.id_tramite}`)}
                        className="hover:bg-slate-50/80 transition-colors cursor-pointer"
                        title="Doble clic para ver ficha del trámite"
                      >
                        <td className="py-3 px-3 font-mono font-bold text-slate-800 text-[11px]">
                          {selectedCaja.codigo_caja}
                        </td>
                        <td className="py-3 px-3 whitespace-nowrap">
                          <div className="font-mono font-bold text-slate-900">{t.codigo_tramite}</div>
                          <div className="text-[11px] font-mono text-blue-700">{t.numero_quipux}</div>
                        </td>
                        <td className="py-3 px-3 text-center font-mono font-bold text-slate-700 whitespace-nowrap">
                          {curDisplay}
                        </td>
                        <td className="py-3 px-3 text-center font-mono font-bold text-slate-900">
                          {t.numero_hojas || t.fojas_fisicas || 1}
                        </td>
                        <td className="py-3 px-3">
                          <div className="font-semibold text-slate-800 uppercase line-clamp-1">
                            {t.proveedor_beneficiario}
                          </div>
                          {t.asunto && (
                            <div className="text-[11px] text-slate-500 line-clamp-1 italic">
                              {t.asunto}
                            </div>
                          )}
                        </td>
                        <td className="py-3 px-3 text-right font-mono font-bold text-slate-900 whitespace-nowrap">
                          {formatCurrency(t.monto_total || 0)}
                        </td>
                        <td className="py-3 px-3 text-center whitespace-nowrap">
                          <BadgeEstado estado={t.estado_general} subEstado={t.sub_estado} />
                        </td>
                        {selectedCaja.estado === "ABIERTA" && (
                          <td className="py-3 px-3 text-center">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleRemoverTramiteDeCaja(t.id_tramite);
                              }}
                              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                              title="Retirar de esta caja"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* MODAL: NUEVA CAJA */}
      {modalNuevaCajaOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="px-5 py-4 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Package className="w-4 h-4 text-blue-400" />
                <h3 className="text-xs font-bold uppercase tracking-wider">Crear Nueva Caja Física</h3>
              </div>
              <button
                onClick={() => setModalNuevaCajaOpen(false)}
                className="text-slate-400 hover:text-white transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCrearCaja} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Nombre o Código de la Caja *
                </label>
                <input
                  type="text"
                  value={nombreNuevaCaja}
                  onChange={(e) => setNombreNuevaCaja(e.target.value)}
                  placeholder="ej. Caja 1, Cartón 24, CAJA-OCT-2026"
                  required
                  autoFocus
                  className="w-full text-xs bg-white border border-slate-300 rounded-lg p-2.5 font-bold uppercase text-slate-900 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
                <p className="text-[11px] text-slate-500 mt-1">
                  Este nombre se utilizará como título superior en el documento oficial de entrega.
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                  Observaciones / Descripción (Opcional)
                </label>
                <textarea
                  rows={2}
                  value={obsNuevaCaja}
                  onChange={(e) => setObsNuevaCaja(e.target.value)}
                  placeholder="ej. Trámites de obras y consultoría octubre 2026"
                  className="w-full text-xs bg-white border border-slate-300 rounded-lg p-2 text-slate-900 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setModalNuevaCajaOpen(false)}
                  disabled={creandoCaja}
                  className="px-3.5 py-1.5 text-xs font-semibold uppercase text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={creandoCaja || !nombreNuevaCaja.trim()}
                  className="px-4 py-1.5 text-xs font-bold uppercase text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors shadow-xs"
                >
                  {creandoCaja ? "Creando..." : "Crear Caja"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: ALMACENAR TRÁMITES PAGADOS EN LA CAJA */}
      {modalAgregarTramitesOpen && selectedCaja && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 w-full max-w-3xl overflow-hidden flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95 duration-150">
            <div className="px-5 py-4 bg-slate-900 text-white flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <Package className="w-4 h-4 text-emerald-400" />
                <h3 className="text-xs font-bold uppercase tracking-wider">
                  Almacenar Trámites en: {selectedCaja.codigo_caja}
                </h3>
              </div>
              <button
                onClick={() => setModalAgregarTramitesOpen(false)}
                className="text-slate-400 hover:text-white transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
              <div className="text-xs text-slate-600 font-medium">
                Solo expedientes en estado <strong>PAGADO</strong> pueden ser almacenados en una caja.
              </div>
              <div className="relative w-full sm:w-64">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                <input
                  type="text"
                  value={searchDisponibles}
                  onChange={(e) => setSearchDisponibles(e.target.value)}
                  placeholder="Buscar trámite, quipux..."
                  className="w-full pl-8 pr-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="p-4 overflow-y-auto flex-1">
              {loadingDisponibles ? (
                <div className="p-12 text-center text-xs text-slate-500 flex flex-col items-center gap-2">
                  <RefreshCw className="w-5 h-5 animate-spin text-blue-600" />
                  <span>Consultando trámites pagados disponibles...</span>
                </div>
              ) : tramitesDisponiblesFiltrados.length === 0 ? (
                <div className="p-12 text-center text-xs text-slate-400 uppercase font-semibold">
                  No hay trámites pagados pendientes de asignar a caja.
                </div>
              ) : (
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-100 text-[11px] font-bold text-slate-700 uppercase">
                      <th className="py-2 px-3 text-center w-12">
                        <button
                          type="button"
                          onClick={toggleSelectAllDisponibles}
                          className="p-1 hover:bg-slate-200 rounded"
                          title={allDisponiblesSelected ? "Deseleccionar todos" : "Seleccionar todos"}
                        >
                          {allDisponiblesSelected ? (
                            <CheckSquare className="w-4 h-4 text-blue-600" />
                          ) : (
                            <Square className="w-4 h-4 text-slate-400" />
                          )}
                        </button>
                      </th>
                      <th className="py-2 px-3">Código / Quipux</th>
                      <th className="py-2 px-3">Proveedor y Asunto</th>
                      <th className="py-2 px-3 text-center">No. Hojas</th>
                      <th className="py-2 px-3 text-right">Valor</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {tramitesDisponiblesFiltrados.map((t) => {
                      const isSelected = selectedTramitesIds.includes(t.id_tramite);

                      return (
                        <tr
                          key={t.id_tramite}
                          onClick={() => toggleSelectOneDisponible(t.id_tramite)}
                          className={`cursor-pointer transition-colors ${
                            isSelected ? "bg-blue-50/80 font-medium" : "hover:bg-slate-50"
                          }`}
                        >
                          <td className="py-2.5 px-3 text-center" onClick={(e) => e.stopPropagation()}>
                            <button
                              type="button"
                              onClick={() => toggleSelectOneDisponible(t.id_tramite)}
                              className="p-1"
                            >
                              {isSelected ? (
                                <CheckSquare className="w-4 h-4 text-blue-600" />
                              ) : (
                                <Square className="w-4 h-4 text-slate-400" />
                              )}
                            </button>
                          </td>
                          <td className="py-2.5 px-3 whitespace-nowrap">
                            <div className="font-mono font-bold text-slate-900">{t.codigo_tramite}</div>
                            <div className="text-[11px] font-mono text-blue-700">{t.numero_quipux}</div>
                          </td>
                          <td className="py-2.5 px-3">
                            <div className="font-semibold text-slate-800 uppercase line-clamp-1">
                              {t.proveedor_beneficiario}
                            </div>
                            {t.asunto && (
                              <div className="text-[11px] text-slate-500 line-clamp-1 italic">
                                {t.asunto}
                              </div>
                            )}
                          </td>
                          <td className="py-2.5 px-3 text-center font-mono font-bold text-slate-800">
                            {t.numero_hojas || t.fojas_fisicas || 1}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900 whitespace-nowrap">
                            {formatCurrency(t.monto_total || 0)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between shrink-0">
              <span className="text-xs font-semibold text-slate-700">
                {selectedTramitesIds.length} trámite(s) seleccionado(s)
              </span>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setModalAgregarTramitesOpen(false)}
                  disabled={guardandoAsignacion}
                  className="px-3.5 py-1.5 text-xs font-semibold uppercase text-slate-700 bg-white border border-slate-300 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleAsignarTramitesACaja}
                  disabled={guardandoAsignacion || selectedTramitesIds.length === 0}
                  className="px-4 py-1.5 text-xs font-bold uppercase text-white bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 rounded-lg transition-colors shadow-xs"
                >
                  {guardandoAsignacion ? "Guardando..." : "Almacenar en Caja"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: VISTA PREVIA Y FORMATO DE IMPRESIÓN OFICIAL DEL DOCUMENTO */}
      {modalImprimirOpen && selectedCaja && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-4xl my-8 overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-150">
            {/* Header del modal */}
            <div className="px-5 py-3.5 bg-slate-900 text-white flex items-center justify-between print:hidden">
              <div className="flex items-center gap-2">
                <Printer className="w-4 h-4 text-blue-400" />
                <h3 className="text-xs font-bold uppercase tracking-wider">
                  Documento Oficial de Entrega a Archivo
                </h3>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => window.print()}
                  className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-md flex items-center gap-1 transition-colors"
                >
                  <Printer className="w-3.5 h-3.5" /> Imprimir Documento
                </button>
                <button
                  onClick={() => handleDescargarExcel(selectedCaja.id_caja, selectedCaja.codigo_caja)}
                  className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-md flex items-center gap-1 transition-colors"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5" /> Descargar Excel
                </button>
                <button
                  onClick={() => setModalImprimirOpen(false)}
                  className="text-slate-400 hover:text-white transition-colors p-1"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Hoja Documento Oficial (Para Impresión) */}
            <div className="p-8 bg-white text-slate-900 print:p-0 space-y-4">
              {/* Título Superior */}
              <div className="border border-slate-900 bg-slate-900 text-white py-3 px-4 text-center">
                <h2 className="text-sm font-bold uppercase tracking-wide">
                  {selectedCaja.codigo_caja.toUpperCase()} - CONTROL Y ENTREGA DE EXPEDIENTES
                </h2>
                <p className="text-[10px] text-slate-300 uppercase tracking-widest mt-0.5">
                  SERVICIO NACIONAL DE ADUANA DEL ECUADOR - ADMINISTRACIÓN DE CAJA
                </p>
              </div>

              {/* Tabla Oficial de 7 Columnas */}
              <div className="overflow-x-auto border border-slate-300">
                <table className="w-full text-[11px] border-collapse border border-slate-300">
                  <thead>
                    <tr className="bg-slate-100 text-slate-900 font-bold uppercase border-b border-slate-300">
                      <th className="border border-slate-300 py-2 px-2 text-center w-24">No. Cartón</th>
                      <th className="border border-slate-300 py-2 px-2 text-center w-28">No. CUR</th>
                      <th className="border border-slate-300 py-2 px-2 text-center w-20">No. Hojas</th>
                      <th className="border border-slate-300 py-2 px-3 text-left">Proveedor y Asunto</th>
                      <th className="border border-slate-300 py-2 px-2 text-right w-24">Valor</th>
                      <th className="border border-slate-300 py-2 px-2 text-center w-36">Fecha y Observaciones</th>
                      <th className="border border-slate-300 py-2 px-2 text-center w-32">Fecha envió de correos</th>
                    </tr>
                  </thead>
                  <tbody>
                    {!selectedCaja.tramites || selectedCaja.tramites.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="border border-slate-300 py-6 text-center text-slate-400 italic">
                          No hay expedientes almacenados en esta caja.
                        </td>
                      </tr>
                    ) : (
                      selectedCaja.tramites.map((t) => {
                        const curDisplay = [
                          t.numero_cur_devengado,
                          t.numero_cur_contable,
                          t.numero_cur_compromiso,
                        ].filter(Boolean).join(", ") || "-";

                        return (
                          <tr key={t.id_tramite} className="border-b border-slate-200">
                            <td className="border border-slate-300 py-2 px-2 text-center font-bold font-mono">
                              {selectedCaja.codigo_caja}
                            </td>
                            <td className="border border-slate-300 py-2 px-2 text-center font-bold font-mono">
                              {curDisplay}
                            </td>
                            <td className="border border-slate-300 py-2 px-2 text-center font-mono font-bold">
                              {t.numero_hojas || t.fojas_fisicas || 1}
                            </td>
                            <td className="border border-slate-300 py-2 px-3 text-left">
                              <span className="font-bold uppercase">{t.proveedor_beneficiario}</span>
                              {t.asunto && <span className="text-slate-600"> - {t.asunto}</span>}
                            </td>
                            <td className="border border-slate-300 py-2 px-2 text-right font-mono font-bold">
                              {formatCurrency(t.monto_total || 0)}
                            </td>
                            <td className="border border-slate-300 py-2 px-2 text-center"></td>
                            <td className="border border-slate-300 py-2 px-2 text-center"></td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                  <tfoot>
                    <tr className="bg-slate-100 font-bold uppercase border-t-2 border-slate-400">
                      <td className="border border-slate-300 py-2 px-2 text-center">
                        TOTAL: {selectedCaja.tramites?.length || 0}
                      </td>
                      <td className="border border-slate-300 py-2 px-2"></td>
                      <td className="border border-slate-300 py-2 px-2 text-center font-mono">
                        {selectedCaja.total_hojas || 0}
                      </td>
                      <td className="border border-slate-300 py-2 px-3 text-right">TOTAL GENERAL:</td>
                      <td className="border border-slate-300 py-2 px-2 text-right font-mono text-emerald-800">
                        {formatCurrency(selectedCaja.total_monto || 0)}
                      </td>
                      <td className="border border-slate-300 py-2 px-2"></td>
                      <td className="border border-slate-300 py-2 px-2"></td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              {/* Firmas de Entrega y Recepción */}
              <div className="grid grid-cols-2 gap-12 pt-12 mt-6">
                <div className="text-center">
                  <div className="border-t border-slate-400 w-48 mx-auto pt-1 font-bold text-xs uppercase">
                    ENTREGADO POR
                  </div>
                  <div className="text-[10px] text-slate-500 uppercase">Administración de Caja (DFI)</div>
                </div>

                <div className="text-center">
                  <div className="border-t border-slate-400 w-48 mx-auto pt-1 font-bold text-xs uppercase">
                    RECIBIDO POR
                  </div>
                  <div className="text-[10px] text-slate-500 uppercase">Archivo Central Contable</div>
                </div>
              </div>
            </div>

            {/* Footer modal */}
            <div className="px-5 py-3 bg-slate-100 border-t border-slate-200 flex items-center justify-between print:hidden">
              <span className="text-xs text-slate-500">
                Una vez impreso este documento, proceda a hacer clic en <strong>&quot;Cerrar Caja y Archivar&quot;</strong> para finalizar el ciclo.
              </span>
              <button
                onClick={() => setModalImprimirOpen(false)}
                className="px-3 py-1.5 text-xs font-semibold uppercase text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg transition-colors"
              >
                Cerrar Vista Previa
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
