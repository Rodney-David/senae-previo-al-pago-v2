"use client";

import React, { useState, useEffect, useMemo } from "react";
import { TramiteCompletoDTO, UsuarioInstitucional } from "@/types";
import { formatDate } from "@/lib/utils";
import { PieChart, CheckCircle2, AlertCircle, Edit3, Plus, Trash2, Tag, FileText, ChevronDown, Receipt, Send } from "lucide-react";
import { SearchableSelect, OptionItem } from "@/components/ui";

interface TarjetaPresupuestoProps {
  tramite: TramiteCompletoDTO;
  currentUser: UsuarioInstitucional | null;
  onRefresh: () => void;
}

export const TarjetaPresupuesto: React.FC<TarjetaPresupuestoProps> = ({
  tramite,
  currentUser,
  onRefresh,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [certificacion, setCertificacion] = useState(
    tramite.certificacion_presupuestaria || ""
  );
  const [item, setItem] = useState(tramite.item_presupuestario || "");
  const [nroTramite, setNroTramite] = useState(tramite.nro_tramite || "");
  const [periodoPago, setPeriodoPago] = useState(tramite.periodo_pago || "");
  // M-02: Parser genérico reutilizable para listas delimitadas (CURs y facturas)
  const parseDelimitedList = (val?: string | null): string[] => {
    if (!val) return [];
    try {
      const parsed = JSON.parse(val);
      if (Array.isArray(parsed)) return parsed.map(String).map((s) => s.trim()).filter(Boolean);
    } catch {}
    return val
      .split(/[,;\n]+/)
      .map((s) => s.trim())
      .filter(Boolean);
  };
  const parseCurs = parseDelimitedList;
  const parseFacturas = parseDelimitedList;

  interface FilaDinamicaPresupuesto {
    id: string;
    valor: string;
  }

  const crearFilaDinamica = (prefijo: string, valor: string = ""): FilaDinamicaPresupuesto => ({
    id: `${prefijo}-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
    valor,
  });

  const [curCompromisoList, setCurCompromisoList] = useState<FilaDinamicaPresupuesto[]>([]);
  const [facturasList, setFacturasList] = useState<FilaDinamicaPresupuesto[]>([]);

  // Catálogo de ítems presupuestarios
  const [itemsCatalog, setItemsCatalog] = useState<any[]>([]);
  const [loadingItems, setLoadingItems] = useState(false);

  // Lista de anexos con límite de 10
  const parseInitialAnexos = (): string[] => {
    if (!tramite.anexos) return [];
    try {
      const parsed = JSON.parse(tramite.anexos);
      if (Array.isArray(parsed)) return parsed;
    } catch {
      return tramite.anexos.split(",").map((s) => s.trim()).filter(Boolean);
    }
    return [];
  };

  const [anexosList, setAnexosList] = useState<string[]>([]);
  const [nuevoAnexoInput, setNuevoAnexoInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isEditing) return;
    setCertificacion(tramite.certificacion_presupuestaria || "");
    setItem(tramite.item_presupuestario || "");
    setNroTramite(tramite.nro_tramite || "");
    setPeriodoPago(tramite.periodo_pago || "");
    setCurCompromisoList(
      parseCurs(tramite.numero_cur_compromiso).map((v) => crearFilaDinamica("cur-com", v))
    );
    setFacturasList(
      parseFacturas(tramite.numero_factura).map((v) => crearFilaDinamica("fac", v))
    );
    setAnexosList(parseInitialAnexos());
  }, [tramite, isEditing]);

  // Cargar catálogo de ítems presupuestarios oficiales
  useEffect(() => {
    const fetchItems = async () => {
      try {
        setLoadingItems(true);
        const res = await fetch("/api/admin/catalogos?tipo=items");
        const data = await res.json();
        if (res.ok && data.items) {
          setItemsCatalog(data.items);
        }
      } catch (err) {
        console.error("Error al cargar catálogo de ítems:", err);
      } finally {
        setLoadingItems(false);
      }
    };
    fetchItems();
  }, []);

  const itemOptions: OptionItem[] = useMemo(() => {
    const opts = itemsCatalog.map((it) => ({
      value: `${it.codigo} - ${it.nombre}`,
      label: `${it.codigo} - ${it.nombre}`,
      sublabel: it.descripcion || undefined,
    }));
    // Si el item asignado actualmente no está en el catálogo, agregarlo para preservarlo
    if (item && !opts.some((o) => o.value === item)) {
      opts.unshift({
        value: item,
        label: item,
        sublabel: "Valor asignado al trámite",
      });
    }
    return opts;
  }, [itemsCatalog, item]);

  const canEdit =
    (currentUser?.id_area === 2 || currentUser?.rol === "ADMIN") &&
    tramite.estado_general !== "ARCHIVO" &&
    tramite.estado_general !== "ARCHIVADO" &&
    tramite.estado_general !== "INSUBSISTENTE" &&
    tramite.estado_general !== "ANULADO";

  const isDefaultOpen = useMemo(() => {
    if (!currentUser) return true;
    const rol = (currentUser.rol || "").toUpperCase();
    const cargo = (currentUser.cargo || "").toUpperCase();
    if (
      rol === "ADMIN" ||
      rol === "DIRECTORA" ||
      rol === "SECRETARIA" ||
      cargo.includes("DIRECTORA") ||
      cargo.includes("SECRETARIA")
    ) {
      return true;
    }
    return currentUser.id_area === 2 || rol.includes("PRESUPUESTO") || cargo.includes("PRESUPUESTO");
  }, [currentUser]);

  const [isOpen, setIsOpen] = useState(isDefaultOpen);

  useEffect(() => {
    setIsOpen(isDefaultOpen);
  }, [isDefaultOpen]);

  // Comprobar si el proceso o tipo de gestión requiere item presupuestario
  const requiereItem =
    tramite.tipo_flujo !== "EXPEDIENTE" &&
    tramite.tipos_tramite?.requiere_item_presupuestario !== false;

  const handleAddAnexo = () => {
    const trimmed = nuevoAnexoInput.trim();
    if (!trimmed) return;
    if (anexosList.length >= 10) {
      setError("Se ha alcanzado el límite máximo de 10 anexos permitidos.");
      return;
    }
    setAnexosList([...anexosList, trimmed]);
    setNuevoAnexoInput("");
    setError(null);
  };

  const handleRemoveAnexo = (index: number) => {
    setAnexosList(anexosList.filter((_, i) => i !== index));
  };

  const handleAddFactura = () => {
    if (facturasList.some((f) => !f.valor.trim())) {
      setError("Complete la fila de Factura actual antes de añadir otra.");
      return;
    }
    setError(null);
    setFacturasList((prev) => [...prev, crearFilaDinamica("fac", "")]);
  };

  const handleRemoveFactura = (id: string) => {
    setFacturasList((prev) => prev.filter((item) => item.id !== id));
  };

  const handleUpdateFactura = (id: string, val: string) => {
    setFacturasList((prev) =>
      prev.map((item) => (item.id === id ? { ...item, valor: val.toUpperCase() } : item))
    );
  };

  const handleAddCurCompromiso = () => {
    if (curCompromisoList.some((c) => !c.valor.trim())) {
      setError("Complete el CUR Compromiso actual antes de añadir otro.");
      return;
    }
    setError(null);
    setCurCompromisoList((prev) => [...prev, crearFilaDinamica("cur-com", "")]);
  };

  const handleRemoveCurCompromiso = (id: string) => {
    setCurCompromisoList((prev) => prev.filter((item) => item.id !== id));
  };

  const handleUpdateCurCompromiso = (id: string, val: string) => {
    setCurCompromisoList((prev) =>
      prev.map((item) => (item.id === id ? { ...item, valor: val.trimStart() } : item))
    );
  };

  const handleStartEdit = () => {
    setIsOpen(true);
    const fList = parseFacturas(tramite.numero_factura);
    const cList = parseCurs(tramite.numero_cur_compromiso);
    setFacturasList(
      fList.length > 0
        ? fList.map((v) => crearFilaDinamica("fac", v))
        : [crearFilaDinamica("fac", "")]
    );
    setCurCompromisoList(
      cList.length > 0
        ? cList.map((v) => crearFilaDinamica("cur-com", v))
        : [crearFilaDinamica("cur-com", "")]
    );
    setIsEditing(true);
  };

  const handleSave = async (e: React.FormEvent, enviarJefe: boolean = false) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const facturasClean = facturasList
      .map((s) => s.valor.trim().toUpperCase())
      .filter((s) => s.length > 0);
    const curCompromisoClean = curCompromisoList
      .map((s) => s.valor.trim())
      .filter((s) => s.length > 0);

    // Validación alfanumérica para Nro / Cod Proceso
    if (nroTramite.trim() && !/^[A-Za-z0-9\-_./ ]{1,50}$/.test(nroTramite.trim())) {
      setError("El Nro / Cod Proceso solo permite caracteres alfanuméricos, guiones y barras (máx. 50 caracteres).");
      setLoading(false);
      return;
    }

    // Validación para Período de Pago
    if (periodoPago.trim() && !/^[A-Za-z0-9\-_./ ]{1,50}$/.test(periodoPago.trim())) {
      setError("El Período de Pago solo permite caracteres alfanuméricos (máx. 50 caracteres).");
      setLoading(false);
      return;
    }

    const facturaPayload =
      facturasClean.length === 0 ? null : facturasClean.join(", ");

    const curCompromisoPayload =
      curCompromisoClean.length === 0 ? null : curCompromisoClean.join(", ");

    try {
      const accion = enviarJefe ? "ENVIAR_A_JEFATURA_PRESUPUESTO" : "GUARDAR_DATOS_PRESUPUESTO";
      const res = await fetch(`/api/tramites/${tramite.id_tramite}/flujo`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          accion,
          datos: {
            certificacion_presupuestaria: certificacion.trim(),
            item_presupuestario: requiereItem ? item.trim() : null,
            numero_factura: facturaPayload,
            nro_tramite: nroTramite.trim() || null,
            periodo_pago: periodoPago.trim() || null,
            numero_cur_compromiso: curCompromisoPayload,
            anexos: JSON.stringify(anexosList),
          },
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Error al procesar datos presupuestarios");
      setIsEditing(false);
      onRefresh();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const displayedAnexos = parseInitialAnexos();
  const displayedFacturas = parseFacturas(tramite.numero_factura);
  const displayedCurCompromisos = parseCurs(tramite.numero_cur_compromiso);

  return (
    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs w-full max-w-full min-w-0">
      <div
        onClick={() => setIsOpen(!isOpen)}
        className="px-5 py-3.5 bg-slate-900 text-white flex flex-wrap items-center justify-between gap-3 cursor-pointer select-none hover:bg-slate-850 transition-colors"
      >
        <div className="flex items-center gap-2.5">
          <PieChart className="w-4 h-4 text-blue-400" />
          <h3 className="text-xs font-bold uppercase tracking-wider">
            CONTROL PREVIO - PRESUPUESTO
          </h3>
          <ChevronDown
            className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${
              isOpen ? "rotate-180 text-blue-400" : ""
            }`}
          />
        </div>
        <div className="flex items-center gap-3" onClick={(e) => e.stopPropagation()}>
          {tramite.aprobado_presupuesto ? (
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-[11px] font-bold uppercase bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
              <CheckCircle2 className="w-3.5 h-3.5" /> Aprobado por Jefe de Presupuesto
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-[11px] font-bold uppercase bg-amber-500/20 text-amber-300 border border-amber-500/30">
              <AlertCircle className="w-3.5 h-3.5" /> Pendiente de Aprobación de Jefatura
            </span>
          )}

          {canEdit && !isEditing && (
            <button
              onClick={handleStartEdit}
              className="px-3 py-1 text-xs font-bold uppercase bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center gap-1 transition-colors shadow-2xs"
            >
              <Edit3 className="w-3.5 h-3.5" /> Editar Datos
            </button>
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
          <form onSubmit={handleSave} className="space-y-5 w-full max-w-full min-w-0">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 w-full max-w-full min-w-0">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Nro / Cod Proceso
                </label>
                <input
                  type="text"
                  value={nroTramite}
                  onChange={(e) => setNroTramite(e.target.value.toUpperCase())}
                  placeholder="Ej: SENAE-2026-0042"
                  maxLength={50}
                  className="w-full text-xs bg-white border border-slate-300 rounded-lg p-2.5 font-mono focus:ring-2 focus:ring-blue-500 focus:outline-none uppercase font-semibold"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Certificación Presupuestaria *
                </label>
                <input
                  type="text"
                  value={certificacion}
                  onChange={(e) => setCertificacion(e.target.value)}
                  placeholder="Ej: CERT-2026-088"
                  className="w-full text-xs bg-white border border-slate-300 rounded-lg p-2.5 font-mono focus:ring-2 focus:ring-blue-500 focus:outline-none uppercase font-semibold"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Ítem Presupuestario {requiereItem ? "*" : ""}
                </label>
                {requiereItem ? (
                  <SearchableSelect
                    options={itemOptions}
                    value={item}
                    onChange={(val) => setItem(val)}
                    placeholder={loadingItems ? "Cargando catálogo..." : "Seleccione ítem presupuestario..."}
                    searchPlaceholder="Buscar por código o denominación..."
                    required={requiereItem}
                  />
                ) : (
                  <input
                    type="text"
                    disabled
                    value="NO APLICA PARA ESTA GESTIÓN"
                    className="w-full text-xs bg-slate-100 text-slate-400 border border-slate-200 rounded-lg p-2.5 font-semibold cursor-not-allowed uppercase"
                  />
                )}
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Período de Pago
                </label>
                <input
                  type="text"
                  value={periodoPago}
                  onChange={(e) => setPeriodoPago(e.target.value.toUpperCase())}
                  placeholder="Ej: ENERO 2026"
                  maxLength={50}
                  className="w-full text-xs bg-white border border-slate-300 rounded-lg p-2.5 font-mono focus:ring-2 focus:ring-blue-500 focus:outline-none uppercase font-semibold"
                />
              </div>
            </div>

            {/* Bloques dinámicos: CUR Compromiso y Facturas (Idéntico a Contabilidad) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-full min-w-0">
              {/* Bloque CUR Compromiso */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 sm:p-4 space-y-3 w-full max-w-full min-w-0 overflow-hidden">
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <label className="text-xs font-bold text-slate-800 uppercase block truncate">
                      CUR Compromiso (CUR COM)
                    </label>
                    <span className="text-[11px] text-slate-500 block truncate">
                      Opcional. Puede registrar 1 o más números oficiales.
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={handleAddCurCompromiso}
                    className="inline-flex items-center gap-1 text-[11px] font-bold uppercase text-emerald-600 hover:text-emerald-800 bg-white border border-emerald-200 px-2 py-1 rounded-md transition-colors shrink-0 whitespace-nowrap"
                  >
                    <Plus className="w-3 h-3" /> Agregar CUR COM
                  </button>
                </div>

                <div className="overflow-x-auto w-full max-w-full min-w-0 space-y-2">
                  {curCompromisoList.length === 0 ? (
                    <p className="text-xs text-slate-400 italic py-2">
                      No hay CUR Compromiso asignado (opcional).
                    </p>
                  ) : (
                    curCompromisoList.map((curItem, idx) => (
                      <div key={curItem.id} className="flex items-center gap-2 min-w-0">
                        <span className="text-[11px] font-mono font-bold text-slate-400 w-14 shrink-0">
                          CUR {idx + 1}:
                        </span>
                        <input
                          type="text"
                          inputMode="numeric"
                          value={curItem.valor}
                          onChange={(e) => handleUpdateCurCompromiso(curItem.id, e.target.value)}
                          placeholder={`ej. 104230${idx + 1}`}
                          className="flex-1 min-w-[120px] text-xs bg-white border border-slate-300 rounded-lg p-2 font-mono uppercase font-semibold text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                        />
                        <button
                          type="button"
                          onClick={() => handleRemoveCurCompromiso(curItem.id)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer shrink-0"
                          title="Eliminar CUR"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Bloque Facturas */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 sm:p-4 space-y-3 w-full max-w-full min-w-0 overflow-hidden">
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <label className="text-xs font-bold text-slate-800 uppercase block truncate">
                      Facturas del Trámite
                    </label>
                    <span className="text-[11px] text-slate-500 block truncate">
                      Opcional. Puede registrar 1 o más facturas del expediente.
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={handleAddFactura}
                    className="inline-flex items-center gap-1 text-[11px] font-bold uppercase text-blue-600 hover:text-blue-800 bg-white border border-blue-200 px-2 py-1 rounded-md transition-colors shrink-0 whitespace-nowrap"
                  >
                    <Plus className="w-3 h-3" /> Agregar Factura
                  </button>
                </div>

                <div className="overflow-x-auto w-full max-w-full min-w-0 space-y-2">
                  {facturasList.length === 0 ? (
                    <p className="text-xs text-slate-400 italic py-2">
                      No hay facturas asignadas (opcional).
                    </p>
                  ) : (
                    facturasList.map((facItem, idx) => (
                      <div key={facItem.id} className="flex items-center gap-2 min-w-0">
                        <span className="text-[11px] font-mono font-bold text-slate-400 w-14 shrink-0">
                          FAC {idx + 1}:
                        </span>
                        <input
                          type="text"
                          value={facItem.valor}
                          onChange={(e) => handleUpdateFactura(facItem.id, e.target.value)}
                          placeholder="ej. 001-002-000123456"
                          className="flex-1 min-w-[120px] text-xs bg-white border border-slate-300 rounded-lg p-2 font-mono uppercase font-semibold text-slate-900 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                        />
                        <button
                          type="button"
                          onClick={() => handleRemoveFactura(facItem.id)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer shrink-0"
                          title="Eliminar Factura"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            {/* Submódulo de Anexos con límite de 10 */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-800 uppercase flex items-center gap-1.5">
                  <Tag className="w-3.5 h-3.5 text-blue-600" />
                  Anexos Técnicos del Trámite
                  <span className="text-[11px] font-mono text-slate-500 font-normal">
                    ({anexosList.length} / 10 máx.)
                  </span>
                </span>
              </div>

              <div className="flex gap-2">
                <input
                  type="text"
                  value={nuevoAnexoInput}
                  onChange={(e) => setNuevoAnexoInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleAddAnexo();
                    }
                  }}
                  disabled={anexosList.length >= 10}
                  placeholder={
                    anexosList.length >= 10
                      ? "Límite de 10 anexos alcanzado"
                      : "Escriba el nombre o detalle del anexo y pulse Añadir..."
                  }
                  className="flex-1 text-xs bg-white border border-slate-300 rounded-lg p-2 focus:ring-2 focus:ring-blue-500 focus:outline-none uppercase font-medium disabled:bg-slate-100 disabled:text-slate-400"
                />
                <button
                  type="button"
                  onClick={handleAddAnexo}
                  disabled={anexosList.length >= 10 || !nuevoAnexoInput.trim()}
                  className="px-3 py-2 text-xs font-bold uppercase bg-slate-900 hover:bg-blue-700 disabled:bg-slate-300 text-white rounded-lg flex items-center gap-1 transition-colors shadow-2xs"
                >
                  <Plus className="w-3.5 h-3.5" /> Añadir
                </button>
              </div>

              {/* Lista de anexos agregados */}
              {anexosList.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                  {anexosList.map((anexo, idx) => (
                    <div
                      key={`anexo-edit-${idx}-${anexo}`}
                      className="flex items-center justify-between p-2 bg-white border border-slate-200 rounded-lg text-xs"
                    >
                      <span className="text-slate-800 uppercase font-medium truncate pr-2" title={anexo}>
                        {idx + 1}. {anexo}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleRemoveAnexo(idx)}
                        className="text-slate-400 hover:text-rose-600 p-1 transition-colors"
                        title="Eliminar anexo"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-[11px] text-slate-500 italic">
                  No hay anexos agregados todavía. Puede agregar hasta 10 anexos técnicos.
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsEditing(false)}
                disabled={loading}
                className="px-3.5 py-1.5 text-xs font-semibold uppercase text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-4 py-1.5 text-xs font-bold uppercase text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors shadow-xs"
              >
                {loading ? "Guardando..." : "Guardar Datos"}
              </button>
              {currentUser?.rol === "ANALISTA" && tramite.estado_general === "REVISION" && (
                <button
                  type="button"
                  onClick={(e) => handleSave(e, true)}
                  disabled={loading}
                  className="px-4 py-1.5 text-xs font-bold uppercase text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors shadow-xs flex items-center gap-1.5 cursor-pointer"
                  title="Guardar datos y remitir automáticamente a la Jefa de Presupuesto para visto bueno"
                >
                  <Send className="w-3.5 h-3.5" />
                  {loading ? "Enviando..." : "Guardar y Enviar a Jefatura"}
                </button>
              )}
            </div>
          </form>
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-xs">
              <div>
                <span className="text-[11px] font-bold text-slate-500 uppercase block">
                  Nro / Cod Proceso:
                </span>
                <span className="text-xs font-mono font-bold text-slate-900 uppercase">
                  {tramite.nro_tramite || "PENDIENTE"}
                </span>
              </div>

              <div>
                <span className="text-[11px] font-bold text-slate-500 uppercase block">
                  Certificación Presupuestaria:
                </span>
                <span className="text-xs font-mono font-bold text-slate-900 uppercase">
                  {tramite.certificacion_presupuestaria || "PENDIENTE"}
                </span>
              </div>

              <div>
                <span className="text-[11px] font-bold text-slate-500 uppercase block">
                  Ítem Presupuestario:
                </span>
                <span className="text-xs font-semibold text-slate-800 uppercase">
                  {requiereItem
                    ? tramite.item_presupuestario || "PENDIENTE"
                    : "NO APLICA (EXPEDIENTE)"}
                </span>
              </div>

              <div>
                <span className="text-[11px] font-bold text-slate-500 uppercase block mb-1">
                  CUR Compromiso:
                </span>
                {displayedCurCompromisos.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5">
                    {displayedCurCompromisos.map((cur, idx) => (
                      <span
                        key={`cur-ro-${idx}-${cur}`}
                        className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-[11px] font-mono font-bold bg-emerald-50 text-emerald-800 border border-emerald-200 uppercase"
                      >
                        {cur}
                      </span>
                    ))}
                  </div>
                ) : (
                  <span className="text-xs font-mono font-semibold text-slate-400">
                    PENDIENTE
                  </span>
                )}
              </div>

              <div>
                <span className="text-[11px] font-bold text-slate-500 uppercase block">
                  Período de Pago:
                </span>
                <span className="text-xs font-mono font-bold text-slate-900 uppercase">
                  {tramite.periodo_pago || "PENDIENTE"}
                </span>
              </div>

              <div>
                <span className="text-[11px] font-bold text-slate-500 uppercase block mb-1">
                  Nro. Factura:
                </span>
                {displayedFacturas.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5">
                    {displayedFacturas.map((fac, idx) => (
                      <span
                        key={`fac-ro-${idx}-${fac}`}
                        className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-[11px] font-mono font-bold bg-blue-50 text-blue-800 border border-blue-200 uppercase"
                      >
                        <Receipt className="w-3 h-3 text-blue-600" />
                        {fac}
                      </span>
                    ))}
                  </div>
                ) : (
                  <span className="text-xs font-mono font-semibold text-slate-400">
                    PENDIENTE
                  </span>
                )}
              </div>
            </div>

            {/* Listado de Anexos solo lectura */}
            <div className="pt-3 border-t border-slate-100">
              <span className="text-[11px] font-bold text-slate-500 uppercase block mb-2">
                Anexos Registrados ({displayedAnexos.length} / 10):
              </span>
              {displayedAnexos.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {displayedAnexos.map((anexo, idx) => (
                    <span
                      key={`anexo-ro-${idx}-${anexo}`}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-medium bg-slate-100 text-slate-800 border border-slate-200 uppercase"
                    >
                      <FileText className="w-3 h-3 text-blue-600" />
                      {idx + 1}. {anexo}
                    </span>
                  ))}
                </div>
              ) : (
                <div className="text-[11px] text-slate-400 italic">
                  Ningún anexo registrado en esta fase.
                </div>
              )}
            </div>
          </div>
        )}
      </div>
      )}
    </div>
  );
};
