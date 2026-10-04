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
    try {
      setSavingId(idRequisito);
      const obs = activeNotes[idRequisito] || "";

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

      if (res.ok) {
        // Actualizar estado localmente sin parpadeo
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
      }
    } catch (err) {
      console.error("Error guardando checklist:", err);
    } finally {
      setSavingId(null);
    }
  };

  const handleDownloadExcel = async () => {
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
    <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden space-y-4">
      {/* Header */}
      <div className="bg-slate-900 text-white p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <ClipboardCheck className="w-5 h-5 text-blue-400 shrink-0" />
            <h2 className="text-sm font-bold tracking-tight uppercase">
              Checklist Oficial de Control Previo al Pago
            </h2>
          </div>
          <p className="text-xs text-slate-300 mt-1">
            Plantilla normativa:{" "}
            <span className="font-semibold text-white">
              {data.tramite.tipo_proceso || "Contratación y Pagos"}
            </span>{" "}
            (Manual SENAE-ME-3-6-001)
          </p>
        </div>

        <button
          onClick={handleDownloadExcel}
          disabled={downloading}
          className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors shadow-xs shrink-0 disabled:opacity-50"
        >
          <Download className={`w-4 h-4 ${downloading ? "animate-bounce" : ""}`} />
          {downloading ? "Generando Excel..." : "Descargar Excel Oficial"}
        </button>
      </div>

      <div className="px-5 pb-5 space-y-4">
        {/* Progress Bar & Summary Stats */}
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
            <div className="font-semibold text-slate-800">
              Progreso de Verificación:{" "}
              <span className="font-bold text-blue-700">
                {data.metricas.evaluados} de {data.metricas.total} requisitos (
                {data.metricas.porcentaje}%)
              </span>
            </div>

            <div className="flex items-center gap-2">
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

          {/* Bar */}
          <div className="w-full bg-slate-200 h-2.5 rounded-full overflow-hidden">
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

        {/* Filters */}
        <div className="flex items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-lg border border-slate-200 font-medium">
            <button
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

          <span className="text-[11px] text-slate-500 italic hidden sm:inline">
            Haga clic en el estado para registrar la verificación del expediente.
          </span>
        </div>

        {/* Items List */}
        <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden bg-white">
          {filteredItems.map((item, index) => {
            const isSaving = savingId === item.id_requisito;
            const isExpanded = !!expandedNotes[item.id_requisito];

            return (
              <div
                key={item.id_requisito}
                className={`p-4 transition-colors ${
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
                  {/* Text & Order */}
                  <div className="flex items-start gap-3 flex-1">
                    <span className="w-6 h-6 rounded-full bg-slate-200 text-slate-800 font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                      {item.orden || index + 1}
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

                  {/* Actions / Buttons */}
                  <div className="flex items-center gap-1.5 self-end lg:self-center shrink-0">
                    <button
                      type="button"
                      disabled={readOnly || isSaving}
                      onClick={() => handleUpdate(item.id_requisito, "CUMPLE")}
                      className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1 border ${
                        item.estado_cumplimiento === "CUMPLE"
                          ? "bg-emerald-600 text-white border-emerald-700 shadow-xs"
                          : "bg-white text-slate-700 border-slate-300 hover:bg-emerald-50 hover:text-emerald-700"
                      }`}
                      title="Cumple con el requisito"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Cumple
                    </button>

                    <button
                      type="button"
                      disabled={readOnly || isSaving}
                      onClick={() => handleUpdate(item.id_requisito, "NO_CUMPLE")}
                      className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1 border ${
                        item.estado_cumplimiento === "NO_CUMPLE"
                          ? "bg-rose-600 text-white border-rose-700 shadow-xs"
                          : "bg-white text-slate-700 border-slate-300 hover:bg-rose-50 hover:text-rose-700"
                      }`}
                      title="No cumple / Observación"
                    >
                      <XCircle className="w-3.5 h-3.5" />
                      No Cumple
                    </button>

                    <button
                      type="button"
                      disabled={readOnly || isSaving}
                      onClick={() => handleUpdate(item.id_requisito, "NO_APLICA")}
                      className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1 border ${
                        item.estado_cumplimiento === "NO_APLICA"
                          ? "bg-slate-700 text-white border-slate-800 shadow-xs"
                          : "bg-white text-slate-700 border-slate-300 hover:bg-slate-100"
                      }`}
                      title="No aplica a este tipo de trámite"
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
                      title="Agregar o ver observación"
                    >
                      {isExpanded ? (
                        <ChevronUp className="w-4 h-4" />
                      ) : (
                        <ChevronDown className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Observation Note Drawer */}
                {(isExpanded || item.observacion_especifica) && (
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
                        if (item.estado_cumplimiento) {
                          handleUpdate(item.id_requisito, item.estado_cumplimiento);
                        }
                      }}
                      placeholder="Escriba aquí la observación o detalle técnico..."
                      className="w-full text-xs bg-slate-50 border border-slate-200 rounded px-2.5 py-1 text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
