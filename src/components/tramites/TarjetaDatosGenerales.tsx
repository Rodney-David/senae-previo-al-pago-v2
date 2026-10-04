"use client";

import React, { useState } from "react";
import { TramiteCompletoDTO, UsuarioInstitucional } from "@/types";
import { formatCurrency, formatDate } from "@/lib/utils";
import { Building, FileText, Calendar, DollarSign, Receipt, Edit3, Scale, Tag } from "lucide-react";
import { ModalEditarDatosGenerales } from "./ModalEditarDatosGenerales";

interface TarjetaDatosGeneralesProps {
  tramite: TramiteCompletoDTO;
  currentUser?: UsuarioInstitucional | null;
  onRefresh?: () => void;
}

export const TarjetaDatosGenerales: React.FC<TarjetaDatosGeneralesProps> = ({
  tramite,
  currentUser,
  onRefresh = () => {},
}) => {
  const [modalEditOpen, setModalEditOpen] = useState(false);

  // Can edit general data: DFI (Director, Secretaria), Presupuesto (Jefe, Analista), Admin
  const canEditGeneral = [
    "ADMINISTRADOR",
    "DIRECTORA_FINANCIERA",
    "SECRETARIA_DFI",
    "JEFE_PRESUPUESTO",
    "ANALISTA_PRESUPUESTO",
  ].includes(currentUser?.rol || "");

  return (
    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
      {/* Card Header */}
      <div className="px-5 py-3.5 bg-slate-900 text-white flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Receipt className="w-4 h-4 text-blue-400" />
          <h3 className="text-xs font-bold uppercase tracking-wider">
            1. Datos Generales del Trámite
          </h3>
        </div>
        <div className="flex items-center gap-2">
          {tramite.es_alta_cuantia && (
            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-400 text-slate-950 uppercase tracking-wide">
              Alta Cuantía (≥ $10.000)
            </span>
          )}
          {canEditGeneral && tramite.estado_general !== "ARCHIVADO" && tramite.estado_general !== "ANULADO" && (
            <button
              onClick={() => setModalEditOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1 text-xs font-bold uppercase bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors shadow-2xs"
            >
              <Edit3 className="w-3.5 h-3.5" />
              Editar Datos
            </button>
          )}
        </div>
      </div>

      {/* Grid of Clean Structured Fields */}
      <div className="p-5 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
        {/* Proveedor / Beneficiario */}
        <div className="space-y-1">
          <span className="text-[11px] font-bold text-slate-500 uppercase flex items-center gap-1">
            <Building className="w-3.5 h-3.5 text-slate-400" /> Proveedor / Beneficiario
          </span>
          <div className="font-semibold text-slate-900 uppercase leading-snug">
            {tramite.proveedor_beneficiario}
          </div>
          <div className="text-[11px] font-mono text-slate-500">
            RUC: {tramite.ruc_proveedor || "NO REGISTRADO"}
          </div>
        </div>

        {/* Tipo de Proceso y Quipux */}
        <div className="space-y-1">
          <span className="text-[11px] font-bold text-slate-500 uppercase flex items-center gap-1">
            <FileText className="w-3.5 h-3.5 text-slate-400" /> Tipo de Proceso y Quipux
          </span>
          <div className="text-slate-800 uppercase font-medium line-clamp-2 leading-tight">
            {tramite.tipos_tramite?.nombre || "CONTRATACIÓN PÚBLICA"}
          </div>
          <div className="text-[11px] font-mono text-blue-700 font-semibold truncate">
            {tramite.numero_quipux}
          </div>
        </div>

        {/* Gestión y Fechas */}
        <div className="space-y-1">
          <span className="text-[11px] font-bold text-slate-500 uppercase flex items-center gap-1">
            <Calendar className="w-3.5 h-3.5 text-slate-400" /> Gestión y Fechas
          </span>
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-slate-100 text-slate-800 border border-slate-200">
              {tramite.tipo_flujo || "PAGO"}
            </span>
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            Memo: {formatDate(tramite.fecha_memorando)}
          </div>
          <div className="text-[11px] text-slate-500">
            Físico: {formatDate(tramite.fecha_recepcion_fisica)}
          </div>
        </div>

        {/* Monto Total */}
        <div className="space-y-1 bg-slate-50 p-3 rounded-xl border border-slate-200 flex flex-col justify-center">
          <span className="text-[11px] font-bold text-slate-600 uppercase flex items-center gap-1">
            <DollarSign className="w-3.5 h-3.5 text-emerald-600" /> Monto Total
          </span>
          <div className="font-mono font-black text-lg text-slate-900 tracking-tight">
            {formatCurrency(tramite.monto_total)}
          </div>
          {tramite.numero_factura ? (
            <div className="text-[11px] font-mono text-slate-600 truncate">
              Factura: <span className="font-semibold text-slate-800">{tramite.numero_factura}</span>
            </div>
          ) : (
            <div className="text-[10px] text-amber-700 uppercase font-medium italic">
              Factura pendiente
            </div>
          )}
        </div>

        {/* Número de Liquidación y Número de Juicio (si aplican) */}
        {(tramite.numero_liquidacion || tramite.numero_juicio) && (
          <div className="sm:col-span-2 md:col-span-4 pt-2 border-t border-slate-100 flex items-center gap-6 text-[11px] text-slate-600">
            {tramite.numero_liquidacion && (
              <div>
                <span className="font-bold uppercase text-slate-500">Nro. Liquidación: </span>
                <span className="font-mono font-semibold text-slate-800">{tramite.numero_liquidacion}</span>
              </div>
            )}
            {tramite.numero_juicio && (
              <div>
                <span className="font-bold uppercase text-slate-500">Nro. Juicio: </span>
                <span className="font-mono font-semibold text-slate-800">{tramite.numero_juicio}</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Edit Modal */}
      {canEditGeneral && (
        <ModalEditarDatosGenerales
          isOpen={modalEditOpen}
          onClose={() => setModalEditOpen(false)}
          tramite={tramite}
          currentUser={currentUser || null}
          onRefresh={onRefresh}
        />
      )}
    </div>
  );
};
