"use client";

import React, { useEffect, useState } from "react";
import { formatDate } from "@/lib/utils";
import {
  ShieldCheck,
  Users,
  Calendar,
  FileCode2,
  Plus,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Edit2,
  Trash2,
  Search,
  History,
  Lock,
  X,
  Database,
  FileSpreadsheet,
  Clock,
  Settings,
  Building2,
  SlidersHorizontal,
  KeyRound,
} from "lucide-react";
import { SeccionCatalogos } from "@/components/admin/SeccionCatalogos";
import { SeccionMigracionExcel } from "@/components/admin/SeccionMigracionExcel";
import { SeccionConfiguracionSLA } from "@/components/admin/SeccionConfiguracionSLA";

type AdminTab = "usuarios" | "parametros" | "catalogos" | "auditoria";
type ParametrosSubTab = "sla" | "feriados" | "institucionales";
type CatalogosSubTab = "maestros" | "procesos_cur";
type AuditoriaSubTab = "bitacora" | "migracion";

export default function AdministracionPage() {
  // Pestañas Principales (Exactamente 4 Vistas Maestras)
  const [activeTab, setActiveTab] = useState<AdminTab>("usuarios");

  // Sub-pestañas organizativas
  const [paramSubTab, setParamSubTab] = useState<ParametrosSubTab>("sla");
  const [catSubTab, setCatSubTab] = useState<CatalogosSubTab>("maestros");
  const [auditSubTab, setAuditSubTab] = useState<AuditoriaSubTab>("bitacora");

  // Estados de datos
  const [usuarios, setUsuarios] = useState<any[]>([]);
  const [feriados, setFeriados] = useState<any[]>([]);
  const [procesos, setProcesos] = useState<any[]>([]);
  const [auditoria, setAuditoria] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal Usuario (Crear / Editar)
  const [modalUsuarioOpen, setModalUsuarioOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<any | null>(null);

  // Formulario Usuario
  const [userNombre, setUserNombre] = useState("");
  const [userCorreo, setUserCorreo] = useState("");
  const [userCargo, setUserCargo] = useState("");
  const [userRol, setUserRol] = useState("ANALISTA");
  const [userArea, setUserArea] = useState("2");
  const [userDisp, setUserDisp] = useState("DISPONIBLE");

  // Formulario Feriado
  const [newFeriadoFecha, setNewFeriadoFecha] = useState("");
  const [newFeriadoDesc, setNewFeriadoDesc] = useState("");
  const [newFeriadoTipo, setNewFeriadoTipo] = useState("NACIONAL");

  // Filtro Auditoría
  const [auditSearch, setAuditSearch] = useState("");

  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; text: string } | null>(
    null
  );

  const fetchData = async () => {
    setLoading(true);
    try {
      const [uRes, fRes, pRes, aRes] = await Promise.all([
        fetch("/api/admin/usuarios"),
        fetch("/api/admin/feriados"),
        fetch("/api/admin/procesos"),
        fetch("/api/admin/auditoria"),
      ]);
      const [uData, fData, pData, aData] = await Promise.all([
        uRes.json(),
        fRes.json(),
        pRes.json(),
        aRes.json(),
      ]);
      if (uData.usuarios) setUsuarios(uData.usuarios);
      if (fData.feriados) setFeriados(fData.feriados);
      if (pData.tipos) setProcesos(pData.tipos);
      if (aData.movimientos) setAuditoria(aData.movimientos);
    } catch (err) {
      console.error("Error loading admin data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Guardar o Editar Usuario
  const handleSaveUsuario = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setFeedback(null);
    try {
      const method = editingUser ? "PUT" : "POST";
      const payload: any = {
        nombre_completo: userNombre.trim(),
        correo_institucional: userCorreo.trim(),
        cargo: userCargo.trim(),
        rol: userRol,
        id_area: Number(userArea),
        estado_disponibilidad: userDisp,
      };
      if (editingUser) {
        payload.id_usuario = editingUser.id_usuario;
      }

      const res = await fetch("/api/admin/usuarios", {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Error al guardar servidor");

      setFeedback({
        type: "success",
        text: editingUser
          ? "Servidor público actualizado con éxito."
          : "Nuevo servidor registrado con éxito en el sistema.",
      });
      setModalUsuarioOpen(false);
      setEditingUser(null);
      fetchData();
    } catch (err: any) {
      setFeedback({ type: "error", text: err.message });
    } finally {
      setSaving(false);
    }
  };

  const handleOpenEditUser = (u: any) => {
    setEditingUser(u);
    setUserNombre(u.nombre_completo);
    setUserCorreo(u.correo_institucional);
    setUserCargo(u.cargo);
    setUserRol(u.rol);
    setUserArea(String(u.id_area));
    setUserDisp(u.estado_disponibilidad || "DISPONIBLE");
    setModalUsuarioOpen(true);
  };

  const handleOpenCreateUser = () => {
    setEditingUser(null);
    setUserNombre("");
    setUserCorreo("");
    setUserCargo("");
    setUserRol("ANALISTA");
    setUserArea("2");
    setUserDisp("DISPONIBLE");
    setModalUsuarioOpen(true);
  };

  // Feriados: eliminar
  const handleDeleteFeriado = async (id_feriado: number) => {
    if (!confirm("¿Está seguro de eliminar este día del calendario de feriados no laborables?"))
      return;
    try {
      const res = await fetch(`/api/admin/feriados?id=${id_feriado}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Error al eliminar feriado");
      setFeedback({ type: "success", text: "Día no laborable eliminado correctamente." });
      fetchData();
    } catch (err: any) {
      setFeedback({ type: "error", text: err.message });
    }
  };

  // Feriados: agregar
  const handleAddFeriado = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFeriadoFecha || !newFeriadoDesc.trim()) return;
    setSaving(true);
    setFeedback(null);
    try {
      const res = await fetch("/api/admin/feriados", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fecha: newFeriadoFecha,
          descripcion: newFeriadoDesc.trim(),
          tipo: newFeriadoTipo,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Error al registrar día no laborable");
      setNewFeriadoFecha("");
      setNewFeriadoDesc("");
      setFeedback({
        type: "success",
        text: "Día no laborable agregado al cómputo oficial de días hábiles del SLA.",
      });
      fetchData();
    } catch (err: any) {
      setFeedback({ type: "error", text: err.message });
    } finally {
      setSaving(false);
    }
  };

  // Procesos Normativos: configurar CUR Devengado vs Contable e Ítem
  const handleUpdateProcesoCur = async (
    id_tipo_tramite: number,
    tipo_cur_permitido: string,
    requiere_item: boolean
  ) => {
    try {
      const res = await fetch("/api/admin/procesos", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id_tipo_tramite,
          tipo_cur_permitido,
          requiere_item_presupuestario: requiere_item,
        }),
      });
      if (!res.ok) throw new Error("Error al actualizar proceso normativo");
      setFeedback({
        type: "success",
        text: "Regla de CUR del proceso normativo actualizada con éxito.",
      });
      fetchData();
    } catch (err: any) {
      setFeedback({ type: "error", text: err.message });
    }
  };

  const filteredAuditoria = auditoria.filter((mov) => {
    if (!auditSearch.trim()) return true;
    const term = auditSearch.toLowerCase();
    return (
      mov.tramites?.codigo_tramite?.toLowerCase().includes(term) ||
      mov.tramites?.numero_quipux?.toLowerCase().includes(term) ||
      mov.tipo_accion?.toLowerCase().includes(term) ||
      mov.comentarios?.toLowerCase().includes(term) ||
      mov.usuarios_historial_movimientos_id_usuario_entregaTousuarios?.nombre_completo
        ?.toLowerCase()
        .includes(term)
    );
  });

  return (
    <div className="space-y-6">
      {/* ------------------------------------------------------------------- */}
      {/* 1. ENCABEZADO MAESTRO DE GOBERNANZA                                 */}
      {/* ------------------------------------------------------------------- */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-xl border border-slate-200 shadow-2xs">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-slate-900 text-white rounded-lg shadow-2xs">
              <ShieldCheck className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <h1 className="text-base font-bold text-slate-900 uppercase tracking-wide">
                Consola de Administración y Gobernanza Institucional
              </h1>
              <p className="text-xs text-slate-500 mt-0.5">
                Supervisión del talento humano, parametrización de reglas y SLA normativo, catálogos maestros y auditoría forense.
              </p>
            </div>
          </div>
        </div>

        <button
          onClick={fetchData}
          disabled={loading}
          className="p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg border border-slate-200 transition-colors self-start sm:self-auto"
          title="Actualizar datos de administración"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin text-blue-600" : ""}`} />
        </button>
      </div>

      {/* Banner de Feedback */}
      {feedback && (
        <div
          className={`p-3 text-xs rounded-lg font-medium border flex items-center justify-between ${
            feedback.type === "success"
              ? "bg-emerald-50 text-emerald-800 border-emerald-200"
              : "bg-rose-50 text-rose-800 border-rose-200"
          }`}
        >
          <div className="flex items-center gap-2">
            {feedback.type === "success" ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            )}
            <span>{feedback.text}</span>
          </div>
          <button onClick={() => setFeedback(null)} className="text-slate-500 hover:text-slate-700">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* ------------------------------------------------------------------- */}
      {/* 2. BARRA DE LAS 4 VISTAS MAESTRAS                                   */}
      {/* ------------------------------------------------------------------- */}
      <div className="flex flex-wrap p-1.5 bg-slate-200/90 rounded-xl border border-slate-300 text-xs font-semibold uppercase gap-1.5 shadow-2xs">
        <button
          onClick={() => setActiveTab("usuarios")}
          className={`px-4 py-2 rounded-lg transition-all flex items-center gap-2 ${
            activeTab === "usuarios"
              ? "bg-white text-slate-900 shadow-xs font-bold"
              : "text-slate-600 hover:text-slate-900 hover:bg-slate-100/60"
          }`}
        >
          <Users className="w-4 h-4 text-blue-600" />
          1. Talento Humano y Accesos
        </button>

        <button
          onClick={() => setActiveTab("parametros")}
          className={`px-4 py-2 rounded-lg transition-all flex items-center gap-2 ${
            activeTab === "parametros"
              ? "bg-white text-slate-900 shadow-xs font-bold"
              : "text-slate-600 hover:text-slate-900 hover:bg-slate-100/60"
          }`}
        >
          <SlidersHorizontal className="w-4 h-4 text-amber-600" />
          2. Parámetros y Reglas (SLA)
        </button>

        <button
          onClick={() => setActiveTab("catalogos")}
          className={`px-4 py-2 rounded-lg transition-all flex items-center gap-2 ${
            activeTab === "catalogos"
              ? "bg-white text-slate-900 shadow-xs font-bold"
              : "text-slate-600 hover:text-slate-900 hover:bg-slate-100/60"
          }`}
        >
          <Database className="w-4 h-4 text-indigo-600" />
          3. Catálogos Maestros y Procesos
        </button>

        <button
          onClick={() => setActiveTab("auditoria")}
          className={`px-4 py-2 rounded-lg transition-all flex items-center gap-2 ${
            activeTab === "auditoria"
              ? "bg-white text-slate-900 shadow-xs font-bold"
              : "text-slate-600 hover:text-slate-900 hover:bg-slate-100/60"
          }`}
        >
          <History className="w-4 h-4 text-emerald-600" />
          4. Auditoría Forense y Migración
        </button>
      </div>

      {/* ------------------------------------------------------------------- */}
      {/* VISTA 1: GESTIÓN DE TALENTO HUMANO Y ACCESOS                         */}
      {/* ------------------------------------------------------------------- */}
      {activeTab === "usuarios" && (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-2xs space-y-4">
          <div className="p-4 bg-slate-50 border-b border-slate-200 text-xs text-slate-700 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <strong>Plantilla de Servidores Públicos Institucionales:</strong> Asigne a cada funcionario
              su departamento orgánico, rol operativo y estado de disponibilidad en el despacho de expedientes.
            </div>
            <button
              onClick={handleOpenCreateUser}
              className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold uppercase rounded-lg transition-colors flex items-center gap-1.5 shadow-2xs self-start sm:self-auto text-xs"
            >
              <Plus className="w-4 h-4" /> Nuevo Servidor Público
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-[850px] w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/70 text-[11px] font-bold text-slate-700 uppercase">
                  <th className="py-3 px-4">Funcionario</th>
                  <th className="py-3 px-4">Correo Institucional</th>
                  <th className="py-3 px-4">Departamento Orgánico</th>
                  <th className="py-3 px-4">Cargo / Rol</th>
                  <th className="py-3 px-4">Disponibilidad</th>
                  <th className="py-3 px-4 text-center">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {usuarios.map((u) => (
                  <tr key={u.id_usuario} className="hover:bg-slate-50 transition-colors">
                    <td className="py-3 px-4 font-bold text-slate-900 uppercase">
                      {u.nombre_completo}
                    </td>
                    <td className="py-3 px-4 text-slate-600 font-mono text-[11px]">
                      {u.correo_institucional}
                    </td>
                    <td className="py-3 px-4 text-slate-800 uppercase font-semibold">
                      {u.areas?.nombre || "SENAE"}
                    </td>
                    <td className="py-3 px-4">
                      <span className="inline-block px-2.5 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-800 border border-slate-200 uppercase">
                        {u.cargo} ({u.rol})
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`inline-block px-2.5 py-0.5 rounded text-[10px] font-bold uppercase ${
                          u.estado_disponibilidad === "DISPONIBLE"
                            ? "bg-emerald-50 text-emerald-800 border border-emerald-300"
                            : u.estado_disponibilidad === "VACACIONES" ||
                              u.estado_disponibilidad === "EN_COMISION"
                            ? "bg-amber-50 text-amber-800 border border-amber-300"
                            : "bg-rose-50 text-rose-800 border border-rose-300"
                        }`}
                      >
                        {u.estado_disponibilidad || "DISPONIBLE"}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <button
                        onClick={() => handleOpenEditUser(u)}
                        className="px-2.5 py-1 text-slate-600 hover:text-blue-700 hover:bg-blue-50 border border-slate-200 rounded-md transition-colors"
                        title="Modificar perfil o rol del servidor"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------------- */}
      {/* VISTA 2: PARÁMETROS DEL SISTEMA Y REGLAS DE NEGOCIO (SLA)           */}
      {/* ------------------------------------------------------------------- */}
      {activeTab === "parametros" && (
        <div className="space-y-4">
          {/* Sub-selector */}
          <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
            <button
              onClick={() => setParamSubTab("sla")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase transition-all flex items-center gap-1.5 ${
                paramSubTab === "sla"
                  ? "bg-blue-600 text-white shadow-2xs"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              <Clock className="w-3.5 h-3.5" />
              Semáforo y Motor SLA
            </button>
            <button
              onClick={() => setParamSubTab("feriados")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase transition-all flex items-center gap-1.5 ${
                paramSubTab === "feriados"
                  ? "bg-blue-600 text-white shadow-2xs"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              <Calendar className="w-3.5 h-3.5" />
              Calendario de Feriados (Días No Laborables)
            </button>
            <button
              onClick={() => setParamSubTab("institucionales")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase transition-all flex items-center gap-1.5 ${
                paramSubTab === "institucionales"
                  ? "bg-blue-600 text-white shadow-2xs"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              <Settings className="w-3.5 h-3.5" />
              Parámetros Financieros Generales
            </button>
          </div>

          {/* Sub-vista 2.1: Semáforo SLA */}
          {paramSubTab === "sla" && <SeccionConfiguracionSLA />}

          {/* Sub-vista 2.2: Calendario Feriados */}
          {paramSubTab === "feriados" && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 bg-white border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
                <div className="px-5 py-3.5 bg-slate-900 text-white text-xs font-bold uppercase tracking-wider flex items-center justify-between">
                  <span>Calendario de Días No Laborables Registrados</span>
                  <span className="text-[11px] text-slate-300 font-normal">
                    Se descuentan automáticamente del cálculo de días hábiles
                  </span>
                </div>
                <div className="overflow-x-auto">
                  <table className="min-w-[600px] w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-bold text-slate-700 uppercase">
                        <th className="py-2.5 px-4">Fecha</th>
                        <th className="py-2.5 px-4">Descripción del Feriado</th>
                        <th className="py-2.5 px-4">Tipo</th>
                        <th className="py-2.5 px-4 text-center">Acción</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {feriados.map((f) => (
                        <tr key={f.id_feriado} className="hover:bg-slate-50">
                          <td className="py-2.5 px-4 font-mono font-bold text-blue-900">
                            {formatDate(f.fecha)}
                          </td>
                          <td className="py-2.5 px-4 font-semibold text-slate-800 uppercase">
                            {f.descripcion}
                          </td>
                          <td className="py-2.5 px-4">
                            <span className="inline-block px-2 py-0.5 rounded text-[10px] bg-slate-100 text-slate-700 border border-slate-200 font-bold uppercase">
                              {f.tipo}
                            </span>
                          </td>
                          <td className="py-2.5 px-4 text-center">
                            <button
                              onClick={() => handleDeleteFeriado(f.id_feriado)}
                              className="text-slate-400 hover:text-rose-600 p-1 transition-colors"
                              title="Eliminar feriado"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-2xs space-y-4">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 border-b border-slate-100 pb-2 flex items-center gap-1.5">
                  <Plus className="w-4 h-4 text-blue-600" />
                  Registrar Día No Laborable
                </h3>
                <form onSubmit={handleAddFeriado} className="space-y-3 text-xs">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1 uppercase">Fecha *</label>
                    <input
                      type="date"
                      value={newFeriadoFecha}
                      onChange={(e) => setNewFeriadoFecha(e.target.value)}
                      className="w-full border border-slate-300 rounded-lg p-2 font-mono"
                      required
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1 uppercase">
                      Descripción *
                    </label>
                    <input
                      type="text"
                      value={newFeriadoDesc}
                      onChange={(e) => setNewFeriadoDesc(e.target.value)}
                      placeholder="ej. Feriado Nacional de Independencia"
                      className="w-full border border-slate-300 rounded-lg p-2 uppercase font-medium"
                      required
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1 uppercase">Tipo *</label>
                    <select
                      value={newFeriadoTipo}
                      onChange={(e) => setNewFeriadoTipo(e.target.value)}
                      className="w-full border border-slate-300 rounded-lg p-2 uppercase font-semibold"
                    >
                      <option value="NACIONAL">NACIONAL</option>
                      <option value="LOCAL">LOCAL</option>
                      <option value="DECRETO_EJECUTIVO">DECRETO EJECUTIVO</option>
                    </select>
                  </div>

                  <button
                    type="submit"
                    disabled={saving}
                    className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold uppercase rounded-lg transition-colors shadow-2xs"
                  >
                    {saving ? "Guardando..." : "Guardar Día No Laborable"}
                  </button>
                </form>
              </div>
            </div>
          )}

          {/* Sub-vista 2.3: Parámetros Financieros Generales */}
          {paramSubTab === "institucionales" && (
            <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-2xs space-y-4">
              <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide border-b border-slate-100 pb-2">
                Constantes de Operación Institucional SENAE
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg space-y-1">
                  <span className="text-[10px] uppercase font-bold text-slate-500">
                    Límite SLA Normativo
                  </span>
                  <div className="text-lg font-bold text-blue-900">6 Días Hábiles</div>
                  <p className="text-[11px] text-slate-600 mt-1">
                    Cómputo formal entre Presupuesto y Autorización en Tesorería.
                  </p>
                </div>

                <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg space-y-1">
                  <span className="text-[10px] uppercase font-bold text-slate-500">
                    Umbral de Alta Cuantía
                  </span>
                  <div className="text-lg font-bold text-emerald-900">$10.000,00 USD</div>
                  <p className="text-[11px] text-slate-600 mt-1">
                    Trámites con monto total mayor o igual se etiquetan como prioritarios.
                  </p>
                </div>

                <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg space-y-1">
                  <span className="text-[10px] uppercase font-bold text-slate-500">
                    Ejercicio Fiscal Activo
                  </span>
                  <div className="text-lg font-bold text-slate-900">Año Fiscal 2026</div>
                  <p className="text-[11px] text-slate-600 mt-1">
                    Vigencia de partidas y asignación presupuestaria.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ------------------------------------------------------------------- */}
      {/* VISTA 3: CATÁLOGOS MAESTROS Y PROCESOS                              */}
      {/* ------------------------------------------------------------------- */}
      {activeTab === "catalogos" && (
        <div className="space-y-4">
          {/* Sub-selector */}
          <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
            <button
              onClick={() => setCatSubTab("maestros")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase transition-all flex items-center gap-1.5 ${
                catSubTab === "maestros"
                  ? "bg-blue-600 text-white shadow-2xs"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              <Database className="w-3.5 h-3.5" />
              Catálogos Maestros (Áreas, Tipos y Gestión)
            </button>
            <button
              onClick={() => setCatSubTab("procesos_cur")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase transition-all flex items-center gap-1.5 ${
                catSubTab === "procesos_cur"
                  ? "bg-blue-600 text-white shadow-2xs"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              <FileCode2 className="w-3.5 h-3.5" />
              Reglas de CUR por Proceso Normativo
            </button>
          </div>

          {/* Sub-vista 3.1: Catálogos Maestros */}
          {catSubTab === "maestros" && (
            <SeccionCatalogos
              onNotify={(notif) => setFeedback({ type: notif.type, text: notif.text })}
            />
          )}

          {/* Sub-vista 3.2: 17 Procesos y Reglas de CUR */}
          {catSubTab === "procesos_cur" && (
            <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-2xs space-y-4">
              <div className="p-4 bg-slate-50 border-b border-slate-200 text-xs text-slate-700">
                <strong>Catálogo de 17 Procesos Normativos SENAE:</strong> Configure si cada proceso
                exige <span className="font-semibold text-blue-900">CUR DEVENGADO</span> (adquisiciones/servicios),{" "}
                <span className="font-semibold text-purple-900">CUR CONTABLE</span> (fondos, viáticos, pólizas, cauciones) o{" "}
                <span className="font-semibold text-slate-900">AMBOS</span>, así como la exigibilidad de Ítem Presupuestario.
              </div>

              <div className="overflow-x-auto">
                <table className="min-w-[750px] w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50/70 text-[11px] font-bold text-slate-700 uppercase">
                      <th className="py-2.5 px-4 w-12">#</th>
                      <th className="py-2.5 px-4">Proceso Normativo (SENAE)</th>
                      <th className="py-2.5 px-4 w-44">CUR Exigido en Contabilidad</th>
                      <th className="py-2.5 px-4 w-40">Ítem Presupuestario</th>
                      <th className="py-2.5 px-4 w-28 text-center">Estado</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {procesos.map((p, idx) => (
                      <tr key={p.id_tipo_tramite} className="hover:bg-slate-50 transition-colors">
                        <td className="py-2.5 px-4 font-mono font-bold text-slate-500">{idx + 1}</td>
                        <td className="py-2.5 px-4">
                          <div className="font-semibold text-slate-900 uppercase">{p.nombre}</div>
                          <div className="text-[10px] font-mono text-slate-500">CÓDIGO: {p.codigo}</div>
                        </td>
                        <td className="py-2.5 px-4">
                          <select
                            value={p.tipo_cur_permitido || "DEVENGADO"}
                            onChange={(e) =>
                              handleUpdateProcesoCur(
                                p.id_tipo_tramite,
                                e.target.value,
                                p.requiere_item_presupuestario ?? true
                              )
                            }
                            className="text-xs bg-slate-50 border border-slate-300 rounded p-1.5 font-bold uppercase focus:ring-2 focus:ring-blue-500"
                          >
                            <option value="DEVENGADO">CUR DEVENGADO</option>
                            <option value="CONTABLE">CUR CONTABLE</option>
                            <option value="AMBOS">AMBOS (OPCIONAL)</option>
                          </select>
                        </td>
                        <td className="py-2.5 px-4">
                          <label className="inline-flex items-center gap-2 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={p.requiere_item_presupuestario ?? true}
                              onChange={(e) =>
                                handleUpdateProcesoCur(
                                  p.id_tipo_tramite,
                                  p.tipo_cur_permitido || "DEVENGADO",
                                  e.target.checked
                                )
                              }
                              className="rounded text-blue-600"
                            />
                            <span className="text-[11px] font-semibold text-slate-700 uppercase">
                              {p.requiere_item_presupuestario ?? true ? "Aplica Ítem" : "Sin Ítem"}
                            </span>
                          </label>
                        </td>
                        <td className="py-2.5 px-4 text-center">
                          <span className="inline-block px-2 py-0.5 rounded text-[10px] bg-emerald-50 text-emerald-700 border border-emerald-200 font-bold uppercase">
                            ACTIVO
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ------------------------------------------------------------------- */}
      {/* VISTA 4: AUDITORÍA FORENSE Y MIGRACIÓN MASIVA                       */}
      {/* ------------------------------------------------------------------- */}
      {activeTab === "auditoria" && (
        <div className="space-y-4">
          {/* Sub-selector */}
          <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
            <button
              onClick={() => setAuditSubTab("bitacora")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase transition-all flex items-center gap-1.5 ${
                auditSubTab === "bitacora"
                  ? "bg-blue-600 text-white shadow-2xs"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              <History className="w-3.5 h-3.5" />
              Bitácora Inmutable de Eventos
            </button>
            <button
              onClick={() => setAuditSubTab("migracion")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase transition-all flex items-center gap-1.5 ${
                auditSubTab === "migracion"
                  ? "bg-blue-600 text-white shadow-2xs"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
              Migración Masiva de Bitácora (Excel 2026)
            </button>
          </div>

          {/* Sub-vista 4.1: Bitácora de Eventos */}
          {auditSubTab === "bitacora" && (
            <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-2xs space-y-4">
              <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-2">
                  <History className="w-4 h-4 text-blue-600" />
                  <span className="font-bold text-slate-800 uppercase">
                    Registro Cronológico de Acciones y Movimientos Institucionales
                  </span>
                </div>

                <div className="relative w-full sm:w-80">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    value={auditSearch}
                    onChange={(e) => setAuditSearch(e.target.value)}
                    placeholder="BUSCAR POR QUIPUX, ACCIÓN, USUARIO..."
                    className="w-full pl-9 pr-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg font-medium uppercase focus:ring-2 focus:ring-blue-500 shadow-2xs"
                  />
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="min-w-[850px] w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-bold text-slate-700 uppercase">
                      <th className="py-2.5 px-4 w-36">Fecha / Hora</th>
                      <th className="py-2.5 px-4 w-44">Número Quipux</th>
                      <th className="py-2.5 px-4 w-44">Acción Ejecutada</th>
                      <th className="py-2.5 px-4 w-48">Servidor Responsable</th>
                      <th className="py-2.5 px-4">Detalle / Justificación</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredAuditoria.map((mov) => (
                      <tr key={mov.id_movimiento} className="hover:bg-slate-50">
                        <td className="py-2.5 px-4 font-mono text-[11px] text-slate-500">
                          {formatDate(mov.fecha_hora)}
                        </td>
                        <td className="py-2.5 px-4 font-mono font-bold text-blue-900">
                          {mov.tramites?.numero_quipux}
                        </td>
                        <td className="py-2.5 px-4">
                          <span className="inline-block px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-slate-100 text-slate-800 border border-slate-200 uppercase">
                            {mov.tipo_accion}
                          </span>
                        </td>
                        <td className="py-2.5 px-4">
                          <div className="font-semibold text-slate-800 uppercase">
                            {mov.usuarios_historial_movimientos_id_usuario_entregaTousuarios
                              ?.nombre_completo || "SISTEMA"}
                          </div>
                          <div className="text-[10px] text-slate-500 uppercase">
                            {mov.areas_historial_movimientos_id_area_origenToareas?.nombre ||
                              "DFI"}
                          </div>
                        </td>
                        <td className="py-2.5 px-4 text-slate-700 uppercase text-[11px] leading-snug">
                          {mov.comentarios || "Sin comentarios"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Sub-vista 4.2: Migración Masiva Excel */}
          {auditSubTab === "migracion" && <SeccionMigracionExcel />}
        </div>
      )}

      {/* ------------------------------------------------------------------- */}
      {/* MODAL CREAR / EDITAR USUARIO                                        */}
      {/* ------------------------------------------------------------------- */}
      {modalUsuarioOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6 space-y-4 text-xs">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-slate-900 uppercase">
                {editingUser ? "Modificar Servidor Público" : "Registrar Nuevo Servidor"}
              </h3>
              <button
                onClick={() => setModalUsuarioOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveUsuario} className="space-y-3">
              <div>
                <label className="block font-semibold text-slate-700 mb-1 uppercase">
                  Nombre Completo *
                </label>
                <input
                  type="text"
                  value={userNombre}
                  onChange={(e) => setUserNombre(e.target.value)}
                  placeholder="ej. Econ. Juan Pérez"
                  className="w-full p-2 border border-slate-300 rounded-lg uppercase font-medium"
                  required
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1 uppercase">
                  Correo Institucional *
                </label>
                <input
                  type="email"
                  value={userCorreo}
                  onChange={(e) => setUserCorreo(e.target.value)}
                  placeholder="juan.perez@aduana.gob.ec"
                  className="w-full p-2 border border-slate-300 rounded-lg font-mono"
                  required
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1 uppercase">
                  Cargo Nominal *
                </label>
                <input
                  type="text"
                  value={userCargo}
                  onChange={(e) => setUserCargo(e.target.value)}
                  placeholder="ej. Analista de Presupuesto 3"
                  className="w-full p-2 border border-slate-300 rounded-lg uppercase font-medium"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1 uppercase">
                    Departamento Orgánico
                  </label>
                  <select
                    value={userArea}
                    onChange={(e) => setUserArea(e.target.value)}
                    className="w-full p-2 border border-slate-300 rounded-lg uppercase font-semibold"
                  >
                    <option value="1">1. DIRECCIÓN FINANCIERA (DFI)</option>
                    <option value="2">2. PRESUPUESTO</option>
                    <option value="3">3. CONTABILIDAD</option>
                    <option value="4">4. TESORERÍA / CAJA</option>
                    <option value="5">5. COBRANZAS</option>
                    <option value="6">6. ARCHIVO CENTRAL</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1 uppercase">
                    Rol Institucional
                  </label>
                  <select
                    value={userRol}
                    onChange={(e) => setUserRol(e.target.value)}
                    className="w-full p-2 border border-slate-300 rounded-lg uppercase font-semibold"
                  >
                    <option value="SECRETARIA">SECRETARIA DFI</option>
                    <option value="JEFE">JEFE DE ÁREA</option>
                    <option value="ANALISTA">ANALISTA</option>
                    <option value="TECNICO_COBRANZA">TÉCNICO DE COBRANZA</option>
                    <option value="DIRECTORA">DIRECTORA FINANCIERA</option>
                    <option value="ADMIN">ADMINISTRADOR UNIVERSAL</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1 uppercase">
                  Disponibilidad Operativa
                </label>
                <select
                  value={userDisp}
                  onChange={(e) => setUserDisp(e.target.value)}
                  className="w-full p-2 border border-slate-300 rounded-lg uppercase font-semibold"
                >
                  <option value="DISPONIBLE">DISPONIBLE (Habilitado para Despacho)</option>
                  <option value="EN_COMISION">EN COMISIÓN DE SERVICIOS</option>
                  <option value="VACACIONES">VACACIONES (Pausado)</option>
                  <option value="INACTIVO">INACTIVO (Bloqueo de Login)</option>
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setModalUsuarioOpen(false)}
                  className="px-3.5 py-1.5 font-semibold uppercase text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-1.5 font-bold uppercase text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-2xs"
                >
                  {saving ? "Guardando..." : "Guardar Servidor"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
