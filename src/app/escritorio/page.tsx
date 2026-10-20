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
  ShieldCheck,
  Printer,
  X,
  FileDown,
} from "lucide-react";

export default function EscritorioPage() {
  const router = useRouter();
  const [tramites, setTramites] = useState<TramiteCompletoDTO[]>([]);
  const [loading, setLoading] = useState(true);
  type TabType =
    | "escritorio"
    | "reasignados"
    | "aprobacion"
    | "aprobados"
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
  const [fetchError, setFetchError] = useState<string | null>(null);

  const fetchTramites = useCallback(async () => {
    setLoading(true);
    setFetchError(null);
    try {
      const res = await fetch(`/api/tramites?tipo=${activeTab}&search=${encodeURIComponent(search)}`);
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Error al cargar los trámites de la bandeja");
      }
      if (data.tramites) {
        setTramites(data.tramites);
      }
    } catch (error: any) {
      console.error("Error fetching tramites for escritorio:", error);
      setFetchError(error?.message || "Error de conexión al cargar trámites.");
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

  // Roles institucionales
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

  const isDirectoraOrAdmin = useMemo(() => {
    if (!currentUser) return false;
    const rol = (currentUser.rol || "").toUpperCase();
    return (
      rol === "DIRECTORA" ||
      rol === "DIRECTORA_FINANCIERA" ||
      rol === "ADMIN" ||
      rol === "ADMINISTRADOR"
    );
  }, [currentUser]);

  // Criterio para trámites en espera de Autorización DFI (Directora)
  const isTramiteParaAutorizarDFI = (t: TramiteCompletoDTO) => {
    if (t.autorizado_pago) return false;
    return (
      t.estado_general === "DFI" ||
      t.sub_estado === "PENDIENTE_AUTORIZACION_DFI" ||
      t.sub_estado === "PENDIENTE_AUTORIZACION_PAGO"
    );
  };

  // Criterio para trámites con Pago Aprobado (listos para entrega a Tesorería por Secretaría)
  const isTramitePagoAprobado = (t: TramiteCompletoDTO) => {
    return (
      t.estado_general === "PAGO_APROBADO" ||
      t.sub_estado === "APROBADO_POR_ENTREGAR_TESORERIA"
    );
  };

  // Trámites seleccionables en estado INGRESADO (Por entregar a Presupuesto)
  const tramitesIngresadosEnVista = useMemo(() => {
    return tramites.filter((t) => t.estado_general === "INGRESADO");
  }, [tramites]);

  // Trámites seleccionables en estado PAGO_APROBADO (Por entregar a Tesorería)
  const tramitesPagoAprobadoEnVista = useMemo(() => {
    return tramites.filter(isTramitePagoAprobado);
  }, [tramites]);

  // Trámites seleccionables para Autorización DFI
  const tramitesDfiEnVista = useMemo(() => {
    if (!isDirectoraOrAdmin) return [];
    return tramites.filter(isTramiteParaAutorizarDFI);
  }, [tramites, isDirectoraOrAdmin]);

  const selectedSonDeDfi = useMemo(() => {
    const selectedTramites = tramites.filter((t) => selectedIds.includes(t.id_tramite));
    return (
      selectedTramites.length > 0 &&
      selectedTramites.every((t) => isTramiteParaAutorizarDFI(t))
    );
  }, [tramites, selectedIds]);

  const selectedSonDePresupuesto = useMemo(() => {
    const selectedTramites = tramites.filter((t) => selectedIds.includes(t.id_tramite));
    return (
      selectedTramites.length > 0 &&
      selectedTramites.every((t) => t.id_area_actual === 2 && t.estado_general === "INGRESADO")
    );
  }, [tramites, selectedIds]);

  const selectedSonDeIngresados = useMemo(() => {
    const selectedTramites = tramites.filter((t) => selectedIds.includes(t.id_tramite));
    return (
      selectedTramites.length > 0 &&
      selectedTramites.every((t) => t.estado_general === "INGRESADO")
    );
  }, [tramites, selectedIds]);

  const selectedSonDePagoAprobado = useMemo(() => {
    const selectedTramites = tramites.filter((t) => selectedIds.includes(t.id_tramite));
    return (
      selectedTramites.length > 0 &&
      selectedTramites.every((t) => isTramitePagoAprobado(t))
    );
  }, [tramites, selectedIds]);

  // Universo de trámites seleccionables en la vista actual
  const selectableTramitesEnVista = useMemo(() => {
    if (activeTab === "aprobados" || selectedSonDePagoAprobado) {
      return tramitesPagoAprobadoEnVista;
    }
    if (activeTab === "ingresados" || selectedSonDeIngresados) {
      return tramitesIngresadosEnVista;
    }
    if (selectedSonDeDfi) return tramitesDfiEnVista;
    if (
      selectedSonDePresupuesto ||
      selectedIds.some((id) => tramitesIngresadosEnVista.some((t) => t.id_tramite === id))
    ) {
      return tramitesIngresadosEnVista;
    }
    if (isDirectoraOrAdmin && tramitesDfiEnVista.length > 0) {
      return tramitesDfiEnVista;
    }
    if (tramitesPagoAprobadoEnVista.length > 0 && !selectedSonDeIngresados) {
      return tramitesPagoAprobadoEnVista;
    }
    return tramitesIngresadosEnVista;
  }, [
    activeTab,
    selectedSonDePagoAprobado,
    selectedSonDeIngresados,
    selectedSonDeDfi,
    selectedSonDePresupuesto,
    selectedIds,
    tramitesDfiEnVista,
    tramitesIngresadosEnVista,
    tramitesPagoAprobadoEnVista,
    isDirectoraOrAdmin,
  ]);

  const allSelectableSelected =
    selectableTramitesEnVista.length > 0 &&
    selectableTramitesEnVista.every((t) => selectedIds.includes(t.id_tramite));

  const allIngresadosSelected = allSelectableSelected;

  const toggleSelectAll = () => {
    if (allSelectableSelected) {
      setSelectedIds([]);
    } else {
      setSelectedIds(selectableTramitesEnVista.map((t) => t.id_tramite));
    }
  };

  const toggleSelectAllIngresados = toggleSelectAll;

  // Selección individual con BLOQUEO ESTRICTO DE MEZCLA entre 'Por Entregar' y 'PAGO_APROBADO'
  const toggleSelectOne = (id: number) => {
    const target = tramites.find((t) => t.id_tramite === id);
    if (!target) return;

    if (!selectedIds.includes(id)) {
      const selectedTramites = tramites.filter((t) => selectedIds.includes(t.id_tramite));
      const yaTieneIngresado = selectedTramites.some((t) => t.estado_general === "INGRESADO");
      const yaTieneAprobado = selectedTramites.some((t) => isTramitePagoAprobado(t));
      const isTargetIngresado = target.estado_general === "INGRESADO";
      const isTargetAprobado = isTramitePagoAprobado(target);

      if (isTargetAprobado && yaTieneIngresado) {
        setBatchErrorMessage(
          "No puedes mezclar en un mismo documento trámites 'Por Entregar a Presupuesto' con trámites 'Aprobados para Tesorería'. Selecciónalos por separado."
        );
        return;
      }
      if (isTargetIngresado && yaTieneAprobado) {
        setBatchErrorMessage(
          "No puedes mezclar en un mismo documento trámites 'Por Entregar a Presupuesto' con trámites 'Aprobados para Tesorería'. Selecciónalos por separado."
        );
        return;
      }
    }

    setBatchErrorMessage(null);
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  // Estados para modal de confirmación de entrega Secretaría -> Control Previo
  const [modalConfirmarEntregaOpen, setModalConfirmarEntregaOpen] = useState(false);
  const [downloadingExcel, setDownloadingExcel] = useState(false);

  // Estados para modal de confirmación y entrega Secretaría -> Tesorería (PAGO_APROBADO)
  const [modalConfirmarEntregaTesoreriaOpen, setModalConfirmarEntregaTesoreriaOpen] = useState(false);
  const [downloadingAprobadosExcel, setDownloadingAprobadosExcel] = useState(false);
  const [deliveringTesoreriaBatch, setDeliveringTesoreriaBatch] = useState(false);

  // Estados para modal de confirmación y descarga de Autorización DFI
  const [modalConfirmarAutorizacionDfiOpen, setModalConfirmarAutorizacionDfiOpen] = useState(false);
  const [downloadingDfiExcel, setDownloadingDfiExcel] = useState(false);
  const [authorizingDfiBatch, setAuthorizingDfiBatch] = useState(false);

  // MODO 1: Descargar Acta Excel Secretaría (Solo genera y descarga sin despachar ni alterar estados)
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

  // MODO DFI 1: Descargar Acta oficial de Autorización DFI en Excel
  const handleDescargarActaAutorizacionDfiExcel = async () => {
    if (selectedIds.length === 0) return;
    setDownloadingDfiExcel(true);
    setBatchSuccessMessage(null);
    setBatchErrorMessage(null);

    try {
      const res = await fetch("/api/tramites/autorizar-lote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: selectedIds, accion: "EXCEL" }),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || "Error al generar el Acta de Autorización DFI");
      }

      const blob = await res.blob();
      const contentDisposition = res.headers.get("content-disposition");
      let filename = "Acta_Autorizacion_Pago_DFI.xlsx";
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
        `Acta de Autorización DFI descargada exitosamente (${selectedIds.length} trámites). Revise el documento antes de confirmar la autorización.`
      );
    } catch (err: any) {
      setBatchErrorMessage(err.message || "Error al descargar el Acta de Autorización DFI");
    } finally {
      setDownloadingDfiExcel(false);
    }
  };

  // MODO DFI 2: Confirmar Autorización de Pago y Derivar a Tesorería
  const handleConfirmarAutorizarDfiLote = async () => {
    if (selectedIds.length === 0) return;
    setAuthorizingDfiBatch(true);
    setBatchSuccessMessage(null);
    setBatchErrorMessage(null);

    try {
      const res = await fetch("/api/tramites/autorizar-lote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: selectedIds, accion: "AUTORIZAR" }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Error al autorizar los trámites seleccionados");
      }

      setBatchSuccessMessage(
        data.mensaje ||
          `¡Autorización completada! ${selectedIds.length} trámite(s) autorizados y derivados formalmente a Secretaría para acta y entrega a Tesorería.`
      );
      setModalConfirmarAutorizacionDfiOpen(false);
      setSelectedIds([]);
      fetchTramites();
    } catch (err: any) {
      setBatchErrorMessage(err.message || "Error al autorizar los trámites");
    } finally {
      setAuthorizingDfiBatch(false);
    }
  };

  // MODO SECRETARÍA -> TESORERÍA 1: Descargar Acta Excel de Trámites Aprobados
  const handleDescargarActaAprobadosExcel = async () => {
    if (selectedIds.length === 0) return;
    setDownloadingAprobadosExcel(true);
    setBatchSuccessMessage(null);
    setBatchErrorMessage(null);

    try {
      const res = await fetch("/api/tramites/entregar-tesoreria-lote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: selectedIds, accion: "EXCEL" }),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || "Error al generar el Acta Excel de entrega a Tesorería");
      }

      const blob = await res.blob();
      const contentDisposition = res.headers.get("content-disposition");
      let filename = "Acta_Entrega_Tesoreria_Aprobados.xlsx";
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
        `Acta Excel para Tesorería descargada exitosamente (${selectedIds.length} trámites). Revise el documento antes de confirmar el envío.`
      );
    } catch (err: any) {
      setBatchErrorMessage(err.message || "Error al descargar el Acta Excel");
    } finally {
      setDownloadingAprobadosExcel(false);
    }
  };

  // MODO SECRETARÍA -> TESORERÍA 2: Confirmar Entrega de Trámites Aprobados a Tesorería
  const handleConfirmarEntregaTesoreriaLote = async () => {
    if (selectedIds.length === 0) return;
    setDeliveringTesoreriaBatch(true);
    setBatchSuccessMessage(null);
    setBatchErrorMessage(null);

    try {
      const res = await fetch("/api/tramites/entregar-tesoreria-lote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: selectedIds, accion: "ENTREGAR" }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Error al entregar los trámites a Tesorería");
      }

      setBatchSuccessMessage(
        data.mensaje ||
          `¡Entrega completada! ${selectedIds.length} trámite(s) entregados formalmente a Tesorería / Pagos.`
      );
      setModalConfirmarEntregaTesoreriaOpen(false);
      setSelectedIds([]);
      fetchTramites();
    } catch (err: any) {
      setBatchErrorMessage(err.message || "Error al entregar los trámites a Tesorería");
    } finally {
      setDeliveringTesoreriaBatch(false);
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
    <div className="w-full max-w-full min-w-0 space-y-5">
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

      {fetchError && (
        <div className="p-4 bg-rose-50 border border-rose-300 text-rose-800 text-xs rounded-xl flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
            <span className="font-semibold">{fetchError}</span>
          </div>
          <button
            onClick={fetchTramites}
            className="text-rose-700 underline hover:text-rose-900 font-bold px-2"
          >
            Reintentar
          </button>
        </div>
      )}

      {/* Barra Flotante de Despacho y Autorización por Lote */}
      {selectedIds.length > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 w-[95%] max-w-4xl p-3.5 bg-blue-950/95 backdrop-blur-md text-white rounded-2xl shadow-2xl border border-blue-600/60 flex flex-col sm:flex-row items-center justify-between gap-3 animate-in fade-in slide-in-from-bottom-5 duration-200">
          <div className="flex items-center gap-3">
            <span className="px-2.5 py-1 bg-blue-700 rounded-md text-xs font-mono font-bold">
              {selectedIds.length} seleccionado(s)
            </span>
            <span className="text-xs font-medium text-slate-100">
              {selectedSonDeDfi && isDirectoraOrAdmin
                ? "Expedientes DFI listos para emisión de acta y autorización formal de pago."
                : selectedSonDePresupuesto
                ? "Expedientes físicos entregados a Presupuesto listos para confirmar recepción e iniciar SLA institucional."
                : selectedSonDePagoAprobado
                ? "Expedientes con pago aprobado por la Directora listos para emitir acta y entregar a Tesorería."
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

            {selectedSonDeDfi && isDirectoraOrAdmin ? (
              <>
                <button
                  onClick={handleDescargarActaAutorizacionDfiExcel}
                  disabled={downloadingDfiExcel}
                  className="px-3.5 py-2 bg-blue-800/80 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg border border-blue-400/30 transition-all shadow-xs flex items-center gap-2"
                  title="Descargar Acta oficial de Autorización DFI en Excel"
                >
                  <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
                  {downloadingDfiExcel ? "Descargando..." : "Descargar Acta de Autorización (Excel)"}
                </button>
                <button
                  onClick={() => setModalConfirmarAutorizacionDfiOpen(true)}
                  disabled={authorizingDfiBatch}
                  className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold rounded-lg transition-all shadow-md flex items-center gap-2"
                  title="Autorizar formalmente el pago de los expedientes y derivar a Secretaría"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  {authorizingDfiBatch ? "Autorizando..." : "Autorizar Pago"}
                </button>
              </>
            ) : selectedSonDePresupuesto && isPresupuestoOrAdmin ? (
              <button
                onClick={handleRecibirFisicamenteLote}
                disabled={deliveringBatch}
                className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold rounded-lg transition-all shadow-md flex items-center gap-2"
                title="Recibir formalmente el lote físico en Presupuesto e iniciar cómputo de SLA"
              >
                <CheckCircle2 className="w-4 h-4" />
                {deliveringBatch ? "Recibiendo..." : `Recibir Físicamente (${selectedIds.length})`}
              </button>
            ) : selectedSonDePagoAprobado && isDFIOrAdmin ? (
              <>
                <button
                  onClick={handleDescargarActaAprobadosExcel}
                  disabled={downloadingAprobadosExcel}
                  className="px-3.5 py-2 bg-blue-800/80 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg border border-blue-400/30 transition-all shadow-xs flex items-center gap-2"
                  title="Descargar Acta oficial de Entrega a Tesorería en Excel"
                >
                  <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
                  {downloadingAprobadosExcel ? "Descargando..." : "Descargar Acta de Entrega (Excel)"}
                </button>
                <button
                  onClick={() => setModalConfirmarEntregaTesoreriaOpen(true)}
                  disabled={deliveringTesoreriaBatch}
                  className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold rounded-lg transition-all shadow-md flex items-center gap-2"
                  title="Confirmar entrega de expedientes aprobados a Tesorería / Pagos"
                >
                  <Send className="w-4 h-4" />
                  {deliveringTesoreriaBatch ? "Entregando..." : "Entregar a Tesorería"}
                </button>
              </>
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

      {/* MODAL 1: VISTA PREVIA Y FORMATO DE IMPRESIÓN OFICIAL - ENTREGA A CONTROL PREVIO */}
      {modalConfirmarEntregaOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 backdrop-blur-xs p-2 sm:p-4 md:p-6 print:p-0 print:bg-white print:static print-document-root">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-5xl max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150 print:border-none print:shadow-none print:max-w-none print:max-h-none print:overflow-visible">
            {/* Header del modal */}
            <div className="px-5 py-3.5 bg-slate-900 text-white flex flex-wrap items-center justify-between gap-3 shrink-0 shadow-md print:hidden">
              <div className="flex items-center gap-2">
                <Printer className="w-4 h-4 text-blue-400 shrink-0" />
                <h3 className="text-xs font-bold uppercase tracking-wider truncate">
                  Documento Oficial de Entrega a Control Previo
                </h3>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-blue-800 text-blue-200 border border-blue-600">
                  {selectedIds.length} expediente(s)
                </span>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="px-3 py-1.5 bg-slate-700 hover:bg-slate-800 text-white text-xs font-bold rounded-md flex items-center gap-1.5 transition-colors shadow-xs cursor-pointer"
                  title="Imprimir documento oficial en formato horizontal"
                >
                  <Printer className="w-3.5 h-3.5" /> Imprimir Documento
                </button>
                <button
                  type="button"
                  onClick={handleDescargarActaExcel}
                  disabled={downloadingExcel}
                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-md flex items-center gap-1.5 transition-colors shadow-xs cursor-pointer"
                  title="Descargar acta oficial en Excel (.xlsx)"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5" /> {downloadingExcel ? "Descargando..." : "Descargar Excel"}
                </button>
                <button
                  type="button"
                  onClick={() => setModalConfirmarEntregaOpen(false)}
                  className="text-slate-400 hover:text-white transition-colors p-1.5 rounded-md hover:bg-slate-800 cursor-pointer ml-1"
                  title="Cerrar modal"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Hoja Documento Oficial */}
            <div className="flex-1 overflow-y-auto overflow-x-auto p-4 sm:p-8 bg-white text-slate-900 print:p-0 print:overflow-visible font-sans">
              <div className="bg-[#0B3B60] text-white py-2.5 px-4 text-center border border-slate-900">
                <h2 className="text-sm font-bold uppercase tracking-wide font-sans">
                  DOCUMENTO ENTREGADOS A CONTROL PREVIO
                </h2>
              </div>
              <div className="bg-[#F1F5F9] text-[#475569] py-2 px-4 text-center border-x border-b border-slate-900 font-bold font-sans text-[11px] tracking-wide">
                SERVICIO NACIONAL DE ADUANA DEL ECUADOR | FECHA DE EMISIÓN: {new Date().toLocaleDateString("es-EC")}
              </div>

              <div className="overflow-x-auto w-full max-w-full min-w-0">
                <table className="min-w-[850px] w-full text-[11px] border-collapse border border-slate-900 font-sans">
                  <thead>
                    <tr className="bg-[#0B3B60] text-white font-bold uppercase border-b border-slate-900">
                      <th className="border border-slate-900 py-2.5 px-2 text-center w-[4%]">Nro</th>
                      <th className="border border-slate-900 py-2.5 px-2 text-center w-[10%]">TIPO GESTION</th>
                      <th className="border border-slate-900 py-2.5 px-2 text-center w-[10%]">AREA</th>
                      <th className="border border-slate-900 py-2.5 px-2 text-center w-[16%]">Documento / Quipux</th>
                      <th className="border border-slate-900 py-2.5 px-2 text-center w-[10%]">FECHA MEMORANDO</th>
                      <th className="border border-slate-900 py-2.5 px-2 text-center w-[10%]">FECHA RECEPCION</th>
                      <th className="border border-slate-900 py-2.5 px-3 text-left w-[24%]">ASUNTO</th>
                      <th className="border border-slate-900 py-2.5 px-2 text-center w-[8%]">RECIBE</th>
                      <th className="border border-slate-900 py-2.5 px-2 text-center w-[8%]">FECHA RECIBIDO</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tramites
                      .filter((t) => selectedIds.includes(t.id_tramite))
                      .map((t, idx) => (
                        <tr key={t.id_tramite} className="border-b border-slate-900">
                          <td className="border border-slate-900 py-2.5 px-2 text-center font-bold">
                            {idx + 1}
                          </td>
                          <td className="border border-slate-900 py-2.5 px-2 text-center font-semibold">
                            {t.tipo_gestion || t.padre_gestion || "PAGO"}
                          </td>
                          <td className="border border-slate-900 py-2.5 px-2 text-center text-slate-700">
                            {t.area_requirente || "-"}
                          </td>
                          <td className="border border-slate-900 py-2.5 px-2 text-center font-mono font-bold text-blue-900">
                            {t.numero_quipux}
                          </td>
                          <td className="border border-slate-900 py-2.5 px-2 text-center">
                            {formatDate(t.fecha_memorando) || "-"}
                          </td>
                          <td className="border border-slate-900 py-2.5 px-2 text-center">
                            {formatDate(t.fecha_recepcion_fisica) || "-"}
                          </td>
                          <td className="border border-slate-900 py-2.5 px-3 text-left text-[10px] leading-tight text-slate-800">
                            <div className="line-clamp-2 font-medium">{t.asunto || "-"}</div>
                            <div className="text-[10px] text-slate-500 font-semibold mt-0.5">
                              {t.proveedor_beneficiario}
                            </div>
                          </td>
                          <td className="border border-slate-900 py-2.5 px-2 text-center text-slate-400 italic">
                            {/* Espacio para firma física */}
                          </td>
                          <td className="border border-slate-900 py-2.5 px-2 text-center text-slate-400 italic">
                            {/* Espacio para fecha de recepción física */}
                          </td>
                        </tr>
                      ))}
                  </tbody>
                  <tfoot>
                    <tr className="bg-[#E2E8F0] font-bold text-slate-900 border-t border-slate-900">
                      <td colSpan={6} className="border border-slate-900 py-2 px-3 text-right">
                        TOTAL DE EXPEDIENTES:
                      </td>
                      <td colSpan={3} className="border border-slate-900 py-2 px-3 text-left font-mono">
                        {selectedIds.length} trámite(s)
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>

            {/* Footer modal */}
            <div className="px-5 py-3 bg-slate-100 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3 shrink-0 print:hidden">
              <span className="text-xs text-slate-500">
                Revise y/o imprima el acta de entrega antes de formalizar el despacho a Control Previo (Presupuesto).
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setModalConfirmarEntregaOpen(false)}
                  disabled={deliveringBatch}
                  className="px-3.5 py-2 text-xs font-medium text-slate-600 hover:text-slate-800 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
                >
                  Cancelar y Revisar
                </button>
                <button
                  type="button"
                  onClick={handleConfirmarEntregaLote}
                  disabled={deliveringBatch}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg transition-all shadow-md flex items-center gap-1.5 cursor-pointer"
                >
                  <Send className="w-4 h-4" />
                  {deliveringBatch ? "Procesando Entrega..." : "Confirmar y Enviar a Control Previo"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: VISTA PREVIA Y AUTORIZACIÓN DFI */}
      {modalConfirmarAutorizacionDfiOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 backdrop-blur-xs p-2 sm:p-4 md:p-6 print:p-0 print:bg-white print:static print-document-root">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-5xl max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150 print:border-none print:shadow-none print:max-w-none print:max-h-none print:overflow-visible">
            {/* Header del modal */}
            <div className="px-5 py-3.5 bg-slate-900 text-white flex flex-wrap items-center justify-between gap-3 shrink-0 shadow-md print:hidden">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                <h3 className="text-xs font-bold uppercase tracking-wider truncate">
                  Acta Oficial de Autorización de Pago DFI
                </h3>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-blue-800 text-blue-200 border border-blue-600">
                  {selectedIds.length} expediente(s)
                </span>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="px-3 py-1.5 bg-slate-700 hover:bg-slate-800 text-white text-xs font-bold rounded-md flex items-center gap-1.5 transition-colors shadow-xs cursor-pointer"
                  title="Imprimir acta oficial de autorización DFI"
                >
                  <Printer className="w-3.5 h-3.5" /> Imprimir Documento
                </button>
                <button
                  type="button"
                  onClick={handleDescargarActaAutorizacionDfiExcel}
                  disabled={downloadingDfiExcel}
                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-md flex items-center gap-1.5 transition-colors shadow-xs cursor-pointer"
                  title="Descargar acta oficial en Excel (.xlsx)"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5" /> {downloadingDfiExcel ? "Descargando..." : "Descargar Excel"}
                </button>
                <button
                  type="button"
                  onClick={() => setModalConfirmarAutorizacionDfiOpen(false)}
                  className="text-slate-400 hover:text-white transition-colors p-1.5 rounded-md hover:bg-slate-800 cursor-pointer ml-1"
                  title="Cerrar modal"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Hoja Documento Oficial */}
            <div className="flex-1 overflow-y-auto overflow-x-auto p-4 sm:p-8 bg-white text-slate-900 print:p-0 print:overflow-visible font-sans">
              <div className="bg-[#0B3B60] text-white py-2.5 px-4 text-center border border-slate-900">
                <h2 className="text-sm font-bold uppercase tracking-wide font-sans">
                  ACTA DE AUTORIZACIÓN DE PAGO - DIRECCIÓN FINANCIERA
                </h2>
              </div>
              <div className="bg-[#F1F5F9] text-[#475569] py-2 px-4 text-center border-x border-b border-slate-900 font-bold font-sans text-[11px] tracking-wide">
                SERVICIO NACIONAL DE ADUANA DEL ECUADOR | FECHA DE EMISIÓN: {new Date().toLocaleDateString("es-EC")}
              </div>

              <div className="overflow-x-auto w-full max-w-full min-w-0">
                <table className="min-w-[850px] w-full text-[11px] border-collapse border border-slate-900 font-sans">
                  <thead>
                    <tr className="bg-[#0B3B60] text-white font-bold uppercase border-b border-slate-900">
                      <th className="border border-slate-900 py-2.5 px-2 text-center w-[4%]">No.</th>
                      <th className="border border-slate-900 py-2.5 px-2 text-center w-[16%]">Documento / Quipux</th>
                      <th className="border border-slate-900 py-2.5 px-3 text-left w-[24%]">Proveedor / Beneficiario</th>
                      <th className="border border-slate-900 py-2.5 px-2 text-center w-[11%]">RUC / Cédula</th>
                      <th className="border border-slate-900 py-2.5 px-2 text-center w-[11%]">N° CUR</th>
                      <th className="border border-slate-900 py-2.5 px-3 text-right w-[14%]">Monto Autorizado</th>
                      <th className="border border-slate-900 py-2.5 px-2 text-center w-[20%]">Firma Autorización DFI</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tramites
                      .filter((t) => selectedIds.includes(t.id_tramite))
                      .map((t, idx) => {
                        const curDisplay = [
                          t.numero_cur_devengado,
                          t.numero_cur_contable,
                          t.numero_cur_compromiso,
                        ].filter(Boolean).join(", ") || "-";

                        return (
                          <tr key={t.id_tramite} className="border-b border-slate-900">
                            <td className="border border-slate-900 py-2.5 px-2 text-center font-bold">
                              {idx + 1}
                            </td>
                            <td className="border border-slate-900 py-2.5 px-2 text-center font-mono font-bold text-blue-900">
                              {t.numero_quipux}
                            </td>
                            <td className="border border-slate-900 py-2.5 px-3 text-left">
                              <div className="font-semibold text-slate-900">{t.proveedor_beneficiario}</div>
                              {t.asunto && (
                                <div className="text-[10px] text-slate-500 line-clamp-1 italic">{t.asunto}</div>
                              )}
                            </td>
                            <td className="border border-slate-900 py-2.5 px-2 text-center font-mono text-slate-700">
                              {t.ruc_proveedor || "-"}
                            </td>
                            <td className="border border-slate-900 py-2.5 px-2 text-center font-mono font-bold text-slate-800">
                              {curDisplay}
                            </td>
                            <td className="border border-slate-900 py-2.5 px-3 text-right font-mono font-bold text-emerald-800">
                              {formatCurrency(t.monto_total || t.subtotal || 0)}
                            </td>
                            <td className="border border-slate-900 py-2.5 px-2 text-center text-slate-400 italic text-[10px]">
                              {/* Espacio para firma institucional */}
                            </td>
                          </tr>
                        );
                      })}
                  </tbody>
                  <tfoot>
                    <tr className="bg-[#E2E8F0] font-bold text-slate-900 border-t border-slate-900">
                      <td colSpan={5} className="border border-slate-900 py-2 px-3 text-right">
                        TOTAL MONTO AUTORIZADO:
                      </td>
                      <td className="border border-slate-900 py-2 px-3 text-right font-mono text-emerald-900">
                        {formatCurrency(
                          tramites
                            .filter((t) => selectedIds.includes(t.id_tramite))
                            .reduce((acc, curr) => acc + (Number(curr.monto_total || curr.subtotal) || 0), 0)
                        )}
                      </td>
                      <td className="border border-slate-900 py-2 px-2"></td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>

            {/* Footer modal */}
            <div className="px-5 py-3 bg-slate-100 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3 shrink-0 print:hidden">
              <span className="text-xs text-slate-500">
                Al autorizar, los expedientes pasarán a estado PAGO_APROBADO bajo custodia de Secretaría para emitir el acta física hacia Tesorería.
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setModalConfirmarAutorizacionDfiOpen(false)}
                  disabled={authorizingDfiBatch}
                  className="px-3.5 py-2 text-xs font-medium text-slate-600 hover:text-slate-800 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
                >
                  Cancelar y Revisar
                </button>
                <button
                  type="button"
                  onClick={handleConfirmarAutorizarDfiLote}
                  disabled={authorizingDfiBatch}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg transition-all shadow-md flex items-center gap-1.5 cursor-pointer"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  {authorizingDfiBatch ? "Autorizando..." : "Confirmar Autorización de Pago"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: VISTA PREVIA Y FORMATO DE IMPRESIÓN OFICIAL - ENTREGA A TESORERÍA (PAGO_APROBADO) */}
      {modalConfirmarEntregaTesoreriaOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 backdrop-blur-xs p-2 sm:p-4 md:p-6 print:p-0 print:bg-white print:static print-document-root">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-5xl max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150 print:border-none print:shadow-none print:max-w-none print:max-h-none print:overflow-visible">
            {/* Header del modal */}
            <div className="px-5 py-3.5 bg-slate-900 text-white flex flex-wrap items-center justify-between gap-3 shrink-0 shadow-md print:hidden">
              <div className="flex items-center gap-2">
                <Printer className="w-4 h-4 text-emerald-400 shrink-0" />
                <h3 className="text-xs font-bold uppercase tracking-wider truncate">
                  Acta Oficial de Entrega de Trámites Aprobados a Tesorería
                </h3>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-800 text-emerald-200 border border-emerald-600">
                  {selectedIds.length} expediente(s)
                </span>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="px-3 py-1.5 bg-slate-700 hover:bg-slate-800 text-white text-xs font-bold rounded-md flex items-center gap-1.5 transition-colors shadow-xs cursor-pointer"
                  title="Imprimir acta oficial de entrega a Tesorería"
                >
                  <Printer className="w-3.5 h-3.5" /> Imprimir Documento
                </button>
                <button
                  type="button"
                  onClick={handleDescargarActaAprobadosExcel}
                  disabled={downloadingAprobadosExcel}
                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-md flex items-center gap-1.5 transition-colors shadow-xs cursor-pointer"
                  title="Descargar acta oficial en Excel (.xlsx)"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5" /> {downloadingAprobadosExcel ? "Descargando..." : "Descargar Excel"}
                </button>
                <button
                  type="button"
                  onClick={() => setModalConfirmarEntregaTesoreriaOpen(false)}
                  className="text-slate-400 hover:text-white transition-colors p-1.5 rounded-md hover:bg-slate-800 cursor-pointer ml-1"
                  title="Cerrar modal"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Hoja Documento Oficial */}
            <div className="flex-1 overflow-y-auto overflow-x-auto p-4 sm:p-8 bg-white text-slate-900 print:p-0 print:overflow-visible font-sans">
              <div className="bg-[#0B3B60] text-white py-2.5 px-4 text-center border border-slate-900">
                <h2 className="text-sm font-bold uppercase tracking-wide font-sans">
                  ACTA DE ENTREGA DE TRÁMITES APROBADOS A TESORERÍA / PAGOS
                </h2>
              </div>
              <div className="bg-[#F1F5F9] text-[#475569] py-2 px-4 text-center border-x border-b border-slate-900 font-bold font-sans text-[11px] tracking-wide">
                SERVICIO NACIONAL DE ADUANA DEL ECUADOR - DIRECCIÓN FINANCIERA | FECHA DE EMISIÓN: {new Date().toLocaleDateString("es-EC")}
              </div>

              <div className="overflow-x-auto w-full max-w-full min-w-0">
                <table className="min-w-[850px] w-full text-[11px] border-collapse border border-slate-900 font-sans">
                  <thead>
                    <tr className="bg-[#0B3B60] text-white font-bold uppercase border-b border-slate-900">
                      <th className="border border-slate-900 py-2.5 px-2 text-center w-[4%]">No.</th>
                      <th className="border border-slate-900 py-2.5 px-2 text-center w-[16%]">Documento / Quipux</th>
                      <th className="border border-slate-900 py-2.5 px-3 text-left w-[24%]">Proveedor / Beneficiario</th>
                      <th className="border border-slate-900 py-2.5 px-2 text-center w-[11%]">RUC / Cédula</th>
                      <th className="border border-slate-900 py-2.5 px-2 text-center w-[11%]">N° CUR</th>
                      <th className="border border-slate-900 py-2.5 px-3 text-right w-[14%]">Monto a Pagar</th>
                      <th className="border border-slate-900 py-2.5 px-2 text-center w-[20%]">Firma / Recepción Tesorería</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tramites
                      .filter((t) => selectedIds.includes(t.id_tramite))
                      .map((t, idx) => {
                        const curDisplay = [
                          t.numero_cur_devengado,
                          t.numero_cur_contable,
                          t.numero_cur_compromiso,
                        ].filter(Boolean).join(", ") || "-";

                        return (
                          <tr key={t.id_tramite} className="border-b border-slate-900">
                            <td className="border border-slate-900 py-2.5 px-2 text-center font-bold">
                              {idx + 1}
                            </td>
                            <td className="border border-slate-900 py-2.5 px-2 text-center font-mono font-bold text-blue-900">
                              {t.numero_quipux}
                            </td>
                            <td className="border border-slate-900 py-2.5 px-3 text-left">
                              <div className="font-semibold text-slate-900">{t.proveedor_beneficiario}</div>
                              {t.asunto && (
                                <div className="text-[10px] text-slate-500 line-clamp-1 italic">{t.asunto}</div>
                              )}
                            </td>
                            <td className="border border-slate-900 py-2.5 px-2 text-center font-mono text-slate-700">
                              {t.ruc_proveedor || "-"}
                            </td>
                            <td className="border border-slate-900 py-2.5 px-2 text-center font-mono font-bold text-slate-800">
                              {curDisplay}
                            </td>
                            <td className="border border-slate-900 py-2.5 px-3 text-right font-mono font-bold text-emerald-800">
                              {formatCurrency(t.monto_total || t.subtotal || 0)}
                            </td>
                            <td className="border border-slate-900 py-2.5 px-2 text-center text-slate-400 italic text-[10px]">
                              {/* Espacio para firma de Tesorería */}
                            </td>
                          </tr>
                        );
                      })}
                  </tbody>
                  <tfoot>
                    <tr className="bg-[#E2E8F0] font-bold text-slate-900 border-t border-slate-900">
                      <td colSpan={5} className="border border-slate-900 py-2 px-3 text-right">
                        TOTAL MONTO A PAGAR:
                      </td>
                      <td className="border border-slate-900 py-2 px-3 text-right font-mono text-emerald-900">
                        {formatCurrency(
                          tramites
                            .filter((t) => selectedIds.includes(t.id_tramite))
                            .reduce((acc, curr) => acc + (Number(curr.monto_total || curr.subtotal) || 0), 0)
                        )}
                      </td>
                      <td className="border border-slate-900 py-2 px-2"></td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>

            {/* Footer modal */}
            <div className="px-5 py-3 bg-slate-100 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3 shrink-0 print:hidden">
              <span className="text-xs text-slate-500">
                Al confirmar, los expedientes aprobados saldrán de Secretaría y pasarán a custodia formal de Tesorería / Pagos para su cancelación.
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setModalConfirmarEntregaTesoreriaOpen(false)}
                  disabled={deliveringTesoreriaBatch}
                  className="px-3.5 py-2 text-xs font-medium text-slate-600 hover:text-slate-800 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
                >
                  Cancelar y Revisar
                </button>
                <button
                  type="button"
                  onClick={handleConfirmarEntregaTesoreriaLote}
                  disabled={deliveringTesoreriaBatch}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg transition-all shadow-md flex items-center gap-1.5 cursor-pointer"
                >
                  <Send className="w-4 h-4" />
                  {deliveringTesoreriaBatch ? "Entregando..." : "Confirmar y Enviar a Tesorería"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}


      {/* Tabs & Search */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 w-full min-w-0">
        <div className="flex overflow-x-auto flex-nowrap sm:flex-wrap items-center p-1 bg-slate-200/80 rounded-lg border border-slate-300 text-xs font-medium self-stretch sm:self-start gap-1 scrollbar-none max-w-full">
          {/* 1. En Mi Escritorio: únicamente lo que tengo físicamente en mi poder */}
          <button
            onClick={() => {
              setActiveTab("escritorio");
              setSelectedIds([]);
            }}
            className={`shrink-0 whitespace-nowrap px-3 py-1.5 rounded-md transition-all ${
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
            className={`shrink-0 whitespace-nowrap px-3 py-1.5 rounded-md transition-all ${
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
            className={`shrink-0 whitespace-nowrap px-3 py-1.5 rounded-md transition-all ${
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
              className={`shrink-0 whitespace-nowrap px-3 py-1.5 rounded-md transition-all ${
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
            className={`shrink-0 whitespace-nowrap px-3 py-1.5 rounded-md transition-all ${
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
              className={`shrink-0 whitespace-nowrap px-3 py-1.5 rounded-md transition-all ${
                activeTab === "ingresados"
                  ? "bg-white text-blue-900 shadow-xs font-bold"
                  : "text-slate-600 hover:text-slate-900"
              }`}
              title="Expedientes ingresados en ventanilla listos para despachar a Control Previo"
            >
              Por Entregar
            </button>
          )}

          {/* 6.1 Aprobados: SOLO para Secretaría DFI y Admin */}
          {isDFIOrAdmin && (
            <button
              onClick={() => {
                setActiveTab("aprobados");
                setSelectedIds([]);
              }}
              className={`shrink-0 whitespace-nowrap px-3 py-1.5 rounded-md transition-all ${
                activeTab === "aprobados"
                  ? "bg-white text-emerald-900 shadow-xs font-bold"
                  : "text-slate-600 hover:text-slate-900"
              }`}
              title="Expedientes con pago aprobado por la Directora listos para emitir acta y entregar a Tesorería"
            >
              Aprobados
            </button>
          )}

          {/* 7. En Caja: SOLO para Tesorería, Adm. Caja, Archivo o Admin */}
          {canManageCajas && (
            <button
              onClick={() => {
                setActiveTab("caja");
                setSelectedIds([]);
              }}
              className={`shrink-0 whitespace-nowrap px-3 py-1.5 rounded-md transition-all ${
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
        <div className="relative w-full sm:w-72 shrink-0">
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
      <div className="w-full max-w-full min-w-0 bg-white border border-slate-200 rounded-xl overflow-x-auto shadow-xs">
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
          <>
            {/* Vista Adaptable de Tarjetas para Móviles (sm:hidden) */}
            <div className="sm:hidden divide-y divide-slate-200">
              {/* Barra de Selección Masiva en Móvil */}
              {selectableTramitesEnVista.length > 0 && (
                <div className="p-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between text-xs">
                  <button
                    type="button"
                    onClick={toggleSelectAll}
                    className="flex items-center gap-2 font-semibold text-slate-700 hover:text-blue-700 transition-colors"
                  >
                    {allSelectableSelected ? (
                      <CheckSquare className="w-4 h-4 text-blue-600" />
                    ) : (
                      <Square className="w-4 h-4 text-slate-400" />
                    )}
                    <span>
                      {allSelectableSelected
                        ? "Deseleccionar todos"
                        : activeTab === "aprobados" || selectedSonDePagoAprobado
                        ? "Seleccionar todos los Aprobados"
                        : selectedSonDeDfi || (isDirectoraOrAdmin && tramitesDfiEnVista.length > 0)
                        ? "Seleccionar todos para Autorización DFI"
                        : "Seleccionar todos los Ingresados"}
                    </span>
                  </button>
                  <span className="font-mono text-[11px] text-slate-500 font-bold">
                    {selectedIds.length} / {selectableTramitesEnVista.length}
                  </span>
                </div>
              )}

              {tramites.map((t) => {
                const isIngresado = t.estado_general === "INGRESADO";
                const isAprobado = isTramitePagoAprobado(t);
                const isDfiPendiente = isTramiteParaAutorizarDFI(t);
                const canSelectIngresado = (isDFIOrAdmin || isPresupuestoOrAdmin) && isIngresado;
                const canSelectAprobado = isDFIOrAdmin && isAprobado;
                const canSelectDfi = isDirectoraOrAdmin && isDfiPendiente;
                const disabledPorMezcla =
                  (isIngresado && selectedSonDePagoAprobado) ||
                  (isAprobado && selectedSonDeIngresados);
                const canSelectThisRow = (canSelectIngresado || canSelectAprobado || canSelectDfi) && !disabledPorMezcla;
                const isSelected = selectedIds.includes(t.id_tramite);

                return (
                  <div
                    key={t.id_tramite}
                    onClick={() => router.push(`/tramite/${t.id_tramite}`)}
                    className={`p-4 transition-colors cursor-pointer select-none space-y-3 ${
                      isSelected ? "bg-blue-50/90" : "bg-white hover:bg-slate-50/80"
                    }`}
                  >
                    {/* Fila 1: Quipux, Checkbox y Estados */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2.5 min-w-0">
                        {canSelectThisRow && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleSelectOne(t.id_tramite);
                            }}
                            className="p-1 -ml-1 text-slate-600 hover:text-blue-600 rounded transition-colors"
                            title={isSelected ? "Deseleccionar" : "Seleccionar"}
                          >
                            {isSelected ? (
                              <CheckSquare className="w-5 h-5 text-blue-600" />
                            ) : (
                              <Square className="w-5 h-5 text-slate-400" />
                            )}
                          </button>
                        )}
                        <div className="min-w-0">
                          <span
                            className="font-mono font-bold text-xs text-blue-700 block truncate"
                            title={t.numero_quipux}
                          >
                            {t.numero_quipux}
                          </span>
                          {(t.fecha_ingreso || t.fecha_recepcion_fisica || t.fecha_memorando) && (
                            <span className="text-[10px] text-slate-400 font-mono block">
                              {formatDate(t.fecha_ingreso || t.fecha_recepcion_fisica || t.fecha_memorando)}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <SemaforoSLA sla={t.sla} />
                        <BadgeEstado estado={t.estado_general} subEstado={t.sub_estado} />
                      </div>
                    </div>

                    {/* Fila 2: Proveedor / Beneficiario y RUC */}
                    <div>
                      <div
                        className="text-xs font-bold text-slate-900 uppercase leading-snug line-clamp-2"
                        title={t.proveedor_beneficiario}
                      >
                        {t.proveedor_beneficiario || "N/A"}
                      </div>
                      <div className="text-[11px] font-mono text-slate-500 mt-0.5">
                        RUC: {t.ruc_proveedor || "SIN RUC"}
                      </div>
                    </div>

                    {/* Fila 3: Tipo de Proceso y Gestión */}
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-slate-600">
                      <span className="font-semibold text-slate-700 truncate max-w-[200px]">
                        {t.tipos_tramite?.nombre || "CONTRATACIÓN"}
                      </span>
                      <span className="text-slate-300">•</span>
                      <span className="text-slate-500 truncate max-w-[180px]">
                        {t.padre_gestion || t.tipo_flujo || "PAGO"} - {t.tipo_gestion || "PAGO"}
                      </span>
                    </div>

                    {/* Fila 4: Custodio, Caja y Monto */}
                    <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-100 text-xs">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <User className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                        <span className="font-semibold text-slate-700 text-[11px] truncate uppercase">
                          {t.usuarios?.nombre_completo || "Sin Asignar"}
                        </span>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {(t.caja?.codigo_caja || t.codigo_tomo_caja) && (
                          <span
                            className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-cyan-50 text-cyan-800 border border-cyan-200"
                            title={`Almacenado en: ${t.caja?.codigo_caja || t.codigo_tomo_caja}`}
                          >
                            <Package className="w-3 h-3 text-cyan-600" />
                            <span>{t.caja?.codigo_caja || t.codigo_tomo_caja}</span>
                          </span>
                        )}
                        <span className="font-mono font-bold text-slate-900 text-xs">
                          {formatCurrency(t.monto_total || t.subtotal || 0)}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Tabla para Pantallas Medianas y Grandes (hidden sm:table) */}
            <table className="hidden sm:table min-w-[950px] w-full border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                  {/* Columna de Checkbox para despacho / autorización por lote */}
                  {(isDFIOrAdmin || isPresupuestoOrAdmin) && (
                    <th className="py-3 px-2 text-center w-12 min-w-[48px] max-w-[48px] sticky left-0 z-20 bg-slate-50">
                      {selectableTramitesEnVista.length > 0 && (
                        <button
                          type="button"
                          onClick={toggleSelectAll}
                          className="p-1 hover:bg-slate-200 rounded transition-colors"
                          title={
                            allSelectableSelected
                              ? "Deseleccionar todos"
                              : activeTab === "aprobados" || selectedSonDePagoAprobado
                              ? "Seleccionar todos los Aprobados"
                              : selectedSonDeDfi || (isDirectoraOrAdmin && tramitesDfiEnVista.length > 0)
                              ? "Seleccionar todos para Autorización DFI"
                              : "Seleccionar todos los Ingresados"
                          }
                        >
                          {allSelectableSelected ? (
                            <CheckSquare className="w-4 h-4 text-blue-600" />
                          ) : (
                            <Square className="w-4 h-4 text-slate-400" />
                          )}
                        </button>
                      )}
                    </th>
                  )}
                  <th
                    className={`py-3 px-3 text-center w-44 min-w-[150px] max-w-[170px] sticky ${
                      isDFIOrAdmin || isPresupuestoOrAdmin ? "left-12" : "left-0"
                    } z-20 bg-slate-50 border-r border-slate-200/80`}
                  >
                    NÚMERO QUIPUX
                  </th>
                  <th className="py-3 px-3 text-left w-28 min-w-[90px] max-w-[110px] whitespace-nowrap">GESTIÓN</th>
                  <th className="py-3 px-3.5 text-left min-w-[180px] max-w-[320px]">BENEFICIARIO / RUC</th>
                  <th className="py-3 px-3.5 text-left w-44 min-w-[140px] max-w-[200px]">TIPO DE PROCESO</th>
                  <th className="py-3 px-3 text-left w-40 min-w-[130px] max-w-[170px]">FUNCIONARIO</th>
                  <th className="py-3 px-3 text-right w-28 min-w-[100px]">MONTO TOTAL</th>
                  <th className="py-3 px-2 text-center w-24 min-w-[80px]">SLA (6D)</th>
                  <th className="py-3 px-3 text-center w-28 min-w-[100px]">ESTADO</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {tramites.map((t) => {
                  const isIngresado = t.estado_general === "INGRESADO";
                  const isAprobado = isTramitePagoAprobado(t);
                  const isDfiPendiente = isTramiteParaAutorizarDFI(t);
                  const canSelectIngresado = (isDFIOrAdmin || isPresupuestoOrAdmin) && isIngresado;
                  const canSelectAprobado = isDFIOrAdmin && isAprobado;
                  const canSelectDfi = isDirectoraOrAdmin && isDfiPendiente;
                  const disabledPorMezcla =
                    (isIngresado && selectedSonDePagoAprobado) ||
                    (isAprobado && selectedSonDeIngresados);
                  const canSelectThisRow = (canSelectIngresado || canSelectAprobado || canSelectDfi) && !disabledPorMezcla;
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
                      {/* Checkbox de selección */}
                      {(isDFIOrAdmin || isPresupuestoOrAdmin) && (
                        <td
                          className={`py-3.5 px-2 text-center align-middle w-12 min-w-[48px] max-w-[48px] sticky left-0 z-10 transition-colors ${
                            isSelected
                              ? "bg-blue-50 group-hover:bg-blue-100/90"
                              : "bg-white group-hover:bg-slate-50"
                          }`}
                          onClick={(e) => {
                            e.stopPropagation();
                            if (canSelectThisRow) toggleSelectOne(t.id_tramite);
                          }}
                        >
                          {canSelectThisRow ? (
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

                      {/* Número Quipux Sticky Left */}
                      <td
                        className={`py-3.5 px-3 align-middle text-center w-44 min-w-[150px] max-w-[170px] whitespace-nowrap sticky ${
                          isDFIOrAdmin || isPresupuestoOrAdmin ? "left-12" : "left-0"
                        } z-10 transition-colors border-r border-slate-200/80 ${
                          isSelected
                            ? "bg-blue-50 group-hover:bg-blue-100/90"
                            : "bg-white group-hover:bg-slate-50"
                        }`}
                      >
                        <div
                          className="font-mono font-bold text-blue-700 group-hover:text-blue-900 transition-colors text-xs max-w-[160px] truncate mx-auto"
                          title={t.numero_quipux}
                        >
                          {t.numero_quipux}
                        </div>
                        {(t.fecha_ingreso || t.fecha_recepcion_fisica || t.fecha_memorando) && (
                          <div
                            className="text-[10px] text-slate-400 font-mono mt-0.5 max-w-[160px] truncate mx-auto"
                            title={`Fecha de Ingreso: ${formatDate(
                              t.fecha_ingreso || t.fecha_recepcion_fisica || t.fecha_memorando
                            )}`}
                          >
                            {formatDate(t.fecha_ingreso || t.fecha_recepcion_fisica || t.fecha_memorando)}
                          </div>
                        )}
                      </td>

                      {/* Gestión */}
                      <td className="py-3.5 px-3 align-middle w-28 min-w-[90px] max-w-[110px] whitespace-nowrap">
                        <div className="flex flex-col gap-0.5">
                          <span className="text-[10px] uppercase font-bold text-slate-500 truncate">
                            {t.padre_gestion || t.tipo_flujo || "PAGO"}
                          </span>
                          <span className="font-semibold text-slate-800 text-[11px] truncate">
                            {t.tipo_gestion || "PAGO"}
                          </span>
                        </div>
                      </td>

                      {/* Beneficiario / RUC */}
                      <td className="py-3.5 px-3.5 align-middle min-w-[180px] max-w-[320px]">
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
                      <td className="py-3.5 px-3.5 align-middle w-44 min-w-[140px] max-w-[200px]">
                        <div
                          className="text-slate-800 uppercase line-clamp-2 leading-snug text-[11px] font-semibold"
                          title={t.tipos_tramite?.nombre || "CONTRATACIÓN"}
                        >
                          {t.tipos_tramite?.nombre || "CONTRATACIÓN"}
                        </div>
                      </td>

                      {/* Funcionario (Custodio Actual del Trámite) */}
                      <td className="py-3.5 px-3 align-middle w-40 min-w-[130px] max-w-[170px] whitespace-nowrap">
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
                      <td className="py-3.5 px-3 align-middle text-right whitespace-nowrap w-28 min-w-[100px]">
                        <div className="font-mono font-bold text-slate-900 text-xs">
                          {formatCurrency(t.monto_total || t.subtotal || 0)}
                        </div>
                      </td>

                      {/* Semáforo SLA */}
                      <td className="py-3.5 px-2 align-middle text-center whitespace-nowrap w-24 min-w-[80px]">
                        <SemaforoSLA sla={t.sla} />
                      </td>

                      {/* Estado Oficial & Indicador de Caja */}
                      <td className="py-3.5 px-3 align-middle text-center whitespace-nowrap w-28 min-w-[100px]">
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
          </>
        )}
      </div>
    </div>
  );
}
