/**
 * SERVICIO DE REPORTERÍA Y AUDITORÍA DE TIEMPOS INSTITUCIONAL SENAE
 * Archivo: src/services/reportesTiemposService.ts
 *
 * Conecta el motor de cálculo puro (src/lib/tiemposCalculator.ts) con Prisma ORM.
 * Implementa filtros de negocio robustos, procesamiento en lote anti-N+1,
 * cálculo de Reloj A, Reloj B, desglose por analistas (separando compartidos)
 * y análisis por procesos canónicos con diagnóstico de causas raíz.
 *
 * REGLA INMUTABLE: El estado contable oficial es CONTABILIDAD (nunca CONTROL_PREVIO).
 */

import { prisma } from "@/lib/prisma";
import {
  calcularTiemposTramite,
  evaluarCalidadDato,
  normalizarFeriadosSet,
  calcularDiasHabilesBrutos,
  parseDate,
  toIsoDateOnly,
  ResultadoTiemposTramite,
  TramiteCalculoInput,
  CalidadDato,
  MovimientoBitacora,
} from "@/lib/tiemposCalculator";
import { getSLAConfig } from "@/lib/slaCalculator";

export interface FiltrosReportesTiempos {
  padre_gestion?: "TODOS" | "PAGO" | "GARANTIA" | string;
  fecha_desde?: string | Date;
  fecha_hasta?: string | Date;
  criterio_fecha?: "INGRESO" | "MEMORANDO" | "ULTIMO_MOVIMIENTO" | "RECEPCION" | string;
  id_tipo_tramite?: number | string;
  codigo_proceso?: string;
  codigo_proceso_canonico?: string;
  id_area?: number | string;
  id_funcionario?: number | string;
  modo_funcionario?: "TODOS" | "CUSTODIO_ACTUAL" | "ANALISTA_HISTORICO" | string;
  estado_general?: string;
  sub_estado?: string;
  tipo_gestion?: string;
  calidad_dato?: "TODOS" | "COMPLETO" | "HISTORICO_PARCIAL" | "INCOMPLETO" | string;
  estado_filtro?: "TODOS" | "COMPLETADOS" | "EN_CURSO" | string;
  busqueda?: string;
}

export interface PaginacionInput {
  pagina?: number;
  limite?: number;
}

export interface DesgloseExplicativoItem {
  dias_pausa: number;
  dias_no_laborables: number;
  dias_espera_pago: number;
}

export interface TramiteAuditoriaItem {
  id_tramite: number;
  codigo_tramite: string;
  numero_quipux: string;
  padre_gestion: "PAGO" | "GARANTIA";
  tipo_flujo: string;
  tipo_gestion: string | null;
  proveedor_beneficiario: string;
  ruc_proveedor: string | null;
  asunto: string | null;
  monto_total: number;
  tipo_proceso: string;
  tipo_codigo: string;
  id_tipo_tramite: number;
  area_actual: string;
  id_area_actual: number;
  custodio_actual: string;
  id_custodio_actual: number;
  analista_asignado?: string;
  id_analista_asignado?: number;
  estado_general: string;
  sub_estado?: string | null;
  fecha_ingreso: string | null;
  fecha_recepcion_fisica: string | null;
  fecha_memorando: string | null;
  fecha_pago: string | null;
  fecha_ultimo_movimiento: string | null;
  esta_pausado: boolean;
  motivo_pausa: string | null;
  calidad_dato: CalidadDato;
  alerta_inconsistencia: boolean;
  motivos_alerta: string[];
  propuestas_correccion: string[];
  es_analista_compartido: boolean;
  analistas_detectados: string[];
  en_curso: boolean;

  // Indicadores clave
  tiempo_total_calendario_dias: number;
  tiempo_real_trabajado_dias: number;

  // Desglose explicativo
  dias_pausa: number;
  dias_no_laborables: number;
  dias_espera_pago: number;
  desglose: DesgloseExplicativoItem;

  reloj_a: {
    total_calendario_dias: number;
    dias_laborables_trabajo: number;
    dias_pausa_factura: number;
    dias_pausa_observado: number;
    dias_no_laborables: number;
    dias_post_autorizacion: number;
    dias_exento: number;
    invariante_cumplida: boolean;
    diferencia_invariante: number;
  };
  reloj_b: {
    aplica: boolean;
    dias_laborables_efectivos: number | "n/d";
    fase_secretaria_dias: number | "n/d";
    fase_presupuesto_dias: number | "n/d";
    fase_contabilidad_dias: number | "n/d";
    fase_dfi_dias: number | "n/d";
    fase_tesoreria_dias: number | "n/d";
  };
  historico_parcial?: {
    tramo_secretaria_habiles: number | null;
    tramo_presupuesto_habiles: number | null;
    tramo_contabilidad_tesoreria_habiles: number | null;
    total_habiles_brutos: number | null;
    total_calendario_dias: number | null;
    estado_cierre: string;
    nota_metodologica: string;
  };
  alerta_sla: "VERDE" | "AMBAR" | "ROJO" | "EXENTO" | "PENDIENTE";
}

export type FiltrosReporte = FiltrosReportesTiempos;
export type TramiteAuditado = TramiteAuditoriaItem;

export interface DetalleExpedienteFuncionario {
  funcionario_nombre: string;
  codigo_tramite: string;
  numero_quipux: string;
  tipo_proceso: string;
  proveedor_beneficiario: string;
  fecha_ingreso_mesa: Date | string | null;
  fecha_salida_mesa: Date | string | null;
  dias_habiles_mesa: number;
  limite_sla: number;
  estado_sla: "A Tiempo" | "Con Retraso" | "En Curso";
  es_compartido: boolean;
}

export interface RendimientoFuncionarioItem {
  id_usuario: number;
  nombre?: string;
  nombre_completo: string;
  cargo: string;
  iniciales: string | null;
  area?: string;
  area_nombre: string;
  id_area: number;

  // Dimensión 1: Productividad Histórica del Analista (id_analista_presupuesto_previo)
  total_asignados_historico: number;
  total_despachados: number;
  mediana_dias_presupuesto: number;
  promedio_dias_presupuesto: number;
  en_observacion_pausados: number;
  porcentaje_productividad: number;
  porcentaje_cumplimiento_sla_presupuesto: number;
  productividad_historica: {
    total_asignados_historico: number;
    total_despachados: number;
    mediana_dias_presupuesto: number;
    promedio_dias_presupuesto: number;
    en_observacion_pausados: number;
    porcentaje_productividad: number;
    porcentaje_cumplimiento_sla_presupuesto: number;
  };

  // Dimensión 2: Carga Activa Hoy / Pendientes (id_custodio_actual en estados REVISION, OBSERVADO, DFI)
  pendientes_en_revision: number;
  pendientes_observados: number;
  pendientes_dfi: number;
  total_pendientes_custodia: number;
  carga_activa: {
    pendientes_en_revision: number;
    pendientes_observados: number;
    pendientes_dfi: number;
    total_pendientes_custodia: number;
  };

  // Campos retrocompatibles existentes:
  total_asignados: number;
  total_recibidos?: number;
  tramites_despachados?: number;
  despachados?: number;
  total_en_curso: number;
  en_curso?: number;
  tiempo_promedio_trabajo_dias?: number;
  tiempo_promedio_dias?: number;
  tiempo_mediana_trabajo_dias?: number;
  mediana_dias_despacho: number;
  mediana_dias?: number;
  p90_dias_despacho: number;
  p90_dias?: number;
  tasa_cumplimiento: number;
  tasa_cumplimiento_sla?: number;
  evaluacion_sla?: "Óptimo" | "Aceptable" | "Crítico" | "En Riesgo";
  sla_limite_dias: number;
  tramites_ids: number[];
  tramites_resumen: Array<{
    id_tramite: number;
    numero_quipux: string;
    proveedor: string;
    monto_total: number;
    dias_despacho: number;
    estado_general: string;
    cumple_sla: boolean;
    alerta_inconsistencia: boolean;
  }>;
}

export interface SeccionAnalisisCompartido {
  titulo: string;
  descripcion: string;
  total_tramites: number;
  mediana_dias_despacho: number;
  p90_dias_despacho: number;
  tasa_cumplimiento: number;
  tramites_ids: number[];
  grupos: Array<{
    analistas: string;
    total_tramites: number;
    mediana_dias_despacho: number;
    p90_dias_despacho: number;
    tasa_cumplimiento: number;
    tramites_ids: number[];
  }>;
}

export interface AuditoriaProcesoItem {
  id_tipo_tramite: number;
  codigo_proceso: string;
  nombre_proceso: string;
  tipo_proceso: string;
  nombre_tipo_proceso: string;
  cantidad_tramites: number;
  total_tramites: number;
  tiempo_total_promedio_dias: number;
  tiempo_total_mediana_dias: number;
  mediana_dias_totales: number;
  tiempo_real_trabajado_promedio_dias: number;
  tiempo_real_trabajado_mediana_dias: number;
  promedio_dias_habiles: number;
  p90_dias_totales: number;
  tasa_cumplimiento: number;
  fase_mayor_demora: string;
  frase_diagnostica: string;
  fases_promedio: {
    secretaria: number;
    presupuesto: number;
    contabilidad: number;
    dfi: number;
    tesoreria: number;
  };
  tramites_en_plazo: number;
  tramites_vencidos: number;
  tramites_ids: number[];
  monto_total?: number;
  tiempo_total_promedio?: number;
  tiempo_real_promedio?: number;
  familia_canonica?: string;
  codigo_familia?: string;
  nombre_familia?: string;
}

export interface FamiliaCanonicaItem {
  codigo_familia: string;
  nombre_familia: string;
  total_tramites: number;
  mediana_dias_totales: number;
  p90_dias_totales: number;
  tasa_cumplimiento: number;
  fase_mayor_demora: string;
  frase_diagnostica: string;
  tramites_ids: number[];
}

export type FamiliaProcesoItem = FamiliaCanonicaItem;

// -------------------------------------------------------------
// CATÁLOGO CANÓNICO DE PROCESOS (10 FAMILIAS INSTITUCIONALES)
// -------------------------------------------------------------
export const FAMILIAS_CANONICAS: Record<
  string,
  { codigo: string; nombre: string; tiposIds: number[] }
> = {
  SERV_BASICOS: { codigo: "SERV_BASICOS", nombre: "Servicios Básicos", tiposIds: [1] },
  INFIMA_CUANTIA: { codigo: "INFIMA_CUANTIA", nombre: "Ínfima Cuantía", tiposIds: [2] },
  CONTRATACION_SNCP: { codigo: "CONTRATACION_SNCP", nombre: "Contratación Pública (SNCP)", tiposIds: [3] },
  TALENTO_HUMANO: { codigo: "TALENTO_HUMANO", nombre: "Talento Humano y Nómina", tiposIds: [4, 12] },
  CAJA_CHICA: { codigo: "CAJA_CHICA", nombre: "Fondos y Caja Chica", tiposIds: [5] },
  VIATICOS: { codigo: "VIATICOS", nombre: "Viáticos y Reembolsos", tiposIds: [8, 13] },
  GARANTIAS_CAUCIONES: { codigo: "GARANTIAS_CAUCIONES", nombre: "Garantías y Cauciones", tiposIds: [6, 7, 16] },
  TASAS_IMPUESTOS: { codigo: "TASAS_IMPUESTOS", nombre: "Tasas y Matrículas", tiposIds: [9, 10] },
  CONVENIOS_SEGUROS: { codigo: "CONVENIOS_SEGUROS", nombre: "Convenios y Seguros", tiposIds: [11, 14, 15] },
  OTROS: { codigo: "OTROS", nombre: "Otros Procesos", tiposIds: [17] },
};

export function encontrarFamiliaCanonica(idTipoTramite: number): { codigo: string; nombre: string } {
  for (const [key, fam] of Object.entries(FAMILIAS_CANONICAS)) {
    if (fam.tiposIds.includes(idTipoTramite)) {
      return { codigo: fam.codigo, nombre: fam.nombre };
    }
  }
  return { codigo: "OTROS", nombre: "Otros Procesos" };
}

// -------------------------------------------------------------
// FUNCIONES MATEMÁTICAS ROBUSTAS: MEDIANA (P50) Y PERCENTIL P90
// -------------------------------------------------------------
export function calcularPromedio(valores: number[]): number {
  if (!valores || valores.length === 0) return 0;
  const validos = valores.filter((v) => typeof v === "number" && !isNaN(v));
  if (validos.length === 0) return 0;
  const suma = validos.reduce((a, b) => a + b, 0);
  return Number((suma / validos.length).toFixed(1));
}

export function calcularMediana(valores: number[]): number {
  if (!valores || valores.length === 0) return 0;
  const ordenados = [...valores].filter((v) => typeof v === "number" && !isNaN(v)).sort((a, b) => a - b);
  if (ordenados.length === 0) return 0;

  const mitad = Math.floor(ordenados.length / 2);
  if (ordenados.length % 2 !== 0) {
    return Number(ordenados[mitad].toFixed(1));
  }
  return Number(((ordenados[mitad - 1] + ordenados[mitad]) / 2).toFixed(1));
}

export function calcularPercentil(valores: number[], p: number): number {
  if (!valores || valores.length === 0) return 0;
  const ordenados = [...valores].filter((v) => typeof v === "number" && !isNaN(v)).sort((a, b) => a - b);
  if (ordenados.length === 0) return 0;
  if (ordenados.length === 1) return Number(ordenados[0].toFixed(1));

  const pNormalizado = Math.max(0, Math.min(100, p));
  const indice = (pNormalizado / 100) * (ordenados.length - 1);
  const inferior = Math.floor(indice);
  const superior = Math.ceil(indice);
  const peso = indice - inferior;

  if (inferior === superior) {
    return Number(ordenados[inferior].toFixed(1));
  }
  const interpolado = ordenados[inferior] * (1 - peso) + ordenados[superior] * peso;
  return Number(interpolado.toFixed(1));
}

// -------------------------------------------------------------
// GENERADOR DE DIAGNÓSTICO DE CAUSA RAÍZ
// -------------------------------------------------------------
export function generarFraseDiagnostica(
  faseMayorDemora: string,
  tasaCumplimiento: number,
  pausaFacturaPromedio: number = 0
): string {
  if (pausaFacturaPromedio >= 2.0) {
    return "Frecuente suspensión de términos atribuible a espera de emisión de factura SRI por proveedores.";
  }
  if (tasaCumplimiento >= 90) {
    return "Flujo institucional ágil con alta tasa de cumplimiento normativo dentro del plazo SLA.";
  }

  const faseUpper = faseMayorDemora.toUpperCase();
  if (faseUpper.includes("CONTABILIDAD")) {
    return "Cuello de botella principal en Contabilidad por validación de devengado, retenciones eSIGEF y control previo documental.";
  }
  if (faseUpper.includes("PRESUPUESTO")) {
    return "Mayor demora en Presupuesto por verificación de partidas, reformas y disponibilidad de certificación.";
  }
  if (faseUpper.includes("SECRETARIA") || faseUpper.includes("DFI")) {
    return "Demora en etapa de radicación física inicial en Secretaría DFI y asignación de analistas.";
  }
  if (faseUpper.includes("TESORERIA") || faseUpper.includes("CAJA")) {
    return "Demora concentrada en programación de pago, dispersión bancaria SPI/BCE o emisión de comprobantes.";
  }
  return "Tiempo de procesamiento balanceado entre fases operativas.";
}

// -------------------------------------------------------------
// BATCHING EFICIENTE DE HISTORIAL DE MOVIMIENTOS (ANTI-N+1)
// -------------------------------------------------------------
async function batchFetchMovimientos(
  tramiteIds: number[]
): Promise<(MovimientoBitacora & { id_tramite: number })[]> {
  if (!tramiteIds || tramiteIds.length === 0) return [];

  // SQLite soporta hasta 999 parámetros con seguridad
  const CHUNK_SIZE = 800;
  const resultado: any[] = [];

  for (let i = 0; i < tramiteIds.length; i += CHUNK_SIZE) {
    const chunk = tramiteIds.slice(i, i + CHUNK_SIZE);
    const movs = await prisma.historial_movimientos.findMany({
      where: { id_tramite: { in: chunk } },
      select: {
        id_movimiento: true,
        id_tramite: true,
        tipo_accion: true,
        fecha_hora: true,
        id_area_origen: true,
        id_area_destino: true,
        id_usuario_entrega: true,
        id_usuario_recibe: true,
        comentarios: true,
      },
      orderBy: { fecha_hora: "asc" },
    });
    resultado.push(...movs);
  }

  return resultado;
}

// -------------------------------------------------------------
// CONSTRUCCIÓN DE CONDICIONES WHERE DE PRISMA
// -------------------------------------------------------------
function construirWherePrisma(filtros: FiltrosReportesTiempos) {
  const where: any = {};
  const andConditions: any[] = [];

  // 1. Padre de Gestión: "TODOS", "PAGO" o "GARANTIA"
  const padre = (filtros.padre_gestion || "").trim().toUpperCase();
  if (padre === "GARANTIA") {
    andConditions.push({
      OR: [
        { padre_gestion: "GARANTIA" },
        { tipo_flujo: "GARANTIA" },
      ],
    });
  } else if (padre === "PAGO") {
    andConditions.push({
      OR: [
        { padre_gestion: "PAGO" },
        { padre_gestion: null, tipo_flujo: { not: "GARANTIA" } },
      ],
    });
  } else if (padre === "TODOS" || padre === "ALL") {
    // Cuando sea "TODOS", no aplicar filtro de padre_gestion
  }

  // 1.1 Tipo de Gestión ("PAGO", "ARCHIVO", "EXPEDIENTE", "JUSTIFICACION", etc.)
  if (filtros.tipo_gestion && filtros.tipo_gestion !== "TODOS") {
    where.tipo_gestion = filtros.tipo_gestion.trim();
  }

  // 1.2 Sub-estado ("JUSTIFICACION_CONTABILIDAD", "EN_CONTABILIDAD", "ESPERA_FACTURA", "OBSERVADO", etc.)
  if (filtros.sub_estado && filtros.sub_estado !== "TODOS") {
    where.sub_estado = filtros.sub_estado.trim();
  }

  // 2. Criterio de Fecha y Rango Temporal
  const criterio = (filtros.criterio_fecha || "INGRESO").toUpperCase();
  let fDesde: Date | undefined;
  let fHasta: Date | undefined;

  if (filtros.fecha_desde) {
    const dStr = String(filtros.fecha_desde).split("T")[0];
    fDesde = new Date(`${dStr}T00:00:00.000Z`);
  }
  if (filtros.fecha_hasta) {
    const hStr = String(filtros.fecha_hasta).split("T")[0];
    fHasta = new Date(`${hStr}T23:59:59.999Z`);
  }

  if (fDesde || fHasta) {
    const fechaClause: any = {};
    if (fDesde) fechaClause.gte = fDesde;
    if (fHasta) fechaClause.lte = fHasta;

    if (criterio === "MEMORANDO") {
      where.fecha_memorando = fechaClause;
    } else if (criterio === "ULTIMO_MOVIMIENTO") {
      where.fecha_ultimo_movimiento = fechaClause;
    } else if (criterio === "RECEPCION" || criterio === "RECEPCION_FISICA") {
      andConditions.push({
        OR: [
          { fecha_recepcion_fisica: fechaClause },
          { fecha_recepcion_fisica: null, fecha_ingreso: fechaClause },
        ],
      });
    } else {
      where.fecha_ingreso = fechaClause;
    }
  }

  // 3. Tipo de Proceso (normalizado directamente desde tipos_tramite y la BD)
  const codProceso = (filtros.codigo_proceso || filtros.codigo_proceso_canonico || "").trim().toUpperCase();
  if (filtros.id_tipo_tramite && filtros.id_tipo_tramite !== "TODOS") {
    where.id_tipo_tramite = Number(filtros.id_tipo_tramite);
  } else if (codProceso && codProceso !== "TODOS") {
    where.tipos_tramite = { codigo: codProceso };
  }

  // 4. Área actual
  if (filtros.id_area && filtros.id_area !== "TODAS" && filtros.id_area !== "TODOS") {
    where.id_area_actual = Number(filtros.id_area);
  }

  // 5. Funcionario con modo_funcionario opcional ("TODOS" | "CUSTODIO_ACTUAL" | "ANALISTA_HISTORICO")
  if (filtros.id_funcionario && filtros.id_funcionario !== "TODOS") {
    const idFunc = Number(filtros.id_funcionario);
    const modo = (filtros.modo_funcionario || "TODOS").toUpperCase();
    if (modo === "CUSTODIO_ACTUAL") {
      where.id_custodio_actual = idFunc;
    } else if (modo === "ANALISTA_HISTORICO") {
      where.id_analista_presupuesto_previo = idFunc;
    } else {
      andConditions.push({
        OR: [
          { id_custodio_actual: idFunc },
          { id_analista_presupuesto_previo: idFunc },
        ],
      });
    }
  }

  // 6. Estado General Oficial (CONTABILIDAD, PAGADO, DFI, REVISION, ARCHIVO, DEVUELTO, etc.)
  if (filtros.estado_general && filtros.estado_general !== "TODOS") {
    where.estado_general = filtros.estado_general.toUpperCase();
  }

  // 7. Filtro Estado: COMPLETADOS vs EN_CURSO
  if (filtros.estado_filtro === "COMPLETADOS") {
    where.estado_general = { in: ["PAGADO", "ARCHIVO", "DEVUELTO", "INSUBSISTENTE", "ANULADO"] };
  } else if (filtros.estado_filtro === "EN_CURSO") {
    where.estado_general = { notIn: ["PAGADO", "ARCHIVO", "DEVUELTO", "INSUBSISTENTE", "ANULADO"] };
  }

  // 8. Búsqueda por texto (quipux, proveedor, asunto, tramite)
  if (filtros.busqueda && filtros.busqueda.trim()) {
    const q = filtros.busqueda.trim();
    andConditions.push({
      OR: [
        { numero_quipux: { contains: q } },
        { proveedor_beneficiario: { contains: q } },
        { asunto: { contains: q } },
        { codigo_tramite: { contains: q } },
        { nro_tramite: { contains: q } },
        { ruc_proveedor: { contains: q } },
      ],
    });
  }

  if (andConditions.length > 0) {
    where.AND = andConditions;
  }

  return where;
}

// -------------------------------------------------------------
// RESOLUTOR DE ANALISTA ASIGNADO
// -------------------------------------------------------------
function resolverAnalistaTramite(
  tramite: any,
  resultado: ResultadoTiemposTramite,
  usuariosMap: Map<number, any>,
  inicialesMap: Map<string, any>
): { id_usuario?: number; nombre: string; cargo: string } {
  // 1. Si se detectó exactamente 1 analista en las iniciales
  if (resultado.analistas_detectados && resultado.analistas_detectados.length === 1) {
    const init = resultado.analistas_detectados[0].toUpperCase();
    const usr = inicialesMap.get(init);
    if (usr) {
      return {
        id_usuario: usr.id_usuario,
        nombre: usr.nombre_completo,
        cargo: usr.cargo,
      };
    }
  }

  // 2. Si tiene asignado id_analista_presupuesto_previo
  if (tramite.id_analista_presupuesto_previo) {
    const usr = usuariosMap.get(tramite.id_analista_presupuesto_previo);
    if (usr) {
      return {
        id_usuario: usr.id_usuario,
        nombre: usr.nombre_completo,
        cargo: usr.cargo,
      };
    }
  }

  // 3. Revisar en historial de movimientos
  if (tramite.historial_movimientos) {
    for (const m of tramite.historial_movimientos) {
      if (
        (m.tipo_accion === "ASIGNAR_ANALISTA_PRESUPUESTO" ||
          m.tipo_accion === "ASIGNACION_ANALISTA") &&
        m.id_usuario_recibe
      ) {
        const usr = usuariosMap.get(m.id_usuario_recibe);
        if (usr) {
          return {
            id_usuario: usr.id_usuario,
            nombre: usr.nombre_completo,
            cargo: usr.cargo,
          };
        }
      }
    }
  }

  // 4. Fallback al custodio actual
  const custodio = usuariosMap.get(tramite.id_custodio_actual);
  return {
    id_usuario: custodio?.id_usuario,
    nombre: custodio?.nombre_completo || "Sin Asignar",
    cargo: custodio?.cargo || "Funcionario",
  };
}

// -------------------------------------------------------------
// 1. OBTENER AUDITORÍA DE TRÁMITES (PESTAÑA 1)
// -------------------------------------------------------------
export async function obtenerAuditoriaTramites(
  filtros: FiltrosReportesTiempos = {},
  paginacion: PaginacionInput = {}
) {
  const tInicio = Date.now();
  const where = construirWherePrisma(filtros);

  // Obtener feriados vigentes
  const feriados = await prisma.feriados.findMany({
    where: { activo: true },
    select: { fecha: true },
  });
  const feriadosSet = normalizarFeriadosSet(feriados);

  // Consultar todos los trámites que cumplen las condiciones base
  const tramitesDb = await prisma.tramites.findMany({
    where,
    include: {
      tipos_tramite: true,
      areas: true,
      usuarios: true,
    },
    orderBy: { fecha_ingreso: "desc" },
  });

  const ids = tramitesDb.map((t) => t.id_tramite);

  // Carga eficiente en lote de historial_movimientos (anti-N+1)
  const todosLosMovimientos = await batchFetchMovimientos(ids);

  // Indexar movimientos por id_tramite
  const movsPorTramite = new Map<number, any[]>();
  for (const m of todosLosMovimientos) {
    const list = movsPorTramite.get(m.id_tramite);
    if (!list) {
      movsPorTramite.set(m.id_tramite, [m]);
    } else {
      list.push(m);
    }
  }

  // Consultar configuración SLA institucional
  const slaConfig = await getSLAConfig();
  const SLA_LIMITE = slaConfig.limite_dias || 6;

  // Cargar catálogo de usuarios para mapeo de iniciales
  const usuariosDb = await prisma.usuarios.findMany({
    include: { areas: true },
  });
  const usuariosMap = new Map<number, any>();
  const inicialesMap = new Map<string, any>();
  for (const u of usuariosDb) {
    usuariosMap.set(u.id_usuario, u);
    if (u.iniciales) {
      inicialesMap.set(u.iniciales.toUpperCase().trim(), u);
    }
  }

  // Calcular tiempos y métricas de cada trámite
  const todosCalculados: TramiteAuditoriaItem[] = [];

  for (const t of tramitesDb) {
    const movs = movsPorTramite.get(t.id_tramite) || [];
    const input: TramiteCalculoInput = {
      id_tramite: t.id_tramite,
      codigo_tramite: t.codigo_tramite,
      numero_quipux: t.numero_quipux,
      padre_gestion: t.padre_gestion,
      tipo_flujo: t.tipo_flujo,
      tipo_gestion: t.tipo_gestion,
      estado_general: t.estado_general,
      sub_estado: t.sub_estado,
      esta_pausado: t.esta_pausado,
      motivo_pausa: t.motivo_pausa,
      es_devuelto: t.es_devuelto,
      fecha_recepcion_fisica: t.fecha_recepcion_fisica,
      fecha_ingreso: t.fecha_ingreso,
      fecha_entrega_control_previo: t.fecha_entrega_control_previo,
      fecha_aprobacion_presupuesto: t.fecha_aprobacion_presupuesto,
      fecha_aprobacion_contabilidad: t.fecha_aprobacion_contabilidad,
      fecha_autorizacion_pago: t.fecha_autorizacion_pago,
      fecha_pago: t.fecha_pago,
      fecha_ultimo_movimiento: t.fecha_ultimo_movimiento,
      anexos: t.anexos,
      comentarios_bitacora: movs.map((m) => m.comentarios).filter(Boolean).join(" | "),
      historial_movimientos: movs,
    };

    const res = calcularTiemposTramite(input, feriados);

    // Filtro por calidad_dato si se especificó
    if (filtros.calidad_dato && filtros.calidad_dato !== "TODOS") {
      if (res.calidad_dato !== filtros.calidad_dato) {
        continue;
      }
    }

    const analistaInfo = resolverAnalistaTramite(t, res, usuariosMap, inicialesMap);

    // Semáforo SLA institucional diferenciado
    let semaforo: "VERDE" | "AMBAR" | "ROJO" | "EXENTO" | "PENDIENTE" = "VERDE";
    const esExento =
      t.estado_general === "INSUBSISTENTE" ||
      t.estado_general === "DEVUELTO" ||
      t.estado_general === "ANULADO" ||
      Boolean(t.es_devuelto) ||
      (t.estado_general === "ARCHIVO" && t.tipo_gestion === "ARCHIVO");

    const esPausadoOObservado =
      t.estado_general === "OBSERVADO" ||
      t.estado_general === "OBSERVADO_72H" ||
      Boolean(t.esta_pausado) ||
      t.sub_estado === "ESPERA_FACTURA" ||
      t.sub_estado === "OBSERVADO";

    if (esExento) {
      semaforo = "EXENTO";
    } else if (esPausadoOObservado) {
      // Estado pausado u observado: nunca ROJO para no castigar el porcentaje SLA por causas externas/falta de factura
      semaforo = "PENDIENTE";
    } else {
      // Evaluar SLA general comparando tiempo hábil desde fecha_entrega_control_previo hasta fecha_autorizacion_pago (sin incluir días previos de Secretaría DFI)
      let diasComparar = 0;
      const fEnt = parseDate(t.fecha_entrega_control_previo);
      const fAut = parseDate(t.fecha_autorizacion_pago) || parseDate(t.fecha_pago);

      if (fEnt && fAut && fAut.getTime() >= fEnt.getTime()) {
        diasComparar = calcularDiasHabilesBrutos(fEnt, fAut, feriadosSet);
      } else if (fEnt && res.en_curso) {
        diasComparar = calcularDiasHabilesBrutos(fEnt, new Date(), feriadosSet);
      } else if (res.historico_parcial) {
        // En histórico parcial: tramo presupuesto + tramo contabilidad/tesorería (excluyendo tramo secretaría)
        const pres = res.historico_parcial.tramo_presupuesto_habiles ?? 0;
        const cont = res.historico_parcial.tramo_contabilidad_tesoreria_habiles ?? 0;
        diasComparar = pres + cont;
      } else if (res.calidad_dato === "COMPLETO" && typeof res.reloj_b.dias_laborables_efectivos === "number") {
        // En reloj B completo: descontar fase secretaría de días efectivos
        const sec = typeof res.reloj_b.fase_secretaria_dias === "number" ? res.reloj_b.fase_secretaria_dias : 0;
        diasComparar = Math.max(0, res.reloj_b.dias_laborables_efectivos - sec);
      } else {
        diasComparar = res.tiempo_real_trabajado_dias;
      }

      if (diasComparar > SLA_LIMITE) {
        semaforo = "ROJO";
      } else if (diasComparar >= Math.ceil(SLA_LIMITE * 0.75)) {
        semaforo = "AMBAR";
      } else {
        semaforo = "VERDE";
      }
    }

    todosCalculados.push({
      id_tramite: t.id_tramite,
      codigo_tramite: t.codigo_tramite,
      numero_quipux: t.numero_quipux,
      padre_gestion: (t.padre_gestion === "GARANTIA" || t.tipo_flujo === "GARANTIA") ? "GARANTIA" : "PAGO",
      tipo_flujo: t.tipo_flujo,
      tipo_gestion: t.tipo_gestion,
      proveedor_beneficiario: t.proveedor_beneficiario || "No especificado",
      ruc_proveedor: t.ruc_proveedor,
      asunto: t.asunto,
      monto_total: Number(t.monto_total || 0),
      tipo_proceso: t.tipos_tramite?.nombre || "GENERAL",
      tipo_codigo: t.tipos_tramite?.codigo || "PROCESO",
      id_tipo_tramite: t.id_tipo_tramite,
      area_actual: t.areas?.nombre || "Sin Área",
      id_area_actual: t.id_area_actual,
      custodio_actual: t.usuarios?.nombre_completo || "Sin Custodio",
      id_custodio_actual: t.id_custodio_actual,
      analista_asignado: analistaInfo.nombre,
      id_analista_asignado: analistaInfo.id_usuario,
      estado_general: t.estado_general,
      sub_estado: t.sub_estado,
      fecha_ingreso: t.fecha_ingreso ? t.fecha_ingreso.toISOString() : null,
      fecha_recepcion_fisica: t.fecha_recepcion_fisica ? t.fecha_recepcion_fisica.toISOString() : null,
      fecha_memorando: t.fecha_memorando ? t.fecha_memorando.toISOString() : null,
      fecha_pago: t.fecha_pago ? t.fecha_pago.toISOString() : null,
      fecha_ultimo_movimiento: t.fecha_ultimo_movimiento ? t.fecha_ultimo_movimiento.toISOString() : null,
      esta_pausado: Boolean(t.esta_pausado),
      motivo_pausa: t.motivo_pausa,
      calidad_dato: res.calidad_dato,
      alerta_inconsistencia: res.alerta_inconsistencia,
      motivos_alerta: res.motivos_alerta,
      propuestas_correccion: res.propuestas_correccion,
      es_analista_compartido: res.es_analista_compartido,
      analistas_detectados: res.analistas_detectados,
      en_curso: res.en_curso,
      tiempo_total_calendario_dias: res.tiempo_total_calendario_dias,
      tiempo_real_trabajado_dias: res.tiempo_real_trabajado_dias,
      dias_pausa: res.dias_pausa,
      dias_no_laborables: res.dias_no_laborables,
      dias_espera_pago: res.dias_espera_pago,
      desglose: res.desglose,
      reloj_a: res.reloj_a,
      reloj_b: res.reloj_b,
      historico_parcial: res.historico_parcial,
      alerta_sla: semaforo,
    });
  }

  // -------------------------------------------------------------
  // CÁLCULO DE LOS 4 KPIS RESUMEN DE LA POBLACIÓN
  // -------------------------------------------------------------
  // KPI 1: Total de trámites analizados
  const totalAnalizados = todosCalculados.length;

  // KPI 2: Mediana tiempo total de auditoría (Reloj A: total calendario)
  const tiemposRelojA = todosCalculados.map((t) => t.reloj_a.total_calendario_dias);
  const medianaRelojA = calcularMediana(tiemposRelojA);

  // KPI 3: Mediana tiempo de trabajo real (Reloj B, solo COMPLETO)
  const tiemposRelojB = todosCalculados
    .filter((t) => t.calidad_dato === "COMPLETO" && typeof t.reloj_b.dias_laborables_efectivos === "number")
    .map((t) => t.reloj_b.dias_laborables_efectivos as number);
  const medianaRelojB = tiemposRelojB.length > 0 ? calcularMediana(tiemposRelojB) : "n/d";

  // KPI 4: Cantidad de trámites con alerta de inconsistencia
  const totalConAlerta = todosCalculados.filter((t) => t.alerta_inconsistencia).length;

  // Distribución de calidad de dato
  const distribucionCalidad = {
    completo: todosCalculados.filter((t) => t.calidad_dato === "COMPLETO").length,
    historico_parcial: todosCalculados.filter((t) => t.calidad_dato === "HISTORICO_PARCIAL").length,
    incompleto: todosCalculados.filter((t) => t.calidad_dato === "INCOMPLETO").length,
  };

  // Paginación
  const pagina = Math.max(1, paginacion.pagina || 1);
  const limite = Math.max(1, Math.min(50000, paginacion.limite || 50));
  const totalPaginas = Math.ceil(totalAnalizados / limite) || 1;
  const offset = (pagina - 1) * limite;
  const tramitesPaginados = todosCalculados.slice(offset, offset + limite);

  return {
    kpis: {
      total_tramites_analizados: totalAnalizados,
      mediana_tiempo_auditoria_dias: medianaRelojA,
      mediana_tiempo_trabajo_real_dias: medianaRelojB,
      cantidad_tramites_alerta: totalConAlerta,
      distribucion_calidad: distribucionCalidad,
    },
    resumen: {
      total_ingresados: totalAnalizados,
      total_registros: totalAnalizados,
      total_en_proceso: todosCalculados.filter((t) => t.en_curso).length,
      total_pagados: todosCalculados.filter((t) => t.estado_general === "PAGADO").length,
      total_observados_o_pausados: todosCalculados.filter((t) => t.esta_pausado || t.estado_general === "OBSERVADO").length,
      total_completos: distribucionCalidad.completo,
      total_historicos: distribucionCalidad.historico_parcial,
      total_incompletos: distribucionCalidad.incompleto,
      total_inconsistencias: totalConAlerta,
      total_con_alertas: totalConAlerta,
      tasa_invariante_cumplida_pct:
        totalAnalizados > 0
          ? Math.round(
              (todosCalculados.filter((t) => t.reloj_a.invariante_cumplida).length /
                totalAnalizados) *
                100
            )
          : 100,
    },
    sla_config: slaConfig,
    paginacion: {
      pagina,
      limite,
      total: totalAnalizados,
      total_paginas: totalPaginas,
    },
    tramites: tramitesPaginados,
    duracion_ms: Date.now() - tInicio,
  };
}

// -------------------------------------------------------------
// 2. OBTENER RENDIMIENTO DE FUNCIONARIOS (PESTAÑA 2)
// -------------------------------------------------------------
export async function obtenerRendimientoFuncionarios(filtros: FiltrosReportesTiempos = {}) {
  const where = construirWherePrisma(filtros);

  const feriados = await prisma.feriados.findMany({
    where: { activo: true },
    select: { fecha: true },
  });
  const feriadosSet = normalizarFeriadosSet(feriados);

  const tramitesDb = await prisma.tramites.findMany({
    where,
    include: {
      tipos_tramite: true,
      areas: true,
      usuarios: true,
    },
  });

  const ids = tramitesDb.map((t) => t.id_tramite);
  const todosLosMovimientos = await batchFetchMovimientos(ids);

  const movsPorTramite = new Map<number, any[]>();
  for (const m of todosLosMovimientos) {
    const list = movsPorTramite.get(m.id_tramite);
    if (!list) {
      movsPorTramite.set(m.id_tramite, [m]);
    } else {
      list.push(m);
    }
  }

  const usuariosDb = await prisma.usuarios.findMany({
    where: { activo: true },
    include: { areas: true },
    orderBy: { nombre_completo: "asc" },
  });

  const usuariosMap = new Map<number, any>();
  const inicialesMap = new Map<string, any>();
  for (const u of usuariosDb) {
    usuariosMap.set(u.id_usuario, u);
    if (u.iniciales) {
      inicialesMap.set(u.iniciales.toUpperCase().trim(), u);
    }
  }

  // Límites SLA según área
  const slaPorArea: Record<number, number> = {
    1: 1.5, // DFI / Secretaría
    2: 2.0, // Presupuesto
    3: 3.0, // Contabilidad
    4: 2.0, // Tesorería
    5: 2.0, // Cobranzas y Garantías
    6: 1.0, // Archivo
    7: 2.0, // Distritos
  };

  function crearEntradaFuncionario(
    id_usuario: number,
    nombre_completo: string,
    cargo: string,
    iniciales: string | null,
    area_nombre: string,
    id_area: number
  ) {
    return {
      id_usuario,
      nombre_completo,
      cargo,
      iniciales,
      area_nombre,
      id_area,
      // Dimensión 1: Productividad Histórica del Analista (id_analista_presupuesto_previo)
      total_asignados_historico: 0,
      total_despachados: 0,
      en_observacion_pausados: 0,
      dias_presupuesto_lista: [] as number[],
      despachados_a_tiempo_presupuesto: 0,

      // Dimensión 2: Carga Activa Hoy / Pendientes (id_custodio_actual en estados REVISION, OBSERVADO, DFI)
      pendientes_en_revision: 0,
      pendientes_observados: 0,
      pendientes_dfi: 0,
      total_pendientes_custodia: 0,

      // Compatibilidad
      total_asignados: 0,
      total_en_curso: 0,
      dias_despacho_lista: [] as number[],
      a_tiempo: 0,
      con_retraso: 0,
      tramites_ids: [] as number[],
      tramites_resumen: [] as Array<{
        id_tramite: number;
        numero_quipux: string;
        proveedor: string;
        monto_total: number;
        dias_despacho: number;
        estado_general: string;
        cumple_sla: boolean;
        alerta_inconsistencia: boolean;
      }>,
    };
  }

  type FuncionarioAcumulador = ReturnType<typeof crearEntradaFuncionario>;
  const mapaFuncionarios = new Map<number, FuncionarioAcumulador>();

  // Inicializar todos los analistas y jefes activos
  for (const u of usuariosDb) {
    mapaFuncionarios.set(
      u.id_usuario,
      crearEntradaFuncionario(
        u.id_usuario,
        u.nombre_completo,
        u.cargo,
        u.iniciales,
        u.areas?.nombre || "Sin Área",
        u.id_area
      )
    );
  }

  // Estructura para sección de "Trámites con análisis compartido"
  const tramitesCompartidos: Array<{
    id_tramite: number;
    numero_quipux: string;
    proveedor: string;
    analistas: string;
    dias_despacho: number;
    en_curso: boolean;
    cumple_sla: boolean;
  }> = [];

  const gruposCompartidosMap = new Map<
    string,
    {
      analistas: string;
      dias_lista: number[];
      a_tiempo: number;
      tramites_ids: number[];
    }
  >();

  for (const t of tramitesDb) {
    const movs = movsPorTramite.get(t.id_tramite) || [];
    const input: TramiteCalculoInput = {
      id_tramite: t.id_tramite,
      codigo_tramite: t.codigo_tramite,
      numero_quipux: t.numero_quipux,
      padre_gestion: t.padre_gestion,
      tipo_flujo: t.tipo_flujo,
      tipo_gestion: t.tipo_gestion,
      estado_general: t.estado_general,
      sub_estado: t.sub_estado,
      esta_pausado: t.esta_pausado,
      motivo_pausa: t.motivo_pausa,
      es_devuelto: t.es_devuelto,
      fecha_recepcion_fisica: t.fecha_recepcion_fisica,
      fecha_ingreso: t.fecha_ingreso,
      fecha_entrega_control_previo: t.fecha_entrega_control_previo,
      fecha_aprobacion_presupuesto: t.fecha_aprobacion_presupuesto,
      fecha_aprobacion_contabilidad: t.fecha_aprobacion_contabilidad,
      fecha_autorizacion_pago: t.fecha_autorizacion_pago,
      fecha_pago: t.fecha_pago,
      fecha_ultimo_movimiento: t.fecha_ultimo_movimiento,
      anexos: t.anexos,
      comentarios_bitacora: movs.map((m) => m.comentarios).filter(Boolean).join(" | "),
      historial_movimientos: movs,
    };

    const res = calcularTiemposTramite(input, feriados);

    const estadoUpper = (t.estado_general || "").toUpperCase();
    const subEstadoUpper = (t.sub_estado || "").toUpperCase();
    const estaPausado = Boolean(t.esta_pausado);

    // -------------------------------------------------------------
    // DIMENSIÓN 2: CARGA ACTIVA HOY / PENDIENTES (por id_custodio_actual)
    // -------------------------------------------------------------
    if (t.id_custodio_actual) {
      let targetCustodio = mapaFuncionarios.get(t.id_custodio_actual);
      if (!targetCustodio) {
        const u = usuariosMap.get(t.id_custodio_actual);
        targetCustodio = crearEntradaFuncionario(
          t.id_custodio_actual,
          u?.nombre_completo || "Funcionario",
          u?.cargo || "Custodio",
          u?.iniciales || null,
          u?.areas?.nombre || "Sin Área",
          u?.id_area || 1
        );
        mapaFuncionarios.set(t.id_custodio_actual, targetCustodio);
      }

      if (res.en_curso) {
        targetCustodio.total_pendientes_custodia++;
      }

      if (estadoUpper === "REVISION") {
        targetCustodio.pendientes_en_revision++;
      } else if (
        estadoUpper === "OBSERVADO" ||
        estadoUpper === "OBSERVADO_72H" ||
        subEstadoUpper === "OBSERVADO" ||
        subEstadoUpper === "ESPERA_FACTURA" ||
        estaPausado
      ) {
        targetCustodio.pendientes_observados++;
      } else if (estadoUpper === "DFI") {
        targetCustodio.pendientes_dfi++;
      }
    }

    // -------------------------------------------------------------
    // VERIFICACIÓN DE ANÁLISIS COMPARTIDO
    // -------------------------------------------------------------
    if (res.es_analista_compartido) {
      const etiquetaAnalistas =
        res.analistas_detectados && res.analistas_detectados.length > 0
          ? res.analistas_detectados.join(" / ")
          : "Compartido";

      const diasMesa =
        res.historico_parcial?.tramo_presupuesto_habiles ??
        (typeof res.reloj_b.fase_presupuesto_dias === "number" ? res.reloj_b.fase_presupuesto_dias : 2.0);

      const cumple = diasMesa <= 2.5;

      tramitesCompartidos.push({
        id_tramite: t.id_tramite,
        numero_quipux: t.numero_quipux,
        proveedor: t.proveedor_beneficiario || "N/A",
        analistas: etiquetaAnalistas,
        dias_despacho: diasMesa,
        en_curso: res.en_curso,
        cumple_sla: cumple,
      });

      let grp = gruposCompartidosMap.get(etiquetaAnalistas);
      if (!grp) {
        grp = {
          analistas: etiquetaAnalistas,
          dias_lista: [],
          a_tiempo: 0,
          tramites_ids: [],
        };
        gruposCompartidosMap.set(etiquetaAnalistas, grp);
      }
      grp.dias_lista.push(diasMesa);
      grp.tramites_ids.push(t.id_tramite);
      if (cumple) grp.a_tiempo++;
      continue;
    }

    // -------------------------------------------------------------
    // DIMENSIÓN 1: PRODUCTIVIDAD HISTÓRICA DEL ANALISTA INDIVIDUAL
    // -------------------------------------------------------------
    const analista = resolverAnalistaTramite(t, res, usuariosMap, inicialesMap);
    if (!analista.id_usuario) continue;

    let target = mapaFuncionarios.get(analista.id_usuario);
    if (!target) {
      target = crearEntradaFuncionario(
        analista.id_usuario,
        analista.nombre,
        analista.cargo,
        null,
        "Área",
        2
      );
      mapaFuncionarios.set(analista.id_usuario, target);
    }

    target.total_asignados_historico++;
    target.total_asignados++;
    target.tramites_ids.push(t.id_tramite);

    // Calcular tramo de presupuesto hábiles
    let diasPresupuesto: number | null = res.historico_parcial?.tramo_presupuesto_habiles ?? null;
    if (diasPresupuesto === null && typeof res.reloj_b.fase_presupuesto_dias === "number") {
      diasPresupuesto = res.reloj_b.fase_presupuesto_dias;
    }
    if (diasPresupuesto === null) {
      const fEnt = parseDate(t.fecha_entrega_control_previo);
      const fAprob = parseDate(t.fecha_aprobacion_presupuesto);
      const fPago = parseDate(t.fecha_pago);

      // Regla anti-distorsión por regularización posterior: si fecha_pago < fecha_aprobacion_presupuesto, fin es fecha_pago
      let fFinPres = fAprob;
      if (fPago && fAprob && fPago.getTime() < fAprob.getTime()) {
        fFinPres = fPago;
      }

      if (fEnt && fFinPres && fFinPres.getTime() >= fEnt.getTime()) {
        diasPresupuesto = calcularDiasHabilesBrutos(fEnt, fFinPres, feriadosSet);
      } else if (fEnt && res.en_curso) {
        diasPresupuesto = calcularDiasHabilesBrutos(fEnt, new Date(), feriadosSet);
      } else {
        diasPresupuesto = 1.0;
      }
    }

    if (diasPresupuesto === null || isNaN(diasPresupuesto) || diasPresupuesto < 0) {
      diasPresupuesto = 0.5;
    }

    const esDespachado = ["PAGADO", "CONTABILIDAD", "ARCHIVO", "DEVUELTO", "INSUBSISTENTE", "ANULADO"].includes(estadoUpper);
    const esObservadoPausado =
      estadoUpper === "OBSERVADO" ||
      estadoUpper === "OBSERVADO_72H" ||
      subEstadoUpper === "OBSERVADO" ||
      subEstadoUpper === "ESPERA_FACTURA" ||
      estaPausado;

    if (esObservadoPausado) {
      target.en_observacion_pausados++;
    }

    const slaLimite = slaPorArea[target.id_area] || 2.0;
    const cumple = diasPresupuesto <= slaLimite;

    if (esDespachado) {
      target.total_despachados++;
      target.dias_presupuesto_lista.push(diasPresupuesto);
      target.dias_despacho_lista.push(diasPresupuesto);
      if (cumple) {
        target.a_tiempo++;
        target.despachados_a_tiempo_presupuesto++;
      } else {
        target.con_retraso++;
      }
    } else {
      target.total_en_curso++;
    }

    target.tramites_resumen.push({
      id_tramite: t.id_tramite,
      numero_quipux: t.numero_quipux,
      proveedor: t.proveedor_beneficiario || "N/A",
      monto_total: Number(t.monto_total || 0),
      dias_despacho: Number(diasPresupuesto.toFixed(1)),
      estado_general: t.estado_general,
      cumple_sla: cumple,
      alerta_inconsistencia: res.alerta_inconsistencia,
    });
  }

  // Consolidar métricas para cada funcionario
  const listaFuncionarios: RendimientoFuncionarioItem[] = Array.from(mapaFuncionarios.values())
    .filter(
      (f) =>
        f.total_asignados_historico > 0 ||
        f.total_pendientes_custodia > 0 ||
        f.total_asignados > 0 ||
        f.id_area === 2 ||
        f.id_area === 3
    )
    .map((f) => {
      const slaLimite = slaPorArea[f.id_area] || 2.0;
      const medianaPresupuesto = calcularMediana(f.dias_presupuesto_lista);
      const promedioPresupuesto = calcularPromedio(f.dias_presupuesto_lista);
      const p90 = calcularPercentil(f.dias_presupuesto_lista, 90);

      // porcentaje_productividad: (total_despachados / Math.max(1, total_asignados_historico - en_observacion_pausados)) * 100
      const baseProductividad = Math.max(1, f.total_asignados_historico - f.en_observacion_pausados);
      const porcentajeProductividad = Math.min(
        100,
        Number(((f.total_despachados / baseProductividad) * 100).toFixed(1))
      );
      const porcentajeCumplimientoSlaPres =
        f.total_despachados > 0
          ? Math.round((f.despachados_a_tiempo_presupuesto / f.total_despachados) * 100)
          : 100;

      const evaluados = f.a_tiempo + f.con_retraso;
      const tasa = evaluados > 0 ? Math.round((f.a_tiempo / evaluados) * 100) : 100;

      const prodHistorica = {
        total_asignados_historico: f.total_asignados_historico,
        total_despachados: f.total_despachados,
        mediana_dias_presupuesto: medianaPresupuesto,
        promedio_dias_presupuesto: promedioPresupuesto,
        en_observacion_pausados: f.en_observacion_pausados,
        porcentaje_productividad: porcentajeProductividad,
        porcentaje_cumplimiento_sla_presupuesto: porcentajeCumplimientoSlaPres,
      };

      const cargaActiva = {
        pendientes_en_revision: f.pendientes_en_revision,
        pendientes_observados: f.pendientes_observados,
        pendientes_dfi: f.pendientes_dfi,
        total_pendientes_custodia: f.total_pendientes_custodia,
      };

      return {
        id_usuario: f.id_usuario,
        nombre: f.nombre_completo,
        nombre_completo: f.nombre_completo,
        cargo: f.cargo,
        iniciales: f.iniciales,
        area: f.area_nombre,
        area_nombre: f.area_nombre,
        id_area: f.id_area,

        // Dimensión 1: Productividad Histórica del Analista (id_analista_presupuesto_previo)
        total_asignados_historico: f.total_asignados_historico,
        total_despachados: f.total_despachados,
        mediana_dias_presupuesto: medianaPresupuesto,
        promedio_dias_presupuesto: promedioPresupuesto,
        en_observacion_pausados: f.en_observacion_pausados,
        porcentaje_productividad: porcentajeProductividad,
        porcentaje_cumplimiento_sla_presupuesto: porcentajeCumplimientoSlaPres,
        productividad_historica: prodHistorica,

        // Dimensión 2: Carga Activa Hoy / Pendientes (id_custodio_actual en estados REVISION, OBSERVADO, DFI)
        pendientes_en_revision: f.pendientes_en_revision,
        pendientes_observados: f.pendientes_observados,
        pendientes_dfi: f.pendientes_dfi,
        total_pendientes_custodia: f.total_pendientes_custodia,
        carga_activa: cargaActiva,

        // Campos retrocompatibles
        total_asignados: f.total_asignados,
        total_recibidos: f.total_asignados,
        tramites_despachados: f.total_despachados,
        despachados: f.total_despachados,
        total_en_curso: f.total_en_curso,
        en_curso: f.total_en_curso,
        tiempo_promedio_trabajo_dias: promedioPresupuesto,
        tiempo_promedio_dias: promedioPresupuesto,
        tiempo_mediana_trabajo_dias: medianaPresupuesto,
        mediana_dias_despacho: medianaPresupuesto,
        mediana_dias: medianaPresupuesto,
        p90_dias_despacho: p90,
        p90_dias: p90,
        tasa_cumplimiento: tasa,
        tasa_cumplimiento_sla: tasa,
        evaluacion_sla: (tasa >= 90 ? "Óptimo" : tasa >= 75 ? "Aceptable" : "Crítico") as "Óptimo" | "Aceptable" | "Crítico",
        sla_limite_dias: slaLimite,
        tramites_ids: f.tramites_ids,
        tramites_resumen: f.tramites_resumen,
      };
    })
    .sort(
      (a, b) =>
        b.total_asignados_historico - a.total_asignados_historico ||
        b.total_pendientes_custodia - a.total_pendientes_custodia
    );

  // Consolidar sección de análisis compartido
  const diasTodosCompartidos = tramitesCompartidos.map((c) => c.dias_despacho);
  const medianaCompartida = calcularMediana(diasTodosCompartidos);
  const p90Compartido = calcularPercentil(diasTodosCompartidos, 90);
  const cumplidosCompartidos = tramitesCompartidos.filter((c) => c.cumple_sla).length;
  const tasaCompartida =
    tramitesCompartidos.length > 0
      ? Math.round((cumplidosCompartidos / tramitesCompartidos.length) * 100)
      : 100;

  const gruposCompartidos = Array.from(gruposCompartidosMap.values()).map((g) => ({
    analistas: g.analistas,
    total_tramites: g.dias_lista.length,
    mediana_dias_despacho: calcularMediana(g.dias_lista),
    p90_dias_despacho: calcularPercentil(g.dias_lista, 90),
    tasa_cumplimiento:
      g.dias_lista.length > 0 ? Math.round((g.a_tiempo / g.dias_lista.length) * 100) : 100,
    tramites_ids: g.tramites_ids,
  }));

  const seccionCompartida: SeccionAnalisisCompartido = {
    titulo: "Trámites con análisis compartido",
    descripcion:
      "Expedientes procesados con co-autoría o reasignación entre analistas (ej. RG/DB, MS/NM). Se analizan por separado para evitar distorsiones en los promedios individuales.",
    total_tramites: tramitesCompartidos.length,
    mediana_dias_despacho: medianaCompartida,
    p90_dias_despacho: p90Compartido,
    tasa_cumplimiento: tasaCompartida,
    tramites_ids: tramitesCompartidos.map((c) => c.id_tramite),
    grupos: gruposCompartidos,
  };

  // KPIs globales de funcionarios
  const todosLosDias = listaFuncionarios.flatMap((f) =>
    f.tramites_resumen.map((r) => r.dias_despacho)
  );

  return {
    funcionarios: listaFuncionarios,
    analisis_compartido: seccionCompartida,
    kpis_globales: {
      total_analistas: listaFuncionarios.length,
      total_tramites_evaluados: listaFuncionarios.reduce((sum, f) => sum + f.total_asignados_historico, 0),
      mediana_general_dias: calcularMediana(todosLosDias),
      p90_general_dias: calcularPercentil(todosLosDias, 90),
      tasa_cumplimiento_general:
        listaFuncionarios.length > 0
          ? Math.round(
              listaFuncionarios.reduce((acc, f) => acc + f.tasa_cumplimiento, 0) /
                listaFuncionarios.length
            )
          : 100,
      total_pendientes_revision: listaFuncionarios.reduce((sum, f) => sum + f.pendientes_en_revision, 0),
      total_pendientes_observados: listaFuncionarios.reduce((sum, f) => sum + f.pendientes_observados, 0),
    },
  };
}

// -------------------------------------------------------------
// 3. OBTENER AUDITORÍA DE PROCESOS (PESTAÑA 3)
// -------------------------------------------------------------
export async function obtenerAuditoriaProcesos(filtros: FiltrosReportesTiempos = {}) {
  const where = construirWherePrisma(filtros);

  const feriados = await prisma.feriados.findMany({
    where: { activo: true },
    select: { fecha: true },
  });

  const tiposTramiteCatalogo = await prisma.tipos_tramite.findMany({
    where: { activo: true },
    orderBy: { id_tipo_tramite: "asc" },
  });

  const tramitesDb = await prisma.tramites.findMany({
    where,
    include: {
      tipos_tramite: true,
      areas: true,
      usuarios: true,
    },
  });

  const ids = tramitesDb.map((t) => t.id_tramite);
  const todosLosMovimientos = await batchFetchMovimientos(ids);

  const movsPorTramite = new Map<number, any[]>();
  for (const m of todosLosMovimientos) {
    const list = movsPorTramite.get(m.id_tramite);
    if (!list) {
      movsPorTramite.set(m.id_tramite, [m]);
    } else {
      list.push(m);
    }
  }

  const slaConfig = await getSLAConfig();
  const SLA_LIMITE = slaConfig.limite_dias || 6;

  // Mapa por id_tipo_tramite
  const mapaPorTipo = new Map<
    number,
    {
      tipo: (typeof tiposTramiteCatalogo)[0];
      dias_totales: number[];
      dias_calendario: number[];
      dias_reales: number[];
      monto_total: number;
      fase_sec_dias: number[];
      fase_pres_dias: number[];
      fase_cont_dias: number[];
      fase_dfi_dias: number[];
      fase_tes_dias: number[];
      pausas_factura: number[];
      en_plazo: number;
      vencidos: number;
      tramites_ids: number[];
    }
  >();

  for (const tipo of tiposTramiteCatalogo) {
    mapaPorTipo.set(tipo.id_tipo_tramite, {
      tipo,
      dias_totales: [],
      dias_calendario: [],
      dias_reales: [],
      monto_total: 0,
      fase_sec_dias: [],
      fase_pres_dias: [],
      fase_cont_dias: [],
      fase_dfi_dias: [],
      fase_tes_dias: [],
      pausas_factura: [],
      en_plazo: 0,
      vencidos: 0,
      tramites_ids: [],
    });
  }

  for (const t of tramitesDb) {
    const movs = movsPorTramite.get(t.id_tramite) || [];
    const input: TramiteCalculoInput = {
      id_tramite: t.id_tramite,
      codigo_tramite: t.codigo_tramite,
      numero_quipux: t.numero_quipux,
      padre_gestion: t.padre_gestion,
      tipo_flujo: t.tipo_flujo,
      tipo_gestion: t.tipo_gestion,
      estado_general: t.estado_general,
      sub_estado: t.sub_estado,
      esta_pausado: t.esta_pausado,
      motivo_pausa: t.motivo_pausa,
      es_devuelto: t.es_devuelto,
      fecha_recepcion_fisica: t.fecha_recepcion_fisica,
      fecha_ingreso: t.fecha_ingreso,
      fecha_entrega_control_previo: t.fecha_entrega_control_previo,
      fecha_aprobacion_presupuesto: t.fecha_aprobacion_presupuesto,
      fecha_aprobacion_contabilidad: t.fecha_aprobacion_contabilidad,
      fecha_autorizacion_pago: t.fecha_autorizacion_pago,
      fecha_pago: t.fecha_pago,
      fecha_ultimo_movimiento: t.fecha_ultimo_movimiento,
      anexos: t.anexos,
      comentarios_bitacora: movs.map((m) => m.comentarios).filter(Boolean).join(" | "),
      historial_movimientos: movs,
    };

    const res = calcularTiemposTramite(input, feriados);

    let grp = mapaPorTipo.get(t.id_tipo_tramite);
    if (!grp) {
      grp = {
        tipo: t.tipos_tramite,
        dias_totales: [],
        dias_calendario: [],
        dias_reales: [],
        monto_total: 0,
        fase_sec_dias: [],
        fase_pres_dias: [],
        fase_cont_dias: [],
        fase_dfi_dias: [],
        fase_tes_dias: [],
        pausas_factura: [],
        en_plazo: 0,
        vencidos: 0,
        tramites_ids: [],
      };
      mapaPorTipo.set(t.id_tipo_tramite, grp);
    }

    grp.tramites_ids.push(t.id_tramite);

    const diasTotales =
      res.calidad_dato === "COMPLETO" && typeof res.reloj_b.dias_laborables_efectivos === "number"
        ? res.reloj_b.dias_laborables_efectivos
        : res.historico_parcial?.total_habiles_brutos ?? res.reloj_a.total_calendario_dias;

    grp.dias_totales.push(diasTotales);

    // Días calendario y reales trabajados para reportería de procesos
    const diasCalendario =
      res.calidad_dato === "HISTORICO_PARCIAL" && res.historico_parcial?.total_calendario_dias != null
        ? res.historico_parcial.total_calendario_dias
        : res.reloj_a.total_calendario_dias || 0;

    const diasReales =
      res.calidad_dato === "COMPLETO"
        ? (res.reloj_a.dias_laborables_trabajo || 0)
        : (res.historico_parcial?.total_habiles_brutos ?? res.reloj_a.dias_laborables_trabajo ?? 0);

    const monto = typeof t.monto_total === "number" ? t.monto_total : Number(t.monto_total || 0);
    grp.monto_total += isNaN(monto) ? 0 : monto;
    grp.dias_calendario.push(diasCalendario);
    grp.dias_reales.push(diasReales);

    if (diasTotales <= SLA_LIMITE) {
      grp.en_plazo++;
    } else {
      grp.vencidos++;
    }

    // Fases
    if (res.calidad_dato === "HISTORICO_PARCIAL" && res.historico_parcial) {
      if (res.historico_parcial.tramo_secretaria_habiles !== null) {
        grp.fase_sec_dias.push(res.historico_parcial.tramo_secretaria_habiles);
        grp.fase_dfi_dias.push(0.5);
      }
      if (res.historico_parcial.tramo_presupuesto_habiles !== null) {
        grp.fase_pres_dias.push(res.historico_parcial.tramo_presupuesto_habiles);
      }
      if (res.historico_parcial.tramo_contabilidad_tesoreria_habiles !== null) {
        // En histórico parcial contabilidad y tesorería estaban en un solo tramo
        grp.fase_cont_dias.push(
          Number((res.historico_parcial.tramo_contabilidad_tesoreria_habiles * 0.7).toFixed(1))
        );
        grp.fase_tes_dias.push(
          Number((res.historico_parcial.tramo_contabilidad_tesoreria_habiles * 0.3).toFixed(1))
        );
      }
    } else {
      if (typeof res.reloj_b.fase_secretaria_dias === "number") grp.fase_sec_dias.push(res.reloj_b.fase_secretaria_dias);
      if (typeof res.reloj_b.fase_presupuesto_dias === "number") grp.fase_pres_dias.push(res.reloj_b.fase_presupuesto_dias);
      if (typeof res.reloj_b.fase_contabilidad_dias === "number") grp.fase_cont_dias.push(res.reloj_b.fase_contabilidad_dias);
      if (typeof res.reloj_b.fase_dfi_dias === "number") grp.fase_dfi_dias.push(res.reloj_b.fase_dfi_dias);
      if (typeof res.reloj_b.fase_tesoreria_dias === "number") grp.fase_tes_dias.push(res.reloj_b.fase_tesoreria_dias);
      grp.pausas_factura.push(res.reloj_a.dias_pausa_factura);
    }
  }

  // Generar lista de procesos calculados
  const listaProcesos: AuditoriaProcesoItem[] = [];

  for (const [idTipo, item] of Array.from(mapaPorTipo.entries())) {
    if (item.dias_totales.length === 0) continue;

    const total = item.dias_totales.length;
    const medianaTotales = calcularMediana(item.dias_totales);
    const p90Totales = calcularPercentil(item.dias_totales, 90);
    const tasa = total > 0 ? Math.round((item.en_plazo / total) * 100) : 100;

    const medSec = calcularMediana(item.fase_sec_dias);
    const medPres = calcularMediana(item.fase_pres_dias);
    const medCont = calcularMediana(item.fase_cont_dias);
    const medDfi = calcularMediana(item.fase_dfi_dias);
    const medTes = calcularMediana(item.fase_tes_dias);
    const medPausaFact = calcularMediana(item.pausas_factura);

    // Identificar fase con mayor demora
    const rankingFases = [
      { fase: "Contabilidad", dias: medCont },
      { fase: "Presupuesto", dias: medPres },
      { fase: "Tesorería", dias: medTes },
      { fase: "Secretaría", dias: medSec },
      { fase: "DFI", dias: medDfi },
    ].sort((a, b) => b.dias - a.dias);

    const faseMayor = rankingFases[0]?.fase || "Contabilidad";
    const fraseDiag = generarFraseDiagnostica(faseMayor, tasa, medPausaFact);
    const familia = encontrarFamiliaCanonica(idTipo);

    const tiempoTotalProm = item.dias_calendario.length > 0
      ? Number((item.dias_calendario.reduce((a, b) => a + b, 0) / item.dias_calendario.length).toFixed(1))
      : medianaTotales;
    const tiempoRealProm = item.dias_reales.length > 0
      ? Number((item.dias_reales.reduce((a, b) => a + b, 0) / item.dias_reales.length).toFixed(1))
      : medianaTotales;
    const tiempoRealMediana = calcularMediana(item.dias_reales);

    listaProcesos.push({
      id_tipo_tramite: idTipo,
      codigo_proceso: item.tipo.codigo,
      nombre_proceso: item.tipo.nombre,
      tipo_proceso: item.tipo.nombre,
      nombre_tipo_proceso: item.tipo.nombre,
      cantidad_tramites: total,
      total_tramites: total,
      monto_total: Number(item.monto_total.toFixed(2)),
      tiempo_total_promedio_dias: tiempoTotalProm,
      tiempo_total_mediana_dias: medianaTotales,
      mediana_dias_totales: medianaTotales,
      tiempo_real_trabajado_promedio_dias: tiempoRealProm,
      tiempo_real_trabajado_mediana_dias: tiempoRealMediana,
      promedio_dias_habiles: tiempoRealProm,
      tiempo_total_promedio: tiempoTotalProm,
      tiempo_real_promedio: tiempoRealProm,
      p90_dias_totales: p90Totales,
      tasa_cumplimiento: tasa,
      fase_mayor_demora: faseMayor,
      frase_diagnostica: fraseDiag,
      fases_promedio: {
        secretaria: medSec,
        presupuesto: medPres,
        contabilidad: medCont,
        dfi: medDfi,
        tesoreria: medTes,
      },
      tramites_en_plazo: item.en_plazo,
      tramites_vencidos: item.vencidos,
      tramites_ids: item.tramites_ids,
      familia_canonica: item.tipo.nombre,
      codigo_familia: item.tipo.codigo,
      nombre_familia: item.tipo.nombre,
    });
  }

  listaProcesos.sort((a, b) => b.total_tramites - a.total_tramites);

  // Normalización directa de tipos de proceso desde la base de datos (sin inventar familias canónicas)
  const listaFamilias: FamiliaCanonicaItem[] = listaProcesos.map((p) => ({
    codigo_familia: p.codigo_proceso,
    nombre_familia: p.nombre_proceso,
    total_tramites: p.cantidad_tramites,
    mediana_dias_totales: p.tiempo_total_mediana_dias,
    p90_dias_totales: p.p90_dias_totales,
    tasa_cumplimiento: p.tasa_cumplimiento,
    fase_mayor_demora: p.fase_mayor_demora,
    frase_diagnostica: p.frase_diagnostica,
    tramites_ids: p.tramites_ids,
  }));

  const todosDiasInstitucionales = listaProcesos.flatMap((p) => {
    const item = mapaPorTipo.get(p.id_tipo_tramite);
    return item ? item.dias_totales : [];
  });

  return {
    procesos: listaProcesos,
    familias: listaFamilias,
    familias_canonicas: listaFamilias,
    resumen_global: {
      total_procesos: listaProcesos.length,
      total_tramites: todosDiasInstitucionales.length,
      mediana_global_dias: calcularMediana(todosDiasInstitucionales),
      p90_global_dias: calcularPercentil(todosDiasInstitucionales, 90),
      tasa_cumplimiento_global:
        listaProcesos.length > 0
          ? Math.round(
              listaProcesos.reduce((acc, p) => acc + p.tasa_cumplimiento, 0) /
                listaProcesos.length
            )
          : 100,
      fase_critica_institucional: "Contabilidad",
    },
  };
}
