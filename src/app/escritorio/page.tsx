"use client";

import React, { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { TramiteCompletoDTO, UsuarioInstitucional } from "@/types";
import { formatCurrency, formatDate } from "@/lib/utils";
import { BadgeEstado } from "@/components/ui/BadgeEstado";
import { SemaforoSLA } from "@/components/ui/SemaforoSLA";
import {
  Inbox,
  Search,
  ExternalLink,
  Clock,
  RefreshCw,
  Filter,
  AlertCircle,
} from "lucide-react";

export default function EscritorioPage() {
  const router = useRouter();
  const [tramites, setTramites] = useState<TramiteCompletoDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"escritorio" | "observados" | "pausados" | "finalizados">(
    "escritorio"
  );
  const [search, setSearch] = useState("");
  const [currentUser, setCurrentUser] = useState<UsuarioInstitucional | null>(null);

  const fetchTramites = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/tramites?tipo=${activeTab}&search=${encodeURIComponent(search)}`);
      const data = await res.json();
      if (data.tramites) {
        setTramites(data.tramites);
      }
    } catch (error) {
      console.error("Error fetching tramites for escritorio:", error);
    } finally {
      setLoading(false);
    }
  }, [activeTab, search]);

  useEffect(() => {
    async function loadUser() {
      try {
        const res = await fetch("/api/auth/session");
        const data = await res.json();
        if (data.user) setCurrentUser(data.user);
      } catch (err) {
        console.error(err);
      }
    }
    loadUser();
  }, []);

  useEffect(() => {
    fetchTramites();
  }, [fetchTramites]);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <Inbox className="w-5 h-5 text-blue-600" />
            <h1 className="text-lg font-bold text-slate-900 tracking-tight">
              Mi Escritorio de Trabajo
            </h1>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Bandeja transaccional ordenada por última novedad. Los trámites devueltos o subsanados
            aparecen automáticamente en primer lugar.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchTramites}
            disabled={loading}
            className="p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg border border-slate-200 transition-colors"
            title="Actualizar bandeja"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin text-blue-600" : ""}`} />
          </button>
          <Link
            href="/recepcion"
            className="px-3.5 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors shadow-xs"
          >
            + Nuevo Trámite (DFI)
          </Link>
        </div>
      </div>

      {/* Tabs & Search */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex p-1 bg-slate-200/80 rounded-lg border border-slate-300 text-xs font-medium self-start">
          <button
            onClick={() => setActiveTab("escritorio")}
            className={`px-3.5 py-1.5 rounded-md transition-all ${
              activeTab === "escritorio"
                ? "bg-white text-slate-900 shadow-xs font-semibold"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            En Mi Gestión
          </button>
          <button
            onClick={() => setActiveTab("observados")}
            className={`px-3.5 py-1.5 rounded-md transition-all ${
              activeTab === "observados"
                ? "bg-white text-slate-900 shadow-xs font-semibold"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Observados (72h)
          </button>
          <button
            onClick={() => setActiveTab("pausados")}
            className={`px-3.5 py-1.5 rounded-md transition-all ${
              activeTab === "pausados"
                ? "bg-white text-slate-900 shadow-xs font-semibold"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Pausados SLA
          </button>
          <button
            onClick={() => setActiveTab("finalizados")}
            className={`px-3.5 py-1.5 rounded-md transition-all ${
              activeTab === "finalizados"
                ? "bg-white text-slate-900 shadow-xs font-semibold"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Archivados
          </button>
        </div>

        {/* Search */}
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por código, Quipux, RUC..."
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-xs"
          />
        </div>
      </div>

      {/* Table Container with NO horizontal scroll */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
        {loading ? (
          <div className="p-12 text-center text-xs text-slate-500 flex flex-col items-center gap-2">
            <RefreshCw className="w-5 h-5 animate-spin text-blue-600" />
            <span className="uppercase font-semibold">Cargando expedientes institucionales...</span>
          </div>
        ) : tramites.length === 0 ? (
          <div className="p-12 text-center text-xs text-slate-500 uppercase font-semibold">
            No hay trámites pendientes en esta pestaña de trabajo.
          </div>
        ) : (
          <table className="w-full table-fixed border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                <th className="py-3 px-3 text-center w-[14%]">CÓDIGO / QUIPUX</th>
                <th className="py-3 px-3 text-center w-[23%]">BENEFICIARIO / RUC</th>
                <th className="py-3 px-3 text-center w-[18%]">TIPO DE PROCESO</th>
                <th className="py-3 px-3 text-center w-[11%]">MONTO TOTAL</th>
                <th className="py-3 px-3 text-center w-[14%]">ÁREA ACTUAL</th>
                <th className="py-3 px-2 text-center w-[7%]">TIEMPO SLA</th>
                <th className="py-3 px-2 text-center w-[8%]">ESTADO</th>
                <th className="py-3 px-2 text-center w-[5%]">ACCIONES</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {tramites.map((t) => (
                <tr
                  key={t.id_tramite}
                  onClick={() => router.push(`/tramite/${t.id_tramite}`)}
                  className="hover:bg-blue-50/70 transition-colors cursor-pointer group"
                >
                  <td className="py-3 px-3 align-middle text-center">
                    <div className="font-mono font-bold text-slate-900 group-hover:text-blue-700 transition-colors">
                      {t.codigo_tramite}
                    </div>
                    <div className="text-[11px] font-mono text-blue-700 truncate" title={t.numero_quipux}>
                      {t.numero_quipux}
                    </div>
                  </td>

                  <td className="py-3 px-3 align-middle">
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

                  <td className="py-3 px-3 align-middle">
                    <div
                      className="text-slate-700 uppercase line-clamp-3 leading-snug text-[11px] font-medium"
                      title={t.tipos_tramite?.nombre || "CONTRATACIÓN"}
                    >
                      {t.tipos_tramite?.nombre || "CONTRATACIÓN"}
                    </div>
                  </td>

                  <td className="py-3 px-3 align-middle text-center">
                    <div className="font-mono font-bold text-slate-900 text-xs">
                      {formatCurrency(t.monto_total)}
                    </div>
                    {t.es_alta_cuantia && (
                      <span className="inline-block mt-0.5 px-1.5 py-0.2 text-[9px] font-bold uppercase bg-amber-100 text-amber-900 rounded border border-amber-300">
                        ≥ $10K
                      </span>
                    )}
                  </td>

                  <td className="py-3 px-3 align-middle text-center">
                    <div className="uppercase text-[11px] font-semibold text-slate-800 leading-tight">
                      {t.areas?.nombre || "ÁREA"}
                    </div>
                    <div className="text-[10px] text-slate-500 uppercase truncate mt-0.5" title={t.usuarios?.nombre_completo}>
                      {t.usuarios?.nombre_completo || ""}
                    </div>
                  </td>

                  <td className="py-3 px-2 align-middle text-center">
                    <SemaforoSLA sla={t.sla} />
                  </td>

                  <td className="py-3 px-2 align-middle text-center">
                    <BadgeEstado estado={t.estado_general} subEstado={t.sub_estado} />
                  </td>

                  <td className="py-3 px-2 align-middle text-center" onClick={(e) => e.stopPropagation()}>
                    <Link
                      href={`/tramite/${t.id_tramite}`}
                      className="inline-flex items-center justify-center px-2.5 py-1 text-[11px] font-bold uppercase text-white bg-slate-900 hover:bg-blue-700 rounded-md transition-colors shadow-2xs"
                    >
                      Revisar
                    </Link>
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
