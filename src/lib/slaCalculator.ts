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

export interface SLAConfig {
  limite_dias: number;
  punto_inicio: "RECEPCION_PRESUPUESTO" | "INGRESO_VENTANILLA" | "ENTREGA_CONTROL_PREVIO" | string;
  punto_fin: "AUTORIZACION_PAGO" | "PAGO_EFECTIVO" | "APROBACION_CONTABILIDAD" | "ARCHIVO_CAJA" | string;
}

let cachedSLAConfig: { data: SLAConfig; timestamp: number } | null = null;
const CACHE_TTL_MS = 10000; // 10 segundos de TTL para rápida respuesta tras cambio en admin

/**
 * Consulta la configuración vigente del semáforo SLA en `parametros_sistema`.
 */
export async function getSLAConfig(): Promise<SLAConfig> {
  const now = Date.now();
  if (cachedSLAConfig && now - cachedSLAConfig.timestamp < CACHE_TTL_MS) {
    return cachedSLAConfig.data;
  }

  try {
    const params = await prisma.parametros_sistema.findMany({
      where: {
        clave: {
          in: ["sla_limite_dias", "sla_punto_inicio", "sla_punto_fin"],
        },
      },
    });

    const map: Record<string, string> = {};
    params.forEach((p) => {
      map[p.clave] = p.valor;
    });

    const parsedDias = parseInt(map["sla_limite_dias"] || "6", 10);
    const data: SLAConfig = {
      limite_dias: isNaN(parsedDias) || parsedDias < 1 ? 6 : parsedDias,
      punto_inicio: map["sla_punto_inicio"] || "RECEPCION_PRESUPUESTO",
      punto_fin: map["sla_punto_fin"] || "AUTORIZACION_PAGO",
    };

    cachedSLAConfig = { data, timestamp: now };
    return data;
  } catch (error) {
    console.error("Error al obtener parametros_sistema para SLA, usando defaults:", error);
    return {
      limite_dias: 6,
      punto_inicio: "RECEPCION_PRESUPUESTO",
      punto_fin: "AUTORIZACION_PAGO",
    };
  }
}

export function invalidateSLAConfigCache() {
  cachedSLAConfig = null;
}

/**
 * Motor de cálculo de SLA institucional parametrizable.
 * - Límite de días configurable (default 6 días hábiles).
 * - Punto de inicio configurable:
 *    * RECEPCION_PRESUPUESTO (Default): Inicia cuando Presupuesto lo recibe físicamente (REVISION).
 *    * ENTREGA_CONTROL_PREVIO: Inicia cuando DFI entrega formalmente en lote.
 *    * INGRESO_VENTANILLA: Inicia en fecha_ingreso.
 * - Punto de fin configurable:
 *    * AUTORIZACION_PAGO (Default): Muerte formal al autorizar el pago en Tesorería.
 *    * PAGO_EFECTIVO: Muerte al pagarse en banco.
 *    * APROBACION_CONTABILIDAD: Muerte al aprobar contabilidad.
 *    * ARCHIVO_CAJA: Muerte al ingresar a Archivo Central.
 * - Descuenta fines de semana y feriados activos.
 * - Descuenta pausas acumuladas (factura u observación).
 * - Conteo de totalidad de días de vida sin excepciones (días calendario continuos desde ingreso).
 */
export async function calculateTramiteSLA(
  tramite: {
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
    fecha_aprobacion_contabilidad?: Date | string | null;
    fecha_ultimo_movimiento?: Date | string | null;
    id_area_actual?: number | null;
    es_devuelto?: boolean | null;
  },
  customConfig?: SLAConfig,
  customFeriadosSet?: Set<string>
): Promise<SLAResult> {
  const config = customConfig || (await getSLAConfig());
  const TERM_DAYS = config.limite_dias || 6;
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
      limiteDias: TERM_DAYS,
    };
  }

  // 2. Comprobar Punto de Inicio
  let rawStartDate: Date | string | null = null;
  if (config.punto_inicio === "INGRESO_VENTANILLA") {
    rawStartDate = tramite.fecha_ingreso || new Date();
  } else if (config.punto_inicio === "ENTREGA_CONTROL_PREVIO") {
    if (estadoGeneral === "INGRESADO" && !tramite.fecha_entrega_control_previo) {
      return {
        diasHabilesTranscurridos: 0,
        diasRestantes: TERM_DAYS,
        estado: "NO_INICIADO",
        estaPausado: false,
        motivoPausa: null,
        porcentajeConsumido: 0,
        limiteDias: TERM_DAYS,
      };
    }
    rawStartDate = tramite.fecha_entrega_control_previo || tramite.fecha_ingreso || new Date();
  } else {
    // RECEPCION_PRESUPUESTO (Default institucional SENAE)
    if (estadoGeneral === "INGRESADO") {
      return {
        diasHabilesTranscurridos: 0,
        diasRestantes: TERM_DAYS,
        estado: "NO_INICIADO",
        estaPausado: false,
        motivoPausa: null,
        porcentajeConsumido: 0,
        limiteDias: TERM_DAYS,
      };
    }
    rawStartDate =
      tramite.fecha_recepcion_fisica ||
      tramite.fecha_entrega_control_previo ||
      tramite.fecha_ingreso ||
      new Date();
  }

  const startDate = toLocalMidnight(rawStartDate);

  // 3. Comprobar Punto de Término / Muerte del SLA
  let isFinalized = false;
  let finalEndDate: Date | string | null = null;

  if (config.punto_fin === "PAGO_EFECTIVO") {
    isFinalized =
      estadoGeneral === "PAGADO" ||
      estadoGeneral === "CAJA" ||
      estadoGeneral === "ARCHIVO" ||
      estadoGeneral === "FINALIZADO_ARCHIVADO" ||
      tramite.sub_estado === "EN_CAJA" ||
      Boolean(tramite.fecha_pago);
    finalEndDate = tramite.fecha_pago || tramite.fecha_ultimo_movimiento || new Date();
  } else if (config.punto_fin === "APROBACION_CONTABILIDAD") {
    isFinalized =
      Boolean(tramite.fecha_aprobacion_contabilidad) ||
      ["AUTORIZADO_PAGO", "PAGADO", "CAJA", "ARCHIVO", "FINALIZADO_ARCHIVADO"].includes(estadoGeneral);
    finalEndDate = tramite.fecha_aprobacion_contabilidad || tramite.fecha_ultimo_movimiento || new Date();
  } else if (config.punto_fin === "ARCHIVO_CAJA") {
    isFinalized =
      estadoGeneral === "ARCHIVO" || estadoGeneral === "FINALIZADO_ARCHIVADO";
    finalEndDate = tramite.fecha_ultimo_movimiento || new Date();
  } else {
    // AUTORIZACION_PAGO (Default institucional SENAE)
    isFinalized =
      estadoGeneral === "AUTORIZADO_PAGO" ||
      estadoGeneral === "PAGADO" ||
      estadoGeneral === "CAJA" ||
      estadoGeneral === "ARCHIVO" ||
      estadoGeneral === "FINALIZADO_ARCHIVADO" ||
      tramite.sub_estado === "EN_CAJA" ||
      Boolean(tramite.autorizado_pago) ||
      Boolean(tramite.fecha_autorizacion_pago);
    finalEndDate =
      tramite.fecha_autorizacion_pago ||
      tramite.fecha_pago ||
      tramite.fecha_ultimo_movimiento ||
      new Date();
  }

  const isCurrentlyPaused = Boolean(tramite.esta_pausado);

  // 4. Feriados activos
  let feriadosFechas: Set<string> = customFeriadosSet || new Set();
  if (!customFeriadosSet) {
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
  }

  // 5. Determinar fecha fin de cálculo
  let endDate = toLocalMidnight(new Date());
  if (isFinalized) {
    endDate = toLocalMidnight(finalEndDate);
  } else if (isCurrentlyPaused && tramite.fecha_pausa) {
    endDate = toLocalMidnight(tramite.fecha_pausa);
  }

  // 6. Conteo de días hábiles entre startDate y endDate
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

  // 7. Restar pausas acumuladas
  const pauseDays = tramite.dias_pausa_acumulados || 0;
  const netElapsedDays = Math.max(1, elapsedBusinessDays - pauseDays);

  // 8. Umbrales dinámicos según el límite configurado (TERM_DAYS)
  const greenThreshold = Math.ceil(TERM_DAYS * 0.5); // Para 6 días: hasta 3 días
  const yellowThreshold = TERM_DAYS; // Para 6 días: 4 a 6 días

  let estado: SLAResult["estado"];
  if (isFinalized) {
    estado = "FINALIZADO";
  } else if (isCurrentlyPaused) {
    estado = "PAUSADO";
  } else if (netElapsedDays <= greenThreshold) {
    estado = "EN_PLAZO";
  } else if (netElapsedDays <= yellowThreshold) {
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
    limiteDias: TERM_DAYS,
  };
}
