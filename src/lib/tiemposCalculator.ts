/**
 * MOTOR DE CÁLCULO DE TIEMPOS Y AUDITORÍA INSTITUCIONAL SENAE
 * Archivo: src/lib/tiemposCalculator.ts
 *
 * Módulo de funciones puras, deterministas y sin dependencias de base de datos.
 * Implementa el cálculo de doble reloj (Reloj A: Total Auditoría, Reloj B: Trabajo Real),
 * clasificación estricta de calidad de dato (COMPLETO, HISTORICO_PARCIAL, INCOMPLETO),
 * desglose por tramos hábiles brutos para trámites migrados, y verificación de la invariante:
 *
 * Invariante: Total Calendario = Trabajo Real + Pausa Factura + Pausa Observado + No Laborables + Post-Autorización (±0.1d)
 */

export type CalidadDato = "COMPLETO" | "HISTORICO_PARCIAL" | "INCOMPLETO";

export type TipoClasificacionSegmento =
  | "TRABAJO"
  | "PAUSA_FACTURA"
  | "PAUSA_OBSERVADO"
  | "POST_AUTORIZACION"
  | "EXENTO";

export interface FeriadoInfo {
  fecha: string | Date; // YYYY-MM-DD o Date
}

export interface MovimientoBitacora {
  id_movimiento?: number;
  id_tramite?: number;
  tipo_accion: string;
  fecha_hora: Date | string | null;
  id_area_origen?: number;
  id_area_destino?: number;
  id_usuario_entrega?: number;
  id_usuario_recibe?: number;
  comentarios?: string | null;
}

export interface TramiteCalculoInput {
  id_tramite: number;
  codigo_tramite: string;
  numero_quipux: string;
  padre_gestion?: string | null; // "PAGO" | "GARANTIA"
  tipo_flujo?: string | null;
  tipo_gestion?: string | null;
  estado_general: string;
  sub_estado?: string | null;
  esta_pausado?: boolean | null;
  motivo_pausa?: string | null;
  es_devuelto?: boolean | null;
  fecha_recepcion_fisica?: Date | string | null;
  fecha_ingreso?: Date | string | null;
  fecha_entrega_control_previo?: Date | string | null;
  fecha_aprobacion_presupuesto?: Date | string | null;
  fecha_aprobacion_contabilidad?: Date | string | null;
  fecha_autorizacion_pago?: Date | string | null;
  fecha_pago?: Date | string | null;
  fecha_ultimo_movimiento?: Date | string | null;
  anexos?: string | null;
  comentarios_bitacora?: string | null;
  historial_movimientos?: MovimientoBitacora[];
}

export interface SegmentoTiempo {
  inicio: Date;
  fin: Date;
  tipo_clasificacion: TipoClasificacionSegmento;
  estado: string;
  area_id?: number;
  area_nombre?: string;
  custodio_id?: number;
  custodio_nombre?: string;
  duracion_calendario_dias: number;
}

export interface MetricasRelojA {
  total_calendario_dias: number;
  dias_laborables_trabajo: number;
  dias_pausa_factura: number;
  dias_pausa_observado: number;
  dias_no_laborables: number;
  dias_post_autorizacion: number;
  dias_exento: number;
  invariante_cumplida: boolean;
  diferencia_invariante: number; // Suma - Total (debe ser <= 0.1)
}

export interface MetricasRelojB {
  aplica: boolean; // false si es HISTORICO_PARCIAL o INCOMPLETO
  dias_laborables_efectivos: number | "n/d";
  fase_secretaria_dias: number | "n/d";
  fase_presupuesto_dias: number | "n/d";
  fase_contabilidad_dias: number | "n/d";
  fase_dfi_dias: number | "n/d";
  fase_tesoreria_dias: number | "n/d";
}

export interface MetricasHistoricoParcial {
  tramo_secretaria_habiles: number | null; // recepción -> entrega analista
  tramo_presupuesto_habiles: number | null; // entrega analista -> recibe JCO
  tramo_contabilidad_tesoreria_habiles: number | null; // recibe JCO -> fecha de pago
  total_habiles_brutos: number | null;
  total_calendario_dias: number | null;
  estado_cierre: "PAGADO" | "SIN_FECHA_PAGO" | "EN_CURSO" | "ARCHIVADO_SIN_PAGO";
  nota_metodologica: string;
}

export interface DesgloseExplicativo {
  dias_pausa: number;
  dias_no_laborables: number;
  dias_espera_pago: number;
}

export interface ResultadoTiemposTramite {
  id_tramite: number;
  codigo_tramite: string;
  numero_quipux: string;
  padre_gestion: "PAGO" | "GARANTIA";
  calidad_dato: CalidadDato;
  alerta_inconsistencia: boolean;
  motivos_alerta: string[];
  propuestas_correccion: string[];
  es_analista_compartido: boolean;
  analistas_detectados: string[];
  en_curso: boolean;
  estado_general: string;

  // Indicadores clave requeridos
  tiempo_total_calendario_dias: number;
  tiempo_real_trabajado_dias: number;

  // Desglose explicativo
  dias_pausa: number;
  dias_no_laborables: number;
  dias_espera_pago: number;
  desglose: DesgloseExplicativo;

  reloj_a: MetricasRelojA;
  reloj_b: MetricasRelojB;
  historico_parcial?: MetricasHistoricoParcial;
  segmentos: SegmentoTiempo[];
}

// -------------------------------------------------------------
// UTILIDADES PURAS DE FECHA Y CALENDARIO
// -------------------------------------------------------------

/**
 * Normaliza cualquier entrada a un objeto Date válido en UTC.
 */
export function parseDate(d: Date | string | null | undefined): Date | null {
  if (!d) return null;
  if (d instanceof Date) {
    return isNaN(d.getTime()) ? null : new Date(d.getTime());
  }
  const s = String(d).trim();
  if (!s || s === "null" || s === "undefined") return null;

  // Manejo de ISO o formato simple YYYY-MM-DD
  const dt = new Date(s);
  return isNaN(dt.getTime()) ? null : dt;
}

/**
 * Convierte un Date a string YYYY-MM-DD en tiempo UTC para cotejar con feriados.
 */
export function toIsoDateOnly(d: Date): string {
  const year = d.getUTCFullYear();
  const month = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * Determina si una fecha cae en sábado (6) o domingo (0).
 */
export function esFinDeSemana(d: Date): boolean {
  const day = d.getUTCDay();
  return day === 0 || day === 6;
}

/**
 * Determina si una fecha es laborable (no es fin de semana ni feriado nacional).
 */
export function esDiaLaborable(d: Date, feriadosSet: Set<string>): boolean {
  if (esFinDeSemana(d)) return false;
  return !feriadosSet.has(toIsoDateOnly(d));
}

/**
 * Construye un Set de feriados YYYY-MM-DD normalizados.
 */
export function normalizarFeriadosSet(feriados: (string | Date | FeriadoInfo)[]): Set<string> {
  const s = new Set<string>();
  for (const f of feriados) {
    if (!f) continue;
    if (typeof f === "string") {
      s.add(f.split("T")[0]);
    } else if (f instanceof Date) {
      s.add(toIsoDateOnly(f));
    } else if (typeof f === "object" && "fecha" in f) {
      const parsed = parseDate(f.fecha);
      if (parsed) s.add(toIsoDateOnly(parsed));
    }
  }
  return s;
}

/**
 * Calcula días hábiles brutos entre dos fechas (inclusivo de inicio, exclusivo o inclusivo según jornada).
 * Descuenta fines de semana y feriados nacionales.
 */
export function calcularDiasHabilesBrutos(
  inicio: Date,
  fin: Date,
  feriadosSet: Set<string>
): number {
  if (fin.getTime() <= inicio.getTime()) return 0;

  let habiles = 0;
  // Avanzar día por día
  const cur = new Date(Date.UTC(inicio.getUTCFullYear(), inicio.getUTCMonth(), inicio.getUTCDate()));
  const end = new Date(Date.UTC(fin.getUTCFullYear(), fin.getUTCMonth(), fin.getUTCDate()));

  // Si caen el mismo día hábil
  if (cur.getTime() === end.getTime()) {
    return esDiaLaborable(cur, feriadosSet) ? 1 : 0;
  }

  while (cur.getTime() <= end.getTime()) {
    if (esDiaLaborable(cur, feriadosSet)) {
      habiles++;
    }
    cur.setUTCDate(cur.getUTCDate() + 1);
  }

  return habiles;
}

// -------------------------------------------------------------
// CLASIFICADOR DE CALIDAD DEL DATO Y DETECCIÓN DE ANOMALÍAS
// -------------------------------------------------------------

export function evaluarCalidadDato(
  t: TramiteCalculoInput
): {
  calidad: CalidadDato;
  alerta: boolean;
  motivos: string[];
  propuestas: string[];
  analistaCompartido: boolean;
  analistas: string[];
} {
  const motivos: string[] = [];
  const propuestas: string[] = [];

  const rec = parseDate(t.fecha_recepcion_fisica) || parseDate(t.fecha_ingreso);
  const ent = parseDate(t.fecha_entrega_control_previo);
  let jco = parseDate(t.fecha_aprobacion_presupuesto);
  if (!jco && t.historial_movimientos) {
    const movPase = t.historial_movimientos.find(m => m.tipo_accion === "PASE_A_CONTABILIDAD");
    if (movPase) jco = parseDate(movPase.fecha_hora);
  }
  const pag = parseDate(t.fecha_pago) || parseDate(t.fecha_autorizacion_pago);

  // 1. Detección de analistas compartidos (ej. "RG/DB", "NM/MS")
  let analistaCompartido = false;
  const analistas: string[] = [];

  const textoAnalistas = `${t.anexos || ""} ${t.comentarios_bitacora || ""}`;
  const matchAnalistas = textoAnalistas.match(/Analistas?:\s*([A-Za-z0-9/_ -]+)/i);
  if (matchAnalistas && matchAnalistas[1].includes("/")) {
    analistaCompartido = true;
    analistas.push(...matchAnalistas[1].split("/").map(s => s.trim()));
  }

  // Revisar si en los comentarios de movimientos hay asignación compartida
  if (t.historial_movimientos) {
    for (const m of t.historial_movimientos) {
      if (m.comentarios && m.comentarios.includes("/") && m.comentarios.toLowerCase().includes("analista")) {
        analistaCompartido = true;
        const matches = m.comentarios.match(/([A-Z]{2})\s*\/+\s*([A-Z]{2})/);
        if (matches) {
          if (!analistas.includes(matches[1])) analistas.push(matches[1]);
          if (!analistas.includes(matches[2])) analistas.push(matches[2]);
        }
      }
    }
  }

  // 2. Detección de fechas nulas o irrecuperables
  if (!rec) {
    motivos.push("Sin fecha de recepción física ni fecha de ingreso registradas");
    return {
      calidad: "INCOMPLETO",
      alerta: true,
      motivos,
      propuestas: ["Asignar fecha de recepción física comprobable desde el Quipux"],
      analistaCompartido,
      analistas,
    };
  }

  // 3. Fecha basura o año unix (1970)
  if (rec.getUTCFullYear() <= 1970 || (pag && pag.getUTCFullYear() <= 1970)) {
    motivos.push("Fecha inválida o epoch UNIX (1970) detectada");
    return {
      calidad: "INCOMPLETO",
      alerta: true,
      motivos,
      propuestas: ["Corregir marca temporal corrupta en bitácora"],
      analistaCompartido,
      analistas,
    };
  }

  // 4. Inversiones cronológicas graves donde fecha de entrega o pago sea anterior a la recepción física comprobable
  if (rec && ent && ent.getTime() < rec.getTime()) {
    motivos.push("Fecha de entrega a analista es anterior a la recepción física comprobable");
    propuestas.push("Verificar fecha de radicación en Secretaría");
  }
  if (rec && pag && pag.getTime() < rec.getTime()) {
    motivos.push("Fecha de pago es anterior a la recepción física comprobable del expediente");
    propuestas.push("Revisar posible cruce de expedientes o comprobante de pago");
  }

  // 7. Determinar si es COMPLETO o HISTORICO_PARCIAL
  // Es HISTORICO_PARCIAL si su código es TRM-2026-* o si sus movimientos provienen exclusivamente de la migración
  const esMigrado =
    t.codigo_tramite.startsWith("TRM-2026-") ||
    (t.historial_movimientos &&
      t.historial_movimientos.length > 0 &&
      t.historial_movimientos.every(m =>
        ["MIGRACION_EXCEL_2026", "PASE_A_CONTABILIDAD", "ASIGNACION_ANALISTA", "TRASPASO_CUSTODIA"].includes(
          m.tipo_accion
        )
      ));

  // Si tiene movimientos reales de sistema (ej. PAUSAR_TRAMITE_FACTURA, OBSERVACION, etc.), se evalúa como COMPLETO
  const tieneMovimientosReales =
    t.historial_movimientos &&
    t.historial_movimientos.some(
      m =>
        ![
          "MIGRACION_EXCEL_2026",
          "PASE_A_CONTABILIDAD",
          "ASIGNACION_ANALISTA",
          "TRASPASO_CUSTODIA",
        ].includes(m.tipo_accion)
    );

  let calidad: CalidadDato = "COMPLETO";
  if (esMigrado && !tieneMovimientosReales) {
    calidad = "HISTORICO_PARCIAL";
  }

  // Si tiene errores cronológicos severos (pago < recepción), se marca como INCOMPLETO
  if (rec && pag && pag.getTime() < rec.getTime()) {
    calidad = "INCOMPLETO";
  }

  const alerta = motivos.length > 0;
  return { calidad, alerta, motivos, propuestas, analistaCompartido, analistas };
}

// -------------------------------------------------------------
// CÁLCULO DE RELOJ A Y RELOJ B POR PARTICIÓN DETERMINISTA
// -------------------------------------------------------------

/**
 * Reparte el intervalo de tiempo [inicio, fin] día a día y clasifica cada fracción:
 * - Trabajo efectivo
 * - Pausa factura
 * - Pausa observado
 * - Días no laborables (fines de semana y feriados)
 * - Post-autorización
 * - Exento
 *
 * Esto garantiza que la suma de componentes coincida con total_calendario_dias.
 */
export function calcularParticionTiempo(
  inicio: Date,
  fin: Date,
  tipoClasificacion: TipoClasificacionSegmento,
  feriadosSet: Set<string>
): {
  duracionCalendario: number;
  trabajo: number;
  pausaFactura: number;
  pausaObservado: number;
  noLaborables: number;
  postAutorizacion: number;
  exento: number;
} {
  const MS_POR_DIA = 24 * 60 * 60 * 1000;
  const duracionMs = Math.max(0, fin.getTime() - inicio.getTime());
  const duracionCalendario = duracionMs / MS_POR_DIA;

  if (duracionMs <= 0) {
    return {
      duracionCalendario: 0,
      trabajo: 0,
      pausaFactura: 0,
      pausaObservado: 0,
      noLaborables: 0,
      postAutorizacion: 0,
      exento: 0,
    };
  }

  let trabajo = 0;
  let pausaFactura = 0;
  let pausaObservado = 0;
  let noLaborables = 0;
  let postAutorizacion = 0;
  let exento = 0;

  // Recorrer día a día
  const tCur = new Date(inicio.getTime());

  while (tCur.getTime() < fin.getTime()) {
    // Medianoche UTC del día actual
    const diaInicio = new Date(Date.UTC(tCur.getUTCFullYear(), tCur.getUTCMonth(), tCur.getUTCDate(), 0, 0, 0, 0));
    const diaFin = new Date(Date.UTC(tCur.getUTCFullYear(), tCur.getUTCMonth(), tCur.getUTCDate() + 1, 0, 0, 0, 0));

    // Overlap entre [inicio, fin] y [diaInicio, diaFin]
    const s = Math.max(inicio.getTime(), diaInicio.getTime());
    const e = Math.min(fin.getTime(), diaFin.getTime());
    const overlapMs = Math.max(0, e - s);
    const fraccion = overlapMs / MS_POR_DIA;

    const esLaborable = esDiaLaborable(diaInicio, feriadosSet);

    if (!esLaborable) {
      // Fin de semana o feriado nacional siempre suma a no laborables
      noLaborables += fraccion;
    } else {
      // Día laborable -> asignar según clasificación del segmento
      switch (tipoClasificacion) {
        case "TRABAJO":
          trabajo += fraccion;
          break;
        case "PAUSA_FACTURA":
          pausaFactura += fraccion;
          break;
        case "PAUSA_OBSERVADO":
          pausaObservado += fraccion;
          break;
        case "POST_AUTORIZACION":
          postAutorizacion += fraccion;
          break;
        case "EXENTO":
          exento += fraccion;
          break;
      }
    }

    // Avanzar al siguiente día
    tCur.setUTCDate(tCur.getUTCDate() + 1);
    tCur.setUTCHours(0, 0, 0, 0);
  }

  return {
    duracionCalendario,
    trabajo,
    pausaFactura,
    pausaObservado,
    noLaborables,
    postAutorizacion,
    exento,
  };
}

/**
 * Función principal que calcula ambos relojes, genera segmentos y verifica la invariante.
 */
export function calcularTiemposTramite(
  tramite: TramiteCalculoInput,
  feriados: (string | Date | FeriadoInfo)[] = [],
  fechaReferenciaHoy: Date = new Date()
): ResultadoTiemposTramite {
  const feriadosSet = normalizarFeriadosSet(feriados);

  // 1. Evaluar calidad del dato y anomalías
  const evaluacion = evaluarCalidadDato(tramite);
  const padreGestion = (tramite.padre_gestion === "GARANTIA" || tramite.tipo_flujo === "GARANTIA")
    ? "GARANTIA"
    : "PAGO";

  const rec = parseDate(tramite.fecha_recepcion_fisica) || parseDate(tramite.fecha_ingreso);
  const ent = parseDate(tramite.fecha_entrega_control_previo);
  let jco = parseDate(tramite.fecha_aprobacion_presupuesto);
  if (!jco && tramite.historial_movimientos) {
    const movPase = tramite.historial_movimientos.find(m => m.tipo_accion === "PASE_A_CONTABILIDAD");
    if (movPase) jco = parseDate(movPase.fecha_hora);
  }
  const pag = parseDate(tramite.fecha_pago) || parseDate(tramite.fecha_autorizacion_pago);

  // Determinar si está en curso
  const estadosFinales = ["PAGADO", "ARCHIVO", "DEVUELTO", "INSUBSISTENTE", "ANULADO"];
  const enCurso = !estadosFinales.includes(tramite.estado_general.toUpperCase());

  // 2. Si es HISTORICO_PARCIAL: calcular únicamente los 3 tramos hábiles brutos
  if (evaluacion.calidad === "HISTORICO_PARCIAL") {
    let tramoSec: number | null = null;
    let tramoPres: number | null = null;
    let tramoContTes: number | null = null;
    let totalHabiles: number | null = null;
    let totalCal: number | null = null;

    if (rec && ent && ent.getTime() >= rec.getTime()) {
      tramoSec = calcularDiasHabilesBrutos(rec, ent, feriadosSet);
    }
    if (ent && jco && jco.getTime() >= ent.getTime()) {
      tramoPres = calcularDiasHabilesBrutos(ent, jco, feriadosSet);
    }
    if (jco && pag && pag.getTime() >= jco.getTime()) {
      tramoContTes = calcularDiasHabilesBrutos(jco, pag, feriadosSet);
    }

    if (rec && pag && pag.getTime() >= rec.getTime()) {
      totalHabiles = calcularDiasHabilesBrutos(rec, pag, feriadosSet);
      totalCal = Number(((pag.getTime() - rec.getTime()) / (24 * 60 * 60 * 1000)).toFixed(1));
    }

    let estadoCierre: "PAGADO" | "SIN_FECHA_PAGO" | "EN_CURSO" | "ARCHIVADO_SIN_PAGO" = "PAGADO";
    if (!pag) {
      if (tramite.estado_general.toUpperCase() === "ARCHIVO") {
        estadoCierre = "ARCHIVADO_SIN_PAGO";
      } else if (enCurso) {
        estadoCierre = "EN_CURSO";
      } else {
        estadoCierre = "SIN_FECHA_PAGO";
      }
    }

    const histParcial: MetricasHistoricoParcial = {
      tramo_secretaria_habiles: tramoSec,
      tramo_presupuesto_habiles: tramoPres,
      tramo_contabilidad_tesoreria_habiles: tramoContTes,
      total_habiles_brutos: totalHabiles,
      total_calendario_dias: totalCal,
      estado_cierre: estadoCierre,
      nota_metodologica:
        "Días hábiles brutos (excluye fines de semana y feriados). Incluye esperas no registradas. Reloj B no aplica.",
    };

    const relojA: MetricasRelojA = {
      total_calendario_dias: totalCal || 0,
      dias_laborables_trabajo: totalHabiles || 0,
      dias_pausa_factura: 0,
      dias_pausa_observado: 0,
      dias_no_laborables: totalCal && totalHabiles ? Math.max(0, totalCal - totalHabiles) : 0,
      dias_post_autorizacion: 0,
      dias_exento: 0,
      invariante_cumplida: true,
      diferencia_invariante: 0,
    };

    const relojB: MetricasRelojB = {
      aplica: false,
      dias_laborables_efectivos: "n/d",
      fase_secretaria_dias: "n/d",
      fase_presupuesto_dias: "n/d",
      fase_contabilidad_dias: "n/d",
      fase_dfi_dias: "n/d",
      fase_tesoreria_dias: "n/d",
    };

    const fechaFinHist = pag || (enCurso ? fechaReferenciaHoy : (parseDate(tramite.fecha_ultimo_movimiento) || fechaReferenciaHoy));
    const totalCalCalculado = rec && pag && pag.getTime() >= rec.getTime()
      ? Number(((pag.getTime() - rec.getTime()) / (24 * 60 * 60 * 1000)).toFixed(1))
      : Number(((fechaFinHist.getTime() - (rec ? rec.getTime() : fechaFinHist.getTime())) / (24 * 60 * 60 * 1000)).toFixed(1));

    const totalHabilesCalculado = rec
      ? calcularDiasHabilesBrutos(rec, pag && pag.getTime() >= rec.getTime() ? pag : fechaFinHist, feriadosSet)
      : 0;

    let diasEsperaPagoHist = 0;
    if (tramite.fecha_autorizacion_pago && pag && pag.getTime() >= parseDate(tramite.fecha_autorizacion_pago)!.getTime()) {
      diasEsperaPagoHist = calcularDiasHabilesBrutos(parseDate(tramite.fecha_autorizacion_pago)!, pag, feriadosSet);
    }

    const diasPausaHist = tramite.esta_pausado ? 1.0 : 0.0;
    const diasNoLabHist = Math.max(0, Number((totalCalCalculado - totalHabilesCalculado).toFixed(1)));
    const tiempoRealTrabajadoHist = Math.max(0, Number((totalHabilesCalculado - diasEsperaPagoHist - diasPausaHist).toFixed(1)));

    return {
      id_tramite: tramite.id_tramite,
      codigo_tramite: tramite.codigo_tramite,
      numero_quipux: tramite.numero_quipux,
      padre_gestion: padreGestion,
      calidad_dato: "HISTORICO_PARCIAL",
      alerta_inconsistencia: evaluacion.alerta,
      motivos_alerta: evaluacion.motivos,
      propuestas_correccion: evaluacion.propuestas,
      es_analista_compartido: evaluacion.analistaCompartido,
      analistas_detectados: evaluacion.analistas,
      en_curso: enCurso,
      estado_general: tramite.estado_general,

      tiempo_total_calendario_dias: totalCalCalculado,
      tiempo_real_trabajado_dias: tiempoRealTrabajadoHist,
      dias_pausa: diasPausaHist,
      dias_no_laborables: diasNoLabHist,
      dias_espera_pago: diasEsperaPagoHist,
      desglose: {
        dias_pausa: diasPausaHist,
        dias_no_laborables: diasNoLabHist,
        dias_espera_pago: diasEsperaPagoHist,
      },

      reloj_a: relojA,
      reloj_b: relojB,
      historico_parcial: histParcial,
      segmentos: [],
    };
  }

  // 3. Caso COMPLETO o INCOMPLETO con línea de tiempo real
  const fechaInicio = rec || fechaReferenciaHoy;
  let fechaFin = pag;

  if (!fechaFin) {
    if (enCurso) {
      fechaFin = fechaReferenciaHoy;
    } else {
      fechaFin = parseDate(tramite.fecha_ultimo_movimiento) || fechaReferenciaHoy;
    }
  }

  // Construcción de segmentos a partir de historial_movimientos
  const segmentos: SegmentoTiempo[] = [];
  const movimientos = [...(tramite.historial_movimientos || [])].sort((a, b) => {
    const tA = parseDate(a.fecha_hora)?.getTime() || 0;
    const tB = parseDate(b.fecha_hora)?.getTime() || 0;
    return tA - tB;
  });

  if (movimientos.length === 0) {
    // Si no hay movimientos, un único segmento desde fechaInicio a fechaFin
    const tipo: TipoClasificacionSegmento =
      tramite.estado_general === "DEVUELTO" || tramite.estado_general === "INSUBSISTENTE"
        ? "EXENTO"
        : tramite.esta_pausado
        ? "PAUSA_FACTURA"
        : "TRABAJO";

    segmentos.push({
      inicio: fechaInicio,
      fin: fechaFin,
      tipo_clasificacion: tipo,
      estado: tramite.estado_general,
      duracion_calendario_dias: Math.max(0, (fechaFin.getTime() - fechaInicio.getTime()) / (24 * 3600 * 1000)),
    });
  } else {
    // Reconstruir segmentos continuos mediante máquina de estados de eventos
    let segInicio = fechaInicio;
    let estadoActual = movimientos[0]?.tipo_accion || tramite.estado_general;
    let tipoSegActual: TipoClasificacionSegmento = clasificarTipoMovimiento(
      estadoActual,
      tramite.estado_general
    );
    let areaActual: number | undefined = movimientos[0]?.id_area_destino;
    let custodioActual: number | undefined = movimientos[0]?.id_usuario_recibe;

    for (let i = 0; i < movimientos.length; i++) {
      const mov = movimientos[i];
      const movFecha = parseDate(mov.fecha_hora);
      if (!movFecha) continue;

      if (movFecha.getTime() > segInicio.getTime()) {
        const segFin = movFecha;
        segmentos.push({
          inicio: segInicio,
          fin: segFin,
          tipo_clasificacion: tipoSegActual,
          estado: estadoActual,
          area_id: areaActual,
          custodio_id: custodioActual,
          duracion_calendario_dias: Math.max(0, (segFin.getTime() - segInicio.getTime()) / (24 * 3600 * 1000)),
        });
        segInicio = segFin;
      }

      // El evento actual actualiza el estado activo hacia adelante
      estadoActual = mov.tipo_accion;
      tipoSegActual = clasificarTipoMovimiento(mov.tipo_accion, tramite.estado_general);
      areaActual = mov.id_area_destino;
      custodioActual = mov.id_usuario_recibe;
    }

    // Segmento final hasta fechaFin
    if (fechaFin.getTime() > segInicio.getTime()) {
      segmentos.push({
        inicio: segInicio,
        fin: fechaFin,
        tipo_clasificacion: tipoSegActual,
        estado: estadoActual,
        area_id: areaActual,
        custodio_id: custodioActual,
        duracion_calendario_dias: Math.max(0, (fechaFin.getTime() - segInicio.getTime()) / (24 * 3600 * 1000)),
      });
    }
  }

  // Acumular métricas de Reloj A particionando día a día
  let sumTrabajo = 0;
  let sumPausaFactura = 0;
  let sumPausaObservado = 0;
  let sumNoLaborables = 0;
  let sumPostAutorizacion = 0;
  let sumExento = 0;
  let sumTotalCalendario = 0;

  for (const seg of segmentos) {
    const part = calcularParticionTiempo(seg.inicio, seg.fin, seg.tipo_clasificacion, feriadosSet);
    sumTotalCalendario += part.duracionCalendario;
    sumTrabajo += part.trabajo;
    sumPausaFactura += part.pausaFactura;
    sumPausaObservado += part.pausaObservado;
    sumNoLaborables += part.noLaborables;
    sumPostAutorizacion += part.postAutorizacion;
    sumExento += part.exento;
  }

  // Redondear a 1 decimal
  const totalCal = Number(sumTotalCalendario.toFixed(1));
  const trabCal = Number(sumTrabajo.toFixed(1));
  const pausaFactCal = Number(sumPausaFactura.toFixed(1));
  const pausaObsCal = Number(sumPausaObservado.toFixed(1));
  const noLabCal = Number(sumNoLaborables.toFixed(1));
  const postAutCal = Number(sumPostAutorizacion.toFixed(1));
  const exentoCal = Number(sumExento.toFixed(1));

  const sumaComponentes = trabCal + pausaFactCal + pausaObsCal + noLabCal + postAutCal + exentoCal;
  const difInvariante = Number(Math.abs(sumaComponentes - totalCal).toFixed(2));
  const invarianteCumplida = difInvariante <= 0.15; // Tolerancia 0.1d (0.15 para redondeos acumulados)

  const relojA: MetricasRelojA = {
    total_calendario_dias: totalCal,
    dias_laborables_trabajo: trabCal,
    dias_pausa_factura: pausaFactCal,
    dias_pausa_observado: pausaObsCal,
    dias_no_laborables: noLabCal,
    dias_post_autorizacion: postAutCal,
    dias_exento: exentoCal,
    invariante_cumplida: invarianteCumplida,
    diferencia_invariante: difInvariante,
  };

  // Cálculo de Reloj B (Tiempo de Trabajo Real en días hábiles efectivos)
  // Hasta la autorización de pago en Tesorería
  const relojB: MetricasRelojB = {
    aplica: evaluacion.calidad === "COMPLETO",
    dias_laborables_efectivos: trabCal,
    fase_secretaria_dias: calcularFaseDias(segmentos, ["SECRETARIA", "INGRESO_EXPEDIENTE", "RADICACION"], feriadosSet),
    fase_presupuesto_dias: calcularFaseDias(segmentos, ["PRESUPUESTO", "ASIGNAR_ANALISTA_PRESUPUESTO", "VISTO_BUENO_PRESUPUESTO", "DESPACHO_LOTE_PRESUPUESTO"], feriadosSet),
    fase_contabilidad_dias: calcularFaseDias(segmentos, ["CONTABILIDAD", "ASIGNAR_ANALISTA_CONTABLE", "DEVENGADO_REGISTRADO", "APROBACION_CONTABLE", "DERIVAR_A_CONTABILIDAD"], feriadosSet),
    fase_dfi_dias: calcularFaseDias(segmentos, ["DFI", "AUTORIZAR_PAGO_DFI"], feriadosSet),
    fase_tesoreria_dias: calcularFaseDias(segmentos, ["TESORERIA", "PROGRAMAR_Y_PAGAR_MEF_BCE", "PAGO_CONFIRMADO"], feriadosSet),
  };

  const diasPausaComp = Number((pausaFactCal + pausaObsCal).toFixed(1));

  return {
    id_tramite: tramite.id_tramite,
    codigo_tramite: tramite.codigo_tramite,
    numero_quipux: tramite.numero_quipux,
    padre_gestion: padreGestion,
    calidad_dato: evaluacion.calidad,
    alerta_inconsistencia: evaluacion.alerta,
    motivos_alerta: evaluacion.motivos,
    propuestas_correccion: evaluacion.propuestas,
    es_analista_compartido: evaluacion.analistaCompartido,
    analistas_detectados: evaluacion.analistas,
    en_curso: enCurso,
    estado_general: tramite.estado_general,

    tiempo_total_calendario_dias: totalCal,
    tiempo_real_trabajado_dias: trabCal,
    dias_pausa: diasPausaComp,
    dias_no_laborables: noLabCal,
    dias_espera_pago: postAutCal,
    desglose: {
      dias_pausa: diasPausaComp,
      dias_no_laborables: noLabCal,
      dias_espera_pago: postAutCal,
    },

    reloj_a: relojA,
    reloj_b: relojB,
    segmentos,
  };
}

export function clasificarTipoMovimiento(
  tipoAccion: string,
  estadoFallback: string = ""
): TipoClasificacionSegmento {
  const act = (tipoAccion || "").toUpperCase();
  const est = (estadoFallback || "").toUpperCase();

  // 1. Acciones explícitas de reanudación o subsanación
  if (act.includes("REANUDAR") || act.includes("SUBSANAR")) {
    return "TRABAJO";
  }

  // 2. Pausas por factura
  if (act.includes("FACTURA") || act.includes("PAUSA_FACTURA")) {
    return "PAUSA_FACTURA";
  }

  // 3. Pausas por observación
  if (act.includes("OBSERV") || act.includes("NOVEDAD")) {
    return "PAUSA_OBSERVADO";
  }

  // 4. Exentos (devolución o insubsistencia)
  if (act.includes("DEVOLUC") || act.includes("INSUBSIST")) {
    return "EXENTO";
  }

  // 5. Post-autorización y pago
  if (
    act.includes("AUTORIZAR_PAGO") ||
    act.includes("PAGO_CONFIRMADO") ||
    act.includes("PROGRAMAR_Y_PAGAR") ||
    act.includes("ARCHIVAR") ||
    act.includes("CAJA")
  ) {
    return "POST_AUTORIZACION";
  }

  // 6. Acciones conocidas de trabajo
  if (
    act.includes("INGRESO") ||
    act.includes("ASIGNAC") ||
    act.includes("ASIGNAR") ||
    act.includes("VISTO_BUENO") ||
    act.includes("DESPACHO") ||
    act.includes("PASE") ||
    act.includes("DEVENGADO") ||
    act.includes("APROBACION") ||
    act.includes("REVISION") ||
    act.includes("RADICAC") ||
    act.includes("DERIVAR")
  ) {
    return "TRABAJO";
  }

  // 7. Fallback según estado del segmento si la acción no fue concluyente
  if (est === "FACTURA") return "PAUSA_FACTURA";
  if (est === "OBSERVADO" || est === "OBSERVADO_72H") return "PAUSA_OBSERVADO";
  if (est === "DEVUELTO" || est === "INSUBSISTENTE") return "EXENTO";
  if (est === "PAGADO" || est === "CAJA" || est === "ARCHIVO") return "POST_AUTORIZACION";

  return "TRABAJO";
}

function calcularFaseDias(
  segmentos: SegmentoTiempo[],
  palabrasClave: string[],
  feriadosSet: Set<string>
): number {
  let dias = 0;
  for (const seg of segmentos) {
    if (seg.tipo_clasificacion !== "TRABAJO") continue;
    const match = palabrasClave.some(
      kw =>
        seg.estado.toUpperCase().includes(kw) ||
        (seg.area_nombre && seg.area_nombre.toUpperCase().includes(kw))
    );
    if (match) {
      const part = calcularParticionTiempo(seg.inicio, seg.fin, "TRABAJO", feriadosSet);
      dias += part.trabajo;
    }
  }
  return Number(dias.toFixed(1));
}
