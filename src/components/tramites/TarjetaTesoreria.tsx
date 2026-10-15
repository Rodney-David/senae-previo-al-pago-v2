"use client";

import React, { useState, useEffect, useMemo } from "react";
import { TramiteCompletoDTO, UsuarioInstitucional } from "@/types";
import { formatDate } from "@/lib/utils";
import Link from "next/link";
import { CreditCard, CheckCircle2, AlertCircle, Edit3, ChevronDown, PackagePlus, Package, X, ExternalLink } from "lucide-react";

interface TarjetaTesoreriaProps {
  tramite: TramiteCompletoDTO;
  currentUser: UsuarioInstitucional | null;
  onRefresh: () => void;
}

export const TarjetaTesoreria: React.FC<TarjetaTesoreriaProps> = ({
  tramite,
  currentUser,
  onRefresh,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [spiBce, setSpiBce] = useState(tramite.spi_bce_referencia || "");
  const [fechaAutorizacionPago, setFechaAutorizacionPago] = useState(
    tramite.fecha_autorizacion_pago
      ? new Date(tramite.fecha_autorizacion_pago).toISOString().split("T")[0]
      : ""
  );
  const [fechaPago, setFechaPago] = useState(
    tramite.fecha_pago
      ? new Date(tramite.fecha_pago).toISOString().split("T")[0]
      : ""
  );
  const [numeroHojas, setNumeroHojas] = useState(
    tramite.numero_hojas ? String(tramite.numero_hojas) : ""
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Modal para asignar a caja fisica
  const [modalCajaOpen, setModalCajaOpen] = useState(false);
  const [cajasAbiertas, setCajasAbiertas] = useState<any[]>([]);
  const [loadingCajas, setLoadingCajas] = useState(false);
  const [selectedCajaId, setSelectedCajaId] = useState<number | null>(null);
  const [guardandoEnCaja, setGuardandoEnCaja] = useState(false);

  const handleOpenModalCaja = async () => {
    setModalCajaOpen(true);
    setLoadingCajas(true);
    setError(null);
    try {
      const res = await fetch("/api/cajas?estado=ABIERTA");
      const data = await res.json();
      if (data.cajas) {
        setCajasAbiertas(data.cajas);
        if (data.cajas.length > 0) {
          setSelectedCajaId(data.cajas[0].id_caja);
        }
      }
    } catch (err: any) {
      console.error("Error al cargar cajas abiertas:", err);
    } finally {
      setLoadingCajas(false);
    }
  };

  const handleConfirmarAsignacionCaja = async () => {
    if (!selectedCajaId) return;
    setGuardandoEnCaja(true);
    setError(null);
    try {
      const res = await fetch(`/api/cajas/${selectedCajaId}/tramites`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          accion: "ASIGNAR",
          ids_tramites: [tramite.id_tramite],
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Error al asignar a caja física");
      setModalCajaOpen(false);
      onRefresh();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setGuardandoEnCaja(false);
    }
  };

  useEffect(() => {
    setSpiBce(tramite.spi_bce_referencia || "");
    setFechaAutorizacionPago(
      tramite.fecha_autorizacion_pago
        ? new Date(tramite.fecha_autorizacion_pago).toISOString().split("T")[0]
        : ""
    );
    setFechaPago(
      tramite.fecha_pago
        ? new Date(tramite.fecha_pago).toISOString().split("T")[0]
        : ""
    );
    setNumeroHojas(
      tramite.numero_hojas ? String(tramite.numero_hojas) : ""
    );
  }, [tramite]);

  const userRolUpper = (currentUser?.rol || "").toUpperCase();
  const userCargoUpper = (currentUser?.cargo || "").toUpperCase();
  const isTesoreriaOrCobranzas =
    currentUser?.id_area === 4 ||
    currentUser?.id_area === 5 ||
    userRolUpper === "ADMIN" ||
    userRolUpper === "ADMINISTRADOR" ||
    userRolUpper.includes("TESOR") ||
    userRolUpper.includes("COBRANZA") ||
    userCargoUpper.includes("TESOR") ||
    userCargoUpper.includes("COBRANZA") ||
    userCargoUpper.includes("CAJA");

  const canEdit =
    isTesoreriaOrCobranzas &&
    tramite.estado_general !== "ARCHIVO" &&
    tramite.estado_general !== "INSUBSISTENTE" &&
    tramite.estado_general !== "FINALIZADO_ARCHIVADO";

  const isDefaultOpen = useMemo(() => {
    if (!currentUser) return true;
    if (
      userRolUpper === "ADMIN" ||
      userRolUpper === "DIRECTORA" ||
      userRolUpper === "SECRETARIA" ||
      userCargoUpper.includes("DIRECTORA") ||
      userCargoUpper.includes("SECRETARIA")
    ) {
      return true;
    }
    return isTesoreriaOrCobranzas;
  }, [currentUser, userRolUpper, userCargoUpper, isTesoreriaOrCobranzas]);

  const [isOpen, setIsOpen] = useState(isDefaultOpen);

  useEffect(() => {
    setIsOpen(isDefaultOpen);
  }, [isDefaultOpen]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();

    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/tramites/${tramite.id_tramite}/flujo`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          accion: "PROGRAMAR_Y_PAGAR_MEF_BCE",
          datos: {
            spi_bce_referencia: spiBce.trim() || null,
            fecha_autorizacion_pago: fechaAutorizacionPago ? new Date(fechaAutorizacionPago).toISOString() : null,
            fecha_pago: fechaPago ? new Date(fechaPago).toISOString() : null,
            numero_hojas: numeroHojas ? Number(numeroHojas) : null,
          },
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Error al procesar datos en tesorería");
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
      <div
        onClick={() => setIsOpen(!isOpen)}
        className="px-5 py-3.5 bg-slate-900 text-white flex flex-wrap items-center justify-between gap-3 cursor-pointer select-none hover:bg-slate-850 transition-colors"
      >
        <div className="flex items-center gap-2.5">
          <CreditCard className="w-4 h-4 text-blue-400" />
          <h3 className="text-xs font-bold uppercase tracking-wider">
            ADMINISTRACIÓN DE CAJA / TESORERÍA Y COBRANZAS
          </h3>
          <ChevronDown
            className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${
              isOpen ? "rotate-180 text-blue-400" : ""
            }`}
          />
        </div>
        <div className="flex items-center gap-3" onClick={(e) => e.stopPropagation()}>
          {tramite.fecha_pago || tramite.estado_general === "PAGADO" ? (
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
              <CheckCircle2 className="w-3 h-3" /> Pago Confirmado
            </span>
          ) : tramite.fecha_autorizacion_pago || tramite.autorizado_pago || tramite.estado_general === "AUTORIZADO_PAGO" ? (
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-500/20 text-blue-300 border border-blue-500/30">
              <CheckCircle2 className="w-3 h-3" /> Autorizado para Pago (Fin SLA)
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-500/20 text-amber-300 border border-amber-500/30">
              <AlertCircle className="w-3.5 h-3.5" /> Pendiente de Autorización / Pago
            </span>
          )}

          {/* Botón para Editar Datos de Tesorería y Cobranzas (Siempre accesible para Tesorería/Cobranzas/Admin) */}
          {canEdit && !isEditing && (
            <button
              onClick={() => {
                setIsOpen(true);
                setIsEditing(true);
              }}
              className="px-2.5 py-1 text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-md border border-slate-700 flex items-center gap-1 transition-colors"
            >
              <Edit3 className="w-3 h-3" /> {tramite.fecha_pago || tramite.estado_general === "PAGADO" || tramite.fecha_autorizacion_pago ? "Editar Datos Pago/Cobranzas" : "Registrar Datos Pago/Cobranzas"}
            </button>
          )}

          {/* Si YA está pagado: botón para Asignar a Caja física si aún no está asignado */}
          {(tramite.fecha_pago || tramite.estado_general === "PAGADO") && !tramite.id_caja && canEdit && (
            <button
              onClick={handleOpenModalCaja}
              className="px-3 py-1 text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center gap-1.5 transition-colors shadow-2xs cursor-pointer"
            >
              <PackagePlus className="w-3.5 h-3.5" /> Asignar a Caja
            </button>
          )}

          {/* Si YA está asignado a una caja */}
          {(tramite.fecha_pago || tramite.estado_general === "PAGADO") && tramite.id_caja && (
            <Link
              href="/cajas"
              className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-[11px] font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 hover:bg-cyan-500/30 transition-colors"
              title="Ver en Gestión de Cajas"
            >
              <Package className="w-3 h-3" /> {tramite.codigo_tomo_caja || "En Caja"}
              <ExternalLink className="w-2.5 h-2.5 ml-0.5" />
            </Link>
          )}
        </div>
      </div>

      {isOpen && (
        <div className="p-5">
          {error && (
            <div className="mb-4 p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-lg font-medium">
              {error}
            </div>
          )}

          {isEditing ? (
            <form onSubmit={handleSave} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Referencia SPI Banco Central <span className="text-slate-400 font-normal">(Opcional)</span>
                  </label>
                  <input
                    type="text"
                    value={spiBce}
                    onChange={(e) => setSpiBce(e.target.value)}
                    placeholder="ej. SPI-BCE-TRF-9948210"
                    className="w-full text-xs bg-white border border-slate-300 rounded-lg p-2.5 font-mono focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Número de Hojas <span className="text-slate-400 font-normal">(Conteo físico)</span>
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={numeroHojas}
                    onChange={(e) => setNumeroHojas(e.target.value)}
                    placeholder="ej. 35"
                    className="w-full text-xs bg-white border border-slate-300 rounded-lg p-2.5 font-mono focus:ring-2 focus:ring-blue-500 focus:outline-none font-bold"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Fecha Autorización de Pago <span className="text-slate-400 font-normal">(Fin SLA)</span>
                  </label>
                  <input
                    type="date"
                    value={fechaAutorizacionPago}
                    onChange={(e) => setFechaAutorizacionPago(e.target.value)}
                    className="w-full text-xs bg-white border border-slate-300 rounded-lg p-2.5 font-mono focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Fecha Pago Efectivo <span className="text-slate-400 font-normal">(BCE / Transferencia)</span>
                  </label>
                  <input
                    type="date"
                    value={fechaPago}
                    onChange={(e) => setFechaPago(e.target.value)}
                    className="w-full text-xs bg-white border border-slate-300 rounded-lg p-2.5 font-mono focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  disabled={loading}
                  className="px-3.5 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors shadow-xs"
                >
                  {loading ? "Guardando..." : "Guardar Cambios de Tesorería / Cobranzas"}
                </button>
              </div>
            </form>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <span className="text-[11px] font-semibold text-slate-500 uppercase block">
                  Referencia SPI Banco Central:
                </span>
                <span className="text-xs font-mono font-bold text-emerald-800">
                  {tramite.spi_bce_referencia || "-"}
                </span>
              </div>

              <div>
                <span className="text-[11px] font-semibold text-slate-500 uppercase block">
                  Número de Hojas:
                </span>
                <span className="text-xs font-bold text-slate-900 font-mono">
                  {tramite.numero_hojas ? `${tramite.numero_hojas} hojas` : "Sin registrar"}
                </span>
              </div>

              <div>
                <span className="text-[11px] font-semibold text-slate-500 uppercase block">
                  Fecha Autorización de Pago:
                </span>
                <span className="text-xs font-medium text-slate-800">
                  {tramite.fecha_autorizacion_pago ? formatDate(tramite.fecha_autorizacion_pago) : "Pendiente"}
                </span>
              </div>

              <div>
                <span className="text-[11px] font-semibold text-slate-500 uppercase block">
                  Fecha Pago Efectivo:
                </span>
                <span className="text-xs text-slate-800">
                  {tramite.fecha_pago ? formatDate(tramite.fecha_pago) : "Pendiente"}
                </span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Modal para Seleccionar y Asignar a Caja Abierta */}
      {modalCajaOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-4 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <PackagePlus className="w-5 h-5 text-blue-400" />
                <h4 className="text-sm font-bold tracking-tight">Asignar Trámite a Caja Física</h4>
              </div>
              <button
                type="button"
                onClick={() => setModalCajaOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div className="bg-blue-50 border border-blue-200 p-3 rounded-xl text-xs text-blue-800 space-y-1">
                <div className="font-bold">Quipux: {tramite.numero_quipux}</div>
                <div className="text-[11px] text-blue-700 truncate">
                  Beneficiario: {tramite.proveedor_beneficiario}
                </div>
                <div className="text-[11px] text-blue-700">
                  Hojas: {tramite.numero_hojas || "Pendiente"}
                </div>
              </div>

              {loadingCajas ? (
                <div className="py-8 text-center text-xs text-slate-500">
                  Cargando cajas abiertas disponibles...
                </div>
              ) : cajasAbiertas.length === 0 ? (
                <div className="py-6 text-center space-y-3">
                  <Package className="w-8 h-8 text-slate-300 mx-auto" />
                  <p className="text-xs text-slate-600 font-medium">
                    No existen cajas en estado <strong>ABIERTA</strong> en este momento.
                  </p>
                  <Link
                    href="/cajas"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors shadow-2xs"
                  >
                    <PackagePlus className="w-3.5 h-3.5" /> Ir a Gestión de Cajas para crear una
                  </Link>
                </div>
              ) : (
                <div className="space-y-3">
                  <label className="block text-xs font-semibold text-slate-700">
                    Seleccione la caja física abierta:
                  </label>
                  <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                    {cajasAbiertas.map((c) => (
                      <label
                        key={c.id_caja}
                        className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-all ${
                          selectedCajaId === c.id_caja
                            ? "border-blue-600 bg-blue-50/60 shadow-xs"
                            : "border-slate-200 hover:bg-slate-50"
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <input
                            type="radio"
                            name="cajaSeleccionada"
                            checked={selectedCajaId === c.id_caja}
                            onChange={() => setSelectedCajaId(c.id_caja)}
                            className="text-blue-600 focus:ring-blue-500"
                          />
                          <div>
                            <div className="text-xs font-bold text-slate-900">{c.codigo_caja}</div>
                            {c.nombre && (
                              <div className="text-[11px] text-slate-500 truncate">{c.nombre}</div>
                            )}
                          </div>
                        </div>
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-600">
                          {c.total_tramites || 0} trámite(s)
                        </span>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              {cajasAbiertas.length > 0 && (
                <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setModalCajaOpen(false)}
                    disabled={guardandoEnCaja}
                    className="px-3.5 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    onClick={handleConfirmarAsignacionCaja}
                    disabled={guardandoEnCaja || !selectedCajaId}
                    className="px-4 py-1.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors shadow-xs flex items-center gap-1.5 disabled:opacity-50"
                  >
                    <PackagePlus className="w-3.5 h-3.5" />
                    {guardandoEnCaja ? "Asignando..." : "Confirmar Asignación a Caja"}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
