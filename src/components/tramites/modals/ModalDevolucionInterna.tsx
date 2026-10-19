"use client";

import React, { useState } from "react";
import { Modal } from "@/components/ui";
import { RotateCcw, AlertTriangle } from "lucide-react";

export type AccionDevolucionInterna =
  | "DEVOLVER_A_ANALISTA_PRESUPUESTO"
  | "DEVOLVER_A_ANALISTA_CONTABLE"
  | "DEVOLVER_A_CONTABILIDAD";

interface ModalDevolucionInternaProps {
  isOpen: boolean;
  onClose: () => void;
  idTramite: number;
  codigoTramite: string;
  accion: AccionDevolucionInterna;
  titulo: string;
  subtitulo: string;
  destinatario: string;
  onSuccess: () => void;
}

export const ModalDevolucionInterna: React.FC<ModalDevolucionInternaProps> = ({
  isOpen,
  onClose,
  idTramite,
  codigoTramite,
  accion,
  titulo,
  subtitulo,
  destinatario,
  onSuccess,
}) => {
  const [motivo, setMotivo] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!motivo.trim()) {
      setError("Debe ingresar el motivo u observaciones de la devolución interna.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/tramites/${idTramite}/flujo`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          accion,
          datos: { motivo: motivo.trim(), observaciones: motivo.trim() },
          comentarios: motivo.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Error al procesar la devolución interna");
      }

      setMotivo("");
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || "Error al devolver el trámite");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={titulo} subtitle={subtitulo}>
      <form onSubmit={handleSubmit} className="p-6 space-y-4">
        <div className="p-3.5 bg-amber-50 border border-amber-300 rounded-xl flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="text-xs text-amber-900 space-y-1">
            <span className="font-bold block">Devolución Interna de Jefatura:</span>
            <span>
              El expediente <strong className="font-mono">{codigoTramite}</strong> será devuelto a{" "}
              <strong>{destinatario}</strong> para corrección de inconsistencias, completado de soportes o revisión técnica interna.
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
            Motivo u Observaciones de la Devolución *
          </label>
          <textarea
            value={motivo}
            onChange={(e) => setMotivo(e.target.value)}
            placeholder="Detalle claramente las correcciones solicitadas, observaciones técnicas o partidas/facturas a subsanar..."
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
            className="px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-100 rounded-lg border border-slate-300 transition-colors"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={loading}
            className="px-4 py-2 text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 disabled:bg-slate-400 rounded-lg flex items-center gap-1.5 shadow-xs transition-colors"
          >
            <RotateCcw className="w-4 h-4" />
            {loading ? "Devolviendo..." : "Confirmar Devolución"}
          </button>
        </div>
      </form>
    </Modal>
  );
};
