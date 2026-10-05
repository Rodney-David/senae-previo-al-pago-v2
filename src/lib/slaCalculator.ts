import { prisma } from "@/lib/prisma";
import { SLAResult } from "@/types";

let cachedFeriadosSet: Set<string> | null = null;
let lastFeriadosFetch = 0;
const CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutos de caché

export async function getFeriadosSet(): Promise<Set<string>> {
  const now = Date.now();
  if (cachedFeriadosSet && now - lastFeriadosFetch < CACHE_TTL_MS) {
    return cachedFeriadosSet;
  }
  try {
    const feriadosList = await prisma.feriados.findMany({
      where: { activo: true },
      select: { fecha: true },
    });
    cachedFeriadosSet = new Set(
      feriadosList.map((f) => {
        const d = new Date(f.fecha);
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
          d.getDate()
        ).padStart(2, "0")}`;
      })
    );
    lastFeriadosFetch = now;
  } catch (error) {
    console.error("Error fetching feriados for SLA:", error);
    if (!cachedFeriadosSet) cachedFeriadosSet = new Set();
  }
  return cachedFeriadosSet;
}

/**
 * Motor de cálculo de SLA institucional (6 días hábiles normativos).
 * Descuenta fines de semana y días feriados registrados en la base de datos.
 * Descuenta días de pausa acumulados cuando el trámite estuvo en espera de factura.
 */
export async function calculateTramiteSLA(
  tramite: {
    fecha_ingreso: Date | string | null;
    fecha_recepcion_fisica?: Date | string | null;
    esta_pausado?: boolean | null;
    motivo_pausa?: string | null;
    fecha_pausa?: Date | string | null;
    dias_pausa_acumulados?: number | null;
  },
  preloadedFeriados?: Set<string>
): Promise<SLAResult> {
  const TERM_DAYS = 6;
  const startDate = tramite.fecha_recepcion_fisica
    ? new Date(tramite.fecha_recepcion_fisica)
    : tramite.fecha_ingreso
    ? new Date(tramite.fecha_ingreso)
    : new Date();

  const now = new Date();

  // Si está pausado actualmente
  const isCurrentlyPaused = Boolean(tramite.esta_pausado);

  // Obtener feriados activos (desde memoria o precargados)
  const feriadosFechas = preloadedFeriados || (await getFeriadosSet());

  // Contar días hábiles desde startDate hasta now (o hasta fecha_pausa si está pausado)
  const endDate = isCurrentlyPaused && tramite.fecha_pausa ? new Date(tramite.fecha_pausa) : now;

  let elapsedBusinessDays = 0;
  const current = new Date(startDate);
  // Normalizar a medianoche para conteo de fechas
  current.setHours(0, 0, 0, 0);
  const endNormalized = new Date(endDate);
  endNormalized.setHours(23, 59, 59, 999);

  while (current <= endNormalized) {
    const dayOfWeek = current.getDay();
    const dateStr = `${current.getFullYear()}-${String(current.getMonth() + 1).padStart(2, "0")}-${String(
      current.getDate()
    ).padStart(2, "0")}`;

    // Si no es sábado (6), ni domingo (0), ni feriado
    if (dayOfWeek !== 0 && dayOfWeek !== 6 && !feriadosFechas.has(dateStr)) {
      elapsedBusinessDays++;
    }

    current.setDate(current.getDate() + 1);
  }

  // Restar días de pausa acumulados previamente
  const pauseDays = tramite.dias_pausa_acumulados || 0;
  let netElapsedDays = Math.max(1, elapsedBusinessDays - pauseDays);

  let estado: SLAResult["estado"];
  if (isCurrentlyPaused) {
    estado = "PAUSADO";
  } else if (netElapsedDays <= 3) {
    estado = "EN_PLAZO";
  } else if (netElapsedDays <= 5) {
    estado = "POR_VENCER";
  } else {
    estado = "VENCIDO";
  }

  const diasRestantes = Math.max(0, TERM_DAYS - netElapsedDays);
  const porcentajeConsumido = Math.min(100, Math.round((netElapsedDays / TERM_DAYS) * 100));

  return {
    diasHabilesTranscurridos: netElapsedDays,
    diasRestantes,
    estado,
    estaPausado: isCurrentlyPaused,
    motivoPausa: tramite.motivo_pausa,
    porcentajeConsumido,
  };
}
