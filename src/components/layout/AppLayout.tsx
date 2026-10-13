"use client";

import React, { useEffect, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Navbar } from "./Navbar";
import { Sidebar } from "./Sidebar";

// Tiempo máximo de inactividad permitido (30 minutos sin interacción)
const INACTIVITY_TIMEOUT_MS = 30 * 60 * 1000;

export const AppLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const pathname = usePathname();
  const router = useRouter();
  const isAuthPage = pathname === "/login";
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (isAuthPage) return;

    const handleLogoutByInactivity = async () => {
      try {
        await fetch("/api/auth/login", { method: "DELETE" });
      } catch (e) {
        console.error("Error al cerrar sesión por inactividad:", e);
      } finally {
        router.push("/login?reason=inactivity");
      }
    };

    const resetInactivityTimer = () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(handleLogoutByInactivity, INACTIVITY_TIMEOUT_MS);
    };

    // Eventos que indican actividad del usuario
    const activityEvents = ["mousemove", "mousedown", "keydown", "scroll", "touchstart"];
    activityEvents.forEach((event) => {
      window.addEventListener(event, resetInactivityTimer, { passive: true });
    });

    // Iniciar el temporizador
    resetInactivityTimer();

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      activityEvents.forEach((event) => {
        window.removeEventListener(event, resetInactivityTimer);
      });
    };
  }, [isAuthPage, router]);

  if (isAuthPage) {
    return <main className="h-screen w-full overflow-y-auto bg-slate-900">{children}</main>;
  }

  return (
    <div className="h-screen w-full overflow-hidden bg-slate-50 flex flex-col text-slate-900">
      <Navbar />
      <div className="flex flex-1 h-[calc(100vh-4rem)] overflow-hidden">
        <Sidebar />
        <main className="flex-1 min-w-0 h-full overflow-y-auto p-4 sm:p-6 lg:p-8 w-full max-w-[1680px] mx-auto">
          {children}
        </main>
      </div>
    </div>
  );
};
