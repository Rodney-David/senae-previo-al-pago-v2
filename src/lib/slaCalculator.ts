import { prisma } from "@/lib/prisma";
import { SLAResult } from "@/types";

/**
 * Motor de cálculo de SLA institucional (6 días hábiles normativos).
 * Descuenta fines de semana y días feriados registrados en la base de datos.
 * Descuenta días de pausa acumulados cuando el trámite estuvo en espera de factura.
 */
export async function calculateTramiteSLA(tramite: {
  fecha_ingreso: Date | string | null;
  fecha_recepcion_fisica?: Date | string | null;
  esta_pausado?: boolean | null;
  motivo_pausa?: string | null;
  fecha_pausa?: Date | string | null;
  dias_pausa_acumulados?: number | null;
  estado_general?: string | null;
  sub_estado?: string | null;
  fecha_pago?: Date | string | null;
  fecha_ultimo_movimiento?: Date | string | null;
}): Promise<SLAResult> {
  const TERM_DAYS = 6;
  const startDate = tramite.fecha_recepcion_fisica
    ? new Date(tramite.fecha_recepcion_fisica)
    : tramite.fecha_ingreso
    ? new Date(tramite.fecha_ingreso)
    : new Date();

  const isFinalized =
    tramite.estado_general === "CAJA" ||
    tramite.estado_general === "ARCHIVO" ||
    tramite.estado_general === "FINALIZADO_ARCHIVADO" ||
    tramite.sub_estado === "EN_CAJA";

  const now = new Date();

  // Si está pausado actualmente
  const isCurrentlyPaused = Boolean(tramite.esta_pausado);

  // Obtener feriados activos de la base de datos
  let feriadosFechas: Set<string> = new Set();
  try {
    const feriadosList = await prisma.feriados.findMany({
      where: { activo: true },
      select: { fecha: true },
    });
    feriadosFechas = new Set(
      feriadosList.map((f) => {
        const d = new Date(f.fecha);
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
          d.getDate()
        ).padStart(2, "0")}`;
      })
    );
  } catch (error) {
    console.error("Error fetching feriados for SLA:", error);
  }

  // Contar días hábiles desde startDate hasta endDate
  // Si está finalizado en Caja o Archivo, el cálculo se detiene en la fecha de pago o último movimiento
  let endDate = now;
  if (isFinalized) {
    endDate = tramite.fecha_pago
      ? new Date(tramite.fecha_pago)
      : tramite.fecha_ultimo_movimiento
      ? new Date(tramite.fecha_ultimo_movimiento)
      : now;
  } else if (isCurrentlyPaused && tramite.fecha_pausa) {
    endDate = new Date(tramite.fecha_pausa);
  }

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
  if (isFinalized) {
    estado = "FINALIZADO";
  } else if (isCurrentlyPaused) {
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
