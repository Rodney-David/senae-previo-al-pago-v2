"use client";

import React, { useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { ArrowLeftRight, ShieldAlert } from "lucide-react";

interface ModalDevolucionFormalProps {
  isOpen: boolean;
  onClose: () => void;
  idTramite: number;
  onSuccess: () => void;
}

export const ModalDevolucionFormal: React.FC<ModalDevolucionFormalProps> = ({
  isOpen,
  onClose,
  idTramite,
  onSuccess,
}) => {
  const [memoQuipux, setMemoQuipux] = useState("");
  const [motivo, setMotivo] = useState("");
  const [idAreaDestino, setIdAreaDestino] = useState("2"); // Default to Presupuesto
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!memoQuipux.trim() || !motivo.trim()) {
      setError("El número de Memorando Quipux y la justificación son obligatorios.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/tramites/${idTramite}/novedad`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tipo: "DEVOLUCION_FORMAL",
          memo_quipux: memoQuipux.trim(),
          motivo: motivo.trim(),
          id_area_destino: idAreaDestino,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Error al procesar la devolución formal");

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
      title="Devolución Formal del Expediente (Quipux)"
      subtitle="Retorno oficial por vicios de fondo insubsanables o vencimiento del plazo de 72h"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg flex items-start gap-3">
          <ShieldAlert className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
          <div className="text-xs text-rose-800 space-y-1">
            <span className="font-semibold block">Efecto Legal Institucional:</span>
            <span>
              El trámite saldrá del flujo activo de pagos y retornará formalmente al área que cometió el error.
              Se requiere obligatoriamente el número oficial del Memorando de Devolución emitido por Quipux.
            </span>
          </div>
        </div>

        {error && (
          <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-lg font-medium">
            {error}
          </div>
        )}

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Número Oficial de Memorando de Devolución Quipux *
          </label>
          <input
            type="text"
            value={memoQuipux}
            onChange={(e) => setMemoQuipux(e.target.value)}
            placeholder="ej. SENAE-DFI-2026-0890-M"
            className="w-full text-xs bg-white border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500 focus:outline-none font-mono"
            required
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Área Destinataria de la Devolución *
          </label>
          <select
            value={idAreaDestino}
            onChange={(e) => setIdAreaDestino(e.target.value)}
            className="w-full text-xs bg-white border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500 focus:outline-none"
          >
            <option value="2">Dirección Financiera - Presupuesto</option>
            <option value="1">Dirección Financiera Aduanera (DFI)</option>
            <option value="7">Área Requirente / Administrador de Contrato</option>
          </select>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Justificación Técnica y Fundamento Legal *
          </label>
          <textarea
            value={motivo}
            onChange={(e) => setMotivo(e.target.value)}
            rows={4}
            placeholder="Detalle los motivos por los cuales el expediente no cumple con los principios del control previo..."
            className="w-full text-xs bg-white border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500 focus:outline-none"
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
            className="px-4 py-2 text-xs font-medium text-white bg-rose-600 hover:bg-rose-700 rounded-lg transition-colors flex items-center gap-1.5 shadow-xs"
          >
            <ArrowLeftRight className="w-4 h-4" />
            {loading ? "Procesando..." : "Emitir Devolución Formal"}
          </button>
        </div>
      </form>
    </Modal>
  );
};
