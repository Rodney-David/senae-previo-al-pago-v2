"use client";

import React, { useState } from "react";
import {
  CheckCircle2,
  AlertCircle,
  ArrowLeftRight,
  Send,
  PauseCircle,
  PlayCircle,
  Archive,
  CreditCard,
  FileCheck,
  FileSpreadsheet,
  Ban,
  AlertTriangle,
  UserCheck,
  Trash2,
  FolderOpen,
  RotateCcw,
  CornerUpLeft,
} from "lucide-react";
import { TramiteCompletoDTO, UsuarioInstitucional } from "@/types";
import { ModalObservarTransversal } from "./modals/ModalObservarTransversal";
import { ModalLevantarObservacion } from "./modals/ModalLevantarObservacion";
import { ModalDeclararInsubsistente } from "./modals/ModalDeclararInsubsistente";
import { ModalRevertirInsubsistencia } from "./modals/ModalRevertirInsubsistencia";
import { ModalDevolucionFormal } from "./modals/ModalDevolucionFormal";
import { ModalDesarchivar } from "./modals/ModalDesarchivar";
import { ModalReanudarFactura } from "./modals/ModalReanudarFactura";
import { ModalReasignarInteligente } from "./modals/ModalReasignarInteligente";
import { ModalReasignarDerivar } from "./modals/ModalReasignarDerivar";
import { ModalDevolucionInterna, AccionDevolucionInterna } from "./modals/ModalDevolucionInterna";

interface BarraAccionesProps {
  tramite: TramiteCompletoDTO;
  currentUser: UsuarioInstitucional | null;
  onRefresh: () => void;
  onOpenEditPresupuesto?: () => void;
  onOpenEditContabilidad?: () => void;
  onOpenEditTesoreria?: () => void;
  onOpenEditArchivo?: () => void;
}

export const BarraAcciones: React.FC<BarraAccionesProps> = ({
  tramite,
  currentUser,
  onRefresh,
  onOpenEditPresupuesto,
  onOpenEditContabilidad,
  onOpenEditTesoreria,
  onOpenEditArchivo,
}) => {
  const [modalObsOpen, setModalObsOpen] = useState(false);
  const [modalLevantarObsOpen, setModalLevantarObsOpen] = useState(false);
  const [modalInsubsistenteOpen, setModalInsubsistenteOpen] = useState(false);
  const [modalRevertirInsubsistenciaOpen, setModalRevertirInsubsistenciaOpen] = useState(false);
  const [modalDevolucionOpen, setModalDevolucionOpen] = useState(false);
  const [modalDesarchivarOpen, setModalDesarchivarOpen] = useState(false);
  const [modalReanudarFacturaOpen, setModalReanudarFacturaOpen] = useState(false);
  const [modalReasignarInteligenteOpen, setModalReasignarInteligenteOpen] = useState(false);
  const [modalReasignarOpen, setModalReasignarOpen] = useState(false);
  const [modalDevolucionInternaOpen, setModalDevolucionInternaOpen] = useState(false);
  const [devolucionInternaConfig, setDevolucionInternaConfig] = useState<{
    accion: AccionDevolucionInterna;
    titulo: string;
    subtitulo: string;
    destinatario: string;
  }>({
    accion: "DEVOLVER_A_ANALISTA_PRESUPUESTO",
    titulo: "",
    subtitulo: "",
    destinatario: "",
  });

  const abrirDevolucionInterna = (
    accion: AccionDevolucionInterna,
    titulo: string,
    subtitulo: string,
    destinatario: string
  ) => {
    setDevolucionInternaConfig({ accion, titulo, subtitulo, destinatario });
    setModalDevolucionInternaOpen(true);
  };

  const [reasignacionAlerta, setReasignacionAlerta] = useState<string | undefined>();
  const [analistasDisponibles, setAnalistasDisponibles] = useState<UsuarioInstitucional[]>([]);

  const [loadingAction, setLoadingAction] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  if (!currentUser) return null;

  const handleAction = async (accion: string, datos?: Record<string, unknown>) => {
    setLoadingAction(true);
    setActionError(null);
    setActionSuccess(null);
    try {
      const res = await fetch(`/api/tramites/${tramite.id_tramite}/flujo`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accion, datos }),
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Error al ejecutar acción institucional");
      }

      // Si el endpoint solicita selección de analista por ausencia del titular
      if (data.requiere_reasignacion) {
        setReasignacionAlerta(data.mensaje);
        setAnalistasDisponibles(data.analistas_disponibles || []);
        setModalReasignarInteligenteOpen(true);
        return;
      }

      setActionSuccess("Acción ejecutada correctamente.");
      setTimeout(() => setActionSuccess(null), 3000);
      onRefresh();
    } catch (err: any) {
      setActionError(err.message);
    } finally {
      setLoadingAction(false);
    }
  };

  // Descarga del Acta Excel individual al entregar a Control Previo
  const handleEntregarControlPrevioIndividual = async () => {
    setLoadingAction(true);
    setActionError(null);
    try {
      const res = await fetch("/api/tramites/entregar-lote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: [tramite.id_tramite] }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Error al entregar a Control Previo");
      }

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `Acta_Entrega_${tramite.numero_quipux.replace(/[\/\\]/g, "_")}.xlsx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);

      onRefresh();
    } catch (err: any) {
      setActionError(err.message);
    } finally {
      setLoadingAction(false);
    }
  };

  const estado = tramite.estado_general ? tramite.estado_general.toUpperCase() : "INGRESADO";
  const isInsubsistente = estado === "INSUBSISTENTE";
  const isObservado = estado === "OBSERVADO" || estado === "OBSERVADO_72H";
  const isArchivado = estado === "ARCHIVO" || estado === "FINALIZADO_ARCHIVADO";
  const isDevuelto = estado === "DEVUELTO" || Boolean(tramite.es_devuelto);

  const isIngresado = estado === "INGRESADO";
  const isRevision = estado === "REVISION" && !tramite.esta_pausado;
  const isRevisado = estado === "REVISADO" && !tramite.esta_pausado;
  const isFactura = estado === "FACTURA" && !isObservado;
  const isContabilidad = estado === "CONTABILIDAD";
  const isDFI = estado === "DFI";
  const isPagoAprobado = estado === "PAGO_APROBADO" || tramite.sub_estado === "APROBADO_POR_ENTREGAR_TESORERIA";
  const isPagado = estado === "PAGADO";

  const isJefePresupuesto = currentUser.id_area === 2 && currentUser.rol === "JEFE";
  const isAnalistaPresupuesto = currentUser.id_area === 2 && currentUser.rol === "ANALISTA";
  const isContadorGeneral = currentUser.id_area === 3 && currentUser.rol === "JEFE";
  const isAnalistaContable = currentUser.id_area === 3 && currentUser.rol === "ANALISTA";
  const isDirectora = currentUser.rol === "DIRECTORA";
  const isAdmin = currentUser.rol === "ADMIN" || currentUser.rol === "ADMINISTRADOR";
  const isSecretaria = currentUser.id_area === 1 && (currentUser.rol === "SECRETARIA" || currentUser.rol === "SECRETARIA_DFI");
  const isDFIUser = isDirectora || isSecretaria || currentUser.id_area === 1;
  const canAnular = (isDFIUser || isAdmin) && !isArchivado && !isInsubsistente && estado !== "ANULADO";

  // Regla de empaque en Cajas: El archivo individual solo se permite si el trámite
  // ya pasó por Tesorería o si el usuario es Administrador.
  const yaPasoPorTesoreria = Boolean(
    tramite.fecha_pago ||
    tramite.autorizado_pago ||
    isPagado ||
    tramite.id_caja ||
    tramite.id_area_actual === 6
  );
  const canArchivarIndividual =
    !isArchivado &&
    ((yaPasoPorTesoreria && (currentUser.id_area === 6 || isAdmin)) || isAdmin);

  const handleAnular = async () => {
    if (!confirm(`¿ESTÁ SEGURO DE ANULAR EL TRÁMITE CON QUIPUX ${tramite.numero_quipux}?\nEsta acción marcará el trámite como ANULADO en el flujo institucional.`)) {
      return;
    }
    setLoadingAction(true);
    setActionError(null);
    try {
      const res = await fetch(`/api/tramites/${tramite.id_tramite}?rol=${currentUser.rol}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Error al anular trámite");
      }
      onRefresh();
    } catch (err: any) {
      setActionError(err.message);
    } finally {
      setLoadingAction(false);
    }
  };

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-3 sm:p-4 shadow-xs space-y-3 w-full max-w-full min-w-0">
      {/* Alerta si el trámite es INSUBSISTENTE */}
      {isInsubsistente && (
        <div className="p-3 bg-rose-50 border border-rose-300 rounded-lg text-rose-800 text-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 w-full max-w-full min-w-0">
          <div className="flex items-start gap-2.5">
            <Ban className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold block">EXPEDIENTE INSUBSISTENTE (NULIDAD DEFINITIVA)</span>
              <p className="mt-0.5 text-rose-700">
                {tramite.justificacion_insubsistencia || "Trámite declarado nulo por causal insubsanable. Flujo detenido permanentemente."}
              </p>
            </div>
          </div>
          <button
            onClick={() => setModalRevertirInsubsistenciaOpen(true)}
            className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg font-bold text-xs shrink-0 shadow-xs flex items-center gap-1.5"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Revertir Insubsistencia
          </button>
        </div>
      )}

      {/* Alerta si el trámite está ARCHIVADO */}
      {isArchivado && (
        <div className="p-3 bg-slate-100 border border-slate-300 rounded-lg text-slate-800 text-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 w-full max-w-full min-w-0">
          <div className="flex items-start gap-2.5 min-w-0">
            <Archive className="w-4 h-4 text-slate-600 shrink-0 mt-0.5" />
            <div className="min-w-0">
              <span className="font-bold block">EXPEDIENTE ARCHIVADO DEFINITIVAMENTE</span>
              <p className="mt-0.5 text-slate-600">
                {tramite.codigo_tomo_caja
                  ? `Almacenado físicamente en Tomo / Caja: ${tramite.codigo_tomo_caja}.`
                  : "Custodiado en Archivo Central. Ciclo completado."}
                {tramite.justificacion_desarchivo && (
                  <span className="block mt-0.5 italic text-amber-800">
                    Último desarchivo: {tramite.justificacion_desarchivo}
                  </span>
                )}
              </p>
            </div>
          </div>
          {(currentUser.id_area === 6 || currentUser.id_area === 4 || isAdmin) && (
            <button
              onClick={() => setModalDesarchivarOpen(true)}
              className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-bold text-xs shrink-0 shadow-xs flex items-center gap-1.5 whitespace-nowrap self-start sm:self-auto"
            >
              <FolderOpen className="w-3.5 h-3.5" />
              Desarchivar Expediente
            </button>
          )}
        </div>
      )}

      {/* Alerta si el trámite está DEVUELTO */}
      {isDevuelto && (
        <div className="p-3 bg-orange-50 border border-orange-300 rounded-lg text-orange-950 text-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 w-full max-w-full min-w-0">
          <div className="flex items-start gap-2.5 min-w-0">
            <CornerUpLeft className="w-4 h-4 text-orange-600 shrink-0 mt-0.5" />
            <div className="min-w-0">
              <span className="font-bold block uppercase tracking-wide">
                EXPEDIENTE DEVUELTO FORMALMENTE A LA ENTIDAD REQUIRENTE
              </span>
              <p className="mt-0.5 text-orange-800">
                {tramite.motivo_devolucion
                  ? `Memorando / Causal: ${tramite.motivo_devolucion}.`
                  : "Trámite devuelto formalmente a la unidad solicitante mediante memorando oficial. Flujo concluido fuera de la Dirección Financiera."}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Alerta si el trámite está OBSERVADO */}
      {isObservado && (
        <div className="p-3 bg-amber-50 border border-amber-300 rounded-lg text-amber-900 text-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 w-full max-w-full min-w-0">
          <div className="flex items-start gap-2.5 min-w-0">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div className="min-w-0">
              <span className="font-bold block">
                TRÁMITE OBSERVADO — Semáforo SLA Congelado (Fase previa: {tramite.estado_previo_observacion || "REVISION"})
              </span>
              <p className="mt-0.5 text-amber-800 italic">
                {tramite.motivo_observacion || tramite.motivo_pausa || "Novedad pendiente de subsanación externa con terceros o administrador de contrato."}
              </p>
            </div>
          </div>
          <button
            onClick={() => setModalLevantarObsOpen(true)}
            className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold text-xs shrink-0 shadow-xs flex items-center gap-1 whitespace-nowrap self-start sm:self-auto"
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            Levantar Observación
          </button>
        </div>
      )}

      {/* Alerta si el trámite está en espera de Factura */}
      {isFactura && (
        <div className="p-3 bg-amber-50 border border-amber-300 rounded-lg text-amber-900 text-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 w-full max-w-full min-w-0">
          <div className="flex items-start gap-2.5 min-w-0">
            <PauseCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div className="min-w-0">
              <span className="font-bold block">
                TRÁMITE EN ESTADO FACTURA — Semáforo SLA Pausado
              </span>
              <p className="mt-0.5 text-amber-800">
                El trámite fue revisado con visto bueno de Presupuesto y está en espera de factura tributaria SRI emitida por el proveedor.
              </p>
            </div>
          </div>
          <button
            onClick={() => setModalReanudarFacturaOpen(true)}
            className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold text-xs shrink-0 shadow-xs flex items-center gap-1 whitespace-nowrap self-start sm:self-auto"
          >
            <PlayCircle className="w-3.5 h-3.5" />
            Registrar Factura y Reanudar
          </button>
        </div>
      )}

      {actionError && (
        <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-lg font-medium">
          {actionError}
        </div>
      )}

      {actionSuccess && (
        <div className="p-2.5 bg-emerald-50 border border-emerald-300 text-emerald-800 text-xs rounded-lg font-semibold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          {actionSuccess}
        </div>
      )}

      {/* Fila principal de botones de acción */}
      {!isInsubsistente && !isDevuelto && (
        <div className="w-full max-w-full min-w-0 overflow-x-auto flex-nowrap sm:flex-wrap flex items-center justify-start sm:justify-end gap-2 pb-1.5 sm:pb-0">
            {/* 1. ESTADO INGRESADO (Secretaría DFI / Recepción física en Presupuesto) */}
            {isIngresado && (
              <div className="flex items-center gap-2 shrink-0 flex-nowrap sm:flex-wrap">
                {(isSecretaria || isDirectora || isAdmin) && tramite.id_area_actual === 1 && (
                  <>
                    <button
                      onClick={async () => {
                        setLoadingAction(true);
                        setActionError(null);
                        try {
                          const res = await fetch("/api/tramites/entregar-lote", {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ ids: [tramite.id_tramite], accion: "EXCEL" }),
                          });
                          if (!res.ok) throw new Error("Error al descargar Acta Excel");
                          const blob = await res.blob();
                          const url = window.URL.createObjectURL(blob);
                          const a = document.createElement("a");
                          a.href = url;
                          a.download = `Acta_Entrega_${tramite.numero_quipux.replace(/[\/\\]/g, "_")}.xlsx`;
                          document.body.appendChild(a);
                          a.click();
                          a.remove();
                          window.URL.revokeObjectURL(url);
                        } catch (err: any) {
                          setActionError(err.message);
                        } finally {
                          setLoadingAction(false);
                        }
                      }}
                      disabled={loadingAction}
                      className="px-3 py-1.5 text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 rounded-lg transition-colors flex items-center gap-1.5 shadow-2xs shrink-0 whitespace-nowrap"
                      title="Descargar y verificar Acta Excel antes de entregar"
                    >
                      <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                      Descargar Acta
                    </button>
                    <button
                      onClick={handleEntregarControlPrevioIndividual}
                      disabled={loadingAction}
                      className="px-3.5 py-1.5 text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors flex items-center gap-1.5 shadow-xs shrink-0 whitespace-nowrap"
                    >
                      <Send className="w-3.5 h-3.5" />
                      Entregar Trámite
                    </button>
                  </>
                )}

                {/* Si ya fue entregado a Presupuesto y está pendiente de recibir físicamente */}
                {(isJefePresupuesto || isAnalistaPresupuesto || isAdmin) && tramite.id_area_actual === 2 && (
                  <button
                    onClick={() => handleAction("RECIBIR_FISICAMENTE")}
                    disabled={loadingAction}
                    className="px-3.5 py-1.5 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors flex items-center gap-1.5 shadow-xs shrink-0 whitespace-nowrap"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Recibir Físicamente
                  </button>
                )}
              </div>
            )}

            {/* 2. ESTADO REVISION (Presupuesto) */}
            {isRevision && (isJefePresupuesto || isAnalistaPresupuesto || isAdmin) && (
              <>
                {onOpenEditPresupuesto && (
                  <button
                    onClick={onOpenEditPresupuesto}
                    className="px-3 py-1.5 text-xs font-medium bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg transition-colors border border-slate-300 shrink-0 whitespace-nowrap"
                  >
                    Registrar Datos
                  </button>
                )}

                {/* Si es analista, verificar si ya fue enviado a visto bueno */}
                {isAnalistaPresupuesto && (
                  tramite.sub_estado === "PENDIENTE_VISTO_BUENO_JEFE" ||
                  tramite.sub_estado === "ENVIADO_A_JEFATURA" ? (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-amber-50 text-amber-800 border border-amber-300 shadow-2xs shrink-0 whitespace-nowrap">
                      <UserCheck className="w-3.5 h-3.5 text-amber-600" />
                      En Revisión de Jefatura
                    </span>
                  ) : (
                    <button
                      onClick={() => handleAction("ENVIAR_A_JEFATURA_PRESUPUESTO")}
                      disabled={loadingAction}
                      className="px-3 py-1.5 text-xs font-bold bg-indigo-50 hover:bg-indigo-100 text-indigo-800 rounded-lg transition-colors border border-indigo-300 flex items-center gap-1 shadow-2xs shrink-0 whitespace-nowrap"
                    >
                      <Send className="w-3.5 h-3.5" />
                      Enviar Jefe
                    </button>
                  )
                )}

                {/* Visto bueno y Devolución interna de la Jefa */}
                {(isJefePresupuesto || isAdmin) && (
                  <>
                    <button
                      onClick={() =>
                        abrirDevolucionInterna(
                          "DEVOLVER_A_ANALISTA_PRESUPUESTO",
                          "Devolver a Analista de Presupuesto",
                          "Control Previo — Revisión interna de Jefatura",
                          "el analista de presupuesto asignado"
                        )
                      }
                      disabled={loadingAction}
                      className="px-3.5 py-1.5 text-xs font-bold bg-amber-50 hover:bg-amber-100 text-amber-800 rounded-lg transition-colors border border-amber-300 flex items-center gap-1.5 shadow-2xs shrink-0 whitespace-nowrap"
                      title="Devolver trámite al analista con observaciones para subsanación interna"
                    >
                      <RotateCcw className="w-3.5 h-3.5 text-amber-600" />
                      Devolver a Analista
                    </button>
                    <button
                      onClick={() => handleAction("APROBAR_JEFE_PRESUPUESTO")}
                      disabled={loadingAction}
                      className="px-3.5 py-1.5 text-xs font-bold bg-teal-600 hover:bg-teal-700 text-white rounded-lg transition-colors flex items-center gap-1.5 shadow-xs shrink-0 whitespace-nowrap"
                    >
                      <FileCheck className="w-3.5 h-3.5" />
                      Visto Bueno
                    </button>
                  </>
                )}
              </>
            )}

            {/* 3. ESTADO REVISADO (En manos de Presupuesto para Factura o Despacho) */}
            {isRevisado && (isJefePresupuesto || isAnalistaPresupuesto || isAdmin) && (
              <>
                {/* Botón Pausa Factura */}
                <button
                  onClick={() => handleAction("PAUSAR_ESPERA_FACTURA")}
                  disabled={loadingAction}
                  className="px-3 py-1.5 text-xs font-medium bg-amber-50 hover:bg-amber-100 text-amber-800 rounded-lg transition-colors border border-amber-300 flex items-center gap-1 shrink-0 whitespace-nowrap"
                >
                  <PauseCircle className="w-3.5 h-3.5 text-amber-600" />
                  Espera Factura
                </button>

                {/* Derivar a Contabilidad */}
                <button
                  onClick={() => handleAction("DERIVAR_A_CONTABILIDAD")}
                  disabled={loadingAction || !tramite.numero_factura}
                  title={
                    !tramite.numero_factura
                      ? "Se requiere registrar el número de factura para despachar a Contabilidad"
                      : ""
                  }
                  className="px-3.5 py-1.5 text-xs font-bold bg-purple-600 hover:bg-purple-700 disabled:bg-slate-300 disabled:text-slate-500 text-white rounded-lg transition-colors flex items-center gap-1.5 shadow-xs shrink-0 whitespace-nowrap"
                >
                  <Send className="w-3.5 h-3.5" />
                  A Contabilidad
                </button>
              </>
            )}

            {/* 4. ESTADO FACTURA */}
            {isFactura && (isJefePresupuesto || isAnalistaPresupuesto || isAdmin) && (
              <button
                onClick={() => setModalReanudarFacturaOpen(true)}
                disabled={loadingAction}
                className="px-3.5 py-1.5 text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors flex items-center gap-1.5 shadow-xs shrink-0 whitespace-nowrap"
              >
                <PlayCircle className="w-3.5 h-3.5" />
                Reanudar Factura
              </button>
            )}

            {/* 5. ESTADO CONTABILIDAD */}
            {isContabilidad && (isContadorGeneral || isAnalistaContable || isAdmin) && (
              <>
                {onOpenEditContabilidad && (
                  <button
                    onClick={onOpenEditContabilidad}
                    className="px-3 py-1.5 text-xs font-medium bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg transition-colors border border-slate-300 shrink-0 whitespace-nowrap"
                  >
                    Registrar Devengado
                  </button>
                )}

                {/* Analista Contable: Enviar a Jefatura para Aprobación */}
                {isAnalistaContable && (
                  tramite.sub_estado === "PENDIENTE_VISTO_BUENO_JEFE" ||
                  tramite.sub_estado === "PENDIENTE_APROBACION_CONTABLE" ||
                  tramite.sub_estado === "ENVIADO_A_JEFATURA" ? (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-amber-50 text-amber-800 border border-amber-300 shadow-2xs shrink-0 whitespace-nowrap">
                      <UserCheck className="w-3.5 h-3.5 text-amber-600" />
                      En Revisión de Jefatura
                    </span>
                  ) : (
                    <button
                      onClick={() => handleAction("ENVIAR_A_JEFATURA_CONTABILIDAD")}
                      disabled={loadingAction}
                      className="px-3.5 py-1.5 text-xs font-bold bg-indigo-50 hover:bg-indigo-100 text-indigo-800 rounded-lg transition-colors border border-indigo-300 flex items-center gap-1.5 shadow-2xs shrink-0 whitespace-nowrap"
                      title="Remitir expediente al Contador General para revisión y visto bueno de devengado"
                    >
                      <Send className="w-3.5 h-3.5" />
                      Enviar Jefe
                    </button>
                  )
                )}

                {/* Contador General aprueba o devuelve al analista contable */}
                {(isContadorGeneral || isAdmin) && (
                  <>
                    <button
                      onClick={() =>
                        abrirDevolucionInterna(
                          "DEVOLVER_A_ANALISTA_CONTABLE",
                          "Devolver a Analista Contable",
                          "Contabilidad — Revisión interna de Devengado / CUR",
                          "el analista contable asignado"
                        )
                      }
                      disabled={loadingAction}
                      className="px-3.5 py-1.5 text-xs font-bold bg-amber-50 hover:bg-amber-100 text-amber-800 rounded-lg transition-colors border border-amber-300 flex items-center gap-1.5 shadow-2xs shrink-0 whitespace-nowrap"
                      title="Devolver expediente al analista contable con observaciones"
                    >
                      <RotateCcw className="w-3.5 h-3.5 text-amber-600" />
                      Devolver a Analista Contable
                    </button>
                    <button
                      onClick={() => handleAction("APROBAR_Y_DERIVAR_A_DFI")}
                      disabled={loadingAction}
                      className="px-3.5 py-1.5 text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors flex items-center gap-1.5 shadow-xs shrink-0 whitespace-nowrap"
                      title="Aprobar registro contable y derivar a Dirección Financiera para autorización de pago"
                    >
                      <Send className="w-3.5 h-3.5" />
                      Aprobar DFI
                    </button>
                  </>
                )}
              </>
            )}

            {/* 6. ESTADO DFI (Dirección Financiera / Autorización de Pago) */}
            {isDFI && (isDirectora || isAdmin) && (
              <>
                <button
                  onClick={() =>
                    abrirDevolucionInterna(
                      "DEVOLVER_A_CONTABILIDAD",
                      "Devolver a Contabilidad",
                      "Dirección Financiera — Reingreso a Jefatura Contable",
                      "el área de Contabilidad"
                    )
                  }
                  disabled={loadingAction}
                  className="px-3.5 py-1.5 text-xs font-bold bg-amber-50 hover:bg-amber-100 text-amber-800 rounded-lg transition-colors border border-amber-300 flex items-center gap-1.5 shadow-2xs shrink-0 whitespace-nowrap"
                  title="Devolver expediente a Contabilidad para subsanación o corrección técnica"
                >
                  <RotateCcw className="w-3.5 h-3.5 text-amber-600" />
                  Devolver a Contabilidad
                </button>
                <button
                  onClick={() => handleAction("AUTORIZAR_Y_DERIVAR_A_TESORERIA")}
                  disabled={loadingAction}
                  className="px-4 py-1.5 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors flex items-center gap-1.5 shadow-xs shrink-0 whitespace-nowrap"
                >
                  <CreditCard className="w-4 h-4" />
                  Autorizar Pago
                </button>
              </>
            )}

            {/* 6.1 ESTADO PAGO_APROBADO (Secretaría DFI -> Entrega a Tesorería) */}
            {isPagoAprobado && (
              <div className="flex items-center gap-2 shrink-0 flex-nowrap sm:flex-wrap">
                {(isSecretaria || isDirectora || isAdmin) && tramite.id_area_actual === 1 && (
                  <>
                    <button
                      onClick={async () => {
                        setLoadingAction(true);
                        setActionError(null);
                        try {
                          const res = await fetch("/api/tramites/entregar-tesoreria-lote", {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ ids: [tramite.id_tramite], accion: "EXCEL" }),
                          });
                          if (!res.ok) throw new Error("Error al descargar Acta Excel");
                          const blob = await res.blob();
                          const url = window.URL.createObjectURL(blob);
                          const a = document.createElement("a");
                          a.href = url;
                          a.download = `Acta_Entrega_Tesoreria_${tramite.numero_quipux.replace(/[\/\\]/g, "_")}.xlsx`;
                          document.body.appendChild(a);
                          a.click();
                          a.remove();
                          window.URL.revokeObjectURL(url);
                        } catch (err: any) {
                          setActionError(err.message);
                        } finally {
                          setLoadingAction(false);
                        }
                      }}
                      disabled={loadingAction}
                      className="px-3 py-1.5 text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 rounded-lg transition-colors flex items-center gap-1.5 shadow-2xs shrink-0 whitespace-nowrap"
                      title="Descargar Acta oficial de entrega a Tesorería en Excel"
                    >
                      <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                      Descargar Acta
                    </button>
                    <button
                      onClick={() => handleAction("ENTREGAR_A_TESORERIA")}
                      disabled={loadingAction}
                      className="px-4 py-1.5 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors flex items-center gap-1.5 shadow-xs shrink-0 whitespace-nowrap"
                      title="Entregar formalmente expediente a Tesorería / Pagos"
                    >
                      <Send className="w-3.5 h-3.5" />
                      Entregar a Tesorería
                    </button>
                  </>
                )}
              </div>
            )}

            {/* 7. EN TESORERIA O COBRANZAS (Se mantiene en DFI o pasa a PAGADO) */}
            {(tramite.id_area_actual === 4 || tramite.id_area_actual === 5) && (
              <>
                {onOpenEditTesoreria && (
                  <button
                    onClick={onOpenEditTesoreria}
                    className="px-3.5 py-1.5 text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors flex items-center gap-1.5 shadow-xs shrink-0 whitespace-nowrap"
                  >
                    <CreditCard className="w-3.5 h-3.5" />
                    Registrar Pago / Cobranza
                  </button>
                )}
              </>
            )}

            {/* 8. ESTADO PAGADO -> ARCHIVO (Condicionado a paso por Tesorería o Administrador) */}
            {canArchivarIndividual && (
              <>
                {onOpenEditArchivo && (
                  <button
                    onClick={onOpenEditArchivo}
                    className="px-3.5 py-1.5 text-xs font-bold bg-slate-800 hover:bg-slate-900 text-white rounded-lg transition-colors flex items-center gap-1.5 shadow-xs shrink-0 whitespace-nowrap"
                    title={isAdmin ? "Archivar trámite (Privilegio Administrador)" : "Archivar expediente físico custodiado en Archivo Central"}
                  >
                    <Archive className="w-3.5 h-3.5" />
                    Archivar Trámite
                  </button>
                )}
              </>
            )}

            {/* ACCIONES TRANSVERSALES: OBSERVADO & INSUBSISTENTE */}
            {!isArchivado && !isObservado && (
              <>
                <button
                  onClick={() => setModalObsOpen(true)}
                  className="px-3 py-1.5 text-xs font-medium bg-amber-50 hover:bg-amber-100 text-amber-800 rounded-lg transition-colors border border-amber-300 flex items-center gap-1 shrink-0 whitespace-nowrap"
                >
                  <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
                  Observar Trámite
                </button>

                {/* Insubsistente exclusivo de Presupuesto (id_area === 2) o Admin */}
                {(isJefePresupuesto || isAnalistaPresupuesto || isAdmin) && (
                  <button
                    onClick={() => setModalInsubsistenteOpen(true)}
                    className="px-3 py-1.5 text-xs font-medium bg-rose-50 hover:bg-rose-100 text-rose-800 rounded-lg transition-colors border border-rose-300 flex items-center gap-1 shrink-0 whitespace-nowrap"
                  >
                    <Ban className="w-3.5 h-3.5 text-rose-600" />
                    Declarar Insubsistente
                  </button>
                )}

                {/* Devolución Formal mediante Quipux */}
                <button
                  onClick={() => setModalDevolucionOpen(true)}
                  className="px-3 py-1.5 text-xs font-medium bg-orange-50 hover:bg-orange-100 text-orange-800 rounded-lg transition-colors border border-orange-300 flex items-center gap-1 shrink-0 whitespace-nowrap"
                  title="Devolución formal del expediente con memorando Quipux"
                >
                  <CornerUpLeft className="w-3.5 h-3.5 text-orange-600" />
                  Devolver Formalmente
                </button>

                {canAnular && (
                  <button
                    onClick={handleAnular}
                    disabled={loadingAction}
                    className="px-3 py-1.5 text-xs font-medium bg-red-100 hover:bg-red-200 text-red-800 rounded-lg transition-colors border border-red-300 flex items-center gap-1 shrink-0 whitespace-nowrap"
                    title="Anular formalmente el expediente (DFI / Administración)"
                  >
                    <Trash2 className="w-3.5 h-3.5 text-red-600" />
                    Anular Trámite
                  </button>
                )}
              </>
            )}

            {/* Reasignar Analista / Custodio Libre */}
            {!isArchivado && (
              <button
                onClick={() => setModalReasignarOpen(true)}
                className="px-3 py-1.5 text-xs font-medium bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-colors border border-slate-300 flex items-center gap-1 shrink-0 whitespace-nowrap"
              >
                <ArrowLeftRight className="w-3.5 h-3.5 text-slate-500" />
                Reasignar Custodio
              </button>
            )}
          </div>
      )}

      {/* Modales */}
      <ModalObservarTransversal
        isOpen={modalObsOpen}
        onClose={() => setModalObsOpen(false)}
        idTramite={tramite.id_tramite}
        estadoActual={estado}
        onSuccess={onRefresh}
      />

      <ModalLevantarObservacion
        isOpen={modalLevantarObsOpen}
        onClose={() => setModalLevantarObsOpen(false)}
        idTramite={tramite.id_tramite}
        motivoOriginal={tramite.motivo_observacion}
        estadoPrevio={tramite.estado_previo_observacion}
        onSuccess={onRefresh}
      />

      <ModalDeclararInsubsistente
        isOpen={modalInsubsistenteOpen}
        onClose={() => setModalInsubsistenteOpen(false)}
        idTramite={tramite.id_tramite}
        codigoTramite={tramite.numero_quipux}
        onSuccess={onRefresh}
      />

      <ModalRevertirInsubsistencia
        isOpen={modalRevertirInsubsistenciaOpen}
        onClose={() => setModalRevertirInsubsistenciaOpen(false)}
        idTramite={tramite.id_tramite}
        codigoTramite={tramite.numero_quipux}
        onSuccess={onRefresh}
      />

      <ModalDevolucionFormal
        isOpen={modalDevolucionOpen}
        onClose={() => setModalDevolucionOpen(false)}
        idTramite={tramite.id_tramite}
        onSuccess={onRefresh}
      />

      <ModalDesarchivar
        isOpen={modalDesarchivarOpen}
        onClose={() => setModalDesarchivarOpen(false)}
        idTramite={tramite.id_tramite}
        codigoTramite={tramite.numero_quipux}
        onSuccess={onRefresh}
      />

      <ModalReanudarFactura
        isOpen={modalReanudarFacturaOpen}
        onClose={() => setModalReanudarFacturaOpen(false)}
        idTramite={tramite.id_tramite}
        onSuccess={onRefresh}
      />

      <ModalReasignarInteligente
        isOpen={modalReasignarInteligenteOpen}
        onClose={() => setModalReasignarInteligenteOpen(false)}
        idTramite={tramite.id_tramite}
        mensajeAlerta={reasignacionAlerta}
        analistasDisponibles={analistasDisponibles}
        onSuccess={onRefresh}
      />

      <ModalReasignarDerivar
        isOpen={modalReasignarOpen}
        onClose={() => setModalReasignarOpen(false)}
        tramite={tramite}
        currentUser={currentUser}
        onRefresh={onRefresh}
      />

      <ModalDevolucionInterna
        isOpen={modalDevolucionInternaOpen}
        onClose={() => setModalDevolucionInternaOpen(false)}
        idTramite={tramite.id_tramite}
        codigoTramite={tramite.numero_quipux}
        accion={devolucionInternaConfig.accion}
        titulo={devolucionInternaConfig.titulo}
        subtitulo={devolucionInternaConfig.subtitulo}
        destinatario={devolucionInternaConfig.destinatario}
        onSuccess={onRefresh}
      />
    </div>
  );
};

