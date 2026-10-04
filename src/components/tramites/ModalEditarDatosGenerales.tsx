"use client";

import React, { useState, useEffect } from "react";
import { TramiteCompletoDTO, UsuarioInstitucional } from "@/types";
import { Modal } from "@/components/ui/Modal";
import { Edit, Save, AlertCircle } from "lucide-react";

interface ModalEditarDatosGeneralesProps {
  isOpen: boolean;
  onClose: () => void;
  tramite: TramiteCompletoDTO;
  currentUser: UsuarioInstitucional | null;
  onRefresh: () => void;
}

export const ModalEditarDatosGenerales: React.FC<ModalEditarDatosGeneralesProps> = ({
  isOpen,
  onClose,
  tramite,
  currentUser,
  onRefresh,
}) => {
  const [tipoFlujo, setTipoFlujo] = useState(tramite.tipo_flujo || "PAGO");
  const [numeroQuipux, setNumeroQuipux] = useState(tramite.numero_quipux || "");
  const [fechaMemorando, setFechaMemorando] = useState(
    tramite.fecha_memorando
      ? new Date(tramite.fecha_memorando).toISOString().split("T")[0]
      : ""
  );
  const [fechaRecepcionFisica, setFechaRecepcionFisica] = useState(
    tramite.fecha_recepcion_fisica
      ? new Date(tramite.fecha_recepcion_fisica).toISOString().split("T")[0]
      : ""
  );
  const [proveedorBeneficiario, setProveedorBeneficiario] = useState(
    tramite.proveedor_beneficiario || ""
  );
  const [rucProveedor, setRucProveedor] = useState(tramite.ruc_proveedor || "");
  const [idTipoTramite, setIdTipoTramite] = useState(String(tramite.id_tipo_tramite || "1"));
  const [montoTotal, setMontoTotal] = useState(String(tramite.monto_total || "0"));
  const [numeroLiquidacion, setNumeroLiquidacion] = useState(tramite.numero_liquidacion || "");
  const [numeroJuicio, setNumeroJuicio] = useState(tramite.numero_juicio || "");

  const [procesos, setProcesos] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/admin/procesos")
      .then((r) => r.json())
      .then((d) => {
        if (d.tipos) setProcesos(d.tipos);
      })
      .catch((err) => console.error("Error loading procesos:", err));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!numeroQuipux.trim() || !proveedorBeneficiario.trim() || !montoTotal) {
      setError("Por favor complete los campos obligatorios (Quipux, Beneficiario, Monto).");
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/tramites/${tramite.id_tramite}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id_usuario: currentUser?.id_usuario,
          rol: currentUser?.rol,
          tipo_flujo: tipoFlujo,
          numero_quipux: numeroQuipux.trim(),
          fecha_memorando: fechaMemorando || null,
          fecha_recepcion_fisica: fechaRecepcionFisica || null,
          proveedor_beneficiario: proveedorBeneficiario.trim(),
          ruc_proveedor: rucProveedor.trim() || null,
          id_tipo_tramite: parseInt(idTipoTramite, 10),
          monto_total: parseFloat(montoTotal),
          numero_liquidacion: numeroLiquidacion.trim() || null,
          numero_juicio: numeroJuicio.trim() || null,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Error al actualizar datos generales");

      onRefresh();
      onClose();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="MODIFICAR DATOS GENERALES DEL TRÁMITE"
      subtitle="Edición autorizada de parámetros institucionales y beneficiario (Registrado en Auditoría)."
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-xs text-red-700">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          {/* Tipo de Gestión */}
          <div>
            <label className="block font-bold text-slate-700 uppercase mb-1">
              Tipo de Gestión *
            </label>
            <select
              value={tipoFlujo}
              onChange={(e) => setTipoFlujo(e.target.value)}
              className="w-full p-2 border border-slate-300 rounded-lg bg-slate-50 focus:ring-2 focus:ring-blue-500 font-semibold uppercase"
            >
              <option value="PAGO">PAGO</option>
              <option value="EXPEDIENTE">EXPEDIENTE</option>
            </select>
          </div>

          {/* Nro. Quipux */}
          <div>
            <label className="block font-bold text-slate-700 uppercase mb-1">
              Nro. Memorando (Quipux) *
            </label>
            <input
              type="text"
              value={numeroQuipux}
              onChange={(e) => setNumeroQuipux(e.target.value)}
              className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 font-mono font-semibold"
              placeholder="SENAE-DFI-2026-XXXX-M"
              required
            />
          </div>

          {/* Fecha Memorando */}
          <div>
            <label className="block font-bold text-slate-700 uppercase mb-1">
              Fecha del Memorando
            </label>
            <input
              type="date"
              value={fechaMemorando}
              onChange={(e) => setFechaMemorando(e.target.value)}
              className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Fecha Recepción Física */}
          <div>
            <label className="block font-bold text-slate-700 uppercase mb-1">
              Fecha Recepción en Físico
            </label>
            <input
              type="date"
              value={fechaRecepcionFisica}
              onChange={(e) => setFechaRecepcionFisica(e.target.value)}
              className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Proveedor / Beneficiario */}
          <div className="sm:col-span-2">
            <label className="block font-bold text-slate-700 uppercase mb-1">
              Nombre Proveedor / Beneficiario *
            </label>
            <input
              type="text"
              value={proveedorBeneficiario}
              onChange={(e) => setProveedorBeneficiario(e.target.value)}
              className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 font-semibold uppercase"
              placeholder="RAZÓN SOCIAL O NOMBRE COMPLETO"
              required
            />
          </div>

          {/* RUC Proveedor */}
          <div>
            <label className="block font-bold text-slate-700 uppercase mb-1">
              RUC Proveedor / Beneficiario
            </label>
            <input
              type="text"
              value={rucProveedor}
              onChange={(e) => setRucProveedor(e.target.value)}
              maxLength={13}
              className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 font-mono"
              placeholder="0998877665001"
            />
          </div>

          {/* Monto Total */}
          <div>
            <label className="block font-bold text-slate-700 uppercase mb-1">
              Monto Total (USD) *
            </label>
            <input
              type="number"
              step="0.01"
              value={montoTotal}
              onChange={(e) => setMontoTotal(e.target.value)}
              className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 font-mono font-bold"
              required
            />
          </div>

          {/* Tipo de Proceso */}
          <div className="sm:col-span-2">
            <label className="block font-bold text-slate-700 uppercase mb-1">
              Tipo de Proceso Normativo *
            </label>
            <select
              value={idTipoTramite}
              onChange={(e) => setIdTipoTramite(e.target.value)}
              className="w-full p-2 border border-slate-300 rounded-lg bg-slate-50 focus:ring-2 focus:ring-blue-500 uppercase text-xs"
            >
              {procesos.map((p) => (
                <option key={p.id_tipo_tramite} value={p.id_tipo_tramite}>
                  {p.nombre}
                </option>
              ))}
            </select>
          </div>

          {/* Num Liquidacion */}
          <div>
            <label className="block font-bold text-slate-700 uppercase mb-1">
              Nro. Liquidación (Si aplica)
            </label>
            <input
              type="text"
              value={numeroLiquidacion}
              onChange={(e) => setNumeroLiquidacion(e.target.value)}
              className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 font-mono"
              placeholder="LIQ-2026-XXXX"
            />
          </div>

          {/* Num Juicio */}
          <div>
            <label className="block font-bold text-slate-700 uppercase mb-1">
              Nro. Juicio (Si aplica)
            </label>
            <input
              type="text"
              value={numeroJuicio}
              onChange={(e) => setNumeroJuicio(e.target.value)}
              className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 font-mono"
              placeholder="JUICIO-XXXX-2026"
            />
          </div>
        </div>

        {/* Buttons */}
        <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg uppercase"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={loading}
            className="flex items-center gap-2 px-5 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg uppercase shadow-xs disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            {loading ? "Guardando..." : "Guardar Cambios"}
          </button>
        </div>
      </form>
    </Modal>
  );
};
