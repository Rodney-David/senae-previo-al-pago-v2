"use client";

import React, { useState, useEffect } from "react";
import { TramiteCompletoDTO, UsuarioInstitucional } from "@/types";
import { formatDate } from "@/lib/utils";
import { Calculator, CheckCircle2, AlertCircle, Edit3, Scale } from "lucide-react";

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
  const [curDevengado, setCurDevengado] = useState(
    tramite.numero_cur_devengado || ""
  );
  const [curContable, setCurContable] = useState(tramite.numero_cur_contable || "");
  const [numLiquidacion, setNumLiquidacion] = useState(tramite.numero_liquidacion || "");
  const [numJuicio, setNumJuicio] = useState(tramite.numero_juicio || "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setCurDevengado(tramite.numero_cur_devengado || "");
    setCurContable(tramite.numero_cur_contable || "");
    setNumLiquidacion(tramite.numero_liquidacion || "");
    setNumJuicio(tramite.numero_juicio || "");
  }, [tramite]);

  const canEdit =
    (currentUser?.id_area === 3 || currentUser?.rol === "ADMIN") &&
    tramite.estado_general !== "ARCHIVADO" &&
    tramite.estado_general !== "ANULADO";

  const tipoCurPermitido = tramite.tipos_tramite?.tipo_cur_permitido || "DEVENGADO";
  const requiereDevengado = tipoCurPermitido === "DEVENGADO" || tipoCurPermitido === "AMBOS";
  const requiereContable = tipoCurPermitido === "CONTABLE" || tipoCurPermitido === "AMBOS";

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();

    if (tipoCurPermitido === "CONTABLE" && !curContable.trim()) {
      setError(`Este proceso (${tramite.tipos_tramite?.nombre || "Contable"}) requiere obligatoriamente el CUR Contable.`);
      return;
    }
    if (tipoCurPermitido === "DEVENGADO" && !curDevengado.trim()) {
      setError(`Este proceso (${tramite.tipos_tramite?.nombre || "Presupuestario"}) requiere obligatoriamente el CUR Devengado.`);
      return;
    }
    if (!curDevengado.trim() && !curContable.trim()) {
      setError("Debe ingresar al menos un número oficial de CUR.");
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/tramites/${tramite.id_tramite}/flujo`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          accion: "GUARDAR_DATOS_CONTABILIDAD",
          datos: {
            numero_cur_devengado: curDevengado.trim() || null,
            numero_cur_contable: curContable.trim() || null,
            numero_liquidacion: numLiquidacion.trim() || null,
            numero_juicio: numJuicio.trim() || null,
          },
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Error al guardar datos contables");
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
      <div className="px-5 py-3.5 bg-slate-900 text-white flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Calculator className="w-4 h-4 text-blue-400" />
          <h3 className="text-xs font-bold uppercase tracking-wider">
            3. Control Previo y Registro Contable
          </h3>
        </div>
        <div className="flex items-center gap-3">
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
            <div className="p-3 bg-blue-50/70 border border-blue-200 rounded-lg text-xs text-blue-900">
              <span className="font-bold">Regla de Proceso: </span>
              <span>
                Para &quot;{tramite.tipos_tramite?.nombre || "General"}&quot;, la normativa exige:{" "}
                <strong className="uppercase font-semibold">
                  {tipoCurPermitido === "CONTABLE"
                    ? "CUR Contable (Sin Devengado)"
                    : tipoCurPermitido === "DEVENGADO"
                    ? "CUR Devengado"
                    : "CUR Devengado o Contable"}
                </strong>
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  CUR Devengado {tipoCurPermitido === "DEVENGADO" ? "*" : ""}
                </label>
                <input
                  type="text"
                  value={curDevengado}
                  onChange={(e) => setCurDevengado(e.target.value)}
                  disabled={tipoCurPermitido === "CONTABLE"}
                  placeholder={
                    tipoCurPermitido === "CONTABLE"
                      ? "NO APLICA PARA ESTE PROCESO"
                      : "ej. CUR-DEV-2026-0612"
                  }
                  className={`w-full text-xs border rounded-lg p-2.5 font-mono focus:ring-2 focus:ring-blue-500 focus:outline-none uppercase font-semibold ${
                    tipoCurPermitido === "CONTABLE"
                      ? "bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed"
                      : "bg-white border-slate-300 text-slate-900"
                  }`}
                  required={tipoCurPermitido === "DEVENGADO"}
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  CUR Contable {tipoCurPermitido === "CONTABLE" ? "*" : ""}
                </label>
                <input
                  type="text"
                  value={curContable}
                  onChange={(e) => setCurContable(e.target.value)}
                  disabled={tipoCurPermitido === "DEVENGADO"}
                  placeholder={
                    tipoCurPermitido === "DEVENGADO"
                      ? "NO APLICA PARA ESTE PROCESO"
                      : "ej. CUR-CONT-2026-0044"
                  }
                  className={`w-full text-xs border rounded-lg p-2.5 font-mono focus:ring-2 focus:ring-blue-500 focus:outline-none uppercase font-semibold ${
                    tipoCurPermitido === "DEVENGADO"
                      ? "bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed"
                      : "bg-white border-slate-300 text-slate-900"
                  }`}
                  required={tipoCurPermitido === "CONTABLE"}
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Nro. Liquidación (Opcional)
                </label>
                <input
                  type="text"
                  value={numLiquidacion}
                  onChange={(e) => setNumLiquidacion(e.target.value)}
                  placeholder="ej. LIQ-2026-0098"
                  className="w-full text-xs bg-white border border-slate-300 rounded-lg p-2.5 font-mono focus:ring-2 focus:ring-blue-500 focus:outline-none uppercase font-semibold text-slate-900"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Nro. Juicio / Coactiva (Opcional)
                </label>
                <input
                  type="text"
                  value={numJuicio}
                  onChange={(e) => setNumJuicio(e.target.value)}
                  placeholder="ej. JUIC-COACT-045"
                  className="w-full text-xs bg-white border border-slate-300 rounded-lg p-2.5 font-mono focus:ring-2 focus:ring-blue-500 focus:outline-none uppercase font-semibold text-slate-900"
                />
              </div>
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
                {loading ? "Guardando..." : "Guardar Datos Contables"}
              </button>
            </div>
          </form>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
            <div>
              <span className="text-[11px] font-bold text-slate-500 uppercase block">
                CUR Devengado:
              </span>
              <span className="text-xs font-mono font-bold text-slate-900 uppercase">
                {tipoCurPermitido === "CONTABLE"
                  ? "NO APLICA"
                  : tramite.numero_cur_devengado || "PENDIENTE"}
              </span>
            </div>

            <div>
              <span className="text-[11px] font-bold text-slate-500 uppercase block">
                CUR Contable:
              </span>
              <span className="text-xs font-mono font-bold text-slate-900 uppercase">
                {tipoCurPermitido === "DEVENGADO"
                  ? "NO APLICA"
                  : tramite.numero_cur_contable || "PENDIENTE"}
              </span>
            </div>

            <div>
              <span className="text-[11px] font-bold text-slate-500 uppercase block">
                Nro. Liquidación:
              </span>
              <span className="text-xs font-mono font-semibold text-slate-800 uppercase">
                {tramite.numero_liquidacion || "NO REGISTRADO"}
              </span>
            </div>

            <div>
              <span className="text-[11px] font-bold text-slate-500 uppercase block">
                Nro. Juicio Coactivo:
              </span>
              <span className="text-xs font-mono font-semibold text-slate-800 uppercase">
                {tramite.numero_juicio || "NO REGISTRADO"}
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
