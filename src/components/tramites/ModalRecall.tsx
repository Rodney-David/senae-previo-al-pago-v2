"use client";

import React, { useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { Undo2, Info } from "lucide-react";

interface ModalRecallProps {
  isOpen: boolean;
  onClose: () => void;
  idTramite: number;
  onSuccess: () => void;
}

export const ModalRecall: React.FC<ModalRecallProps> = ({
  isOpen,
  onClose,
  idTramite,
  onSuccess,
}) => {
  const [numeroMemorando, setNumeroMemorando] = useState("");
  const [motivo, setMotivo] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!numeroMemorando.trim()) {
      setError("Debe ingresar el número del Memorando de Alcance oficial.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/tramites/${idTramite}/recall`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          numero_memorando: numeroMemorando.trim(),
          motivo: motivo.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Error al solicitar el recall del trámite");

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
      title="Solicitar Devolución Preventiva (Recall por Alcance)"
      subtitle="Recuperación inmediata a su bandeja tras recibir un Memorando de Alcance modificatorio"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg flex items-start gap-3">
          <Info className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
          <div className="text-xs text-blue-800 space-y-1">
            <span className="font-semibold block">Mecanismo Ágil sin Autorización Receptora:</span>
            <span>
              Si despachó el trámite a la siguiente bandeja pero de inmediato recibió un Memorando de Alcance por Quipux,
              este botón retorna el expediente a su bandeja de forma instantánea y deja constancia en la bitácora.
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
            Número de Memorando de Alcance Quipux *
          </label>
          <input
            type="text"
            value={numeroMemorando}
            onChange={(e) => setNumeroMemorando(e.target.value)}
            placeholder="ej. SENAE-DFI-2026-0450-M"
            className="w-full text-xs bg-white border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500 focus:outline-none font-mono"
            required
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Asunto o Motivo del Alcance
          </label>
          <textarea
            value={motivo}
            onChange={(e) => setMotivo(e.target.value)}
            rows={3}
            placeholder="Describa brevemente la modificación remitida por el área requirente..."
            className="w-full text-xs bg-white border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500 focus:outline-none"
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
            className="px-4 py-2 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors flex items-center gap-1.5 shadow-xs"
          >
            <Undo2 className="w-4 h-4" />
            {loading ? "Recuperando..." : "Ejecutar Devolución (Recall)"}
          </button>
        </div>
      </form>
    </Modal>
  );
};
