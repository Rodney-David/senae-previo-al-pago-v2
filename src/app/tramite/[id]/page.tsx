"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { TramiteCompletoDTO, UsuarioInstitucional } from "@/types";
import { formatCurrency, formatDate } from "@/lib/utils";
import { BadgeEstado } from "@/components/ui/BadgeEstado";
import { SemaforoSLA } from "@/components/ui/SemaforoSLA";
import { BarraAcciones } from "@/components/tramites/BarraAcciones";
import { TarjetaDatosGenerales } from "@/components/tramites/TarjetaDatosGenerales";
import { TablaReferencias } from "@/components/referencias/TablaReferencias";
import { TarjetaPresupuesto } from "@/components/tramites/TarjetaPresupuesto";
import { TarjetaContabilidad } from "@/components/tramites/TarjetaContabilidad";
import { TarjetaTesoreria } from "@/components/tramites/TarjetaTesoreria";
import { TarjetaArchivo } from "@/components/tramites/TarjetaArchivo";
import { TarjetaChecklist } from "@/components/tramites/TarjetaChecklist";
import { TimelineBitacora } from "@/components/tramites/TimelineBitacora";
import { ArrowLeft, RefreshCw, FileText, AlertTriangle } from "lucide-react";

export default function TramiteDetallePage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;

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

  return (
    <div className="space-y-6 pb-12">
      {/* Top Header Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
        <div className="flex items-center gap-3">
          <Link
            href="/escritorio"
            className="p-2 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg border border-slate-200 transition-colors"
            title="Volver a Mi Escritorio"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-lg font-bold font-mono text-slate-900 tracking-tight">
                {tramite.codigo_tramite}
              </h1>
              <BadgeEstado estado={tramite.estado_general} subEstado={tramite.sub_estado} />
              <SemaforoSLA sla={tramite.sla} />
            </div>
            <div className="flex items-center gap-3 text-xs text-slate-500 mt-1 flex-wrap">
              <span className="font-mono text-blue-700 font-semibold">{tramite.numero_quipux}</span>
              <span>•</span>
              <span>Beneficiario: <strong className="text-slate-700">{tramite.proveedor_beneficiario}</strong></span>
              <span>•</span>
              <span>Neto a Pagar: <strong className="font-mono text-emerald-700">{formatCurrency(tramite.monto_total)}</strong></span>
            </div>
          </div>
        </div>

        <button
          onClick={fetchTramite}
          disabled={loading}
          className="p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg border border-slate-200 transition-colors self-start sm:self-auto"
          title="Actualizar datos del expediente"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin text-blue-600" : ""}`} />
        </button>
      </div>

      {/* Action Header / Barra de Acciones Dinámicas */}
      <BarraAcciones
        tramite={tramite}
        currentUser={currentUser}
        onRefresh={fetchTramite}
      />

      {/* Card 1: Datos Generales */}
      <TarjetaDatosGenerales
        tramite={tramite}
        currentUser={currentUser}
        onRefresh={fetchTramite}
      />

      {/* Card 2: Submódulo de Referencias Quipux */}
      <TablaReferencias
        idTramite={tramite.id_tramite}
        referencias={tramite.tramite_referencias}
        onRefresh={fetchTramite}
      />

      {/* Card 3: Checklist Oficial de Control Previo al Pago */}
      <TarjetaChecklist
        idTramite={tramite.id_tramite}
        currentUserId={currentUser?.id_usuario}
        readOnly={tramite.estado_general === "ANULADO" || tramite.estado_general === "ARCHIVADO"}
      />

      {/* Card 4: Fase Presupuesto */}
      <TarjetaPresupuesto
        tramite={tramite}
        currentUser={currentUser}
        onRefresh={fetchTramite}
      />

      {/* Card 4: Fase Contabilidad */}
      <TarjetaContabilidad
        tramite={tramite}
        currentUser={currentUser}
        onRefresh={fetchTramite}
      />

      {/* Card 5: Fase Tesorería y Pagos */}
      <TarjetaTesoreria
        tramite={tramite}
        currentUser={currentUser}
        onRefresh={fetchTramite}
      />

      {/* Card 6: Custodia de Archivo */}
      <TarjetaArchivo
        tramite={tramite}
        currentUser={currentUser}
        onRefresh={fetchTramite}
      />

      {/* Card 7: Bitácora Histórica (Timeline) */}
      <TimelineBitacora movimientos={tramite.historial_movimientos} />
    </div>
  );
}
