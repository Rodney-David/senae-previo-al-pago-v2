"use client";

import React, { useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { FileText, Plus } from "lucide-react";

interface ModalNuevaReferenciaProps {
  isOpen: boolean;
  onClose: () => void;
  idTramite: number;
  onSuccess: () => void;
}

export const ModalNuevaReferencia: React.FC<ModalNuevaReferenciaProps> = ({
  isOpen,
  onClose,
  idTramite,
  onSuccess,
}) => {
  const [tipoDocumento, setTipoDocumento] = useState("MEMORANDO_ALCANCE");
  const [tipoPersonalizado, setTipoPersonalizado] = useState("");
  const [numeroDocumento, setNumeroDocumento] = useState("");
  const [fechaDocumento, setFechaDocumento] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [asuntoSumilla, setAsuntoSumilla] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!numeroDocumento.trim() || !asuntoSumilla.trim()) {
      setError("El número de documento y el asunto son campos obligatorios.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/tramites/${idTramite}/referencias`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tipo_documento: tipoDocumento,
          tipo_personalizado:
            tipoDocumento === "PERSONALIZADO" ? tipoPersonalizado.trim() : null,
          numero_documento: numeroDocumento.trim(),
          fecha_documento: fechaDocumento,
          asunto_sumilla: asuntoSumilla.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Error al guardar referencia");

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
      title="Agregar Referencia Documental Quipux"
      subtitle="Registro ágil de actos administrativos, memorandos y documentos oficiales vinculados"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-lg font-medium">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Tipo de Documento Oficial *
            </label>
            <select
              value={tipoDocumento}
              onChange={(e) => setTipoDocumento(e.target.value)}
              className="w-full text-xs bg-white border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500 focus:outline-none"
            >
              <option value="MEMORANDO_ALCANCE">MEMORANDO DE ALCANCE</option>
              <option value="MEMORANDO_DEVOLUCION">MEMORANDO DE DEVOLUCIÓN</option>
              <option value="OFICIO">OFICIO</option>
              <option value="PROVIDENCIA">PROVIDENCIA</option>
              <option value="SENTENCIA">SENTENCIA</option>
              <option value="PERSONALIZADO">PERSONALIZADO</option>
            </select>
          </div>

          {tipoDocumento === "PERSONALIZADO" && (
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Especifique Tipo Personalizado *
              </label>
              <input
                type="text"
                value={tipoPersonalizado}
                onChange={(e) => setTipoPersonalizado(e.target.value)}
                placeholder="ej. ACTA DE ENTREGA RECEPCIÓN"
                className="w-full text-xs bg-white border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                required
              />
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Número de Documento Oficial *
            </label>
            <input
              type="text"
              value={numeroDocumento}
              onChange={(e) => setNumeroDocumento(e.target.value)}
              placeholder="ej. SENAE-DFI-2026-0450-M"
              className="w-full text-xs bg-white border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500 focus:outline-none font-mono"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Fecha del Documento *
            </label>
            <input
              type="date"
              value={fechaDocumento}
              onChange={(e) => setFechaDocumento(e.target.value)}
              className="w-full text-xs bg-white border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500 focus:outline-none"
              required
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Asunto / Sumilla Descriptiva Breve *
          </label>
          <textarea
            value={asuntoSumilla}
            onChange={(e) => setAsuntoSumilla(e.target.value)}
            rows={3}
            placeholder="Resumen del objeto del documento o sumilla remitida por Quipux..."
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
            className="px-4 py-2 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors flex items-center gap-1.5 shadow-xs"
          >
            <Plus className="w-4 h-4" />
            {loading ? "Guardando..." : "Registrar Referencia"}
          </button>
        </div>
      </form>
    </Modal>
  );
};
