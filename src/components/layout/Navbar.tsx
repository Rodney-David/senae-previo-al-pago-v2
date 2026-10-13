"use client";

import React from "react";
import Image from "next/image";

export const Navbar: React.FC = () => {
  return (
    <header className="bg-slate-900 border-b border-slate-800 text-white shrink-0 h-16 w-full z-40 shadow-sm">
      <div className="w-full px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-start">
        {/* Izquierda: Logotipo Institucional SENAE y Título del Sistema pegado a la izquierda */}
        <div className="flex items-center gap-3.5">
          <div className="bg-white/10 p-1.5 rounded-lg flex items-center justify-center">
            <Image
              src="/logo-senae.png"
              alt="Logo SENAE"
              width={140}
              height={40}
              className="h-10 w-auto object-contain brightness-110"
              priority
            />
          </div>
          <div>
            <div className="text-xs font-semibold tracking-wider uppercase text-slate-400">
              Servicio Nacional de Aduana del Ecuador
            </div>
            <div className="text-sm font-medium text-slate-200">
              Control Financiero Previo al Pago
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};
