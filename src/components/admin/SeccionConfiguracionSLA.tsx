"use client";

import React, { useEffect, useState } from "react";
import {
  Clock,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  HelpCircle,
  Save,
  RotateCcw,
  Sparkles,
  Info,
  ShieldCheck,
  CalendarCheck,
  Building2,
  FileCheck2,
  Landmark,
  Archive,
} from "lucide-react";

interface SLAConfigData {
  limite_dias: number;
  punto_inicio: string;
  punto_fin: string;
}

export function SeccionConfiguracionSLA() {
  const [config, setConfig] = useState<SLAConfigData>({
    limite_dias: 6,
    punto_inicio: "RECEPCION_PRESUPUESTO",
    punto_fin: "AUTORIZACION_PAGO",
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [mensaje, setMensaje] = useState<{ tipo: "ok" | "error"; texto: string } | null>(null);

  // Cargar configuración actual
  const cargarConfig = async () => {
    setLoading(true);
    setMensaje(null);
    try {
      const res = await fetch("/api/admin/configuracion-sla");
      const data = await res.json();
      if (data.config) {
        setConfig(data.config);
      }
    } catch (err: any) {
      setMensaje({ tipo: "error", texto: "Error al cargar la configuración del semáforo SLA." });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargarConfig();
  }, []);

  // Guardar configuración
  const handleGuardar = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMensaje(null);
    try {
      const res = await fetch("/api/admin/configuracion-sla", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(config),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "No se pudo actualizar la configuración.");
      setMensaje({
        tipo: "ok",
        texto: data.message || "Configuración del semáforo SLA actualizada con éxito en todo el sistema.",
      });
    } catch (err: any) {
      setMensaje({ tipo: "error", texto: err.message });
    } finally {
      setSaving(false);
    }
  };

  // Restablecer defaults normativos SENAE
  const handleRestablecerDefaults = () => {
    setConfig({
      limite_dias: 6,
      punto_inicio: "RECEPCION_PRESUPUESTO",
      punto_fin: "AUTORIZACION_PAGO",
    });
    setMensaje({
      tipo: "ok",
      texto: "Valores predeterminados normativos SENAE asignados (6 días, inicio Presupuesto, fin Tesorería). Presione 'Guardar Cambios' para aplicar.",
    });
  };

  // Cálculo de rangos del simulador visual
  const dias = config.limite_dias || 6;
  const verdeMax = Math.ceil(dias * 0.5);
  const amarilloMin = verdeMax + 1;
  const amarilloMax = dias;

  return (
    <div className="space-y-6">
      {/* Mensaje de feedback */}
      {mensaje && (
        <div
          className={`p-3.5 rounded-xl border text-xs font-semibold flex items-center justify-between shadow-2xs ${
            mensaje.tipo === "ok"
              ? "bg-emerald-50 text-emerald-800 border-emerald-200"
              : "bg-rose-50 text-rose-800 border-rose-200"
          }`}
        >
          <div className="flex items-center gap-2">
            {mensaje.tipo === "ok" ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <XCircle className="w-4 h-4 text-rose-600 shrink-0" />
            )}
            <span>{mensaje.texto}</span>
          </div>
          <button
            onClick={() => setMensaje(null)}
            className="text-slate-400 hover:text-slate-600 text-xs font-bold px-2 py-0.5 rounded"
          >
            ✕
          </button>
        </div>
      )}

      {/* Banner Informativo de Dos Lógicas */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="p-4 bg-blue-50/80 border border-blue-200 rounded-xl space-y-2">
          <div className="flex items-center gap-2 text-blue-900 font-bold text-xs uppercase">
            <Clock className="w-4 h-4 text-blue-600" />
            Lógica 1: Semáforo Operativo Institucional (SLA Parametrizable)
          </div>
          <p className="text-[11px] text-blue-800/90 leading-relaxed">
            Mide el cumplimiento del tiempo objetivo de gestión institucional en <strong>días hábiles</strong>.
            Descuenta fines de semana, feriados del calendario nacional y días de pausa por observaciones o factura.
            Permite configurar el límite reglamentario y los hitos exactos de arranque y muerte del plazo.
          </p>
        </div>

        <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
          <div className="flex items-center gap-2 text-slate-800 font-bold text-xs uppercase">
            <ShieldCheck className="w-4 h-4 text-slate-600" />
            Lógica 2: Conteo Total de Días de Vida (Control Forense Permanente)
          </div>
          <p className="text-[11px] text-slate-600 leading-relaxed">
            Calcula la totalidad de días calendario continuos <strong>sin excepciones</strong> desde la recepción original
            en ventanilla hasta la actualidad. Esta métrica permanece fija y activa en reportes e historial para auditorías
            de Contraloría General del Estado sin sufrir alteraciones.
          </p>
        </div>
      </div>

      <form onSubmit={handleGuardar} className="space-y-6">
        {/* PARÁMETRO 1: LÍMITE DE DÍAS HÁBILES */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
            <div>
              <h2 className="text-xs font-bold text-slate-900 uppercase flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center text-[10px]">
                  1
                </span>
                Límite Normativo de Días Hábiles del Semáforo
              </h2>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Plazo reglamentario máximo institucional permitido para completar el ciclo de pago.
              </p>
            </div>
            <div className="flex items-center gap-1.5 self-start">
              {[5, 6, 8, 10].map((num) => (
                <button
                  key={num}
                  type="button"
                  onClick={() => setConfig({ ...config, limite_dias: num })}
                  className={`px-2.5 py-1 text-xs rounded-lg font-bold transition-colors ${
                    config.limite_dias === num
                      ? "bg-blue-600 text-white shadow-xs"
                      : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                  }`}
                >
                  {num} Días {num === 6 && "(Default)"}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="w-36">
              <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">
                Días Hábiles
              </label>
              <input
                type="number"
                min={1}
                max={60}
                value={config.limite_dias}
                onChange={(e) =>
                  setConfig({ ...config, limite_dias: parseInt(e.target.value, 10) || 1 })
                }
                className="w-full px-3 py-2 text-sm font-bold text-center bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
              />
            </div>

            <div className="flex-1 p-3 bg-slate-50 rounded-lg border border-slate-200 text-xs text-slate-600 flex items-center gap-2">
              <Info className="w-4 h-4 text-blue-600 shrink-0" />
              <span>
                Actualmente configurado en <strong>{config.limite_dias} días hábiles</strong>. El semáforo alertará
                automáticamente en color verde, amarillo y rojo según este límite.
              </span>
            </div>
          </div>
        </div>

        {/* PARÁMETRO 2: PUNTO DE INICIO */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-4">
          <div className="border-b border-slate-100 pb-3">
            <h2 className="text-xs font-bold text-slate-900 uppercase flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center text-[10px]">
                2
              </span>
              Hito de Inicio: ¿Desde qué momento se contabiliza el SLA?
            </h2>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Define el evento exacto a partir del cual el reloj de días hábiles comienza a correr.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {/* Opción 1: RECEPCION_PRESUPUESTO */}
            <label
              className={`p-4 border-2 rounded-xl cursor-pointer transition-all flex flex-col justify-between ${
                config.punto_inicio === "RECEPCION_PRESUPUESTO"
                  ? "border-blue-600 bg-blue-50/40 shadow-xs"
                  : "border-slate-200 hover:border-slate-300 bg-white"
              }`}
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="px-2 py-0.5 text-[9px] font-bold uppercase rounded bg-blue-100 text-blue-800 border border-blue-200">
                    Predeterminado SENAE
                  </span>
                  <input
                    type="radio"
                    name="punto_inicio"
                    value="RECEPCION_PRESUPUESTO"
                    checked={config.punto_inicio === "RECEPCION_PRESUPUESTO"}
                    onChange={(e) => setConfig({ ...config, punto_inicio: e.target.value })}
                    className="w-4 h-4 text-blue-600"
                  />
                </div>
                <div className="font-bold text-xs text-slate-900 uppercase flex items-center gap-1.5">
                  <Building2 className="w-4 h-4 text-blue-600" />
                  Al recibir en Presupuesto
                </div>
                <p className="text-[11px] text-slate-600 leading-snug">
                  Comienza exactamente cuando Jefatura de Presupuesto recibe físicamente el lote y el trámite entra
                  a <strong>REVISIÓN</strong>. En Secretaría DFI permanece en estado <em>Pendiente (No Iniciado)</em>.
                </p>
              </div>
            </label>

            {/* Opción 2: ENTREGA_CONTROL_PREVIO */}
            <label
              className={`p-4 border-2 rounded-xl cursor-pointer transition-all flex flex-col justify-between ${
                config.punto_inicio === "ENTREGA_CONTROL_PREVIO"
                  ? "border-blue-600 bg-blue-50/40 shadow-xs"
                  : "border-slate-200 hover:border-slate-300 bg-white"
              }`}
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="px-2 py-0.5 text-[9px] font-bold uppercase rounded bg-slate-100 text-slate-700 border border-slate-200">
                    Entrega DFI
                  </span>
                  <input
                    type="radio"
                    name="punto_inicio"
                    value="ENTREGA_CONTROL_PREVIO"
                    checked={config.punto_inicio === "ENTREGA_CONTROL_PREVIO"}
                    onChange={(e) => setConfig({ ...config, punto_inicio: e.target.value })}
                    className="w-4 h-4 text-blue-600"
                  />
                </div>
                <div className="font-bold text-xs text-slate-900 uppercase flex items-center gap-1.5">
                  <FileCheck2 className="w-4 h-4 text-slate-600" />
                  Al entregar en Ventanilla
                </div>
                <p className="text-[11px] text-slate-600 leading-snug">
                  Comienza desde que Secretaría DFI genera el acta de entrega formal y despacha en lote los
                  expedientes a Control Previo.
                </p>
              </div>
            </label>

            {/* Opción 3: INGRESO_VENTANILLA */}
            <label
              className={`p-4 border-2 rounded-xl cursor-pointer transition-all flex flex-col justify-between ${
                config.punto_inicio === "INGRESO_VENTANILLA"
                  ? "border-blue-600 bg-blue-50/40 shadow-xs"
                  : "border-slate-200 hover:border-slate-300 bg-white"
              }`}
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="px-2 py-0.5 text-[9px] font-bold uppercase rounded bg-slate-100 text-slate-700 border border-slate-200">
                    Radicación Inicial
                  </span>
                  <input
                    type="radio"
                    name="punto_inicio"
                    value="INGRESO_VENTANILLA"
                    checked={config.punto_inicio === "INGRESO_VENTANILLA"}
                    onChange={(e) => setConfig({ ...config, punto_inicio: e.target.value })}
                    className="w-4 h-4 text-blue-600"
                  />
                </div>
                <div className="font-bold text-xs text-slate-900 uppercase flex items-center gap-1.5">
                  <CalendarCheck className="w-4 h-4 text-slate-600" />
                  Al registrar el expediente
                </div>
                <p className="text-[11px] text-slate-600 leading-snug">
                  Comienza inmediatamente desde el instante en que se crea el trámite en Secretaría DFI con su
                  número Quipux inicial.
                </p>
              </div>
            </label>
          </div>
        </div>

        {/* PARÁMETRO 3: PUNTO DE TÉRMINO */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-4">
          <div className="border-b border-slate-100 pb-3">
            <h2 className="text-xs font-bold text-slate-900 uppercase flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center text-[10px]">
                3
              </span>
              Hito de Término / Muerte del SLA: ¿Hasta qué momento se contabiliza?
            </h2>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Define el momento en que se detiene el cómputo y el trámite se marca como finalizado para el SLA.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            {/* Opción 1: AUTORIZACION_PAGO */}
            <label
              className={`p-4 border-2 rounded-xl cursor-pointer transition-all flex flex-col justify-between ${
                config.punto_fin === "AUTORIZACION_PAGO"
                  ? "border-emerald-600 bg-emerald-50/40 shadow-xs"
                  : "border-slate-200 hover:border-slate-300 bg-white"
              }`}
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="px-2 py-0.5 text-[9px] font-bold uppercase rounded bg-emerald-100 text-emerald-800 border border-emerald-200">
                    Predeterminado SENAE
                  </span>
                  <input
                    type="radio"
                    name="punto_fin"
                    value="AUTORIZACION_PAGO"
                    checked={config.punto_fin === "AUTORIZACION_PAGO"}
                    onChange={(e) => setConfig({ ...config, punto_fin: e.target.value })}
                    className="w-4 h-4 text-emerald-600"
                  />
                </div>
                <div className="font-bold text-xs text-slate-900 uppercase flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  Autorizar Pago en Tesorería
                </div>
                <p className="text-[11px] text-slate-600 leading-snug">
                  El SLA muere exactamente al registrarse la <strong>fecha de autorización de pago</strong> en
                  Tesorería. El trámite puede quedar pendiente de pago bancario sin penalizar el SLA.
                </p>
              </div>
            </label>

            {/* Opción 2: PAGO_EFECTIVO */}
            <label
              className={`p-4 border-2 rounded-xl cursor-pointer transition-all flex flex-col justify-between ${
                config.punto_fin === "PAGO_EFECTIVO"
                  ? "border-blue-600 bg-blue-50/40 shadow-xs"
                  : "border-slate-200 hover:border-slate-300 bg-white"
              }`}
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="px-2 py-0.5 text-[9px] font-bold uppercase rounded bg-slate-100 text-slate-700 border border-slate-200">
                    Banca / SPI
                  </span>
                  <input
                    type="radio"
                    name="punto_fin"
                    value="PAGO_EFECTIVO"
                    checked={config.punto_fin === "PAGO_EFECTIVO"}
                    onChange={(e) => setConfig({ ...config, punto_fin: e.target.value })}
                    className="w-4 h-4 text-blue-600"
                  />
                </div>
                <div className="font-bold text-xs text-slate-900 uppercase flex items-center gap-1.5">
                  <Landmark className="w-4 h-4 text-slate-600" />
                  Acreditación Efectiva de Pago
                </div>
                <p className="text-[11px] text-slate-600 leading-snug">
                  El SLA sigue corriendo hasta que Tesorería registre la fecha de pago bancario efectivo
                  (estado PAGADO).
                </p>
              </div>
            </label>

            {/* Opción 3: APROBACION_CONTABILIDAD */}
            <label
              className={`p-4 border-2 rounded-xl cursor-pointer transition-all flex flex-col justify-between ${
                config.punto_fin === "APROBACION_CONTABILIDAD"
                  ? "border-blue-600 bg-blue-50/40 shadow-xs"
                  : "border-slate-200 hover:border-slate-300 bg-white"
              }`}
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="px-2 py-0.5 text-[9px] font-bold uppercase rounded bg-slate-100 text-slate-700 border border-slate-200">
                    Devengado
                  </span>
                  <input
                    type="radio"
                    name="punto_fin"
                    value="APROBACION_CONTABILIDAD"
                    checked={config.punto_fin === "APROBACION_CONTABILIDAD"}
                    onChange={(e) => setConfig({ ...config, punto_fin: e.target.value })}
                    className="w-4 h-4 text-blue-600"
                  />
                </div>
                <div className="font-bold text-xs text-slate-900 uppercase flex items-center gap-1.5">
                  <FileCheck2 className="w-4 h-4 text-slate-600" />
                  Aprobación en Contabilidad
                </div>
                <p className="text-[11px] text-slate-600 leading-snug">
                  Finaliza el cómputo de SLA al emitirse el visto bueno contable (CUR Devengado / Contable).
                </p>
              </div>
            </label>

            {/* Opción 4: ARCHIVO_CAJA */}
            <label
              className={`p-4 border-2 rounded-xl cursor-pointer transition-all flex flex-col justify-between ${
                config.punto_fin === "ARCHIVO_CAJA"
                  ? "border-blue-600 bg-blue-50/40 shadow-xs"
                  : "border-slate-200 hover:border-slate-300 bg-white"
              }`}
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="px-2 py-0.5 text-[9px] font-bold uppercase rounded bg-slate-100 text-slate-700 border border-slate-200">
                    Archivo Final
                  </span>
                  <input
                    type="radio"
                    name="punto_fin"
                    value="ARCHIVO_CAJA"
                    checked={config.punto_fin === "ARCHIVO_CAJA"}
                    onChange={(e) => setConfig({ ...config, punto_fin: e.target.value })}
                    className="w-4 h-4 text-blue-600"
                  />
                </div>
                <div className="font-bold text-xs text-slate-900 uppercase flex items-center gap-1.5">
                  <Archive className="w-4 h-4 text-slate-600" />
                  Custodia en Archivo Central
                </div>
                <p className="text-[11px] text-slate-600 leading-snug">
                  El SLA cubre todo el ciclo integral hasta que la caja física con el expediente es recepcionada
                  en Archivo Central.
                </p>
              </div>
            </label>
          </div>
        </div>

        {/* SIMULADOR VISUAL EN TIEMPO REAL */}
        <div className="bg-slate-900 text-white rounded-xl p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-400" />
              <span className="text-xs font-bold uppercase tracking-wider text-slate-200">
                Simulador Visual del Semáforo en Tiempo Real (Base: {dias} Días Hábiles)
              </span>
            </div>
            <span className="text-[11px] font-mono text-slate-400">
              Inicio: {config.punto_inicio} ➔ Fin: {config.punto_fin}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {/* Estado Verde */}
            <div className="p-3.5 bg-emerald-950/60 border border-emerald-500/40 rounded-xl space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-emerald-400 uppercase flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-emerald-300" />
                  EN PLAZO (Verde)
                </span>
                <span className="text-xs font-mono font-bold text-emerald-300">
                  1 a {verdeMax} días
                </span>
              </div>
              <p className="text-[11px] text-emerald-200/80 leading-relaxed">
                Trámite dentro del tiempo óptimo de respuesta (≤ 50% del plazo normativo configurado).
              </p>
            </div>

            {/* Estado Amarillo */}
            <div className="p-3.5 bg-amber-950/60 border border-amber-500/40 rounded-xl space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-amber-400 uppercase flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500 ring-2 ring-amber-300" />
                  POR VENCER (Amarillo)
                </span>
                <span className="text-xs font-mono font-bold text-amber-300">
                  {amarilloMin} a {amarilloMax} días
                </span>
              </div>
              <p className="text-[11px] text-amber-200/80 leading-relaxed">
                Alerta de urgencia prioritaria. El trámite está consumiendo los últimos días reglamentarios.
              </p>
            </div>

            {/* Estado Rojo */}
            <div className="p-3.5 bg-rose-950/60 border border-rose-500/40 rounded-xl space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-rose-400 uppercase flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-rose-500 ring-2 ring-rose-300" />
                  VENCIDO (Rojo)
                </span>
                <span className="text-xs font-mono font-bold text-rose-300">
                  &gt; {dias} días
                </span>
              </div>
              <p className="text-[11px] text-rose-200/80 leading-relaxed">
                Tiempo normativo excedido. Notifica mora institucional sujeta a justificación y auditoría.
              </p>
            </div>
          </div>
        </div>

        {/* BOTONERA DE ACCIÓN */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
          <button
            type="button"
            onClick={handleRestablecerDefaults}
            className="px-4 py-2 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors flex items-center gap-2"
          >
            <RotateCcw className="w-4 h-4 text-slate-500" />
            Restablecer Valores Predeterminados SENAE
          </button>

          <button
            type="submit"
            disabled={saving}
            className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg transition-all shadow-md flex items-center gap-2"
          >
            <Save className="w-4 h-4" />
            {saving ? "Guardando Configuración..." : "Guardar y Aplicar Parámetros de SLA"}
          </button>
        </div>
      </form>
    </div>
  );
}
