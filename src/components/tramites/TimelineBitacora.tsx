"use client";

import React, { useState, useMemo, useEffect } from "react";
import { HistorialMovimientoDTO, UsuarioInstitucional } from "@/types";
import { formatDateTime } from "@/lib/utils";
import { History, Clock, ArrowRight, ChevronDown, UserCheck, Send, CheckCircle2, AlertTriangle, FileText, PauseCircle, ShieldCheck } from "lucide-react";

interface TimelineBitacoraProps {
  movimientos?: HistorialMovimientoDTO[];
  currentUser?: UsuarioInstitucional | null;
}

function getAccionMeta(tipo: string): { label: string; badgeClass: string; icon: React.ReactNode } {
  const t = (tipo || "").toUpperCase();

  if (t.includes("INGRESO")) {
    return {
      label: "INGRESO FORMAL DE EXPEDIENTE (DFI)",
      badgeClass: "bg-emerald-50 text-emerald-800 border-emerald-300",
      icon: <FileText className="w-3.5 h-3.5 text-emerald-600" />,
    };
  }
  if (t.includes("DESPACHO_LOTE") || t.includes("ENTREGA_CONTROL_PREVIO")) {
    return {
      label: "ENTREGA A CONTROL PREVIO (PRESUPUESTO)",
      badgeClass: "bg-blue-50 text-blue-800 border-blue-300",
      icon: <Send className="w-3.5 h-3.5 text-blue-600" />,
    };
  }
  if (t.includes("ASIGNAR_ANALISTA_PRESUPUESTO") || t.includes("ASIGNACION_ANALISTA_PRESUPUESTO")) {
    return {
      label: "ASIGNACIÓN A ANALISTA DE PRESUPUESTO",
      badgeClass: "bg-sky-50 text-sky-800 border-sky-300",
      icon: <UserCheck className="w-3.5 h-3.5 text-sky-600" />,
    };
  }
  if (t.includes("VISTO_BUENO_PRESUPUESTO") || t.includes("APROBACION_PRESUPUESTO")) {
    return {
      label: "REVISIÓN PRESUPUESTARIA APROBADA",
      badgeClass: "bg-teal-50 text-teal-800 border-teal-300",
      icon: <CheckCircle2 className="w-3.5 h-3.5 text-teal-600" />,
    };
  }
  if (t.includes("PAUSA_FACTURA") || t.includes("ESPERA_FACTURA") || t.includes("PAUSAR_ESPERA_FACTURA")) {
    return {
      label: "EN ESPERA DE FACTURA SRI (PAUSA SLA)",
      badgeClass: "bg-amber-50 text-amber-900 border-amber-300",
      icon: <PauseCircle className="w-3.5 h-3.5 text-amber-600" />,
    };
  }
  if (t.includes("REANUDAR_FACTURA")) {
    return {
      label: "FACTURA SRI RECIBIDA Y VERIFICADA",
      badgeClass: "bg-emerald-50 text-emerald-800 border-emerald-300",
      icon: <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />,
    };
  }
  if (t.includes("CONTABILIDAD")) {
    return {
      label: t.includes("ASIGNAR") ? "ASIGNACIÓN A ANALISTA CONTABLE" : "DERIVADO A CONTABILIDAD",
      badgeClass: "bg-indigo-50 text-indigo-800 border-indigo-300",
      icon: <Send className="w-3.5 h-3.5 text-indigo-600" />,
    };
  }
  if (t.includes("APROBACION_CONTABLE") || t.includes("REGISTRO_DEVENGADO")) {
    return {
      label: "CONTROL CONTABLE - CUR DEVENGADO EMITIDO",
      badgeClass: "bg-emerald-50 text-emerald-800 border-emerald-300",
      icon: <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />,
    };
  }
  if (t.includes("AUTORIZAR_PAGO")) {
    return {
      label: "AUTORIZACIÓN DE PAGO (DIRECCIÓN FINANCIERA)",
      badgeClass: "bg-blue-50 text-blue-800 border-blue-300",
      icon: <CheckCircle2 className="w-3.5 h-3.5 text-blue-600" />,
    };
  }
  if (t.includes("PAGAR") || t.includes("TRANSFERENCIA") || t.includes("BCE")) {
    return {
      label: "PAGO TRANSFERIDO AL BENEFICIARIO (MEF - BCE)",
      badgeClass: "bg-emerald-50 text-emerald-800 border-emerald-300",
      icon: <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />,
    };
  }
  if (t.includes("DERIVAC") || t.includes("REASIGNAR")) {
    return {
      label: "DERIVACIÓN / REASIGNACIÓN DE TRÁMITE",
      badgeClass: "bg-blue-50 text-blue-800 border-blue-300",
      icon: <Send className="w-3.5 h-3.5 text-blue-600" />,
    };
  }
  if (t.includes("OBSERV")) {
    return {
      label: "OBSERVACIÓN GENERADA",
      badgeClass: "bg-rose-50 text-rose-800 border-rose-300",
      icon: <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />,
    };
  }
  if (t.includes("CAJA") || t.includes("ARCHIVO")) {
    return {
      label: "GESTIÓN DE CAJA / ARCHIVO CENTRAL",
      badgeClass: "bg-purple-50 text-purple-800 border-purple-300",
      icon: <ShieldCheck className="w-3.5 h-3.5 text-purple-600" />,
    };
  }
  if (t.includes("MODIFICACION")) {
    return {
      label: "MODIFICACIÓN DE DATOS GENERALES",
      badgeClass: "bg-slate-100 text-slate-800 border-slate-300",
      icon: <FileText className="w-3.5 h-3.5 text-slate-600" />,
    };
  }

  return {
    label: tipo.replace(/_/g, " "),
    badgeClass: "bg-slate-100 text-slate-800 border-slate-300",
    icon: <History className="w-3.5 h-3.5 text-slate-600" />,
  };
}

export const TimelineBitacora: React.FC<TimelineBitacoraProps> = ({
  movimientos = [],
  currentUser = null,
}) => {
  const isDefaultOpen = useMemo(() => {
    if (!currentUser) return true;
    const rol = (currentUser.rol || "").toUpperCase();
    return rol === "DIRECTORA" || rol === "SECRETARIA" || rol === "ADMIN";
  }, [currentUser]);

  const [isOpen, setIsOpen] = useState(isDefaultOpen);

  useEffect(() => {
    setIsOpen(isDefaultOpen);
  }, [isDefaultOpen]);

  return (
    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
      <div 
        onClick={() => setIsOpen(!isOpen)}
        className="px-5 py-3.5 bg-slate-900 text-white flex items-center justify-between cursor-pointer select-none hover:bg-slate-800 transition-colors"
      >
        <div className="flex items-center gap-2">
          <History className="w-4 h-4 text-blue-400" />
          <h3 className="text-xs font-semibold uppercase tracking-wider">
            BITÁCORA HISTÓRICA - AUDITORÍA FORENSE
          </h3>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-slate-400">
            {movimientos.length} eventos registrados
          </span>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setIsOpen(!isOpen);
            }}
            className="p-1 text-slate-400 hover:text-white transition-colors"
            title={isOpen ? "Plegar sección" : "Desplegar sección"}
          >
            <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`} />
          </button>
        </div>
      </div>

      {isOpen && (
        <div className="p-5">
        {movimientos.length === 0 ? (
          <div className="text-center py-6 text-xs text-slate-500">
            No se registran movimientos históricos para este expediente.
          </div>
        ) : (
          <div className="relative pl-6 space-y-6 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
            {movimientos.map((mov) => {
              // Soporte transparente para relaciones Prisma directas o mapeadas en DTO
              const uEntrega = (mov as any).usuarios_historial_movimientos_id_usuario_entregaTousuarios || mov.usuario_entrega;
              const uRecibe = (mov as any).usuarios_historial_movimientos_id_usuario_recibeTousuarios || mov.usuario_recibe;
              const aOrigenObj = (mov as any).areas_historial_movimientos_id_area_origenToareas || mov.area_origen;
              const aDestinoObj = (mov as any).areas_historial_movimientos_id_area_destinoToareas || mov.area_destino;

              const nombreEntrega = uEntrega?.nombre_completo || "SISTEMA DFI";
              const cargoEntrega = uEntrega?.cargo || (uEntrega?.rol ? `ROL: ${uEntrega.rol}` : "Funcionario Autorizado");
              const areaOrig = aOrigenObj?.codigo || aOrigenObj?.nombre || "DFI";

              const nombreRecibe = uRecibe?.nombre_completo;
              const cargoRecibe = uRecibe?.cargo || (uRecibe?.rol ? `ROL: ${uRecibe.rol}` : "Funcionario Receptor");
              const areaDest = aDestinoObj?.codigo || aDestinoObj?.nombre || "DFI";

              const tieneDestinatario = nombreRecibe && nombreRecibe !== nombreEntrega;
              const cambioArea = areaOrig !== areaDest;

              const meta = getAccionMeta(mov.tipo_accion);

              return (
                <div key={mov.id_movimiento} className="relative group">
                  {/* Punto del timeline */}
                  <div className="absolute -left-6 top-1.5 w-3 h-3 rounded-full bg-blue-600 border-2 border-white ring-2 ring-blue-100 group-hover:scale-125 transition-transform" />

                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-2.5 transition-colors group-hover:border-slate-300 shadow-2xs">
                    {/* Encabezado: Título de Acción y Fecha/Hora exacta */}
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200/80 pb-2">
                      <div className="flex items-center gap-2">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-bold border uppercase tracking-wide ${meta.badgeClass}`}>
                          {meta.icon}
                          <span>{meta.label}</span>
                        </span>
                      </div>
                      <span className="text-[11px] text-slate-500 flex items-center gap-1.5 font-mono bg-white px-2 py-0.5 rounded border border-slate-200">
                        <Clock className="w-3 h-3 text-slate-400" />
                        {formatDateTime(mov.fecha_hora)}
                      </span>
                    </div>

                    {/* Actores y Responsables */}
                    <div className="space-y-1.5 text-xs">
                      {/* Funcionario que ejecutó la acción */}
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="text-[11px] font-semibold text-slate-500 uppercase">
                          Acción realizada por:
                        </span>
                        <span className="font-bold text-slate-900 bg-white px-2 py-0.5 rounded border border-slate-200">
                          {nombreEntrega}
                        </span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-200 font-mono text-slate-700">
                          {cargoEntrega}
                        </span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-100 font-bold font-mono text-blue-800 border border-blue-200">
                          {areaOrig}
                        </span>
                      </div>

                      {/* Destinatario o Transferencia si aplica */}
                      {tieneDestinatario && (
                        <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                          <span className="text-[11px] font-semibold text-slate-500 uppercase flex items-center gap-1">
                            <ArrowRight className="w-3 h-3 text-blue-600" />
                            Asignado / Derivado a:
                          </span>
                          <span className="font-bold text-slate-900 bg-white px-2 py-0.5 rounded border border-slate-200">
                            {nombreRecibe}
                          </span>
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-200 font-mono text-slate-700">
                            {cargoRecibe}
                          </span>
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-purple-100 font-bold font-mono text-purple-800 border border-purple-200">
                            {areaDest}
                          </span>
                        </div>
                      )}

                      {/* Traspaso de Área departamental */}
                      {!tieneDestinatario && cambioArea && (
                        <div className="flex items-center gap-1.5 text-[11px] text-slate-600 pt-0.5">
                          <span className="font-semibold text-slate-500 uppercase">Traspaso departamental:</span>
                          <span className="font-bold text-slate-800 px-1.5 py-0.5 bg-slate-200 rounded font-mono text-[10px]">
                            {areaOrig}
                          </span>
                          <ArrowRight className="w-3 h-3 text-slate-400" />
                          <span className="font-bold text-slate-800 px-1.5 py-0.5 bg-slate-200 rounded font-mono text-[10px]">
                            {areaDest}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Comentarios, Motivo y Detalle del evento */}
                    {mov.comentarios && (
                      <div className="mt-2 pt-2 border-t border-slate-100">
                        <div className="text-xs text-slate-700 bg-white p-2.5 rounded-lg border border-slate-200 leading-relaxed shadow-2xs">
                          <span className="font-semibold text-slate-500 uppercase text-[10px] block mb-0.5">
                            Detalle / Observaciones del movimiento:
                          </span>
                          <p className="italic text-slate-800">
                            "{mov.comentarios}"
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
      )}
    </div>
  );
};
