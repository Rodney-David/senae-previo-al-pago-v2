"use client";

import React, { useState } from "react";
import { MetricasRelojA, MetricasHistoricoParcial, CalidadDato } from "@/lib/tiemposCalculator";

interface BarraDesgloseProps {
  relojA?: MetricasRelojA;
  historicoParcial?: MetricasHistoricoParcial;
  calidadDato?: CalidadDato;
  className?: string;
  altura?: string; // Ej: "h-2.5", "h-3"
  mostrarTotal?: boolean;
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
}) => {
  const [tooltip, setTooltip] = useState<{ texto: string; x: number; y: number } | null>(null);

  // Si es un trámite migrado HISTORICO_PARCIAL, particionamos en sus 3 tramos hábiles brutos
  if (calidadDato === "HISTORICO_PARCIAL") {
    const tSec = historicoParcial?.tramo_secretaria_habiles || 0;
    const tPres = historicoParcial?.tramo_presupuesto_habiles || 0;
    const tCont = historicoParcial?.tramo_contabilidad_tesoreria_habiles || 0;
    const totalHabiles = Math.max(0.1, tSec + tPres + tCont);

    const segmentosHist: SegmentoBarra[] = [
      {
        id: "sec",
        etiqueta: "Tramo Secretaría (Recepción -> Entrega)",
        dias: tSec,
        porcentaje: (tSec / totalHabiles) * 100,
        colorHex: "#475569",
        colorBgClass: "bg-slate-600",
      },
      {
        id: "pres",
        etiqueta: "Tramo Presupuesto (Entrega -> Aprobación JCO)",
        dias: tPres,
        porcentaje: (tPres / totalHabiles) * 100,
        colorHex: "#94A3B8",
        colorBgClass: "bg-slate-400",
      },
      {
        id: "cont",
        etiqueta: "Tramo Contab./Tesorería (JCO -> Pago)",
        dias: tCont,
        porcentaje: (tCont / totalHabiles) * 100,
        colorHex: "#CBD5E1",
        colorBgClass: "bg-slate-300",
      },
    ].filter((s) => s.dias > 0);

    return (
      <div className={`relative flex items-center gap-2 ${className}`}>
        <div
          className={`relative w-full ${altura} bg-slate-100 rounded-full overflow-hidden flex shadow-inner border border-slate-200 cursor-pointer`}
          title={`Histórico Parcial (Tramos brutos): Secretaría ${tSec}d | Presupuesto ${tPres}d | Contab./Tesorería ${tCont}d`}
        >
          {segmentosHist.length === 0 ? (
            <div className="w-full h-full bg-slate-200 flex items-center justify-center text-[9px] text-slate-500 font-medium">
              Sin tramos
            </div>
          ) : (
            segmentosHist.map((seg, idx) => (
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
            {(historicoParcial?.total_habiles_brutos ?? totalHabiles).toFixed(1)}d
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

  // Trámite estándar o COMPLETO (Reloj A: 5 componentes deterministas)
  const total = relojA?.total_calendario_dias || 0;
  const trabajo = relojA?.dias_laborables_trabajo || 0;
  const pausaFactura = relojA?.dias_pausa_factura || 0;
  const pausaObservado = relojA?.dias_pausa_observado || 0;
  const noLaborables = relojA?.dias_no_laborables || 0;
  const postAutorizacion = relojA?.dias_post_autorizacion || 0;
  const exento = relojA?.dias_exento || 0;

  const baseTotal = Math.max(0.1, total);

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
