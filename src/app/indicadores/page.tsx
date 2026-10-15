"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function IndicadoresRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/reportes?tab=indicadores");
  }, [router]);

  return (
    <div className="flex items-center justify-center min-h-[40vh] p-8 text-slate-500 text-sm">
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin" />
        <p className="font-medium text-slate-700">
          Redirigiendo a Reportes e Indicadores SLA...
        </p>
      </div>
    </div>
  );
}
