import fs from "fs";
import ExcelJS from "exceljs";
import { prisma } from "@/lib/prisma";

const RUTA_CANDIDATAS_EXCEL = [
  "C:/Users/ADMIN/Documents/RODNEY SENAE/BUSQUEDA ENTRE BASES DE GARANTIAS PRESUPUESTO/Prueba de bitacoras/Enero-Junio-2026.xlsx",
  "C:/Users/ADMIN/Documents/RODNEY SENAE/CONSOLIDADO SENAE/BUSQUEDA GARANTIAS-PRESUPUESTO/BITACORAS DE PRUEBA/Enero-Junio-2026.xlsx",
  "C:/Users/ADMIN/Documents/RODNEY SENAE/APLICATIVO PARA BUSQUEDA EN BASES PRESUPUESTO/Enero-Junio-2026.xlsx",
  "C:/Users/PC/Documents/RODNEY SENAE/APLICATIVO PARA BUSQUEDA EN BASES PRESUPUESTO/Enero-Junio-2026.xlsx",
  "./Enero-Junio-2026.xlsx",
];

export const RUTA_DEFAULT_EXCEL_2026 =
  RUTA_CANDIDATAS_EXCEL.find((p) => fs.existsSync(p)) || RUTA_CANDIDATAS_EXCEL[0];

// Mapeo histórico fallback de iniciales por si algún usuario aún no está registrado en la base de datos
const MAPA_ANALISTAS_FALLBACK: Record<string, number> = {
  RG: 4,  // Ricardo Gonzalez (Presupuesto)
  DB: 5,  // David Barberan (Presupuesto)
  NM: 7,  // Nandy Morales (Presupuesto)
  MS: 12, // María Silva (Presupuesto)
  ID: 13, // Ivonne de la Torre (Presupuesto)
  HA: 14, // Hilda Arriaga (Cobranzas y Garantías)
  MR: 15, // Maria Rodriguez (Presupuesto)
  GP: 16, // Gabriela Peralta (Tesorería)
  RL: 17, // Raúl Lindao (Contabilidad)
  AC: 18, // Andrea Carrillo (Distrito Guayaquil)
  RA: 19, // Roberto Armijo (Distrito Guayaquil)
  AG: 20, // Ana García (Saliente)
  VL: 21, // Vicente León (Saliente)
  VP: 22, // Verónica Paguay (Saliente)
  JM: 3,  // Ing. Carlos Mendoza (Jefe Presupuesto)
};

export interface AnalistaInfo {
  token: string;
  id_usuario: number;
  nombre_completo: string;
  id_area: number;
}

export function parseTokensAnalistas(texto: string): string[] {
  if (!texto) return [];
  return String(texto)
    .split(/[,/;\-]+/)
    .map((s) => s.trim().replace(/[^A-Za-z0-9]/g, "").toUpperCase())
    .filter((s) => s.length > 0);
}

export function resolverCadenaAnalistas(
  textoIniciales: string,
  mapaUsuarios: Map<string, { id_usuario: number; nombre_completo: string; id_area: number }>,
  idAreaDefecto: number = 2,
  idUsuarioDefecto: number = 3
): {
  tokens: string[];
  cadenaAnalistas: AnalistaInfo[];
  ultimoAnalista: AnalistaInfo | null;
  idAnalistaActivo: number;
} {
  const tokens = parseTokensAnalistas(textoIniciales);
  const cadenaAnalistas: AnalistaInfo[] = [];

  for (const tok of tokens) {
    const user = mapaUsuarios.get(tok);
    if (user) {
      cadenaAnalistas.push({ token: tok, ...user });
    } else if (MAPA_ANALISTAS_FALLBACK[tok]) {
      cadenaAnalistas.push({
        token: tok,
        id_usuario: MAPA_ANALISTAS_FALLBACK[tok],
        nombre_completo: `Analista (${tok})`,
        id_area: idAreaDefecto,
      });
    }
  }

  const ultimoAnalista =
    cadenaAnalistas.length > 0 ? cadenaAnalistas[cadenaAnalistas.length - 1] : null;
  const idAnalistaActivo = ultimoAnalista ? ultimoAnalista.id_usuario : idUsuarioDefecto;

  return {
    tokens,
    cadenaAnalistas,
    ultimoAnalista,
    idAnalistaActivo,
  };
}

export function normalizarCiudad(ciudadRaw: any): string {
  if (!ciudadRaw) return "GUAYAQUIL";
  const c = String(ciudadRaw).trim().toUpperCase();
  if (c.includes("GUAYAQ")) return "GUAYAQUIL";
  if (c.includes("QUIT")) return "QUITO";
  if (c.includes("CUENC")) return "CUENCA";
  if (c.includes("MANT")) return "MANTA";
  if (c.includes("TULC")) return "TULCÁN";
  if (c.includes("HUAQU")) return "HUAQUILLAS";
  if (c.includes("ESMER")) return "ESMERALDAS";
  if (c.includes("BOLIV")) return "PUERTO BOLÍVAR";
  if (c.includes("SALIN")) return "SALINAS";
  if (c.includes("LOJA")) return "LOJA";
  if (c.includes("LATAC")) return "LATACUNGA";
  return c || "GUAYAQUIL";
}

/**
 * Ajusta errata común de inicio de año (2025 -> 2026) cuando los trámites corresponden al ejercicio 2026.
 */
function ajustarErrataAnioNuevo(
  d: Date | null,
  fechaReferenciaIngreso?: Date | null,
  contextoTexto?: string | null
): Date | null {
  if (!d) return null;
  const y = d.getUTCFullYear();
  const m = d.getUTCMonth(); // 0 = Enero, 1 = Febrero
  // Si la fecha parseada cae en enero o febrero de 2025 (month <= 1)
  if (y === 2025 && (m === 0 || m === 1)) {
    const tieneRef2026 =
      (fechaReferenciaIngreso && fechaReferenciaIngreso.getUTCFullYear() === 2026) ||
      (contextoTexto && contextoTexto.includes("-2026-"));
    if (tieneRef2026) {
      return new Date(Date.UTC(2026, m, d.getUTCDate(), 12, 0, 0));
    }
  }
  return d;
}

/**
 * Parsea fechas con estricto formato ecuatoriano (DD/MM/YYYY) e inmunidad ante huso horario.
 * Incluye blindaje ante seriales corruptos de Excel (< 45292) y corrección automática de errata 2025 -> 2026.
 */
export function parseFechaEcuador(
  val: any,
  fechaReferenciaIngreso?: Date | null,
  contextoTexto?: string | null
): Date | null {
  if (val === null || val === undefined) return null;

  // Si es un número serial de Excel menor a 45292 (01/01/2024), como 16.57 en fila 692, retornar null
  if (typeof val === "number") {
    if (val < 45292) return null;
    const ms = Math.round((val - 25569) * 86400000);
    const d = new Date(ms);
    if (!isNaN(d.getTime())) {
      const candidate = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 12, 0, 0));
      return ajustarErrataAnioNuevo(candidate, fechaReferenciaIngreso, contextoTexto);
    }
    return null;
  }

  // Si ya es un objeto Date
  if (val instanceof Date && !isNaN(val.getTime())) {
    const candidate = new Date(Date.UTC(val.getUTCFullYear(), val.getUTCMonth(), val.getUTCDate(), 12, 0, 0));
    return ajustarErrataAnioNuevo(candidate, fechaReferenciaIngreso, contextoTexto);
  }

  // Si es objeto celda de ExcelJS con formula o resultado
  if (typeof val === "object") {
    if (val.result !== undefined && val.result !== null) {
      return parseFechaEcuador(val.result, fechaReferenciaIngreso, contextoTexto);
    }
    if (val.text) {
      return parseFechaEcuador(val.text, fechaReferenciaIngreso, contextoTexto);
    }
  }

  // Si es texto
  if (typeof val === "string") {
    const trimmed = val.trim();
    if (!trimmed || trimmed === "N/A" || trimmed === "-" || trimmed === ".") return null;

    // Si es un string puramente numérico (ej: "16.57" o serial corrupto menor a 45292)
    const num = Number(trimmed);
    if (!isNaN(num) && !trimmed.includes("/") && !trimmed.includes("-") && !trimmed.includes(".")) {
      if (num < 45292) return null;
      const ms = Math.round((num - 25569) * 86400000);
      const d = new Date(ms);
      if (!isNaN(d.getTime())) {
        const candidate = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 12, 0, 0));
        return ajustarErrataAnioNuevo(candidate, fechaReferenciaIngreso, contextoTexto);
      }
      return null;
    }
    if (!isNaN(num) && trimmed.includes(".") && !trimmed.includes("/") && !trimmed.includes("-")) {
      if (num < 45292) return null;
    }

    // Patrón estricto DD/MM/YYYY o DD-MM-YYYY
    const match = trimmed.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{2,5})$/);
    if (match) {
      const d = parseInt(match[1], 10);
      const m = parseInt(match[2], 10) - 1;
      let y = parseInt(match[3], 10);

      // Corrección de erratas de digitación en Excel
      if (y < 100) y = 2000 + y;
      else if (y === 206) y = 2026;   // Errata '18/2/206'
      else if (y === 22026) y = 2026; // Errata '22/5/22026'

      if (m >= 0 && m <= 11 && d >= 1 && d <= 31) {
        const candidate = new Date(Date.UTC(y, m, d, 12, 0, 0));
        return ajustarErrataAnioNuevo(candidate, fechaReferenciaIngreso, contextoTexto);
      }
    }

    // Patrón fechas con mes en texto (ej. "13-jul-26", "03-ene-2026", "13/jul/2026")
    const matchTextoMes = trimmed.match(/^(\d{1,2})[/.\-\s]([A-Za-z]{3,4})[/.\-\s](\d{2,4})$/);
    if (matchTextoMes) {
      const mesesMap: Record<string, number> = {
        ene: 0, jan: 0,
        feb: 1,
        mar: 2,
        abr: 3, apr: 3,
        may: 4,
        jun: 5,
        jul: 6,
        ago: 7, aug: 7,
        sep: 8, set: 8,
        oct: 9,
        nov: 10,
        dic: 11, dec: 11,
      };
      const d = parseInt(matchTextoMes[1], 10);
      const mesClave = matchTextoMes[2].toLowerCase().slice(0, 3);
      let y = parseInt(matchTextoMes[3], 10);
      if (y < 100) y = 2000 + y;
      if (mesesMap[mesClave] !== undefined && d >= 1 && d <= 31) {
        const candidate = new Date(Date.UTC(y, mesesMap[mesClave], d, 12, 0, 0));
        return ajustarErrataAnioNuevo(candidate, fechaReferenciaIngreso, contextoTexto);
      }
    }

    // Fallback ISO o formato parseable estándar
    const parsed = new Date(trimmed);
    if (!isNaN(parsed.getTime())) {
      const candidate = new Date(Date.UTC(parsed.getUTCFullYear(), parsed.getUTCMonth(), parsed.getUTCDate(), 12, 0, 0));
      return ajustarErrataAnioNuevo(candidate, fechaReferenciaIngreso, contextoTexto);
    }
  }

  return null;
}

/**
 * Parsea montos decimales soportando objetos de fórmula ExcelJS, símbolos de moneda y comas.
 */
export function parseMontoEcuador(val: any): number {
  if (val === null || val === undefined) return 0;
  if (typeof val === "number") return isNaN(val) ? 0 : Math.round(val * 100) / 100;

  // Objeto de celda con fórmula en ExcelJS: { formula: "...", result: 171.46 }
  if (typeof val === "object") {
    if (val.result !== undefined && val.result !== null) {
      return parseMontoEcuador(val.result);
    }
    if (val.text) {
      return parseMontoEcuador(val.text);
    }
    return 0;
  }

  if (typeof val === "string") {
    const trimmed = val.trim();
    if (!trimmed || trimmed === "N/A" || trimmed === "-") return 0;

    // Casos compuestos de suma como "2610/965"
    if (trimmed.includes("/") && !trimmed.match(/\d{1,2}\/\d{1,2}\/\d{2,4}/)) {
      const partes = trimmed.split("/").map((p) => parseMontoEcuador(p));
      return Math.round(partes.reduce((acc, curr) => acc + curr, 0) * 100) / 100;
    }

    // Limpiar símbolos de moneda y espacios
    let clean = trimmed.replace(/[US$us$\s]/g, "");

    // Normalizar separadores decimales y de miles
    if (clean.includes(",") && clean.includes(".")) {
      if (clean.indexOf(",") < clean.indexOf(".")) {
        // Formato 1,387.63
        clean = clean.replace(/,/g, "");
      } else {
        // Formato 1.387,63
        clean = clean.replace(/\./g, "").replace(",", ".");
      }
    } else if (clean.includes(",")) {
      clean = clean.replace(",", ".");
    }

    clean = clean.replace(/[^0-9.-]/g, "");
    const parsed = parseFloat(clean);
    return isNaN(parsed) ? 0 : Math.round(parsed * 100) / 100;
  }

  return 0;
}

/**
 * Sanitiza RUCs o cédulas asegurando 13 dígitos para RUC con padding de ceros iniciales perdidos en Excel.
 */
export function sanitizarRuc(val: any): string | null {
  if (!val) return null;
  const clean = String(val).replace(/[^0-9]/g, "").trim();
  if (!clean) return null;
  if (clean.length === 12) return clean.padStart(13, "0");
  if (clean.length === 9) return clean.padStart(10, "0");
  return clean;
}

/**
 * Extrae causas judiciales y números de juicios/coactivas de la descripción.
 */
export function extraerNumeroJuicio(descripcion: string): string | null {
  if (!descripcion) return null;
  const match = descripcion.match(
    /(?:juicio|proceso|causa|expediente|sentencia)\s*(?:nro\.?|no\.?|n°)?\s*([0-9]{4,5}-[0-9]{4}-[0-9]{4,6}[A-Z]?)/i
  );
  if (match) return match[1].trim();

  // Patrón directo de código judicial ecuatoriano: XXXXX-YYYY-ZZZZZ
  const matchDirect = descripcion.match(/\b([0-9]{4,5}-[0-9]{4}-[0-9]{4,6}[A-Z]?)\b/);
  if (matchDirect) return matchDirect[1].trim();

  return null;
}

export function obtenerHoja(wb: ExcelJS.Workbook, tipo: "PAGO" | "GARANTIA"): ExcelJS.Worksheet | undefined {
  if (tipo === "PAGO") {
    return wb.worksheets.find((ws) => {
      const n = ws.name.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase().trim();
      return n.startsWith("PAGO");
    });
  } else {
    return wb.worksheets.find((ws) => {
      const n = ws.name.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase().trim();
      return n.startsWith("GARANTIA");
    });
  }
}

/**
 * Extrae Quipux individuales de un texto o celda que contenga múltiples memorandos.
 * Detecta y extrae todos los códigos que sigan el patrón institucional Quipux (SENAE, MEMO, OFICIO, CZ*, D*, etc.)
 * o separa por saltos de línea, comas, punto y coma o espacios en blanco.
 */
export function extraerQuipux(texto: string): string[] {
  if (!texto) return [];

  const list: string[] = [];
  const seen = new Set<string>();

  // 1. Patrón Quipux institucional (ej. SENAE-DDQ-2026-0283-PV, SENAE-DSGQ-2026-7900-E, MEMO-..., CZ5-...)
  const regex = /(?:SENAE?|MEMO|OFICIO|CZ[0-9]|D[A-Z]{2,4}|[A-Z]{2,6})-[A-Z0-9]+(?:-[A-Z0-9]+)?-\d{4}-\d+-[A-Z0-9]+/gi;
  const matches = texto.match(regex);

  if (matches && matches.length > 0) {
    for (const m of matches) {
      const clean = m.trim().toUpperCase();
      if (!seen.has(clean)) {
        seen.add(clean);
        list.push(clean);
      }
    }
  }

  // 2. Si no se encontraron con regex, separar por saltos de línea, comas, punto y coma o espacios
  if (list.length === 0) {
    const tokens = texto.split(/[\r\n,;\s]+/);
    for (const t of tokens) {
      const clean = t.trim();
      if (clean.length >= 6 && clean.includes("-") && !seen.has(clean.toUpperCase())) {
        seen.add(clean.toUpperCase());
        list.push(clean);
      }
    }
  }

  // 3. Fallback si no tiene guion pero contiene texto
  if (list.length === 0 && texto.trim()) {
    list.push(texto.trim());
  }

  return list;
}

export function mapearTipoTramitePago(tipoContratacion: string, descripcion: string = ""): number {
  const s = `${tipoContratacion || ""} ${descripcion || ""}`.toLowerCase();
  const tc = (tipoContratacion || "").toLowerCase();

  // Servicios básicos y recolección / comunicación
  if (
    tc.includes("recolección de basura") ||
    tc.includes("recoleccion de basura") ||
    tc.includes("servicio de comunicación") ||
    tc.includes("servicio de comunicacion") ||
    s.includes("básico") ||
    s.includes("basico") ||
    s.includes("servicio básico") ||
    s.includes("luz") ||
    s.includes("agua") ||
    s.includes("internet") ||
    s.includes("telefon")
  ) {
    return 1; // SERV_BASICOS
  }

  if (s.includes("ínfima") || s.includes("infima")) return 2; // INFIMA_CUANTIA

  // Contrataciones y órdenes de compra / servicios bajo SNCP
  if (
    tc.includes("orden de compra") ||
    tc.includes("arrendamiento") ||
    tc.includes("arriendo") ||
    tc.includes("limpieza") ||
    tc.includes("mantenimiento") ||
    tc.includes("combustible") ||
    tc.includes("abastecimiento") ||
    tc.includes("parqueo") ||
    tc.includes("alquiler") ||
    s.includes("contrato") ||
    s.includes("sncp") ||
    s.includes("subasta") ||
    s.includes("catálogo") ||
    s.includes("catalogo") ||
    s.includes("menor cuantía") ||
    s.includes("cotización") ||
    s.includes("licitación")
  ) {
    return 3; // CONTRATACION_SNCP
  }

  if (s.includes("talento") || s.includes("dnth") || s.includes("honorario") || s.includes("servicios profesionales")) return 4; // CONTRATO_DNTH
  if (s.includes("caja chica") || s.includes("fondo rotativo")) return 5; // CAJA_CHICA
  if (s.includes("viático") || s.includes("viatico") || s.includes("subsistencia") || s.includes("movilización")) return 8; // VIATICOS_FUNC
  if (s.includes("matriculaci") || s.includes("vehicular") || s.includes("rodaje")) return 10; // TASAS_MATRICULA
  if (s.includes("tasa") || s.includes("peaje")) return 9; // TASAS_GENERALES
  if (s.includes("convenio de pago") || s.includes("convenio")) return 11; // CONVENIOS_PAGO
  if (s.includes("remuneraci") || s.includes("nómina") || s.includes("nomina") || s.includes("sueldo") || s.includes("décimo") || s.includes("decimo")) return 12; // REMUNERACIONES
  if (s.includes("reembolso")) return 13; // REEMBOLSOS_GASTOS
  if (s.includes("interinstitucional")) return 14; // CONV_INTERINST
  if (s.includes("póliza") || s.includes("poliza") || s.includes("seguro")) return 15; // POLIZAS_SEGUROS
  return 17; // OTROS_PROCESOS
}

export function mapearTipoTramiteGarantia(
  tipoPago: string,
  descripcion: string = ""
): { idTipoTramite: number; tipoGestion: string } {
  const s = `${tipoPago || ""} ${descripcion || ""}`.toLowerCase();
  if (s.includes("aplicación de caución") || s.includes("aplicacion de caucion") || s.includes("imputación") || s.includes("imputacion")) {
    return { idTipoTramite: 16, tipoGestion: "IMPUTACION_CAUCION" }; // IMPUT_CAUCION
  }
  if (s.includes("devolución de caución") || s.includes("devolucion de caucion") || s.includes("caución") || s.includes("caucion")) {
    return { idTipoTramite: 7, tipoGestion: "DEVOLUCION_CAUCION" }; // DEV_CAUCIONES
  }
  if (s.includes("devolución de valores") || s.includes("devolucion de valores")) {
    return { idTipoTramite: 6, tipoGestion: "DEVOLUCION_VALORES" }; // GARANTIAS_ADUANA
  }
  return { idTipoTramite: 6, tipoGestion: "GARANTIA" }; // GARANTIAS_ADUANA
}

export interface AnalisisExcelResult {
  ruta_archivo: string;
  existe: boolean;
  total_filas_pago: number;
  total_filas_garantia: number;
  total_general: number;
  estados_pago: Record<string, number>;
  estados_garantia: Record<string, number>;
  ciudades: Record<string, number>;
  muestras_pago: Array<{
    fila: number;
    quipux: string;
    ciudad: string;
    proveedor: string;
    valor: number;
    estado: string;
    analista: string;
  }>;
  muestras_garantia: Array<{
    fila: number;
    quipux: string;
    ciudad: string;
    beneficiario: string;
    valor: number;
    estado: string;
    analista: string;
  }>;
  ya_migrados_en_bd: number;
}

export interface EjecucionMigracionResult {
  exito: boolean;
  migrados_pago: number;
  migrados_garantia: number;
  total_migrados: number;
  total_referencias_creadas: number;
  errores: Array<{ hoja: string; fila: number; mensaje: string }>;
  tiempo_ms: number;
}

export class MigracionExcelService {
  /**
   * Purga quirúrgica e idempotente: elimina únicamente trámites migrados con prefijos TRM-2026-
   * sin tocar ningún trámite ingresado manualmente por usuarios en el sistema.
   */
  public static async purgarMigracionPrevia(): Promise<{ tramitesEliminados: number }> {
    const migrados = await prisma.tramites.findMany({
      where: {
        OR: [
          { codigo_tramite: { startsWith: "TRM-2026-P-" } },
          { codigo_tramite: { startsWith: "TRM-2026-G-" } },
        ],
      },
      select: { id_tramite: true },
    });

    const ids = migrados.map((t) => t.id_tramite);
    if (ids.length === 0) return { tramitesEliminados: 0 };

    const BATCH_SIZE = 500;
    for (let i = 0; i < ids.length; i += BATCH_SIZE) {
      const batchIds = ids.slice(i, i + BATCH_SIZE);
      await prisma.$transaction(async (tx) => {
        await tx.tramite_referencias.deleteMany({
          where: { id_tramite: { in: batchIds } },
        });
        await tx.historial_movimientos.deleteMany({
          where: { id_tramite: { in: batchIds } },
        });
        await tx.observaciones.deleteMany({
          where: { id_tramite: { in: batchIds } },
        });
        await tx.documentos_tramite.deleteMany({
          where: { id_tramite: { in: batchIds } },
        });
        await tx.solicitudes_devolucion.deleteMany({
          where: { id_tramite: { in: batchIds } },
        });
        await tx.tramites.deleteMany({
          where: { id_tramite: { in: batchIds } },
        });
      });
    }

    return { tramitesEliminados: ids.length };
  }

  /**
   * Analiza el archivo Excel de la bitácora histórica y extrae métricas y vistas previas.
   * Cuenta con parada temprana determinista para evitar lecturas de celdas vacías.
   */
  public static async analizarArchivo(
    filePath: string = RUTA_DEFAULT_EXCEL_2026
  ): Promise<AnalisisExcelResult> {
    if (!fs.existsSync(filePath)) {
      return {
        ruta_archivo: filePath,
        existe: false,
        total_filas_pago: 0,
        total_filas_garantia: 0,
        total_general: 0,
        estados_pago: {},
        estados_garantia: {},
        ciudades: {},
        muestras_pago: [],
        muestras_garantia: [],
        ya_migrados_en_bd: 0,
      };
    }

    const wb = new ExcelJS.Workbook();
    await wb.xlsx.readFile(filePath);

    // Contar trámites ya migrados en BD
    const yaMigrados = await prisma.tramites.count({
      where: {
        OR: [
          { codigo_tramite: { startsWith: "TRM-2026-P-" } },
          { codigo_tramite: { startsWith: "TRM-2026-G-" } },
        ],
      },
    });

    // 1. Hoja PAGO
    const wsPago = obtenerHoja(wb, "PAGO");
    let totalPago = 0;
    const estadosPago: Record<string, number> = {};
    const ciudades: Record<string, number> = {};
    const muestrasPago: AnalisisExcelResult["muestras_pago"] = [];

    if (wsPago) {
      let consecutiveEmpty = 0;
      for (let r = 5; r <= wsPago.rowCount; r++) {
        const row = wsPago.getRow(r);
        const colNum = (row.getCell(1).text || "").trim();
        const quipuxRaw = (row.getCell(4).text || "").trim();
        if (!colNum && !quipuxRaw) {
          consecutiveEmpty++;
          if (consecutiveEmpty >= 10) break;
          continue;
        }
        consecutiveEmpty = 0;

        totalPago++;
        const ciudad = normalizarCiudad(row.getCell(3).text);
        ciudades[ciudad] = (ciudades[ciudad] || 0) + 1;

        const estado = (row.getCell(22).text || "DFI").trim();
        estadosPago[estado] = (estadosPago[estado] || 0) + 1;

        if (muestrasPago.length < 5) {
          const quipuxList = extraerQuipux(quipuxRaw);
          muestrasPago.push({
            fila: r,
            quipux: quipuxList[0] || `Fila-${r}`,
            ciudad,
            proveedor: (row.getCell(13).text || "").trim() || "N/A",
            valor: parseMontoEcuador(row.getCell(16).value),
            estado,
            analista: (row.getCell(21).text || "").trim() || "N/A",
          });
        }
      }
    }

    // 2. Hoja GARANTÍA
    const wsGarantia = obtenerHoja(wb, "GARANTIA");
    let totalGarantia = 0;
    const estadosGarantia: Record<string, number> = {};
    const muestrasGarantia: AnalisisExcelResult["muestras_garantia"] = [];

    if (wsGarantia) {
      let consecutiveEmpty = 0;
      for (let r = 4; r <= wsGarantia.rowCount; r++) {
        const row = wsGarantia.getRow(r);
        const colNum = (row.getCell(1).text || "").trim();
        const quipuxRaw = (row.getCell(4).text || "").trim();
        if (!colNum && !quipuxRaw) {
          consecutiveEmpty++;
          if (consecutiveEmpty >= 10) break;
          continue;
        }
        consecutiveEmpty = 0;

        totalGarantia++;
        const ciudad = normalizarCiudad(row.getCell(3).text);
        ciudades[ciudad] = (ciudades[ciudad] || 0) + 1;

        const estado = (row.getCell(16).text || "DFI").trim();
        estadosGarantia[estado] = (estadosGarantia[estado] || 0) + 1;

        if (muestrasGarantia.length < 5) {
          const quipuxList = extraerQuipux(quipuxRaw);
          muestrasGarantia.push({
            fila: r,
            quipux: quipuxList[0] || `Fila-${r}`,
            ciudad,
            beneficiario: (row.getCell(9).text || "").trim() || "N/A",
            valor: parseMontoEcuador(row.getCell(10).value),
            estado,
            analista: (row.getCell(15).text || "").trim() || "N/A",
          });
        }
      }
    }

    return {
      ruta_archivo: filePath,
      existe: true,
      total_filas_pago: totalPago,
      total_filas_garantia: totalGarantia,
      total_general: totalPago + totalGarantia,
      estados_pago: estadosPago,
      estados_garantia: estadosGarantia,
      ciudades,
      muestras_pago: muestrasPago,
      muestras_garantia: muestrasGarantia,
      ya_migrados_en_bd: yaMigrados,
    };
  }

  /**
   * Ejecuta la migración e inserción de todos los registros históricos en la base de datos
   * procesando en lotes transaccionales con parada temprana e indexación enriquecida.
   */
  public static async ejecutarMigracion(
    filePath: string = RUTA_DEFAULT_EXCEL_2026,
    idUsuarioAdmin: number = 11,
    purgarPrevios: boolean = true
  ): Promise<EjecucionMigracionResult> {
    const tInicio = Date.now();
    const errores: Array<{ hoja: string; fila: number; mensaje: string }> = [];

    if (!fs.existsSync(filePath)) {
      throw new Error(`El archivo de bitácora no se encuentra en la ruta: ${filePath}`);
    }

    // 1. Purga previa idempotente si está habilitada
    if (purgarPrevios) {
      await this.purgarMigracionPrevia();
    }

    const wb = new ExcelJS.Workbook();
    await wb.xlsx.readFile(filePath);

    let migradosPago = 0;
    let migradosGarantia = 0;
    let totalReferenciasCreadas = 0;

    // Obtener Quipux existentes para prevenir colisiones con trámites creados manualmente
    const existingQuipuxSet = new Set(
      (await prisma.tramites.findMany({ select: { numero_quipux: true } })).map(
        (t) => t.numero_quipux.toUpperCase()
      )
    );

    // Cargar catálogo de funcionarios oficiales activos e históricos con iniciales configuradas
    const usuariosConIniciales = await prisma.usuarios.findMany({
      where: { iniciales: { not: null } },
      select: { id_usuario: true, nombre_completo: true, iniciales: true, id_area: true },
    });
    const mapaUsuariosPorInicial = new Map<
      string,
      { id_usuario: number; nombre_completo: string; id_area: number }
    >();
    for (const u of usuariosConIniciales) {
      if (u.iniciales) {
        mapaUsuariosPorInicial.set(u.iniciales.toUpperCase().trim(), {
          id_usuario: u.id_usuario,
          nombre_completo: u.nombre_completo,
          id_area: u.id_area,
        });
      }
    }

    // =========================================================================
    // 1. PROCESAR HOJA PAGO (Orden Cronológico Estricto)
    // =========================================================================
    const wsPago = obtenerHoja(wb, "PAGO");
    if (wsPago) {
      const filasPago: Array<{
        filaOriginal: number;
        colNum: string;
        tipoGestion: string;
        quipuxRaw: string;
        ciudad: string;
        fechaRecepcion: Date;
        fechaEntregaAnalista: Date | null;
        fechaRecibeJco: Date | null;
        fechaPago: Date | null;
        tipoContratacion: string;
        contrato: string;
        certPresup: string;
        item: string;
        descripcion: string;
        ruc: string | null;
        proveedor: string;
        periodo: string | null;
        factura: string | null;
        valor: number;
        curDev: string | null;
        inicialesAnalista: string;
        estadoRaw: string;
        novedades: string | null;
        fechaDevolucion: Date | null;
        memoDevolucion: string | null;
      }> = [];

      let consecutiveEmpty = 0;
      for (let r = 5; r <= wsPago.rowCount; r++) {
        const row = wsPago.getRow(r);
        const colNum = (row.getCell(1).text || "").trim();
        const tipoRaw = (row.getCell(2).text || "").trim();
        const quipuxRaw = (row.getCell(4).text || "").trim();
        if (!colNum && !quipuxRaw) {
          consecutiveEmpty++;
          if (consecutiveEmpty >= 10) break;
          continue;
        }
        consecutiveEmpty = 0;

        // Normalización de Columna 2 (TIPO) -> tipo_gestion
        let tipoGestion = "PAGO";
        const tipoNorm = tipoRaw.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase();
        if (tipoNorm.includes("ARCHIV")) {
          tipoGestion = "ARCHIVO";
        } else if (tipoNorm.includes("EXPEDIENT")) {
          tipoGestion = "EXPEDIENTE";
        } else if (tipoNorm.includes("JUSTIFIC")) {
          tipoGestion = "JUSTIFICACION";
        } else {
          tipoGestion = "PAGO";
        }

        // Blindaje de lectura en Columna 14 (PERIODO) ante posibles celdas corruptas de ExcelJS
        let periodoVal: string | null = null;
        try {
          const c14 = row.getCell(14);
          const rawText = c14.text || "";
          periodoVal = rawText.trim() || String(c14.value ?? "").trim() || null;
        } catch {
          try {
            periodoVal = String(row.getCell(14).value ?? "").trim() || null;
          } catch {
            periodoVal = null;
          }
        }
        if (periodoVal === "" || periodoVal === "N/A" || periodoVal === "-" || periodoVal === ".") {
          periodoVal = null;
        }

        // Parseo de fechas con corrección automática de errata de año Nuevo (2025 -> 2026)
        let fechaEntregaAnalista = parseFechaEcuador(row.getCell(6).value, null, quipuxRaw);
        let fechaRecepcion = parseFechaEcuador(row.getCell(5).value, null, quipuxRaw);

        // Para FECHA RECEPCIÓN en PAGO: si year === 2025 y mes es enero o febrero (m === 0 || m === 1)
        // y FECHA ENTREGA AL ANALISTA es de enero/febrero 2026 (filas Nº 16 y Nº 232) o quipux contiene -2026-:
        if (
          fechaRecepcion &&
          fechaRecepcion.getUTCFullYear() === 2025 &&
          (fechaRecepcion.getUTCMonth() === 0 || fechaRecepcion.getUTCMonth() === 1)
        ) {
          const entregaEs2026EneFeb =
            fechaEntregaAnalista &&
            fechaEntregaAnalista.getUTCFullYear() === 2026 &&
            (fechaEntregaAnalista.getUTCMonth() === 0 || fechaEntregaAnalista.getUTCMonth() === 1);
          if (entregaEs2026EneFeb || quipuxRaw.includes("-2026-")) {
            fechaRecepcion = new Date(Date.UTC(2026, fechaRecepcion.getUTCMonth(), fechaRecepcion.getUTCDate(), 12, 0, 0));
          }
        }
        if (!fechaRecepcion) {
          fechaRecepcion = new Date("2026-01-05T12:00:00.000Z");
        }

        fechaEntregaAnalista = parseFechaEcuador(row.getCell(6).value, fechaRecepcion, quipuxRaw);
        const fechaRecibeJco = parseFechaEcuador(row.getCell(18).value, fechaRecepcion, quipuxRaw);
        const fechaPago = parseFechaEcuador(row.getCell(20).value, fechaRecepcion, quipuxRaw);
        const fechaDevolucion = parseFechaEcuador(row.getCell(24).value, fechaRecepcion, quipuxRaw);

        filasPago.push({
          filaOriginal: r,
          colNum,
          tipoGestion,
          quipuxRaw,
          ciudad: normalizarCiudad(row.getCell(3).text),
          fechaRecepcion,
          fechaEntregaAnalista,
          fechaRecibeJco,
          fechaPago,
          tipoContratacion: (row.getCell(7).text || "").trim(),
          contrato: (row.getCell(8).text || "").trim(),
          certPresup: (row.getCell(9).text || "").trim(),
          item: (row.getCell(10).text || "").trim(),
          descripcion: (row.getCell(11).text || "").trim(),
          ruc: sanitizarRuc(row.getCell(12).text),
          proveedor: (row.getCell(13).text || "").trim() || "SENAE - GESTIÓN INTERNA / TALENTO HUMANO",
          periodo: periodoVal,
          factura: (row.getCell(15).text || "").trim() || null,
          valor: parseMontoEcuador(row.getCell(16).value),
          curDev: (row.getCell(17).text || "").trim() || null,
          inicialesAnalista: (row.getCell(21).text || "").trim(),
          estadoRaw: (row.getCell(22).text || "DFI").trim(),
          novedades: (row.getCell(23).text || "").trim() || null,
          fechaDevolucion,
          memoDevolucion: (row.getCell(25).text || "").trim() || null,
        });
      }

      // Ordenar cronológicamente por fecha de recepción ascendente y preservar orden original
      filasPago.sort(
        (a, b) =>
          a.fechaRecepcion.getTime() - b.fechaRecepcion.getTime() ||
          a.filaOriginal - b.filaOriginal
      );

      // Inserción en bloques de 50 transacciones atómicas
      const CHUNK_SIZE = 50;
      for (let i = 0; i < filasPago.length; i += CHUNK_SIZE) {
        const chunk = filasPago.slice(i, i + CHUNK_SIZE);

        await prisma.$transaction(async (tx) => {
          for (let cIdx = 0; cIdx < chunk.length; cIdx++) {
            const item = chunk[cIdx];
            const globalIdx = i + cIdx;

            try {
              const quipuxList = extraerQuipux(item.quipuxRaw);
              let primaryQuipux = quipuxList[0] || `PAGO-2026-F${item.filaOriginal}`;
              let baseOriginalQuipux: string | null = null;

              if (existingQuipuxSet.has(primaryQuipux.toUpperCase())) {
                baseOriginalQuipux = primaryQuipux;
                primaryQuipux = `${primaryQuipux}-P${item.filaOriginal}`;
              }
              existingQuipuxSet.add(primaryQuipux.toUpperCase());

              const infoAnalistas = resolverCadenaAnalistas(
                item.inicialesAnalista,
                mapaUsuariosPorInicial,
                2,
                3
              );
              const idAnalista = infoAnalistas.idAnalistaActivo;

              const idTipoTramite = mapearTipoTramitePago(item.tipoContratacion, item.descripcion);
              const esAltaCuantia = item.valor >= 10000;

              // Clasificación exacta en los 7 estados oficiales inmutables según orden jerárquico maestro
              const estLower = item.estadoRaw.toLowerCase();
              let estadoGeneral = "DFI";
              let subEstado = "DERIVADO_A_DFI";
              let idAreaActual = 1;
              let idCustodioActual = 1; // Directora Financiera
              let esDevuelto = false;
              let estaPausado = false;
              let autorizadoPago = false;
              let fechaUltimoMovimiento = item.fechaRecepcion;

              // 1. ARCHIVO: Si el texto de la columna ESTADO contiene "archiv"
              if (estLower.includes("archiv")) {
                estadoGeneral = "ARCHIVO";
                subEstado = "ARCHIVADO_DEFINITIVO";
                idAreaActual = 6; // Archivo Central
                idCustodioActual = 10; // Sr. Manuel Ramos
                fechaUltimoMovimiento = item.fechaRecepcion;
              }
              // 2. DEVUELTO: Si el texto contiene "devuel" O si existe fecha válida en FECHA DE DEVOLUCIÓN
              // (PROHIBIDO usar memoDevolucion para forzar DEVUELTO cuando el estado dice otra cosa)
              else if (estLower.includes("devuel") || item.fechaDevolucion) {
                estadoGeneral = "DEVUELTO";
                subEstado = "DEVUELTO_FORMALMENTE";
                esDevuelto = true;
                idAreaActual = 1; // Secretaría DFI
                idCustodioActual = 2; // Lorena Zambrano
                fechaUltimoMovimiento = item.fechaDevolucion || item.fechaRecepcion;
              }
              // 3. PAGADO: Si existe fecha válida en FECHA DE PAGO y no cayó en Archivo ni Devuelto
              else if (item.fechaPago) {
                estadoGeneral = "PAGADO";
                subEstado = "PAGO_EFECTIVO";
                autorizadoPago = true;
                idAreaActual = 4; // Tesorería
                idCustodioActual = 8; // Econ. Margarita Alarcón
                fechaUltimoMovimiento = item.fechaPago;
              }
              // 4. OBSERVADO: Si el texto contiene "observad" o "factura"
              else if (estLower.includes("observad") || estLower.includes("factura")) {
                estadoGeneral = "OBSERVADO";
                subEstado = estLower.includes("factura") ? "ESPERA_FACTURA" : "OBSERVADO";
                estaPausado = true;
                idAreaActual = 2; // Presupuesto
                idCustodioActual = idAnalista;
                fechaUltimoMovimiento = item.fechaEntregaAnalista || item.fechaRecepcion;
              }
              // 5. REVISION: Si el texto contiene "presupuesto" o "revisi"
              else if (estLower.includes("presupuesto") || estLower.includes("revisi")) {
                estadoGeneral = "REVISION";
                subEstado = estLower.includes("presupuesto") ? "EN_REVISION_PRESUPUESTO" : "EN_REVISION";
                idAreaActual = 2; // Presupuesto
                idCustodioActual = idAnalista;
                fechaUltimoMovimiento = item.fechaEntregaAnalista || item.fechaRecepcion;
              }
              // 6. CONTABILIDAD: Si contiene "justificaci", "contabil" O si existe fechaRecibeJco
              else if (
                estLower.includes("justificaci") ||
                estLower.includes("contabil") ||
                item.fechaRecibeJco
              ) {
                estadoGeneral = "CONTABILIDAD";
                subEstado = estLower.includes("justificaci")
                  ? "JUSTIFICACION_CONTABILIDAD"
                  : "EN_CONTABILIDAD";
                idAreaActual = 3; // Contabilidad
                idCustodioActual = 6; // CPA Sergio Lindao (Contador General)
                fechaUltimoMovimiento =
                  item.fechaRecibeJco || item.fechaEntregaAnalista || item.fechaRecepcion;
              }
              // 7. DFI: Fallback cuando la columna ESTADO dice "DFI" y no tiene fechaPago ni fechaRecibeJco
              else {
                estadoGeneral = "DFI";
                subEstado = "DERIVADO_A_DFI";
                idAreaActual = 1;
                const tieneAnalistaAsignado = infoAnalistas.cadenaAnalistas.length > 0;
                const esSinEfecto = item.novedades && item.novedades.toLowerCase().includes("sin efecto");
                if (tieneAnalistaAsignado && !esSinEfecto) {
                  idCustodioActual = idAnalista;
                  idAreaActual = infoAnalistas.ultimoAnalista ? infoAnalistas.ultimoAnalista.id_area : 1;
                } else {
                  idCustodioActual = 1; // Directora Financiera
                }
                fechaUltimoMovimiento =
                  item.fechaRecibeJco || item.fechaEntregaAnalista || item.fechaRecepcion;
              }

              const codigoTramite = `TRM-2026-P-${String(globalIdx + 1).padStart(4, "0")}`;

              const nuevoTramite = await tx.tramites.create({
                data: {
                  codigo_tramite: codigoTramite,
                  numero_quipux: primaryQuipux,
                  fecha_memorando: item.fechaRecepcion,
                  fecha_recepcion_fisica: item.fechaRecepcion,
                  fecha_entrega_control_previo: item.fechaEntregaAnalista,
                  fecha_aprobacion_presupuesto: item.fechaRecibeJco || null,
                  id_analista_presupuesto_previo: idAnalista || null,
                  id_tipo_tramite: idTipoTramite,
                  tipo_flujo: "PAGO",
                  padre_gestion: "PAGO",
                  tipo_gestion: item.tipoGestion,
                  area_requirente: "Dirección Financiera Aduanera",
                  ciudad: item.ciudad,
                  asunto:
                    item.descripcion ||
                    `Pago por concepto de ${item.tipoContratacion || "contratación"}`,
                  nro_tramite: item.contrato || null,
                  certificacion_presupuestaria: item.certPresup || null,
                  item_presupuestario: item.item || null,
                  proveedor_beneficiario: item.proveedor,
                  ruc_proveedor: item.ruc,
                  periodo_pago: item.periodo,
                  numero_factura: item.factura,
                  subtotal: item.valor,
                  monto_total: item.valor,
                  es_alta_cuantia: esAltaCuantia,
                  numero_cur_devengado: item.curDev,
                  numero_cur_compromiso: item.curDev,
                  fecha_pago: item.fechaPago,
                  autorizado_pago: autorizadoPago,
                  fecha_autorizacion_pago:
                    item.fechaPago || (estadoGeneral === "DFI" ? item.fechaRecibeJco : null),
                  id_area_actual: idAreaActual,
                  id_custodio_actual: idCustodioActual,
                  estado_general: estadoGeneral,
                  sub_estado: subEstado,
                  es_devuelto: esDevuelto,
                  esta_pausado: estaPausado,
                  fecha_pausa: estaPausado
                    ? item.fechaEntregaAnalista || item.fechaRecepcion
                    : null,
                  motivo_pausa: estaPausado
                    ? item.novedades || "Expediente con observaciones en trámite"
                    : null,
                  motivo_observacion: item.novedades,
                  motivo_devolucion:
                    item.memoDevolucion || (esDevuelto ? item.novedades : null),
                  anexos: item.inicialesAnalista ? `Analista: ${item.inicialesAnalista}` : null,
                  fecha_ingreso: item.fechaRecepcion,
                  fecha_ultimo_movimiento: fechaUltimoMovimiento,
                  fecha_ultima_modificacion: new Date(),
                },
              });

              // Si hubo desambiguación de homónimo, indexar el Quipux base original
              if (baseOriginalQuipux) {
                await tx.tramite_referencias.create({
                  data: {
                    id_tramite: nuevoTramite.id_tramite,
                    tipo_documento: "QUIPUX_BASE_HOMONIMO",
                    numero_documento: baseOriginalQuipux,
                    fecha_documento: item.fechaRecepcion,
                    asunto_sumilla: `Quipux original repetido en bitácora histórica (Fila ${item.filaOriginal})`,
                    id_usuario_registro: idUsuarioAdmin,
                  },
                });
                totalReferenciasCreadas++;
              }

              // Quipux adicionales vinculados en la celda
              const secondaryQuipux = quipuxList.slice(1);
              for (const extra of secondaryQuipux) {
                await tx.tramite_referencias.create({
                  data: {
                    id_tramite: nuevoTramite.id_tramite,
                    tipo_documento: "QUIPUX_VINCULADO",
                    numero_documento: extra,
                    fecha_documento: item.fechaRecepcion,
                    asunto_sumilla: "Quipux vinculado en Bitácora Histórica 2026 (Hoja PAGO)",
                    id_usuario_registro: idUsuarioAdmin,
                  },
                });
                totalReferenciasCreadas++;
              }

              // Indexar Novedades en Referencias para búsqueda global
              if (item.novedades) {
                await tx.tramite_referencias.create({
                  data: {
                    id_tramite: nuevoTramite.id_tramite,
                    tipo_documento: "NOVEDAD_BITACORA",
                    numero_documento:
                      item.novedades.length > 50
                        ? item.novedades.slice(0, 50)
                        : item.novedades,
                    fecha_documento: item.fechaRecepcion,
                    asunto_sumilla: `Novedad de bitácora: ${item.novedades}`,
                    id_usuario_registro: idUsuarioAdmin,
                  },
                });
                totalReferenciasCreadas++;
              }

              // Indexar Memorando de Devolución en Referencias
              if (item.memoDevolucion) {
                await tx.tramite_referencias.create({
                  data: {
                    id_tramite: nuevoTramite.id_tramite,
                    tipo_documento: "MEMORANDO_DEVOLUCION",
                    numero_documento:
                      item.memoDevolucion.length > 50
                        ? item.memoDevolucion.slice(0, 50)
                        : item.memoDevolucion,
                    fecha_documento: item.fechaDevolucion || item.fechaRecepcion,
                    asunto_sumilla: `Memorando de Devolución formal: ${item.memoDevolucion}`,
                    id_usuario_registro: idUsuarioAdmin,
                  },
                });
                totalReferenciasCreadas++;
              }

              // Historial de movimientos: Traspasos entre analistas de Presupuesto
              if (infoAnalistas.cadenaAnalistas.length > 1) {
                const primerAnalista = infoAnalistas.cadenaAnalistas[0];
                await tx.historial_movimientos.create({
                  data: {
                    id_tramite: nuevoTramite.id_tramite,
                    id_usuario_entrega: idUsuarioAdmin,
                    id_usuario_recibe: primerAnalista.id_usuario,
                    id_area_origen: 1,
                    id_area_destino: primerAnalista.id_area,
                    tipo_accion: "ASIGNACION_ANALISTA",
                    comentarios: `Asignación inicial histórica a analista ${primerAnalista.nombre_completo} (${primerAnalista.token}) registrada en bitácora.`,
                    fecha_hora: item.fechaEntregaAnalista || item.fechaRecepcion,
                  },
                });

                for (let k = 1; k < infoAnalistas.cadenaAnalistas.length; k++) {
                  const previo = infoAnalistas.cadenaAnalistas[k - 1];
                  const actual = infoAnalistas.cadenaAnalistas[k];
                  await tx.historial_movimientos.create({
                    data: {
                      id_tramite: nuevoTramite.id_tramite,
                      id_usuario_entrega: previo.id_usuario,
                      id_usuario_recibe: actual.id_usuario,
                      id_area_origen: previo.id_area,
                      id_area_destino: actual.id_area,
                      tipo_accion: "TRASPASO_CUSTODIA",
                      comentarios: `Traspaso / Reasignación interna en Presupuesto (${previo.token} -> ${actual.token}): recibido por ${actual.nombre_completo}.`,
                      fecha_hora: item.fechaEntregaAnalista || item.fechaRecepcion,
                    },
                  });
                }
              }

              // Historial: Pase a Contabilidad si tuvo fecha JCO
              if (item.fechaRecibeJco) {
                await tx.historial_movimientos.create({
                  data: {
                    id_tramite: nuevoTramite.id_tramite,
                    id_usuario_entrega: idAnalista,
                    id_usuario_recibe: 6, // CPA Sergio Lindao (Contador General)
                    id_area_origen: 2,
                    id_area_destino: 3,
                    tipo_accion: "PASE_A_CONTABILIDAD",
                    comentarios: `Expediente revisado en Presupuesto y entregado a Contabilidad (JCO) para Control Previo.`,
                    fecha_hora: item.fechaRecibeJco,
                  },
                });
              }

              // Historial: Movimiento del estado final / actual del trámite
              await tx.historial_movimientos.create({
                data: {
                  id_tramite: nuevoTramite.id_tramite,
                  id_usuario_entrega: item.fechaRecibeJco
                    ? 6
                    : infoAnalistas.ultimoAnalista?.id_usuario || idUsuarioAdmin,
                  id_usuario_recibe: idCustodioActual,
                  id_area_origen: idAreaActual,
                  id_area_destino: idAreaActual,
                  tipo_accion: "MIGRACION_EXCEL_2026",
                  comentarios: `Migración histórica Bitácora 2026 (Hoja PAGO, Fila ${item.filaOriginal}). Estado bitácora: ${item.estadoRaw}. Analistas: ${item.inicialesAnalista || "N/A"}${
                    infoAnalistas.ultimoAnalista
                      ? ` (Analista Presupuesto: ${infoAnalistas.ultimoAnalista.nombre_completo})`
                      : ""
                  }${item.novedades ? ` | Novedades: ${item.novedades}` : ""}${
                    item.memoDevolucion ? ` | Memo Devolución: ${item.memoDevolucion}` : ""
                  }.`,
                  fecha_hora: fechaUltimoMovimiento,
                },
              });

              migradosPago++;
            } catch (err: any) {
              errores.push({
                hoja: "PAGO",
                fila: item.filaOriginal,
                mensaje: err.message || String(err),
              });
            }
          }
        });
      }
    }

    // =========================================================================
    // 2. PROCESAR HOJA GARANTÍA (Orden Cronológico Estricto)
    // =========================================================================
    const wsGarantia = obtenerHoja(wb, "GARANTIA");
    if (wsGarantia) {
      const filasGarantia: Array<{
        filaOriginal: number;
        colNum: string;
        tipoPagoRaw: string;
        ciudad: string;
        quipuxRaw: string;
        fechaIngreso: Date;
        fechaEntregaAnalista: Date | null;
        descripcion: string;
        nroLiquidacion: string | null;
        beneficiario: string;
        valor: number;
        curContable: string | null;
        fechaRecibeJco: Date | null;
        fechaRecibeJac: Date | null;
        fechaSolPago: Date | null;
        inicialesAnalista: string;
        estadoRaw: string;
        novedades: string | null;
        fechaDevolucion: Date | null;
        memoDevolucion: string | null;
      }> = [];

      let consecutiveEmpty = 0;
      for (let r = 4; r <= wsGarantia.rowCount; r++) {
        const row = wsGarantia.getRow(r);
        const colNum = (row.getCell(1).text || "").trim();
        const quipuxRaw = (row.getCell(4).text || "").trim();
        if (!colNum && !quipuxRaw) {
          consecutiveEmpty++;
          if (consecutiveEmpty >= 10) break;
          continue;
        }
        consecutiveEmpty = 0;

        let fechaIngreso = parseFechaEcuador(row.getCell(5).value, null, quipuxRaw);

        // Errata de año nuevo en recepción/ingreso si quipux dice 2026
        if (
          fechaIngreso &&
          fechaIngreso.getUTCFullYear() === 2025 &&
          (fechaIngreso.getUTCMonth() === 0 || fechaIngreso.getUTCMonth() === 1) &&
          quipuxRaw.includes("-2026-")
        ) {
          fechaIngreso = new Date(Date.UTC(2026, fechaIngreso.getUTCMonth(), fechaIngreso.getUTCDate(), 12, 0, 0));
        }
        if (!fechaIngreso) {
          fechaIngreso = new Date("2026-01-05T12:00:00.000Z");
        }

        filasGarantia.push({
          filaOriginal: r,
          colNum,
          tipoPagoRaw: (row.getCell(2).text || "Garantía").trim(),
          ciudad: normalizarCiudad(row.getCell(3).text),
          quipuxRaw,
          fechaIngreso,
          fechaEntregaAnalista: parseFechaEcuador(row.getCell(6).value, fechaIngreso, quipuxRaw),
          descripcion: (row.getCell(7).text || "").trim(),
          nroLiquidacion: (row.getCell(8).text || "").trim() || null,
          beneficiario: (row.getCell(9).text || "").trim() || "BENEFICIARIO DE GARANTÍA",
          valor: parseMontoEcuador(row.getCell(10).value),
          curContable: (row.getCell(11).text || "").trim() || null,
          fechaRecibeJco: parseFechaEcuador(row.getCell(12).value, fechaIngreso, quipuxRaw),
          fechaRecibeJac: parseFechaEcuador(row.getCell(13).value, fechaIngreso, quipuxRaw),
          fechaSolPago: parseFechaEcuador(row.getCell(14).value, fechaIngreso, quipuxRaw),
          inicialesAnalista: (row.getCell(15).text || "").trim(),
          estadoRaw: (row.getCell(16).text || "DFI").trim(),
          novedades: (row.getCell(17).text || "").trim() || null,
          fechaDevolucion: parseFechaEcuador(row.getCell(18).value, fechaIngreso, quipuxRaw),
          memoDevolucion: (row.getCell(19).text || "").trim() || null,
        });
      }

      // Ordenar cronológicamente por fecha de ingreso ascendente
      filasGarantia.sort(
        (a, b) =>
          a.fechaIngreso.getTime() - b.fechaIngreso.getTime() ||
          a.filaOriginal - b.filaOriginal
      );

      // Inserción en bloques de 50 transacciones atómicas
      const CHUNK_SIZE = 50;
      for (let i = 0; i < filasGarantia.length; i += CHUNK_SIZE) {
        const chunk = filasGarantia.slice(i, i + CHUNK_SIZE);

        await prisma.$transaction(async (tx) => {
          for (let cIdx = 0; cIdx < chunk.length; cIdx++) {
            const item = chunk[cIdx];
            const globalIdx = i + cIdx;

            try {
              const quipuxList = extraerQuipux(item.quipuxRaw);
              let primaryQuipux = quipuxList[0] || `GAR-2026-F${item.filaOriginal}`;
              let baseOriginalQuipux: string | null = null;

              if (existingQuipuxSet.has(primaryQuipux.toUpperCase())) {
                baseOriginalQuipux = primaryQuipux;
                primaryQuipux = `${primaryQuipux}-G${item.filaOriginal}`;
              }
              existingQuipuxSet.add(primaryQuipux.toUpperCase());

              const infoAnalistas = resolverCadenaAnalistas(
                item.inicialesAnalista,
                mapaUsuariosPorInicial,
                5,
                9
              );
              const idAnalista = infoAnalistas.idAnalistaActivo;

              const { idTipoTramite, tipoGestion } = mapearTipoTramiteGarantia(
                item.tipoPagoRaw,
                item.descripcion
              );
              const numeroJuicio = extraerNumeroJuicio(item.descripcion);
              const esAltaCuantia = item.valor >= 10000;

              // Clasificación exacta en los 7 estados oficiales inmutables según orden jerárquico maestro (Garantías)
              const estLower = item.estadoRaw.toLowerCase();
              let estadoGeneral = "DFI";
              let subEstado = "DERIVADO_A_DFI";
              let idAreaActual = 1;
              let idCustodioActual = 1;
              let esDevuelto = false;
              let estaPausado = false;
              let autorizadoPago = false;
              let fechaUltimoMovimiento = item.fechaIngreso;

              // 1. ARCHIVO
              if (estLower.includes("archiv")) {
                estadoGeneral = "ARCHIVO";
                subEstado = "ARCHIVADO_DEFINITIVO";
                idAreaActual = 6;
                idCustodioActual = 10;
                fechaUltimoMovimiento = item.fechaIngreso;
              }
              // 2. DEVUELTO: Si el texto contiene "devuel" O si existe fecha válida en FECHA DE DEVOLUCIÓN
              else if (estLower.includes("devuel") || item.fechaDevolucion) {
                estadoGeneral = "DEVUELTO";
                subEstado = "DEVUELTO_FORMALMENTE";
                esDevuelto = true;
                idAreaActual = 1;
                idCustodioActual = 2;
                fechaUltimoMovimiento = item.fechaDevolucion || item.fechaIngreso;
              }
              // 3. PAGADO: Si existe fechaSolPago y no cayó en Archivo ni Devuelto
              else if (item.fechaSolPago) {
                estadoGeneral = "PAGADO";
                subEstado = "PAGO_EFECTIVO";
                autorizadoPago = true;
                idAreaActual = 5; // Cobranzas y Garantías
                idCustodioActual = 9; // Abg. Roberto Intriago
                fechaUltimoMovimiento = item.fechaSolPago;
              }
              // 4. OBSERVADO: Si contiene "observad" o "factura"
              else if (estLower.includes("observad") || estLower.includes("factura")) {
                estadoGeneral = "OBSERVADO";
                subEstado = estLower.includes("factura") ? "ESPERA_FACTURA" : "OBSERVADO";
                estaPausado = true;
                idAreaActual = 5;
                idCustodioActual = idAnalista;
                fechaUltimoMovimiento = item.fechaEntregaAnalista || item.fechaIngreso;
              }
              // 5. REVISION: Si contiene "revisión", "revision" o "presupuesto"
              else if (
                estLower.includes("revisión") ||
                estLower.includes("revision") ||
                estLower.includes("presupuesto")
              ) {
                estadoGeneral = "REVISION";
                subEstado = estLower.includes("presupuesto") ? "EN_REVISION_PRESUPUESTO" : "EN_REVISION";
                idAreaActual = 2;
                idCustodioActual = idAnalista;
                fechaUltimoMovimiento = item.fechaEntregaAnalista || item.fechaIngreso;
              }
              // 6. CONTABILIDAD: Si contiene "justificaci", "contabil" O si existe fechaRecibeJco
              else if (
                estLower.includes("justificaci") ||
                estLower.includes("contabil") ||
                item.fechaRecibeJco
              ) {
                estadoGeneral = "CONTABILIDAD";
                subEstado = estLower.includes("justificaci")
                  ? "JUSTIFICACION_CONTABILIDAD"
                  : "EN_CONTABILIDAD";
                idAreaActual = 3;
                idCustodioActual = 6;
                fechaUltimoMovimiento =
                  item.fechaRecibeJco || item.fechaEntregaAnalista || item.fechaIngreso;
              }
              // 7. DFI: Fallback cuando la columna ESTADO dice "DFI"
              else {
                estadoGeneral = "DFI";
                subEstado = "DERIVADO_A_DFI";
                idAreaActual = 1;
                const tieneAnalistaAsignado = infoAnalistas.cadenaAnalistas.length > 0;
                const esSinEfecto = item.novedades && item.novedades.toLowerCase().includes("sin efecto");
                if (tieneAnalistaAsignado && !esSinEfecto) {
                  idCustodioActual = idAnalista;
                  idAreaActual = infoAnalistas.ultimoAnalista ? infoAnalistas.ultimoAnalista.id_area : 5;
                } else {
                  idCustodioActual = 1;
                }
                fechaUltimoMovimiento =
                  item.fechaRecibeJco || item.fechaEntregaAnalista || item.fechaIngreso;
              }

              const codigoTramite = `TRM-2026-G-${String(globalIdx + 1).padStart(4, "0")}`;

              const nuevoTramite = await tx.tramites.create({
                data: {
                  codigo_tramite: codigoTramite,
                  numero_quipux: primaryQuipux,
                  fecha_memorando: item.fechaIngreso,
                  fecha_recepcion_fisica: item.fechaIngreso,
                  fecha_entrega_control_previo: item.fechaEntregaAnalista,
                  fecha_aprobacion_presupuesto: item.fechaRecibeJco || null,
                  id_analista_presupuesto_previo: idAnalista || null,
                  id_tipo_tramite: idTipoTramite,
                  tipo_flujo: "GARANTIA",
                  padre_gestion: "GARANTIA",
                  tipo_gestion: tipoGestion,
                  area_requirente: "Dirección Financiera Aduanera",
                  ciudad: item.ciudad,
                  asunto: item.descripcion || `Devolución de Garantía / Caución`,
                  nro_tramite: item.nroLiquidacion || null,
                  numero_liquidacion: item.nroLiquidacion || null,
                  numero_juicio: numeroJuicio,
                  proveedor_beneficiario: item.beneficiario,
                  subtotal: item.valor,
                  monto_total: item.valor,
                  es_alta_cuantia: esAltaCuantia,
                  numero_cur_contable: item.curContable,
                  fecha_pago: item.fechaSolPago,
                  autorizado_pago: autorizadoPago,
                  fecha_autorizacion_pago:
                    item.fechaSolPago || (estadoGeneral === "DFI" ? item.fechaRecibeJco : null),
                  id_area_actual: idAreaActual,
                  id_custodio_actual: idCustodioActual,
                  estado_general: estadoGeneral,
                  sub_estado: subEstado,
                  es_devuelto: esDevuelto,
                  esta_pausado: estaPausado,
                  fecha_pausa: estaPausado
                    ? item.fechaEntregaAnalista || item.fechaIngreso
                    : null,
                  motivo_pausa: estaPausado
                    ? item.novedades || "Garantía con observaciones en trámite"
                    : null,
                  motivo_observacion: item.novedades,
                  motivo_devolucion:
                    item.memoDevolucion || (esDevuelto ? item.novedades : null),
                  anexos: item.inicialesAnalista ? `Analista: ${item.inicialesAnalista}` : null,
                  fecha_ingreso: item.fechaIngreso,
                  fecha_ultimo_movimiento: fechaUltimoMovimiento,
                  fecha_ultima_modificacion: new Date(),
                },
              });

              // Si hubo desambiguación de homónimo, indexar el Quipux base original
              if (baseOriginalQuipux) {
                await tx.tramite_referencias.create({
                  data: {
                    id_tramite: nuevoTramite.id_tramite,
                    tipo_documento: "QUIPUX_BASE_HOMONIMO",
                    numero_documento: baseOriginalQuipux,
                    fecha_documento: item.fechaIngreso,
                    asunto_sumilla: `Quipux original repetido en bitácora histórica de garantías (Fila ${item.filaOriginal})`,
                    id_usuario_registro: idUsuarioAdmin,
                  },
                });
                totalReferenciasCreadas++;
              }

              // Indexar Quipux secundarios
              const secondaryQuipux = quipuxList.slice(1);
              for (const extra of secondaryQuipux) {
                await tx.tramite_referencias.create({
                  data: {
                    id_tramite: nuevoTramite.id_tramite,
                    tipo_documento: "QUIPUX_VINCULADO",
                    numero_documento: extra,
                    fecha_documento: item.fechaIngreso,
                    asunto_sumilla: "Quipux vinculado en Bitácora Histórica 2026 (Hoja GARANTÍA)",
                    id_usuario_registro: idUsuarioAdmin,
                  },
                });
                totalReferenciasCreadas++;
              }

              // Indexar número de juicio en Referencias para búsqueda especializada
              if (numeroJuicio) {
                await tx.tramite_referencias.create({
                  data: {
                    id_tramite: nuevoTramite.id_tramite,
                    tipo_documento: "JUICIO_COACTIVA",
                    numero_documento: numeroJuicio,
                    fecha_documento: item.fechaIngreso,
                    asunto_sumilla: `Causa Judicial / Proceso Coactivo identificado: ${numeroJuicio}`,
                    id_usuario_registro: idUsuarioAdmin,
                  },
                });
                totalReferenciasCreadas++;
              }

              // Indexar Novedades en Referencias
              if (item.novedades) {
                await tx.tramite_referencias.create({
                  data: {
                    id_tramite: nuevoTramite.id_tramite,
                    tipo_documento: "NOVEDAD_BITACORA",
                    numero_documento:
                      item.novedades.length > 50
                        ? item.novedades.slice(0, 50)
                        : item.novedades,
                    fecha_documento: item.fechaIngreso,
                    asunto_sumilla: `Novedad de garantía: ${item.novedades}`,
                    id_usuario_registro: idUsuarioAdmin,
                  },
                });
                totalReferenciasCreadas++;
              }

              // Indexar Memorando de Devolución en Referencias
              if (item.memoDevolucion) {
                await tx.tramite_referencias.create({
                  data: {
                    id_tramite: nuevoTramite.id_tramite,
                    tipo_documento: "MEMORANDO_DEVOLUCION",
                    numero_documento:
                      item.memoDevolucion.length > 50
                        ? item.memoDevolucion.slice(0, 50)
                        : item.memoDevolucion,
                    fecha_documento: item.fechaDevolucion || item.fechaIngreso,
                    asunto_sumilla: `Memorando de Devolución formal: ${item.memoDevolucion}`,
                    id_usuario_registro: idUsuarioAdmin,
                  },
                });
                totalReferenciasCreadas++;
              }

              // Historial de movimientos: Traspasos entre analistas
              if (infoAnalistas.cadenaAnalistas.length > 1) {
                const primerAnalista = infoAnalistas.cadenaAnalistas[0];
                await tx.historial_movimientos.create({
                  data: {
                    id_tramite: nuevoTramite.id_tramite,
                    id_usuario_entrega: idUsuarioAdmin,
                    id_usuario_recibe: primerAnalista.id_usuario,
                    id_area_origen: 1,
                    id_area_destino: primerAnalista.id_area,
                    tipo_accion: "ASIGNACION_ANALISTA",
                    comentarios: `Asignación inicial histórica a analista ${primerAnalista.nombre_completo} (${primerAnalista.token}) registrada en bitácora.`,
                    fecha_hora: item.fechaEntregaAnalista || item.fechaIngreso,
                  },
                });

                for (let k = 1; k < infoAnalistas.cadenaAnalistas.length; k++) {
                  const previo = infoAnalistas.cadenaAnalistas[k - 1];
                  const actual = infoAnalistas.cadenaAnalistas[k];
                  await tx.historial_movimientos.create({
                    data: {
                      id_tramite: nuevoTramite.id_tramite,
                      id_usuario_entrega: previo.id_usuario,
                      id_usuario_recibe: actual.id_usuario,
                      id_area_origen: previo.id_area,
                      id_area_destino: actual.id_area,
                      tipo_accion: "TRASPASO_CUSTODIA",
                      comentarios: `Traspaso / Reasignación interna (${previo.token} -> ${actual.token}): recibido por ${actual.nombre_completo}.`,
                      fecha_hora: item.fechaEntregaAnalista || item.fechaIngreso,
                    },
                  });
                }
              }

              // Historial: Pase a Contabilidad si tuvo fecha JCO
              if (item.fechaRecibeJco) {
                await tx.historial_movimientos.create({
                  data: {
                    id_tramite: nuevoTramite.id_tramite,
                    id_usuario_entrega: idAnalista,
                    id_usuario_recibe: 6, // CPA Sergio Lindao (Contador General)
                    id_area_origen: 5, // Cobranzas y Garantías
                    id_area_destino: 3, // Contabilidad
                    tipo_accion: "PASE_A_CONTABILIDAD",
                    comentarios: `Expediente de garantía/caución entregado a Contabilidad (JCO) para Control Previo.`,
                    fecha_hora: item.fechaRecibeJco,
                  },
                });
              }

              // Historial: Movimiento del estado final / actual del trámite
              await tx.historial_movimientos.create({
                data: {
                  id_tramite: nuevoTramite.id_tramite,
                  id_usuario_entrega: item.fechaRecibeJco
                    ? 6
                    : infoAnalistas.ultimoAnalista?.id_usuario || idUsuarioAdmin,
                  id_usuario_recibe: idCustodioActual,
                  id_area_origen: idAreaActual === 5 ? 5 : 1,
                  id_area_destino: idAreaActual,
                  tipo_accion: "MIGRACION_EXCEL_2026",
                  comentarios: `Migración histórica Bitácora 2026 (Hoja GARANTÍA, Fila ${item.filaOriginal}). Estado bitácora: ${item.estadoRaw}. Analistas: ${item.inicialesAnalista || "N/A"}${
                    infoAnalistas.ultimoAnalista
                      ? ` (Analista: ${infoAnalistas.ultimoAnalista.nombre_completo})`
                      : ""
                  }${item.novedades ? ` | Novedades: ${item.novedades}` : ""}${
                    item.memoDevolucion ? ` | Memo Devolución: ${item.memoDevolucion}` : ""
                  }.`,
                  fecha_hora: fechaUltimoMovimiento,
                },
              });

              migradosGarantia++;
            } catch (err: any) {
              errores.push({
                hoja: "GARANTÍA",
                fila: item.filaOriginal,
                mensaje: err.message || String(err),
              });
            }
          }
        });
      }
    }

    const tFin = Date.now();

    return {
      exito: errores.length === 0 || (migradosPago + migradosGarantia > 0),
      migrados_pago: migradosPago,
      migrados_garantia: migradosGarantia,
      total_migrados: migradosPago + migradosGarantia,
      total_referencias_creadas: totalReferenciasCreadas,
      errores,
      tiempo_ms: tFin - tInicio,
    };
  }
}
