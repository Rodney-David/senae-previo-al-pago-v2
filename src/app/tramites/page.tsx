"use client";

import React, { useEffect, useState, useCallback, useMemo } from "react";
import { TramiteCompletoDTO, UsuarioInstitucional } from "@/types";
import { formatCurrency, formatDate } from "@/lib/utils";
import { BadgeEstado, SemaforoSLA } from "@/components/ui";
import Link from "next/link";
import { FileText, Search, RefreshCw, Filter, Trash2, User, FilePlus2 } from "lucide-react";
import { useRouter } from "next/navigation";

export default function TramitesCatalogoPage() {
  const router = useRouter();
  const [tramites, setTramites] = useState<TramiteCompletoDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filtroArea, setFiltroArea] = useState("TODAS");
  const [filtroFuncionario, setFiltroFuncionario] = useState("TODOS");
  const [filtroEstado, setFiltroEstado] = useState("TODOS");
  const [usuariosList, setUsuariosList] = useState<{ id_usuario: number; nombre_completo: string; cargo?: string | null; iniciales?: string | null }[]>([]);
  const [currentUser, setCurrentUser] = useState<UsuarioInstitucional | null>(null);

  const isAdmin = currentUser?.rol === "ADMIN" || currentUser?.rol === "ADMINISTRADOR";

  useEffect(() => {
    fetch("/api/auth/session")
      .then((r) => r.json())
      .then((d) => setCurrentUser(d.user || d.usuario || null))
      .catch((err) => console.error("Error loading session:", err));

    fetch("/api/admin/usuarios")
      .then((r) => r.json())
      .then((d) => {
        if (d.usuarios) setUsuariosList(d.usuarios);
      })
      .catch((err) => console.error("Error loading usuarios:", err));
  }, []);

  const fetchTramites = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/tramites?tipo=todos");
      const data = await res.json();
      if (data.tramites) {
        setTramites(data.tramites);
      }
    } catch (error) {
      console.error("Error fetching tramites catalog:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTramites();
  }, [fetchTramites]);

  // Lista consolidada de funcionarios para el selector de filtro
  const funcionariosOpciones = useMemo(() => {
    const map = new Map<string, { id: string; nombre: string; cargo?: string; iniciales?: string }>();
    usuariosList.forEach((u) => {
      map.set(String(u.id_usuario), {
        id: String(u.id_usuario),
        nombre: u.nombre_completo,
        cargo: u.cargo || undefined,
        iniciales: u.iniciales || undefined,
      });
    });
    tramites.forEach((t) => {
      if (t.usuarios?.id_usuario && !map.has(String(t.usuarios.id_usuario))) {
        map.set(String(t.usuarios.id_usuario), {
          id: String(t.usuarios.id_usuario),
          nombre: t.usuarios.nombre_completo,
          cargo: t.usuarios.cargo || undefined,
          iniciales: t.usuarios.iniciales || undefined,
        });
      }
    });
    return Array.from(map.values()).sort((a, b) => a.nombre.localeCompare(b.nombre));
  }, [usuariosList, tramites]);

  const ESTADOS_LISTA = [
    { value: "TODOS", label: "TODOS LOS ESTADOS" },
    { value: "INGRESADO", label: "INGRESADO" },
    { value: "REVISION", label: "REVISION" },
    { value: "REVISADO", label: "REVISADO" },
    { value: "FACTURA", label: "FACTURA" },
    { value: "CONTABILIDAD", label: "CONTABILIDAD" },
    { value: "DFI", label: "DFI" },
    { value: "PAGADO", label: "PAGADO" },
    { value: "ARCHIVO", label: "ARCHIVO" },
    { value: "OBSERVADO", label: "OBSERVADO" },
    { value: "INSUBSISTENTE", label: "INSUBSISTENTE" },
    { value: "DEVUELTO", label: "DEVUELTO" },
    { value: "ANULADO", label: "ANULADO" },
  ];

  // Búsqueda global (NÚMERO DE QUIPUX, GESTIÓN, BENEFICIARIO, TIPO DE PROCESO, FUNCIONARIO, ESTADO) y Filtros
  const filteredTramites = useMemo(() => {
    const q = search.trim().toLowerCase();

    return tramites.filter((t) => {
      // 1. Filtro por Área
      if (filtroArea !== "TODAS" && String(t.id_area_actual) !== filtroArea) {
        return false;
      }

      // 2. Filtro por Funcionario (Custodio Actual)
      if (filtroFuncionario !== "TODOS") {
        const idCustodio = String(t.id_custodio_actual);
        if (idCustodio !== filtroFuncionario) {
          return false;
        }
      }

      // 3. Filtro por Estado General
      if (filtroEstado !== "TODOS") {
        const estadoG = (t.estado_general || "").toUpperCase();
        if (estadoG !== filtroEstado.toUpperCase()) {
          if (filtroEstado === "OBSERVADO" && (estadoG === "OBSERVADO" || estadoG === "OBSERVADO_72H")) {
            // match
          } else if (filtroEstado === "ARCHIVO" && (estadoG === "ARCHIVO" || estadoG === "FINALIZADO_ARCHIVADO")) {
            // match
          } else {
            return false;
          }
        }
      }

      // 4. Búsqueda Global: NÚMERO DE QUIPUX, GESTION, BENEFICIARIO, TIPO DE PROCESO, FUNCIONARIO, ESTADO
      if (q) {
        const quipux = (t.numero_quipux || "").toLowerCase();
        const codigo = (t.codigo_tramite || "").toLowerCase();
        const gestion = `${t.padre_gestion || ""} ${t.tipo_gestion || ""} ${t.tipo_flujo || ""}`.toLowerCase();
        const beneficiario = `${t.proveedor_beneficiario || ""} ${t.ruc_proveedor || ""}`.toLowerCase();
        const tipoProceso = `${t.tipos_tramite?.nombre || ""} ${t.nro_tramite || ""}`.toLowerCase();
        const funcionario = `${t.usuarios?.nombre_completo || ""} ${t.usuarios?.cargo || ""} ${t.usuarios?.iniciales || ""}`.toLowerCase();
        const estado = `${t.estado_general || ""} ${t.sub_estado || ""}`.toLowerCase();
        const factura = (t.numero_factura || "").toLowerCase();

        const match =
          quipux.includes(q) ||
          codigo.includes(q) ||
          gestion.includes(q) ||
          beneficiario.includes(q) ||
          tipoProceso.includes(q) ||
          funcionario.includes(q) ||
          estado.includes(q) ||
          factura.includes(q);

        if (!match) return false;
      }

      return true;
    });
  }, [tramites, filtroArea, filtroFuncionario, filtroEstado, search]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-blue-600" />
            <h1 className="text-base font-bold text-slate-900 uppercase tracking-wide">
              Catálogo General de Trámites y Expedientes
            </h1>
          </div>
          <p className="text-xs text-slate-500 mt-1 uppercase">
            Consulta consolidada de todos los trámites institucionales del SENAE con búsqueda y trazabilidad. Haga clic en cualquier registro para abrir el expediente.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          {isAdmin && (
            <Link
              href="/recepcion"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-2xs transition-colors"
              title="Radicar un nuevo trámite institucional directamente"
            >
              <FilePlus2 className="w-4 h-4" />
              Nuevo Trámite
            </Link>
          )}

          <button
            onClick={fetchTramites}
            disabled={loading}
            className="p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg border border-slate-200 transition-colors"
            title="Actualizar catálogo"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin text-blue-600" : ""}`} />
          </button>
        </div>
      </div>

      {/* Filters Bar: AREAS, FUNCIONARIOS, ESTADOS y Búsqueda Global */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col xl:flex-row xl:items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="flex items-center gap-1.5 text-xs text-slate-500 font-bold uppercase tracking-wider">
            <Filter className="w-4 h-4 text-slate-400" />
            Filtros:
          </div>

          {/* 1. ÁREAS */}
          <select
            value={filtroArea}
            onChange={(e) => setFiltroArea(e.target.value)}
            className="text-xs bg-slate-50 hover:bg-slate-100 border border-slate-300 rounded-lg py-2 px-3 focus:ring-2 focus:ring-blue-500 focus:outline-none uppercase font-semibold text-slate-700 cursor-pointer transition-colors"
            title="Filtrar por Área Institucional"
          >
            <option value="TODAS">TODAS LAS ÁREAS</option>
            <option value="1">DIRECCIÓN FINANCIERA (DFI)</option>
            <option value="2">PRESUPUESTO</option>
            <option value="3">CONTABILIDAD</option>
            <option value="4">TESORERÍA / PAGOS</option>
            <option value="5">COBRANZAS</option>
            <option value="6">ARCHIVO</option>
          </select>

          {/* 2. FUNCIONARIOS */}
          <select
            value={filtroFuncionario}
            onChange={(e) => setFiltroFuncionario(e.target.value)}
            className="text-xs bg-slate-50 hover:bg-slate-100 border border-slate-300 rounded-lg py-2 px-3 focus:ring-2 focus:ring-blue-500 focus:outline-none uppercase font-semibold text-slate-700 cursor-pointer transition-colors max-w-[240px] truncate"
            title="Filtrar por Funcionario Custodio"
          >
            <option value="TODOS">TODOS LOS FUNCIONARIOS</option>
            {funcionariosOpciones.map((f) => (
              <option key={f.id} value={f.id}>
                {f.nombre} {f.iniciales ? `(${f.iniciales})` : ""}
              </option>
            ))}
          </select>

          {/* 3. ESTADOS */}
          <select
            value={filtroEstado}
            onChange={(e) => setFiltroEstado(e.target.value)}
            className="text-xs bg-slate-50 hover:bg-slate-100 border border-slate-300 rounded-lg py-2 px-3 focus:ring-2 focus:ring-blue-500 focus:outline-none uppercase font-semibold text-slate-700 cursor-pointer transition-colors"
            title="Filtrar por Estado General del Trámite"
          >
            {ESTADOS_LISTA.map((est) => (
              <option key={est.value} value={est.value}>
                {est.label}
              </option>
            ))}
          </select>

          {/* Botón para restablecer filtros si hay alguno activo */}
          {(filtroArea !== "TODAS" || filtroFuncionario !== "TODOS" || filtroEstado !== "TODOS" || search.trim() !== "") && (
            <button
              onClick={() => {
                setFiltroArea("TODAS");
                setFiltroFuncionario("TODOS");
                setFiltroEstado("TODOS");
                setSearch("");
              }}
              className="px-2.5 py-1.5 text-[11px] font-bold text-slate-500 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors uppercase tracking-wider"
              title="Restablecer todos los filtros"
            >
              Limpiar
            </button>
          )}
        </div>

        {/* Búsqueda Global */}
        <div className="relative w-full xl:w-96">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="BUSCAR QUIPUX, GESTIÓN, BENEFICIARIO, PROCESO, FUNCIONARIO, ESTADO..."
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-xs uppercase font-medium placeholder:text-slate-400"
          />
        </div>
      </div>

      {/* Contador de resultados */}
      <div className="flex items-center justify-between text-xs text-slate-500 px-1">
        <span className="font-medium uppercase tracking-wider text-[11px]">
          Mostrando <strong className="text-slate-900 font-bold">{filteredTramites.length}</strong> de <strong className="text-slate-900 font-bold">{tramites.length}</strong> trámites institucionales
        </span>
      </div>

      {/* Responsive Table Container with Horizontal Scroll */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-x-auto shadow-xs">
        {loading ? (
          <div className="p-12 text-center text-xs text-slate-500 flex flex-col items-center gap-2">
            <RefreshCw className="w-5 h-5 animate-spin text-blue-600" />
            <span className="uppercase font-semibold">Consultando registros...</span>
          </div>
        ) : filteredTramites.length === 0 ? (
          <div className="p-12 text-center text-xs text-slate-500 uppercase font-semibold">
            No se encontraron trámites que coincidan con los filtros de búsqueda.
          </div>
        ) : (
          <table className="min-w-[1000px] w-full border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                <th className="py-3 px-4 text-center w-48 min-w-[160px]">NÚMERO QUIPUX</th>
                <th className="py-3 px-4 text-left whitespace-nowrap">GESTIÓN</th>
                <th className="py-3 px-4 text-left w-64 min-w-[210px]">BENEFICIARIO / RUC</th>
                <th className="py-3 px-4 text-left w-56 min-w-[190px]">TIPO DE PROCESO</th>
                <th className="py-3 px-4 text-left w-52 min-w-[160px]">FUNCIONARIO</th>
                <th className="py-3 px-4 text-center w-32 min-w-[120px]">MONTO TOTAL</th>
                <th className="py-3 px-3 text-center w-28 min-w-[100px]">SLA (6D)</th>
                <th className="py-3 px-4 text-center w-48 min-w-[160px]">ESTADO</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {filteredTramites.map((t) => (
                <tr
                  key={t.id_tramite}
                  onClick={() => router.push(isAdmin ? `/tramite/${t.id_tramite}` : `/tramite/${t.id_tramite}?readonly=true`)}
                  onDoubleClick={() => router.push(isAdmin ? `/tramite/${t.id_tramite}` : `/tramite/${t.id_tramite}?readonly=true`)}
                  title={isAdmin ? "Doble clic para gestionar o supervisar el expediente (Superusuario)" : "Doble clic para consultar el expediente institucional"}
                  className="hover:bg-blue-50/70 transition-colors cursor-pointer select-none group"
                >
                  <td className="py-3.5 px-4 align-middle text-center whitespace-nowrap">
                    <div className="font-mono font-bold text-blue-700 group-hover:text-blue-900 transition-colors text-xs" title={t.numero_quipux}>
                      {t.numero_quipux}
                    </div>
                  </td>

                  {/* Gestión */}
                  <td className="py-3.5 px-4 align-middle whitespace-nowrap">
                    <div className="flex flex-col gap-0.5">
                      <span className="text-[10px] uppercase font-bold text-slate-500">
                        {t.padre_gestion || t.tipo_flujo || "PAGO"}
                      </span>
                      <span className="font-semibold text-slate-800 text-[11px] truncate">
                        {t.tipo_gestion || "PAGO"}
                      </span>
                    </div>
                  </td>

                  <td className="py-3.5 px-4 align-middle">
                    <div
                      className="font-semibold text-slate-800 uppercase line-clamp-2 leading-tight"
                      title={t.proveedor_beneficiario}
                    >
                      {t.proveedor_beneficiario}
                    </div>
                    <div className="text-[11px] font-mono text-slate-500 mt-0.5">
                      RUC: {t.ruc_proveedor || "SIN RUC"}
                    </div>
                  </td>

                  <td className="py-3.5 px-4 align-middle">
                    <div
                      className="text-slate-800 uppercase line-clamp-2 leading-snug text-[11px] font-semibold"
                      title={t.tipos_tramite?.nombre || "CONTRATACIÓN"}
                    >
                      {t.tipos_tramite?.nombre || "CONTRATACIÓN"}
                    </div>
                  </td>

                  {/* Funcionario (Custodio Actual del Trámite) */}
                  <td className="py-3.5 px-4 align-middle whitespace-nowrap">
                    <div
                      className="font-bold text-slate-800 text-[11px] truncate uppercase flex items-center gap-1.5"
                      title={t.usuarios?.nombre_completo || "Sin Asignar"}
                    >
                      <User className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                      <span className="truncate">{t.usuarios?.nombre_completo || "Sin Asignar"}</span>
                    </div>
                    {t.usuarios?.cargo && (
                      <div className="text-[10px] text-slate-400 font-medium truncate uppercase pl-5">
                        {t.usuarios.cargo}
                      </div>
                    )}
                  </td>

                  <td className="py-3.5 px-4 align-middle text-center whitespace-nowrap">
                    <div className="font-mono font-bold text-slate-900 text-xs">
                      {formatCurrency(t.monto_total)}
                    </div>
                  </td>

                  <td className="py-3.5 px-3 align-middle text-center whitespace-nowrap">
                    <SemaforoSLA sla={t.sla} />
                  </td>

                  <td className="py-3.5 px-4 align-middle text-center whitespace-nowrap">
                    <BadgeEstado estado={t.estado_general} subEstado={t.sub_estado} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
