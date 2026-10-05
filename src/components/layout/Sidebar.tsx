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

interface SidebarProps {
  isMobileOpen?: boolean;
  onCloseMobile?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ isMobileOpen, onCloseMobile }) => {
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

  const sidebarContent = (
    <div className="flex flex-col justify-between h-full bg-slate-900 text-white select-none">
      <div className="p-3.5 space-y-4 overflow-y-auto flex-1">
        {/* User Card */}
        {currentUser && (
          <div className="p-2.5 bg-slate-800/80 border border-slate-700/70 rounded-xl space-y-1 shadow-xs">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-200">
              <Building2 className="w-3.5 h-3.5 text-blue-400 shrink-0" />
              <span className="truncate uppercase text-[11px]">{currentUser.area_nombre || "SENAE"}</span>
            </div>
            <div className="text-[11px] text-slate-300 font-medium truncate uppercase" title={currentUser.nombre_completo}>
              {currentUser.nombre_completo}
            </div>
            <div className="inline-block px-1.5 py-0.5 rounded text-[9px] font-bold bg-blue-900/60 text-blue-200 border border-blue-700/60 uppercase">
              {currentUser.cargo}
            </div>
          </div>
        )}

        {/* Navigation Items */}
        <nav className="space-y-1">
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
                onClick={onCloseMobile}
                className={cn(
                  "flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-all group",
                  isActive
                    ? "bg-blue-600 text-white shadow-xs font-semibold"
                    : "text-slate-300 hover:bg-slate-800 hover:text-white"
                )}
              >
                <div className="flex items-center gap-2.5">
                  <Icon
                    className={cn(
                      "w-4 h-4 transition-colors shrink-0",
                      isActive ? "text-white" : "text-slate-400 group-hover:text-slate-200"
                    )}
                  />
                  <div>
                    <span className="block uppercase font-medium tracking-wide text-[11px]">{item.label}</span>
                  </div>
                </div>
                {item.badge && !isActive && (
                  <span className="px-1.5 py-0.5 text-[8px] font-bold uppercase bg-amber-400/20 text-amber-300 border border-amber-400/30 rounded">
                    {item.badge}
                  </span>
                )}
                {isActive && <ChevronRight className="w-3.5 h-3.5 text-white" />}
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Botón de Cerrar Sesión Seguro al final de la barra lateral */}
      <div className="p-3 border-t border-slate-800 shrink-0">
        <button
          onClick={handleLogout}
          className="w-full px-3 py-2 text-rose-300 hover:text-white bg-rose-950/40 hover:bg-rose-900/60 rounded-xl border border-rose-800/60 transition-colors flex items-center justify-center gap-2 text-xs font-semibold shadow-xs cursor-pointer"
          title="Cerrar Sesión Segura SENAE"
        >
          <LogOut className="w-3.5 h-3.5 text-rose-400" />
          <span>Cerrar Sesión</span>
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Sidebar (Fixed compact width 224px w-56) */}
      <aside className="w-56 h-full shrink-0 hidden md:block border-r border-slate-800">
        {sidebarContent}
      </aside>

      {/* Mobile Drawer Overlay */}
      {isMobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex">
          <div
            className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs transition-opacity"
            onClick={onCloseMobile}
          />
          <div className="relative w-64 max-w-[80%] h-full z-10 shadow-2xl">
            {sidebarContent}
          </div>
        </div>
      )}
    </>
  );
};
