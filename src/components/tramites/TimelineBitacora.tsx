import React from "react";
import { HistorialMovimientoDTO } from "@/types";
import { formatDateTime } from "@/lib/utils";
import { History, Clock, ArrowRight } from "lucide-react";

interface TimelineBitacoraProps {
  movimientos?: HistorialMovimientoDTO[];
}

export const TimelineBitacora: React.FC<TimelineBitacoraProps> = ({
  movimientos = [],
}) => {
  return (
    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
      <div className="px-5 py-3.5 bg-slate-900 text-white flex items-center justify-between">
        <div className="flex items-center gap-2">
          <History className="w-4 h-4 text-blue-400" />
          <h3 className="text-xs font-semibold uppercase tracking-wider">
            7. Bitácora Histórica e Inmutable de Auditoría
          </h3>
        </div>
        <span className="text-xs text-slate-400">
          {movimientos.length} eventos registrados
        </span>
      </div>

      <div className="p-5">
        {movimientos.length === 0 ? (
          <div className="text-center py-6 text-xs text-slate-500">
            No se registran movimientos históricos para este expediente.
          </div>
        ) : (
          <div className="relative pl-6 space-y-6 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
            {movimientos.map((mov) => {
              const entrega = mov.usuario_entrega?.nombre_completo || "Sistema";
              const recibe = mov.usuario_recibe?.nombre_completo || "Funcionario";
              const areaOrig = mov.area_origen?.codigo || "DFI";
              const areaDest = mov.area_destino?.codigo || "DFI";

              return (
                <div key={mov.id_movimiento} className="relative group">
                  {/* Punto del timeline */}
                  <div className="absolute -left-6 top-1 w-2.5 h-2.5 rounded-full bg-blue-600 border-2 border-white ring-2 ring-blue-100 group-hover:scale-125 transition-transform" />

                  <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 space-y-1.5 transition-colors group-hover:border-slate-300">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="text-xs font-bold text-slate-900">
                        {mov.tipo_accion.replace(/_/g, " ")}
                      </span>
                      <span className="text-[11px] text-slate-500 flex items-center gap-1 font-mono">
                        <Clock className="w-3 h-3" />
                        {formatDateTime(mov.fecha_hora)}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 text-xs text-slate-600">
                      <span className="font-medium text-slate-800">{entrega}</span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-200 font-mono text-slate-700">
                        {areaOrig}
                      </span>
                      <ArrowRight className="w-3 h-3 text-slate-400" />
                      <span className="font-medium text-slate-800">{recibe}</span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-200 font-mono text-slate-700">
                        {areaDest}
                      </span>
                    </div>

                    {mov.comentarios && (
                      <p className="text-xs text-slate-700 bg-white p-2 rounded border border-slate-150 mt-1 italic">
                        "{mov.comentarios}"
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
