"use client";

import React, { useState, useEffect } from "react";
import { TramiteCompletoDTO, UsuarioInstitucional } from "@/types";
import { Modal } from "@/components/ui/Modal";
import { ArrowRightLeft, Send, AlertCircle } from "lucide-react";

interface ModalReasignarDerivarProps {
  isOpen: boolean;
  onClose: () => void;
  tramite: TramiteCompletoDTO;
  currentUser: UsuarioInstitucional | null;
  onRefresh: () => void;
}

export const ModalReasignarDerivar: React.FC<ModalReasignarDerivarProps> = ({
  isOpen,
  onClose,
  tramite,
  currentUser,
  onRefresh,
}) => {
  const [areaDestino, setAreaDestino] = useState<string>(String(tramite.id_area_actual));
  const [usuarioDestino, setUsuarioDestino] = useState<string>("");
  const [motivo, setMotivo] = useState("");
  const [usuariosList, setUsuariosList] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/auth/usuarios")
      .then((r) => r.json())
      .then((d) => {
        if (d.usuarios) setUsuariosList(d.usuarios);
      })
      .catch((err) => console.error("Error fetching users for derivar:", err));
  }, []);

  // Filter users by selected area
  const filteredUsers = usuariosList.filter(
    (u) => String(u.id_area) === areaDestino && u.activo
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!motivo.trim()) {
      setError("Debe especificar el motivo o justificación de la derivación/reasignación.");
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/tramites/${tramite.id_tramite}/flujo`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          accion: "DERIVAR_TRAMITE",
          datos: {
            id_area_destino: parseInt(areaDestino, 10),
            id_usuario_destino: usuarioDestino ? parseInt(usuarioDestino, 10) : undefined,
            motivo: motivo.trim(),
          },
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Error al derivar trámite");

      onRefresh();
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
      title="DERIVAR O REASIGNAR TRÁMITE"
      description="Transferencia de custodia o reasignación a un analista o departamento institucional."
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-xs text-red-700">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div className="space-y-3 text-xs">
          {/* Área Destino */}
          <div>
            <label className="block font-bold text-slate-700 uppercase mb-1">
              Departamento / Área Destino *
            </label>
            <select
              value={areaDestino}
              onChange={(e) => {
                setAreaDestino(e.target.value);
                setUsuarioDestino("");
              }}
              className="w-full p-2 border border-slate-300 rounded-lg bg-slate-50 focus:ring-2 focus:ring-blue-500 font-semibold uppercase"
            >
              <option value="1">DIRECCIÓN FINANCIERA (DFI)</option>
              <option value="2">PRESUPUESTO</option>
              <option value="3">CONTABILIDAD</option>
              <option value="4">TESORERÍA / CAJA Y COBRANZAS</option>
              <option value="6">ARCHIVO INSTITUCIONAL</option>
            </select>
          </div>

          {/* Funcionario Destinatario */}
          <div>
            <label className="block font-bold text-slate-700 uppercase mb-1">
              Servidor Público Destinatario (Opcional)
            </label>
            <select
              value={usuarioDestino}
              onChange={(e) => setUsuarioDestino(e.target.value)}
              className="w-full p-2 border border-slate-300 rounded-lg bg-slate-50 focus:ring-2 focus:ring-blue-500 uppercase"
            >
              <option value="">-- ASIGNACIÓN GENERAL DE BANDEJA DEL ÁREA --</option>
              {filteredUsers.map((u) => (
                <option key={u.id_usuario} value={u.id_usuario}>
                  {u.nombre_completo} - {u.cargo} ({u.estado_disponibilidad})
                </option>
              ))}
            </select>
          </div>

          {/* Motivo */}
          <div>
            <label className="block font-bold text-slate-700 uppercase mb-1">
              Motivo o Justificación de la Derivación *
            </label>
            <textarea
              rows={3}
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 font-medium"
              placeholder="Describa el motivo de la derivación o reasignación..."
              required
            />
          </div>
        </div>

        {/* Buttons */}
        <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
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
            className="flex items-center gap-2 px-5 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg uppercase shadow-xs disabled:opacity-50"
          >
            <Send className="w-4 h-4" />
            {loading ? "Derivando..." : "Confirmar Derivación"}
          </button>
        </div>
      </form>
    </Modal>
  );
};
