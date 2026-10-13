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
  const [padreGestion, setPadreGestion] = useState(
    (tramite.padre_gestion || tramite.tipo_flujo || "PAGO").toUpperCase()
  );
  const [tipoGestion, setTipoGestion] = useState(tramite.tipo_gestion || "PAGO");
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
  const [subtotal, setSubtotal] = useState(String(tramite.subtotal || tramite.monto_total || "0"));
  const [numeroLiquidacion, setNumeroLiquidacion] = useState(tramite.numero_liquidacion || "");
  const [numeroJuicio, setNumeroJuicio] = useState(tramite.numero_juicio || "");
  const [areaRequirente, setAreaRequirente] = useState(tramite.area_requirente || "");
  const [asunto, setAsunto] = useState(tramite.asunto || "");

  const [procesos, setProcesos] = useState<any[]>([]);
  const [areas, setAreas] = useState<any[]>([]);
  const [catalogoGestiones, setCatalogoGestiones] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/admin/procesos")
      .then((r) => r.json())
      .then((d) => {
        if (d.tipos) setProcesos(d.tipos);
      })
      .catch((err) => console.error("Error loading procesos:", err));

    fetch("/api/admin/catalogos?tipo=areas")
      .then((r) => r.json())
      .then((d) => {
        if (d.items) setAreas(d.items);
      })
      .catch((err) => console.error("Error loading areas:", err));

    fetch("/api/admin/catalogos?tipo=gestion")
      .then((r) => r.json())
      .then((d) => {
        if (d.items && d.items.length > 0) {
          setCatalogoGestiones(d.items.filter((item: any) => item.activo !== false));
        }
      })
      .catch((err) => console.error("Error loading gestiones:", err));
  }, []);

  // Subtipos dependientes según la categoría padre
  const subtiposDisponibles = React.useMemo(() => {
    if (catalogoGestiones.length > 0) {
      return catalogoGestiones.filter((g) => (g.padre || "PAGO").toUpperCase() === padreGestion);
    }
    if (padreGestion === "PAGO") {
      return [
        { codigo: "PAGO", nombre: "PAGO" },
        { codigo: "EXPEDIENTE", nombre: "EXPEDIENTE" },
        { codigo: "JUSTIFICACION", nombre: "JUSTIFICACION" },
      ];
    } else {
      return [
        { codigo: "CAUCION", nombre: "Caución" },
        { codigo: "DEV_CAUCION", nombre: "Devolución de caución" },
        { codigo: "DEV_VALORES", nombre: "Devolución de valores" },
        { codigo: "GARANTIA", nombre: "Garantia" },
        { codigo: "JUICIO", nombre: "Juicio" },
        { codigo: "PAGO_INDEBIDO", nombre: "Pago indebido" },
        { codigo: "PROCESO_COACTIVO", nombre: "Proceso coactivo" },
        { codigo: "REPARACION_ECONOMICA", nombre: "Reparación Económica" },
        { codigo: "SENTENCIA", nombre: "Sentencia" },
      ];
    }
  }, [padreGestion, catalogoGestiones]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!numeroQuipux.trim() || !proveedorBeneficiario.trim()) {
      setError("Por favor complete los campos obligatorios (Quipux, Beneficiario).");
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const montoNum = parseFloat(subtotal) || 0;
      const res = await fetch(`/api/tramites/${tramite.id_tramite}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id_usuario: currentUser?.id_usuario,
          rol: currentUser?.rol,
          id_area: currentUser?.id_area,
          padre_gestion: padreGestion,
          tipo_gestion: tipoGestion,
          tipo_flujo: padreGestion,
          numero_quipux: numeroQuipux.trim(),
          area_requirente: areaRequirente.trim() || null,
          asunto: asunto.trim() || null,
          fecha_memorando: fechaMemorando || null,
          fecha_recepcion_fisica: fechaRecepcionFisica || null,
          proveedor_beneficiario: proveedorBeneficiario.trim(),
          ruc_proveedor: rucProveedor.trim() || null,
          id_tipo_tramite: parseInt(idTipoTramite, 10),
          subtotal: montoNum,
          monto_total: montoNum,
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
      subtitle="Edición autorizada de parámetros institucionales (DFI, Presupuesto y Administración)."
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-xs text-red-700">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          {/* Categoría Padre de Gestión */}
          <div>
            <label className="block font-bold text-slate-700 uppercase mb-1">
              Categoría de Gestión *
            </label>
            <select
              value={padreGestion}
              onChange={(e) => {
                const nuevoPadre = e.target.value;
                setPadreGestion(nuevoPadre);
                if (nuevoPadre === "PAGO") {
                  setTipoGestion("PAGO");
                } else {
                  setTipoGestion("Garantia");
                }
              }}
              className="w-full p-2 border border-slate-300 rounded-lg bg-slate-50 focus:ring-2 focus:ring-blue-500 font-bold uppercase"
            >
              <option value="PAGO">PAGO</option>
              <option value="GARANTIA">GARANTIA</option>
            </select>
          </div>

          {/* Subtipo de Gestión */}
          <div>
            <label className="block font-bold text-slate-700 uppercase mb-1">
              Tipo de Gestión Específica *
            </label>
            <select
              value={tipoGestion}
              onChange={(e) => setTipoGestion(e.target.value)}
              className="w-full p-2 border border-slate-300 rounded-lg bg-slate-50 focus:ring-2 focus:ring-blue-500 font-semibold uppercase"
            >
              {subtiposDisponibles.map((g) => (
                <option key={g.codigo || g.nombre} value={g.nombre || g.codigo}>
                  {g.nombre || g.codigo}
                </option>
              ))}
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

          {/* Monto / Subtotal */}
          <div>
            <label className="block font-bold text-slate-700 uppercase mb-1">
              Subtotal / Monto Total (USD) *
            </label>
            <input
              type="number"
              step="0.01"
              value={subtotal}
              onChange={(e) => setSubtotal(e.target.value)}
              className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 font-mono font-bold"
              required
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

          {/* Tipo de Proceso */}
          <div>
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

          {/* Área Requirente */}
          <div className="sm:col-span-2">
            <label className="block font-bold text-slate-700 uppercase mb-1">
              Área Requirente / Solicitante
            </label>
            <input
              list="modal-areas-list"
              type="text"
              value={areaRequirente}
              onChange={(e) => setAreaRequirente(e.target.value)}
              className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 uppercase text-xs"
              placeholder="SELECCIONE O ESCRIBA EL ÁREA REQUIREnte"
            />
            <datalist id="modal-areas-list">
              {areas.map((a) => (
                <option key={a.id_area || a.nombre} value={a.nombre} />
              ))}
            </datalist>
          </div>

          {/* Asunto */}
          <div className="sm:col-span-2">
            <label className="block font-bold text-slate-700 uppercase mb-1">
              Asunto del Trámite
            </label>
            <textarea
              rows={3}
              value={asunto}
              onChange={(e) => setAsunto(e.target.value)}
              className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-xs text-slate-800"
              placeholder="Descripción o detalle del requerimiento institucional..."
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
