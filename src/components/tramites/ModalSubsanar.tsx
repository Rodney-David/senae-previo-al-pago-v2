"use client";

import React, { useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { CheckCircle2 } from "lucide-react";

interface ModalSubsanarProps {
  isOpen: boolean;
  onClose: () => void;
  idTramite: number;
  idObservacion: number;
  detalleObservacion: string;
  onSuccess: () => void;
}

export const ModalSubsanar: React.FC<ModalSubsanarProps> = ({
  isOpen,
  onClose,
  idTramite,
  idObservacion,
  detalleObservacion,
  onSuccess,
}) => {
  const [respuesta, setRespuesta] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!respuesta.trim()) {
      setError("Por favor ingrese la respuesta justificativa o de subsanación.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/tramites/${idTramite}/novedad`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tipo: "SUBSANAR_OBSERVACION",
          id_observacion: idObservacion,
          respuesta,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Error al registrar subsanación");

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
      title="Atender / Subsanar Observación"
      subtitle="El trámite retornará con prioridad a la bandeja del funcionario que emitió la observación"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-1">
          <span className="text-[11px] font-semibold uppercase text-slate-500 block">
            Observación Reportada:
          </span>
          <p className="text-xs text-slate-800 italic">{detalleObservacion}</p>
        </div>

        {error && (
          <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-lg font-medium">
            {error}
          </div>
        )}

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Detalle de la Corrección o Justificación Técnica *
          </label>
          <textarea
            value={respuesta}
            onChange={(e) => setRespuesta(e.target.value)}
            rows={4}
            placeholder="Explique las correcciones realizadas o adjunte los números de documentos subsanatorios..."
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
            className="px-4 py-2 text-xs font-medium text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-colors flex items-center gap-1.5 shadow-xs"
          >
            <CheckCircle2 className="w-4 h-4" />
            {loading ? "Enviando..." : "Subsanar y Retornar"}
          </button>
        </div>
      </form>
    </Modal>
  );
};
