"use client";

import React, { useState, useEffect } from "react";
import {
  FileSpreadsheet,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  Play,
  ArrowRight,
  Database,
  Building2,
  Clock,
  ExternalLink,
  ShieldAlert,
  FileCheck2,
} from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import Link from "next/link";

interface AnalisisData {
  ruta_archivo: string;
  existe: boolean;
  total_filas_pago: number;
  total_filas_garantia: number;
  total_general: number;
  estados_pago: Record<string, number>;
  estados_garantia: Record<string, number>;
  ciudades: Record<string, number>;
  muestras_pago: Array<{
    fila: number;
    quipux: string;
    ciudad: string;
    proveedor: string;
    valor: number;
    estado: string;
    analista: string;
  }>;
  muestras_garantia: Array<{
    fila: number;
    quipux: string;
    ciudad: string;
    beneficiario: string;
    valor: number;
    estado: string;
    analista: string;
  }>;
  ya_migrados_en_bd: number;
}

export const SeccionMigracionExcel: React.FC = () => {
  const [analisis, setAnalisis] = useState<AnalisisData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [tabMuestra, setTabMuestra] = useState<"pago" | "garantia" | "resumen">("pago");
  const [migrando, setMigrando] = useState<boolean>(false);
  const [resultadoMigracion, setResultadoMigracion] = useState<any>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const cargarAnalisis = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const res = await fetch("/api/admin/migracion");
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Error al analizar el archivo de bitácora");
      }
      setAnalisis(data.analisis);
    } catch (err: any) {
      setErrorMsg(err.message || "Error al comunicarse con el servidor");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargarAnalisis();
  }, []);

  const handleEjecutarMigracion = async () => {
    const confirmar = window.confirm(
      `¿Está seguro de iniciar la migración masiva de la bitácora histórica 2026?\n\nSe insertarán ${
        analisis?.total_general || 1636
      } expedientes (1.099 Pagos + 537 Garantías) en la base de datos institucional vinculando Quipux secundarios e historial de movimientos.`
    );
    if (!confirmar) return;

    setMigrando(true);
    setErrorMsg(null);
    setResultadoMigracion(null);

    try {
      const res = await fetch("/api/admin/migracion", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Ocurrió un error durante la migración");
      }
      setResultadoMigracion(data.resultado);
      cargarAnalisis(); // Recargar conteos
    } catch (err: any) {
      setErrorMsg(err.message || "Error crítico al ejecutar la migración");
    } finally {
      setMigrando(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Encabezado de la Sección */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 bg-emerald-50 text-emerald-700 rounded-xl">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 tracking-tight uppercase">
                Migración y Carga de Bitácora Histórica en Excel (Año 2026)
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Importación automatizada de bitácoras oficiales de Presupuesto (Hojas PAGO y GARANTÍA) con trazabilidad Quipux.
              </p>
            </div>
          </div>
        </div>

        <button
          onClick={cargarAnalisis}
          disabled={loading || migrando}
          className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-slate-50 hover:bg-slate-100 rounded-lg transition-colors border border-slate-200 self-start md:self-auto cursor-pointer"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin text-blue-600" : ""}`} />
          Volver a Analizar
        </button>
      </div>

      {errorMsg && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 flex items-start gap-2.5">
          <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
          <div>
            <div className="font-bold">Error en la operación</div>
            <p className="mt-0.5">{errorMsg}</p>
          </div>
        </div>
      )}

      {/* Tarjeta de Estado del Archivo Excel en Disco */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-100">
          <div>
            <div className="text-[11px] font-bold uppercase text-slate-500 tracking-wider">
              Ruta del Archivo Fuente
            </div>
            <div className="font-mono text-xs font-semibold text-slate-800 mt-1 break-all bg-slate-50 p-2 rounded-lg border border-slate-200">
              {analisis?.ruta_archivo || "C:/Users/PC/Documents/RODNEY SENAE/APLICATIVO PARA BUSQUEDA EN BASES PRESUPUESTO/Enero-Junio-2026.xlsx"}
            </div>
          </div>

          <div className="flex items-center gap-2 self-start md:self-auto">
            {loading ? (
              <span className="px-3 py-1 text-xs font-semibold bg-slate-100 text-slate-600 rounded-full animate-pulse">
                Analizando estructura...
              </span>
            ) : analisis?.existe ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-bold bg-emerald-100 text-emerald-800 rounded-full border border-emerald-200">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                Archivo Verificado en Servidor
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-bold bg-rose-100 text-rose-800 rounded-full border border-rose-200">
                <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
                Archivo no Encontrado
              </span>
            )}
          </div>
        </div>

        {/* Resumen de Métricas de la Bitácora */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-blue-50/40 p-4 rounded-xl border border-blue-200/80">
            <div className="text-[11px] font-bold text-blue-700 uppercase">
              Hoja PAGO (Fila 5 a 1.103)
            </div>
            <div className="text-2xl font-bold font-mono text-blue-900 mt-1">
              {loading ? "..." : (analisis?.total_filas_pago || 0).toLocaleString()}
            </div>
            <p className="text-[11px] text-blue-600/80 mt-1">
              Servicios, contratos, adquisiciones
            </p>
          </div>

          <div className="bg-purple-50/40 p-4 rounded-xl border border-purple-200/80">
            <div className="text-[11px] font-bold text-purple-700 uppercase">
              Hoja GARANTÍA (Fila 4 a 540)
            </div>
            <div className="text-2xl font-bold font-mono text-purple-900 mt-1">
              {loading ? "..." : (analisis?.total_filas_garantia || 0).toLocaleString()}
            </div>
            <p className="text-[11px] text-purple-600/80 mt-1">
              Garantías y devoluciones de caución
            </p>
          </div>

          <div className="bg-emerald-50/40 p-4 rounded-xl border border-emerald-200/80">
            <div className="text-[11px] font-bold text-emerald-700 uppercase">
              Total Expedientes en Bitácora
            </div>
            <div className="text-2xl font-bold font-mono text-emerald-900 mt-1">
              {loading ? "..." : (analisis?.total_general || 0).toLocaleString()}
            </div>
            <p className="text-[11px] text-emerald-600/80 mt-1">
              Registros históricos consolidables
            </p>
          </div>

          <div className="bg-amber-50/40 p-4 rounded-xl border border-amber-200/80">
            <div className="text-[11px] font-bold text-amber-800 uppercase">
              Migrados Previamente en BD
            </div>
            <div className="text-2xl font-bold font-mono text-amber-900 mt-1">
              {loading ? "..." : (analisis?.ya_migrados_en_bd || 0).toLocaleString()}
            </div>
            <p className="text-[11px] text-amber-700 mt-1">
              Registros con marca de migración
            </p>
          </div>
        </div>
      </div>

      {/* Botón de Ejecución de la Migración */}
      <div className="bg-gradient-to-r from-blue-900 to-indigo-900 text-white p-6 rounded-xl shadow-md flex flex-col md:flex-row md:items-center justify-between gap-5">
        <div className="space-y-1.5 max-w-2xl">
          <div className="flex items-center gap-2">
            <Database className="w-5 h-5 text-blue-300" />
            <h3 className="text-base font-bold uppercase tracking-wide">
              Ejecutar Carga Masiva a la Base de Datos Institucional
            </h3>
          </div>
          <p className="text-xs text-blue-100/90 leading-relaxed">
            Esta acción insertará los 1.636 trámites en la base de datos de control previo, asociará automáticamente las referencias Quipux múltiples en <code className="bg-blue-950/60 px-1 py-0.5 rounded text-amber-300">tramite_referencias</code>, registrará la bitácora inmutable en <code className="bg-blue-950/60 px-1 py-0.5 rounded text-amber-300">historial_movimientos</code> y respetará los estados históricos (DFI, Archivo, Devuelto, Observado).
          </p>
        </div>

        <button
          onClick={handleEjecutarMigracion}
          disabled={migrando || loading || !analisis?.existe}
          className="inline-flex items-center justify-center gap-2 px-5 py-3 text-xs font-bold uppercase tracking-wider rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white shadow-lg transition-all transform active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed shrink-0 cursor-pointer"
        >
          {migrando ? (
            <>
              <RefreshCw className="w-4 h-4 animate-spin" />
              Migrando Expedientes...
            </>
          ) : (
            <>
              <Play className="w-4 h-4 fill-white" />
              Iniciar Migración (1.636 Trámites)
            </>
          )}
        </button>
      </div>

      {/* Resultados de Migración Exitosa */}
      {resultadoMigracion && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-5 space-y-4 animate-fadeIn">
          <div className="flex items-center gap-2 text-emerald-900 font-bold text-sm uppercase">
            <CheckCircle2 className="w-5 h-5 text-emerald-600" />
            Migración Completada Exitosamente
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div className="bg-white p-3 rounded-lg border border-emerald-200 shadow-2xs">
              <span className="text-slate-500 block">Total Trámites Migrados:</span>
              <span className="text-lg font-bold font-mono text-emerald-700">
                {resultadoMigracion.total_migrados}
              </span>
            </div>
            <div className="bg-white p-3 rounded-lg border border-emerald-200 shadow-2xs">
              <span className="text-slate-500 block">Hoja PAGO:</span>
              <span className="text-lg font-bold font-mono text-blue-700">
                {resultadoMigracion.migrados_pago}
              </span>
            </div>
            <div className="bg-white p-3 rounded-lg border border-emerald-200 shadow-2xs">
              <span className="text-slate-500 block">Hoja GARANTÍA:</span>
              <span className="text-lg font-bold font-mono text-purple-700">
                {resultadoMigracion.migrados_garantia}
              </span>
            </div>
            <div className="bg-white p-3 rounded-lg border border-emerald-200 shadow-2xs">
              <span className="text-slate-500 block">Quipux Vinculados:</span>
              <span className="text-lg font-bold font-mono text-slate-800">
                {resultadoMigracion.total_referencias_creadas}
              </span>
            </div>
          </div>

          <div className="flex items-center justify-between text-xs text-emerald-800 pt-2 border-t border-emerald-200/60">
            <span>
              Tiempo transcurrido:{" "}
              <strong>{(resultadoMigracion.tiempo_ms / 1000).toFixed(2)} segundos</strong>
            </span>

            <Link
              href="/tramites"
              className="inline-flex items-center gap-1 font-bold text-blue-700 hover:text-blue-900 underline"
            >
              Ver expedientes en el Catálogo Institucional
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      )}

      {/* Pestañas de Vista Previa y Diagnóstico */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
        <div className="flex border-b border-slate-200 bg-slate-50/80 px-4 pt-3 gap-2 text-xs font-semibold">
          <button
            onClick={() => setTabMuestra("pago")}
            className={`px-3.5 py-2 rounded-t-lg transition-colors border-b-2 flex items-center gap-1.5 ${
              tabMuestra === "pago"
                ? "border-blue-600 text-blue-700 bg-white"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            Vista Previa Hoja PAGO ({analisis?.total_filas_pago || 1099})
          </button>
          <button
            onClick={() => setTabMuestra("garantia")}
            className={`px-3.5 py-2 rounded-t-lg transition-colors border-b-2 flex items-center gap-1.5 ${
              tabMuestra === "garantia"
                ? "border-purple-600 text-purple-700 bg-white"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            Vista Previa Hoja GARANTÍA ({analisis?.total_filas_garantia || 537})
          </button>
          <button
            onClick={() => setTabMuestra("resumen")}
            className={`px-3.5 py-2 rounded-t-lg transition-colors border-b-2 flex items-center gap-1.5 ${
              tabMuestra === "resumen"
                ? "border-emerald-600 text-emerald-700 bg-white"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            Distribución de Estados y Ciudades
          </button>
        </div>

        <div className="p-4">
          {tabMuestra === "pago" && (
            <div className="space-y-3">
              <div className="text-xs text-slate-500 flex items-center justify-between">
                <span>Muestra técnica de los primeros 5 expedientes mapeados de la hoja PAGO:</span>
                <span className="font-semibold text-slate-700">Columnas: Quipux, Ciudad, Proveedor, Valor, Estado, Analista</span>
              </div>
              <div className="overflow-x-auto border border-slate-200 rounded-lg">
                <table className="min-w-full text-xs">
                  <thead className="bg-slate-50 text-[11px] font-bold text-slate-700 uppercase border-b border-slate-200">
                    <tr>
                      <th className="py-2.5 px-3 text-center w-14">Fila</th>
                      <th className="py-2.5 px-3 text-left">Quipux Principal</th>
                      <th className="py-2.5 px-3 text-center">Ciudad</th>
                      <th className="py-2.5 px-3 text-left">Proveedor / Beneficiario</th>
                      <th className="py-2.5 px-3 text-right">Monto</th>
                      <th className="py-2.5 px-3 text-center">Estado Bitácora</th>
                      <th className="py-2.5 px-3 text-center">Analista</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {analisis?.muestras_pago?.map((m) => (
                      <tr key={m.fila} className="hover:bg-slate-50/60">
                        <td className="py-2.5 px-3 text-center font-mono text-slate-500">#{m.fila}</td>
                        <td className="py-2.5 px-3 font-mono font-bold text-blue-700">{m.quipux}</td>
                        <td className="py-2.5 px-3 text-center">
                          <span className="px-2 py-0.5 text-[10px] font-bold rounded bg-slate-100 text-slate-700 border border-slate-200 uppercase">
                            {m.ciudad}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 font-medium text-slate-800 uppercase">{m.proveedor}</td>
                        <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900">
                          {formatCurrency(m.valor)}
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-800">
                            {m.estado}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-center font-mono font-semibold text-slate-600">
                          {m.analista}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {tabMuestra === "garantia" && (
            <div className="space-y-3">
              <div className="text-xs text-slate-500 flex items-center justify-between">
                <span>Muestra técnica de los primeros 5 expedientes mapeados de la hoja GARANTÍA:</span>
                <span className="font-semibold text-slate-700">Columnas: Quipux, Ciudad, Beneficiario, Valor, Estado, Analista</span>
              </div>
              <div className="overflow-x-auto border border-slate-200 rounded-lg">
                <table className="min-w-full text-xs">
                  <thead className="bg-slate-50 text-[11px] font-bold text-slate-700 uppercase border-b border-slate-200">
                    <tr>
                      <th className="py-2.5 px-3 text-center w-14">Fila</th>
                      <th className="py-2.5 px-3 text-left">Quipux Principal</th>
                      <th className="py-2.5 px-3 text-center">Ciudad</th>
                      <th className="py-2.5 px-3 text-left">Beneficiario</th>
                      <th className="py-2.5 px-3 text-right">Monto</th>
                      <th className="py-2.5 px-3 text-center">Estado Bitácora</th>
                      <th className="py-2.5 px-3 text-center">Analista</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {analisis?.muestras_garantia?.map((m) => (
                      <tr key={m.fila} className="hover:bg-slate-50/60">
                        <td className="py-2.5 px-3 text-center font-mono text-slate-500">#{m.fila}</td>
                        <td className="py-2.5 px-3 font-mono font-bold text-purple-700">{m.quipux}</td>
                        <td className="py-2.5 px-3 text-center">
                          <span className="px-2 py-0.5 text-[10px] font-bold rounded bg-slate-100 text-slate-700 border border-slate-200 uppercase">
                            {m.ciudad}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 font-medium text-slate-800 uppercase">{m.beneficiario}</td>
                        <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900">
                          {formatCurrency(m.valor)}
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-100 text-purple-800">
                            {m.estado}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-center font-mono font-semibold text-slate-600">
                          {m.analista}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {tabMuestra === "resumen" && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 text-xs">
              {/* Estados PAGO */}
              <div className="border border-slate-200 rounded-lg p-4 space-y-3">
                <div className="font-bold text-slate-800 uppercase text-[11px] flex items-center justify-between">
                  <span>Estados en Hoja PAGO</span>
                  <span className="text-slate-400 font-normal">Frecuencia</span>
                </div>
                <div className="space-y-1.5">
                  {Object.entries(analisis?.estados_pago || {}).map(([estado, count]) => (
                    <div key={estado} className="flex items-center justify-between py-1 border-b border-slate-100">
                      <span className="font-medium text-slate-700">{estado}</span>
                      <span className="font-mono font-bold bg-blue-50 text-blue-700 px-2 py-0.5 rounded">
                        {count}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Estados GARANTÍA */}
              <div className="border border-slate-200 rounded-lg p-4 space-y-3">
                <div className="font-bold text-slate-800 uppercase text-[11px] flex items-center justify-between">
                  <span>Estados en Hoja GARANTÍA</span>
                  <span className="text-slate-400 font-normal">Frecuencia</span>
                </div>
                <div className="space-y-1.5">
                  {Object.entries(analisis?.estados_garantia || {}).map(([estado, count]) => (
                    <div key={estado} className="flex items-center justify-between py-1 border-b border-slate-100">
                      <span className="font-medium text-slate-700">{estado}</span>
                      <span className="font-mono font-bold bg-purple-50 text-purple-700 px-2 py-0.5 rounded">
                        {count}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Distribución por Ciudades */}
              <div className="border border-slate-200 rounded-lg p-4 space-y-3 md:col-span-2">
                <div className="font-bold text-slate-800 uppercase text-[11px] flex items-center justify-between">
                  <span>Distribución Territorial por Ciudades</span>
                  <span className="text-slate-400 font-normal">Total Expedientes</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(analisis?.ciudades || {}).map(([ciudad, count]) => (
                    <div
                      key={ciudad}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 border border-slate-200 rounded-lg text-slate-800 font-medium"
                    >
                      <Building2 className="w-3.5 h-3.5 text-slate-500" />
                      <span>{ciudad}:</span>
                      <span className="font-bold font-mono text-blue-800">{count}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
