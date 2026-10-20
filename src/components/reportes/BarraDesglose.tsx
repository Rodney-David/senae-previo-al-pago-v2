"use client";

import React, { useState } from "react";
import { MetricasRelojA, MetricasHistoricoParcial, CalidadDato } from "@/lib/tiemposCalculator";

export interface BarraDesgloseProps {
  relojA?: MetricasRelojA;
  historicoParcial?: MetricasHistoricoParcial;
  calidadDato?: CalidadDato;
  className?: string;
  altura?: string; // Ej: "h-2.5", "h-3"
  mostrarTotal?: boolean;
  diasCalendarioTotales?: number;
  diasTrabajoEfectivo?: number;
  diasNoLaborables?: number;
  diasPausas?: number;
  fasesTiempos?: {
    dfi_dias?: number;
    presupuesto_dias?: number;
    pausa_factura_dias?: number;
    contabilidad_dias?: number;
    caja_dias?: number;
  };
}

interface SegmentoBarra {
  id: string;
  etiqueta: string;
  dias: number;
  porcentaje: number;
  colorHex: string;
  colorBgClass: string;
}

export const BarraDesglose: React.FC<BarraDesgloseProps> = ({
  relojA,
  historicoParcial,
  calidadDato = "COMPLETO",
  className = "",
  altura = "h-3",
  mostrarTotal = false,
  diasCalendarioTotales,
  diasTrabajoEfectivo,
  diasNoLaborables,
  diasPausas,
  fasesTiempos,
}) => {
  const [tooltip, setTooltip] = useState<{ texto: string; x: number; y: number } | null>(null);

  // Si es un trámite migrado HISTORICO_PARCIAL, particionamos en sus tramos y días no laborables
  if (calidadDato === "HISTORICO_PARCIAL") {
    const tSec = historicoParcial?.tramo_secretaria_habiles ?? fasesTiempos?.dfi_dias ?? 0;
    const tPres = historicoParcial?.tramo_presupuesto_habiles ?? fasesTiempos?.presupuesto_dias ?? 0;
    const tCont = historicoParcial?.tramo_contabilidad_tesoreria_habiles ??
      (((fasesTiempos?.contabilidad_dias || 0) + (fasesTiempos?.caja_dias || 0)) > 0
        ? Number((((fasesTiempos?.contabilidad_dias || 0) + (fasesTiempos?.caja_dias || 0))).toFixed(1))
        : 0);

    const sumaTramos = Number((tSec + tPres + tCont).toFixed(1));
    const trabajoEfectivo = sumaTramos > 0 ? sumaTramos : (diasTrabajoEfectivo || 0);

    const totalCal =
      diasCalendarioTotales ??
      relojA?.total_calendario_dias ??
      historicoParcial?.total_calendario_dias ??
      0;

    const pausas =
      diasPausas ??
      Number((((relojA?.dias_pausa_factura || 0) + (relojA?.dias_pausa_observado || 0))).toFixed(1));

    const noLab =
      diasNoLaborables ??
      Math.max(0, Number((totalCal - trabajoEfectivo - pausas).toFixed(1)));

    const baseTotal = Math.max(0.1, totalCal || (trabajoEfectivo + noLab + pausas));

    const segmentosHist: SegmentoBarra[] = [];

    if (tSec > 0) {
      segmentosHist.push({
        id: "sec",
        etiqueta: "Tramo Secretaría (Recepción -> Entrega)",
        dias: tSec,
        porcentaje: (tSec / baseTotal) * 100,
        colorHex: "#3B82F6",
        colorBgClass: "bg-blue-500",
      });
    }

    if (tPres > 0) {
      segmentosHist.push({
        id: "pres",
        etiqueta: "Tramo Presupuesto (Entrega -> Aprobación JCO)",
        dias: tPres,
        porcentaje: (tPres / baseTotal) * 100,
        colorHex: "#6366F1",
        colorBgClass: "bg-indigo-500",
      });
    }

    if (tCont > 0) {
      segmentosHist.push({
        id: "cont",
        etiqueta: "Tramo Contab./Tesorería (JCO -> Pago)",
        dias: tCont,
        porcentaje: (tCont / baseTotal) * 100,
        colorHex: "#10B981",
        colorBgClass: "bg-emerald-500",
      });
    }

    if (sumaTramos === 0 && trabajoEfectivo > 0) {
      segmentosHist.push({
        id: "trabajo",
        etiqueta: "Trabajo efectivo institucional",
        dias: trabajoEfectivo,
        porcentaje: (trabajoEfectivo / baseTotal) * 100,
        colorHex: "#2563EB",
        colorBgClass: "bg-blue-600",
      });
    }

    if (pausas > 0) {
      segmentosHist.push({
        id: "pausas",
        etiqueta: "Pausas y Observaciones",
        dias: pausas,
        porcentaje: (pausas / baseTotal) * 100,
        colorHex: "#F59E0B",
        colorBgClass: "bg-amber-500",
      });
    }

    if (noLab > 0) {
      segmentosHist.push({
        id: "no_lab",
        etiqueta: "Fines de semana y feriados (No laborables)",
        dias: noLab,
        porcentaje: (noLab / baseTotal) * 100,
        colorHex: "#94A3B8",
        colorBgClass: "bg-slate-400",
      });
    }

    return (
      <div className={`relative flex items-center gap-2 ${className}`}>
        <div
          className={`relative w-full ${altura} bg-slate-100 rounded-full overflow-hidden flex shadow-inner border border-slate-200 cursor-pointer`}
          title={`Histórico Parcial: Trabajo ${trabajoEfectivo}d | No Laborables ${noLab}d | Pausas ${pausas}d`}
        >
          {segmentosHist.length === 0 ? (
            <div className="w-full h-full bg-blue-500/20 flex items-center justify-center text-[9px] text-blue-700 font-medium">
              {totalCal > 0 ? `${totalCal}d cal.` : "Sin tramos"}
            </div>
          ) : (
            segmentosHist.map((seg) => (
              <div
                key={seg.id}
                style={{ width: `${Math.max(3, seg.porcentaje)}%`, backgroundColor: seg.colorHex }}
                className="h-full transition-all duration-300 hover:brightness-110 relative group"
                onMouseEnter={(e) => {
                  const rect = e.currentTarget.getBoundingClientRect();
                  setTooltip({
                    texto: `${seg.etiqueta}: ${seg.dias.toFixed(1)}d (${Math.round(seg.porcentaje)}%)`,
                    x: rect.left + rect.width / 2,
                    y: rect.top - 8,
                  });
                }}
                onMouseLeave={() => setTooltip(null)}
              />
            ))
          )}
        </div>

        {mostrarTotal && (
          <span className="text-xs font-semibold text-slate-700 whitespace-nowrap min-w-[38px] text-right">
            {(totalCal || trabajoEfectivo).toFixed(1)}d
          </span>
        )}

        {tooltip && (
          <div
            className="fixed z-50 transform -translate-x-1/2 -translate-y-full bg-slate-900 text-white text-[11px] px-2.5 py-1 rounded shadow-lg pointer-events-none whitespace-nowrap font-medium border border-slate-700"
            style={{ left: tooltip.x, top: tooltip.y }}
          >
            {tooltip.texto}
          </div>
        )}
      </div>
    );
  }

  // Trámite estándar o COMPLETO (Reloj A: 5 componentes deterministas con fallbacks)
  const total = diasCalendarioTotales ?? relojA?.total_calendario_dias ?? 0;
  const trabajo = diasTrabajoEfectivo ?? relojA?.dias_laborables_trabajo ?? 0;
  const pausaFactura = relojA?.dias_pausa_factura ?? 0;
  const pausaObservado = relojA?.dias_pausa_observado ?? diasPausas ?? 0;
  const noLaborables =
    diasNoLaborables ??
    relojA?.dias_no_laborables ??
    Math.max(0, Number((total - trabajo - pausaFactura - pausaObservado).toFixed(1)));
  const postAutorizacion = relojA?.dias_post_autorizacion || 0;
  const exento = relojA?.dias_exento || 0;

  const baseTotal = Math.max(0.1, total || (trabajo + noLaborables + pausaFactura + pausaObservado + postAutorizacion + exento));

  const segmentos: SegmentoBarra[] = [
    {
      id: "trabajo",
      etiqueta: "Trabajo efectivo",
      dias: trabajo,
      porcentaje: (trabajo / baseTotal) * 100,
      colorHex: "#2563EB",
      colorBgClass: "bg-blue-600",
    },
    {
      id: "pausa_factura",
      etiqueta: "Pausa factura SRI",
      dias: pausaFactura,
      porcentaje: (pausaFactura / baseTotal) * 100,
      colorHex: "#F59E0B",
      colorBgClass: "bg-amber-500",
    },
    {
      id: "pausa_observado",
      etiqueta: "Pausa observado (72h)",
      dias: pausaObservado,
      porcentaje: (pausaObservado / baseTotal) * 100,
      colorHex: "#EF4444",
      colorBgClass: "bg-red-500",
    },
    {
      id: "no_laborables",
      etiqueta: "No laborables (Fin de semana/feriados)",
      dias: noLaborables,
      porcentaje: (noLaborables / baseTotal) * 100,
      colorHex: "#9CA3AF",
      colorBgClass: "bg-gray-400",
    },
    {
      id: "post_autorizacion",
      etiqueta: "Post-autorización / Pago",
      dias: postAutorizacion,
      porcentaje: (postAutorizacion / baseTotal) * 100,
      colorHex: "#10B981",
      colorBgClass: "bg-emerald-500",
    },
    {
      id: "exento",
      etiqueta: "Exento (Devolución/Insubsistencia)",
      dias: exento,
      porcentaje: (exento / baseTotal) * 100,
      colorHex: "#8B5CF6",
      colorBgClass: "bg-purple-500",
    },
  ].filter((s) => s.dias > 0);

  return (
    <div className={`relative flex items-center gap-2 ${className}`}>
      <div
        className={`relative w-full ${altura} bg-slate-100 rounded-full overflow-hidden flex shadow-inner border border-slate-200 cursor-pointer`}
      >
        {segmentos.length === 0 ? (
          <div className="w-full h-full bg-blue-500/20 flex items-center justify-center text-[9px] text-blue-700 font-medium">
            0d
          </div>
        ) : (
          segmentos.map((seg) => (
            <div
              key={seg.id}
              style={{ width: `${Math.max(2, seg.porcentaje)}%`, backgroundColor: seg.colorHex }}
              className="h-full transition-all duration-300 hover:brightness-110 relative"
              onMouseEnter={(e) => {
                const rect = e.currentTarget.getBoundingClientRect();
                setTooltip({
                  texto: `${seg.etiqueta}: ${seg.dias.toFixed(1)}d (${Math.round(seg.porcentaje)}%)`,
                  x: rect.left + rect.width / 2,
                  y: rect.top - 8,
                });
              }}
              onMouseLeave={() => setTooltip(null)}
            />
          ))
        )}
      </div>

      {mostrarTotal && (
        <span className="text-xs font-semibold text-slate-800 whitespace-nowrap min-w-[38px] text-right">
          {total.toFixed(1)}d
        </span>
      )}

      {tooltip && (
        <div
          className="fixed z-50 transform -translate-x-1/2 -translate-y-full bg-slate-900 text-white text-[11px] px-2.5 py-1 rounded shadow-lg pointer-events-none whitespace-nowrap font-medium border border-slate-700"
          style={{ left: tooltip.x, top: tooltip.y }}
        >
          {tooltip.texto}
        </div>
      )}
    </div>
  );
};
