"use client";

import React, { useState } from "react";
import {
  Printer,
  FileDown,
  FileSpreadsheet,
  Check,
  X,
  RefreshCw,
  AlertCircle,
  FileText,
} from "lucide-react";

export interface ColumnaDocumentoPreview {
  key: string;
  header: string;
  width?: string;
  align?: "left" | "center" | "right";
  render?: (item: any, index: number) => React.ReactNode;
}

export interface DocumentoPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  tituloModal: string;
  tituloDocumento: string;
  subtituloDocumento?: string;
  columnas: ColumnaDocumentoPreview[];
  datos: any[];
  totalRow?: {
    label: string;
    colSpanLabel: number;
    value: string;
  };
  onDescargarPdf?: () => Promise<void> | void;
  onDescargarExcel?: () => Promise<void> | void;
  onConfirmar: () => Promise<void> | void;
  textoBotonConfirmar?: string;
  loadingConfirmar?: boolean;
}

export const DocumentoPreviewModal: React.FC<DocumentoPreviewModalProps> = ({
  isOpen,
  onClose,
  tituloModal,
  tituloDocumento,
  subtituloDocumento,
  columnas,
  datos,
  totalRow,
  onDescargarPdf,
  onDescargarExcel,
  onConfirmar,
  textoBotonConfirmar = "Confirmar y Procesar",
  loadingConfirmar = false,
}) => {
  const [descargandoPdf, setDescargandoPdf] = useState(false);
  const [descargandoExcel, setDescargandoExcel] = useState(false);
  const [errorLocal, setErrorLocal] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleDescargarPdf = async () => {
    if (!onDescargarPdf) return;
    try {
      setDescargandoPdf(true);
      setErrorLocal(null);
      await onDescargarPdf();
    } catch (err: any) {
      setErrorLocal(err?.message || "Error al descargar PDF");
    } finally {
      setDescargandoPdf(false);
    }
  };

  const handleDescargarExcel = async () => {
    if (!onDescargarExcel) return;
    try {
      setDescargandoExcel(true);
      setErrorLocal(null);
      await onDescargarExcel();
    } catch (err: any) {
      setErrorLocal(err?.message || "Error al descargar Excel");
    } finally {
      setDescargandoExcel(false);
    }
  };

  const fechaHoy = new Date().toLocaleDateString("es-EC", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 backdrop-blur-xs p-2 sm:p-4 md:p-6 print:p-0 print:bg-white print:static print-document-root animate-in fade-in duration-150">
      <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-6xl max-h-[94vh] flex flex-col overflow-hidden print:border-none print:shadow-none print:max-w-none print:max-h-none print:overflow-visible">
        {/* Header de la Modal (Fijo, se oculta en impresión) */}
        <div className="px-5 py-3.5 bg-slate-900 text-white flex flex-wrap items-center justify-between gap-3 shrink-0 shadow-md print:hidden">
          <div className="flex items-center gap-2 min-w-0">
            <FileText className="w-4 h-4 text-blue-400 shrink-0" />
            <h3 className="text-xs font-bold uppercase tracking-wider truncate">
              {tituloModal}
            </h3>
            <span className="text-[11px] px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 font-semibold border border-blue-500/30">
              {datos.length} trámite(s)
            </span>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {onDescargarPdf && (
              <button
                type="button"
                onClick={handleDescargarPdf}
                disabled={descargandoPdf || loadingConfirmar}
                className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 disabled:bg-slate-700 text-white text-xs font-bold rounded-md flex items-center gap-1.5 transition-colors shadow-xs cursor-pointer"
                title="Descargar documento oficial en formato PDF"
              >
                {descargandoPdf ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <FileDown className="w-3.5 h-3.5" />
                )}
                Descargar PDF
              </button>
            )}

            <button
              type="button"
              onClick={() => window.print()}
              disabled={loadingConfirmar}
              className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-700 text-white text-xs font-bold rounded-md flex items-center gap-1.5 transition-colors shadow-xs cursor-pointer"
              title="Imprimir documento oficial en formato horizontal"
            >
              <Printer className="w-3.5 h-3.5" />
              Imprimir
            </button>

            {onDescargarExcel && (
              <button
                type="button"
                onClick={handleDescargarExcel}
                disabled={descargandoExcel || loadingConfirmar}
                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-700 text-white text-xs font-bold rounded-md flex items-center gap-1.5 transition-colors shadow-xs cursor-pointer"
                title="Descargar documento oficial en formato Excel"
              >
                {descargandoExcel ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <FileSpreadsheet className="w-3.5 h-3.5" />
                )}
                Descargar Excel
              </button>
            )}

            <button
              type="button"
              onClick={onClose}
              disabled={loadingConfirmar}
              className="text-slate-400 hover:text-white transition-colors p-1.5 rounded-md hover:bg-slate-800 cursor-pointer ml-1"
              title="Cerrar vista previa"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {errorLocal && (
          <div className="px-5 py-2.5 bg-rose-50 border-b border-rose-200 text-rose-700 text-xs font-medium flex items-center gap-2 print:hidden">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorLocal}</span>
          </div>
        )}

        {/* Hoja de Documento Oficial - Contenedor scrolleable */}
        <div className="flex-1 overflow-y-auto overflow-x-auto p-4 sm:p-6 bg-slate-50 text-slate-900 print:p-0 print:bg-white print:overflow-visible font-sans">
          <div className="bg-white border border-slate-300 shadow-sm rounded-lg overflow-hidden print:border-none print:shadow-none print:rounded-none">
            {/* Fila 1: Título Azul Institucional SENAE (#0B3B60) */}
            <div className="bg-[#0B3B60] text-white py-3 px-4 text-center border-b border-slate-900">
              <h2 className="text-sm font-bold uppercase tracking-wider font-sans">
                {tituloDocumento}
              </h2>
            </div>

            {/* Fila 2: Subtítulo Gris Institucional (#F1F5F9 / #475569) */}
            <div className="bg-[#F1F5F9] text-[#475569] py-2 px-4 text-center border-b border-slate-900 font-bold font-sans text-[11px] tracking-wide">
              {subtituloDocumento ||
                `SERVICIO NACIONAL DE ADUANA DEL ECUADOR | FECHA DE EMISIÓN: ${fechaHoy}`}
            </div>

            {/* Tabla de Documento */}
            <div className="overflow-x-auto w-full">
              <table className="min-w-full text-[11px] border-collapse border border-slate-900 font-sans">
                <thead>
                  <tr className="bg-[#1E3A8A] text-white font-bold uppercase border-b border-slate-900">
                    {columnas.map((col, idx) => (
                      <th
                        key={col.key || idx}
                        style={{ width: col.width }}
                        className={`border border-slate-900 py-2 px-2 text-center text-[10.5px] font-bold tracking-tight ${
                          col.align === "left"
                            ? "text-left"
                            : col.align === "right"
                            ? "text-right"
                            : "text-center"
                        }`}
                      >
                        {col.header}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {datos.length === 0 ? (
                    <tr>
                      <td
                        colSpan={columnas.length}
                        className="border border-slate-900 py-8 text-center text-slate-400 italic"
                      >
                        No hay trámites seleccionados para este documento.
                      </td>
                    </tr>
                  ) : (
                    datos.map((item, rowIdx) => (
                      <tr
                        key={item.id_tramite || rowIdx}
                        className="border-b border-slate-900 hover:bg-slate-50/80 transition-colors"
                      >
                        {columnas.map((col, colIdx) => (
                          <td
                            key={col.key || colIdx}
                            className={`border border-slate-900 py-2 px-2 text-slate-800 ${
                              col.align === "right"
                                ? "text-right font-medium"
                                : col.align === "center"
                                ? "text-center"
                                : "text-left"
                            }`}
                          >
                            {col.render
                              ? col.render(item, rowIdx)
                              : item[col.key] !== undefined && item[col.key] !== null
                              ? String(item[col.key])
                              : "-"}
                          </td>
                        ))}
                      </tr>
                    ))
                  )}
                </tbody>
                {totalRow && datos.length > 0 && (
                  <tfoot>
                    <tr className="bg-[#F1F5F9] font-bold text-slate-900 border-t border-slate-900">
                      <td
                        colSpan={totalRow.colSpanLabel}
                        className="border border-slate-900 py-2.5 px-3 text-right font-bold text-[#0B3B60] text-xs"
                      >
                        {totalRow.label}
                      </td>
                      <td className="border border-slate-900 py-2.5 px-3 text-right font-bold text-[#0B3B60] text-xs">
                        {totalRow.value}
                      </td>
                      {columnas.length > totalRow.colSpanLabel + 1 && (
                        <td
                          colSpan={columnas.length - totalRow.colSpanLabel - 1}
                          className="border border-slate-900 py-2.5 px-2 bg-[#F1F5F9]"
                        ></td>
                      )}
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          </div>
        </div>

        {/* Footer Modal con Botones de Confirmación y Cancelación */}
        <div className="px-5 py-3 bg-white border-t border-slate-200 flex flex-wrap items-center justify-between gap-3 shrink-0 print:hidden shadow-xs">
          <span className="text-xs text-slate-500">
            Revise los datos cuidadosamente. Al confirmar, los trámites cambiarán de estado y custodio formalmente.
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={loadingConfirmar}
              className="px-4 py-1.5 text-xs font-semibold uppercase text-slate-700 bg-white border border-slate-300 hover:bg-slate-100 disabled:opacity-50 rounded-lg transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={onConfirmar}
              disabled={loadingConfirmar || datos.length === 0}
              className="px-5 py-1.5 text-xs font-bold uppercase text-white bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 rounded-lg transition-colors shadow-xs flex items-center gap-1.5 cursor-pointer"
            >
              {loadingConfirmar ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Procesando...</span>
                </>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  <span>{textoBotonConfirmar}</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
