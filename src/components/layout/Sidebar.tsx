"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Inbox,
  FilePlus2,
  FileText,
  BarChart3,
  ShieldCheck,
  Building2,
  ChevronRight,
  LogOut,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { UsuarioInstitucional } from "@/types";

export const Sidebar: React.FC = () => {
  const pathname = usePathname();
  const [currentUser, setCurrentUser] = useState<UsuarioInstitucional | null>(null);

  useEffect(() => {
    async function fetchSession() {
      try {
        const res = await fetch("/api/auth/session");
        const data = await res.json();
        if (data.user) setCurrentUser(data.user);
      } catch (err) {
        console.error("Error fetching session for sidebar:", err);
      }
    }
    fetchSession();
  }, []);

  const navItems = [
    {
      label: "Mi Escritorio",
      href: "/escritorio",
      icon: Inbox,
      badge: "Prioridad",
      description: "Trámites en mi gestión",
    },
    {
      label: "Recepción DFI",
      href: "/recepcion",
      icon: FilePlus2,
      description: "Ingreso de expedientes físicos",
    },
    {
      label: "Trámites",
      href: "/tramites",
      icon: FileText,
      description: "Catálogo institucional completo",
    },
    {
      label: "Indicadores SLA",
      href: "/indicadores",
      icon: BarChart3,
      description: "Tiempos de pago (6 días)",
    },
    {
      label: "Administración",
      href: "/administracion",
      icon: ShieldCheck,
      description: "Campos, feriados y roles",
      adminOnly: true,
    },
  ];

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/login", { method: "DELETE" });
    } finally {
      window.location.href = "/login";
    }
  };

  return (
    <aside className="w-64 h-full shrink-0 flex flex-col justify-between hidden md:flex bg-slate-900 border-r border-slate-800 text-white select-none">
      <div className="p-4 space-y-5 overflow-y-auto flex-1">
        {/* User Card */}
        {currentUser && (
          <div className="p-3 bg-slate-800/80 border border-slate-700/70 rounded-xl space-y-1.5 shadow-xs">
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-200">
              <Building2 className="w-4 h-4 text-blue-400 shrink-0" />
              <span className="truncate uppercase">{currentUser.area_nombre || "SENAE"}</span>
            </div>
            <div className="text-xs text-slate-300 font-medium truncate uppercase">
              {currentUser.nombre_completo}
            </div>
            <div className="inline-block px-2 py-0.5 rounded text-[10px] font-bold bg-blue-900/60 text-blue-200 border border-blue-700/60 uppercase">
              {currentUser.cargo}
            </div>
          </div>
        )}

        {/* Navigation Items */}
        <nav className="space-y-1.5">
          {navItems.map((item) => {
            const isActive =
              pathname === item.href ||
              (item.href !== "/escritorio" && pathname.startsWith(item.href));

            if (item.adminOnly && currentUser?.rol !== "ADMIN") {
              return null;
            }

            const Icon = item.icon;

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center justify-between px-3.5 py-2.5 rounded-lg text-xs font-medium transition-all group",
                  isActive
                    ? "bg-blue-600 text-white shadow-xs font-semibold"
                    : "text-slate-300 hover:bg-slate-800 hover:text-white"
                )}
              >
                <div className="flex items-center gap-3">
                  <Icon
                    className={cn(
                      "w-4 h-4 transition-colors",
                      isActive ? "text-white" : "text-slate-400 group-hover:text-slate-200"
                    )}
                  />
                  <div>
                    <span className="block uppercase font-medium tracking-wide">{item.label}</span>
                  </div>
                </div>
                {item.badge && !isActive && (
                  <span className="px-1.5 py-0.5 text-[9px] font-bold uppercase bg-amber-400/20 text-amber-300 border border-amber-400/30 rounded">
                    {item.badge}
                  </span>
                )}
                {isActive && <ChevronRight className="w-4 h-4 text-white" />}
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Botón de Cerrar Sesión Seguro al final de la barra lateral */}
      <div className="p-4 border-t border-slate-800 shrink-0">
        <button
          onClick={handleLogout}
          className="w-full px-3.5 py-2.5 text-rose-300 hover:text-white bg-rose-950/40 hover:bg-rose-900/60 rounded-xl border border-rose-800/60 transition-colors flex items-center justify-center gap-2 text-xs font-semibold shadow-xs cursor-pointer"
          title="Cerrar Sesión Segura SENAE"
        >
          <LogOut className="w-4 h-4 text-rose-400" />
          <span>Cerrar Sesión</span>
        </button>
      </div>
    </aside>
  );
};
