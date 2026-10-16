"use client";

import React, { useState } from "react";
import { Modal } from "@/components/ui";
import { Ban, AlertOctagon } from "lucide-react";

interface ModalDeclararInsubsistenteProps {
  isOpen: boolean;
  onClose: () => void;
  idTramite: number;
  codigoTramite: string;
  onSuccess: () => void;
}

export const ModalDeclararInsubsistente: React.FC<ModalDeclararInsubsistenteProps> = ({
  isOpen,
  onClose,
  idTramite,
  codigoTramite,
  onSuccess,
}) => {
  const [justificacion, setJustificacion] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!justificacion.trim()) {
      setError("Por favor ingrese la justificación obligatoria para declarar insubsistente el trámite.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/tramites/${idTramite}/flujo`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          accion: "DECLARAR_INSUBSISTENTE",
          datos: { justificacion: justificacion.trim() },
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Error al declarar insubsistente");

      onSuccess();
      onClose();
      setJustificacion("");
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
      title="Declarar Insubsistencia del Trámite"
      subtitle="Estado terminal por nulidad o invalidez insubsanable"
    >
      <form onSubmit={handleSubmit} className="p-6 space-y-4">
        <div className="p-3.5 bg-rose-50 border border-rose-300 rounded-xl flex items-start gap-3">
          <AlertOctagon className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
          <div className="text-xs text-rose-900 space-y-1">
            <span className="font-bold block">Acción Definitiva e Irreversible:</span>
            <span>
              Esta acción corta permanentemente el flujo del expediente{" "}
              <strong className="font-mono">{codigoTramite}</strong>. No podrá ser derivado ni aprobado
              posteriormente. El expediente y sus pistas de auditoría se preservarán en base de datos para
              fines de control institucional.
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
            Justificación Legal / Administrativa de la Insubsistencia *
          </label>
          <textarea
            value={justificacion}
            onChange={(e) => setJustificacion(e.target.value)}
            placeholder="Detalle la causal de nulidad, informe legal, resolución de máxima autoridad o vicio que sustenta la insubsistencia definitiva..."
            rows={4}
            className="w-full text-xs bg-white border border-slate-300 rounded-lg p-3 focus:ring-2 focus:ring-rose-500 focus:outline-none resize-none leading-relaxed"
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
            className="px-4 py-2 text-xs font-bold text-white bg-rose-700 hover:bg-rose-800 rounded-lg transition-colors shadow-xs flex items-center gap-1.5"
          >
            <Ban className="w-4 h-4" />
            {loading ? "Declarando Insubsistente..." : "Confirmar Insubsistencia Definitiva"}
          </button>
        </div>
      </form>
    </Modal>
  );
};
