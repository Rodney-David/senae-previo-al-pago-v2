"use client";

import React, { useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { FolderOpen, AlertCircle } from "lucide-react";

interface ModalDesarchivarProps {
  isOpen: boolean;
  onClose: () => void;
  idTramite: number;
  codigoTramite: string;
  onSuccess: () => void;
}

export const ModalDesarchivar: React.FC<ModalDesarchivarProps> = ({
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
      setError("Por favor ingrese la justificación obligatoria para desarchivar el expediente.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/tramites/${idTramite}/flujo`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          accion: "DESARCHIVAR_TRAMITE",
          datos: { justificacion_desarchivo: justificacion.trim() },
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Error al desarchivar trámite");

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
      title="Desarchivar Expediente Institucional"
      subtitle="Reapertura y retorno formal de expediente custodiado en Archivo Central"
    >
      <form onSubmit={handleSubmit} className="p-6 space-y-4">
        <div className="p-3.5 bg-amber-50 border border-amber-300 rounded-xl flex items-start gap-3">
          <FolderOpen className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="text-xs text-amber-900 space-y-1">
            <span className="font-bold block">Reapertura de Expediente {codigoTramite}:</span>
            <span>
              El trámite saldrá de su estado de <strong>ARCHIVO DEFINITIVO</strong> y retornará a la bandeja de
              gestión en <strong>Tesorería / Adm. Caja</strong> en estado <strong>PAGADO</strong> para las acciones
              correspondientes. Se registrará la trazabilidad completa en la bitácora institucional.
            </span>
          </div>
        </div>

        {error && (
          <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-lg font-medium flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Motivo / Justificación Obligatoria de Desarchivo *
          </label>
          <textarea
            value={justificacion}
            onChange={(e) => setJustificacion(e.target.value)}
            placeholder="Ingrese el requerimiento oficial, solicitud de auditoría, necesidad de re-inspección o causal de reapertura..."
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
            className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg uppercase"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={loading}
            className="flex items-center gap-2 px-5 py-2 text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 rounded-lg uppercase shadow-xs disabled:opacity-50"
          >
            <FolderOpen className="w-4 h-4" />
            {loading ? "Procesando..." : "Desarchivar Expediente"}
          </button>
        </div>
      </form>
    </Modal>
  );
};
