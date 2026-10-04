"use client";

import React, { useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { Undo2, AlertCircle } from "lucide-react";
import { TramiteCompletoDTO, UsuarioInstitucional } from "@/types";

interface ModalSolicitarDevolucionProps {
  isOpen: boolean;
  onClose: () => void;
  tramite: TramiteCompletoDTO;
  currentUser: UsuarioInstitucional | null;
  onSuccess: () => void;
}

export const ModalSolicitarDevolucion: React.FC<ModalSolicitarDevolucionProps> = ({
  isOpen,
  onClose,
  tramite,
  currentUser,
  onSuccess,
}) => {
  const [motivo, setMotivo] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!motivo.trim()) {
      setError("Debe especificar la justificación o motivo formal para solicitar la devolución física.");
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/tramites/${tramite.id_tramite}/solicitud-devolucion`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          accion: "CREAR_SOLICITUD",
          motivo: motivo.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Error al solicitar la devolución");

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
      title="SOLICITAR DEVOLUCIÓN DEL EXPEDIENTE"
      description="Petición formal dirigida al custodio actual para que devuelva el trámite a su despacho."
    >
      <form onSubmit={handleSubmit} className="space-y-4 text-xs">
        <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-blue-900">
          <span>
            Esta solicitud se enviará a la bandeja de{" "}
            <strong>{tramite.usuarios?.nombre_completo || "el custodio actual"}</strong> en{" "}
            <strong>{tramite.areas?.nombre || "su departamento"}</strong>. El custodio recibirá la
            notificación con su justificación para autorizar o denegar el retorno.
          </span>
        </div>

        {error && (
          <div className="p-2.5 bg-rose-50 border border-rose-200 text-rose-700 rounded-lg flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div>
          <label className="block font-bold text-slate-700 uppercase mb-1">
            Motivo / Justificación Formal *
          </label>
          <textarea
            rows={4}
            value={motivo}
            onChange={(e) => setMotivo(e.target.value)}
            placeholder="Describa por qué requiere que le devuelvan el expediente (ej. alcance Quipux recibido, omisión de anexo indispensable, etc.)..."
            className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 font-medium"
            required
          />
        </div>

        <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="px-3 py-1.5 font-semibold uppercase text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={loading}
            className="px-4 py-1.5 font-bold uppercase text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors flex items-center gap-1.5 shadow-2xs"
          >
            <Undo2 className="w-3.5 h-3.5" />
            {loading ? "Enviando..." : "Emitir Solicitud"}
          </button>
        </div>
      </form>
    </Modal>
  );
};
