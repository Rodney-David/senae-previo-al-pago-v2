import { prisma } from "@/lib/prisma";
import { SLAResult } from "@/types";

/**
 * Normaliza una fecha a medianoche en tiempo local sin sufrir
 * desplazamientos por desfase UTC (ej. UTC-5 Ecuador).
 */
function toLocalMidnight(d: Date | string | null | undefined): Date {
  if (!d) return new Date();
  if (d instanceof Date) {
    return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0);
  }
  const s = String(d).trim();
  if (s.includes("T")) {
    const dt = new Date(s);
    return new Date(dt.getFullYear(), dt.getMonth(), dt.getDate(), 0, 0, 0, 0);
  }
  const parts = s.split("-");
  if (parts.length === 3) {
    return new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]), 0, 0, 0, 0);
  }
  const dt = new Date(s);
  return new Date(dt.getFullYear(), dt.getMonth(), dt.getDate(), 0, 0, 0, 0);
}

/**
 * Motor de cálculo de SLA institucional (6 días hábiles normativos).
 * - Mientras el trámite está en Secretaría (INGRESADO / Área 1 sin entregar), el SLA NO ha iniciado (NO_INICIADO).
 * - El conteo arranca exactamente cuando Secretaría entrega a Control Previo Presupuesto (fecha_entrega_control_previo).
 * - Descuenta fines de semana y días feriados activos de la base de datos.
 * - Descuenta días de pausa acumulados (espera de factura u observaciones).
 */
export async function calculateTramiteSLA(tramite: {
  fecha_ingreso: Date | string | null;
  fecha_entrega_control_previo?: Date | string | null;
  fecha_recepcion_fisica?: Date | string | null;
  esta_pausado?: boolean | null;
  motivo_pausa?: string | null;
  fecha_pausa?: Date | string | null;
  dias_pausa_acumulados?: number | null;
  estado_general?: string | null;
  sub_estado?: string | null;
  fecha_pago?: Date | string | null;
  autorizado_pago?: boolean | null;
  fecha_autorizacion_pago?: Date | string | null;
  fecha_ultimo_movimiento?: Date | string | null;
  id_area_actual?: number | null;
  es_devuelto?: boolean | null;
}): Promise<SLAResult> {
  const TERM_DAYS = 6;
  const estadoGeneral = (tramite.estado_general || "").toUpperCase();

  // 1. Trámites devueltos formalmente o insubsistentes: EXENTOS de cómputo de SLA
  if (
    estadoGeneral === "INSUBSISTENTE" ||
    estadoGeneral === "DEVUELTO" ||
    tramite.es_devuelto
  ) {
    return {
      diasHabilesTranscurridos: 0,
      diasRestantes: 0,
      estado: "EXENTO",
      estaPausado: false,
      motivoPausa: null,
      porcentajeConsumido: 0,
    };
  }

  // 2. REGLA SENAE: Mientras esté en INGRESADO (ventanilla o despacho sin recibir físicamente por Presupuesto), SLA NO ha iniciado
  if (estadoGeneral === "INGRESADO") {
    return {
      diasHabilesTranscurridos: 0,
      diasRestantes: TERM_DAYS,
      estado: "NO_INICIADO",
      estaPausado: false,
      motivoPausa: null,
      porcentajeConsumido: 0,
    };
  }

  // 3. Determinar la fecha de inicio del SLA (momento exacto de recepción física en Presupuesto / REVISION)
  const rawStartDate =
    tramite.fecha_recepcion_fisica ||
    tramite.fecha_entrega_control_previo ||
    tramite.fecha_ingreso ||
    new Date();

  const startDate = toLocalMidnight(rawStartDate);

  // 4. Muerte formal de SLA: Ocurre al momento de autorizar el pago (o estados posteriores)
  const isFinalized =
    estadoGeneral === "AUTORIZADO_PAGO" ||
    estadoGeneral === "PAGADO" ||
    estadoGeneral === "CAJA" ||
    estadoGeneral === "ARCHIVO" ||
    estadoGeneral === "FINALIZADO_ARCHIVADO" ||
    tramite.sub_estado === "EN_CAJA" ||
    Boolean(tramite.autorizado_pago) ||
    Boolean(tramite.fecha_autorizacion_pago);

  const isCurrentlyPaused = Boolean(tramite.esta_pausado);

  // 5. Feriados activos
  let feriadosFechas: Set<string> = new Set();
  try {
    const feriadosList = await prisma.feriados.findMany({
      where: { activo: true },
      select: { fecha: true },
    });
    feriadosFechas = new Set(
      feriadosList.map((f) => {
        const d = toLocalMidnight(f.fecha);
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
          d.getDate()
        ).padStart(2, "0")}`;
      })
    );
  } catch (error) {
    console.error("Error fetching feriados for SLA:", error);
  }

  // 6. Determinar fecha fin de cálculo (muerte de SLA al autorizar el pago)
  let endDate = toLocalMidnight(new Date());
  if (isFinalized) {
    endDate = toLocalMidnight(
      tramite.fecha_autorizacion_pago ||
      tramite.fecha_pago ||
      tramite.fecha_ultimo_movimiento ||
      new Date()
    );
  } else if (isCurrentlyPaused && tramite.fecha_pausa) {
    endDate = toLocalMidnight(tramite.fecha_pausa);
  }

  // 5. Conteo de días hábiles entre startDate y endDate
  let elapsedBusinessDays = 0;
  const current = new Date(startDate.getTime());

  while (current <= endDate) {
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

  // 6. Restar pausas acumuladas
  const pauseDays = tramite.dias_pausa_acumulados || 0;
  const netElapsedDays = Math.max(1, elapsedBusinessDays - pauseDays);

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
