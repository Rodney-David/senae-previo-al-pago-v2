"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Menu,
  X,
  Inbox,
  FilePlus2,
  FileText,
  Package,
  FileSpreadsheet,
  ShieldCheck,
  Building2,
  ChevronRight,
  LogOut,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { UsuarioInstitucional } from "@/types";

export const Navbar: React.FC = () => {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState<UsuarioInstitucional | null>(null);

  useEffect(() => {
    try {
      const cached = localStorage.getItem("senae_user_session");
      if (cached) {
        setCurrentUser(JSON.parse(cached));
      }
    } catch (e) {}

    async function fetchSession() {
      try {
        const res = await fetch("/api/auth/session");
        const data = await res.json();
        if (data.user) {
          setCurrentUser(data.user);
          try {
            localStorage.setItem("senae_user_session", JSON.stringify(data.user));
          } catch (e) {}
        }
      } catch (err) {
        console.error("Error fetching session for navbar:", err);
      }
    }
    fetchSession();
  }, []);

  // Cerrar menú al cambiar de ruta
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  // Manejar tecla Escape para cerrar drawer
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setMobileMenuOpen(false);
      }
    };
    if (mobileMenuOpen) {
      window.addEventListener("keydown", handleKeyDown);
    }
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [mobileMenuOpen]);

  const handleLogout = async () => {
    try {
      localStorage.removeItem("senae_user_session");
      await fetch("/api/auth/login", { method: "DELETE" });
    } finally {
      window.location.href = "/login";
    }
  };

  const userRole = (currentUser?.rol || "").toUpperCase();
  const isAdmin = userRole === "ADMIN" || userRole === "ADMINISTRADOR";

  const navItems = [
    {
      label: "Mi Escritorio",
      href: "/escritorio",
      icon: Inbox,
      badge: "Prioridad",
    },
    {
      label: "Recepción DFI",
      href: "/recepcion",
      icon: FilePlus2,
    },
    {
      label: "Trámites",
      href: "/tramites",
      icon: FileText,
    },
    {
      label: "Gestión de Cajas",
      href: "/cajas",
      icon: Package,
    },
    {
      label: "Reportes e Indicadores",
      href: "/reportes",
      icon: FileSpreadsheet,
    },
    ...(isAdmin
      ? [
          {
            label: "Administración",
            href: "/administracion",
            icon: ShieldCheck,
            badge: "Admin",
          },
        ]
      : []),
  ];

  return (
    <>
      <header className="bg-slate-900 border-b border-slate-800 text-white shrink-0 h-16 w-full z-40 shadow-sm relative">
        <div className="w-full max-w-full min-w-0 px-3 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-2">
          {/* Izquierda: Logotipo Institucional SENAE y Título del Sistema */}
          <div className="flex items-center gap-2 sm:gap-3.5 min-w-0">
            <div className="bg-white/10 p-1 sm:p-1.5 rounded-lg flex items-center justify-center shrink-0">
              <Image
                src="/logo-senae.png"
                alt="Logo SENAE"
                width={140}
                height={40}
                className="h-8 sm:h-10 w-auto object-contain brightness-110"
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

          {/* Derecha: Botón Hamburguesa visible sólo en móviles (< 768px: md:hidden) */}
          <div className="flex items-center md:hidden">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
              aria-label={mobileMenuOpen ? "Cerrar menú móvil" : "Abrir menú móvil"}
              aria-expanded={mobileMenuOpen}
            >
              {mobileMenuOpen ? <X className="w-6 h-6 text-white" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </header>

      {/* Menú Drawer Móvil Lateral (< 768px) */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex">
          {/* Backdrop con desenfoque suave */}
          <div
            className="fixed inset-0 bg-slate-950/75 backdrop-blur-xs transition-opacity animate-in fade-in duration-200"
            onClick={() => setMobileMenuOpen(false)}
            aria-hidden="true"
          />

          {/* Drawer Lateral */}
          <div className="relative w-72 max-w-[85vw] bg-slate-900 border-r border-slate-800 text-white flex flex-col justify-between shadow-2xl z-50 h-full animate-in slide-in-from-left duration-200">
            {/* Header del Drawer */}
            <div className="p-4 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Image
                  src="/logo-senae.png"
                  alt="Logo SENAE"
                  width={110}
                  height={32}
                  className="h-8 w-auto object-contain brightness-110"
                />
              </div>
              <button
                type="button"
                onClick={() => setMobileMenuOpen(false)}
                className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                title="Cerrar menú"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Contenido scrolleable: Usuario y Navegación */}
            <div className="p-4 space-y-4 overflow-y-auto flex-1">
              {/* Tarjeta de Usuario */}
              {currentUser ? (
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
              ) : (
                <div className="p-3 bg-slate-800/40 border border-slate-700/40 rounded-xl text-xs text-slate-400">
                  Sesión activa
                </div>
              )}

              {/* Lista de Enlaces de Navegación */}
              <nav className="space-y-1.5">
                <div className="px-1 text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2">
                  Navegación del Sistema
                </div>
                {navItems.map((item) => {
                  const isActive =
                    pathname === item.href ||
                    (item.href !== "/escritorio" && pathname.startsWith(item.href));

                  const Icon = item.icon;

                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setMobileMenuOpen(false)}
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
                        <span className="block uppercase font-medium tracking-wide">
                          {item.label}
                        </span>
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

            {/* Footer con Botón Visible de Cerrar Sesión */}
            <div className="p-4 border-t border-slate-800 shrink-0 bg-slate-900">
              <button
                type="button"
                onClick={handleLogout}
                className="w-full px-3.5 py-2.5 text-rose-300 hover:text-white bg-rose-950/40 hover:bg-rose-900/60 rounded-xl border border-rose-800/60 transition-colors flex items-center justify-center gap-2 text-xs font-semibold shadow-xs cursor-pointer"
                title="Cerrar Sesión Segura SENAE"
              >
                <LogOut className="w-4 h-4 text-rose-400" />
                <span>Cerrar Sesión</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
