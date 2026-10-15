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
  FileDown,
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
  Lock,
  Unlock,
  Send,
  RotateCcw,
} from "lucide-react";

import { generarDocumentoCajaPdf } from "@/services/documentoCajaPdfService";

export default function CajasPage() {
  const router = useRouter();
  const [cajas, setCajas] = useState<CajaDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [tabEstado, setTabEstado] = useState<"TODAS" | "ABIERTA" | "CERRADA" | "ENVIADA" | "ARCHIVADA">("TODAS");
  const [selectedCaja, setSelectedCaja] = useState<CajaDTO | null>(null);
  const [loadingCajaDetail, setLoadingCajaDetail] = useState(false);
  const [currentUser, setCurrentUser] = useState<UsuarioInstitucional | null>(null);

  // Modales
  const [modalNuevaCajaOpen, setModalNuevaCajaOpen] = useState(false);
  const [nombreNuevaCaja, setNombreNuevaCaja] = useState("");
  const [obsNuevaCaja, setObsNuevaCaja] = useState("");
  const [creandoCaja, setCreandoCaja] = useState(false);

  // Modal para devolver caja (Custodio de Archivo)
  const [modalDevolverOpen, setModalDevolverOpen] = useState(false);
  const [cajaADevolver, setCajaADevolver] = useState<CajaDTO | null>(null);
  const [motivoDevolucion, setMotivoDevolucion] = useState("");
  const [devolviendoCaja, setDevolviendoCaja] = useState(false);

  // Modal para desarchivar caja (Custodio de Archivo / Admin)
  const [modalDesarchivarCajaOpen, setModalDesarchivarCajaOpen] = useState(false);
  const [cajaADesarchivar, setCajaADesarchivar] = useState<CajaDTO | null>(null);
  const [motivoDesarchivo, setMotivoDesarchivo] = useState("");
  const [desarchivandoCaja, setDesarchivandoCaja] = useState(false);

  // Modal para agregar trámites pagados a la caja
  const [modalAgregarTramitesOpen, setModalAgregarTramitesOpen] = useState(false);
  const [tramitesPagadosDisponibles, setTramitesPagadosDisponibles] = useState<TramiteCompletoDTO[]>([]);
  const [loadingDisponibles, setLoadingDisponibles] = useState(false);
  const [selectedTramitesIds, setSelectedTramitesIds] = useState<number[]>([]);
  const [guardandoAsignacion, setGuardandoAsignacion] = useState(false);
  const [searchDisponibles, setSearchDisponibles] = useState("");

  // Modal vista previa de impresión oficial
  const [modalImprimirOpen, setModalImprimirOpen] = useState(false);

  // Modal para ver y gestionar trámites de la caja seleccionada sin tener que desplazarse
  const [modalVerTramitesOpen, setModalVerTramitesOpen] = useState(false);

  // Mensajes de éxito / error
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Cargar sesión
  useEffect(() => {
    async function loadUser() {
      try {
        const res = await fetch("/api/auth/session");
        const data = await res.json();
        if (data.user) {
          setCurrentUser(data.user);
          const rol = (data.user.rol || "").toUpperCase();
          const cargo = (data.user.cargo || "").toUpperCase();
          const area = data.user.id_area;
          const allowed =
            area === 4 ||
            area === 5 ||
            area === 6 ||
            rol === "ADMIN" ||
            rol === "ADMINISTRADOR" ||
            rol.includes("CAJA") ||
            rol.includes("TESOR") ||
            rol.includes("COBRANZA") ||
            rol.includes("ARCHIVO") ||
            rol.includes("CUSTODIO") ||
            cargo.includes("CAJA") ||
            cargo.includes("COBRANZA") ||
            cargo.includes("TESOR") ||
            cargo.includes("ARCHIVO") ||
            cargo.includes("CUSTODIO");
          if (!allowed) {
            router.replace("/escritorio");
          }
        }
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

  // Permisos según rol
  const userArea = currentUser?.id_area;
  const userRole = (currentUser?.rol || "").toUpperCase();
  const userCargo = (currentUser?.cargo || "").toUpperCase();
  const isAdmin = userRole === "ADMIN" || userRole === "ADMINISTRADOR";
  const isAdmCaja =
    userArea === 4 ||
    userArea === 5 ||
    userRole.includes("TESOR") ||
    userRole.includes("COBRANZA") ||
    userRole.includes("CAJA") ||
    userCargo.includes("COBRANZA") ||
    userCargo.includes("TESOR") ||
    userCargo.includes("CAJA") ||
    isAdmin;
  const isCustodio = userArea === 6 || userRole.includes("ARCHIVO") || userRole.includes("CUSTODIO") || userCargo.includes("ARCHIVO") || userCargo.includes("CUSTODIO") || isAdmin;
  const isCustodioOnly = (userArea === 6 || userRole.includes("ARCHIVO") || userRole.includes("CUSTODIO") || userCargo.includes("ARCHIVO") || userCargo.includes("CUSTODIO")) && !isAdmin && !isAdmCaja;

  // Cerrar caja (Adm. Caja)
  const handleCerrarCaja = async (caja: CajaDTO) => {
    const totalTr = caja.tramites?.length || caja.total_tramites || 0;
    if (totalTr === 0) {
      alert("No se puede cerrar una caja vacía. Asigne al menos un trámite pagado.");
      return;
    }

    const conf = confirm(
      `¿Desea cerrar la caja "${caja.codigo_caja}"?\n\n` +
      `Contiene ${totalTr} expediente(s). Al cerrarla quedará lista para ser enviada formalmente al Archivo Central (o podrá reabrirse para ajustes si lo requiere).`
    );
    if (!conf) return;

    try {
      const res = await fetch(`/api/cajas/${caja.id_caja}/estado`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accion: "CERRAR" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Error al cerrar la caja");

      setSuccessMsg(data.message || `Caja "${caja.codigo_caja}" cerrada exitosamente.`);
      fetchCajas();
      if (selectedCaja?.id_caja === caja.id_caja) {
        fetchCajaDetail(caja.id_caja);
      }
    } catch (err: any) {
      setErrorMsg(err.message);
    }
  };

  // Reabrir caja cerrada para edición (Adm. Caja)
  const handleReabrirCaja = async (caja: CajaDTO) => {
    const conf = confirm(
      `¿Desea reabrir la caja "${caja.codigo_caja}"?\n\n` +
      `Volverá al estado ABIERTA para permitir agregar o retirar expedientes.`
    );
    if (!conf) return;

    try {
      const res = await fetch(`/api/cajas/${caja.id_caja}/estado`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accion: "REABRIR" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Error al reabrir la caja");

      setSuccessMsg(data.message || `Caja "${caja.codigo_caja}" reabierta para edición.`);
      fetchCajas();
      if (selectedCaja?.id_caja === caja.id_caja) {
        fetchCajaDetail(caja.id_caja);
      }
    } catch (err: any) {
      setErrorMsg(err.message);
    }
  };

  // Enviar caja al Archivo Central (Adm. Caja)
  const handleEnviarArchivo = async (caja: CajaDTO) => {
    const totalTr = caja.tramites?.length || caja.total_tramites || 0;
    const conf = confirm(
      `¿Desea enviar formalmente la caja "${caja.codigo_caja}" al Archivo Central?\n\n` +
      `Los ${totalTr} expediente(s) saldrán de Adm. Caja y pasarán a custodia del Custodio de Archivo para su recepción y aprobación final.`
    );
    if (!conf) return;

    try {
      const res = await fetch(`/api/cajas/${caja.id_caja}/estado`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accion: "ENVIAR_ARCHIVO" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Error al enviar la caja al Archivo");

      setSuccessMsg(data.message || `Caja "${caja.codigo_caja}" enviada exitosamente a Custodia de Archivo.`);
      fetchCajas();
      if (selectedCaja?.id_caja === caja.id_caja) {
        fetchCajaDetail(caja.id_caja);
      }
    } catch (err: any) {
      setErrorMsg(err.message);
    }
  };

  // Aprobar y archivar definitivamente la caja (Custodio de Archivo)
  const handleAprobarArchivarCaja = async (caja: CajaDTO) => {
    const totalTr = caja.tramites?.length || caja.total_tramites || 0;
    const conf = confirm(
      `¿Desea aprobar y archivar definitivamente la caja "${caja.codigo_caja}"?\n\n` +
      `Todos los ${totalTr} expediente(s) contenidos cambiarán su estado general a ARCHIVO y quedarán registrados en esta caja permanentemente.`
    );
    if (!conf) return;

    try {
      const res = await fetch(`/api/cajas/${caja.id_caja}/estado`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accion: "APROBAR_ARCHIVAR" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Error al aprobar y archivar la caja");

      setSuccessMsg(data.message || `Caja "${caja.codigo_caja}" archivada definitivamente. Expedientes pasaron a ARCHIVO.`);
      fetchCajas();
      if (selectedCaja?.id_caja === caja.id_caja) {
        fetchCajaDetail(caja.id_caja);
      }
    } catch (err: any) {
      setErrorMsg(err.message);
    }
  };

  // Confirmar desarchivo de caja completa (Custodio de Archivo / Admin)
  const handleConfirmarDesarchivo = async () => {
    if (!cajaADesarchivar || !motivoDesarchivo.trim()) {
      setErrorMsg("La justificación para desarchivar la caja es obligatoria.");
      return;
    }
    setDesarchivandoCaja(true);
    setErrorMsg(null);
    try {
      const res = await fetch(`/api/cajas/${cajaADesarchivar.id_caja}/estado`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          accion: "DESARCHIVAR",
          motivo_desarchivo: motivoDesarchivo.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Error al desarchivar la caja");

      setSuccessMsg(data.message || `Caja "${cajaADesarchivar.codigo_caja}" desarchivada exitosamente.`);
      setModalDesarchivarCajaOpen(false);
      fetchCajas();
      if (selectedCaja?.id_caja === cajaADesarchivar.id_caja) {
        fetchCajaDetail(cajaADesarchivar.id_caja);
      }
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setDesarchivandoCaja(false);
    }
  };

  // Confirmar devolución de caja con motivo (Custodio de Archivo)
  const handleConfirmarDevolucion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cajaADevolver || !motivoDevolucion.trim()) return;

    setDevolviendoCaja(true);
    setErrorMsg(null);
    try {
      const res = await fetch(`/api/cajas/${cajaADevolver.id_caja}/estado`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          accion: "DEVOLVER",
          motivo_devolucion: motivoDevolucion.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Error al devolver la caja");

      setSuccessMsg(data.message || `Caja "${cajaADevolver.codigo_caja}" devuelta a Administración de Caja.`);
      setModalDevolverOpen(false);
      setCajaADevolver(null);
      setMotivoDevolucion("");
      fetchCajas();
      if (selectedCaja?.id_caja === cajaADevolver.id_caja) {
        fetchCajaDetail(cajaADevolver.id_caja);
      }
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setDevolviendoCaja(false);
    }
  };

  // Eliminar caja vacía / abierta (Adm. Caja)
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

  // Descargar archivo PDF oficial según plantilla
  const handleDescargarPdf = () => {
    if (!selectedCaja) return;
    try {
      const doc = generarDocumentoCajaPdf(selectedCaja as any);
      const safeCodigo = (selectedCaja.nombre || selectedCaja.codigo_caja).replace(/[^a-zA-Z0-9_-]/g, "_");
      doc.save(`Documento_Control_Caja_${safeCodigo}.pdf`);
    } catch (err) {
      console.error("Error al generar PDF:", err);
      window.open(`/api/cajas/${selectedCaja.id_caja}/exportar-pdf`, "_blank");
    }
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
          {!isCustodioOnly && (
            <button
              onClick={() => setModalNuevaCajaOpen(true)}
              className="px-3.5 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors shadow-xs flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" /> Nueva Caja
            </button>
          )}
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
          onClick={() => setTabEstado("CERRADA")}
          className={`px-3.5 py-1.5 rounded-md transition-all ${
            tabEstado === "CERRADA"
              ? "bg-white text-slate-900 shadow-xs font-semibold"
              : "text-slate-600 hover:text-slate-900"
          }`}
        >
          Cerradas (Por Enviar)
        </button>
        <button
          onClick={() => setTabEstado("ENVIADA")}
          className={`px-3.5 py-1.5 rounded-md transition-all ${
            tabEstado === "ENVIADA"
              ? "bg-white text-slate-900 shadow-xs font-semibold"
              : "text-slate-600 hover:text-slate-900"
          }`}
        >
          Enviadas (En Custodia)
        </button>
        <button
          onClick={() => setTabEstado("ARCHIVADA")}
          className={`px-3.5 py-1.5 rounded-md transition-all ${
            tabEstado === "ARCHIVADA"
              ? "bg-white text-slate-900 shadow-xs font-semibold"
              : "text-slate-600 hover:text-slate-900"
          }`}
        >
          Archivadas (Definitivas)
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
            No hay cajas registradas en esta categoría.
          </div>
        ) : (
          cajas.map((c) => {
            const isSelected = selectedCaja?.id_caja === c.id_caja;

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
                      <div
                        className={`p-2 rounded-lg ${
                          c.estado === "ABIERTA"
                            ? "bg-cyan-50 text-cyan-700"
                            : c.estado === "CERRADA"
                            ? "bg-amber-50 text-amber-700"
                            : c.estado === "ENVIADA"
                            ? "bg-purple-50 text-purple-700"
                            : "bg-emerald-50 text-emerald-700"
                        }`}
                      >
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
                        c.estado === "ABIERTA"
                          ? "bg-cyan-50 text-cyan-800 border-cyan-200"
                          : c.estado === "CERRADA"
                          ? "bg-amber-50 text-amber-800 border-amber-200"
                          : c.estado === "ENVIADA"
                          ? "bg-purple-50 text-purple-800 border-purple-200"
                          : "bg-emerald-50 text-emerald-800 border-emerald-200"
                      }`}
                    >
                      {c.estado === "ABIERTA"
                        ? "En Llenado"
                        : c.estado === "CERRADA"
                        ? "Cerrada"
                        : c.estado === "ENVIADA"
                        ? "Enviada a Archivo"
                        : "Archivada"}
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
                      setSelectedCaja(c);
                      fetchCajaDetail(c.id_caja);
                      setModalVerTramitesOpen(true);
                    }}
                    className="px-3 py-1.5 rounded-lg text-xs font-bold uppercase transition-colors flex items-center gap-1.5 bg-blue-50 hover:bg-blue-600 hover:text-white text-blue-700 border border-blue-200 shadow-2xs"
                    title="Ver expedientes contenidos en esta caja"
                  >
                    <FolderOpen className="w-3.5 h-3.5" />
                    <span>Ver Trámites</span>
                  </button>

                  <div className="flex items-center gap-1">
                    {/* Botón Imprimir / Exportar Documento (solo Adm. Caja) */}
                    {(isAdmCaja || isAdmin) && (
                      <>
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
                      </>
                    )}

                    {/* Acciones Adm. Caja en caja ABIERTA */}
                    {c.estado === "ABIERTA" && (isAdmCaja || isAdmin) && (
                      <>
                        <button
                          onClick={() => handleCerrarCaja(c)}
                          className="p-1.5 text-slate-600 hover:text-amber-700 hover:bg-amber-50 rounded-lg transition-colors border border-slate-200"
                          title="Cerrar caja (preparar para enviar)"
                        >
                          <Lock className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleEliminarCaja(c)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                          title="Eliminar caja abierta"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </>
                    )}

                    {/* Acciones Adm. Caja en caja CERRADA */}
                    {c.estado === "CERRADA" && (isAdmCaja || isAdmin) && (
                      <>
                        <button
                          onClick={() => handleReabrirCaja(c)}
                          className="p-1.5 text-slate-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors border border-slate-200"
                          title="Reabrir caja para edición"
                        >
                          <Unlock className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleEnviarArchivo(c)}
                          className="p-1.5 text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors shadow-2xs"
                          title="Enviar caja al Archivo Central"
                        >
                          <Send className="w-4 h-4" />
                        </button>
                      </>
                    )}

                    {/* Acciones Custodio en caja ENVIADA */}
                    {c.estado === "ENVIADA" && (isCustodio || isAdmin) && (
                      <>
                        <button
                          onClick={() => {
                            setCajaADevolver(c);
                            setModalDevolverOpen(true);
                          }}
                          className="p-1.5 text-amber-700 hover:bg-amber-50 rounded-lg transition-colors border border-amber-300"
                          title="Devolver / Observar caja hacia Adm. Caja"
                        >
                          <RotateCcw className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleAprobarArchivarCaja(c)}
                          className="p-1.5 text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-colors shadow-2xs"
                          title="Aprobar y Archivar definitivamente"
                        >
                          <Archive className="w-4 h-4" />
                        </button>
                      </>
                    )}

                    {/* Acciones Custodio en caja ARCHIVADA */}
                    {c.estado === "ARCHIVADA" && (isCustodio || isAdmin) && (
                      <button
                        onClick={() => {
                          setCajaADesarchivar(c);
                          setMotivoDesarchivo("");
                          setModalDesarchivarCajaOpen(true);
                        }}
                        className="px-2 py-1 text-xs font-bold text-amber-800 bg-amber-100 hover:bg-amber-200 rounded-lg transition-colors border border-amber-300 flex items-center gap-1 shadow-2xs"
                        title="Desarchivar caja completa con justificación"
                      >
                        <FolderOpen className="w-3.5 h-3.5" /> Desarchivar
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* MODAL EMERGENTE: DETALLE Y TRÁMITES DE LA CAJA SELECCIONADA */}
      {modalVerTramitesOpen && selectedCaja && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 sm:p-6 overflow-y-auto animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-6xl max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-150">
            {/* Header del Modal */}
            <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between gap-4 shrink-0">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-600/30 text-blue-400 rounded-lg">
                  <Package className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-sm text-blue-300 uppercase">
                      {selectedCaja.codigo_caja}
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                        selectedCaja.estado === "ABIERTA"
                          ? "bg-cyan-900/80 text-cyan-200 border border-cyan-500/30"
                          : selectedCaja.estado === "CERRADA"
                          ? "bg-amber-900/80 text-amber-200 border border-amber-500/30"
                          : selectedCaja.estado === "ENVIADA"
                          ? "bg-purple-900/80 text-purple-200 border border-purple-500/30"
                          : "bg-emerald-900/80 text-emerald-200 border border-emerald-500/30"
                      }`}
                    >
                      {selectedCaja.estado === "ABIERTA"
                        ? "En Llenado"
                        : selectedCaja.estado === "CERRADA"
                        ? "Cerrada"
                        : selectedCaja.estado === "ENVIADA"
                        ? "Enviada a Archivo"
                        : "Archivada"}
                    </span>
                  </div>
                  <h3 className="text-xs text-slate-300 font-medium mt-0.5">
                    Expedientes Almacenados en esta Caja ({selectedCaja.tramites?.length || 0}) • Total Hojas: {selectedCaja.total_hojas || 0} • Monto: {formatCurrency(selectedCaja.total_monto || 0)}
                  </h3>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setModalVerTramitesOpen(false)}
                  className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
                  title="Cerrar ventana"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Barra de Herramientas y Acciones de la Caja */}
            <div className="px-6 py-3 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 shrink-0">
              <div className="flex items-center gap-2 text-xs text-slate-600">
                <span className="font-semibold text-slate-800">Contenido físico de la caja:</span>
                <span className="bg-white px-2 py-1 rounded border border-slate-200 font-mono text-[11px]">
                  {selectedCaja.tramites?.length || 0} expediente(s)
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {/* Acciones Adm. Caja en ABIERTA */}
                {selectedCaja.estado === "ABIERTA" && (isAdmCaja || isAdmin) && (
                  <>
                    <button
                      onClick={() => {
                        fetchTramitesPagadosDisponibles();
                        setModalAgregarTramitesOpen(true);
                      }}
                      className="px-3 py-1.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-colors shadow-2xs flex items-center gap-1.5"
                    >
                      <Plus className="w-3.5 h-3.5" /> Almacenar Trámites Pagados
                    </button>
                    <button
                      onClick={() => handleCerrarCaja(selectedCaja)}
                      className="px-3 py-1.5 text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 rounded-lg transition-colors shadow-2xs flex items-center gap-1.5"
                    >
                      <Lock className="w-3.5 h-3.5" /> Cerrar Caja
                    </button>
                  </>
                )}

                {/* Acciones Adm. Caja en CERRADA */}
                {selectedCaja.estado === "CERRADA" && (isAdmCaja || isAdmin) && (
                  <>
                    <button
                      onClick={() => handleReabrirCaja(selectedCaja)}
                      className="px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-100 border border-slate-300 rounded-lg transition-colors flex items-center gap-1.5 shadow-2xs"
                    >
                      <Unlock className="w-3.5 h-3.5" /> Reabrir Caja
                    </button>
                    <button
                      onClick={() => handleEnviarArchivo(selectedCaja)}
                      className="px-3 py-1.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors shadow-2xs flex items-center gap-1.5"
                    >
                      <Send className="w-3.5 h-3.5" /> Enviar a Archivo Central
                    </button>
                  </>
                )}

                {/* Acciones Custodio en ARCHIVADA */}
                {selectedCaja.estado === "ARCHIVADA" && (isCustodio || isAdmin) && (
                  <button
                    onClick={() => {
                      setCajaADesarchivar(selectedCaja);
                      setMotivoDesarchivo("");
                      setModalDesarchivarCajaOpen(true);
                    }}
                    className="px-3 py-1.5 text-xs font-bold text-amber-800 bg-amber-100 hover:bg-amber-200 border border-amber-300 rounded-lg transition-colors shadow-2xs flex items-center gap-1.5"
                  >
                    <FolderOpen className="w-3.5 h-3.5" /> Desarchivar Caja
                  </button>
                )}

                {/* Acciones Custodio en ENVIADA */}
                {selectedCaja.estado === "ENVIADA" && (isCustodio || isAdmin) && (
                  <>
                    <button
                      onClick={() => {
                        setCajaADevolver(selectedCaja);
                        setModalDevolverOpen(true);
                      }}
                      className="px-3 py-1.5 text-xs font-semibold text-amber-800 bg-amber-50 hover:bg-amber-100 border border-amber-300 rounded-lg transition-colors flex items-center gap-1.5"
                    >
                      <RotateCcw className="w-3.5 h-3.5 text-amber-600" /> Devolver a Adm. Caja
                    </button>
                    <button
                      onClick={() => handleAprobarArchivarCaja(selectedCaja)}
                      className="px-3.5 py-1.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-colors shadow-2xs flex items-center gap-1.5"
                    >
                      <Archive className="w-3.5 h-3.5" /> Aprobar y Archivar Definitivamente
                    </button>
                  </>
                )}

                {(isAdmCaja || isAdmin) && (
                  <>
                    <button
                      onClick={() => setModalImprimirOpen(true)}
                      className="px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-100 border border-slate-300 rounded-lg transition-colors flex items-center gap-1.5 shadow-2xs"
                    >
                      <Printer className="w-3.5 h-3.5" /> Imprimir Documento
                    </button>

                    <button
                      onClick={() => handleDescargarExcel(selectedCaja.id_caja, selectedCaja.codigo_caja)}
                      className="px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-100 border border-slate-300 rounded-lg transition-colors flex items-center gap-1.5 shadow-2xs"
                    >
                      <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" /> Exportar Excel
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* Contenido / Tabla de Trámites Scrollable */}
            <div className="p-6 overflow-y-auto flex-1">
              {loadingCajaDetail ? (
                <div className="p-12 text-center text-xs text-slate-500 flex flex-col items-center gap-2">
                  <RefreshCw className="w-5 h-5 animate-spin text-blue-600" />
                  <span>Cargando expedientes de la caja...</span>
                </div>
              ) : !selectedCaja.tramites || selectedCaja.tramites.length === 0 ? (
                <div className="p-12 text-center text-xs text-slate-400 uppercase font-semibold border-2 border-dashed border-slate-200 rounded-xl">
                  Esta caja aún no tiene expedientes almacenados.
                </div>
              ) : (
                <div className="overflow-x-auto border border-slate-200 rounded-xl">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                        <th className="py-2.5 px-3 text-center w-12">No.</th>
                        <th className="py-2.5 px-3">No. Cartón</th>
                        <th className="py-2.5 px-3">NÚMERO QUIPUX</th>
                        <th className="py-2.5 px-3 text-center">No. CUR</th>
                        <th className="py-2.5 px-3 text-center">No. Hojas</th>
                        <th className="py-2.5 px-3">Proveedor y Asunto</th>
                        <th className="py-2.5 px-3 text-right">Valor</th>
                        <th className="py-2.5 px-3 text-center">Estado</th>
                        {selectedCaja.estado === "ABIERTA" && (isAdmCaja || isAdmin) && (
                          <th className="py-2.5 px-3 text-center w-16">Acciones</th>
                        )}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 bg-white">
                      {selectedCaja.tramites.map((t, idx) => {
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
                            <td className="py-3 px-3 text-center font-mono font-bold text-slate-500 text-[11px]">
                              {idx + 1}
                            </td>
                            <td className="py-3 px-3 font-mono font-bold text-slate-800 text-[11px]">
                              {selectedCaja.codigo_caja}
                            </td>
                            <td className="py-3 px-3 whitespace-nowrap">
                              <div className="font-mono font-bold text-blue-700">{t.numero_quipux}</div>
                            </td>
                            <td className="py-3 px-3 text-center font-mono font-bold text-slate-700 whitespace-nowrap">
                              {curDisplay}
                            </td>
                            <td className="py-3 px-3 text-center font-mono font-bold text-slate-900">
                              {t.numero_hojas ?? "-"}
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
                            {selectedCaja.estado === "ABIERTA" && (isAdmCaja || isAdmin) && (
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

            {/* Footer Modal */}
            <div className="px-6 py-3 bg-slate-100 border-t border-slate-200 flex items-center justify-between shrink-0">
              <span className="text-xs text-slate-500">
                Tip: Haga doble clic sobre cualquier fila para abrir la ficha completa del trámite.
              </span>
              <button
                type="button"
                onClick={() => setModalVerTramitesOpen(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-300 rounded-lg transition-colors shadow-2xs"
              >
                Cerrar
              </button>
            </div>
          </div>
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

      {/* MODAL: DEVOLVER CAJA A ADM. CAJA (CUSTODIO DE ARCHIVO) */}
      {modalDevolverOpen && cajaADevolver && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="px-5 py-4 bg-amber-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <RotateCcw className="w-4 h-4 text-amber-300" />
                <h3 className="text-xs font-bold uppercase tracking-wider">
                  Devolver Caja: {cajaADevolver.codigo_caja}
                </h3>
              </div>
              <button
                onClick={() => {
                  setModalDevolverOpen(false);
                  setCajaADevolver(null);
                  setMotivoDevolucion("");
                }}
                className="text-amber-200 hover:text-white transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleConfirmarDevolucion} className="p-5 space-y-4">
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-900">
                Esta caja regresará al estado <strong>CERRADA</strong> en Administración de Caja para que puedan reabrirla, retirar o agregar expedientes y subsanar las observaciones.
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Motivo de Devolución / Observación *
                </label>
                <textarea
                  rows={3}
                  value={motivoDevolucion}
                  onChange={(e) => setMotivoDevolucion(e.target.value)}
                  placeholder="Detalle el motivo por el cual se devuelve la caja física a Adm. Caja..."
                  required
                  autoFocus
                  className="w-full text-xs bg-white border border-slate-300 rounded-lg p-2.5 text-slate-900 focus:ring-2 focus:ring-amber-500 focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => {
                    setModalDevolverOpen(false);
                    setCajaADevolver(null);
                    setMotivoDevolucion("");
                  }}
                  disabled={devolviendoCaja}
                  className="px-3.5 py-1.5 text-xs font-semibold uppercase text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={devolviendoCaja || !motivoDevolucion.trim()}
                  className="px-4 py-1.5 text-xs font-bold uppercase text-white bg-amber-700 hover:bg-amber-800 rounded-lg transition-colors shadow-xs"
                >
                  {devolviendoCaja ? "Devolviendo..." : "Confirmar Devolución"}
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
                      <th className="py-2 px-3">Número Quipux</th>
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
                            <div className="font-mono font-bold text-blue-700">{t.numero_quipux}</div>
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
                            {t.numero_hojas ?? "-"}
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 backdrop-blur-xs p-2 sm:p-4 md:p-6 print:p-0 print:bg-white print:static print-document-root">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-5xl max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150 print:border-none print:shadow-none print:max-w-none print:max-h-none print:overflow-visible">
            {/* Header del modal - Siempre fijo y visible arriba */}
            <div className="px-5 py-3.5 bg-slate-900 text-white flex flex-wrap items-center justify-between gap-3 shrink-0 shadow-md print:hidden">
              <div className="flex items-center gap-2">
                <Printer className="w-4 h-4 text-blue-400 shrink-0" />
                <h3 className="text-xs font-bold uppercase tracking-wider truncate">
                  Documento Oficial de Entrega a Archivo
                </h3>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={handleDescargarPdf}
                  className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-md flex items-center gap-1.5 transition-colors shadow-xs cursor-pointer"
                  title="Descargar archivo PDF oficial"
                >
                  <FileDown className="w-3.5 h-3.5" /> Descargar PDF
                </button>
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-md flex items-center gap-1.5 transition-colors shadow-xs cursor-pointer"
                  title="Imprimir documento oficial en formato A4 horizontal"
                >
                  <Printer className="w-3.5 h-3.5" /> Imprimir Documento
                </button>
                <button
                  type="button"
                  onClick={() => handleDescargarExcel(selectedCaja.id_caja, selectedCaja.codigo_caja)}
                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-md flex items-center gap-1.5 transition-colors shadow-xs cursor-pointer"
                  title="Descargar archivo Excel oficial"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5" /> Descargar Excel
                </button>
                <button
                  type="button"
                  onClick={() => setModalImprimirOpen(false)}
                  className="text-slate-400 hover:text-white transition-colors p-1.5 rounded-md hover:bg-slate-800 cursor-pointer ml-1"
                  title="Cerrar modal"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Hoja Documento Oficial - Contenedor scrolleable con altura adaptativa */}
            <div className="flex-1 overflow-y-auto overflow-x-auto p-4 sm:p-8 bg-white text-slate-900 print:p-0 print:overflow-visible font-sans">
              {/* Fila 1: Título con Nombre o Código de la Caja */}
              <div className="bg-[#244062] text-white py-2.5 px-4 text-center border border-slate-900">
                <h2 className="text-sm font-bold uppercase tracking-wide font-sans">
                  {(selectedCaja.nombre || selectedCaja.codigo_caja).toUpperCase()}
                </h2>
              </div>

              {/* Fila 2: Subtítulo Institucional */}
              <div className="bg-[#F1F5F9] text-[#475569] py-2 px-4 text-center border-x border-b border-slate-900 font-bold font-sans text-[11px] tracking-wide">
                SERVICIO NACIONAL DE ADUANA DEL ECUADOR - ADMINISTRACIÓN DE CAJA | FECHA DE EMISIÓN: {new Date().toLocaleDateString("es-EC")}
              </div>

              {/* Tabla Oficial de 7 Columnas con Estilo Exacto */}
              <div className="overflow-x-auto">
                <table className="w-full text-[11px] border-collapse border border-slate-900 font-sans">
                  <thead>
                    <tr className="bg-[#244062] text-white font-bold uppercase border-b border-slate-900">
                      <th className="border border-slate-900 py-2.5 px-2 text-center w-[4%]">No.</th>
                      <th className="border border-slate-900 py-2.5 px-2 text-center w-[5%]">Cartón</th>
                      <th className="border border-slate-900 py-2.5 px-2 text-center w-[11%]">CUR</th>
                      <th className="border border-slate-900 py-2.5 px-2 text-center w-[6%]">Hojas</th>
                      <th className="border border-slate-900 py-2.5 px-3.5 text-left w-[36%]">Proveedor y Asunto</th>
                      <th className="border border-slate-900 py-2.5 px-3 text-right w-[14%]">Valor</th>
                      <th className="border border-slate-900 py-2.5 px-2 text-center w-[12%]">Fecha y Observaciones</th>
                      <th className="border border-slate-900 py-2.5 px-2 text-center w-[12%]">Fecha envío de correos</th>
                    </tr>
                  </thead>
                  <tbody>
                    {!selectedCaja.tramites || selectedCaja.tramites.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="border border-slate-900 py-6 text-center text-slate-400 italic">
                          No hay expedientes almacenados en esta caja.
                        </td>
                      </tr>
                    ) : (
                      selectedCaja.tramites.map((t, idx) => {
                        const curDisplay = [
                          t.numero_cur_devengado,
                          t.numero_cur_contable,
                          t.numero_cur_compromiso,
                        ].filter(Boolean).join(", ") || "-";

                        return (
                          <tr key={t.id_tramite} className="border-b border-slate-900">
                            {/* Col 1: No. (Secuencial 1, 2, 3...) */}
                            <td className="border border-slate-900 py-3.5 px-2 text-center font-bold">
                              {idx + 1}
                            </td>
                            {/* Col 2: Cartón (siempre 1) */}
                            <td className="border border-slate-900 py-3.5 px-2 text-center font-bold">
                              1
                            </td>
                            <td className="border border-slate-900 py-3.5 px-2 text-center font-bold">
                              {curDisplay}
                            </td>
                            <td className="border border-slate-900 py-3.5 px-2 text-center">
                              {t.numero_hojas ?? "-"}
                            </td>
                            <td className="border border-slate-900 py-3.5 px-3.5 text-left leading-relaxed">
                              <span className="font-semibold text-slate-900">{t.proveedor_beneficiario}</span>
                              {t.asunto && <span className="text-slate-800"> - {t.asunto}</span>}
                            </td>
                            <td className="border border-slate-900 py-3.5 px-3 text-right font-bold">
                              {formatCurrency(t.monto_total || 0)}
                            </td>
                            <td className="border border-slate-900 py-3.5 px-2 text-center"></td>
                            <td className="border border-slate-900 py-3.5 px-2 text-center"></td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                  <tfoot>
                    <tr className="bg-[#E2E8F0] font-bold text-slate-900 border-t border-slate-900">
                      <td className="border border-slate-900 py-2.5 px-2 text-center"></td>
                      <td className="border border-slate-900 py-2.5 px-2 text-center"></td>
                      <td className="border border-slate-900 py-2.5 px-2"></td>
                      <td className="border border-slate-900 py-2.5 px-2 text-center"></td>
                      <td className="border border-slate-900 py-2.5 px-3.5 text-right font-bold">TOTAL GENERAL VALORES:</td>
                      <td className="border border-slate-900 py-2.5 px-3 text-right font-bold">
                        {formatCurrency(selectedCaja.total_monto || 0)}
                      </td>
                      <td className="border border-slate-900 py-2.5 px-2"></td>
                      <td className="border border-slate-900 py-2.5 px-2"></td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>

            {/* Footer modal - Fijo abajo */}
            <div className="px-5 py-3 bg-slate-100 border-t border-slate-200 flex items-center justify-between shrink-0 print:hidden">
              <span className="text-xs text-slate-500">
                Puede descargar el archivo en formato PDF o Excel oficial, o imprimirlo directamente en hoja horizontal.
              </span>
              <button
                type="button"
                onClick={() => setModalImprimirOpen(false)}
                className="px-3 py-1.5 text-xs font-semibold uppercase text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg transition-colors cursor-pointer"
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
