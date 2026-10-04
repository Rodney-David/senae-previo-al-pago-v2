"use client";

import React, { useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { RotateCcw, FileCheck2, AlertCircle } from "lucide-react";

interface ModalReingresoAlcanceProps {
  isOpen: boolean;
  onClose: () => void;
  idTramite: number;
  codigoTramite: string;
  onSuccess: () => void;
}

export const ModalReingresoAlcance: React.FC<ModalReingresoAlcanceProps> = ({
  isOpen,
  onClose,
  idTramite,
  codigoTramite,
  onSuccess,
}) => {
  const [memoAlcance, setMemoAlcance] = useState("");
  const [detalle, setDetalle] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!memoAlcance.trim() || !detalle.trim()) {
      setError("El número de Memorando de Alcance Quipux y el detalle son obligatorios.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/tramites/${idTramite}/reingreso-alcance`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          memo_alcance: memoAlcance.trim(),
          detalle: detalle.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Error al procesar el reingreso por alcance");

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Reingreso por Memorando de Alcance (Quipux)"
      subtitle={`Reincorporación formal del trámite ${codigoTramite} tras subsanación externa`}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg flex items-start gap-3">
          <FileCheck2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
          <div className="text-xs text-emerald-800 space-y-1">
            <span className="font-semibold block">Efecto Legal Institucional:</span>
            <span>
              El trámite reingresa al ciclo de control financiero activo. El semáforo legal SLA se
              descongela y el expediente se reasigna automáticamente al funcionario que originó la
              devolución para continuar la revisión.
            </span>
          </div>
        </div>

        {error && (
          <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-lg font-medium flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            {error}
          </div>
        )}

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Número Oficial de Memorando de Alcance Quipux *
          </label>
          <input
            type="text"
            value={memoAlcance}
            onChange={(e) => setMemoAlcance(e.target.value)}
            placeholder="ej. SENAE-GAA-2026-0955-M"
            className="w-full text-xs bg-white border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-emerald-500 focus:outline-none font-mono uppercase"
            required
          />
          <span className="text-[11px] text-slate-500 mt-0.5 block">
            Código generado en el Sistema Quipux por el área requirente u origen.
          </span>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Detalle de Subsanaciones / Justificativos Adjuntos *
          </label>
          <textarea
            value={detalle}
            onChange={(e) => setDetalle(e.target.value)}
            rows={4}
            placeholder="Especifique las correcciones efectuadas, documentos adjuntados o aclaraciones técnicas emitidas en el alcance..."
            className="w-full text-xs bg-white border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
            required
          />
        </div>

        <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="px-4 py-2 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={loading}
            className="px-4 py-2 text-xs font-medium text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-colors flex items-center gap-1.5 shadow-xs"
          >
            <RotateCcw className="w-4 h-4" />
            {loading ? "Procesando Reingreso..." : "Registrar Reingreso por Alcance"}
          </button>
        </div>
      </form>
    </Modal>
  );
};
