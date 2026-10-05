"use client";

import React, { useEffect, useState } from "react";
import Image from "next/image";
import { User, LogOut, ShieldCheck } from "lucide-react";
import { UsuarioInstitucional } from "@/types";

export const Navbar: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<UsuarioInstitucional | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadSession() {
      try {
        const res = await fetch("/api/auth/session");
        const data = await res.json();
        if (data.authenticated && data.user) {
          setCurrentUser(data.user);
        } else {
          // Si no está autenticado, redirigir a login
          window.location.href = "/login";
        }
      } catch (err) {
        console.error("Error al cargar sesión:", err);
      } finally {
        setLoading(false);
      }
    }
    loadSession();
  }, []);

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/login", { method: "DELETE" });
    } finally {
      window.location.href = "/login";
    }
  };

  return (
    <header className="bg-slate-900 border-b border-slate-800 text-white sticky top-0 z-40 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Izquierda: Logotipo Institucional SENAE y Título del Sistema */}
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

        {/* Derecha: Perfil Real Autenticado y Botón de Salida Segura */}
        <div className="flex items-center gap-4">
          {currentUser && (
            <div className="hidden sm:flex flex-col text-right">
              <div className="flex items-center justify-end gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-xs font-bold text-slate-100 truncate max-w-[240px]">
                  {currentUser.nombre_completo}
                </span>
              </div>
              <div className="flex items-center justify-end gap-1.5 mt-0.5">
                <span className="text-[10px] text-slate-400 font-medium truncate max-w-[180px]">
                  {currentUser.cargo}
                </span>
                <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-blue-950 text-blue-300 border border-blue-800">
                  {currentUser.rol}
                </span>
              </div>
            </div>
          )}

          {/* Botón de Cierre de Sesión Seguro */}
          <button
            onClick={handleLogout}
            disabled={loading}
            className="px-3 py-1.5 text-rose-300 hover:text-white bg-rose-950/40 hover:bg-rose-900/60 rounded-lg border border-rose-800/60 transition-colors flex items-center gap-1.5 text-xs font-semibold shadow-xs"
            title="Cerrar Sesión Segura SENAE"
          >
            <LogOut className="w-3.5 h-3.5 text-rose-400" />
            <span>Cerrar Sesión</span>
          </button>
        </div>
      </div>
    </header>
  );
};
