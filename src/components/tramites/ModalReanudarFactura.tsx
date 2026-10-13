"use client";

import React, { useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { FileCheck, PlayCircle } from "lucide-react";

interface ModalReanudarFacturaProps {
  isOpen: boolean;
  onClose: () => void;
  idTramite: number;
  onSuccess: () => void;
}

export const ModalReanudarFactura: React.FC<ModalReanudarFacturaProps> = ({
  isOpen,
  onClose,
  idTramite,
  onSuccess,
}) => {
  const [numeroFactura, setNumeroFactura] = useState("");
  const [fechaFactura, setFechaFactura] = useState(new Date().toISOString().split("T")[0]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!numeroFactura.trim()) {
      setError("Por favor ingrese el número de factura tributaria SRI.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/tramites/${idTramite}/flujo`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          accion: "REANUDAR_FACTURA_RECIBIDA",
          datos: {
            numero_factura: numeroFactura.trim(),
            fecha_factura: fechaFactura,
          },
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Error al registrar factura");

      onSuccess();
      onClose();
      setNumeroFactura("");
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
      title="Registrar Factura Tributaria y Reanudar Trámite"
      subtitle="El trámite retornará a estado REVISADO y se reanudará el semáforo SLA"
    >
      <form onSubmit={handleSubmit} className="p-6 space-y-4">
        <div className="p-3.5 bg-blue-50 border border-blue-200 rounded-xl text-xs text-blue-900 flex items-start gap-3">
          <PlayCircle className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
          <div>
            <span className="font-bold block">Reanudación Operativa:</span>
            <span>
              Al ingresar el número de factura tributaria (SRI), el trámite vuelve al estado{" "}
              <strong>REVISADO</strong> y estará habilitado para ser derivado a Contabilidad.
            </span>
          </div>
        </div>

        {error && (
          <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-lg font-medium">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Número de Factura SRI *
            </label>
            <input
              type="text"
              value={numeroFactura}
              onChange={(e) => setNumeroFactura(e.target.value)}
              placeholder="001-002-000123456"
              className="w-full text-xs bg-white border border-slate-300 rounded-lg p-2.5 font-mono focus:ring-2 focus:ring-blue-500 focus:outline-none"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Fecha de Emisión de Factura
            </label>
            <input
              type="date"
              value={fechaFactura}
              onChange={(e) => setFechaFactura(e.target.value)}
              className="w-full text-xs bg-white border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
          </div>
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
            className="px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors shadow-xs flex items-center gap-1.5"
          >
            <FileCheck className="w-4 h-4" />
            {loading ? "Reanudando Trámite..." : "Registrar Factura y Reanudar"}
          </button>
        </div>
      </form>
    </Modal>
  );
};
