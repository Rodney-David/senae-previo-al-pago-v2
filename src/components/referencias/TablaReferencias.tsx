"use client";

import React, { useState } from "react";
import { TramiteReferenciaDTO } from "@/types";
import { formatDate } from "@/lib/utils";
import { FileText, Plus, ExternalLink } from "lucide-react";
import { ModalNuevaReferencia } from "./ModalNuevaReferencia";

interface TablaReferenciasProps {
  idTramite: number;
  referencias?: TramiteReferenciaDTO[];
  onRefresh: () => void;
}

export const TablaReferencias: React.FC<TablaReferenciasProps> = ({
  idTramite,
  referencias = [],
  onRefresh,
}) => {
  const [modalOpen, setModalOpen] = useState(false);

  return (
    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs space-y-0">
      <div className="px-5 py-3.5 bg-slate-900 text-white flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FileText className="w-4 h-4 text-blue-400" />
          <h3 className="text-xs font-semibold uppercase tracking-wider">
            2. Documentos y Referencias Institucionales Quipux
          </h3>
        </div>
        <button
          onClick={() => setModalOpen(true)}
          className="px-3 py-1 text-xs font-medium bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors flex items-center gap-1 shadow-xs"
        >
          <Plus className="w-3.5 h-3.5" />
          Agregar Referencia
        </button>
      </div>

      <div className="p-0 overflow-x-auto">
        {referencias.length === 0 ? (
          <div className="p-6 text-center text-xs text-slate-500">
            No se han registrado referencias documentales Quipux para este trámite.
          </div>
        ) : (
          <table className="min-w-[700px] w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-semibold text-slate-600 uppercase tracking-wider">
                <th className="py-2.5 px-4">Tipo</th>
                <th className="py-2.5 px-4">Número Oficial</th>
                <th className="py-2.5 px-4">Fecha</th>
                <th className="py-2.5 px-4">Asunto / Sumilla</th>
                <th className="py-2.5 px-4">Registrado Por</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {referencias.map((ref) => (
                <tr key={ref.id_referencia} className="hover:bg-slate-50/80 transition-colors">
                  <td className="py-2.5 px-4 font-semibold text-slate-700">
                    <span className="inline-block px-2 py-0.5 rounded text-[10px] bg-slate-100 text-slate-800 border border-slate-200">
                      {ref.tipo_personalizado || ref.tipo_documento.replace(/_/g, " ")}
                    </span>
                  </td>
                  <td className="py-2.5 px-4 font-mono font-medium text-blue-800">
                    {ref.numero_documento}
                  </td>
                  <td className="py-2.5 px-4 text-slate-600">
                    {formatDate(ref.fecha_documento)}
                  </td>
                  <td className="py-2.5 px-4 text-slate-800 max-w-xs truncate" title={ref.asunto_sumilla}>
                    {ref.asunto_sumilla}
                  </td>
                  <td className="py-2.5 px-4 text-slate-500 text-[11px]">
                    {ref.usuario_nombre || "Funcionario SENAE"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <ModalNuevaReferencia
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        idTramite={idTramite}
        onSuccess={onRefresh}
      />
    </div>
  );
};
