"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { formatCurrency } from "@/lib/utils";
import { FilePlus2, DollarSign, Building, AlertCircle, CheckCircle2 } from "lucide-react";

export default function RecepcionPage() {
  const router = useRouter();
  const [tiposProceso, setTiposProceso] = useState<any[]>([]);
  const [loadingTipos, setLoadingTipos] = useState(true);

  // Form State
  const [tipoGestion, setTipoGestion] = useState("PAGO");
  const [numeroQuipux, setNumeroQuipux] = useState("");
  const [fechaMemorando, setFechaMemorando] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [fechaRecepcion, setFechaRecepcion] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [idTipoTramite, setIdTipoTramite] = useState<string>("");
  const [proveedor, setProveedor] = useState("");
  const [ruc, setRuc] = useState("");
  const [subtotal, setSubtotal] = useState<string>("0");
  const [iva, setIva] = useState<string>("0");
  const [retenciones, setRetenciones] = useState<string>("0");
  const [multas, setMultas] = useState<string>("0");
  const [montoTotal, setMontoTotal] = useState<string>("0");
  const [numeroFactura, setNumeroFactura] = useState("");
  const [fechaFactura, setFechaFactura] = useState("");
  const [comentarios, setComentarios] = useState("");

  const [isAutoCalculating, setIsAutoCalculating] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [authorized, setAuthorized] = useState<boolean | null>(null);

  useEffect(() => {
    async function checkAuthAndLoad() {
      try {
        const sessionRes = await fetch("/api/auth/session");
        const sessionData = await sessionRes.json();
        const user = sessionData?.user;
        if (!user || !["DIRECTORA", "SECRETARIA", "ADMIN"].includes(user.rol)) {
          setAuthorized(false);
          return;
        }
        setAuthorized(true);

        const res = await fetch("/api/admin/procesos");
        const data = await res.json();
        if (data.tipos) {
          setTiposProceso(data.tipos);
          if (data.tipos.length > 0) {
            setIdTipoTramite(String(data.tipos[0].id_tipo_tramite));
          }
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoadingTipos(false);
      }
    }
    checkAuthAndLoad();
  }, []);

  // Recalcular monto total automáticamente
  const sub = parseFloat(subtotal) || 0;
  const iv = parseFloat(iva) || 0;
  const ret = parseFloat(retenciones) || 0;
  const mul = parseFloat(multas) || 0;
  const totalCalculado = Math.max(0, sub + iv - ret - mul);

  const finalTotal = isAutoCalculating ? totalCalculado : parseFloat(montoTotal) || 0;
  const esAltaCuantia = finalTotal >= 10000;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!numeroQuipux.trim() || !proveedor.trim() || !idTipoTramite) {
      setError("Por favor complete los campos obligatorios del ingreso.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/tramites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tipo_gestion: tipoGestion,
          numero_quipux: numeroQuipux.trim(),
          fecha_memorando: fechaMemorando,
          fecha_recepcion_fisica: fechaRecepcion,
          id_tipo_tramite: parseInt(idTipoTramite, 10),
          proveedor_beneficiario: proveedor.trim(),
          ruc_proveedor: ruc.trim(),
          subtotal: sub,
          monto_iva: iv,
          monto_retenciones: ret,
          monto_multas: mul,
          monto_total: finalTotal,
          numero_factura: numeroFactura.trim(),
          fecha_factura: fechaFactura || null,
          comentarios: comentarios.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Error al registrar trámite");

      if (data.tramite) {
        router.push(`/tramite/${data.tramite.id_tramite}`);
      } else {
        router.push("/escritorio");
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (authorized === false) {
    return (
      <div className="max-w-xl mx-auto mt-12 bg-white p-8 rounded-xl border border-rose-200 shadow-xs text-center space-y-4">
        <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
          <AlertCircle className="w-6 h-6" />
        </div>
        <h2 className="text-base font-bold text-slate-900">Acceso Restringido a Recepción DFI</h2>
        <p className="text-xs text-slate-600 leading-relaxed">
          De acuerdo con el flujo normativo de Control Previo (SENAE-ME-3-6-001), el ingreso y recepción de expedientes físicos está reservado exclusivamente a la <strong>Directora Financiera</strong> y <strong>Secretaría DFI</strong>.
        </p>
        <button
          onClick={() => router.push("/escritorio")}
          className="px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
        >
          Volver a Mi Escritorio
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <FilePlus2 className="w-5 h-5 text-blue-600" />
            <h1 className="text-lg font-bold text-slate-900 tracking-tight">
              Recepción Institucional de Trámites (DFI)
            </h1>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Registro inicial de expedientes físicos que ingresan a la Dirección Financiera.
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {error && (
          <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-lg font-medium">
            {error}
          </div>
        )}

        {/* Bloque 1: Datos de Recepción */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-4">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-800 border-b border-slate-100 pb-2">
            1. Datos de Recepción y Radicación Quipux
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Tipo de Gestión *
              </label>
              <select
                value={tipoGestion}
                onChange={(e) => setTipoGestion(e.target.value)}
                className="w-full text-xs bg-white border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500 focus:outline-none"
              >
                <option value="PAGO">PAGO</option>
                <option value="EXPEDIENTE">EXPEDIENTE</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Número Quipux Oficial *
              </label>
              <input
                type="text"
                value={numeroQuipux}
                onChange={(e) => setNumeroQuipux(e.target.value)}
                placeholder="ej. SENAE-DFI-2026-0892-M"
                className="w-full text-xs bg-white border border-slate-300 rounded-lg p-2.5 font-mono focus:ring-2 focus:ring-blue-500 focus:outline-none"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Fecha del Memorando *
              </label>
              <input
                type="date"
                value={fechaMemorando}
                onChange={(e) => setFechaMemorando(e.target.value)}
                className="w-full text-xs bg-white border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Fecha de Recepción Física *
              </label>
              <input
                type="date"
                value={fechaRecepcion}
                onChange={(e) => setFechaRecepcion(e.target.value)}
                className="w-full text-xs bg-white border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                required
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Tipo de Proceso Normativo (SENAE) *
              </label>
              <select
                value={idTipoTramite}
                onChange={(e) => setIdTipoTramite(e.target.value)}
                disabled={loadingTipos}
                className="w-full text-xs bg-white border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500 focus:outline-none"
              >
                {tiposProceso.map((t) => (
                  <option key={t.id_tipo_tramite} value={t.id_tipo_tramite}>
                    {t.nombre} ({t.codigo})
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Bloque 2: Proveedor y Factura */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-4">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-800 border-b border-slate-100 pb-2">
            2. Beneficiario / Proveedor y Facturación SRI
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Razón Social / Proveedor Beneficiario *
              </label>
              <input
                type="text"
                value={proveedor}
                onChange={(e) => setProveedor(e.target.value)}
                placeholder="Nombre de la empresa o contratista..."
                className="w-full text-xs bg-white border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                RUC del Proveedor (13 dígitos)
              </label>
              <input
                type="text"
                value={ruc}
                onChange={(e) => setRuc(e.target.value)}
                placeholder="ej. 0992384729001"
                maxLength={13}
                className="w-full text-xs bg-white border border-slate-300 rounded-lg p-2.5 font-mono focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Número de Factura Oficial (opcional en recepción)
              </label>
              <input
                type="text"
                value={numeroFactura}
                onChange={(e) => setNumeroFactura(e.target.value)}
                placeholder="001-002-000123456"
                className="w-full text-xs bg-white border border-slate-300 rounded-lg p-2.5 font-mono focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Fecha de Emisión de Factura
              </label>
              <input
                type="date"
                value={fechaFactura}
                onChange={(e) => setFechaFactura(e.target.value)}
                className="w-full text-xs bg-white border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>
          </div>
        </div>

        {/* Bloque 3: Valores Económicos y Asignación Automática */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-4">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-800 border-b border-slate-100 pb-2">
            3. Liquidación Financiera y Asignación por Cuantía
          </h2>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Subtotal ($) *
              </label>
              <input
                type="number"
                step="0.01"
                value={subtotal}
                onChange={(e) => setSubtotal(e.target.value)}
                className="w-full text-xs bg-white border border-slate-300 rounded-lg p-2.5 font-mono focus:ring-2 focus:ring-blue-500 focus:outline-none"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                IVA ($)
              </label>
              <input
                type="number"
                step="0.01"
                value={iva}
                onChange={(e) => setIva(e.target.value)}
                className="w-full text-xs bg-white border border-slate-300 rounded-lg p-2.5 font-mono focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Retenciones ($)
              </label>
              <input
                type="number"
                step="0.01"
                value={retenciones}
                onChange={(e) => setRetenciones(e.target.value)}
                className="w-full text-xs bg-white border border-slate-300 rounded-lg p-2.5 font-mono focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Multas ($)
              </label>
              <input
                type="number"
                step="0.01"
                value={multas}
                onChange={(e) => setMultas(e.target.value)}
                className="w-full text-xs bg-white border border-slate-300 rounded-lg p-2.5 font-mono focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Caja de Regla de Asignación por Cuantía */}
          <div
            className={`p-4 rounded-xl border flex items-start gap-3 transition-colors ${
              esAltaCuantia
                ? "bg-amber-50/80 border-amber-300 text-amber-900"
                : "bg-blue-50/80 border-blue-200 text-blue-900"
            }`}
          >
            <AlertCircle className={`w-5 h-5 shrink-0 mt-0.5 ${esAltaCuantia ? "text-amber-600" : "text-blue-600"}`} />
            <div className="space-y-1 text-xs">
              <div className="flex items-center gap-2">
                <span className="font-bold">Monto Total a Pagar Calculado:</span>
                <span className="font-mono text-sm font-bold">{formatCurrency(finalTotal)}</span>
              </div>
              <div>
                <span className="font-semibold">Regla de Asignación Automática: </span>
                {esAltaCuantia ? (
                  <span className="font-semibold text-amber-800">
                    Monto ≥ $10.000 (Alta Cuantía) → Asignación automática obligatoria al{" "}
                    <strong>Jefe de Presupuesto</strong>.
                  </span>
                ) : (
                  <span className="text-blue-800">
                    Monto &lt; $10.000 → Asignación rotativa automática (<strong>Round-Robin</strong>)
                    entre los Analistas de Presupuesto con estado Activo.
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Botones */}
        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={() => router.push("/escritorio")}
            disabled={loading}
            className="px-4 py-2.5 text-xs font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-100 rounded-lg transition-colors"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={loading}
            className="px-6 py-2.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors shadow-xs"
          >
            {loading ? "Radicando Trámite..." : "Radicar e Ingresar Trámite a Presupuesto"}
          </button>
        </div>
      </form>
    </div>
  );
}
