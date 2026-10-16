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
  return texto
    .split(/[,/;\-]+/)
    .map((s) => s.trim().toUpperCase())
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

function normalizarCiudad(ciudadRaw: any): string {
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

function parseExcelDate(val: any): Date | null {
  if (!val) return null;
  if (val instanceof Date && !isNaN(val.getTime())) return val;
  if (typeof val === "number") {
    // Excel serial date to JS Date (1899-12-30)
    const excelEpoch = new Date(Date.UTC(1899, 11, 30));
    return new Date(excelEpoch.getTime() + val * 86400000);
  }
  if (typeof val === "string") {
    const trimmed = val.trim();
    if (!trimmed || trimmed === "N/A" || trimmed === "-") return null;
    const parsed = new Date(trimmed);
    if (!isNaN(parsed.getTime())) return parsed;
    const parts = trimmed.split(/[/.-]/);
    if (parts.length === 3) {
      const d = parseInt(parts[0], 10);
      const m = parseInt(parts[1], 10) - 1;
      const y = parseInt(parts[2], 10);
      const year = y < 100 ? 2000 + y : y;
      const dt = new Date(year, m, d);
      if (!isNaN(dt.getTime())) return dt;
    }
  }
  return null;
}

function parseDecimal(val: any): number {
  if (val === null || val === undefined) return 0;
  if (typeof val === "number") return isNaN(val) ? 0 : Math.round(val * 100) / 100;
  if (typeof val === "string") {
    const clean = val.replace(/[^0-9.-]+/g, "");
    const parsed = parseFloat(clean);
    return isNaN(parsed) ? 0 : Math.round(parsed * 100) / 100;
  }
  return 0;
}

function obtenerHoja(wb: ExcelJS.Workbook, tipo: "PAGO" | "GARANTIA"): ExcelJS.Worksheet | undefined {
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

function extraerQuipux(texto: string): string[] {
  if (!texto) return [];
  const tokens = texto.split(/[\s\r\n,;]+/);
  const list: string[] = [];
  for (const t of tokens) {
    const clean = t.trim();
    if (clean.length >= 6 && clean.includes("-")) {
      list.push(clean);
    }
  }
  if (list.length === 0 && texto.trim()) {
    list.push(texto.trim());
  }
  return list;
}

function mapearAnalista(iniciales: string): number {
  if (!iniciales) return 3; // Jefatura de Presupuesto por defecto
  const clean = iniciales.trim().toUpperCase();
  const primera = clean.split("/")[0].trim();
  return MAPA_ANALISTAS_FALLBACK[primera] || MAPA_ANALISTAS_FALLBACK[clean] || 3;
}

function mapearTipoTramitePago(tipoContratacion: string): number {
  if (!tipoContratacion) return 17; // OTROS_PROCESOS
  const s = tipoContratacion.toLowerCase();
  if (s.includes("básico") || s.includes("basico") || s.includes("servicio")) return 1; // SERV_BASICOS
  if (s.includes("ínfima") || s.includes("infima")) return 2; // INFIMA_CUANTIA
  if (s.includes("contrato") || s.includes("sncp") || s.includes("subasta") || s.includes("catálogo") || s.includes("catalogo")) return 3; // CONTRATACION_SNCP
  if (s.includes("talento") || s.includes("dnth")) return 4; // CONTRATO_DNTH
  if (s.includes("caja chica")) return 5; // CAJA_CHICA
  if (s.includes("viático") || s.includes("viatico")) return 8; // VIATICOS_FUNC
  if (s.includes("convenio")) return 11; // CONVENIOS_PAGO
  if (s.includes("remuneraci")) return 12; // REMUNERACIONES
  if (s.includes("reembolso")) return 13; // REEMBOLSOS_GASTOS
  if (s.includes("póliza") || s.includes("poliza") || s.includes("seguro")) return 15; // POLIZAS_SEGUROS
  return 17; // OTROS_PROCESOS
}

function mapearTipoTramiteGarantia(tipoPago: string): number {
  if (!tipoPago) return 6; // GARANTIAS_ADUANA
  const s = tipoPago.toLowerCase();
  if (s.includes("caución") || s.includes("caucion")) return 7; // DEV_CAUCIONES
  return 6; // GARANTIAS_ADUANA
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
   * Analiza el archivo Excel de la bitácora histórica y extrae métricas y vistas previas.
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
    const yaMigrados = await prisma.historial_movimientos.count({
      where: {
        tipo_accion: "MIGRACION_EXCEL_2026",
      },
    });

    // 1. Hoja PAGO
    const wsPago = obtenerHoja(wb, "PAGO");
    let totalPago = 0;
    const estadosPago: Record<string, number> = {};
    const ciudades: Record<string, number> = {};
    const muestrasPago: AnalisisExcelResult["muestras_pago"] = [];

    if (wsPago) {
      for (let r = 5; r <= wsPago.rowCount; r++) {
        const row = wsPago.getRow(r);
        const colNum = (row.getCell(1).text || "").trim();
        const quipuxRaw = (row.getCell(4).text || "").trim();
        if (!colNum && !quipuxRaw) continue;

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
            valor: parseDecimal(row.getCell(16).value),
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
      for (let r = 4; r <= wsGarantia.rowCount; r++) {
        const row = wsGarantia.getRow(r);
        const colNum = (row.getCell(1).text || "").trim();
        const quipuxRaw = (row.getCell(4).text || "").trim();
        if (!colNum && !quipuxRaw) continue;

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
            valor: parseDecimal(row.getCell(10).value),
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
   * Ejecuta la migración e inserción de todos los registros históricos en la base de datos.
   */
  public static async ejecutarMigracion(
    filePath: string = RUTA_DEFAULT_EXCEL_2026,
    idUsuarioAdmin: number = 11
  ): Promise<EjecucionMigracionResult> {
    const tInicio = Date.now();
    const errores: Array<{ hoja: string; fila: number; mensaje: string }> = [];

    if (!fs.existsSync(filePath)) {
      throw new Error(`El archivo de bitácora no se encuentra en la ruta: ${filePath}`);
    }

    const wb = new ExcelJS.Workbook();
    await wb.xlsx.readFile(filePath);

    let migradosPago = 0;
    let migradosGarantia = 0;
    let totalReferenciasCreadas = 0;

    // Obtener los Quipux existentes para prevenir colisiones
    const existingQuipuxSet = new Set(
      (await prisma.tramites.findMany({ select: { numero_quipux: true } })).map(
        (t) => t.numero_quipux.toUpperCase()
      )
    );

    // Cargar dinámicamente el catálogo oficial de funcionarios (activos e históricos) con iniciales configuradas
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

      for (let r = 5; r <= wsPago.rowCount; r++) {
        const row = wsPago.getRow(r);
        const colNum = (row.getCell(1).text || "").trim();
        const quipuxRaw = (row.getCell(4).text || "").trim();
        if (!colNum && !quipuxRaw) continue;

        const fechaRecepcion = parseExcelDate(row.getCell(5).value) || new Date("2026-01-05");
        filasPago.push({
          filaOriginal: r,
          colNum,
          quipuxRaw,
          ciudad: normalizarCiudad(row.getCell(3).text),
          fechaRecepcion,
          fechaEntregaAnalista: parseExcelDate(row.getCell(6).value),
          fechaRecibeJco: parseExcelDate(row.getCell(18).value),
          fechaPago: parseExcelDate(row.getCell(20).value),
          tipoContratacion: (row.getCell(7).text || "").trim(),
          contrato: (row.getCell(8).text || "").trim(),
          certPresup: (row.getCell(9).text || "").trim(),
          item: (row.getCell(10).text || "").trim(),
          descripcion: (row.getCell(11).text || "").trim(),
          ruc: (row.getCell(12).text || "").trim() || null,
          proveedor: (row.getCell(13).text || "").trim() || "N/A",
          periodo: (row.getCell(14).text || "").trim() || null,
          factura: (row.getCell(15).text || "").trim() || null,
          valor: parseDecimal(row.getCell(16).value),
          curDev: (row.getCell(17).text || "").trim() || null,
          inicialesAnalista: (row.getCell(21).text || "").trim(),
          estadoRaw: (row.getCell(22).text || "DFI").trim(),
          novedades: (row.getCell(23).text || "").trim() || null,
          fechaDevolucion: parseExcelDate(row.getCell(24).value),
          memoDevolucion: (row.getCell(25).text || "").trim() || null,
        });
      }

      // Ordenar cronológicamente por fecha de recepción ascendente
      filasPago.sort(
        (a, b) =>
          a.fechaRecepcion.getTime() - b.fechaRecepcion.getTime() ||
          a.filaOriginal - b.filaOriginal
      );

      for (let idx = 0; idx < filasPago.length; idx++) {
        const item = filasPago[idx];

        try {
          const quipuxList = extraerQuipux(item.quipuxRaw);
          let primaryQuipux = quipuxList[0] || `PAGO-2026-F${item.filaOriginal}`;
          if (existingQuipuxSet.has(primaryQuipux.toUpperCase())) {
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

          const idTipoTramite = mapearTipoTramitePago(item.tipoContratacion);
          const esAltaCuantia = item.valor >= 10000;

          // ===================================================================
          // CLASIFICACIÓN EXACTA EN LOS 7 ESTADOS REALES
          // ===================================================================
          const estLower = item.estadoRaw.toLowerCase();
          let estadoGeneral = "DFI";
          let subEstado = "DERIVADO_A_DFI";
          let idAreaActual = 1;
          let idCustodioActual = 1; // Directora Financiera
          let esDevuelto = false;
          let estaPausado = false;
          let autorizadoPago = false;
          let fechaUltimoMovimiento = item.fechaRecepcion;

          // BUCKET 1: PAGADO (Fecha de pago registrada en Tesorería)
          if (item.fechaPago) {
            estadoGeneral = "PAGADO";
            subEstado = "PAGO_EFECTIVO";
            autorizadoPago = true;
            idAreaActual = 4; // Tesorería
            idCustodioActual = 8; // Econ. Margarita Alarcón
            fechaUltimoMovimiento = item.fechaPago;
          }
          // BUCKET 2: ARCHIVO (Expediente custodiado en Archivo Central)
          else if (estLower.includes("archiv")) {
            estadoGeneral = "ARCHIVO";
            subEstado = "ARCHIVADO_DEFINITIVO";
            idAreaActual = 6; // Archivo Central
            idCustodioActual = 10; // Sr. Manuel Ramos
            fechaUltimoMovimiento = item.fechaRecepcion;
          }
          // BUCKET 3: DEVUELTO (Devuelto formalmente a la entidad requirente)
          else if (
            estLower.includes("devuel") ||
            item.fechaDevolucion ||
            (item.memoDevolucion && item.memoDevolucion.toLowerCase().includes("devuel"))
          ) {
            estadoGeneral = "DEVUELTO";
            subEstado = "DEVUELTO_FORMALMENTE";
            esDevuelto = true;
            idAreaActual = 1; // Secretaría DFI
            idCustodioActual = 2; // Lorena Zambrano
            fechaUltimoMovimiento = item.fechaDevolucion || item.fechaRecepcion;
          }
          // BUCKET 4: CONTABILIDAD (Control Previo / Justificación de partida)
          else if (
            estLower.includes("contabil") ||
            estLower.includes("justificaci") ||
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
          // BUCKET 5: OBSERVADO / FACTURA (Pausado con novedad o a espera de factura)
          else if (estLower.includes("observad") || estLower.includes("factura")) {
            estadoGeneral = "OBSERVADO";
            subEstado = estLower.includes("factura") ? "ESPERA_FACTURA" : "OBSERVADO";
            estaPausado = true;
            idAreaActual = 2; // Presupuesto
            idCustodioActual = idAnalista;
            fechaUltimoMovimiento = item.fechaEntregaAnalista || item.fechaRecepcion;
          }
          // BUCKET 6: EN REVISIÓN EN PRESUPUESTO
          else if (estLower.includes("presupuesto") || estLower.includes("revisi")) {
            estadoGeneral = "REVISION";
            subEstado = "EN_REVISION_PRESUPUESTO";
            idAreaActual = 2; // Presupuesto
            idCustodioActual = idAnalista;
            fechaUltimoMovimiento = item.fechaEntregaAnalista || item.fechaRecepcion;
          }
          // BUCKET 7: EN DFI PENDIENTE DE AUTORIZACIÓN DE PAGO
          else {
            estadoGeneral = "DFI";
            subEstado = "DERIVADO_A_DFI";
            idAreaActual = 1;
            idCustodioActual = 1; // Directora Financiera
            fechaUltimoMovimiento =
              item.fechaRecibeJco || item.fechaEntregaAnalista || item.fechaRecepcion;
          }

          // Numeración correlativa cronológica estricta
          const codigoTramite = `TRM-2026-P-${String(idx + 1).padStart(4, "0")}`;

          const nuevoTramite = await prisma.tramites.create({
            data: {
              codigo_tramite: codigoTramite,
              numero_quipux: primaryQuipux,
              fecha_memorando: item.fechaRecepcion,
              fecha_recepcion_fisica: item.fechaRecepcion,
              fecha_entrega_control_previo: item.fechaEntregaAnalista,
              id_tipo_tramite: idTipoTramite,
              tipo_flujo: "PAGO",
              padre_gestion: "PAGO",
              tipo_gestion: "PAGO",
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
              fecha_ingreso: item.fechaRecepcion,
              fecha_ultimo_movimiento: fechaUltimoMovimiento,
              fecha_ultima_modificacion: new Date(),
            },
          });

          // Quipux adicionales vinculados
          const secondaryQuipux = quipuxList.slice(1);
          for (const extra of secondaryQuipux) {
            await prisma.tramite_referencias.create({
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
            await prisma.tramite_referencias.create({
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
            await prisma.tramite_referencias.create({
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
            await prisma.historial_movimientos.create({
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

            for (let i = 1; i < infoAnalistas.cadenaAnalistas.length; i++) {
              const previo = infoAnalistas.cadenaAnalistas[i - 1];
              const actual = infoAnalistas.cadenaAnalistas[i];
              await prisma.historial_movimientos.create({
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
            await prisma.historial_movimientos.create({
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
          await prisma.historial_movimientos.create({
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

      for (let r = 4; r <= wsGarantia.rowCount; r++) {
        const row = wsGarantia.getRow(r);
        const colNum = (row.getCell(1).text || "").trim();
        const quipuxRaw = (row.getCell(4).text || "").trim();
        if (!colNum && !quipuxRaw) continue;

        const fechaIngreso = parseExcelDate(row.getCell(5).value) || new Date("2026-01-05");
        filasGarantia.push({
          filaOriginal: r,
          colNum,
          tipoPagoRaw: (row.getCell(2).text || "Garantía").trim(),
          ciudad: normalizarCiudad(row.getCell(3).text),
          quipuxRaw,
          fechaIngreso,
          fechaEntregaAnalista: parseExcelDate(row.getCell(6).value),
          descripcion: (row.getCell(7).text || "").trim(),
          nroLiquidacion: (row.getCell(8).text || "").trim() || null,
          beneficiario: (row.getCell(9).text || "").trim() || "N/A",
          valor: parseDecimal(row.getCell(10).value),
          curContable: (row.getCell(11).text || "").trim() || null,
          fechaRecibeJco: parseExcelDate(row.getCell(12).value),
          fechaRecibeJac: parseExcelDate(row.getCell(13).value),
          fechaSolPago: parseExcelDate(row.getCell(14).value),
          inicialesAnalista: (row.getCell(15).text || "").trim(),
          estadoRaw: (row.getCell(16).text || "DFI").trim(),
          novedades: (row.getCell(17).text || "").trim() || null,
          fechaDevolucion: parseExcelDate(row.getCell(18).value),
          memoDevolucion: (row.getCell(19).text || "").trim() || null,
        });
      }

      // Ordenar cronológicamente por fecha de ingreso ascendente
      filasGarantia.sort(
        (a, b) =>
          a.fechaIngreso.getTime() - b.fechaIngreso.getTime() ||
          a.filaOriginal - b.filaOriginal
      );

      for (let idx = 0; idx < filasGarantia.length; idx++) {
        const item = filasGarantia[idx];

        try {
          const quipuxList = extraerQuipux(item.quipuxRaw);
          let primaryQuipux = quipuxList[0] || `GAR-2026-F${item.filaOriginal}`;
          if (existingQuipuxSet.has(primaryQuipux.toUpperCase())) {
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

          const idTipoTramite = mapearTipoTramiteGarantia(item.tipoPagoRaw);
          const esAltaCuantia = item.valor >= 10000;

          // ===================================================================
          // CLASIFICACIÓN EXACTA EN LOS 7 ESTADOS REALES (GARANTÍAS)
          // ===================================================================
          const estLower = item.estadoRaw.toLowerCase();
          let estadoGeneral = "DFI";
          let subEstado = "DERIVADO_A_DFI";
          let idAreaActual = 1;
          let idCustodioActual = 1;
          let esDevuelto = false;
          let estaPausado = false;
          let autorizadoPago = false;
          let fechaUltimoMovimiento = item.fechaIngreso;

          // BUCKET 1: PAGADO / SOLICITUD DE PAGO EMITIDA
          if (item.fechaSolPago) {
            estadoGeneral = "PAGADO";
            subEstado = "PAGO_EFECTIVO";
            autorizadoPago = true;
            idAreaActual = 5; // Cobranzas y Garantías
            idCustodioActual = 9; // Abg. Roberto Intriago
            fechaUltimoMovimiento = item.fechaSolPago;
          }
          // BUCKET 2: ARCHIVO
          else if (estLower.includes("archiv")) {
            estadoGeneral = "ARCHIVO";
            subEstado = "ARCHIVADO_DEFINITIVO";
            idAreaActual = 6;
            idCustodioActual = 10;
            fechaUltimoMovimiento = item.fechaIngreso;
          }
          // BUCKET 3: DEVUELTO
          else if (
            estLower.includes("devuel") ||
            item.fechaDevolucion ||
            (item.memoDevolucion && item.memoDevolucion.toLowerCase().includes("devuel"))
          ) {
            estadoGeneral = "DEVUELTO";
            subEstado = "DEVUELTO_FORMALMENTE";
            esDevuelto = true;
            idAreaActual = 1;
            idCustodioActual = 2;
            fechaUltimoMovimiento = item.fechaDevolucion || item.fechaIngreso;
          }
          // BUCKET 4: CONTABILIDAD
          else if (estLower.includes("contabil") || item.fechaRecibeJco) {
            estadoGeneral = "CONTABILIDAD";
            subEstado = "EN_CONTABILIDAD";
            idAreaActual = 3;
            idCustodioActual = 6;
            fechaUltimoMovimiento =
              item.fechaRecibeJco || item.fechaEntregaAnalista || item.fechaIngreso;
          }
          // BUCKET 5: OBSERVADO
          else if (estLower.includes("observad")) {
            estadoGeneral = "OBSERVADO";
            subEstado = "OBSERVADO";
            estaPausado = true;
            idAreaActual = 5;
            idCustodioActual = idAnalista;
            fechaUltimoMovimiento = item.fechaEntregaAnalista || item.fechaIngreso;
          }
          // BUCKET 6: EN REVISIÓN / PRESUPUESTO
          else if (estLower.includes("revisión") || estLower.includes("revision") || estLower.includes("presupuesto")) {
            estadoGeneral = "REVISION";
            subEstado = "EN_REVISION_PRESUPUESTO";
            idAreaActual = 2;
            idCustodioActual = idAnalista;
            fechaUltimoMovimiento = item.fechaEntregaAnalista || item.fechaIngreso;
          }
          // BUCKET 7: EN DFI
          else {
            estadoGeneral = "DFI";
            subEstado = "DERIVADO_A_DFI";
            idAreaActual = 1;
            idCustodioActual = 1;
            fechaUltimoMovimiento =
              item.fechaRecibeJco || item.fechaEntregaAnalista || item.fechaIngreso;
          }

          // Numeración correlativa cronológica estricta
          const codigoTramite = `TRM-2026-G-${String(idx + 1).padStart(4, "0")}`;

          const nuevoTramite = await prisma.tramites.create({
            data: {
              codigo_tramite: codigoTramite,
              numero_quipux: primaryQuipux,
              fecha_memorando: item.fechaIngreso,
              fecha_recepcion_fisica: item.fechaIngreso,
              fecha_entrega_control_previo: item.fechaEntregaAnalista,
              id_tipo_tramite: idTipoTramite,
              tipo_flujo: "GARANTIA",
              padre_gestion: "GARANTIA",
              tipo_gestion: item.tipoPagoRaw.toUpperCase().includes("CAUCIÓN")
                ? "DEVOLUCION_CAUCION"
                : "GARANTIA",
              area_requirente: "Dirección Financiera Aduanera",
              ciudad: item.ciudad,
              asunto: item.descripcion || `Devolución de Garantía / Caución`,
              nro_tramite: item.nroLiquidacion || null,
              numero_liquidacion: item.nroLiquidacion || null,
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
              fecha_ingreso: item.fechaIngreso,
              fecha_ultimo_movimiento: fechaUltimoMovimiento,
              fecha_ultima_modificacion: new Date(),
            },
          });

          // Quipux adicionales vinculados
          const secondaryQuipux = quipuxList.slice(1);
          for (const extra of secondaryQuipux) {
            await prisma.tramite_referencias.create({
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

          // Indexar Novedades en Referencias
          if (item.novedades) {
            await prisma.tramite_referencias.create({
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
            await prisma.tramite_referencias.create({
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
            await prisma.historial_movimientos.create({
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

            for (let i = 1; i < infoAnalistas.cadenaAnalistas.length; i++) {
              const previo = infoAnalistas.cadenaAnalistas[i - 1];
              const actual = infoAnalistas.cadenaAnalistas[i];
              await prisma.historial_movimientos.create({
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

          // Historial: Movimiento del estado final / actual del trámite
          await prisma.historial_movimientos.create({
            data: {
              id_tramite: nuevoTramite.id_tramite,
              id_usuario_entrega: infoAnalistas.ultimoAnalista?.id_usuario || idUsuarioAdmin,
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
