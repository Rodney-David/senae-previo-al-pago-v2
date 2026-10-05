"use client";

import React, { useState, useEffect } from "react";
import {
  ClipboardCheck,
  CheckCircle2,
  XCircle,
  MinusCircle,
  Download,
  RefreshCw,
  AlertCircle,
  FileText,
  ChevronDown,
  ChevronUp,
  Lock,
} from "lucide-react";

interface ChecklistItem {
  id_requisito: number;
  orden: number;
  descripcion: string;
  es_obligatorio: boolean;
  fase: string;
  estado_cumplimiento: "CUMPLE" | "NO_CUMPLE" | "NO_APLICA" | null;
  observacion_especifica: string;
  evaluador: string | null;
  fecha_evaluacion: string | null;
}

interface ChecklistData {
  tramite: {
    id_tramite: number;
    codigo_tramite: string;
    numero_quipux: string;
    tipo_proceso: string;
  };
  metricas: {
    total: number;
    evaluados: number;
    cumplidos: number;
    noCumplidos: number;
    noAplica: number;
    porcentaje: number;
    esCompleto: boolean;
  };
  items: ChecklistItem[];
}

interface TarjetaChecklistProps {
  idTramite: number;
  currentUserId?: number;
  readOnly?: boolean;
}

export const TarjetaChecklist: React.FC<TarjetaChecklistProps> = ({
  idTramite,
  currentUserId = 1,
  readOnly = false,
}) => {
  const [data, setData] = useState<ChecklistData | null>(null);
  const [loading, setLoading] = useState(true);
  const [isExpanded, setIsExpanded] = useState(false);
  const [savingId, setSavingId] = useState<number | null>(null);
  const [activeNotes, setActiveNotes] = useState<Record<number, string>>({});
  const [expandedNotes, setExpandedNotes] = useState<Record<number, boolean>>({});
  const [filter, setFilter] = useState<"TODOS" | "PENDIENTES" | "OBSERVADOS">("TODOS");
  const [downloading, setDownloading] = useState(false);

  const loadChecklist = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/tramites/${idTramite}/checklist`);
      if (res.ok) {
        const json = await res.json();
        setData(json);

        // Inicializar notas
        const notes: Record<number, string> = {};
        for (const item of json.items || []) {
          notes[item.id_requisito] = item.observacion_especifica || "";
        }
        setActiveNotes(notes);
      }
    } catch (err) {
      console.error("Error al cargar checklist:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadChecklist();
  }, [idTramite]);

  const handleUpdate = async (
    idRequisito: number,
    nuevoEstado: "CUMPLE" | "NO_CUMPLE" | "NO_APLICA"
  ) => {
    if (readOnly) return;

    const previousData = data;
    const obs = activeNotes[idRequisito] || "";

    // Actualización optimista inmediata (0ms de latencia visual)
    setData((prev) => {
      if (!prev) return prev;
      const updatedItems = prev.items.map((i) =>
        i.id_requisito === idRequisito
          ? {
              ...i,
              estado_cumplimiento: nuevoEstado,
              observacion_especifica: obs,
              fecha_evaluacion: new Date().toISOString(),
            }
          : i
      );

      const evaluados = updatedItems.filter((i) => i.estado_cumplimiento !== null).length;
      const cumplidos = updatedItems.filter((i) => i.estado_cumplimiento === "CUMPLE").length;
      const noCumplidos = updatedItems.filter((i) => i.estado_cumplimiento === "NO_CUMPLE").length;
      const noAplica = updatedItems.filter((i) => i.estado_cumplimiento === "NO_APLICA").length;
      const total = updatedItems.length;

      return {
        ...prev,
        items: updatedItems,
        metricas: {
          total,
          evaluados,
          cumplidos,
          noCumplidos,
          noAplica,
          porcentaje: total > 0 ? Math.round((evaluados / total) * 100) : 0,
          esCompleto: evaluados === total,
        },
      };
    });

    try {
      setSavingId(idRequisito);
      const res = await fetch(`/api/tramites/${idTramite}/checklist`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id_requisito: idRequisito,
          estado_cumplimiento: nuevoEstado,
          observacion_especifica: obs,
          id_usuario: currentUserId,
        }),
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error || "Error al actualizar checklist normativo");
      }
    } catch (err: any) {
      console.error("Error guardando checklist:", err);
      // Revertir estado si ocurrió un error en el servidor
      setData(previousData);
      alert(err.message || "No se pudo registrar la verificación en el checklist.");
    } finally {
      setSavingId(null);
    }
  };

  const handleDownloadExcel = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      setDownloading(true);
      const response = await fetch(`/api/tramites/${idTramite}/checklist/export`);
      if (!response.ok) throw new Error("Error al descargar Excel");

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `CHECKLIST_${data?.tramite.numero_quipux || "TRAMITE"}.xlsx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      console.error(err);
      alert("No se pudo generar el archivo Excel del checklist");
    } finally {
      setDownloading(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 p-8 shadow-xs text-center flex flex-col items-center gap-2 text-xs text-slate-500">
        <RefreshCw className="w-5 h-5 animate-spin text-blue-600" />
        <span>Cargando checklist normativo institucional...</span>
      </div>
    );
  }

  if (!data || data.items.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs text-center text-xs text-slate-500">
        No se encontraron requisitos de checklist configurados para este tipo de trámite.
      </div>
    );
  }

  const filteredItems = data.items.filter((item) => {
    if (filter === "PENDIENTES") return item.estado_cumplimiento === null;
    if (filter === "OBSERVADOS") return item.estado_cumplimiento === "NO_CUMPLE";
    return true;
  });

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
      {/* Header Interactivo Acordeón */}
      <div
        onClick={() => setIsExpanded(!isExpanded)}
        className="bg-slate-900 text-white p-4 cursor-pointer hover:bg-slate-800 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3 select-none"
      >
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 rounded-lg bg-blue-600/30 text-blue-400">
            <ClipboardCheck className="w-5 h-5 shrink-0" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xs sm:text-sm font-bold tracking-tight uppercase">
                Checklist Oficial de Control Previo al Pago
              </h2>
              {readOnly && (
                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-slate-800 text-slate-300 border border-slate-700">
                  <Lock className="w-2.5 h-2.5" /> Solo Lectura
                </span>
              )}
            </div>
            <p className="text-[11px] text-slate-300 mt-0.5">
              Plantilla:{" "}
              <span className="font-semibold text-white">
                {data.tramite.tipo_proceso || "Contratación y Pagos"}
              </span>{" "}
              (Normativa SENAE-ME-3-6-001)
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
          <button
            type="button"
            onClick={handleDownloadExcel}
            disabled={downloading}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors shadow-xs disabled:opacity-50"
            title="Exportar hoja oficial en Excel"
          >
            <Download className={`w-3.5 h-3.5 ${downloading ? "animate-bounce" : ""}`} />
            <span className="hidden sm:inline">Descargar Excel</span>
          </button>

          <button
            type="button"
            className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-slate-200 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg transition-colors"
          >
            {isExpanded ? (
              <>
                <span>Contraer</span>
                <ChevronUp className="w-4 h-4 text-slate-300" />
              </>
            ) : (
              <>
                <span>Ver requisitos ({data.items.length})</span>
                <ChevronDown className="w-4 h-4 text-blue-400" />
              </>
            )}
          </button>
        </div>
      </div>

      {/* Barra Resumen Visible Siempre (Compacta) */}
      <div
        onClick={() => setIsExpanded(!isExpanded)}
        className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs cursor-pointer hover:bg-slate-100/70 transition-colors"
      >
        <div className="flex items-center gap-3">
          <span className="font-semibold text-slate-800">
            Progreso:{" "}
            <strong className="text-blue-700 font-bold">
              {data.metricas.evaluados} de {data.metricas.total} ({data.metricas.porcentaje}%)
            </strong>
          </span>
          <div className="w-28 sm:w-36 bg-slate-200 h-2 rounded-full overflow-hidden hidden sm:block">
            <div
              className={`h-full transition-all duration-300 ${
                data.metricas.porcentaje === 100
                  ? "bg-emerald-600"
                  : data.metricas.porcentaje > 50
                  ? "bg-blue-600"
                  : "bg-amber-500"
              }`}
              style={{ width: `${data.metricas.porcentaje}%` }}
            />
          </div>
        </div>

        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
            {data.metricas.cumplidos} Cumplen
          </span>
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold bg-rose-100 text-rose-800 border border-rose-300">
            <XCircle className="w-3 h-3 text-rose-600" />
            {data.metricas.noCumplidos} No Cumplen
          </span>
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold bg-slate-200 text-slate-800 border border-slate-300">
            <MinusCircle className="w-3 h-3 text-slate-600" />
            {data.metricas.noAplica} No Aplica
          </span>
        </div>
      </div>

      {/* Contenido Desplegable (Acordeón) */}
      {isExpanded && (
        <div className="p-4 sm:p-5 space-y-4">
          {/* Banner de Solo Lectura si no es Presupuesto */}
          {readOnly && (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg flex items-center gap-2 text-xs text-amber-900">
              <Lock className="w-4 h-4 text-amber-700 shrink-0" />
              <span>
                <strong>Modo Consulta Institucional:</strong> El diligenciamiento y verificación de este checklist normativo corresponde con exclusividad a los Analistas y Jefatura del <strong>Área de Presupuesto</strong> (Manual SENAE-ME-3-6-001).
              </span>
            </div>
          )}

          {/* Filtros */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-lg border border-slate-200 font-medium self-start">
              <button
                type="button"
                onClick={() => setFilter("TODOS")}
                className={`px-2.5 py-1 rounded transition-colors ${
                  filter === "TODOS"
                    ? "bg-white text-slate-900 font-bold shadow-2xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Todos ({data.items.length})
              </button>
              <button
                type="button"
                onClick={() => setFilter("PENDIENTES")}
                className={`px-2.5 py-1 rounded transition-colors ${
                  filter === "PENDIENTES"
                    ? "bg-white text-slate-900 font-bold shadow-2xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Pendientes ({data.metricas.total - data.metricas.evaluados})
              </button>
              <button
                type="button"
                onClick={() => setFilter("OBSERVADOS")}
                className={`px-2.5 py-1 rounded transition-colors ${
                  filter === "OBSERVADOS"
                    ? "bg-white text-slate-900 font-bold shadow-2xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Con Novedad ({data.metricas.noCumplidos})
              </button>
            </div>

            {!readOnly && (
              <span className="text-[11px] text-slate-500 italic hidden sm:inline">
                Haga clic sobre el estado para registrar la verificación técnica al instante.
              </span>
            )}
          </div>

          {/* Lista de Requisitos Numerados Secuencialmente */}
          <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden bg-white">
            {filteredItems.map((item, index) => {
              const isSaving = savingId === item.id_requisito;
              const isNoteExpanded = !!expandedNotes[item.id_requisito];

              return (
                <div
                  key={item.id_requisito}
                  className={`p-3.5 transition-colors ${
                    item.estado_cumplimiento === "CUMPLE"
                      ? "bg-emerald-50/20"
                      : item.estado_cumplimiento === "NO_CUMPLE"
                      ? "bg-rose-50/25"
                      : item.estado_cumplimiento === "NO_APLICA"
                      ? "bg-slate-50/50"
                      : "hover:bg-slate-50/70"
                  }`}
                >
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                    {/* Número Secuencial y Descripción */}
                    <div className="flex items-start gap-3 flex-1">
                      <span className="w-6 h-6 rounded-full bg-slate-200 text-slate-800 font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                        {index + 1}
                      </span>
                      <div className="space-y-1">
                        <p className="text-xs text-slate-900 font-medium leading-relaxed">
                          {item.descripcion}
                        </p>
                        {item.evaluador && (
                          <p className="text-[10px] text-slate-400">
                            Evaluado por:{" "}
                            <span className="font-semibold text-slate-600">{item.evaluador}</span>
                            {item.fecha_evaluacion && (
                              <> · {new Date(item.fecha_evaluacion).toLocaleDateString("es-EC")}</>
                            )}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Botones de Verificación */}
                    <div className="flex flex-wrap items-center gap-1.5 self-start sm:self-end lg:self-center shrink-0">
                      <button
                        type="button"
                        disabled={readOnly || isSaving}
                        onClick={() => handleUpdate(item.id_requisito, "CUMPLE")}
                        className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1 border disabled:cursor-not-allowed ${
                          item.estado_cumplimiento === "CUMPLE"
                            ? "bg-emerald-600 text-white border-emerald-700 shadow-xs"
                            : "bg-white text-slate-700 border-slate-300 hover:bg-emerald-50 hover:text-emerald-700"
                        }`}
                        title={readOnly ? "Solo lectura" : "Cumple con el requisito"}
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Cumple
                      </button>

                      <button
                        type="button"
                        disabled={readOnly || isSaving}
                        onClick={() => handleUpdate(item.id_requisito, "NO_CUMPLE")}
                        className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1 border disabled:cursor-not-allowed ${
                          item.estado_cumplimiento === "NO_CUMPLE"
                            ? "bg-rose-600 text-white border-rose-700 shadow-xs"
                            : "bg-white text-slate-700 border-slate-300 hover:bg-rose-50 hover:text-rose-700"
                        }`}
                        title={readOnly ? "Solo lectura" : "No cumple / Observación"}
                      >
                        <XCircle className="w-3.5 h-3.5" />
                        No Cumple
                      </button>

                      <button
                        type="button"
                        disabled={readOnly || isSaving}
                        onClick={() => handleUpdate(item.id_requisito, "NO_APLICA")}
                        className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1 border disabled:cursor-not-allowed ${
                          item.estado_cumplimiento === "NO_APLICA"
                            ? "bg-slate-700 text-white border-slate-800 shadow-xs"
                            : "bg-white text-slate-700 border-slate-300 hover:bg-slate-100"
                        }`}
                        title={readOnly ? "Solo lectura" : "No aplica a este tipo de trámite"}
                      >
                        <MinusCircle className="w-3.5 h-3.5" />
                        No Aplica
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          setExpandedNotes((prev) => ({
                            ...prev,
                            [item.id_requisito]: !prev[item.id_requisito],
                          }))
                        }
                        className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100"
                        title="Agregar o ver observación técnica"
                      >
                        {isNoteExpanded ? (
                          <ChevronUp className="w-4 h-4" />
                        ) : (
                          <ChevronDown className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Detalle u Observación Específica */}
                  {(isNoteExpanded || item.observacion_especifica) && (
                    <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center gap-2">
                      <FileText className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <input
                        type="text"
                        disabled={readOnly}
                        value={activeNotes[item.id_requisito] || ""}
                        onChange={(e) =>
                          setActiveNotes((prev) => ({
                            ...prev,
                            [item.id_requisito]: e.target.value,
                          }))
                        }
                        onBlur={() => {
                          if (!readOnly && item.estado_cumplimiento) {
                            handleUpdate(item.id_requisito, item.estado_cumplimiento);
                          }
                        }}
                        placeholder={
                          readOnly
                            ? "Sin observación técnica registrada."
                            : "Escriba aquí la observación o detalle técnico..."
                        }
                        className="w-full text-xs bg-slate-50 border border-slate-200 rounded px-2.5 py-1 text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:bg-slate-100 disabled:text-slate-500"
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
