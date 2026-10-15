"use client";

import React, { useState, useMemo, useEffect } from "react";
import { TramiteCompletoDTO, UsuarioInstitucional } from "@/types";
import { Archive, CheckCircle2, AlertCircle, PackageCheck, ChevronDown } from "lucide-react";

interface TarjetaArchivoProps {
  tramite: TramiteCompletoDTO;
  currentUser: UsuarioInstitucional | null;
  onRefresh: () => void;
}

export const TarjetaArchivo: React.FC<TarjetaArchivoProps> = ({
  tramite,
  currentUser,
  onRefresh,
}) => {
  const isDefaultOpen = useMemo(() => {
    if (!currentUser) return true;
    const rol = (currentUser.rol || "").toUpperCase();
    if (rol === "DIRECTORA" || rol === "SECRETARIA" || rol === "ADMIN") {
      return true;
    }
    return currentUser.id_area === 6;
  }, [currentUser]);

  const [isOpen, setIsOpen] = useState(isDefaultOpen);

  useEffect(() => {
    setIsOpen(isDefaultOpen);
  }, [isDefaultOpen]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isArchived =
    tramite.estado_general === "ARCHIVO" ||
    tramite.estado_general === "FINALIZADO_ARCHIVADO";

  const isInCaja =
    tramite.estado_general === "CAJA" || tramite.sub_estado === "EN_CAJA";

  const isPaid = tramite.estado_general === "PAGADO";



  const nombreCaja =
    tramite.caja?.codigo_caja ||
    tramite.codigo_tomo_caja ||
    (isInCaja ? "Caja asignada" : "Sin asignar a caja");

  return (
    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
      <div
        onClick={() => setIsOpen(!isOpen)}
        className="px-5 py-3.5 bg-slate-900 text-white flex items-center justify-between cursor-pointer select-none hover:bg-slate-850 transition-colors"
      >
        <div className="flex items-center gap-2">
          <Archive className="w-4 h-4 text-blue-400" />
          <h3 className="text-xs font-bold uppercase tracking-wider">
            CUSTODIA, ARCHIVO Y CIERRE DEL EXPEDIENTE
          </h3>
          <ChevronDown
            className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${
              isOpen ? "rotate-180 text-blue-400" : ""
            }`}
          />
        </div>
        <div className="flex items-center gap-3" onClick={(e) => e.stopPropagation()}>
          {isArchived ? (
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-[11px] font-bold uppercase bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
              <CheckCircle2 className="w-3.5 h-3.5" /> Archivado Definitivo (Ciclo Cerrado)
            </span>
          ) : isInCaja ? (
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-[11px] font-bold uppercase bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
              <PackageCheck className="w-3.5 h-3.5" /> Almacenado en Caja
            </span>
          ) : isPaid ? (
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-[11px] font-bold uppercase bg-amber-500/20 text-amber-300 border border-amber-500/30">
              <AlertCircle className="w-3.5 h-3.5" /> Pagado (Pendiente de Caja)
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-[11px] font-bold uppercase bg-slate-800 text-slate-400 border border-slate-700">
              En Trámite Previo
            </span>
          )}
        </div>
      </div>

      {isOpen && (
        <div className="p-5">
          {error && (
            <div className="mb-4 p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-lg font-medium">
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
            <div>
              <span className="text-[11px] font-bold text-slate-500 uppercase block">
                Caja / Cartón Asignado:
              </span>
              <span className="text-xs font-mono font-bold text-slate-900 uppercase">
                {nombreCaja}
              </span>
            </div>

            <div>
              <span className="text-[11px] font-bold text-slate-500 uppercase block">
                Número de Hojas:
              </span>
              <span className="text-xs font-bold text-slate-900 font-mono">
                {tramite.numero_hojas !== null && tramite.numero_hojas !== undefined ? `${tramite.numero_hojas} hojas` : "Sin conteo"}
              </span>
            </div>

            <div>
              <span className="text-[11px] font-bold text-slate-500 uppercase block">
                Estado en Custodia:
              </span>
              <span className="text-xs font-semibold text-slate-800">
                {isArchived
                  ? "Custodia definitiva en Archivo Central (Ciclo Finalizado)"
                  : tramite.id_area_actual === 6
                  ? `Recibido en Archivo Central en ${nombreCaja} (En revisión de custodia)`
                  : isInCaja
                  ? `Almacenado físicamente en ${nombreCaja} (Adm. Caja)`
                  : isPaid
                  ? "Pago verificado en Adm. Caja (Esperando asignación a caja)"
                  : "En flujo previo a pago y archivo"}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
