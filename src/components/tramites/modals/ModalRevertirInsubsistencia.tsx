"use client";

import React, { useState } from "react";
import { Modal } from "@/components/ui";
import { RotateCcw, AlertTriangle } from "lucide-react";

interface ModalRevertirInsubsistenciaProps {
  isOpen: boolean;
  onClose: () => void;
  idTramite: number;
  codigoTramite: string;
  onSuccess: () => void;
}

export const ModalRevertirInsubsistencia: React.FC<ModalRevertirInsubsistenciaProps> = ({
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
      setError("Por favor ingrese la justificación obligatoria para revertir la insubsistencia.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/tramites/${idTramite}/flujo`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          accion: "REVERTIR_INSUBSISTENCIA",
          datos: { justificacion: justificacion.trim() },
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Error al revertir insubsistencia");

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
      title="Revertir Insubsistencia del Trámite"
      subtitle="Reactivación excepcional de trámite previamente declarado insubsistente"
    >
      <form onSubmit={handleSubmit} className="p-6 space-y-4">
        <div className="p-3.5 bg-rose-50 border border-rose-300 rounded-xl flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
          <div className="text-xs text-rose-900 space-y-1">
            <span className="font-bold block">Reversión de Insubsistencia ({codigoTramite}):</span>
            <span>
              Solo el mismo usuario que declaró insubsistente el trámite o un <strong>Administrador del Sistema</strong>{" "}
              tienen potestad para levantar esta declaratoria. El trámite se reactivará en su estado previo al corte de flujo.
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
            Justificación Institucional Obligatoria *
          </label>
          <textarea
            value={justificacion}
            onChange={(e) => setJustificacion(e.target.value)}
            placeholder="Detalle la resolución, subsanación formal de causal o criterio legal que autoriza la reanudación del trámite..."
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
            className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg uppercase"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={loading}
            className="flex items-center gap-2 px-5 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-lg uppercase shadow-xs disabled:opacity-50"
          >
            <RotateCcw className="w-4 h-4" />
            {loading ? "Reactivando..." : "Revertir Insubsistencia"}
          </button>
        </div>
      </form>
    </Modal>
  );
};
