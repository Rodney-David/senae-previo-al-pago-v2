"use client";

import React, { useState } from "react";
import {
  CheckCircle2,
  AlertCircle,
  ArrowLeftRight,
  Undo2,
  Send,
  PauseCircle,
  PlayCircle,
  Archive,
  CreditCard,
  FileCheck,
  RotateCcw,
} from "lucide-react";
import { TramiteCompletoDTO, UsuarioInstitucional } from "@/types";
import { ModalObservacion72h } from "./ModalObservacion72h";
import { ModalDevolucionFormal } from "./ModalDevolucionFormal";
import { ModalSolicitarDevolucion } from "./ModalSolicitarDevolucion";
import { ModalSubsanar } from "./ModalSubsanar";
import { ModalReasignarDerivar } from "./ModalReasignarDerivar";
import { ModalReingresoAlcance } from "./ModalReingresoAlcance";

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
  const [modalDevOpen, setModalDevOpen] = useState(false);
  const [modalSolicitarDevOpen, setModalSolicitarDevOpen] = useState(false);
  const [modalSubsanarOpen, setModalSubsanarOpen] = useState(false);
  const [modalDerivarOpen, setModalDerivarOpen] = useState(false);
  const [modalAlcanceOpen, setModalAlcanceOpen] = useState(false);
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
      if (!res.ok) throw new Error(data.error || "Error al ejecutar acción institucional");
      onRefresh();
    } catch (err: any) {
      setActionError(err.message);
    } finally {
      setLoadingAction(false);
    }
  };

  const handleTogglePausaFactura = async () => {
    setLoadingAction(true);
    setActionError(null);
    try {
      const accion = tramite.esta_pausado ? "REANUDAR" : "PAUSAR";
      const res = await fetch(`/api/tramites/${tramite.id_tramite}/pausa-factura`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accion }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Error al alternar pausa de factura");
      onRefresh();
    } catch (err: any) {
      setActionError(err.message);
    } finally {
      setLoadingAction(false);
    }
  };

  // Buscar si hay observación pendiente
  const observacionPendiente = tramite.observaciones?.find(
    (o) => o.estado_observacion === "PENDIENTE"
  );

  const isInPresupuesto = tramite.id_area_actual === 2;
  const isInContabilidad = tramite.id_area_actual === 3;
  const isInDFIPago = tramite.id_area_actual === 1 && tramite.estado_general === "EN_AUTORIZACION_DFI";
  const isInTesoreria = tramite.id_area_actual === 4;
  const isInArchivo = tramite.id_area_actual === 6;

  const isJefePresupuesto = currentUser.id_area === 2 && currentUser.rol === "JEFE";
  const isAnalistaPresupuesto = currentUser.id_area === 2 && currentUser.rol === "ANALISTA";
  const isContadorGeneral = currentUser.id_area === 3 && currentUser.rol === "JEFE";
  const isAnalistaContable = currentUser.id_area === 3 && currentUser.rol === "ANALISTA";
  const isDirectora = currentUser.rol === "DIRECTORA";
  const isAdmin = currentUser.rol === "ADMIN";

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Acciones Autorizadas:
          </span>
          <span className="text-xs px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-medium">
            {currentUser.cargo}
          </span>
        </div>

        {/* Acciones principales dinámicas */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Si hay una observación pendiente dirigida a esta área */}
          {observacionPendiente && (
            <button
              onClick={() => setModalSubsanarOpen(true)}
              className="px-3.5 py-1.5 text-xs font-medium bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors flex items-center gap-1.5 shadow-xs"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              Responder / Subsanar Observación (72h)
            </button>
          )}

          {/* PRESUPUESTO */}
          {isInPresupuesto && (isJefePresupuesto || isAnalistaPresupuesto || isAdmin) && (
            <>
              {onOpenEditPresupuesto && (
                <button
                  onClick={onOpenEditPresupuesto}
                  className="px-3 py-1.5 text-xs font-medium bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg transition-colors border border-slate-300"
                >
                  Registrar Datos / CUR Compromiso
                </button>
              )}

              {/* Botón Pausa Factura */}
              <button
                onClick={handleTogglePausaFactura}
                disabled={loadingAction}
                className="px-3 py-1.5 text-xs font-medium bg-amber-50 hover:bg-amber-100 text-amber-800 rounded-lg transition-colors border border-amber-300 flex items-center gap-1"
              >
                {tramite.esta_pausado ? (
                  <>
                    <PlayCircle className="w-3.5 h-3.5 text-amber-600" />
                    Reanudar Semáforo SLA
                  </>
                ) : (
                  <>
                    <PauseCircle className="w-3.5 h-3.5 text-amber-600" />
                    Pausar Semáforo / Espera Factura
                  </>
                )}
              </button>

              {/* Visto bueno del Jefe */}
              {(isJefePresupuesto || isAdmin) && !tramite.aprobado_presupuesto && (
                <button
                  onClick={() => handleAction("APROBAR_JEFE_PRESUPUESTO")}
                  disabled={loadingAction}
                  className="px-3.5 py-1.5 text-xs font-medium bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors flex items-center gap-1.5 shadow-xs"
                >
                  <FileCheck className="w-3.5 h-3.5" />
                  Emitir Aprobación Jefe Presupuesto
                </button>
              )}

              {/* Derivar a Contabilidad */}
              {tramite.aprobado_presupuesto && (
                <button
                  onClick={() => handleAction("DERIVAR_A_CONTABILIDAD")}
                  disabled={loadingAction || !tramite.numero_factura}
                  title={
                    !tramite.numero_factura
                      ? "Se requiere registrar el número de factura para despachar a Contabilidad"
                      : ""
                  }
                  className="px-3.5 py-1.5 text-xs font-medium bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 disabled:text-slate-500 text-white rounded-lg transition-colors flex items-center gap-1.5 shadow-xs"
                >
                  <Send className="w-3.5 h-3.5" />
                  Derivar a Contabilidad
                </button>
              )}
            </>
          )}

          {/* CONTABILIDAD */}
          {isInContabilidad && (isContadorGeneral || isAnalistaContable || isAdmin) && (
            <>
              {onOpenEditContabilidad && (
                <button
                  onClick={onOpenEditContabilidad}
                  className="px-3 py-1.5 text-xs font-medium bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg transition-colors border border-slate-300"
                >
                  Registrar Devengado / Retenciones
                </button>
              )}

              {/* Visto bueno del Contador General */}
              {(isContadorGeneral || isAdmin) && !tramite.aprobado_contabilidad && (
                <button
                  onClick={() => handleAction("APROBAR_CONTADOR_GENERAL")}
                  disabled={loadingAction}
                  className="px-3.5 py-1.5 text-xs font-medium bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors flex items-center gap-1.5 shadow-xs"
                >
                  <FileCheck className="w-3.5 h-3.5" />
                  Emitir Aprobación Contador General
                </button>
              )}

              {/* Derivar a DFI Pago */}
              {tramite.aprobado_contabilidad && (
                <button
                  onClick={() => handleAction("DERIVAR_A_DFI_PAGO")}
                  disabled={loadingAction}
                  className="px-3.5 py-1.5 text-xs font-medium bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors flex items-center gap-1.5 shadow-xs"
                >
                  <Send className="w-3.5 h-3.5" />
                  Derivar a Directora Financiera (Pago)
                </button>
              )}
            </>
          )}

          {/* DFI PAGO */}
          {isInDFIPago && (isDirectora || isAdmin) && (
            <button
              onClick={() => handleAction("AUTORIZAR_PAGO_DFI")}
              disabled={loadingAction}
              className="px-4 py-1.5 text-xs font-medium bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors flex items-center gap-1.5 shadow-xs font-semibold"
            >
              <CreditCard className="w-4 h-4" />
              Autorizar Pago y Derivar a Tesorería
            </button>
          )}

          {/* TESORERIA Y PAGOS */}
          {isInTesoreria && (
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

          {/* ARCHIVO */}
          {isInArchivo && tramite.estado_general !== "FINALIZADO_ARCHIVADO" && (
            <>
              {onOpenEditArchivo && (
                <button
                  onClick={onOpenEditArchivo}
                  className="px-3.5 py-1.5 text-xs font-medium bg-slate-800 hover:bg-slate-900 text-white rounded-lg transition-colors flex items-center gap-1.5 shadow-xs"
                >
                  <Archive className="w-3.5 h-3.5" />
                  Archivar Definitivo y Asignar Ubicación
                </button>
              )}
            </>
          )}

          {/* ACCIONES GENERALES: OBSERVAR Y DEVOLVER */}
          {tramite.estado_general !== "FINALIZADO_ARCHIVADO" && (
            <>
              <button
                onClick={() => setModalObsOpen(true)}
                className="px-3 py-1.5 text-xs font-medium bg-amber-50 hover:bg-amber-100 text-amber-800 rounded-lg transition-colors border border-amber-200 flex items-center gap-1"
              >
                <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
                Observar (72h)
              </button>

              <button
                onClick={() => setModalDevOpen(true)}
                className="px-3 py-1.5 text-xs font-medium bg-rose-50 hover:bg-rose-100 text-rose-800 rounded-lg transition-colors border border-rose-200 flex items-center gap-1"
              >
                <ArrowLeftRight className="w-3.5 h-3.5 text-rose-600" />
                Devolver Formalmente
              </button>
            </>
          )}

          {/* REASIGNAR / DERIVAR */}
          {tramite.estado_general !== "FINALIZADO_ARCHIVADO" && (
            <button
              onClick={() => setModalDerivarOpen(true)}
              className="px-3 py-1.5 text-xs font-semibold uppercase bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg transition-colors border border-slate-300 flex items-center gap-1.5 shadow-2xs"
              title="Reasignar a otro analista o derivar a otro departamento"
            >
              <ArrowLeftRight className="w-3.5 h-3.5 text-blue-600" />
              Reasignar / Derivar
            </button>
          )}

          {/* REINGRESO POR MEMORANDO DE ALCANCE */}
          {(tramite.es_devuelto || tramite.estado_general === "DEVUELTO_FORMALMENTE") && (
            <button
              onClick={() => setModalAlcanceOpen(true)}
              className="px-3.5 py-1.5 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors flex items-center gap-1.5 shadow-xs"
              title="Registrar Memorando de Alcance (Quipux) para reincorporar el expediente al flujo activo y reactivar el semáforo SLA"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Reingresar por Alcance
            </button>
          )}

          {/* SOLICITUD DE DEVOLUCIÓN (PARA QUIEN NO ES CUSTODIO ACTUAL) */}
          {tramite.estado_general !== "FINALIZADO_ARCHIVADO" && tramite.id_custodio_actual !== currentUser.id_usuario && (
            <button
              onClick={() => setModalSolicitarDevOpen(true)}
              className="px-3 py-1.5 text-xs font-semibold uppercase bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-colors border border-slate-300 flex items-center gap-1 shadow-2xs"
              title="Solicitar formalmente al custodio actual que devuelva el expediente a su despacho"
            >
              <Undo2 className="w-3.5 h-3.5 text-slate-600" />
              Solicitar Devolución
            </button>
          )}
        </div>
      </div>

      {/* Banner de Trámite Devuelto Formalmente */}
      {(tramite.es_devuelto || tramite.estado_general === "DEVUELTO_FORMALMENTE") && (
        <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex flex-wrap items-center justify-between gap-2 text-xs text-rose-950">
          <div className="flex items-center gap-2">
            <ArrowLeftRight className="w-4 h-4 text-rose-600 shrink-0" />
            <div>
              <span className="font-semibold block text-rose-900">
                Expediente Devuelto Formalmente (Semáforo SLA Congelado)
              </span>
              <span className="text-rose-700">
                {tramite.motivo_devolucion || "El expediente fue devuelto a la unidad requirente para subsanación. En espera de Memorando de Alcance."}
              </span>
            </div>
          </div>
          <button
            onClick={() => setModalAlcanceOpen(true)}
            className="px-3 py-1.5 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors flex items-center gap-1 shadow-xs"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Registrar Memorando de Alcance
          </button>
        </div>
      )}

      {/* Banner si hay Solicitud de Devolución Pendiente */}
      {tramite.sub_estado === "SOLICITUD_DEVOLUCION_PENDIENTE" && (
        <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl flex flex-wrap items-center justify-between gap-2 text-xs text-amber-900">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
            <span>
              <strong>Solicitud de Devolución Pendiente:</strong> Un funcionario ha solicitado que este expediente retorne a su área.
            </span>
          </div>
          {tramite.id_custodio_actual === currentUser.id_usuario && (
            <div className="flex items-center gap-2">
              <button
                onClick={async () => {
                  const mot = prompt("Ingrese nota de aceptación de devolución:") || "Aceptada";
                  // Buscar la solicitud
                  const res = await fetch(`/api/tramites/${tramite.id_tramite}/solicitud-devolucion`);
                  const d = await res.json();
                  const sol = d.solicitudes?.find((s: any) => s.estado_solicitud === "PENDIENTE");
                  if (sol) {
                    await fetch(`/api/tramites/${tramite.id_tramite}/solicitud-devolucion`, {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({
                        accion: "ACEPTAR_SOLICITUD",
                        id_solicitud: sol.id_solicitud,
                        respuesta: mot,
                      }),
                    });
                    onRefresh();
                  }
                }}
                className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold uppercase transition-colors"
              >
                Aceptar y Devolver
              </button>
              <button
                onClick={async () => {
                  const mot = prompt("Ingrese justificación del rechazo:");
                  if (!mot) return;
                  const res = await fetch(`/api/tramites/${tramite.id_tramite}/solicitud-devolucion`);
                  const d = await res.json();
                  const sol = d.solicitudes?.find((s: any) => s.estado_solicitud === "PENDIENTE");
                  if (sol) {
                    await fetch(`/api/tramites/${tramite.id_tramite}/solicitud-devolucion`, {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({
                        accion: "RECHAZAR_SOLICITUD",
                        id_solicitud: sol.id_solicitud,
                        respuesta: mot,
                      }),
                    });
                    onRefresh();
                  }
                }}
                className="px-3 py-1 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-lg font-bold uppercase transition-colors"
              >
                Rechazar
              </button>
            </div>
          )}
        </div>
      )}

      {actionError && (
        <div className="p-2.5 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-lg font-medium flex items-center justify-between">
          <span>{actionError}</span>
          <button
            onClick={() => setActionError(null)}
            className="text-rose-500 hover:text-rose-700 text-xs"
          >
            Cerrar
          </button>
        </div>
      )}

      {/* Modales */}
      <ModalObservacion72h
        isOpen={modalObsOpen}
        onClose={() => setModalObsOpen(false)}
        idTramite={tramite.id_tramite}
        onSuccess={onRefresh}
      />

      <ModalDevolucionFormal
        isOpen={modalDevOpen}
        onClose={() => setModalDevOpen(false)}
        idTramite={tramite.id_tramite}
        onSuccess={onRefresh}
      />

      <ModalReingresoAlcance
        isOpen={modalAlcanceOpen}
        onClose={() => setModalAlcanceOpen(false)}
        idTramite={tramite.id_tramite}
        codigoTramite={tramite.codigo_tramite}
        onSuccess={onRefresh}
      />

      <ModalSolicitarDevolucion
        isOpen={modalSolicitarDevOpen}
        onClose={() => setModalSolicitarDevOpen(false)}
        tramite={tramite}
        currentUser={currentUser}
        onSuccess={onRefresh}
      />

      <ModalReasignarDerivar
        isOpen={modalDerivarOpen}
        onClose={() => setModalDerivarOpen(false)}
        tramite={tramite}
        currentUser={currentUser}
        onRefresh={onRefresh}
      />

      {observacionPendiente && (
        <ModalSubsanar
          isOpen={modalSubsanarOpen}
          onClose={() => setModalSubsanarOpen(false)}
          idTramite={tramite.id_tramite}
          idObservacion={observacionPendiente.id_observacion}
          detalleObservacion={observacionPendiente.detalle_observacion}
          onSuccess={onRefresh}
        />
      )}
    </div>
  );
};
