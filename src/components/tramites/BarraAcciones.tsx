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
} from "lucide-react";
import { TramiteCompletoDTO, UsuarioInstitucional } from "@/types";
import { ModalObservarTransversal } from "./ModalObservarTransversal";
import { ModalLevantarObservacion } from "./ModalLevantarObservacion";
import { ModalDeclararInsubsistente } from "./ModalDeclararInsubsistente";
import { ModalReanudarFactura } from "./ModalReanudarFactura";
import { ModalReasignarInteligente } from "./ModalReasignarInteligente";
import { ModalReasignarDerivar } from "./ModalReasignarDerivar";

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
  const [modalReanudarFacturaOpen, setModalReanudarFacturaOpen] = useState(false);
  const [modalReasignarInteligenteOpen, setModalReasignarInteligenteOpen] = useState(false);
  const [modalReasignarOpen, setModalReasignarOpen] = useState(false);

  const [reasignacionAlerta, setReasignacionAlerta] = useState<string | undefined>();
  const [analistasDisponibles, setAnalistasDisponibles] = useState<any[]>([]);

  const [loadingAction, setLoadingAction] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  if (!currentUser) return null;

  const handleAction = async (accion: string, datos?: Record<string, unknown>) => {
    setLoadingAction(true);
    setActionError(null);
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
      a.download = `Acta_Entrega_${tramite.codigo_tramite}.xlsx`;
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

  const isIngresado = estado === "INGRESADO";
  const isRevision = estado === "REVISION";
  const isRevisado = estado === "REVISADO";
  const isFactura = estado === "FACTURA";
  const isContabilidad = estado === "CONTABILIDAD";
  const isDFI = estado === "DFI";
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

  const handleAnular = async () => {
    if (!confirm(`¿ESTÁ SEGURO DE ANULAR EL TRÁMITE ${tramite.codigo_tramite}?\nEsta acción marcará el trámite como ANULADO en el flujo institucional.`)) {
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
    <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs space-y-3">
      {/* Alerta si el trámite es INSUBSISTENTE */}
      {isInsubsistente && (
        <div className="p-3 bg-rose-50 border border-rose-300 rounded-lg text-rose-800 text-xs flex items-start gap-2.5">
          <Ban className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
          <div>
            <span className="font-bold block">EXPEDIENTE INSUBSISTENTE (NULIDAD DEFINITIVA)</span>
            <p className="mt-0.5 text-rose-700">
              {tramite.justificacion_insubsistencia || "Trámite declarado nulo por causal insubsanable. Flujo detenido permanentemente."}
            </p>
          </div>
        </div>
      )}

      {/* Alerta si el trámite está OBSERVADO */}
      {isObservado && (
        <div className="p-3 bg-amber-50 border border-amber-300 rounded-lg text-amber-900 text-xs flex items-start justify-between gap-3">
          <div className="flex items-start gap-2.5">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div>
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
            className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold text-xs shrink-0 shadow-xs flex items-center gap-1"
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            Levantar Observación
          </button>
        </div>
      )}

      {/* Alerta si el trámite está en espera de Factura */}
      {isFactura && (
        <div className="p-3 bg-amber-50 border border-amber-300 rounded-lg text-amber-900 text-xs flex items-start justify-between gap-3">
          <div className="flex items-start gap-2.5">
            <PauseCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div>
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
            className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold text-xs shrink-0 shadow-xs flex items-center gap-1"
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

      {/* Fila principal de botones de acción */}
      {!isInsubsistente && (
        <div className="flex flex-wrap items-center justify-end gap-2">
            {/* 1. ESTADO INGRESADO (Secretaría DFI) */}
            {isIngresado && (isSecretaria || isDirectora || isAdmin) && (
              <button
                onClick={handleEntregarControlPrevioIndividual}
                disabled={loadingAction}
                className="px-3.5 py-1.5 text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors flex items-center gap-1.5 shadow-xs"
              >
                <FileSpreadsheet className="w-3.5 h-3.5" />
                Entregar a Control Previo (Descargar Acta)
              </button>
            )}

            {/* 2. ESTADO REVISION (Presupuesto) */}
            {isRevision && (isJefePresupuesto || isAnalistaPresupuesto || isAdmin) && (
              <>
                {onOpenEditPresupuesto && (
                  <button
                    onClick={onOpenEditPresupuesto}
                    className="px-3 py-1.5 text-xs font-medium bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg transition-colors border border-slate-300"
                  >
                    Registrar Datos / CUR Compromiso
                  </button>
                )}

                {/* Si es analista, botón para enviar a visto bueno de la Jefa */}
                {isAnalistaPresupuesto && (
                  <button
                    onClick={() => handleAction("ENVIAR_A_JEFATURA_PRESUPUESTO")}
                    disabled={loadingAction}
                    className="px-3 py-1.5 text-xs font-medium bg-indigo-50 hover:bg-indigo-100 text-indigo-800 rounded-lg transition-colors border border-indigo-300 flex items-center gap-1"
                  >
                    <Send className="w-3.5 h-3.5" />
                    Enviar a Jefatura para Visto Bueno
                  </button>
                )}

                {/* Visto bueno de la Jefa: "Revisado" */}
                {(isJefePresupuesto || isAdmin) && (
                  <button
                    onClick={() => handleAction("APROBAR_JEFE_PRESUPUESTO")}
                    disabled={loadingAction}
                    className="px-3.5 py-1.5 text-xs font-bold bg-teal-600 hover:bg-teal-700 text-white rounded-lg transition-colors flex items-center gap-1.5 shadow-xs"
                  >
                    <FileCheck className="w-3.5 h-3.5" />
                    Emitir Visto Bueno (Revisado)
                  </button>
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
                  className="px-3 py-1.5 text-xs font-medium bg-amber-50 hover:bg-amber-100 text-amber-800 rounded-lg transition-colors border border-amber-300 flex items-center gap-1"
                >
                  <PauseCircle className="w-3.5 h-3.5 text-amber-600" />
                  Espera Factura (Pausar SLA)
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
                  className="px-3.5 py-1.5 text-xs font-bold bg-purple-600 hover:bg-purple-700 disabled:bg-slate-300 disabled:text-slate-500 text-white rounded-lg transition-colors flex items-center gap-1.5 shadow-xs"
                >
                  <Send className="w-3.5 h-3.5" />
                  Derivar a Contabilidad
                </button>
              </>
            )}

            {/* 4. ESTADO FACTURA */}
            {isFactura && (isJefePresupuesto || isAnalistaPresupuesto || isAdmin) && (
              <button
                onClick={() => setModalReanudarFacturaOpen(true)}
                disabled={loadingAction}
                className="px-3.5 py-1.5 text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors flex items-center gap-1.5 shadow-xs"
              >
                <PlayCircle className="w-3.5 h-3.5" />
                Factura Recibida: Reanudar
              </button>
            )}

            {/* 5. ESTADO CONTABILIDAD */}
            {isContabilidad && (isContadorGeneral || isAnalistaContable || isAdmin) && (
              <>
                {onOpenEditContabilidad && (
                  <button
                    onClick={onOpenEditContabilidad}
                    className="px-3 py-1.5 text-xs font-medium bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg transition-colors border border-slate-300"
                  >
                    Registrar Devengado / Retenciones
                  </button>
                )}

                {/* Contador General aprueba y deriva a DFI */}
                {(isContadorGeneral || isAdmin) && (
                  <button
                    onClick={() => handleAction("APROBAR_Y_DERIVAR_A_DFI")}
                    disabled={loadingAction}
                    className="px-3.5 py-1.5 text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors flex items-center gap-1.5 shadow-xs"
                  >
                    <Send className="w-3.5 h-3.5" />
                    Aprobar y Derivar a Dirección Financiera (DFI)
                  </button>
                )}
              </>
            )}

            {/* 6. ESTADO DFI (Dirección Financiera / Autorización de Pago) */}
            {isDFI && (isDirectora || isAdmin) && (
              <button
                onClick={() => handleAction("AUTORIZAR_Y_DERIVAR_A_TESORERIA")}
                disabled={loadingAction}
                className="px-4 py-1.5 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors flex items-center gap-1.5 shadow-xs"
              >
                <CreditCard className="w-4 h-4" />
                Autorizar Pago y Despachar a Tesorería
              </button>
            )}

            {/* 7. EN TESORERIA (Se mantiene en DFI o pasa a PAGADO) */}
            {tramite.id_area_actual === 4 && (
              <>
                {onOpenEditTesoreria && (
                  <button
                    onClick={onOpenEditTesoreria}
                    className="px-3.5 py-1.5 text-xs font-medium bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors flex items-center gap-1.5 shadow-xs"
                  >
                    <CreditCard className="w-3.5 h-3.5" />
                    Registrar Lote MEF y Transferencia SPI-BCE
                  </button>
                )}
              </>
            )}

            {/* 8. ESTADO PAGADO -> ARCHIVO */}
            {(isPagado || tramite.id_area_actual === 6) && !isArchivado && (
              <>
                {onOpenEditArchivo && (
                  <button
                    onClick={onOpenEditArchivo}
                    className="px-3.5 py-1.5 text-xs font-bold bg-slate-800 hover:bg-slate-900 text-white rounded-lg transition-colors flex items-center gap-1.5 shadow-xs"
                  >
                    <Archive className="w-3.5 h-3.5" />
                    Archivar Trámite (Custodia Definitiva)
                  </button>
                )}
              </>
            )}

            {/* ACCIONES TRANSVERSALES: OBSERVADO & INSUBSISTENTE */}
            {!isArchivado && !isObservado && (
              <>
                <button
                  onClick={() => setModalObsOpen(true)}
                  className="px-3 py-1.5 text-xs font-medium bg-amber-50 hover:bg-amber-100 text-amber-800 rounded-lg transition-colors border border-amber-300 flex items-center gap-1"
                >
                  <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
                  Observar Trámite
                </button>

                <button
                  onClick={() => setModalInsubsistenteOpen(true)}
                  className="px-3 py-1.5 text-xs font-medium bg-rose-50 hover:bg-rose-100 text-rose-800 rounded-lg transition-colors border border-rose-300 flex items-center gap-1"
                >
                  <Ban className="w-3.5 h-3.5 text-rose-600" />
                  Declarar Insubsistente
                </button>

                {canAnular && (
                  <button
                    onClick={handleAnular}
                    disabled={loadingAction}
                    className="px-3 py-1.5 text-xs font-medium bg-red-100 hover:bg-red-200 text-red-800 rounded-lg transition-colors border border-red-300 flex items-center gap-1"
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
                className="px-3 py-1.5 text-xs font-medium bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-colors border border-slate-300 flex items-center gap-1"
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
        codigoTramite={tramite.codigo_tramite}
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
    </div>
  );
};
