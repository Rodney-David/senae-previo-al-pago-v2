"use client";

import React, { useState, useEffect } from "react";
import { Modal } from "@/components/ui/Modal";
import { UserCheck, AlertCircle } from "lucide-react";

interface ModalReasignarInteligenteProps {
  isOpen: boolean;
  onClose: () => void;
  idTramite: number;
  mensajeAlerta?: string;
  analistasDisponibles?: any[];
  onSuccess: () => void;
}

export const ModalReasignarInteligente: React.FC<ModalReasignarInteligenteProps> = ({
  isOpen,
  onClose,
  idTramite,
  mensajeAlerta,
  analistasDisponibles = [],
  onSuccess,
}) => {
  const [analistas, setAnalistas] = useState<any[]>(analistasDisponibles);
  const [idAnalistaSeleccionado, setIdAnalistaSeleccionado] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (analistasDisponibles && analistasDisponibles.length > 0) {
      setAnalistas(analistasDisponibles);
      setIdAnalistaSeleccionado(String(analistasDisponibles[0].id_usuario));
    } else {
      // Cargar analistas de presupuesto disponibles
      const loadAnalistas = async () => {
        try {
          const res = await fetch("/api/admin/usuarios");
          const data = await res.json();
          if (data.usuarios) {
            const disponibles = data.usuarios.filter(
              (u: any) =>
                u.id_area === 2 &&
                u.rol === "ANALISTA" &&
                u.activo &&
                u.estado_disponibilidad === "DISPONIBLE"
            );
            setAnalistas(disponibles);
            if (disponibles.length > 0) {
              setIdAnalistaSeleccionado(String(disponibles[0].id_usuario));
            }
          }
        } catch (err) {
          console.error(err);
        }
      };
      loadAnalistas();
    }
  }, [analistasDisponibles, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!idAnalistaSeleccionado) {
      setError("Debe seleccionar un analista disponible de la lista.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/tramites/${idTramite}/flujo`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          accion: "APROBAR_JEFE_PRESUPUESTO",
          datos: {
            id_analista_reasignado: Number(idAnalistaSeleccionado),
            forzar_reasignacion_jefe: true,
          },
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Error al emitir visto bueno");

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
      title="Reasignación Inteligente de Analista"
      subtitle="El analista previo está ausente (vacaciones/licencia). Seleccione un analista activo disponible."
    >
      <form onSubmit={handleSubmit} className="p-6 space-y-4">
        {mensajeAlerta && (
          <div className="p-3.5 bg-amber-50 border border-amber-300 rounded-xl flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div className="text-xs text-amber-900 leading-relaxed font-medium">
              {mensajeAlerta}
            </div>
          </div>
        )}

        {error && (
          <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-lg font-medium">
            {error}
          </div>
        )}

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Analista de Presupuesto Disponible *
          </label>
          <select
            value={idAnalistaSeleccionado}
            onChange={(e) => setIdAnalistaSeleccionado(e.target.value)}
            className="w-full text-xs bg-white border border-slate-300 rounded-lg p-2.5 font-semibold text-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-none"
            required
          >
            {analistas.map((a) => (
              <option key={a.id_usuario} value={a.id_usuario}>
                {a.nombre_completo} — {a.cargo} (DISPONIBLE)
              </option>
            ))}
          </select>
          {analistas.length === 0 && (
            <p className="text-xs text-rose-600 mt-1 font-semibold">
              No hay analistas marcados como disponibles en este momento.
            </p>
          )}
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
            disabled={loading || analistas.length === 0}
            className="px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors shadow-xs flex items-center gap-1.5"
          >
            <UserCheck className="w-4 h-4" />
            {loading ? "Reasignando..." : "Confirmar y Emitir Revisado"}
          </button>
        </div>
      </form>
    </Modal>
  );
};
