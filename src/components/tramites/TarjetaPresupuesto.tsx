"use client";

import React, { useState, useEffect } from "react";
import { TramiteCompletoDTO, UsuarioInstitucional } from "@/types";
import { formatDate } from "@/lib/utils";
import { PieChart, CheckCircle2, AlertCircle, Edit3, Plus, Trash2, Tag, FileText } from "lucide-react";

interface TarjetaPresupuestoProps {
  tramite: TramiteCompletoDTO;
  currentUser: UsuarioInstitucional | null;
  onRefresh: () => void;
}

export const TarjetaPresupuesto: React.FC<TarjetaPresupuestoProps> = ({
  tramite,
  currentUser,
  onRefresh,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [certificacion, setCertificacion] = useState(
    tramite.certificacion_presupuestaria || ""
  );
  const [item, setItem] = useState(tramite.item_presupuestario || "");
  const [numeroFactura, setNumeroFactura] = useState(tramite.numero_factura || "");
  
  // Lista de anexos con límite de 10
  const parseInitialAnexos = (): string[] => {
    if (!tramite.anexos) return [];
    try {
      const parsed = JSON.parse(tramite.anexos);
      if (Array.isArray(parsed)) return parsed;
    } catch {
      // Si fue guardado como texto plano separado por comas
      return tramite.anexos.split(",").map((s) => s.trim()).filter(Boolean);
    }
    return [];
  };

  const [anexosList, setAnexosList] = useState<string[]>([]);
  const [nuevoAnexoInput, setNuevoAnexoInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setCertificacion(tramite.certificacion_presupuestaria || "");
    setItem(tramite.item_presupuestario || "");
    setNumeroFactura(tramite.numero_factura || "");
    setAnexosList(parseInitialAnexos());
  }, [tramite]);

  const canEdit =
    (currentUser?.id_area === 2 || currentUser?.rol === "ADMIN") &&
    tramite.estado_general !== "ARCHIVADO" &&
    tramite.estado_general !== "ANULADO";

  // Comprobar si el proceso o tipo de gestión requiere item presupuestario
  const requiereItem =
    tramite.tipo_flujo !== "EXPEDIENTE" &&
    tramite.tipos_tramite?.requiere_item_presupuestario !== false;

  const handleAddAnexo = () => {
    const trimmed = nuevoAnexoInput.trim();
    if (!trimmed) return;
    if (anexosList.length >= 10) {
      setError("Se ha alcanzado el límite máximo de 10 anexos permitidos.");
      return;
    }
    setAnexosList([...anexosList, trimmed]);
    setNuevoAnexoInput("");
    setError(null);
  };

  const handleRemoveAnexo = (index: number) => {
    setAnexosList(anexosList.filter((_, i) => i !== index));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/tramites/${tramite.id_tramite}/flujo`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          accion: "GUARDAR_DATOS_PRESUPUESTO",
          datos: {
            certificacion_presupuestaria: certificacion.trim(),
            item_presupuestario: requiereItem ? item.trim() : null,
            numero_factura: numeroFactura.trim() || null,
            anexos: JSON.stringify(anexosList),
          },
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Error al guardar datos presupuestarios");
      setIsEditing(false);
      onRefresh();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const displayedAnexos = parseInitialAnexos();

  return (
    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
      <div className="px-5 py-3.5 bg-slate-900 text-white flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <PieChart className="w-4 h-4 text-blue-400" />
          <h3 className="text-xs font-bold uppercase tracking-wider">
            2. Control y Afectación Presupuestaria
          </h3>
        </div>
        <div className="flex items-center gap-3">
          {tramite.aprobado_presupuesto ? (
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-[11px] font-bold uppercase bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
              <CheckCircle2 className="w-3.5 h-3.5" /> Aprobado por Jefe de Presupuesto
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-[11px] font-bold uppercase bg-amber-500/20 text-amber-300 border border-amber-500/30">
              <AlertCircle className="w-3.5 h-3.5" /> Pendiente de Aprobación de Jefatura
            </span>
          )}

          {canEdit && !isEditing && (
            <button
              onClick={() => setIsEditing(true)}
              className="px-3 py-1 text-xs font-bold uppercase bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center gap-1 transition-colors shadow-2xs"
            >
              <Edit3 className="w-3.5 h-3.5" /> Editar Datos
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
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Certificación Presupuestaria *
                </label>
                <input
                  type="text"
                  value={certificacion}
                  onChange={(e) => setCertificacion(e.target.value)}
                  placeholder="ej. CERT-2026-088"
                  className="w-full text-xs bg-white border border-slate-300 rounded-lg p-2.5 font-mono focus:ring-2 focus:ring-blue-500 focus:outline-none uppercase font-semibold"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Ítem Presupuestario {requiereItem ? "*" : "(No Aplica)"}
                </label>
                <input
                  type="text"
                  value={item}
                  onChange={(e) => setItem(e.target.value)}
                  disabled={!requiereItem}
                  placeholder={
                    requiereItem
                      ? "ej. 530804 - MATERIALES DE OFICINA"
                      : "NO APLICA PARA ESTA GESTIÓN"
                  }
                  className={`w-full text-xs border rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500 focus:outline-none uppercase font-semibold ${
                    !requiereItem
                      ? "bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed"
                      : "bg-white border-slate-300 text-slate-800"
                  }`}
                  required={requiereItem}
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Nro. Factura (SRI)
                  <span className="text-[10px] text-slate-400 font-normal ml-1 lowercase">
                    (obligatoria para pasar a contabilidad)
                  </span>
                </label>
                <input
                  type="text"
                  value={numeroFactura}
                  onChange={(e) => setNumeroFactura(e.target.value)}
                  placeholder="001-002-000123456"
                  className="w-full text-xs bg-white border border-slate-300 rounded-lg p-2.5 font-mono focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>
            </div>

            {/* Submódulo de Anexos con límite de 10 */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-800 uppercase flex items-center gap-1.5">
                  <Tag className="w-3.5 h-3.5 text-blue-600" />
                  Anexos Técnicos del Trámite
                  <span className="text-[11px] font-mono text-slate-500 font-normal">
                    ({anexosList.length} / 10 máx.)
                  </span>
                </span>
              </div>

              <div className="flex gap-2">
                <input
                  type="text"
                  value={nuevoAnexoInput}
                  onChange={(e) => setNuevoAnexoInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleAddAnexo();
                    }
                  }}
                  disabled={anexosList.length >= 10}
                  placeholder={
                    anexosList.length >= 10
                      ? "Límite de 10 anexos alcanzado"
                      : "Escriba el nombre o detalle del anexo y pulse Añadir..."
                  }
                  className="flex-1 text-xs bg-white border border-slate-300 rounded-lg p-2 focus:ring-2 focus:ring-blue-500 focus:outline-none uppercase font-medium disabled:bg-slate-100 disabled:text-slate-400"
                />
                <button
                  type="button"
                  onClick={handleAddAnexo}
                  disabled={anexosList.length >= 10 || !nuevoAnexoInput.trim()}
                  className="px-3 py-2 text-xs font-bold uppercase bg-slate-900 hover:bg-blue-700 disabled:bg-slate-300 text-white rounded-lg flex items-center gap-1 transition-colors shadow-2xs"
                >
                  <Plus className="w-3.5 h-3.5" /> Añadir
                </button>
              </div>

              {/* Lista de anexos agregados */}
              {anexosList.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                  {anexosList.map((anexo, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between p-2 bg-white border border-slate-200 rounded-lg text-xs"
                    >
                      <span className="text-slate-800 uppercase font-medium truncate pr-2" title={anexo}>
                        {idx + 1}. {anexo}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleRemoveAnexo(idx)}
                        className="text-slate-400 hover:text-rose-600 p-1 transition-colors"
                        title="Eliminar anexo"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-[11px] text-slate-500 italic">
                  No hay anexos agregados todavía. Puede agregar hasta 10 anexos técnicos.
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsEditing(false)}
                disabled={loading}
                className="px-3.5 py-1.5 text-xs font-semibold uppercase text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-4 py-1.5 text-xs font-bold uppercase text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors shadow-xs"
              >
                {loading ? "Guardando..." : "Guardar Datos Presupuesto"}
              </button>
            </div>
          </form>
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-xs">
              <div>
                <span className="text-[11px] font-bold text-slate-500 uppercase block">
                  Certificación Presupuestaria:
                </span>
                <span className="text-xs font-mono font-bold text-slate-900 uppercase">
                  {tramite.certificacion_presupuestaria || "PENDIENTE"}
                </span>
              </div>

              <div>
                <span className="text-[11px] font-bold text-slate-500 uppercase block">
                  Ítem Presupuestario:
                </span>
                <span className="text-xs font-semibold text-slate-800 uppercase">
                  {requiereItem
                    ? tramite.item_presupuestario || "PENDIENTE"
                    : "NO APLICA (EXPEDIENTE)"}
                </span>
              </div>

              <div>
                <span className="text-[11px] font-bold text-slate-500 uppercase block">
                  Nro. Factura Oficial:
                </span>
                <span className="text-xs font-mono font-semibold text-blue-700">
                  {tramite.numero_factura || "PENDIENTE DE INGRESO (SRI)"}
                </span>
              </div>
            </div>

            {/* Listado de Anexos solo lectura */}
            <div className="pt-3 border-t border-slate-100">
              <span className="text-[11px] font-bold text-slate-500 uppercase block mb-2">
                Anexos Registrados ({displayedAnexos.length} / 10):
              </span>
              {displayedAnexos.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {displayedAnexos.map((anexo, idx) => (
                    <span
                      key={idx}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-medium bg-slate-100 text-slate-800 border border-slate-200 uppercase"
                    >
                      <FileText className="w-3 h-3 text-blue-600" />
                      {idx + 1}. {anexo}
                    </span>
                  ))}
                </div>
              ) : (
                <div className="text-[11px] text-slate-400 italic">
                  Ningún anexo registrado en esta fase.
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
