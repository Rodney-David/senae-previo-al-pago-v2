"use client";

import React, { useEffect, useState } from "react";
import { formatDate } from "@/lib/utils";
import {
  ShieldCheck,
  Users,
  Calendar,
  Sliders,
  FileCode2,
  Plus,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Edit2,
  Trash2,
  Search,
  Eye,
  History,
  Lock,
  X,
} from "lucide-react";

export default function AdministracionPage() {
  const [activeTab, setActiveTab] = useState<
    "procesos" | "usuarios" | "feriados" | "campos" | "auditoria"
  >("procesos");

  // States
  const [usuarios, setUsuarios] = useState<any[]>([]);
  const [feriados, setFeriados] = useState<any[]>([]);
  const [campos, setCampos] = useState<any[]>([]);
  const [reglas, setReglas] = useState<any[]>([]);
  const [procesos, setProcesos] = useState<any[]>([]);
  const [auditoria, setAuditoria] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Modales
  const [modalUsuarioOpen, setModalUsuarioOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<any | null>(null);

  // Form User
  const [userNombre, setUserNombre] = useState("");
  const [userCorreo, setUserCorreo] = useState("");
  const [userCargo, setUserCargo] = useState("");
  const [userRol, setUserRol] = useState("ANALISTA");
  const [userArea, setUserArea] = useState("2");
  const [userDisp, setUserDisp] = useState("DISPONIBLE");

  // Form New Holiday
  const [newFeriadoFecha, setNewFeriadoFecha] = useState("");
  const [newFeriadoDesc, setNewFeriadoDesc] = useState("");
  const [newFeriadoTipo, setNewFeriadoTipo] = useState("NACIONAL");

  // Form New Dynamic Field
  const [newCampoClave, setNewCampoClave] = useState("");
  const [newCampoEtiqueta, setNewCampoEtiqueta] = useState("");
  const [newCampoTipo, setNewCampoTipo] = useState("TEXT");
  const [newCampoDept, setNewCampoDept] = useState("GLOBAL");

  // Form New Rule
  const [reglaCampoClave, setReglaCampoClave] = useState("item_presupuestario");
  const [reglaTipoGestion, setReglaTipoGestion] = useState("EXPEDIENTE");
  const [reglaEtapa, setReglaEtapa] = useState("PRESUPUESTO");
  const [reglaVisibilidad, setReglaVisibilidad] = useState("OCULTO");
  const [reglaObligatoriedad, setReglaObligatoriedad] = useState("OPCIONAL");

  // Filter Auditoria
  const [auditSearch, setAuditSearch] = useState("");

  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; text: string } | null>(
    null
  );

  const fetchData = async () => {
    setLoading(true);
    try {
      const [uRes, fRes, cRes, pRes, aRes] = await Promise.all([
        fetch("/api/admin/usuarios"),
        fetch("/api/admin/feriados"),
        fetch("/api/admin/campos"),
        fetch("/api/admin/procesos"),
        fetch("/api/admin/auditoria"),
      ]);
      const [uData, fData, cData, pData, aData] = await Promise.all([
        uRes.json(),
        fRes.json(),
        cRes.json(),
        pRes.json(),
        aRes.json(),
      ]);
      if (uData.usuarios) setUsuarios(uData.usuarios);
      if (fData.feriados) setFeriados(fData.feriados);
      if (cData.campos) setCampos(cData.campos);
      if (cData.reglas) setReglas(cData.reglas);
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
      if (!res.ok) throw new Error(data.error || "Error al guardar usuario");

      setFeedback({
        type: "success",
        text: editingUser ? "Funcionario modificado con éxito." : "Nuevo funcionario registrado con éxito.",
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

  // Modificar Feriado / Eliminar Feriado
  const handleDeleteFeriado = async (id_feriado: number) => {
    if (!confirm("¿Está seguro de eliminar este día del calendario de feriados?")) return;
    try {
      const res = await fetch(`/api/admin/feriados?id=${id_feriado}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Error al eliminar feriado");
      setFeedback({ type: "success", text: "Día no laborable eliminado correctamente." });
      fetchData();
    } catch (err: any) {
      setFeedback({ type: "error", text: err.message });
    }
  };

  // Guardar Feriado
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
      setFeedback({ type: "success", text: "Día no laborable agregado al cálculo de SLA." });
      fetchData();
    } catch (err: any) {
      setFeedback({ type: "error", text: err.message });
    } finally {
      setSaving(false);
    }
  };

  // Guardar Campo Dinámico
  const handleAddCampo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCampoClave.trim() || !newCampoEtiqueta.trim()) return;
    setSaving(true);
    setFeedback(null);
    try {
      const res = await fetch("/api/admin/campos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tipo_recurso: "CAMPO",
          clave: newCampoClave.trim(),
          etiqueta: newCampoEtiqueta.trim(),
          tipo_dato: newCampoTipo,
          departamento: newCampoDept,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Error al crear campo dinámico");
      setNewCampoClave("");
      setNewCampoEtiqueta("");
      setFeedback({ type: "success", text: "Campo dinámico configurado con éxito." });
      fetchData();
    } catch (err: any) {
      setFeedback({ type: "error", text: err.message });
    } finally {
      setSaving(false);
    }
  };

  // Guardar Regla de Flujo
  const handleAddRegla = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setFeedback(null);
    try {
      const res = await fetch("/api/admin/campos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tipo_recurso: "REGLA",
          clave_campo: reglaCampoClave,
          tipo_flujo: reglaTipoGestion,
          etapa_flujo: reglaEtapa,
          visibilidad: reglaVisibilidad,
          obligatoriedad: reglaObligatoriedad,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Error al registrar regla de campo");
      setFeedback({ type: "success", text: "Regla de flujo parametrizada correctamente." });
      fetchData();
    } catch (err: any) {
      setFeedback({ type: "error", text: err.message });
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteRegla = async (id_regla: number) => {
    try {
      await fetch(`/api/admin/campos?tipo=REGLA&id=${id_regla}`, { method: "DELETE" });
      setFeedback({ type: "success", text: "Regla eliminada correctamente." });
      fetchData();
    } catch (err: any) {
      setFeedback({ type: "error", text: err.message });
    }
  };

  // Actualizar Tipo de Proceso (CUR Devengado vs Contable)
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
        text: "Configuración del proceso normativo actualizada con éxito.",
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
      mov.comentarios?.toLowerCase().includes(term)
    );
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-blue-600" />
            <h1 className="text-base font-bold text-slate-900 uppercase tracking-wide">
              Panel de Administración y Parametrización del Sistema
            </h1>
          </div>
          <p className="text-xs text-slate-500 mt-1 uppercase">
            Gobierno integral de los 17 procesos normativos, reglas de llenado por gestión, usuarios, calendario SLA y auditoría forense.
          </p>
        </div>

        <button
          onClick={fetchData}
          disabled={loading}
          className="p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg border border-slate-200 transition-colors self-start sm:self-auto"
          title="Actualizar datos"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin text-blue-600" : ""}`} />
        </button>
      </div>

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

      {/* Tabs */}
      <div className="flex flex-wrap p-1 bg-slate-200/80 rounded-lg border border-slate-300 text-xs font-semibold uppercase self-start gap-1">
        <button
          onClick={() => setActiveTab("procesos")}
          className={`px-3.5 py-1.5 rounded-md transition-all flex items-center gap-1.5 ${
            activeTab === "procesos"
              ? "bg-white text-slate-900 shadow-xs font-bold"
              : "text-slate-600 hover:text-slate-900"
          }`}
        >
          <FileCode2 className="w-3.5 h-3.5" />
          1. Procesos y Reglas de CUR
        </button>
        <button
          onClick={() => setActiveTab("campos")}
          className={`px-3.5 py-1.5 rounded-md transition-all flex items-center gap-1.5 ${
            activeTab === "campos"
              ? "bg-white text-slate-900 shadow-xs font-bold"
              : "text-slate-600 hover:text-slate-900"
          }`}
        >
          <Sliders className="w-3.5 h-3.5" />
          2. Campos Dinámicos & Reglas de Flujo
        </button>
        <button
          onClick={() => setActiveTab("usuarios")}
          className={`px-3.5 py-1.5 rounded-md transition-all flex items-center gap-1.5 ${
            activeTab === "usuarios"
              ? "bg-white text-slate-900 shadow-xs font-bold"
              : "text-slate-600 hover:text-slate-900"
          }`}
        >
          <Users className="w-3.5 h-3.5" />
          3. Servidores y Disponibilidad
        </button>
        <button
          onClick={() => setActiveTab("feriados")}
          className={`px-3.5 py-1.5 rounded-md transition-all flex items-center gap-1.5 ${
            activeTab === "feriados"
              ? "bg-white text-slate-900 shadow-xs font-bold"
              : "text-slate-600 hover:text-slate-900"
          }`}
        >
          <Calendar className="w-3.5 h-3.5" />
          4. Calendario Feriados SLA
        </button>
        <button
          onClick={() => setActiveTab("auditoria")}
          className={`px-3.5 py-1.5 rounded-md transition-all flex items-center gap-1.5 ${
            activeTab === "auditoria"
              ? "bg-white text-slate-900 shadow-xs font-bold"
              : "text-slate-600 hover:text-slate-900"
          }`}
        >
          <History className="w-3.5 h-3.5" />
          5. Auditoría Forense
        </button>
      </div>

      {/* TAB 1: 17 PROCESOS Y REGLAS DE CUR */}
      {activeTab === "procesos" && (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs space-y-4">
          <div className="p-4 bg-slate-50 border-b border-slate-200 text-xs text-slate-700 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <strong>Catálogo de 17 Procesos Normativos SENAE:</strong> Configure si cada proceso
              exige <span className="font-semibold text-blue-900">CUR DEVENGADO</span> (adquisiciones/servicios),{" "}
              <span className="font-semibold text-purple-900">CUR CONTABLE</span> (fondos, viáticos, pólizas, cauciones) o{" "}
              <span className="font-semibold text-slate-900">AMBOS</span>, así como si aplica Ítem Presupuestario.
            </div>
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

      {/* TAB 2: CAMPOS DINÁMICOS & REGLAS DE FLUJO */}
      {activeTab === "campos" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Matriz de Reglas de Flujo por Tipo de Gestión */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
              <div className="px-5 py-3.5 bg-slate-900 text-white text-xs font-bold uppercase tracking-wider flex items-center justify-between">
                <span>Reglas de Obligatoriedad y Visibilidad por Tipo de Gestión</span>
              </div>
              <div className="p-4 bg-slate-50 border-b border-slate-200 text-xs text-slate-600">
                Parametrice qué campos aplican u ocultan según si la gestión es <strong>PAGO</strong> o <strong>EXPEDIENTE</strong>, y su obligatoriedad por fase del flujo.
              </div>

              <div className="overflow-x-auto">
                <table className="min-w-[700px] w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-bold text-slate-700 uppercase">
                      <th className="py-2.5 px-4">Campo Clave</th>
                      <th className="py-2.5 px-4">Tipo Gestión</th>
                      <th className="py-2.5 px-4">Fase / Etapa</th>
                      <th className="py-2.5 px-4">Visibilidad</th>
                      <th className="py-2.5 px-4">Obligatoriedad</th>
                      <th className="py-2.5 px-4 text-center">Acción</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {reglas.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-6 text-center text-slate-500 uppercase">
                          No se han configurado reglas específicas adicionales. Rigen los parámetros predeterminados.
                        </td>
                      </tr>
                    ) : (
                      reglas.map((r) => (
                        <tr key={r.id_regla} className="hover:bg-slate-50">
                          <td className="py-2.5 px-4 font-mono font-bold text-blue-900">{r.clave_campo}</td>
                          <td className="py-2.5 px-4 font-semibold uppercase text-slate-800">{r.tipo_flujo}</td>
                          <td className="py-2.5 px-4 uppercase text-slate-600">{r.etapa_flujo}</td>
                          <td className="py-2.5 px-4">
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                                r.visibilidad === "VISIBLE"
                                  ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                                  : "bg-slate-100 text-slate-600 border border-slate-300"
                              }`}
                            >
                              {r.visibilidad}
                            </span>
                          </td>
                          <td className="py-2.5 px-4">
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                                r.obligatoriedad === "OBLIGATORIO"
                                  ? "bg-rose-50 text-rose-800 border border-rose-200"
                                  : "bg-slate-100 text-slate-600"
                              }`}
                            >
                              {r.obligatoriedad}
                            </span>
                          </td>
                          <td className="py-2.5 px-4 text-center">
                            <button
                              onClick={() => handleDeleteRegla(r.id_regla)}
                              className="text-slate-400 hover:text-rose-600 p-1"
                              title="Eliminar regla"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Listado de Campos Personalizados */}
            <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
              <div className="px-5 py-3.5 bg-slate-900 text-white text-xs font-bold uppercase tracking-wider">
                Campos Globales Registrados en el Sistema
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-[650px] w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-bold text-slate-700 uppercase">
                      <th className="py-2.5 px-4">Clave</th>
                      <th className="py-2.5 px-4">Etiqueta</th>
                      <th className="py-2.5 px-4">Tipo Dato</th>
                      <th className="py-2.5 px-4">Departamento</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {campos.map((c) => (
                      <tr key={c.id_campo} className="hover:bg-slate-50">
                        <td className="py-2.5 px-4 font-mono font-bold text-blue-900">{c.clave}</td>
                        <td className="py-2.5 px-4 text-slate-800 font-semibold uppercase">{c.etiqueta}</td>
                        <td className="py-2.5 px-4 text-slate-600 uppercase">{c.tipo_dato}</td>
                        <td className="py-2.5 px-4 text-slate-600 uppercase">{c.departamento}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Formularios Laterales: Nueva Regla y Nuevo Campo */}
          <div className="space-y-6">
            {/* Formulario Nueva Regla */}
            <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-3 text-xs">
              <h3 className="font-bold uppercase text-slate-900 border-b border-slate-100 pb-2 flex items-center gap-1.5">
                <Sliders className="w-4 h-4 text-blue-600" />
                Agregar Regla de Flujo
              </h3>
              <form onSubmit={handleAddRegla} className="space-y-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1 uppercase">Campo Clave *</label>
                  <select
                    value={reglaCampoClave}
                    onChange={(e) => setReglaCampoClave(e.target.value)}
                    className="w-full p-2 border border-slate-300 rounded-lg uppercase font-mono font-semibold"
                  >
                    <option value="item_presupuestario">item_presupuestario</option>
                    <option value="certificacion_presupuestaria">certificacion_presupuestaria</option>
                    <option value="numero_factura">numero_factura</option>
                    <option value="numero_cur_devengado">numero_cur_devengado</option>
                    <option value="numero_cur_contable">numero_cur_contable</option>
                    <option value="numero_liquidacion">numero_liquidacion</option>
                    <option value="numero_juicio">numero_juicio</option>
                    {campos.map((c) => (
                      <option key={c.id_campo} value={c.clave}>
                        {c.clave}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1 uppercase">Tipo de Gestión *</label>
                  <select
                    value={reglaTipoGestion}
                    onChange={(e) => setReglaTipoGestion(e.target.value)}
                    className="w-full p-2 border border-slate-300 rounded-lg uppercase font-semibold"
                  >
                    <option value="EXPEDIENTE">EXPEDIENTE</option>
                    <option value="PAGO">PAGO</option>
                    <option value="TODOS">TODOS</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1 uppercase">Fase del Flujo *</label>
                  <select
                    value={reglaEtapa}
                    onChange={(e) => setReglaEtapa(e.target.value)}
                    className="w-full p-2 border border-slate-300 rounded-lg uppercase font-semibold"
                  >
                    <option value="RECEPCION">RECEPCIÓN (DFI)</option>
                    <option value="PRESUPUESTO">PRESUPUESTO</option>
                    <option value="CONTABILIDAD">CONTABILIDAD</option>
                    <option value="TESORERIA">TESORERÍA</option>
                    <option value="ARCHIVO">ARCHIVO</option>
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1 uppercase">Visibilidad</label>
                    <select
                      value={reglaVisibilidad}
                      onChange={(e) => setReglaVisibilidad(e.target.value)}
                      className="w-full p-2 border border-slate-300 rounded-lg uppercase font-semibold"
                    >
                      <option value="VISIBLE">VISIBLE</option>
                      <option value="OCULTO">OCULTO</option>
                    </select>
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1 uppercase">Obligación</label>
                    <select
                      value={reglaObligatoriedad}
                      onChange={(e) => setReglaObligatoriedad(e.target.value)}
                      className="w-full p-2 border border-slate-300 rounded-lg uppercase font-semibold"
                    >
                      <option value="OPCIONAL">OPCIONAL</option>
                      <option value="OBLIGATORIO">OBLIGATORIO</option>
                    </select>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={saving}
                  className="w-full py-2 bg-slate-900 hover:bg-blue-700 text-white font-bold uppercase rounded-lg transition-colors shadow-2xs"
                >
                  Guardar Regla de Flujo
                </button>
              </form>
            </div>

            {/* Formulario Nuevo Campo */}
            <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-3 text-xs">
              <h3 className="font-bold uppercase text-slate-900 border-b border-slate-100 pb-2 flex items-center gap-1.5">
                <Plus className="w-4 h-4 text-blue-600" />
                Nuevo Campo Personalizado
              </h3>
              <form onSubmit={handleAddCampo} className="space-y-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1 uppercase">Clave Única *</label>
                  <input
                    type="text"
                    value={newCampoClave}
                    onChange={(e) => setNewCampoClave(e.target.value)}
                    placeholder="ej. nro_resolucion_adjudicacion"
                    className="w-full p-2 border border-slate-300 rounded-lg font-mono uppercase"
                    required
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1 uppercase">Etiqueta Visible *</label>
                  <input
                    type="text"
                    value={newCampoEtiqueta}
                    onChange={(e) => setNewCampoEtiqueta(e.target.value)}
                    placeholder="ej. Nro. Resolución Adjudicación"
                    className="w-full p-2 border border-slate-300 rounded-lg uppercase font-medium"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1 uppercase">Tipo Dato</label>
                    <select
                      value={newCampoTipo}
                      onChange={(e) => setNewCampoTipo(e.target.value)}
                      className="w-full p-2 border border-slate-300 rounded-lg uppercase font-medium"
                    >
                      <option value="TEXT">TEXTO</option>
                      <option value="NUMBER">NÚMERO</option>
                      <option value="DATE">FECHA</option>
                    </select>
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1 uppercase">Área</label>
                    <select
                      value={newCampoDept}
                      onChange={(e) => setNewCampoDept(e.target.value)}
                      className="w-full p-2 border border-slate-300 rounded-lg uppercase font-medium"
                    >
                      <option value="GLOBAL">GLOBAL</option>
                      <option value="PRESUPUESTO">PRESUPUESTO</option>
                      <option value="CONTABILIDAD">CONTABILIDAD</option>
                    </select>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={saving}
                  className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold uppercase rounded-lg transition-colors shadow-xs"
                >
                  Registrar Campo
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: USUARIOS Y DISPONIBILIDAD */}
      {activeTab === "usuarios" && (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs space-y-4">
          <div className="p-4 bg-slate-50 border-b border-slate-200 text-xs text-slate-700 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <strong>Plantilla de Servidores Institucionales y Roles de Control Previo:</strong>{" "}
              Los servidores con estado <span className="font-semibold text-amber-800">VACACIONES</span> o{" "}
              <span className="font-semibold text-rose-800">INACTIVO</span> se excluyen del reparto automático por turno (Round-Robin).
            </div>
            <button
              onClick={handleOpenCreateUser}
              className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold uppercase rounded-lg transition-colors flex items-center gap-1.5 shadow-2xs self-start sm:self-auto"
            >
              <Plus className="w-3.5 h-3.5" /> Nuevo Servidor
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-[850px] w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/70 text-[11px] font-bold text-slate-700 uppercase">
                  <th className="py-2.5 px-4">Funcionario</th>
                  <th className="py-2.5 px-4">Correo Institucional</th>
                  <th className="py-2.5 px-4">Departamento</th>
                  <th className="py-2.5 px-4">Cargo / Rol</th>
                  <th className="py-2.5 px-4">Disponibilidad (Turno)</th>
                  <th className="py-2.5 px-4 text-center">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {usuarios.map((u) => (
                  <tr key={u.id_usuario} className="hover:bg-slate-50 transition-colors">
                    <td className="py-2.5 px-4 font-bold text-slate-900 uppercase">{u.nombre_completo}</td>
                    <td className="py-2.5 px-4 text-slate-600 font-mono text-[11px]">{u.correo_institucional}</td>
                    <td className="py-2.5 px-4 text-slate-800 uppercase font-semibold">{u.areas?.nombre || "SENAE"}</td>
                    <td className="py-2.5 px-4">
                      <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-800 border border-slate-200 uppercase">
                        {u.cargo} ({u.rol})
                      </span>
                    </td>
                    <td className="py-2.5 px-4">
                      <span
                        className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                          u.estado_disponibilidad === "DISPONIBLE"
                            ? "bg-emerald-50 text-emerald-800 border border-emerald-300"
                            : u.estado_disponibilidad === "VACACIONES"
                            ? "bg-amber-50 text-amber-800 border border-amber-300"
                            : "bg-rose-50 text-rose-800 border border-rose-300"
                        }`}
                      >
                        {u.estado_disponibilidad || "DISPONIBLE"}
                      </span>
                    </td>
                    <td className="py-2.5 px-4 text-center">
                      <button
                        onClick={() => handleOpenEditUser(u)}
                        className="px-2 py-1 text-slate-600 hover:text-blue-700 hover:bg-blue-50 rounded transition-colors"
                        title="Editar servidor"
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

      {/* TAB 4: FERIADOS OFICIALES SLA */}
      {activeTab === "feriados" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
            <div className="px-5 py-3.5 bg-slate-900 text-white text-xs font-bold uppercase tracking-wider">
              Calendario de Días No Laborables Registrados
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
                      <td className="py-2.5 px-4 font-semibold text-slate-800 uppercase">{f.descripcion}</td>
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

          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-4">
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
                <label className="block font-semibold text-slate-700 mb-1 uppercase">Descripción *</label>
                <input
                  type="text"
                  value={newFeriadoDesc}
                  onChange={(e) => setNewFeriadoDesc(e.target.value)}
                  placeholder="ej. Decreto Ejecutivo Nro. 142"
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
                className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold uppercase rounded-lg transition-colors shadow-xs"
              >
                {saving ? "Guardando..." : "Guardar Día No Laborable"}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* TAB 5: AUDITORÍA FORENSE */}
      {activeTab === "auditoria" && (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs space-y-4">
          <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2">
              <History className="w-4 h-4 text-blue-600" />
              <span className="font-bold text-slate-800 uppercase">
                Bitácora Inmutable de Eventos Institucionales
              </span>
            </div>

            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={auditSearch}
                onChange={(e) => setAuditSearch(e.target.value)}
                placeholder="BUSCAR POR CÓDIGO, QUIPUX, ACCIÓN..."
                className="w-full pl-9 pr-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg font-medium uppercase focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-[850px] w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-bold text-slate-700 uppercase">
                  <th className="py-2.5 px-4 w-36">Fecha / Hora</th>
                  <th className="py-2.5 px-4 w-36">Trámite / Quipux</th>
                  <th className="py-2.5 px-4 w-44">Acción Ejecutada</th>
                  <th className="py-2.5 px-4 w-48">Servidor Responsable</th>
                  <th className="py-2.5 px-4">Detalle / Comentarios</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredAuditoria.map((mov) => (
                  <tr key={mov.id_movimiento} className="hover:bg-slate-50">
                    <td className="py-2.5 px-4 font-mono text-[11px] text-slate-500">
                      {formatDate(mov.fecha_hora)}
                    </td>
                    <td className="py-2.5 px-4 font-mono font-bold text-blue-900">
                      {mov.tramites?.codigo_tramite}
                      <div className="text-[10px] text-slate-500 font-normal">
                        {mov.tramites?.numero_quipux}
                      </div>
                    </td>
                    <td className="py-2.5 px-4">
                      <span className="inline-block px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-slate-100 text-slate-800 border border-slate-200 uppercase">
                        {mov.tipo_accion}
                      </span>
                    </td>
                    <td className="py-2.5 px-4">
                      <div className="font-semibold text-slate-800 uppercase">
                        {mov.usuarios_historial_movimientos_id_usuario_entregaTousuarios?.nombre_completo || "SISTEMA"}
                      </div>
                      <div className="text-[10px] text-slate-500 uppercase">
                        {mov.areas_historial_movimientos_id_area_origenToareas?.nombre || "DFI"}
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

      {/* Modal Crear / Editar Usuario */}
      {modalUsuarioOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6 space-y-4 text-xs">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-slate-900 uppercase">
                {editingUser ? "Modificar Servidor Público" : "Registrar Nuevo Servidor"}
              </h3>
              <button onClick={() => setModalUsuarioOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveUsuario} className="space-y-3">
              <div>
                <label className="block font-semibold text-slate-700 mb-1 uppercase">Nombre Completo *</label>
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
                <label className="block font-semibold text-slate-700 mb-1 uppercase">Correo Institucional *</label>
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
                <label className="block font-semibold text-slate-700 mb-1 uppercase">Cargo Institucional *</label>
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
                  <label className="block font-semibold text-slate-700 mb-1 uppercase">Departamento</label>
                  <select
                    value={userArea}
                    onChange={(e) => setUserArea(e.target.value)}
                    className="w-full p-2 border border-slate-300 rounded-lg uppercase font-semibold"
                  >
                    <option value="1">DFI</option>
                    <option value="2">PRESUPUESTO</option>
                    <option value="3">CONTABILIDAD</option>
                    <option value="4">TESORERÍA</option>
                    <option value="5">COBRANZAS</option>
                    <option value="6">ARCHIVO</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1 uppercase">Rol del Sistema</label>
                  <select
                    value={userRol}
                    onChange={(e) => setUserRol(e.target.value)}
                    className="w-full p-2 border border-slate-300 rounded-lg uppercase font-semibold"
                  >
                    <option value="ANALISTA">ANALISTA</option>
                    <option value="JEFE">JEFE</option>
                    <option value="SECRETARIA">SECRETARIA</option>
                    <option value="DIRECTORA">DIRECTORA</option>
                    <option value="ADMIN">ADMIN</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1 uppercase">Disponibilidad Operativa</label>
                <select
                  value={userDisp}
                  onChange={(e) => setUserDisp(e.target.value)}
                  className="w-full p-2 border border-slate-300 rounded-lg uppercase font-semibold"
                >
                  <option value="DISPONIBLE">DISPONIBLE (Participa en Turno)</option>
                  <option value="VACACIONES">VACACIONES (Excluido de Turno)</option>
                  <option value="PERMISO">PERMISO (Excluido de Turno)</option>
                  <option value="INACTIVO">INACTIVO (Desactivado)</option>
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
                  className="px-4 py-1.5 font-bold uppercase text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-xs"
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
