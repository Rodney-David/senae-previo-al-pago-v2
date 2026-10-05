"use client";

import React, { useEffect, useState } from "react";
import Image from "next/image";
import { User, Shield, Building2 } from "lucide-react";
import { UsuarioInstitucional } from "@/types";

export const Navbar: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<UsuarioInstitucional | null>(null);
  const [usuarios, setUsuarios] = useState<UsuarioInstitucional[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const [sessionRes, usersRes] = await Promise.all([
          fetch("/api/auth/session"),
          fetch("/api/auth/usuarios"),
        ]);
        const sessionData = await sessionRes.json();
        const usersData = await usersRes.json();
        if (sessionData.user) setCurrentUser(sessionData.user);
        if (usersData.usuarios) setUsuarios(usersData.usuarios);
      } catch (err) {
        console.error("Error loading session:", err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const handleRoleChange = async (userIdStr: string) => {
    try {
      const res = await fetch("/api/auth/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id_usuario: parseInt(userIdStr, 10) }),
      });
      const data = await res.json();
      if (data.success && data.user) {
        setCurrentUser(data.user);
        window.location.reload();
      }
    } catch (error) {
      console.error("Error updating role:", error);
    }
  };

  return (
    <header className="bg-slate-900 border-b border-slate-800 text-white sticky top-0 z-40 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Left: Logo and Title */}
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

        {/* Right: RBAC Simulator Selector */}
        <div className="flex items-center gap-4">
          <div className="hidden sm:flex flex-col text-right">
            <span className="text-xs text-slate-400 font-medium flex items-center justify-end gap-1">
              <Shield className="w-3.5 h-3.5 text-blue-400" />
              Simulador RBAC (10 Roles)
            </span>
            <span className="text-xs font-medium text-slate-200 truncate max-w-[220px]">
              {currentUser?.nombre_completo || "Cargando..."}
            </span>
          </div>

          <div className="relative">
            <select
              value={currentUser?.id_usuario || 1}
              onChange={(e) => handleRoleChange(e.target.value)}
              disabled={loading}
              aria-label="Seleccionar rol para simulación"
              className="bg-slate-800 text-slate-100 text-xs rounded-lg border border-slate-700 px-3 py-2 pr-8 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer hover:bg-slate-750 transition-colors"
            >
              {usuarios.map((u) => (
                <option key={u.id_usuario} value={u.id_usuario}>
                  {u.cargo} - {u.nombre_completo} ({u.rol})
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={async () => {
              try {
                await fetch("/api/auth/login", { method: "DELETE" });
              } finally {
                window.location.href = "/login";
              }
            }}
            className="p-2 text-rose-300 hover:text-white hover:bg-rose-900/40 rounded-lg border border-rose-900/50 transition-colors flex items-center gap-1.5 text-xs font-semibold"
            title="Cerrar Sesión Segura SENAE"
          >
            <Shield className="w-4 h-4 text-rose-400" />
            <span className="hidden md:inline">Cerrar Sesión</span>
          </button>
        </div>
      </div>
    </header>
  );
};
