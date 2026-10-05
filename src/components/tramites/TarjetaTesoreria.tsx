"use client";

import React, { useState } from "react";
import { TramiteCompletoDTO, UsuarioInstitucional } from "@/types";
import { formatDate } from "@/lib/utils";
import { CreditCard, CheckCircle2, AlertCircle, Edit3 } from "lucide-react";

interface TarjetaTesoreriaProps {
  tramite: TramiteCompletoDTO;
  currentUser: UsuarioInstitucional | null;
  onRefresh: () => void;
}

export const TarjetaTesoreria: React.FC<TarjetaTesoreriaProps> = ({
  tramite,
  currentUser,
  onRefresh,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [loteMef, setLoteMef] = useState(tramite.lote_mef || "");
  const [spiBce, setSpiBce] = useState(tramite.spi_bce_referencia || "");
  const [comprobantePago, setComprobantePago] = useState(
    tramite.comprobante_pago || ""
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canEdit =
    (currentUser?.id_area === 4 || currentUser?.id_area === 5 || currentUser?.rol === "ADMIN") &&
    tramite.estado_general !== "FINALIZADO_ARCHIVADO";

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!spiBce.trim() && !comprobantePago.trim()) {
      setError("Debe ingresar la referencia SPI Banco Central o el comprobante de pago.");
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/tramites/${tramite.id_tramite}/flujo`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          accion: "PROGRAMAR_Y_PAGAR_MEF_BCE",
          datos: {
            lote_mef: loteMef.trim(),
            spi_bce_referencia: spiBce.trim(),
            comprobante_pago: comprobantePago.trim(),
          },
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Error al procesar pago en tesorería");
      setIsEditing(false);
      onRefresh();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
      <div className="px-5 py-3.5 bg-slate-900 text-white flex items-center justify-between">
        <div className="flex items-center gap-2">
          <CreditCard className="w-4 h-4 text-blue-400" />
          <h3 className="text-xs font-semibold uppercase tracking-wider">
            5. Tesorería y Cobranzas (Operación Unificada) · Programación MEF y Transferencia SPI-BCE
          </h3>
        </div>
        <div className="flex items-center gap-3">
          {tramite.fecha_pago ? (
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
              <CheckCircle2 className="w-3 h-3" /> Pago Confirmado
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-500/20 text-amber-300 border border-amber-500/30">
              <AlertCircle className="w-3 h-3" /> Pendiente de Transferencia
            </span>
          )}

          {canEdit && !isEditing && (
            <button
              onClick={() => setIsEditing(true)}
              className="px-2.5 py-1 text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-md border border-slate-700 flex items-center gap-1 transition-colors"
            >
              <Edit3 className="w-3 h-3" /> Registrar Pago
            </button>
          )}
        </div>
      </div>

      <div className="p-5">
        {error && (
          <div className="mb-4 p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-lg font-medium">
            {error}
          </div>
        )}

        {isEditing ? (
          <form onSubmit={handleSave} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Lote eSIGEF / MEF
                </label>
                <input
                  type="text"
                  value={loteMef}
                  onChange={(e) => setLoteMef(e.target.value)}
                  placeholder="ej. LOTE-MEF-2026-089"
                  className="w-full text-xs bg-white border border-slate-300 rounded-lg p-2.5 font-mono focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Referencia Transferencia SPI Banco Central *
                </label>
                <input
                  type="text"
                  value={spiBce}
                  onChange={(e) => setSpiBce(e.target.value)}
                  placeholder="ej. SPI-BCE-TRF-9948210"
                  className="w-full text-xs bg-white border border-slate-300 rounded-lg p-2.5 font-mono focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Comprobante Oficial de Pago
                </label>
                <input
                  type="text"
                  value={comprobantePago}
                  onChange={(e) => setComprobantePago(e.target.value)}
                  placeholder="ej. COMP-PAG-2026-0112"
                  className="w-full text-xs bg-white border border-slate-300 rounded-lg p-2.5 font-mono focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsEditing(false)}
                disabled={loading}
                className="px-3.5 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-4 py-1.5 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors shadow-xs"
              >
                {loading ? "Confirmando..." : "Confirmar Pago y Derivar a Archivo"}
              </button>
            </div>
          </form>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <span className="text-[11px] font-semibold text-slate-500 uppercase block">
                Lote eSIGEF / MEF:
              </span>
              <span className="text-xs font-mono font-medium text-slate-800">
                {tramite.lote_mef || "-"}
              </span>
            </div>

            <div>
              <span className="text-[11px] font-semibold text-slate-500 uppercase block">
                Referencia SPI Banco Central:
              </span>
              <span className="text-xs font-mono font-bold text-emerald-800">
                {tramite.spi_bce_referencia || "-"}
              </span>
            </div>

            <div>
              <span className="text-[11px] font-semibold text-slate-500 uppercase block">
                Comprobante de Pago:
              </span>
              <span className="text-xs font-mono text-slate-800">
                {tramite.comprobante_pago || "-"}
              </span>
            </div>

            <div>
              <span className="text-[11px] font-semibold text-slate-500 uppercase block">
                Fecha Pago Efectivo:
              </span>
              <span className="text-xs text-slate-800">
                {tramite.fecha_pago ? formatDate(tramite.fecha_pago) : "Pendiente"}
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
