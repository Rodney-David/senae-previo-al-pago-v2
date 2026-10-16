"use client";

import React, { useState } from "react";
import { Modal } from "@/components/ui";
import { CheckCircle2, PlayCircle } from "lucide-react";

interface ModalLevantarObservacionProps {
  isOpen: boolean;
  onClose: () => void;
  idTramite: number;
  motivoOriginal?: string | null;
  estadoPrevio?: string | null;
  onSuccess: () => void;
}

export const ModalLevantarObservacion: React.FC<ModalLevantarObservacionProps> = ({
  isOpen,
  onClose,
  idTramite,
  motivoOriginal,
  estadoPrevio,
  onSuccess,
}) => {
  const [detalle, setDetalle] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!detalle.trim()) {
      setError("Por favor detalle cómo fue resuelta o subsanada la observación.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/tramites/${idTramite}/flujo`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          accion: "LEVANTAR_OBSERVACION",
          datos: { detalle_subsanacion: detalle.trim() },
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Error al levantar observación");

      onSuccess();
      onClose();
      setDetalle("");
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
      title="Levantar Observación y Reanudar Trámite"
      subtitle="Restauración del estado de trámite previo y reanudación del semáforo SLA"
    >
      <form onSubmit={handleSubmit} className="p-6 space-y-4">
        {motivoOriginal && (
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs space-y-1">
            <span className="font-bold text-slate-700 block">Motivo Registrado de la Observación:</span>
            <p className="text-slate-600 italic">{motivoOriginal}</p>
          </div>
        )}

        <div className="p-3.5 bg-emerald-50 border border-emerald-300 rounded-xl flex items-start gap-3">
          <PlayCircle className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
          <div className="text-xs text-emerald-900 space-y-1">
            <span className="font-bold block">Reanudación Automática de Plazos:</span>
            <span>
              El trámite regresará a su fase previa (
              <strong className="font-mono">{estadoPrevio || "REVISION"}</strong>) y el semáforo SLA reanudará
              su conteo sumando los días que permaneció congelado.
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
            Detalle de la Resolución / Subsanación *
          </label>
          <textarea
            value={detalle}
            onChange={(e) => setDetalle(e.target.value)}
            placeholder="Especifique cómo fue atendido el requerimiento, número de memorando de alcance, informe o documento incorporado..."
            rows={4}
            className="w-full text-xs bg-white border border-slate-300 rounded-lg p-3 focus:ring-2 focus:ring-emerald-500 focus:outline-none resize-none leading-relaxed"
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
            className="px-4 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-colors shadow-xs flex items-center gap-1.5"
          >
            <CheckCircle2 className="w-4 h-4" />
            {loading ? "Reanudando Trámite..." : "Levantar Observación y Continuar"}
          </button>
        </div>
      </form>
    </Modal>
  );
};
