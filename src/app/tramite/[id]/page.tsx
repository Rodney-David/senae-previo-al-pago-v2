"use client";

import React, { useEffect, useState, useCallback, useMemo } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { TramiteCompletoDTO, UsuarioInstitucional } from "@/types";
import { BadgeEstado, SemaforoSLA } from "@/components/ui";
import {
  BarraAcciones,
  TarjetaDatosGenerales,
  TarjetaPresupuesto,
  TarjetaContabilidad,
  TarjetaTesoreria,
  TarjetaArchivo,
  TimelineBitacora,
} from "@/components/tramites";
import { TablaReferencias } from "@/components/referencias";
import { ArrowLeft, RefreshCw, FileText, AlertTriangle, Eye, Building2, UserCheck } from "lucide-react";

export default function TramiteDetallePage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const id = params?.id as string;
  const isReadOnlyParam = searchParams.get("readonly") === "true";

  const [tramite, setTramite] = useState<TramiteCompletoDTO | null>(null);
  const [currentUser, setCurrentUser] = useState<UsuarioInstitucional | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTramite = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const [tramiteRes, sessionRes] = await Promise.all([
        fetch(`/api/tramites/${id}`),
        fetch("/api/auth/session"),
      ]);

      const tramiteData = await tramiteRes.json();
      const sessionData = await sessionRes.json();

      if (!tramiteRes.ok) {
        throw new Error(tramiteData.error || "Error al cargar expediente");
      }

      setTramite(tramiteData.tramite);
      if (sessionData.user) setCurrentUser(sessionData.user);
    } catch (err: any) {
      console.error(err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchTramite();
  }, [fetchTramite]);

  // Determinar si el usuario actual es custodio o si está en modo solo lectura
  const isCustodio = useMemo(() => {
    if (!currentUser || !tramite) return false;
    if (currentUser.rol === "ADMIN") return true;
    return tramite.id_custodio_actual === currentUser.id_usuario;
  }, [currentUser, tramite]);

  const isReadOnly = isReadOnlyParam || (!isCustodio && currentUser?.rol !== "ADMIN");

  const custodioNombre =
    tramite?.usuarios?.nombre_completo ||
    tramite?.custodio_actual?.nombre_completo ||
    "Sin asignar";
  const custodioCargo =
    tramite?.usuarios?.cargo ||
    tramite?.custodio_actual?.cargo ||
    tramite?.usuarios?.rol ||
    "Servidor";
  const areaActualNombre =
    tramite?.areas?.nombre ||
    tramite?.area_actual?.nombre ||
    "Área Institucional";

  if (loading && !tramite) {
    return (
      <div className="p-16 text-center text-xs text-slate-500 flex flex-col items-center justify-center gap-3">
        <RefreshCw className="w-6 h-6 animate-spin text-blue-600" />
        <span className="font-medium">Cargando expediente institucional...</span>
      </div>
    );
  }

  if (error || !tramite) {
    return (
      <div className="p-12 text-center space-y-4">
        <div className="inline-flex p-3 bg-rose-50 text-rose-600 rounded-full">
          <AlertTriangle className="w-6 h-6" />
        </div>
        <div className="text-sm font-semibold text-slate-800">
          {error || "Expediente no encontrado"}
        </div>
        <Link
          href="/escritorio"
          className="inline-flex items-center gap-1 text-xs text-blue-600 hover:underline font-medium"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Volver a Mi Escritorio
        </Link>
      </div>
    );
  }

  const userRole = (currentUser?.rol || "").toUpperCase();
  const isAdmin = userRole === "ADMIN" || userRole === "ADMINISTRADOR";

  // Si está en solo lectura y no es Administrador, bloqueamos edición pasando null
  // El Administrador Universal siempre mantiene capacidad de edición y acción
  const targetUserForEditing = (isReadOnly && !isAdmin) ? null : currentUser;

  return (
    <div className="w-full max-w-full min-w-0 space-y-6 pb-12">
      {/* Top Header Navigation con Área Actual y Custodio Actual */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-4 sm:p-5 rounded-xl border border-slate-200 shadow-xs w-full max-w-full min-w-0">
        <div className="flex items-start sm:items-center gap-3 min-w-0">
          <button
            type="button"
            onClick={() => router.back()}
            className="p-2 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg border border-slate-200 transition-colors cursor-pointer shrink-0 mt-0.5 sm:mt-0"
            title="Volver"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div className="space-y-1.5 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-lg font-bold font-mono text-slate-900 tracking-tight">
                {tramite.numero_quipux}
              </h1>
              <BadgeEstado estado={tramite.estado_general} subEstado={tramite.sub_estado} />
              <SemaforoSLA sla={tramite.sla} />
              {isAdmin && (
                <span className="px-2 py-0.5 text-[10px] font-bold uppercase rounded bg-purple-100 text-purple-800 border border-purple-200">
                  Modo Superusuario ADMIN
                </span>
              )}
            </div>

            {/* Datos de Área Actual y Custodio Actual */}
            <div className="flex flex-wrap items-center gap-2 pt-0.5">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-slate-100 border border-slate-200 rounded-md text-xs">
                <Building2 className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                <span className="text-slate-500 font-semibold uppercase text-[10px]">Área:</span>
                <span className="font-bold text-slate-800 uppercase">{areaActualNombre}</span>
              </div>

              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-slate-100 border border-slate-200 rounded-md text-xs">
                <UserCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span className="text-slate-500 font-semibold uppercase text-[10px]">Custodio:</span>
                <span className="font-bold text-slate-800 uppercase">{custodioNombre}</span>
                <span className="text-slate-500 text-[11px] font-medium">({custodioCargo})</span>
              </div>
            </div>
          </div>
        </div>

        <button
          onClick={fetchTramite}
          disabled={loading}
          className="p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg border border-slate-200 transition-colors self-start md:self-center shrink-0"
          title="Actualizar datos del expediente"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin text-blue-600" : ""}`} />
        </button>
      </div>

      {/* Action Header vs Banner de Modo Solo Lectura */}
      {(!isReadOnly || isAdmin) ? (
        <BarraAcciones
          tramite={tramite}
          currentUser={currentUser}
          onRefresh={fetchTramite}
        />
      ) : (
        <div className="bg-slate-50 border border-slate-300 rounded-xl p-3.5 px-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs w-full max-w-full min-w-0">
          <div className="flex items-center gap-2.5 text-xs text-slate-700 min-w-0">
            <Eye className="w-4 h-4 text-blue-600 shrink-0" />
            <div className="min-w-0">
              <span className="font-bold uppercase tracking-wide text-slate-800">
                Modo Consulta (Solo Lectura)
              </span>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Usted está visualizando este expediente sin permisos de modificación directa por encontrarse bajo la custodia de <strong>{custodioNombre}</strong> ({custodioCargo}) en <strong>{areaActualNombre}</strong>.
              </p>
            </div>
          </div>
          <span className="self-start sm:self-auto px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider bg-slate-200 text-slate-700 border border-slate-300 shrink-0">
            Solo Lectura
          </span>
        </div>
      )}

      {/* Card 1: Datos Generales */}
      <TarjetaDatosGenerales
        tramite={tramite}
        currentUser={targetUserForEditing}
        onRefresh={fetchTramite}
      />

      {/* Card 2: Submódulo de Referencias Quipux */}
      <TablaReferencias
        idTramite={tramite.id_tramite}
        referencias={tramite.tramite_referencias}
        currentUser={targetUserForEditing}
        onRefresh={fetchTramite}
        isReadOnly={Boolean(isReadOnly && !isAdmin)}
      />

      {/* Grid de Tarjetas de Fases Financieras */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-5 w-full max-w-full min-w-0">
        {/* Card 3: Fase Presupuesto */}
        <TarjetaPresupuesto
          tramite={tramite}
          currentUser={targetUserForEditing}
          onRefresh={fetchTramite}
        />

        {/* Card 4: Fase Contabilidad */}
        <TarjetaContabilidad
          tramite={tramite}
          currentUser={targetUserForEditing}
          onRefresh={fetchTramite}
        />

        {/* Card 5: Fase Tesorería y Pagos */}
        <TarjetaTesoreria
          tramite={tramite}
          currentUser={targetUserForEditing}
          onRefresh={fetchTramite}
        />

        {/* Card 6: Custodia de Archivo */}
        <TarjetaArchivo
          tramite={tramite}
          currentUser={targetUserForEditing}
          onRefresh={fetchTramite}
        />
      </div>

      {/* Card 7: Bitácora Histórica (Timeline) */}
      <TimelineBitacora
        movimientos={tramite.historial_movimientos}
        currentUser={currentUser}
      />
    </div>
  );
}
