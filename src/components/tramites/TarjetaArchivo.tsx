"use client";

import React, { useState } from "react";
import { TramiteCompletoDTO, UsuarioInstitucional } from "@/types";
import { Archive, CheckCircle2, AlertCircle, Edit3 } from "lucide-react";

interface TarjetaArchivoProps {
  tramite: TramiteCompletoDTO;
  currentUser: UsuarioInstitucional | null;
  onRefresh: () => void;
}

export const TarjetaArchivo: React.FC<TarjetaArchivoProps> = ({
  tramite,
  currentUser,
  onRefresh,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [fojas, setFojas] = useState(tramite.fojas_fisicas ? String(tramite.fojas_fisicas) : "1");
  const [tomoCaja, setTomoCaja] = useState(tramite.codigo_tomo_caja || "");
  const [estanteria, setEstanteria] = useState(tramite.estanteria || "");
  const [ubicacion, setUbicacion] = useState(tramite.ubicacion_archivo || "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isArchived = tramite.estado_general === "FINALIZADO_ARCHIVADO";
  const canEdit =
    (currentUser?.id_area === 6 || currentUser?.rol === "ADMIN") && !isArchived;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/tramites/${tramite.id_tramite}/flujo`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          accion: "ARCHIVAR_DEFINITIVO",
          datos: {
            fojas_fisicas: Number(fojas) || 1,
            codigo_tomo_caja: tomoCaja.trim(),
            estanteria: estanteria.trim(),
            ubicacion_archivo: ubicacion.trim(),
          },
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Error al archivar expediente");
      setIsEditing(false);
      onRefresh();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
      <div className="px-5 py-3.5 bg-slate-900 text-white flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Archive className="w-4 h-4 text-blue-400" />
          <h3 className="text-xs font-semibold uppercase tracking-wider">
            6. Custodia, Archivo Central y Cierre de Expediente
          </h3>
        </div>
        <div className="flex items-center gap-3">
          {isArchived ? (
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
              <CheckCircle2 className="w-3 h-3" /> Archivado Definitivo (Ciclo Cerrado)
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-500/20 text-amber-300 border border-amber-500/30">
              <AlertCircle className="w-3 h-3" /> En Trámite / Pendiente de Archivo
            </span>
          )}

          {canEdit && !isEditing && (
            <button
              onClick={() => setIsEditing(true)}
              className="px-2.5 py-1 text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-md border border-slate-700 flex items-center gap-1 transition-colors"
            >
              <Edit3 className="w-3 h-3" /> Archivar
            </button>
          )}
        </div>
      </div>

      <div className="p-5">
        {error && (
          <div className="mb-4 p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-lg font-medium">
            {error}
          </div>
        )}

        {isEditing ? (
          <form onSubmit={handleSave} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Número de Fojas Físicas *
                </label>
                <input
                  type="number"
                  min="1"
                  value={fojas}
                  onChange={(e) => setFojas(e.target.value)}
                  className="w-full text-xs bg-white border border-slate-300 rounded-lg p-2.5 font-mono focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Código de Tomo o Caja *
                </label>
                <input
                  type="text"
                  value={tomoCaja}
                  onChange={(e) => setTomoCaja(e.target.value)}
                  placeholder="ej. CAJA-2026-04"
                  className="w-full text-xs bg-white border border-slate-300 rounded-lg p-2.5 font-mono focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Estantería y Nivel *
                </label>
                <input
                  type="text"
                  value={estanteria}
                  onChange={(e) => setEstanteria(e.target.value)}
                  placeholder="ej. EST-B2-N1"
                  className="w-full text-xs bg-white border border-slate-300 rounded-lg p-2.5 font-mono focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Ubicación Física General
                </label>
                <input
                  type="text"
                  value={ubicacion}
                  onChange={(e) => setUbicacion(e.target.value)}
                  placeholder="Archivo Central Piso 1"
                  className="w-full text-xs bg-white border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsEditing(false)}
                disabled={loading}
                className="px-3.5 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-4 py-1.5 text-xs font-medium text-white bg-slate-800 hover:bg-slate-900 rounded-lg transition-colors shadow-xs"
              >
                {loading ? "Archivando..." : "Confirmar Archivo Definitivo"}
              </button>
            </div>
          </form>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <span className="text-[11px] font-semibold text-slate-500 uppercase block">
                Fojas Físicas Verificadas:
              </span>
              <span className="text-xs font-bold text-slate-900">
                {tramite.fojas_fisicas || 1} fojas
              </span>
            </div>

            <div>
              <span className="text-[11px] font-semibold text-slate-500 uppercase block">
                Código Tomo / Caja:
              </span>
              <span className="text-xs font-mono font-medium text-slate-800">
                {tramite.codigo_tomo_caja || "-"}
              </span>
            </div>

            <div>
              <span className="text-[11px] font-semibold text-slate-500 uppercase block">
                Estantería:
              </span>
              <span className="text-xs font-mono font-medium text-slate-800">
                {tramite.estanteria || "-"}
              </span>
            </div>

            <div>
              <span className="text-[11px] font-semibold text-slate-500 uppercase block">
                Ubicación Archivo:
              </span>
              <span className="text-xs text-slate-800">
                {tramite.ubicacion_archivo || "Sin archivar"}
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
