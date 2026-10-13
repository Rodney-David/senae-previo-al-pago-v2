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
        className={cn(
          "inline-flex items-center gap-1.5 text-xs font-medium text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200",
          className
        )}
        title={sla.motivoPausa || "Semáforo pausado"}
      >
        <PauseCircle className="w-3.5 h-3.5 text-amber-600" />
        <span>Pausado</span>
      </div>
    );
  }

  if (sla.estado === "FINALIZADO") {
    return (
      <div
        className={cn(
          "inline-flex items-center gap-1.5 text-xs font-semibold text-slate-700 bg-slate-100 px-2 py-0.5 rounded border border-slate-300",
          className
        )}
        title={`SLA Finalizado (En Caja / Archivo): ${sla.diasHabilesTranscurridos} días hábiles`}
      >
        <span className="text-xs select-none" aria-hidden="true">📦</span>
        {showText && (
          <span className="flex items-center gap-1 font-mono text-[11px] text-slate-600">
            <span>{sla.diasHabilesTranscurridos}d</span>
          </span>
        )}
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
      title={`${labelText}: ${sla.diasHabilesTranscurridos} días hábiles transcurridos`}
    >
      <span className="text-sm select-none" aria-hidden="true">
        {circleSymbol}
      </span>
      {showText && (
        <span className="flex items-center gap-1 font-mono">
          <Clock className="w-3 h-3 text-slate-400" />
          <span>{sla.diasHabilesTranscurridos}d</span>
        </span>
      )}
    </div>
  );
};
