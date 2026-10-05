import React from "react";
import { cn } from "@/lib/utils";

interface BadgeEstadoProps {
  estado: string;
  subEstado?: string | null;
  className?: string;
}

export const BadgeEstado: React.FC<BadgeEstadoProps> = ({
  estado,
  subEstado,
  className,
}) => {
  let style = "bg-slate-100 text-slate-700 border-slate-300";
  let label = estado.replace(/_/g, " ").toUpperCase();

  if (
    estado.includes("APROBADO") ||
    estado.includes("DEVENGADO") ||
    estado.includes("PAGADO") ||
    estado.includes("AUTORIZADO")
  ) {
    style = "bg-emerald-50 text-emerald-800 border-emerald-300";
  } else if (
    estado.includes("OBSERVADO") ||
    estado.includes("72H") ||
    estado.includes("PAUSADO") ||
    estado.includes("RECALL")
  ) {
    style = "bg-amber-50 text-amber-800 border-amber-300";
  } else if (estado.includes("DEVUELTO") || estado.includes("RECHAZADO") || estado.includes("ANULADO")) {
    style = "bg-rose-50 text-rose-800 border-rose-300";
  } else if (estado.includes("EN_") || estado.includes("RECEPCION")) {
    style = "bg-blue-50 text-blue-800 border-blue-300";
  } else if (estado.includes("FINALIZADO") || estado.includes("ARCHIVADO")) {
    style = "bg-slate-100 text-slate-700 border-slate-300";
  }

  // Display clean short label
  const displayLabel = subEstado ? subEstado.replace(/_/g, " ").toUpperCase() : label;

  return (
    <span
      className={cn(
        "inline-flex items-center justify-center gap-1.5 px-2.5 py-1 rounded text-[11px] font-bold uppercase tracking-wider border text-center whitespace-nowrap shrink-0 shadow-2xs",
        style,
        className
      )}
      title={label}
    >
      <span className="w-1.5 h-1.5 rounded-full bg-current opacity-75 shrink-0" />
      <span className="whitespace-nowrap">{displayLabel}</span>
    </span>
  );
};
