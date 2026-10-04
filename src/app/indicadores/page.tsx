"use client";

import React, { useEffect, useState } from "react";
import {
  BarChart3,
  Clock,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  PauseCircle,
  DollarSign,
  Archive,
  RefreshCw,
} from "lucide-react";

export default function IndicadoresPage() {
  const [metricas, setMetricas] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const fetchMetricas = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/dashboard/metricas");
      const data = await res.json();
      if (data.metricas) {
        setMetricas(data.metricas);
      }
    } catch (err) {
      console.error("Error loading metrics:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMetricas();
  }, []);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-blue-600" />
            <h1 className="text-lg font-bold text-slate-900 tracking-tight">
              Indicadores de Gestión y Semáforos SLA (6 Días Hábiles)
            </h1>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Monitoreo en tiempo real del cumplimiento de plazos institucionales de control previo y pago.
          </p>
        </div>

        <button
          onClick={fetchMetricas}
          disabled={loading}
          className="p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg border border-slate-200 transition-colors self-start sm:self-auto"
          title="Actualizar indicadores"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin text-blue-600" : ""}`} />
        </button>
      </div>

      {/* SLA Explanation Banner */}
      <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl text-xs text-blue-900 space-y-1">
        <div className="font-bold flex items-center gap-1.5 text-blue-950">
          <Clock className="w-4 h-4 text-blue-700" />
          Cálculo Normativo del Término de Pago (SENAE-ME-3-6-001):
        </div>
        <p className="text-blue-800 leading-relaxed">
          El término promedio para el control financiero previo al pago es de <strong>6 días hábiles</strong>.
          El motor de cálculo descuenta sábados, domingos y los días feriados o decretos ejecutivos registrados
          en el calendario institucional. Asimismo, el tiempo en que un trámite permanece en estado de pausa por
          espera de factura del proveedor es congelado y deducido automáticamente del SLA.
        </p>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Total Registrados */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-2">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold uppercase">
            <span>Total Trámites</span>
            <BarChart3 className="w-4 h-4 text-slate-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-slate-900">
            {loading ? "..." : metricas?.totalRegistrados ?? 0}
          </div>
          <p className="text-[11px] text-slate-500">Expedientes radicados</p>
        </div>

        {/* Card 2: En Flujo Activo */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-2">
          <div className="flex items-center justify-between text-blue-600 text-xs font-semibold uppercase">
            <span>En Flujo Activo</span>
            <Clock className="w-4 h-4 text-blue-500" />
          </div>
          <div className="text-2xl font-bold font-mono text-blue-700">
            {loading ? "..." : metricas?.enFlujoActivo ?? 0}
          </div>
          <p className="text-[11px] text-slate-500">En gestión operativa</p>
        </div>

        {/* Card 3: Pausados SLA */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-2">
          <div className="flex items-center justify-between text-amber-600 text-xs font-semibold uppercase">
            <span>Pausados SLA</span>
            <PauseCircle className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-2xl font-bold font-mono text-amber-700">
            {loading ? "..." : metricas?.pausadosSLA ?? 0}
          </div>
          <p className="text-[11px] text-slate-500">En espera de factura</p>
        </div>

        {/* Card 4: Alta Cuantía */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-2">
          <div className="flex items-center justify-between text-slate-700 text-xs font-semibold uppercase">
            <span>Alta Cuantía</span>
            <DollarSign className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-2xl font-bold font-mono text-slate-900">
            {loading ? "..." : metricas?.altaCuantia ?? 0}
          </div>
          <p className="text-[11px] text-slate-500">Monto ≥ $10.000 (Jefatura)</p>
        </div>

        {/* Card 5: En Plazo 🟢 */}
        <div className="bg-emerald-50/50 p-5 rounded-xl border border-emerald-200 shadow-xs space-y-2">
          <div className="flex items-center justify-between text-emerald-800 text-xs font-semibold uppercase">
            <span>En Plazo (1-3 días)</span>
            <span className="text-sm">🟢</span>
          </div>
          <div className="text-2xl font-bold font-mono text-emerald-700">
            {loading ? "..." : metricas?.enPlazo ?? 0}
          </div>
          <p className="text-[11px] text-emerald-700">Flujo dentro de término</p>
        </div>

        {/* Card 6: Por Vencer 🟡 */}
        <div className="bg-amber-50/50 p-5 rounded-xl border border-amber-200 shadow-xs space-y-2">
          <div className="flex items-center justify-between text-amber-800 text-xs font-semibold uppercase">
            <span>Por Vencer (4-5 días)</span>
            <span className="text-sm">🟡</span>
          </div>
          <div className="text-2xl font-bold font-mono text-amber-700">
            {loading ? "..." : metricas?.porVencer ?? 0}
          </div>
          <p className="text-[11px] text-amber-700">Requiere agilización</p>
        </div>

        {/* Card 7: Vencidos / En Mora 🔴 */}
        <div className="bg-rose-50/50 p-5 rounded-xl border border-rose-200 shadow-xs space-y-2">
          <div className="flex items-center justify-between text-rose-800 text-xs font-semibold uppercase">
            <span>Vencidos / Mora (≥ 6d)</span>
            <span className="text-sm">🔴</span>
          </div>
          <div className="text-2xl font-bold font-mono text-rose-700">
            {loading ? "..." : metricas?.vencidos ?? 0}
          </div>
          <p className="text-[11px] text-rose-700">Fuera de término normativo</p>
        </div>

        {/* Card 8: Archivados Definitivos */}
        <div className="bg-slate-50 p-5 rounded-xl border border-slate-200 shadow-xs space-y-2">
          <div className="flex items-center justify-between text-slate-700 text-xs font-semibold uppercase">
            <span>Archivados</span>
            <Archive className="w-4 h-4 text-slate-500" />
          </div>
          <div className="text-2xl font-bold font-mono text-slate-800">
            {loading ? "..." : metricas?.finalizadosArchivados ?? 0}
          </div>
          <p className="text-[11px] text-slate-500">Ciclo completo cerrado</p>
        </div>
      </div>
    </div>
  );
}
