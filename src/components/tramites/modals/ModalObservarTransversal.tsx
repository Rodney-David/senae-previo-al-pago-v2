"use client";

import React, { useState } from "react";
import { Modal } from "@/components/ui";
import { AlertTriangle, Clock } from "lucide-react";

interface ModalObservarTransversalProps {
  isOpen: boolean;
  onClose: () => void;
  idTramite: number;
  estadoActual: string;
  onSuccess: () => void;
}

export const ModalObservarTransversal: React.FC<ModalObservarTransversalProps> = ({
  isOpen,
  onClose,
  idTramite,
  estadoActual,
  onSuccess,
}) => {
  const [motivo, setMotivo] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!motivo.trim()) {
      setError("Por favor ingrese el motivo obligatorio de la observación externa.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/tramites/${idTramite}/flujo`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          accion: "OBSERVAR_TRAMITE",
          datos: { motivo: motivo.trim() },
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Error al emitir observación");

      onSuccess();
      onClose();
      setMotivo("");
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
      title="Observación Externa del Trámite"
      subtitle="Estado transversal por novedades con terceros o administrador de contrato"
    >
      <form onSubmit={handleSubmit} className="p-6 space-y-4">
        <div className="p-3.5 bg-amber-50 border border-amber-300 rounded-xl flex items-start gap-3">
          <Clock className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="text-xs text-amber-900 space-y-1">
            <span className="font-bold block">Congelamiento Automático de SLA:</span>
            <span>
              El trámite pasará a estado <strong>OBSERVADO</strong>, respaldando el estado actual (
              <span className="font-mono font-semibold">{estadoActual}</span>). El conteo de días hábiles normativos
              se pausará de forma automática hasta que la novedad sea subsanada.
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
            Motivo Obligatorio de la Observación *
          </label>
          <textarea
            value={motivo}
            onChange={(e) => setMotivo(e.target.value)}
            placeholder="Describa puntualmente los documentos faltantes, aclaraciones técnicas o requerimientos dirigidos a terceros/administrador de contrato..."
            rows={4}
            className="w-full text-xs bg-white border border-slate-300 rounded-lg p-3 focus:ring-2 focus:ring-amber-500 focus:outline-none resize-none leading-relaxed"
            required
          />
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="px-4 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-100 rounded-lg transition-colors"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={loading}
            className="px-4 py-2 text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 rounded-lg transition-colors shadow-xs flex items-center gap-1.5"
          >
            <AlertTriangle className="w-4 h-4" />
            {loading ? "Emitiendo Observación..." : "Observar y Pausar SLA"}
          </button>
        </div>
      </form>
    </Modal>
  );
};
