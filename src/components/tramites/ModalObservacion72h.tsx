"use client";

import React, { useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { AlertCircle } from "lucide-react";

interface ModalObservacion72hProps {
  isOpen: boolean;
  onClose: () => void;
  idTramite: number;
  onSuccess: () => void;
}

export const ModalObservacion72h: React.FC<ModalObservacion72hProps> = ({
  isOpen,
  onClose,
  idTramite,
  onSuccess,
}) => {
  const [motivo, setMotivo] = useState("");
  const [idAreaDestino, setIdAreaDestino] = useState("1"); // 1: DFI, 2: Presupuesto, 3: Contabilidad, 7: Requirente
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!motivo.trim()) {
      setError("Por favor detalle el motivo de la observación preventiva.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/tramites/${idTramite}/novedad`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tipo: "OBSERVAR_72H",
          motivo,
          id_area_destino: idAreaDestino,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Error al emitir observación");

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
      title="Observación Preventiva (Plazo 72 Horas)"
      subtitle="Pausa temporal para subsanar errores de forma sin anular el trámite"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="text-xs text-amber-800 space-y-1">
            <span className="font-semibold block">Normativa Institucional:</span>
            <span>
              El área responsable dispondrá de un término perentorio de 72 horas para atender el requerimiento.
              Si no responde dentro del plazo, el trámite escalará a Devolución Formal.
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
            Área Responsable de Subsanar *
          </label>
          <select
            value={idAreaDestino}
            onChange={(e) => setIdAreaDestino(e.target.value)}
            className="w-full text-xs bg-white border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500 focus:outline-none"
          >
            <option value="1">Dirección Financiera Aduanera (DFI)</option>
            <option value="2">Dirección Financiera - Presupuesto</option>
            <option value="3">Dirección Financiera - Contabilidad</option>
            <option value="7">Área Requirente / Administrador de Contrato</option>
          </select>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Detalle Técnico y Legal de la Observación *
          </label>
          <textarea
            value={motivo}
            onChange={(e) => setMotivo(e.target.value)}
            rows={4}
            placeholder="Especifique con precisión el requisito formal o dato que requiere subsanación..."
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
            className="px-4 py-2 text-xs font-medium text-white bg-amber-600 hover:bg-amber-700 rounded-lg transition-colors shadow-xs"
          >
            {loading ? "Registrando..." : "Emitir Observación (72h)"}
          </button>
        </div>
      </form>
    </Modal>
  );
};
