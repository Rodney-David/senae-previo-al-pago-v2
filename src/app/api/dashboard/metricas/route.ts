import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { calculateTramiteSLA } from "@/lib/slaCalculator";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const tramites = await prisma.tramites.findMany({
      include: {
        areas: true,
        usuarios: true,
      },
    });

    const totalRegistrados = tramites.length;
    let enFlujoActivo = 0;
    let pausadosSLA = 0;
    let altaCuantia = 0;
    let finalizadosArchivados = 0;
    let enPlazo = 0;
    let porVencer = 0;
    let vencidos = 0;

    for (const t of tramites) {
      if (t.monto_total && Number(t.monto_total) >= 10000) {
        altaCuantia++;
      }

      if (t.estado_general === "FINALIZADO_ARCHIVADO") {
        finalizadosArchivados++;
        continue; // No cuenta para SLA activo
      }

      if (t.esta_pausado) {
        pausadosSLA++;
      } else {
        enFlujoActivo++;
      }

      const sla = await calculateTramiteSLA(t);
      if (sla.estado === "EN_PLAZO") enPlazo++;
      else if (sla.estado === "POR_VENCER") porVencer++;
      else if (sla.estado === "VENCIDO") vencidos++;
    }

    return NextResponse.json({
      metricas: {
        totalRegistrados,
        enFlujoActivo,
        pausadosSLA,
        altaCuantia,
        finalizadosArchivados,
        enPlazo,
        porVencer,
        vencidos,
      },
    });
  } catch (error) {
    console.error("Error calculating dashboard metrics:", error);
    return NextResponse.json(
      { error: "Error al calcular las métricas institucionales" },
      { status: 500 }
    );
  }
}
