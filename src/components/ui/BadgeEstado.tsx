import React from "react";
import { cn } from "@/lib/utils";
import { Undo2 } from "lucide-react";

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
  const est = estado ? estado.toUpperCase() : "DESCONOCIDO";

  // Mapeo exhaustivo para la Matriz Oficial de los Estados
  switch (est) {
    case "INGRESADO":
      style = "bg-sky-50 text-sky-800 border-sky-300";
      break;
    case "REVISION":
      style = "bg-blue-50 text-blue-800 border-blue-300";
      break;
    case "REVISADO":
      style = "bg-teal-50 text-teal-800 border-teal-300";
      break;
    case "FACTURA":
      style = "bg-amber-50 text-amber-800 border-amber-300";
      break;
    case "CONTABILIDAD":
      style = "bg-purple-50 text-purple-800 border-purple-300";
      break;
    case "DFI":
      style = "bg-indigo-50 text-indigo-800 border-indigo-300";
      break;
    case "AUTORIZADO_PAGO":
      style = "bg-blue-50 text-blue-800 border-blue-300";
      break;
    case "PAGADO":
      style = "bg-emerald-50 text-emerald-800 border-emerald-300";
      break;
    case "CAJA":
    case "EN_CAJA":
      style = "bg-cyan-50 text-cyan-800 border-cyan-300";
      break;
    case "ARCHIVO":
    case "FINALIZADO_ARCHIVADO":
      style = "bg-slate-100 text-slate-700 border-slate-300";
      break;
    case "OBSERVADO":
    case "OBSERVADO_72H":
      style = "bg-orange-50 text-orange-800 border-orange-300";
      break;
    case "DEVUELTO":
      style = "bg-orange-50 text-orange-800 border-orange-300";
      break;
    case "INSUBSISTENTE":
    case "ANULADO":
      style = "bg-rose-50 text-rose-800 border-rose-300";
      break;
    case "PRESUPUESTO":
      style = "bg-blue-50 text-blue-800 border-blue-300";
      break;
    case "JUSTIFICACION_CONTABILIDAD":
      style = "bg-purple-50 text-purple-800 border-purple-300";
      break;
    default:
      if (est.includes("PAGADO") || est.includes("APROBADO")) {
        style = "bg-emerald-50 text-emerald-800 border-emerald-300";
      } else if (est.includes("DEVUELT")) {
        style = "bg-orange-50 text-orange-800 border-orange-300";
      } else if (est.includes("OBSERVADO") || est.includes("PAUSA")) {
        style = "bg-amber-50 text-amber-800 border-amber-300";
      } else if (est.includes("RECHAZ") || est.includes("ANULAD") || est.includes("INSUBSIST")) {
        style = "bg-rose-50 text-rose-800 border-rose-300";
      } else {
        style = "bg-slate-100 text-slate-700 border-slate-300";
      }
      break;
  }

  // Etiqueta legible
  const displayLabel = est.replace(/_/g, " ");
  const isDevuelto = est === "DEVUELTO" || est.includes("DEVUELT");

  return (
    <span
      className={cn(
        "inline-flex items-center justify-center gap-1.5 px-2.5 py-1 rounded text-[11px] font-bold uppercase tracking-wider border text-center whitespace-nowrap shrink-0 shadow-sm",
        style,
        className
      )}
      title={subEstado ? `${displayLabel} - ${subEstado}` : displayLabel}
    >
      {isDevuelto ? (
        <Undo2 className="w-3 h-3 shrink-0" />
      ) : (
        <span className="w-1.5 h-1.5 rounded-full bg-current opacity-75 shrink-0" />
      )}
      <span className="whitespace-nowrap">{displayLabel}</span>
    </span>
  );
};
