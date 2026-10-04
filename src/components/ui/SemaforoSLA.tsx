import React from "react";
import { SLAResult } from "@/types";
import { cn } from "@/lib/utils";
import { Clock, PauseCircle } from "lucide-react";

interface SemaforoSLAProps {
  sla?: SLAResult;
  showText?: boolean;
  className?: string;
}

export const SemaforoSLA: React.FC<SemaforoSLAProps> = ({
  sla,
  showText = true,
  className,
}) => {
  if (!sla) return null;

  if (sla.estaPausado) {
    return (
      <div
        className={cn("inline-flex items-center gap-1.5 text-xs text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200", className)}
        title={sla.motivoPausa || "Semáforo pausado por espera de factura"}
      >
        <PauseCircle className="w-3.5 h-3.5 text-amber-600" />
        <span>Pausado (Factura)</span>
      </div>
    );
  }

  let circleColor = "text-emerald-500";
  let circleSymbol = "🟢";
  let labelText = "En plazo";

  if (sla.estado === "POR_VENCER") {
    circleColor = "text-amber-500";
    circleSymbol = "🟡";
    labelText = "Por vencer";
  } else if (sla.estado === "VENCIDO") {
    circleColor = "text-rose-500";
    circleSymbol = "🔴";
    labelText = "Vencido / Mora";
  }

  return (
    <div
      className={cn("inline-flex items-center gap-1.5 text-xs font-medium text-slate-700", className)}
      title={`${labelText}: ${sla.diasHabilesTranscurridos} de 6 días hábiles transcurridos (${sla.diasRestantes} días restantes)`}
    >
      <span className="text-sm select-none" aria-hidden="true">
        {circleSymbol}
      </span>
      {showText && (
        <span className="flex items-center gap-1">
          <Clock className="w-3 h-3 text-slate-400" />
          <span>{sla.diasHabilesTranscurridos}/6d</span>
        </span>
      )}
    </div>
  );
};
