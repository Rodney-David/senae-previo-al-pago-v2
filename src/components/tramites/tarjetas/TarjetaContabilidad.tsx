"use client";

import React, { useState, useEffect, useMemo } from "react";
import { TramiteCompletoDTO, UsuarioInstitucional } from "@/types";
import { Calculator, CheckCircle2, AlertCircle, Edit3, Plus, Trash2, ChevronDown, Send } from "lucide-react";

interface TarjetaContabilidadProps {
  tramite: TramiteCompletoDTO;
  currentUser: UsuarioInstitucional | null;
  onRefresh: () => void;
}

export const TarjetaContabilidad: React.FC<TarjetaContabilidadProps> = ({
  tramite,
  currentUser,
  onRefresh,
}) => {
  const [isEditing, setIsEditing] = useState(false);

  const parseCurs = (val?: string | null): string[] => {
    if (!val) return [];
    try {
      const parsed = JSON.parse(val);
      if (Array.isArray(parsed)) return parsed.map(String).map((s) => s.trim()).filter(Boolean);
    } catch {}
    return val
      .split(/[,;\n]+/)
      .map((s) => s.trim())
      .filter(Boolean);
  };

  // Claves estables para filas dinámicas
  interface FilaDinamicaContabilidad {
    id: string;
    valor: string;
  }

  const crearFilaDinamica = (prefijo: string, valor: string = ""): FilaDinamicaContabilidad => ({
    id: `${prefijo}-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
    valor,
  });

  const [curDevList, setCurDevList] = useState<FilaDinamicaContabilidad[]>([]);
  const [curConList, setCurConList] = useState<FilaDinamicaContabilidad[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isEditing) return;
    setCurDevList(
      parseCurs(tramite.numero_cur_devengado).map((v) => crearFilaDinamica("cur-dev", v))
    );
    setCurConList(
      parseCurs(tramite.numero_cur_contable).map((v) => crearFilaDinamica("cur-con", v))
    );
  }, [tramite, isEditing]);

  const canEdit =
    (currentUser?.id_area === 3 || currentUser?.rol === "ADMIN") &&
    tramite.estado_general !== "ARCHIVO" &&
    tramite.estado_general !== "ARCHIVADO" &&
    tramite.estado_general !== "INSUBSISTENTE" &&
    tramite.estado_general !== "ANULADO";

  const isDefaultOpen = useMemo(() => {
    if (!currentUser) return true;
    const rol = (currentUser.rol || "").toUpperCase();
    const cargo = (currentUser.cargo || "").toUpperCase();
    if (
      rol === "ADMIN" ||
      rol === "DIRECTORA" ||
      rol === "SECRETARIA" ||
      cargo.includes("DIRECTORA") ||
      cargo.includes("SECRETARIA")
    ) {
      return true;
    }
    if (currentUser.id_area === 6 || cargo.includes("ARCHIVO")) {
      return false;
    }
    return currentUser.id_area === 3;
  }, [currentUser]);

  const [isOpen, setIsOpen] = useState(isDefaultOpen);

  useEffect(() => {
    setIsOpen(isDefaultOpen);
  }, [isDefaultOpen]);

  const handleAddCurDev = () => {
    if (curDevList.some((c) => !c.valor.trim())) {
      setError("Complete el CUR Devengado actual antes de agregar uno nuevo.");
      return;
    }
    setError(null);
    setCurDevList((prev) => [...prev, crearFilaDinamica("cur-dev", "")]);
  };

  const handleRemoveCurDev = (id: string) => {
    setCurDevList((prev) => prev.filter((item) => item.id !== id));
  };

  const handleUpdateCurDev = (id: string, val: string) => {
    setCurDevList((prev) =>
      prev.map((item) => (item.id === id ? { ...item, valor: val } : item))
    );
  };

  const handleAddCurCon = () => {
    if (curConList.some((c) => !c.valor.trim())) {
      setError("Complete el CUR Contable actual antes de agregar uno nuevo.");
      return;
    }
    setError(null);
    setCurConList((prev) => [...prev, crearFilaDinamica("cur-con", "")]);
  };

  const handleRemoveCurCon = (id: string) => {
    setCurConList((prev) => prev.filter((item) => item.id !== id));
  };

  const handleUpdateCurCon = (id: string, val: string) => {
    setCurConList((prev) =>
      prev.map((item) => (item.id === id ? { ...item, valor: val } : item))
    );
  };

  const handleStartEdit = () => {
    setIsOpen(true);
    // Si están vacíos, iniciamos con una fila vacía para facilidad de tipeo
    const devList = parseCurs(tramite.numero_cur_devengado);
    const conList = parseCurs(tramite.numero_cur_contable);
    setCurDevList(
      devList.length > 0
        ? devList.map((v) => crearFilaDinamica("cur-dev", v))
        : [crearFilaDinamica("cur-dev", "")]
    );
    setCurConList(
      conList.length > 0
        ? conList.map((v) => crearFilaDinamica("cur-con", v))
        : [crearFilaDinamica("cur-con", "")]
    );
    setIsEditing(true);
  };

  const handleSave = async (e: React.FormEvent, enviarJefe: boolean = false) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    // Descartar filas vacías o con puros espacios en blanco antes de guardar
    const devClean = curDevList
      .map((s) => s.valor.trim())
      .filter((s) => s.length > 0);
    const conClean = curConList
      .map((s) => s.valor.trim())
      .filter((s) => s.length > 0);

    try {
      const accion = enviarJefe ? "ENVIAR_A_JEFATURA_CONTABILIDAD" : "GUARDAR_DATOS_CONTABILIDAD";
      const res = await fetch(`/api/tramites/${tramite.id_tramite}/flujo`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          accion,
          datos: {
            numero_cur_devengado: devClean.length > 0 ? devClean.join(", ") : null,
            numero_cur_contable: conClean.length > 0 ? conClean.join(", ") : null,
          },
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Error al procesar datos contables");
      setIsEditing(false);
      onRefresh();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const curDevengadosActivos = parseCurs(tramite.numero_cur_devengado);
  const curContablesActivos = parseCurs(tramite.numero_cur_contable);

  return (
    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs w-full max-w-full min-w-0">
      <div
        onClick={() => setIsOpen(!isOpen)}
        className="px-5 py-3.5 bg-slate-900 text-white flex flex-wrap items-center justify-between gap-3 cursor-pointer select-none hover:bg-slate-850 transition-colors"
      >
        <div className="flex items-center gap-2.5">
          <Calculator className="w-4 h-4 text-blue-400" />
          <h3 className="text-xs font-bold uppercase tracking-wider">
            CONTABILIDAD
          </h3>
          <ChevronDown
            className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${
              isOpen ? "rotate-180 text-blue-400" : ""
            }`}
          />
        </div>
        <div className="flex items-center gap-3" onClick={(e) => e.stopPropagation()}>
          {tramite.aprobado_contabilidad ? (
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-[11px] font-bold uppercase bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
              <CheckCircle2 className="w-3.5 h-3.5" /> Aprobado por Contador General
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-[11px] font-bold uppercase bg-amber-500/20 text-amber-300 border border-amber-500/30">
              <AlertCircle className="w-3.5 h-3.5" /> Pendiente de Aprobación Contable
            </span>
          )}

          {canEdit && !isEditing && (
            <button
              onClick={handleStartEdit}
              className="px-3 py-1 text-xs font-bold uppercase bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center gap-1 transition-colors shadow-2xs"
            >
              <Edit3 className="w-3.5 h-3.5" /> Editar Datos
            </button>
          )}
        </div>
      </div>

      {isOpen && (
        <div className="p-5">
          {error && (
            <div className="mb-4 p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-lg font-medium">
              {error}
            </div>
          )}

          {isEditing ? (
            <form onSubmit={handleSave} className="space-y-5 w-full max-w-full min-w-0">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-full min-w-0">
                {/* Bloque CUR Devengado */}
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 sm:p-4 space-y-3 w-full max-w-full min-w-0 overflow-hidden">
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <label className="text-xs font-bold text-slate-800 uppercase block truncate">
                        CUR Devengado (CUR DEV)
                      </label>
                      <span className="text-[11px] text-slate-500 block truncate">
                        Opcional. Puede registrar 1 o más números oficiales.
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={handleAddCurDev}
                      className="inline-flex items-center gap-1 text-[11px] font-bold uppercase text-blue-600 hover:text-blue-800 bg-white border border-blue-200 px-2 py-1 rounded-md transition-colors shrink-0 whitespace-nowrap"
                    >
                      <Plus className="w-3 h-3" /> Agregar CUR DEV
                    </button>
                  </div>

                  <div className="overflow-x-auto w-full max-w-full min-w-0 space-y-2">
                    {curDevList.length === 0 ? (
                      <p className="text-xs text-slate-400 italic py-2">
                        No hay CUR Devengado asignado (opcional).
                      </p>
                    ) : (
                      curDevList.map((curItem, idx) => (
                        <div key={curItem.id} className="flex items-center gap-2 min-w-0">
                          <span className="text-[11px] font-mono font-bold text-slate-400 w-12 shrink-0">
                            CUR {idx + 1}:
                          </span>
                          <input
                            type="text"
                            value={curItem.valor}
                            onChange={(e) => handleUpdateCurDev(curItem.id, e.target.value)}
                            placeholder={`ej. CUR-DEV-${idx + 1}`}
                            className="flex-1 min-w-[120px] text-xs bg-white border border-slate-300 rounded-lg p-2 font-mono uppercase font-semibold text-slate-900 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                          />
                          <button
                            type="button"
                            onClick={() => handleRemoveCurDev(curItem.id)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer shrink-0"
                            title="Eliminar CUR"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* Bloque CUR Contable / Compromiso */}
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 sm:p-4 space-y-3 w-full max-w-full min-w-0 overflow-hidden">
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <label className="text-xs font-bold text-slate-800 uppercase block truncate">
                        CUR Contable (CUR CON)
                      </label>
                      <span className="text-[11px] text-slate-500 block truncate">
                        Opcional. Puede registrar 1 o más números oficiales.
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={handleAddCurCon}
                      className="inline-flex items-center gap-1 text-[11px] font-bold uppercase text-purple-600 hover:text-purple-800 bg-white border border-purple-200 px-2 py-1 rounded-md transition-colors shrink-0 whitespace-nowrap"
                    >
                      <Plus className="w-3 h-3" /> Agregar CUR CON
                    </button>
                  </div>

                  <div className="overflow-x-auto w-full max-w-full min-w-0 space-y-2">
                    {curConList.length === 0 ? (
                      <p className="text-xs text-slate-400 italic py-2">
                        No hay CUR Contable asignado (opcional).
                      </p>
                    ) : (
                      curConList.map((curItem, idx) => (
                        <div key={curItem.id} className="flex items-center gap-2 min-w-0">
                          <span className="text-[11px] font-mono font-bold text-slate-400 w-12 shrink-0">
                            CUR {idx + 1}:
                          </span>
                          <input
                            type="text"
                            value={curItem.valor}
                            onChange={(e) => handleUpdateCurCon(curItem.id, e.target.value)}
                            placeholder={`ej. CUR-CON-${idx + 1}`}
                            className="flex-1 min-w-[120px] text-xs bg-white border border-slate-300 rounded-lg p-2 font-mono uppercase font-semibold text-slate-900 focus:ring-2 focus:ring-purple-500 focus:outline-none"
                          />
                          <button
                            type="button"
                            onClick={() => handleRemoveCurCon(curItem.id)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer shrink-0"
                            title="Eliminar CUR"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  disabled={loading}
                  className="px-3.5 py-1.5 text-xs font-semibold uppercase text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-1.5 text-xs font-bold uppercase text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors shadow-xs cursor-pointer"
                >
                  {loading ? "Guardando..." : "Guardar Datos"}
                </button>
                {currentUser?.rol === "ANALISTA" && (
                  <button
                    type="button"
                    onClick={(e) => handleSave(e, true)}
                    disabled={loading}
                    className="px-4 py-1.5 text-xs font-bold uppercase text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors shadow-xs flex items-center gap-1.5 cursor-pointer"
                    title="Guardar los números de CUR y remitir automáticamente al Contador General para visto bueno"
                  >
                    <Send className="w-3.5 h-3.5" />
                    {loading ? "Enviando..." : "Guardar y Enviar a Jefatura"}
                  </button>
                )}
              </div>
            </form>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
              {/* Vista CUR Devengado */}
              <div className="border border-slate-200 rounded-xl p-4 bg-slate-50/50">
                <div className="flex items-center justify-between mb-2 pb-1.5 border-b border-slate-200">
                  <span className="text-[11px] font-bold text-slate-600 uppercase">
                    CUR Devengado (CUR DEV)
                  </span>
                  <span className="text-[10px] text-slate-400 uppercase font-mono">
                    {curDevengadosActivos.length} Registrado(s)
                  </span>
                </div>

                {curDevengadosActivos.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {curDevengadosActivos.map((cur, idx) => (
                      <span
                        key={`cur-dev-ro-${idx}-${cur}`}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-blue-50 border border-blue-200 text-blue-900 font-mono font-bold text-xs"
                      >
                        <span className="text-[10px] text-blue-500 font-normal">#{idx + 1}</span>
                        <span>{cur}</span>
                      </span>
                    ))}
                  </div>
                ) : (
                  <span className="text-xs text-slate-400 italic">
                    Sin registrar (Opcional)
                  </span>
                )}
              </div>

              {/* Vista CUR Contable */}
              <div className="border border-slate-200 rounded-xl p-4 bg-slate-50/50">
                <div className="flex items-center justify-between mb-2 pb-1.5 border-b border-slate-200">
                  <span className="text-[11px] font-bold text-slate-600 uppercase">
                    CUR Contable (CUR CON)
                  </span>
                  <span className="text-[10px] text-slate-400 uppercase font-mono">
                    {curContablesActivos.length} Registrado(s)
                  </span>
                </div>

                {curContablesActivos.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {curContablesActivos.map((cur, idx) => (
                      <span
                        key={`cur-con-ro-${idx}-${cur}`}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-purple-50 border border-purple-200 text-purple-900 font-mono font-bold text-xs"
                      >
                        <span className="text-[10px] text-purple-500 font-normal">#{idx + 1}</span>
                        <span>{cur}</span>
                      </span>
                    ))}
                  </div>
                ) : (
                  <span className="text-xs text-slate-400 italic">
                    Sin registrar (Opcional)
                  </span>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
