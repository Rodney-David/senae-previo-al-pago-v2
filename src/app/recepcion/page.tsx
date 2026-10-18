"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { formatCurrency } from "@/lib/utils";
import { FilePlus2, DollarSign, AlertCircle, FileText, ShieldCheck } from "lucide-react";
import { SearchableSelect } from "@/components/ui";

const GESTIONES_PADRE = [
  { codigo: "PAGO", nombre: "TIPO PAGO", descripcion: "Trámites con afectación presupuestaria o expedientes de pago" },
  { codigo: "GARANTIA", nombre: "TIPO GARANTIA", descripcion: "Garantías aduaneras, cauciones, juicios y devoluciones" },
];

export default function RecepcionPage() {
  const router = useRouter();
  const [tiposProceso, setTiposProceso] = useState<any[]>([]);
  const [loadingTipos, setLoadingTipos] = useState(true);
  const [areas, setAreas] = useState<any[]>([]);
  const [loadingAreas, setLoadingAreas] = useState(true);

  // Form State: Jerarquía Padre - Hijo
  const [padreGestion, setPadreGestion] = useState<"PAGO" | "GARANTIA">("PAGO");
  const [tipoGestion, setTipoGestion] = useState<string>("PAGO");
  const [catalogoGestiones, setCatalogoGestiones] = useState<any[]>([]);

  // Datos del Documento
  const [areaRequirente, setAreaRequirente] = useState("");
  const [ciudad, setCiudad] = useState("GUAYAQUIL");
  const [asunto, setAsunto] = useState("");
  const [numeroQuipux, setNumeroQuipux] = useState("");
  const [fechaMemorando, setFechaMemorando] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [fechaRecepcion, setFechaRecepcion] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [idTipoTramite, setIdTipoTramite] = useState<string>("");

  // Datos Económicos y Garantías
  const [proveedor, setProveedor] = useState("");
  const [ruc, setRuc] = useState("");
  const [subtotal, setSubtotal] = useState<string>("0");
  const [numeroJuicio, setNumeroJuicio] = useState("");
  const [numeroLiquidacion, setNumeroLiquidacion] = useState("");
  const [comentarios, setComentarios] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [authChecking, setAuthChecking] = useState(true);

  const CIUDADES_SENAE = [
    "GUAYAQUIL",
    "QUITO",
    "CUENCA",
    "ESMERALDAS",
    "MANTA",
    "TULCÁN",
    "HUAQUILLAS",
    "LOJA",
    "PUERTO BOLÍVAR",
    "LATACUNGA",
    "SALINAS",
    "SAN CRISTÓBAL (GALÁPAGOS)",
    "SANTA ROSA",
  ];

  // Protección de acceso: solo DFI (Directora, Secretaria) y ADMIN
  useEffect(() => {
    async function checkAuth() {
      try {
        const res = await fetch("/api/auth/session");
        const data = await res.json();
        const user = data.user || data.usuario;
        if (!user) {
          try {
            localStorage.removeItem("senae_user_session");
          } catch (e) {}
          window.location.href = "/login";
          return;
        }
        const userRole = (user.rol || "").toUpperCase();
        const isDFIOrAdmin =
          user.id_area === 1 ||
          ["DIRECTORA", "SECRETARIA", "DIRECTORA_FINANCIERA", "SECRETARIA_DFI"].includes(userRole) ||
          ["ADMIN", "ADMINISTRADOR"].includes(userRole);

        if (!isDFIOrAdmin) {
          router.replace("/escritorio");
          return;
        }
        setAuthChecking(false);
      } catch (err) {
        console.error("Error verificando permisos:", err);
        router.replace("/escritorio");
      }
    }
    checkAuth();
  }, [router]);

  // Cargar catálogos
  useEffect(() => {
    async function loadCatalogos() {
      try {
        const [resP, resA, resG] = await Promise.all([
          fetch("/api/admin/procesos"),
          fetch("/api/admin/catalogos?tipo=areas"),
          fetch("/api/admin/catalogos?tipo=gestion"),
        ]);
        const [dataP, dataA, dataG] = await Promise.all([resP.json(), resA.json(), resG.json()]);
        if (dataP.tipos) {
          setTiposProceso(dataP.tipos);
          if (dataP.tipos.length > 0) {
            setIdTipoTramite(String(dataP.tipos[0].id_tipo_tramite));
          }
        }
        if (dataA.items) {
          setAreas(dataA.items);
        }
        if (dataG.items) {
          setCatalogoGestiones(dataG.items.filter((item: any) => item.activo !== false));
        }
      } catch (err) {
        console.error("Error cargando catálogos:", err);
      } finally {
        setLoadingTipos(false);
        setLoadingAreas(false);
      }
    }
    loadCatalogos();
  }, []);

  // Opciones de subtipos dependientes del padre seleccionado
  const subtiposDisponibles = useMemo(() => {
    if (catalogoGestiones.length > 0) {
      return catalogoGestiones.filter((g) => (g.padre || "PAGO").toUpperCase() === padreGestion);
    }
    // Fallback estándar oficial si no ha cargado la base
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

  // Sincronizar selección de subtipo cuando cambia el padre
  useEffect(() => {
    if (subtiposDisponibles.length > 0) {
      setTipoGestion(subtiposDisponibles[0].nombre || subtiposDisponibles[0].codigo);
    }
  }, [padreGestion, subtiposDisponibles]);

  // Reglas de negocio: Condicionamiento de obligatoriedad
  const esPagoPrincipal = padreGestion === "PAGO" && (tipoGestion === "PAGO" || tipoGestion === "PAGO_PAGO");
  const sub = parseFloat(subtotal) || 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validaciones base
    if (!numeroQuipux.trim() || !idTipoTramite || !areaRequirente.trim() || !ciudad.trim() || !asunto.trim()) {
      setError("Por favor complete los campos obligatorios del ingreso (Quipux, Fechas, Área, Ciudad, Proceso y Asunto).");
      return;
    }

    // Validación condicional para TIPO PAGO - PAGO (RUC ya no es obligatorio)
    if (esPagoPrincipal) {
      if (!proveedor.trim() || sub <= 0) {
        setError("Para el tipo PAGO es OBLIGATORIO ingresar Razón Social / Proveedor y un Subtotal mayor a 0.");
        return;
      }
    }

    setLoading(true);

    try {
      const res = await fetch("/api/tramites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          padre_gestion: padreGestion,
          tipo_gestion: tipoGestion,
          numero_quipux: numeroQuipux.trim(),
          area_requirente: areaRequirente.trim(),
          ciudad: ciudad.trim(),
          asunto: asunto.trim(),
          fecha_memorando: fechaMemorando,
          fecha_recepcion_fisica: fechaRecepcion,
          id_tipo_tramite: parseInt(idTipoTramite, 10),
          proveedor_beneficiario: proveedor.trim() || "N/A",
          ruc_proveedor: ruc.trim() || null,
          numero_juicio: padreGestion === "GARANTIA" ? numeroJuicio.trim() || null : null,
          numero_liquidacion: padreGestion === "GARANTIA" ? numeroLiquidacion.trim() || null : null,
          subtotal: sub,
          comentarios: comentarios.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Error al registrar trámite");

      // Redirigir a Mi Escritorio donde queda en estado INGRESADO
      router.push("/escritorio");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (authChecking) {
    return (
      <div className="p-16 text-center text-xs text-slate-500 flex flex-col items-center justify-center gap-3 min-h-[400px]">
        <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
        <span className="uppercase font-semibold tracking-wider text-slate-600">
          Verificando autorizaciones de Recepción DFI...
        </span>
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
            Registro inicial de expedientes físicos por Secretaría. El trámite se registra en estado{" "}
            <span className="font-semibold text-blue-700">INGRESADO</span> en su bandeja personal sin autoasignación.
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {error && (
          <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-lg font-medium flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
            <span>{error}</span>
          </div>
        )}

        {/* Bloque 1: Clasificación Jerárquica (Padre - Hijo) */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-blue-600" />
              1. Clasificación de la Gestión
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Gestión <span className="text-rose-500">*</span>
              </label>
              <select
                value={padreGestion}
                onChange={(e) => setPadreGestion(e.target.value as "PAGO" | "GARANTIA")}
                className="w-full text-xs bg-slate-50 border border-slate-300 rounded-lg p-2.5 font-bold text-slate-900 focus:ring-2 focus:ring-blue-500 focus:outline-none"
              >
                {GESTIONES_PADRE.map((gp) => (
                  <option key={gp.codigo} value={gp.codigo}>
                    {gp.nombre}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Tipo de Gestión <span className="text-rose-500">*</span>
              </label>
              <select
                value={tipoGestion}
                onChange={(e) => setTipoGestion(e.target.value)}
                className="w-full text-xs bg-white border border-slate-300 rounded-lg p-2.5 font-semibold text-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-none"
              >
                {subtiposDisponibles.map((st) => (
                  <option key={st.codigo || st.nombre} value={st.nombre || st.codigo}>
                    {st.nombre || st.codigo}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Bloque 2: Radicación Quipux y Datos del Documento */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-2">
              <FileText className="w-4 h-4 text-blue-600" />
              2. Datos del Documento y Radicación Quipux
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
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
                Área Requirente / Solicitante *
              </label>
              <SearchableSelect
                options={areas.map((a) => ({
                  value: a.nombre,
                  label: a.nombre,
                  sublabel: a.codigo ? `Código: ${a.codigo}` : undefined,
                }))}
                value={areaRequirente}
                onChange={setAreaRequirente}
                placeholder="Seleccione o busque el área..."
                searchPlaceholder="Escriba para filtrar áreas..."
                disabled={loadingAreas}
                required
              />
            </div>

            <div className="sm:col-span-1">
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Ciudad / Jurisdicción *
              </label>
              <input
                list="ciudades-senae-list"
                type="text"
                value={ciudad}
                onChange={(e) => setCiudad(e.target.value.toUpperCase())}
                placeholder="ej. GUAYAQUIL"
                className="w-full text-xs bg-white border border-slate-300 rounded-lg p-2.5 font-semibold text-slate-800 uppercase focus:ring-2 focus:ring-blue-500 focus:outline-none"
                required
              />
              <datalist id="ciudades-senae-list">
                {CIUDADES_SENAE.map((c) => (
                  <option key={c} value={c} />
                ))}
              </datalist>
            </div>

            <div className="sm:col-span-3">
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Tipo de Proceso Normativo (SENAE) *
              </label>
              <SearchableSelect
                options={tiposProceso.map((t) => ({
                  value: String(t.id_tipo_tramite),
                  label: t.nombre,
                  sublabel: t.descripcion || undefined,
                }))}
                value={idTipoTramite}
                onChange={setIdTipoTramite}
                placeholder="Seleccione o busque el proceso normativo..."
                searchPlaceholder="Buscar proceso..."
                disabled={loadingTipos}
                required
              />
            </div>

            <div className="sm:col-span-3">
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-semibold text-slate-700">
                  Asunto del Trámite *
                </label>
                <span className="text-[10px] text-slate-400">Cuadro de texto auto-expandible</span>
              </div>
              <textarea
                value={asunto}
                onChange={(e) => setAsunto(e.target.value)}
                onInput={(e) => {
                  const target = e.currentTarget;
                  target.style.height = "auto";
                  target.style.height = `${Math.max(68, target.scrollHeight)}px`;
                }}
                placeholder="Describa el objeto, motivo o requerimiento del trámite..."
                rows={2}
                className="w-full text-xs bg-white border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all resize-none min-h-[68px]"
                required
              />
            </div>
          </div>
        </div>

        {/* Bloque 3: Datos del Beneficiario y Subtotal */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-4">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-2">
            <DollarSign className="w-4 h-4 text-emerald-600" />
            3. Beneficiario y Valor Económico
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Razón Social / Proveedor Beneficiario {esPagoPrincipal && <span className="text-rose-500">*</span>}
              </label>
              <input
                type="text"
                value={proveedor}
                onChange={(e) => setProveedor(e.target.value)}
                placeholder="Nombre de la empresa o contratista..."
                className="w-full text-xs bg-white border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                required={esPagoPrincipal}
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                RUC del Proveedor
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
                Subtotal {esPagoPrincipal && <span className="text-rose-500">*</span>}
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={subtotal}
                onChange={(e) => setSubtotal(e.target.value)}
                className="w-full text-xs bg-white border border-slate-300 rounded-lg p-2.5 font-mono font-bold focus:ring-2 focus:ring-blue-500 focus:outline-none"
                required={esPagoPrincipal}
              />
            </div>
          </div>

          {/* Campos exclusivos para tipo GARANTÍA */}
          {padreGestion === "GARANTIA" && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-3 border-t border-slate-100">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Nro. Juicio
                </label>
                <input
                  type="text"
                  value={numeroJuicio}
                  onChange={(e) => setNumeroJuicio(e.target.value.toUpperCase())}
                  placeholder="ej. JUIC-2026-0042"
                  className="w-full text-xs bg-white border border-slate-300 rounded-lg p-2.5 font-mono focus:ring-2 focus:ring-blue-500 focus:outline-none uppercase"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Nro. Liquidación
                </label>
                <input
                  type="text"
                  value={numeroLiquidacion}
                  onChange={(e) => setNumeroLiquidacion(e.target.value.toUpperCase())}
                  placeholder="ej. LIQ-2026-0189"
                  className="w-full text-xs bg-white border border-slate-300 rounded-lg p-2.5 font-mono focus:ring-2 focus:ring-blue-500 focus:outline-none uppercase"
                />
              </div>
            </div>
          )}
        </div>

        {/* Botones de Acción */}
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
            className="px-6 py-2.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors shadow-xs flex items-center gap-2"
          >
            {loading ? "Registrando Trámite..." : "Registrar Trámite en Mi Escritorio"}
          </button>
        </div>
      </form>
    </div>
  );
}
