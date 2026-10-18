"use client";

import React, { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { Navbar } from "./Navbar";
import { Sidebar } from "./Sidebar";

// Tiempo máximo de inactividad permitido (30 minutos sin interacción)
const INACTIVITY_TIMEOUT_MS = 30 * 60 * 1000;

export const AppLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const pathname = usePathname();
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Detección infalible de página de autenticación (pathname, trailing slashes y window.location)
  const isAuthPage =
    !pathname ||
    pathname === "/login" ||
    pathname.startsWith("/login/") ||
    (typeof window !== "undefined" && window.location.pathname.startsWith("/login"));

  useEffect(() => {
    if (isAuthPage) return;

    // Logout duro por inactividad (30 min)
    const handleLogoutByInactivity = async () => {
      try {
        try {
          localStorage.removeItem("senae_user_session");
        } catch (e) {}
        await fetch("/api/auth/login", { method: "DELETE" });
      } catch (e) {
        console.error("Error al cerrar sesión por inactividad:", e);
      } finally {
        // Redirección dura completa para destruir cualquier shell o estado anterior
        window.location.href = "/login?reason=inactivity";
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

    // Detección proactiva de expiración de sesión al reenfocar la ventana o cambiar de pestaña
    const checkSessionValidity = async () => {
      try {
        const res = await fetch("/api/auth/session");
        const data = await res.json();
        if (!data?.user) {
          try {
            localStorage.removeItem("senae_user_session");
          } catch (e) {}
          window.location.href = "/login?expired=1";
        }
      } catch (err) {
        // Ignorar fallas transitorias de red
      }
    };

    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        checkSessionValidity();
      }
    };

    window.addEventListener("focus", checkSessionValidity);
    document.addEventListener("visibilitychange", onVisibilityChange);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      activityEvents.forEach((event) => {
        window.removeEventListener(event, resetInactivityTimer);
      });
      window.removeEventListener("focus", checkSessionValidity);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [isAuthPage]);

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
