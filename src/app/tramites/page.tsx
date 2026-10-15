"use client";

import React, { useEffect, useState, useCallback, useMemo } from "react";
import { TramiteCompletoDTO, UsuarioInstitucional } from "@/types";
import { formatCurrency, formatDate } from "@/lib/utils";
import { BadgeEstado } from "@/components/ui/BadgeEstado";
import { SemaforoSLA } from "@/components/ui/SemaforoSLA";
import { FileText, Search, ExternalLink, RefreshCw, Filter, Trash2 } from "lucide-react";

import { useRouter } from "next/navigation";

export default function TramitesCatalogoPage() {
  const router = useRouter();
  const [tramites, setTramites] = useState<TramiteCompletoDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filtroArea, setFiltroArea] = useState("TODAS");
  const [filtroCuantia, setFiltroCuantia] = useState("TODAS");
  const [currentUser, setCurrentUser] = useState<UsuarioInstitucional | null>(null);

  useEffect(() => {
    fetch("/api/auth/session")
      .then((r) => r.json())
      .then((d) => setCurrentUser(d.user || d.usuario || null))
      .catch((err) => console.error("Error loading session:", err));
  }, []);

  const fetchTramites = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/tramites?tipo=todos&search=${encodeURIComponent(search)}`);
      const data = await res.json();
      if (data.tramites) {
        setTramites(data.tramites);
      }
    } catch (error) {
      console.error("Error fetching tramites catalog:", error);
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => {
    fetchTramites();
  }, [fetchTramites]);

  const filteredTramites = tramites.filter((t) => {
    if (filtroArea !== "TODAS" && String(t.id_area_actual) !== filtroArea) {
      return false;
    }
    if (filtroCuantia === "ALTA" && !t.es_alta_cuantia) return false;
    if (filtroCuantia === "REGULAR" && t.es_alta_cuantia) return false;
    return true;
  });

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

        <button
          onClick={fetchTramites}
          disabled={loading}
          className="p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg border border-slate-200 transition-colors self-start sm:self-auto"
          title="Actualizar catálogo"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin text-blue-600" : ""}`} />
        </button>
      </div>

      {/* Filters Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1.5 text-xs text-slate-500 font-semibold uppercase">
            <Filter className="w-4 h-4 text-slate-400" />
            Filtros:
          </div>

          <select
            value={filtroArea}
            onChange={(e) => setFiltroArea(e.target.value)}
            className="text-xs bg-slate-50 border border-slate-300 rounded-lg p-2 focus:ring-2 focus:ring-blue-500 focus:outline-none uppercase font-medium"
          >
            <option value="TODAS">TODAS LAS ÁREAS</option>
            <option value="1">DIRECCIÓN FINANCIERA (DFI)</option>
            <option value="2">PRESUPUESTO</option>
            <option value="3">CONTABILIDAD</option>
            <option value="4">TESORERÍA / PAGOS</option>
            <option value="6">ARCHIVO</option>
          </select>

          <select
            value={filtroCuantia}
            onChange={(e) => setFiltroCuantia(e.target.value)}
            className="text-xs bg-slate-50 border border-slate-300 rounded-lg p-2 focus:ring-2 focus:ring-blue-500 focus:outline-none uppercase font-medium"
          >
            <option value="TODAS">TODAS LAS CUANTÍAS</option>
            <option value="ALTA">ALTA CUANTÍA (≥ $10K)</option>
            <option value="REGULAR">MENOR A $10.000</option>
          </select>
        </div>

        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="BUSCAR POR QUIPUX, BENEFICIARIO, RUC..."
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-xs uppercase font-medium"
          />
        </div>
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
                <th className="py-3 px-3 text-center w-28 min-w-[100px]">CIUDAD</th>
                <th className="py-3 px-4 text-center w-32 min-w-[120px]">MONTO TOTAL</th>
                <th className="py-3 px-3 text-center w-28 min-w-[100px]">SLA (6D)</th>
                <th className="py-3 px-4 text-center w-48 min-w-[160px]">ESTADO</th>
                <th className="py-3 px-3 text-center w-24 min-w-[90px]">DETALLE</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {filteredTramites.map((t) => (
                <tr
                  key={t.id_tramite}
                  onClick={() => router.push(`/tramite/${t.id_tramite}?readonly=true`)}
                  title="Haga clic para consultar el expediente institucional (modo solo lectura)"
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

                  <td className="py-3.5 px-3 align-middle text-center whitespace-nowrap">
                    <span className="px-2 py-0.5 text-[10px] font-bold rounded uppercase bg-slate-100 text-slate-700 border border-slate-200">
                      {t.ciudad || "GUAYAQUIL"}
                    </span>
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

                  <td className="py-3.5 px-3 align-middle text-center whitespace-nowrap">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        router.push(`/tramite/${t.id_tramite}?readonly=true`);
                      }}
                      className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg transition-colors shadow-2xs"
                    >
                      <ExternalLink className="w-3 h-3" />
                      Ver
                    </button>
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
