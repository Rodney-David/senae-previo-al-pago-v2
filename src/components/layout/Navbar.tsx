"use client";

import React from "react";
import Image from "next/image";

import { Menu, X } from "lucide-react";

interface NavbarProps {
  onToggleMobileMenu?: () => void;
  isMobileMenuOpen?: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({ onToggleMobileMenu, isMobileMenuOpen }) => {
  return (
    <header className="bg-slate-900 border-b border-slate-800 text-white shrink-0 h-16 w-full z-40 shadow-sm">
      <div className="w-full px-3.5 sm:px-6 h-16 flex items-center justify-between">
        {/* Izquierda: Logotipo Institucional SENAE y Título del Sistema pegado a la izquierda */}
        <div className="flex items-center gap-3">
          {/* Mobile hamburger menu toggle */}
          {onToggleMobileMenu && (
            <button
              onClick={onToggleMobileMenu}
              className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg md:hidden transition-colors"
              title="Abrir menú de navegación"
            >
              {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          )}

          <div className="bg-white/10 p-1.5 rounded-lg flex items-center justify-center shrink-0">
            <Image
              src="/logo-senae.png"
              alt="Logo SENAE"
              width={130}
              height={36}
              className="h-8 sm:h-9 w-auto object-contain brightness-110"
              priority
            />
          </div>
          <div className="min-w-0">
            <div className="text-[10px] sm:text-xs font-semibold tracking-wider uppercase text-slate-400 truncate">
              Servicio Nacional de Aduana del Ecuador
            </div>
            <div className="text-xs sm:text-sm font-medium text-slate-200 truncate">
              Control Financiero Previo al Pago
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};
