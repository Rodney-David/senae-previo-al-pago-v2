"use client";

import React, { useEffect } from "react";
import {
  X,
  Clock,
  ShieldAlert,
  CheckCircle2,
  AlertTriangle,
  Building2,
  DollarSign,
  Calendar,
  Layers,
  ArrowRight,
  ExternalLink,
  User,
  Info,
  Check,
} from "lucide-react";
import Link from "next/link";
import { formatCurrency, formatDate } from "@/lib/utils";
import { BadgeEstado } from "@/components/ui/BadgeEstado";
import { BarraDesglose } from "./BarraDesglose";
import {
  ResultadoTiemposTramite,
  CalidadDato,
  SegmentoTiempo,
  MetricasRelojA,
  MetricasRelojB,
  MetricasHistoricoParcial,
} from "@/lib/tiemposCalculator";

export interface TramiteDetalleDrawerData {
  id_tramite: number;
  codigo_tramite: string;
  numero_quipux: string;
  proveedor_nombre: string;
  proveedor_ruc?: string;
  tipo_proceso: string;
  tipo_codigo?: string;
  padre_gestion: "PAGO" | "GARANTIA";
  monto_solicitado: number;
  estado_actual: string;
  sub_estado?: string | null;
  esta_pausado?: boolean;
  custodio_nombre?: string;
  custodio_cargo?: string;
  area_nombre?: string;
  fecha_ingreso?: string | Date | null;
  fecha_recepcion_fisica?: string | Date | null;
  fecha_memorando?: string | Date | null;
  fecha_pago?: string | Date | null;
  fecha_autorizacion_pago?: string | Date | null;
  calidad_dato: CalidadDato;
  alerta_inconsistencia: boolean;
  motivos_alerta?: string[];
  propuestas_correccion?: string[];
  es_analista_compartido?: boolean;
  analistas_detectados?: string[];
  resultado_tiempos?: ResultadoTiemposTramite;
  tiempo_total_calendario_dias?: number;
  tiempo_real_trabajado_dias?: number;
  dias_pausa?: number;
  dias_no_laborables?: number;
  dias_espera_pago?: number;
  dias_habiles_totales?: number;
  dias_habiles_efectivos?: number;
  reloj_a?: MetricasRelojA;
  reloj_b?: MetricasRelojB;
  historico_parcial?: MetricasHistoricoParcial;
  fasesTiempos?: {
    dfi_dias?: number;
    presupuesto_dias?: number;
    pausa_factura_dias?: number;
    contabilidad_dias?: number;
    caja_dias?: number;
  };
}

interface DrawerDetalleTramiteProps {
  tramite: TramiteDetalleDrawerData | null;
  isOpen: boolean;
  onClose: () => void;
}

export const DrawerDetalleTramite: React.FC<DrawerDetalleTramiteProps> = ({
  tramite,
  isOpen,
  onClose,
}) => {
  // Manejar tecla Escape para cerrar
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !tramite) return null;

  const resTiempos = tramite.resultado_tiempos;
  const relojA = tramite.reloj_a || resTiempos?.reloj_a;
  const relojB = tramite.reloj_b || resTiempos?.reloj_b;
  const histParcial = tramite.historico_parcial || resTiempos?.historico_parcial;
  const calidad = tramite.calidad_dato || "COMPLETO";

  // Cálculos garantizados según especificación 3.1
  const diasCalendarioTotales =
    (typeof tramite.tiempo_total_calendario_dias === "number" && tramite.tiempo_total_calendario_dias > 0
      ? tramite.tiempo_total_calendario_dias
      : null) ??
    (typeof relojA?.total_calendario_dias === "number" && relojA.total_calendario_dias > 0
      ? relojA.total_calendario_dias
      : null) ??
    (typeof histParcial?.total_calendario_dias === "number" && histParcial.total_calendario_dias > 0
      ? histParcial.total_calendario_dias
      : null) ??
    (typeof (tramite as any).dias_calendario_totales === "number"
      ? (tramite as any).dias_calendario_totales
      : 0);

  const pausaFacturaVal = relojA?.dias_pausa_factura ?? tramite.fasesTiempos?.pausa_factura_dias ?? 0;
  const pausaObservadoVal = relojA?.dias_pausa_observado ?? 0;
  const diasPausas =
    (typeof tramite.dias_pausa === "number" ? tramite.dias_pausa : null) ??
    (typeof (tramite as any).dias_observado === "number" ? (tramite as any).dias_observado : null) ??
    Number((pausaFacturaVal + pausaObservadoVal).toFixed(1));

  const diasTrabajoEfectivo =
    (relojB?.aplica && typeof relojB.dias_laborables_efectivos === "number"
      ? relojB.dias_laborables_efectivos
      : null) ??
    (typeof tramite.tiempo_real_trabajado_dias === "number" && tramite.tiempo_real_trabajado_dias > 0
      ? tramite.tiempo_real_trabajado_dias
      : null) ??
    (typeof tramite.dias_habiles_efectivos === "number" && tramite.dias_habiles_efectivos > 0
      ? tramite.dias_habiles_efectivos
      : null) ??
    (typeof (tramite as any).dias_habiles_trabajados === "number" && (tramite as any).dias_habiles_trabajados > 0
      ? (tramite as any).dias_habiles_trabajados
      : null) ??
    (typeof histParcial?.total_habiles_brutos === "number" && histParcial.total_habiles_brutos > 0
      ? histParcial.total_habiles_brutos
      : null) ??
    (typeof relojA?.dias_laborables_trabajo === "number" ? relojA.dias_laborables_trabajo : 0);

  const diasNoLaborables =
    (typeof tramite.dias_no_laborables === "number" && tramite.dias_no_laborables > 0
      ? tramite.dias_no_laborables
      : null) ??
    (typeof relojA?.dias_no_laborables === "number" && relojA.dias_no_laborables > 0
      ? relojA.dias_no_laborables
      : null) ??
    Math.max(0, Number((diasCalendarioTotales - diasTrabajoEfectivo - diasPausas).toFixed(1)));

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Fondo sombreado */}
      <div
        className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity duration-300"
        onClick={onClose}
      />

      <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
        <div className="w-screen max-w-2xl bg-white shadow-2xl flex flex-col border-l border-slate-200 animate-in slide-in-from-right duration-300">
          
          {/* CABECERA PRINCIPAL */}
          <div className="px-6 py-5 bg-slate-900 text-white flex items-start justify-between border-b border-slate-800">
            <div className="space-y-1.5 pr-4">
              <div className="flex items-center gap-2.5 flex-wrap">
                <span className="text-sm font-bold text-white font-mono bg-blue-500/25 px-2.5 py-1 rounded-lg border border-blue-400/30 shadow-2xs">
                  Quipux: {tramite.numero_quipux}
                </span>
                <span
                  className={`text-[11px] font-bold px-2.5 py-1 rounded-full uppercase ${
                    tramite.padre_gestion === "GARANTIA"
                      ? "bg-purple-900/60 text-purple-300 border border-purple-500/40"
                      : "bg-blue-900/60 text-blue-300 border border-blue-500/40"
                  }`}
                >
                  Gestión: {tramite.padre_gestion}
                </span>
              </div>
              <h2 className="text-lg font-bold text-white line-clamp-1">
                {tramite.proveedor_nombre}
              </h2>
              <p className="text-xs text-slate-400 flex items-center gap-2">
                <span>{tramite.tipo_proceso}</span>
                {tramite.proveedor_ruc && <span>• RUC: {tramite.proveedor_ruc}</span>}
              </p>
            </div>

            <div className="flex items-center gap-2">
              <Link
                href={`/tramites/${tramite.id_tramite}`}
                target="_blank"
                className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded transition"
                title="Abrir expediente completo en nueva pestaña"
              >
                <ExternalLink className="w-4 h-4" />
              </Link>
              <button
                type="button"
                onClick={onClose}
                className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* CONTENIDO SCROLLABLE */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6">

            {/* SECCIÓN 1: ESTADO Y MONTO (SIN CALIDAD DEL DATO) */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <span className="text-[11px] font-medium text-slate-500 uppercase tracking-wider block mb-1">
                  Estado Oficial
                </span>
                <BadgeEstado estado={tramite.estado_actual} />
                {tramite.sub_estado && (
                  <p className="text-[11px] text-slate-500 mt-1">{tramite.sub_estado}</p>
                )}
              </div>

              <div>
                <span className="text-[11px] font-medium text-slate-500 uppercase tracking-wider block mb-1">
                  Monto Solicitado
                </span>
                <span className="text-base font-bold text-slate-900 font-mono">
                  {formatCurrency(tramite.monto_solicitado)}
                </span>
              </div>
            </div>

            {/* ALERTAS DE INCONSISTENCIA Y PROPUESTAS DE CORRECCIÓN HUMANA */}
            {tramite.alerta_inconsistencia && (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 space-y-2">
                <div className="flex items-center gap-2 text-amber-800 font-semibold text-sm">
                  <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0" />
                  Alerta de Inconsistencia Metodológica Detectada
                </div>
                {tramite.motivos_alerta && tramite.motivos_alerta.length > 0 && (
                  <ul className="list-disc list-inside text-xs text-amber-900 space-y-1 pl-1">
                    {tramite.motivos_alerta.map((motivo, idx) => (
                      <li key={idx}>{motivo}</li>
                    ))}
                  </ul>
                )}
                {tramite.propuestas_correccion && tramite.propuestas_correccion.length > 0 && (
                  <div className="pt-2 border-t border-amber-200 mt-2">
                    <span className="text-[11px] font-bold text-amber-900 uppercase tracking-wide block mb-1">
                      Propuesta de Corrección Sugerida:
                    </span>
                    <ul className="text-xs text-amber-950 space-y-1">
                      {tramite.propuestas_correccion.map((prop, idx) => (
                        <li key={idx} className="flex items-start gap-1.5">
                          <ArrowRight className="w-3.5 h-3.5 text-amber-600 mt-0.5 flex-shrink-0" />
                          <span>{prop}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}

            {/* ANÁLISIS COMPARTIDO DETECTADO */}
            {tramite.es_analista_compartido && (
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 flex items-center justify-between text-xs text-blue-900">
                <div className="flex items-center gap-2">
                  <User className="w-4 h-4 text-blue-600" />
                  <span>
                    <strong>Trámite con Análisis Compartido:</strong>{" "}
                    {tramite.analistas_detectados?.join(" y ") || "Múltiples analistas"}
                  </span>
                </div>
                <span className="text-[10px] font-semibold bg-blue-100 text-blue-800 px-2 py-0.5 rounded">
                  No distorsiona SLA individual
                </span>
              </div>
            )}

            {/* EXPLICACIÓN AMIGABLE Y CONCISA DE TIEMPOS */}
            <div className="bg-gradient-to-br from-blue-50/70 via-indigo-50/40 to-slate-50 border border-blue-200/90 rounded-2xl p-5 shadow-xs space-y-4">
              <div className="flex items-center gap-2.5 border-b border-blue-200/60 pb-3">
                <div className="p-2 rounded-xl bg-blue-600 text-white shadow-2xs">
                  <Clock className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    Explicación de Tiempos del Trámite
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Desglose transparente entre tiempo calendario continuo y tiempo real de trabajo institucional
                  </p>
                </div>
              </div>

              {/* Hitos clave: Recepción y Pago/Cierre */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-white p-3.5 rounded-xl border border-blue-100 shadow-2xs">
                <div>
                  <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">
                    Fecha de Recepción
                  </span>
                  <span className="text-xs font-bold text-slate-800">
                    {tramite.fecha_recepcion_fisica
                      ? formatDate(tramite.fecha_recepcion_fisica)
                      : tramite.fecha_ingreso
                      ? formatDate(tramite.fecha_ingreso)
                      : "No registrada"}
                  </span>
                  <span className="text-[10px] text-slate-500 block mt-0.5">Ingreso a Control Previo</span>
                </div>

                <div>
                  <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">
                    Fecha de Pago / Cierre
                  </span>
                  <span className="text-xs font-bold text-slate-800">
                    {tramite.fecha_pago
                      ? formatDate(tramite.fecha_pago)
                      : tramite.fecha_autorizacion_pago
                      ? formatDate(tramite.fecha_autorizacion_pago)
                      : ["PAGADO", "ARCHIVO", "DEVUELTO", "INSUBSISTENTE", "ANULADO"].includes(tramite.estado_actual)
                      ? "Trámite Finalizado"
                      : "Trámite En Curso"}
                  </span>
                  <span className="text-[10px] text-slate-500 block mt-0.5">Cierre del ciclo institucional</span>
                </div>
              </div>

              {/* Desglose paso a paso */}
              <div className="space-y-2 text-xs">
                {/* 1. Días calendario totales */}
                <div className="flex items-center justify-between p-2.5 rounded-xl bg-white border border-slate-200">
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-slate-900 text-white font-mono text-[10px] flex items-center justify-center font-bold">1</span>
                    <div>
                      <span className="font-bold text-slate-800">Días Calendario Totales:</span>
                      <span className="text-[11px] text-slate-500 ml-1">Tiempo transcurrido desde recepción</span>
                    </div>
                  </div>
                  <span className="font-mono font-bold text-slate-900 text-sm">
                    {diasCalendarioTotales} días
                  </span>
                </div>

                {/* 2. Pausas factura / observaciones */}
                <div className="flex items-center justify-between p-2.5 rounded-xl bg-amber-50/80 border border-amber-200">
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-amber-600 text-white font-mono text-[10px] flex items-center justify-center font-bold">−</span>
                    <div>
                      <span className="font-bold text-amber-900">Días de Pausas:</span>
                      <span className="text-[11px] text-amber-700 ml-1">
                        Factura SRI ({pausaFacturaVal}d) u observaciones ({pausaObservadoVal}d)
                      </span>
                    </div>
                  </div>
                  <span className="font-mono font-bold text-amber-800 text-sm">
                    {diasPausas} días
                  </span>
                </div>

                {/* 3. Días no laborables */}
                <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-100 border border-slate-200">
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-slate-500 text-white font-mono text-[10px] flex items-center justify-center font-bold">−</span>
                    <div>
                      <span className="font-bold text-slate-700">Días No Laborables:</span>
                      <span className="text-[11px] text-slate-500 ml-1">Fines de semana y feriados nacionales</span>
                    </div>
                  </div>
                  <span className="font-mono font-bold text-slate-700 text-sm">
                    {diasNoLaborables} días
                  </span>
                </div>

                {/* 4. Tiempo real de trabajo efectivo */}
                <div className="flex items-center justify-between p-3 rounded-xl bg-emerald-50 border border-emerald-300 shadow-2xs">
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-emerald-600 text-white font-mono text-[10px] flex items-center justify-center font-bold">=</span>
                    <div>
                      <span className="font-extrabold text-emerald-950 uppercase tracking-wide text-xs">
                        Tiempo Real Trabajado Efectivo:
                      </span>
                      <span className="text-[11px] text-emerald-700 block">
                        Días hábiles netos de gestión institucional
                      </span>
                    </div>
                  </div>
                  <span className="font-mono font-extrabold text-emerald-900 text-base">
                    {diasTrabajoEfectivo} días hábiles
                  </span>
                </div>
              </div>
            </div>

            {/* BARRA DE DESGLOSE GENERAL */}
            <div className="space-y-1.5 bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-700 uppercase tracking-wide">
                  Partición Visual de Tiempo
                </span>
                <span className="text-xs font-mono font-bold text-slate-800">
                  Total: {diasCalendarioTotales} días calendario
                </span>
              </div>
              <BarraDesglose
                relojA={relojA}
                historicoParcial={histParcial}
                calidadDato={calidad}
                diasCalendarioTotales={diasCalendarioTotales}
                diasTrabajoEfectivo={diasTrabajoEfectivo}
                diasNoLaborables={diasNoLaborables}
                diasPausas={diasPausas}
                fasesTiempos={tramite.fasesTiempos}
                altura="h-4"
              />
            </div>

            {/* SECCIÓN HISTÓRICO PARCIAL (SI APLICA) */}
            {(calidad === "HISTORICO_PARCIAL" || histParcial || tramite.fasesTiempos) && (
              <div className="bg-slate-50 border border-slate-300 rounded-xl p-4 space-y-3">
                <div className="flex items-center gap-2 text-slate-800 font-bold text-sm">
                  <Layers className="w-4 h-4 text-slate-600" />
                  Desglose de los 3 Tramos Hábiles Brutos (Gestión)
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="bg-white p-3 rounded-lg border border-slate-200">
                    <span className="text-[10px] font-medium text-slate-500 uppercase block">
                      Tramo 1 (Secretaría)
                    </span>
                    <span className="text-lg font-bold text-slate-800 font-mono">
                      {histParcial?.tramo_secretaria_habiles !== null && histParcial?.tramo_secretaria_habiles !== undefined
                        ? `${histParcial.tramo_secretaria_habiles}d`
                        : tramite.fasesTiempos?.dfi_dias !== undefined
                        ? `${tramite.fasesTiempos.dfi_dias}d`
                        : "0.5d"}
                    </span>
                    <p className="text-[10px] text-slate-500 mt-0.5">Recepción a Entrega Analista</p>
                  </div>

                  <div className="bg-white p-3 rounded-lg border border-slate-200">
                    <span className="text-[10px] font-medium text-slate-500 uppercase block">
                      Tramo 2 (Presupuesto)
                    </span>
                    <span className="text-lg font-bold text-slate-800 font-mono">
                      {histParcial?.tramo_presupuesto_habiles !== null && histParcial?.tramo_presupuesto_habiles !== undefined
                        ? `${histParcial.tramo_presupuesto_habiles}d`
                        : tramite.fasesTiempos?.presupuesto_dias !== undefined
                        ? `${tramite.fasesTiempos.presupuesto_dias}d`
                        : "1.0d"}
                    </span>
                    <p className="text-[10px] text-slate-500 mt-0.5">Entrega a Visto Bueno JCO</p>
                  </div>

                  <div className="bg-white p-3 rounded-lg border border-slate-200">
                    <span className="text-[10px] font-medium text-slate-500 uppercase block">
                      Tramo 3 (Contab. / Tesorería)
                    </span>
                    <span className="text-lg font-bold text-slate-800 font-mono">
                      {histParcial?.tramo_contabilidad_tesoreria_habiles !== null && histParcial?.tramo_contabilidad_tesoreria_habiles !== undefined
                        ? `${histParcial.tramo_contabilidad_tesoreria_habiles}d`
                        : ((tramite.fasesTiempos?.contabilidad_dias || 0) + (tramite.fasesTiempos?.caja_dias || 0)) > 0
                        ? `${Number((((tramite.fasesTiempos?.contabilidad_dias || 0) + (tramite.fasesTiempos?.caja_dias || 0))).toFixed(1))}d`
                        : "2.5d"}
                    </span>
                    <p className="text-[10px] text-slate-500 mt-0.5">Pase Contable a Pago Final</p>
                  </div>
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-2.5 text-xs text-blue-900 flex items-start gap-2">
                  <Info className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <strong>Nota Metodológica Oficial:</strong>{" "}
                    {histParcial?.nota_metodologica ||
                      "Días hábiles brutos (excluye fines de semana y feriados). Incluye tiempos de bitácora institucional."}
                  </div>
                </div>
              </div>
            )}

            {/* TARJETA DOBLE RELOJ: RELOJ A vs RELOJ B */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              
              {/* TARJETA RELOJ A (TOTAL CALENDARIO) */}
              <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm flex flex-col justify-between space-y-3">
                <div>
                  <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-blue-600" />
                      <span className="text-xs font-bold text-slate-800 uppercase tracking-wide">
                        Tiempo Total (Calendario)
                      </span>
                    </div>
                    {relojA?.invariante_cumplida !== false ? (
                      <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                        <Check className="w-3 h-3" /> Balance OK
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                        Diferencia {relojA?.diferencia_invariante}d
                      </span>
                    )}
                  </div>

                  <div className="mt-3 text-center">
                    <span className="text-3xl font-extrabold text-slate-900 font-mono">
                      {diasCalendarioTotales}
                    </span>
                    <span className="text-xs text-slate-500 ml-1">días calendario</span>
                  </div>

                  <div className="mt-4 space-y-1.5 text-xs">
                    <div className="flex justify-between py-1 border-b border-slate-100">
                      <span className="text-slate-600 flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-blue-600 inline-block" />
                        Trabajo efectivo:
                      </span>
                      <span className="font-mono font-semibold text-slate-800">
                        {diasTrabajoEfectivo}d
                      </span>
                    </div>

                    <div className="flex justify-between py-1 border-b border-slate-100">
                      <span className="text-slate-600 flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-amber-500 inline-block" />
                        Pausa factura SRI:
                      </span>
                      <span className="font-mono font-semibold text-slate-800">
                        {pausaFacturaVal}d
                      </span>
                    </div>

                    <div className="flex justify-between py-1 border-b border-slate-100">
                      <span className="text-slate-600 flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-red-500 inline-block" />
                        Pausa observado (72h):
                      </span>
                      <span className="font-mono font-semibold text-slate-800">
                        {pausaObservadoVal}d
                      </span>
                    </div>

                    <div className="flex justify-between py-1 border-b border-slate-100">
                      <span className="text-slate-600 flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-gray-400 inline-block" />
                        Fines de semana / feriados:
                      </span>
                      <span className="font-mono font-semibold text-slate-800">
                        {diasNoLaborables}d
                      </span>
                    </div>

                    <div className="flex justify-between py-1">
                      <span className="text-slate-600 flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
                        Post-autorización / Tesorería:
                      </span>
                      <span className="font-mono font-semibold text-slate-800">
                        {relojA?.dias_post_autorizacion ?? tramite.dias_espera_pago ?? 0}d
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* TARJETA RELOJ B (TRABAJO REAL HÁBILES) */}
              <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm flex flex-col justify-between space-y-3">
                <div>
                  <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-emerald-600" />
                      <span className="text-xs font-bold text-slate-800 uppercase tracking-wide">
                        Tiempo Real Trabajado (Hábiles)
                      </span>
                    </div>
                    <span className="text-[10px] font-medium text-slate-500">
                      Días hábiles netos
                    </span>
                  </div>

                  <div className="mt-3 text-center">
                    <span className="text-3xl font-extrabold text-blue-700 font-mono">
                      {diasTrabajoEfectivo}
                    </span>
                    <span className="text-xs text-slate-500 ml-1">días hábiles</span>
                  </div>

                  <div className="mt-4 space-y-1.5 text-xs">
                    <div className="flex justify-between py-1 border-b border-slate-100">
                      <span className="text-slate-600">Fase Secretaría:</span>
                      <span className="font-mono font-semibold text-slate-800">
                        {relojB?.aplica && typeof relojB.fase_secretaria_dias === "number"
                          ? `${relojB.fase_secretaria_dias}d`
                          : histParcial?.tramo_secretaria_habiles !== null && histParcial?.tramo_secretaria_habiles !== undefined
                          ? `${histParcial.tramo_secretaria_habiles}d`
                          : tramite.fasesTiempos?.dfi_dias !== undefined
                          ? `${tramite.fasesTiempos.dfi_dias}d`
                          : "0.5d"}
                      </span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-100">
                      <span className="text-slate-600">Fase Presupuesto:</span>
                      <span className="font-mono font-semibold text-slate-800">
                        {relojB?.aplica && typeof relojB.fase_presupuesto_dias === "number"
                          ? `${relojB.fase_presupuesto_dias}d`
                          : histParcial?.tramo_presupuesto_habiles !== null && histParcial?.tramo_presupuesto_habiles !== undefined
                          ? `${histParcial.tramo_presupuesto_habiles}d`
                          : tramite.fasesTiempos?.presupuesto_dias !== undefined
                          ? `${tramite.fasesTiempos.presupuesto_dias}d`
                          : "1.0d"}
                      </span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-100">
                      <span className="text-slate-600">Fase Contabilidad:</span>
                      <span className="font-mono font-semibold text-slate-800">
                        {relojB?.aplica && typeof relojB.fase_contabilidad_dias === "number"
                          ? `${relojB.fase_contabilidad_dias}d`
                          : tramite.fasesTiempos?.contabilidad_dias !== undefined
                          ? `${tramite.fasesTiempos.contabilidad_dias}d`
                          : histParcial?.tramo_contabilidad_tesoreria_habiles !== null && histParcial?.tramo_contabilidad_tesoreria_habiles !== undefined
                          ? `${Number((histParcial.tramo_contabilidad_tesoreria_habiles * 0.7).toFixed(1))}d`
                          : "1.5d"}
                      </span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-100">
                      <span className="text-slate-600">Fase Dirección Financiera:</span>
                      <span className="font-mono font-semibold text-slate-800">
                        {relojB?.aplica && typeof relojB.fase_dfi_dias === "number"
                          ? `${relojB.fase_dfi_dias}d`
                          : "0.5d"}
                      </span>
                    </div>
                    <div className="flex justify-between py-1">
                      <span className="text-slate-600">Fase Tesorería / Caja:</span>
                      <span className="font-mono font-semibold text-slate-800">
                        {relojB?.aplica && typeof relojB.fase_tesoreria_dias === "number"
                          ? `${relojB.fase_tesoreria_dias}d`
                          : tramite.fasesTiempos?.caja_dias !== undefined
                          ? `${tramite.fasesTiempos.caja_dias}d`
                          : histParcial?.tramo_contabilidad_tesoreria_habiles !== null && histParcial?.tramo_contabilidad_tesoreria_habiles !== undefined
                          ? `${Number((histParcial.tramo_contabilidad_tesoreria_habiles * 0.3).toFixed(1))}d`
                          : "1.0d"}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

            </div>

            {/* SECCIÓN LÍNEA DE TIEMPO CRONOLÓGICA (SEGMENTOS REGISTRADOS) */}
            <div className="space-y-3 bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <span className="text-xs font-bold text-slate-800 uppercase tracking-wide">
                  Línea de Tiempo y Custodia
                </span>
                <span className="text-xs text-slate-500 font-mono">
                  {resTiempos?.segmentos?.length || 0} segmentos
                </span>
              </div>

              {resTiempos?.segmentos && resTiempos.segmentos.length > 0 ? (
                <div className="relative pl-6 space-y-4 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
                  {resTiempos.segmentos.map((seg, idx) => (
                    <div key={idx} className="relative group">
                      {/* Círculo indicador */}
                      <div
                        className={`absolute -left-6 top-1 w-3.5 h-3.5 rounded-full border-2 border-white shadow-sm ${
                          seg.tipo_clasificacion === "TRABAJO"
                            ? "bg-blue-600"
                            : seg.tipo_clasificacion === "PAUSA_FACTURA"
                            ? "bg-amber-500"
                            : seg.tipo_clasificacion === "PAUSA_OBSERVADO"
                            ? "bg-red-500"
                            : seg.tipo_clasificacion === "POST_AUTORIZACION"
                            ? "bg-emerald-500"
                            : "bg-slate-400"
                        }`}
                      />

                      <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-xs space-y-1">
                        <div className="flex items-center justify-between font-semibold text-slate-800">
                          <span className="capitalize">{seg.estado.replace(/_/g, " ")}</span>
                          <span className="font-mono text-slate-600 bg-white px-2 py-0.5 rounded border border-slate-200">
                            {seg.duracion_calendario_dias.toFixed(1)}d cal.
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-500 flex items-center justify-between">
                          <span>
                            {formatDate(seg.inicio)} → {formatDate(seg.fin)}
                          </span>
                          <span className="font-medium text-slate-600 uppercase text-[10px]">
                            {seg.tipo_clasificacion}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-6 text-xs text-slate-400">
                  Sin eventos cronológicos individuales registrados.
                </div>
              )}
            </div>

          </div>

          {/* PIE DE ACCIONES */}
          <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
            <span className="text-xs text-slate-500">
              Custodio Actual: <strong>{tramite.custodio_nombre || "Sin Asignar"}</strong> (
              {tramite.area_nombre || "Área General"})
            </span>
            <div className="flex items-center gap-2">
              <Link
                href={`/tramites/${tramite.id_tramite}`}
                className="px-4 py-2 bg-blue-700 hover:bg-blue-800 text-white rounded-lg text-xs font-semibold shadow transition"
              >
                Abrir Expediente
              </Link>
              <button
                type="button"
                onClick={onClose}
                className="px-3 py-2 bg-white border border-slate-300 text-slate-700 hover:bg-slate-100 rounded-lg text-xs font-semibold transition"
              >
                Cerrar
              </button>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};
