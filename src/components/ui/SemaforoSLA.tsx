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

  // Configuración homogénea según el estado
  let config = {
    label: `${sla.diasHabilesTranscurridos}d`,
    title: `En plazo institucional: ${sla.diasHabilesTranscurridos} días hábiles transcurridos`,
    containerStyle: "bg-emerald-50 text-emerald-800 border-emerald-300",
    dotStyle: "bg-emerald-500 ring-emerald-200",
    icon: <Clock className="w-3.5 h-3.5 text-emerald-600 shrink-0" />,
  };

  if (sla.estado === "NO_INICIADO") {
    config = {
      label: "Pendiente",
      title: "SLA no iniciado: Trámite en Secretaría DFI pendiente de entrega formal a Presupuesto",
      containerStyle: "bg-slate-50 text-slate-600 border-slate-300",
      dotStyle: "bg-slate-400 ring-slate-200",
      icon: <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />,
    };
  } else if (sla.estaPausado) {
    config = {
      label: "Pausado",
      title: sla.motivoPausa || "Semáforo SLA pausado (espera de factura u observación)",
      containerStyle: "bg-amber-50 text-amber-800 border-amber-300",
      dotStyle: "bg-amber-500 ring-amber-200",
      icon: <PauseCircle className="w-3.5 h-3.5 text-amber-600 shrink-0" />,
    };
  } else if (sla.estado === "EXENTO") {
    config = {
      label: "Exento",
      title: "Trámite exento de cómputo de SLA (Insubsistente / Devuelto formalmente)",
      containerStyle: "bg-slate-100 text-slate-500 border-slate-200",
      dotStyle: "bg-slate-400 ring-slate-200",
      icon: <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />,
    };
  } else if (sla.estado === "FINALIZADO") {
    config = {
      label: `${sla.diasHabilesTranscurridos}d`,
      title: `SLA Finalizado (Pago autorizado / Archivado): ${sla.diasHabilesTranscurridos} días hábiles`,
      containerStyle: "bg-slate-50 text-slate-700 border-slate-300",
      dotStyle: "bg-slate-400 ring-slate-200",
      icon: <Clock className="w-3.5 h-3.5 text-slate-500 shrink-0" />,
    };
  } else if (sla.estado === "POR_VENCER") {
    config = {
      label: `${sla.diasHabilesTranscurridos}d`,
      title: `Por vencer: ${sla.diasHabilesTranscurridos} de 6 días hábiles transcurridos`,
      containerStyle: "bg-amber-50 text-amber-800 border-amber-300",
      dotStyle: "bg-amber-500 ring-amber-200",
      icon: <Clock className="w-3.5 h-3.5 text-amber-600 shrink-0" />,
    };
  } else if (sla.estado === "VENCIDO") {
    config = {
      label: `${sla.diasHabilesTranscurridos}d`,
      title: `Vencido / Fuera de SLA: ${sla.diasHabilesTranscurridos} días hábiles transcurridos (Límite normativo: 6 días)`,
      containerStyle: "bg-rose-50 text-rose-800 border-rose-300",
      dotStyle: "bg-rose-500 ring-rose-200",
      icon: <Clock className="w-3.5 h-3.5 text-rose-600 shrink-0" />,
    };
  }

  return (
    <div
      className={cn(
        "inline-flex items-center justify-center gap-1.5 px-2.5 py-1 min-w-[70px] h-[26px] rounded-md text-[11px] font-semibold border transition-colors select-none whitespace-nowrap shadow-2xs",
        config.containerStyle,
        className
      )}
      title={config.title}
    >
      <span className={cn("w-2 h-2 rounded-full shrink-0 ring-2", config.dotStyle)} />
      {config.icon}
      {showText && <span className="font-mono leading-none">{config.label}</span>}
    </div>
  );
};
