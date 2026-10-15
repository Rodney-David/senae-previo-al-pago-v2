"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  Building2,
  FileCode2,
  Sliders,
  Plus,
  Upload,
  Trash2,
  Edit2,
  Search,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  FileText,
  X,
  Database,
  Info,
  Coins,
} from "lucide-react";
import { Modal } from "@/components/ui/Modal";

type TipoCatalogo = "areas" | "procesos" | "gestion" | "items";

interface SeccionCatalogosProps {
  onNotify?: (notification: { type: "success" | "error"; text: string }) => void;
}

export const SeccionCatalogos: React.FC<SeccionCatalogosProps> = ({ onNotify }) => {
  const [activeCatalog, setActiveCatalog] = useState<TipoCatalogo>("areas");
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  // Modales
  const [modalImportOpen, setModalImportOpen] = useState(false);
  const [modalItemOpen, setModalItemOpen] = useState(false);
  const [modalVaciarOpen, setModalVaciarOpen] = useState(false);

  // Estado de edición/creación manual
  const [editingItem, setEditingItem] = useState<any | null>(null);
  const [itemNombre, setItemNombre] = useState("");
  const [itemCodigo, setItemCodigo] = useState("");
  const [itemDescripcion, setItemDescripcion] = useState("");
  const [itemActivo, setItemActivo] = useState(true);
  const [savingItem, setSavingItem] = useState(false);

  // Estado de importación TXT y PDF
  const [importText, setImportText] = useState("");
  const [importing, setImporting] = useState(false);
  const [importingPdf, setImportingPdf] = useState(false);
  const [vaciando, setVaciando] = useState(false);

  const notify = (type: "success" | "error", text: string) => {
    if (onNotify) {
      onNotify({ type, text });
    } else {
      alert(text);
    }
  };

  const loadCatalog = useCallback(async (tipo: TipoCatalogo) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/catalogos?tipo=${tipo}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Error al cargar catálogo");
      setItems(data.items || []);
    } catch (err: any) {
      console.error("Error loading catalog:", err);
      notify("error", err.message || "No se pudo cargar el catálogo");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCatalog(activeCatalog);
    setSearch("");
  }, [activeCatalog, loadCatalog]);

  // Manejar importación desde archivo TXT
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content) {
        setImportText(content);
      }
    };
    reader.readAsText(file, "UTF-8");
  };

  // Procesar importación TXT
  const handleExecuteImport = async () => {
    if (!importText.trim()) {
      notify("error", "Por favor ingrese o cargue el texto para importar.");
      return;
    }

    setImporting(true);
    try {
      const res = await fetch("/api/admin/catalogos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tipo: activeCatalog,
          accion: "importar",
          text: importText,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Error al importar datos");

      notify("success", data.message || "Importación realizada exitosamente.");
      setModalImportOpen(false);
      setImportText("");
      loadCatalog(activeCatalog);
    } catch (err: any) {
      notify("error", err.message || "Fallo en la importación");
    } finally {
      setImporting(false);
    }
  };

  // Re-importar ítems presupuestarios desde el clasificador PDF oficial
  const handleImportPdf = async () => {
    if (
      !confirm(
        "¿Desea re-importar el Clasificador Presupuestario desde el PDF oficial clasificador_presupuestario_2026.pdf?\n\nEsta operación extraerá y sincronizará todos los ítems presupuestarios en la base de datos."
      )
    ) {
      return;
    }

    setImportingPdf(true);
    try {
      const res = await fetch("/api/admin/catalogos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tipo: "items",
          accion: "importar_pdf",
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Error al importar clasificador PDF");

      notify("success", data.message || "Ítems importados desde el PDF con éxito.");
      loadCatalog("items");
    } catch (err: any) {
      notify("error", err.message || "Error al ejecutar importación de PDF");
    } finally {
      setImportingPdf(false);
    }
  };

  // Vaciar catálogo completo
  const handleExecuteVaciar = async () => {
    setVaciando(true);
    try {
      const res = await fetch("/api/admin/catalogos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tipo: activeCatalog,
          accion: "vaciar",
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Error al vaciar catálogo");

      notify("success", data.message || "Catálogo vaciado correctamente.");
      setModalVaciarOpen(false);
      loadCatalog(activeCatalog);
    } catch (err: any) {
      notify("error", err.message || "Error al vaciar catálogo");
    } finally {
      setVaciando(false);
    }
  };

  // Abrir modal para crear
  const handleOpenCreate = () => {
    setEditingItem(null);
    setItemNombre("");
    setItemCodigo("");
    setItemDescripcion("");
    setItemActivo(true);
    setModalItemOpen(true);
  };

  // Abrir modal para editar
  const handleOpenEdit = (item: any) => {
    setEditingItem(item);
    setItemNombre(item.nombre || "");
    setItemCodigo(item.codigo || "");
    setItemDescripcion(item.descripcion || "");
    setItemActivo(item.activo !== undefined ? item.activo : true);
    setModalItemOpen(true);
  };

  // Guardar item (Crear o Editar)
  const handleSaveItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!itemNombre.trim()) {
      notify("error", "El nombre es obligatorio.");
      return;
    }

    if ((activeCatalog === "procesos" || activeCatalog === "gestion" || activeCatalog === "items") && !itemCodigo.trim() && !editingItem) {
      notify("error", "El código es obligatorio para este catálogo.");
      return;
    }

    setSavingItem(true);
    try {
      if (editingItem) {
        // Actualizar
        const id = editingItem.id_area || editingItem.id_tipo_tramite || editingItem.id_tipo_gestion || editingItem.id_item;
        const res = await fetch("/api/admin/catalogos", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            tipo: activeCatalog,
            id,
            data: {
              nombre: itemNombre.trim(),
              codigo: itemCodigo.trim() || undefined,
              descripcion: itemDescripcion.trim() || null,
              activo: itemActivo,
            },
          }),
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Error al actualizar registro");
        notify("success", "Registro actualizado correctamente.");
      } else {
        // Crear
        const res = await fetch("/api/admin/catalogos", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            tipo: activeCatalog,
            accion: "crear",
            data: {
              nombre: itemNombre.trim(),
              codigo: itemCodigo.trim() || undefined,
              descripcion: itemDescripcion.trim() || null,
              activo: itemActivo,
            },
          }),
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Error al crear registro");
        notify("success", "Registro agregado exitosamente al catálogo.");
      }

      setModalItemOpen(false);
      loadCatalog(activeCatalog);
    } catch (err: any) {
      notify("error", err.message || "Error al procesar el registro");
    } finally {
      setSavingItem(false);
    }
  };

  // Eliminar un item específico
  const handleDeleteItem = async (item: any) => {
    const id = item.id_area || item.id_tipo_tramite || item.id_tipo_gestion || item.id_item;
    const nombre = item.nombre;

    if (!confirm(`¿Está seguro de eliminar "${nombre}" del catálogo?`)) {
      return;
    }

    try {
      const res = await fetch(`/api/admin/catalogos?tipo=${activeCatalog}&id=${id}`, {
        method: "DELETE",
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Error al eliminar registro");

      notify("success", `Registro "${nombre}" eliminado del catálogo.`);
      loadCatalog(activeCatalog);
    } catch (err: any) {
      notify("error", err.message || "No se pudo eliminar el registro");
    }
  };

  // Filtrado de items por búsqueda
  const filteredItems = items.filter((item) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      item.nombre?.toLowerCase().includes(q) ||
      item.codigo?.toLowerCase().includes(q) ||
      item.descripcion?.toLowerCase().includes(q)
    );
  });

  // Título y detalles según el catálogo seleccionado
  const catalogMeta = {
    areas: {
      titulo: "Áreas Requirentes / Solicitantes",
      descripcion:
        "Catálogo desplegable utilizado al recibir o registrar trámites institucionales con búsqueda rápida integrada.",
      ejemploTxt: `Administrativo Financiero BLVM\nAdministrativo Financiero CCAT\nAdministrativo Financiero ESMM\nAdquisiciones Aduaneras GYEM\nAforo BLVM\nAgencia de Inteligencia Guayas`,
      singular: "Área Requirente",
      icon: Building2,
    },
    procesos: {
      titulo: "Tipos de Proceso Normativo",
      descripcion:
        "Catálogo de procesos reglamentarios de contratación pública, viáticos y convenios del SENAE.",
      ejemploTxt: `PROC_01 - CONTRATACIÓN PÚBLICA LICITACIÓN\nPROC_02 - ÍNFIMA CUANTÍA BIENES Y SERVICIOS\nPROC_03 - VIÁTICOS Y SUBSISTENCIAS AL EXTERIOR`,
      singular: "Tipo de Proceso",
      icon: FileCode2,
    },
    gestion: {
      titulo: "Tipos de Gestión / Flujo Institucional",
      descripcion:
        "Catálogo de naturalezas de trámite: Pago Directo, Anticipo, Liquidación de Viáticos, Pólizas, etc.",
      ejemploTxt: `PAGO - PAGO A PROVEEDOR\nANTICIPO - PAGO DE ANTICIPO\nLIQUIDACION - LIQUIDACIÓN DE FONDO`,
      singular: "Tipo de Gestión",
      icon: Sliders,
    },
    items: {
      titulo: "Ítems Presupuestarios (Clasificador Oficial)",
      descripcion:
        "Catálogo oficial de partidas e ítems presupuestarios del clasificador de egresos del Estado.",
      ejemploTxt: `510105 - Remuneraciones Unificadas\n530105 - Telecomunicaciones\n530204 - Edición e Impresión`,
      singular: "Ítem Presupuestario",
      icon: Coins,
    },
  };

  const meta = catalogMeta[activeCatalog];
  const CurrentIcon = meta.icon;

  return (
    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs space-y-4">
      {/* Selector de sub-catálogo */}
      <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Database className="w-5 h-5 text-blue-600" />
          <div>
            <h2 className="text-sm font-bold text-slate-900 uppercase">
              Administración de Desplegables y Catálogos Paramétricos
            </h2>
            <p className="text-xs text-slate-500">
              Gestione las listas desplegables del sistema con importación masiva TXT/PDF, edición y limpieza.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap p-1 bg-slate-200 rounded-lg border border-slate-300 text-xs font-semibold uppercase gap-1">
          <button
            onClick={() => setActiveCatalog("areas")}
            className={`px-3 py-1.5 rounded-md transition-all flex items-center gap-1.5 ${
              activeCatalog === "areas"
                ? "bg-white text-blue-900 shadow-xs font-bold"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <Building2 className="w-3.5 h-3.5" />
            1. Áreas ({activeCatalog === "areas" ? items.length : "..."})
          </button>
          <button
            onClick={() => setActiveCatalog("procesos")}
            className={`px-3 py-1.5 rounded-md transition-all flex items-center gap-1.5 ${
              activeCatalog === "procesos"
                ? "bg-white text-blue-900 shadow-xs font-bold"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <FileCode2 className="w-3.5 h-3.5" />
            2. Tipos de Proceso
          </button>
          <button
            onClick={() => setActiveCatalog("gestion")}
            className={`px-3 py-1.5 rounded-md transition-all flex items-center gap-1.5 ${
              activeCatalog === "gestion"
                ? "bg-white text-blue-900 shadow-xs font-bold"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <Sliders className="w-3.5 h-3.5" />
            3. Tipos de Gestión
          </button>
          <button
            onClick={() => setActiveCatalog("items")}
            className={`px-3 py-1.5 rounded-md transition-all flex items-center gap-1.5 ${
              activeCatalog === "items"
                ? "bg-white text-blue-900 shadow-xs font-bold"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <Coins className="w-3.5 h-3.5 text-amber-600" />
            4. Ítems Presupuestarios ({activeCatalog === "items" ? items.length : "..."})
          </button>
        </div>
      </div>

      {/* Barra de Herramientas y Acciones del Catálogo */}
      <div className="px-5 pt-2 pb-1 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <CurrentIcon className="w-4 h-4 text-slate-700" />
            <h3 className="text-xs font-bold text-slate-900 uppercase">
              {meta.titulo} ({filteredItems.length} registros)
            </h3>
          </div>
          <p className="text-[11px] text-slate-500 mt-0.5">{meta.descripcion}</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Búsqueda rápida */}
          <div className="relative w-full sm:w-64">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar en el catálogo..."
              className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 uppercase"
            />
          </div>

          <button
            onClick={() => loadCatalog(activeCatalog)}
            disabled={loading}
            className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg border border-slate-200 transition-colors"
            title="Recargar catálogo"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin text-blue-600" : ""}`} />
          </button>

          {/* Botón Agregar Manual */}
          <button
            onClick={handleOpenCreate}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold uppercase bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors shadow-2xs"
          >
            <Plus className="w-3.5 h-3.5" />
            Agregar Manual
          </button>

          {/* Botón Importar PDF Oficial (exclusivo para ítems presupuestarios) */}
          {activeCatalog === "items" && (
            <button
              onClick={handleImportPdf}
              disabled={importingPdf}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold uppercase bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors shadow-2xs disabled:opacity-50"
              title="Importar automáticamente desde el PDF clasificador_presupuestario_2026.pdf"
            >
              <FileText className="w-3.5 h-3.5" />
              {importingPdf ? "Importando PDF..." : "Importar PDF Oficial"}
            </button>
          )}

          {/* Botón Importar TXT */}
          <button
            onClick={() => setModalImportOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold uppercase bg-slate-800 hover:bg-slate-900 text-white rounded-lg transition-colors shadow-2xs"
          >
            <Upload className="w-3.5 h-3.5" />
            Importar desde TXT
          </button>

          {/* Botón Vaciar */}
          <button
            onClick={() => setModalVaciarOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold uppercase bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-lg transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5 text-rose-600" />
            Vaciar Catálogo
          </button>
        </div>
      </div>

      {/* Tabla de Registros */}
      <div className="overflow-x-auto border-t border-slate-200">
        {loading ? (
          <div className="p-10 text-center text-xs text-slate-500 flex flex-col items-center gap-2">
            <RefreshCw className="w-5 h-5 animate-spin text-blue-600" />
            <span>Cargando catálogo...</span>
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="p-10 text-center text-xs text-slate-500">
            {items.length === 0 ? (
              <div className="space-y-2">
                <p className="font-semibold uppercase text-slate-700">El catálogo está vacío.</p>
                <p className="text-[11px] text-slate-400">
                  Puede agregar registros manualmente o importarlos masivamente desde un archivo TXT.
                </p>
                <button
                  onClick={() => setModalImportOpen(true)}
                  className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-bold uppercase bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  <Upload className="w-3.5 h-3.5" /> Importar Ahora
                </button>
              </div>
            ) : (
              <p className="font-semibold uppercase">No se encontraron registros que coincidan con la búsqueda.</p>
            )}
          </div>
        ) : (
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-bold text-slate-700 uppercase tracking-wide">
                <th className="py-2.5 px-4 w-12 text-center">#</th>
                <th className="py-2.5 px-4">Nombre / Valor</th>
                {(activeCatalog === "procesos" || activeCatalog === "gestion" || activeCatalog === "items") && (
                  <th className="py-2.5 px-4 w-44">Código</th>
                )}
                {activeCatalog === "procesos" && (
                  <th className="py-2.5 px-4 w-32">CUR Exigido</th>
                )}
                <th className="py-2.5 px-4 w-28 text-center">Estado</th>
                <th className="py-2.5 px-4 w-28 text-center">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredItems.map((item, index) => {
                const id = item.id_area || item.id_tipo_tramite || item.id_tipo_gestion || item.id_item;
                const isActivo = item.activo !== false;

                return (
                  <tr key={id} className="hover:bg-blue-50/50 transition-colors">
                    <td className="py-2.5 px-4 text-center text-slate-400 font-mono text-[11px]">
                      {index + 1}
                    </td>

                    <td className="py-2.5 px-4">
                      <div className="font-semibold text-slate-800 uppercase leading-snug">
                        {item.nombre}
                      </div>
                      {item.descripcion && (
                        <div className="text-[11px] text-slate-500">{item.descripcion}</div>
                      )}
                    </td>

                    {(activeCatalog === "procesos" || activeCatalog === "gestion" || activeCatalog === "items") && (
                      <td className="py-2.5 px-4 font-mono font-medium text-slate-600">
                        {item.codigo || "—"}
                      </td>
                    )}

                    {activeCatalog === "procesos" && (
                      <td className="py-2.5 px-4">
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-bold uppercase bg-slate-100 text-slate-700 border border-slate-200">
                          {item.tipo_cur_permitido || "DEVENGADO"}
                        </span>
                      </td>
                    )}

                    <td className="py-2.5 px-4 text-center">
                      <span
                        className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                          isActivo
                            ? "bg-emerald-100 text-emerald-800 border border-emerald-300"
                            : "bg-slate-100 text-slate-600 border border-slate-300"
                        }`}
                      >
                        {isActivo ? "Activo" : "Inactivo"}
                      </span>
                    </td>

                    <td className="py-2.5 px-4 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          onClick={() => handleOpenEdit(item)}
                          className="p-1 text-blue-600 hover:text-blue-800 hover:bg-blue-100 rounded transition-colors"
                          title="Modificar registro"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteItem(item)}
                          className="p-1 text-rose-600 hover:text-rose-800 hover:bg-rose-100 rounded transition-colors"
                          title="Eliminar del catálogo"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* ========================================================================= */}
      {/* MODAL 1: IMPORTAR DESDE TXT */}
      {/* ========================================================================= */}
      <Modal
        isOpen={modalImportOpen}
        onClose={() => setModalImportOpen(false)}
        title={`Importar ${meta.titulo} desde Archivo TXT`}
      >
        <div className="space-y-4 text-xs">
          <div className="bg-blue-50 border border-blue-200 p-3 rounded-lg flex items-start gap-2.5">
            <Info className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
            <div className="text-blue-900 leading-relaxed">
              <strong className="uppercase">Instrucciones de formato:</strong> Ingrese o pegue un
              elemento por línea. Si ya existe un registro con el mismo nombre, se conservará sin duplicar.
            </div>
          </div>

          <div>
            <label className="block font-bold text-slate-700 uppercase mb-1">
              Opción A: Cargar archivo de texto (.txt)
            </label>
            <input
              type="file"
              accept=".txt,text/plain"
              onChange={handleFileUpload}
              className="w-full text-xs text-slate-600 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 cursor-pointer border border-slate-300 rounded-lg p-1.5"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block font-bold text-slate-700 uppercase">
                Opción B: Pegar contenido directamente
              </label>
              <span className="text-[10px] text-slate-500 font-mono">
                {importText.split(/\r?\n/).filter((l) => l.trim().length > 0).length} líneas detectadas
              </span>
            </div>
            <textarea
              rows={8}
              value={importText}
              onChange={(e) => setImportText(e.target.value)}
              placeholder={`Ejemplo:\n${meta.ejemploTxt}`}
              className="w-full p-2.5 font-mono text-[11px] border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
            <button
              type="button"
              onClick={() => setModalImportOpen(false)}
              className="px-3 py-1.5 text-xs font-semibold uppercase text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleExecuteImport}
              disabled={importing || !importText.trim()}
              className="flex items-center gap-1.5 px-4 py-1.5 text-xs font-bold uppercase bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors shadow-xs disabled:opacity-50"
            >
              {importing ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  Importando...
                </>
              ) : (
                <>
                  <Upload className="w-3.5 h-3.5" />
                  Procesar e Importar
                </>
              )}
            </button>
          </div>
        </div>
      </Modal>

      {/* ========================================================================= */}
      {/* MODAL 2: CREAR O EDITAR MANUALMENTE */}
      {/* ========================================================================= */}
      <Modal
        isOpen={modalItemOpen}
        onClose={() => setModalItemOpen(false)}
        title={editingItem ? `Modificar ${meta.singular}` : `Agregar Nuevo ${meta.singular}`}
      >
        <form onSubmit={handleSaveItem} className="space-y-4 text-xs">
          <div>
            <label className="block font-bold text-slate-700 uppercase mb-1">
              Nombre / Denominación *
            </label>
            <input
              type="text"
              value={itemNombre}
              onChange={(e) => setItemNombre(e.target.value)}
              className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 uppercase font-semibold"
              placeholder="Ej: ADMINISTRATIVO FINANCIERO BLVM"
              required
            />
          </div>

          {(activeCatalog === "procesos" || activeCatalog === "gestion" || activeCatalog === "items") && (
            <div>
              <label className="block font-bold text-slate-700 uppercase mb-1">
                Código {activeCatalog === "items" ? "Presupuestario" : "Institucional"} {editingItem ? "" : "*"}
              </label>
              <input
                type="text"
                value={itemCodigo}
                onChange={(e) => setItemCodigo(e.target.value)}
                className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 font-mono uppercase"
                placeholder={activeCatalog === "items" ? "Ej: 530204" : "Ej: PROC_INFIMA_CUANTIA"}
                required={!editingItem}
              />
            </div>
          )}

          <div>
            <label className="block font-bold text-slate-700 uppercase mb-1">
              Descripción o Detalle (Opcional)
            </label>
            <input
              type="text"
              value={itemDescripcion}
              onChange={(e) => setItemDescripcion(e.target.value)}
              className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              placeholder="Notas aclaratorias sobre esta opción..."
            />
          </div>

          <div className="flex items-center gap-2 pt-1">
            <input
              type="checkbox"
              id="item-activo-check"
              checked={itemActivo}
              onChange={(e) => setItemActivo(e.target.checked)}
              className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
            />
            <label htmlFor="item-activo-check" className="font-semibold text-slate-700 uppercase cursor-pointer">
              Registro Activo (visible en formularios desplegables)
            </label>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
            <button
              type="button"
              onClick={() => setModalItemOpen(false)}
              className="px-3 py-1.5 text-xs font-semibold uppercase text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={savingItem}
              className="flex items-center gap-1.5 px-4 py-1.5 text-xs font-bold uppercase bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors shadow-xs disabled:opacity-50"
            >
              {savingItem ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Guardando...
                </>
              ) : editingItem ? (
                "Guardar Cambios"
              ) : (
                "Crear Registro"
              )}
            </button>
          </div>
        </form>
      </Modal>

      {/* ========================================================================= */}
      {/* MODAL 3: CONFIRMACIÓN VACIAR CATÁLOGO */}
      {/* ========================================================================= */}
      <Modal
        isOpen={modalVaciarOpen}
        onClose={() => setModalVaciarOpen(false)}
        title="Confirmación de Vaciado de Catálogo"
      >
        <div className="space-y-4 text-xs">
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg flex items-start gap-2.5">
            <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
            <div className="text-rose-900 leading-relaxed">
              <strong className="block uppercase font-bold text-rose-800">
                ¡Atención: Acción Destructiva!
              </strong>
              Se eliminarán todos los registros del catálogo{" "}
              <span className="font-bold underline uppercase">{meta.titulo}</span>.
              {activeCatalog === "areas"
                ? " Esto no afectará los trámites ya registrados, pero dejará el desplegable sin opciones hasta que importe o ingrese una nueva lista."
                : " Asegúrese de que no existan dependencias críticas antes de continuar."}
            </div>
          </div>

          <p className="text-slate-600">
            ¿Está completamente seguro de que desea vaciar todos los registros de este catálogo?
          </p>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
            <button
              type="button"
              onClick={() => setModalVaciarOpen(false)}
              className="px-3 py-1.5 text-xs font-semibold uppercase text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleExecuteVaciar}
              disabled={vaciando}
              className="flex items-center gap-1.5 px-4 py-1.5 text-xs font-bold uppercase bg-rose-600 hover:bg-rose-700 text-white rounded-lg transition-colors shadow-xs disabled:opacity-50"
            >
              {vaciando ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Vaciando...
                </>
              ) : (
                <>
                  <Trash2 className="w-3.5 h-3.5" /> Sí, Vaciar Catálogo
                </>
              )}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
