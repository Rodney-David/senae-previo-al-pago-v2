import fs from "fs";
import ExcelJS from "exceljs";
import { prisma } from "@/lib/prisma";

export const RUTA_DEFAULT_EXCEL_2026 =
  "C:/Users/PC/Documents/RODNEY SENAE/APLICATIVO PARA BUSQUEDA EN BASES PRESUPUESTO/Enero-Junio-2026.xlsx";

// Mapeo institucional de iniciales de analistas a IDs de usuario
const MAPA_ANALISTAS: Record<string, number> = {
  RG: 4, // Econ. Ana Belén Gómez
  DB: 5, // Ing. David Paredes
  NM: 4, // Econ. Ana Belén Gómez
  MS: 4, // Econ. Ana Belén Gómez
  MR: 10, // Sr. Manuel Ramos (Archivo)
  HA: 9, // Abg. Roberto Intriago (Cobranzas y Garantías)
  ID: 5, // Ing. David Paredes
  JM: 3, // Ing. Carlos Mendoza (Jefe Presupuesto)
};

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
  return MAPA_ANALISTAS[primera] || MAPA_ANALISTAS[clean] || 3;
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
    const wsPago = wb.getWorksheet("PAGO");
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
    const wsGarantia = wb.getWorksheet("GARANTÍA");
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

    // =========================================================================
    // 1. PROCESAR HOJA PAGO (1.099 registros)
    // =========================================================================
    const wsPago = wb.getWorksheet("PAGO");
    if (wsPago) {
      for (let r = 5; r <= wsPago.rowCount; r++) {
        const row = wsPago.getRow(r);
        const colNum = (row.getCell(1).text || "").trim();
        const quipuxRaw = (row.getCell(4).text || "").trim();
        if (!colNum && !quipuxRaw) continue;

        try {
          const quipuxList = extraerQuipux(quipuxRaw);
          let primaryQuipux = quipuxList[0] || `PAGO-2026-F${r}`;
          if (existingQuipuxSet.has(primaryQuipux.toUpperCase())) {
            primaryQuipux = `${primaryQuipux}-P${r}`;
          }
          existingQuipuxSet.add(primaryQuipux.toUpperCase());

          const ciudad = normalizarCiudad(row.getCell(3).text);
          const fechaRecepcion = parseExcelDate(row.getCell(5).value) || new Date("2026-01-05");
          const fechaEntregaAnalista = parseExcelDate(row.getCell(6).value);
          const fechaRecibeJco = parseExcelDate(row.getCell(18).value);
          const fechaPago = parseExcelDate(row.getCell(20).value);

          const tipoContratacion = (row.getCell(7).text || "").trim();
          const contrato = (row.getCell(8).text || "").trim();
          const certPresup = (row.getCell(9).text || "").trim();
          const item = (row.getCell(10).text || "").trim();
          const descripcion = (row.getCell(11).text || "").trim();
          const ruc = (row.getCell(12).text || "").trim() || null;
          const proveedor = (row.getCell(13).text || "").trim() || "N/A";
          const periodo = (row.getCell(14).text || "").trim() || null;
          const factura = (row.getCell(15).text || "").trim() || null;
          const valor = parseDecimal(row.getCell(16).value);
          const curDev = (row.getCell(17).text || "").trim() || null;
          const inicialesAnalista = (row.getCell(21).text || "").trim();
          const idAnalista = mapearAnalista(inicialesAnalista);
          const estadoRaw = (row.getCell(22).text || "DFI").trim();
          const novedades = (row.getCell(23).text || "").trim() || null;
          const fechaDevolucion = parseExcelDate(row.getCell(24).value);
          const memoDevolucion = (row.getCell(25).text || "").trim() || null;

          const idTipoTramite = mapearTipoTramitePago(tipoContratacion);
          const esAltaCuantia = valor >= 10000;

          // Mapeo del estado institucional
          let estadoGeneral = "DFI";
          let subEstado = "DERIVADO_A_DFI";
          let idAreaActual = 1;
          let idCustodioActual = 1; // Directora Financiera
          let esDevuelto = false;
          let estaPausado = false;
          let autorizadoPago = false;

          const estLower = estadoRaw.toLowerCase();
          if (estLower.includes("archivo")) {
            estadoGeneral = "ARCHIVO";
            subEstado = "ARCHIVADO_DEFINITIVO";
            idAreaActual = 6;
            idCustodioActual = 10; // Manuel Ramos
          } else if (estLower.includes("devuelto")) {
            estadoGeneral = "DEVUELTO";
            subEstado = "DEVUELTO_FORMALMENTE";
            esDevuelto = true;
            idAreaActual = 1;
            idCustodioActual = 2; // Secretaría DFI
          } else if (estLower.includes("observad")) {
            estadoGeneral = "OBSERVADO";
            subEstado = "OBSERVADO";
            estaPausado = true;
            idAreaActual = 2;
            idCustodioActual = idAnalista;
          } else if (estLower.includes("factura")) {
            estadoGeneral = "REVISION";
            subEstado = "ESPERA_FACTURA";
            estaPausado = true;
            idAreaActual = 2;
            idCustodioActual = idAnalista;
          } else if (estLower.includes("presupuesto") || estLower.includes("revisión") || estLower.includes("revision")) {
            estadoGeneral = "REVISION";
            subEstado = "EN_REVISION_PRESUPUESTO";
            idAreaActual = 2;
            idCustodioActual = idAnalista;
          } else if (estLower.includes("contabilidad") || estLower.includes("justificaci")) {
            estadoGeneral = "CONTROL_PREVIO";
            subEstado = "EN_CONTROL_PREVIO";
            idAreaActual = 3;
            idCustodioActual = 6; // CPA Sergio Lindao
          } else {
            // DFI / PAGADO
            if (fechaPago) {
              estadoGeneral = "PAGADO";
              subEstado = "PAGO_EFECTIVO";
              autorizadoPago = true;
              idAreaActual = 4; // Tesorería
              idCustodioActual = 8; // Margarita Alarcón
            } else {
              estadoGeneral = "DFI";
              subEstado = "DERIVADO_A_DFI";
              idAreaActual = 1;
              idCustodioActual = 1;
            }
          }

          const codigoTramite = `TRM-2026-P-${String(r).padStart(4, "0")}`;

          const nuevoTramite = await prisma.tramites.create({
            data: {
              codigo_tramite: codigoTramite,
              numero_quipux: primaryQuipux,
              fecha_memorando: fechaRecepcion,
              fecha_recepcion_fisica: fechaRecepcion,
              fecha_entrega_control_previo: fechaEntregaAnalista,
              id_tipo_tramite: idTipoTramite,
              tipo_flujo: "PAGO",
              padre_gestion: "PAGO",
              tipo_gestion: "PAGO",
              area_requirente: "Dirección Financiera Aduanera",
              ciudad,
              asunto: descripcion || `Pago por concepto de ${tipoContratacion || "contratación"}`,
              nro_tramite: contrato || null,
              certificacion_presupuestaria: certPresup || null,
              item_presupuestario: item || null,
              proveedor_beneficiario: proveedor,
              ruc_proveedor: ruc,
              periodo_pago: periodo,
              numero_factura: factura,
              subtotal: valor,
              monto_total: valor,
              es_alta_cuantia: esAltaCuantia,
              numero_cur_devengado: curDev,
              numero_cur_compromiso: curDev,
              fecha_pago: fechaPago,
              autorizado_pago: autorizadoPago,
              fecha_autorizacion_pago: fechaPago || (estadoGeneral === "DFI" ? fechaRecibeJco : null),
              id_area_actual: idAreaActual,
              id_custodio_actual: idCustodioActual,
              estado_general: estadoGeneral,
              sub_estado: subEstado,
              es_devuelto: esDevuelto,
              esta_pausado: estaPausado,
              motivo_observacion: novedades,
              motivo_devolucion: memoDevolucion,
              fecha_ingreso: fechaRecepcion,
              fecha_ultimo_movimiento: fechaPago || fechaRecibeJco || fechaEntregaAnalista || fechaRecepcion,
              fecha_ultima_modificacion: new Date(),
            },
          });

          // Guardar Quipux adicionales en tramite_referencias
          const secondaryQuipux = quipuxList.slice(1);
          for (const extra of secondaryQuipux) {
            await prisma.tramite_referencias.create({
              data: {
                id_tramite: nuevoTramite.id_tramite,
                tipo_documento: "QUIPUX_VINCULADO",
                numero_documento: extra,
                fecha_documento: fechaRecepcion,
                asunto_sumilla: "Quipux vinculado en Bitácora Histórica 2026 (Hoja PAGO)",
                id_usuario_registro: idUsuarioAdmin,
              },
            });
            totalReferenciasCreadas++;
          }

          // Registrar en historial de movimientos
          await prisma.historial_movimientos.create({
            data: {
              id_tramite: nuevoTramite.id_tramite,
              id_usuario_entrega: idUsuarioAdmin,
              id_usuario_recibe: idCustodioActual,
              id_area_origen: 1,
              id_area_destino: idAreaActual,
              tipo_accion: "MIGRACION_EXCEL_2026",
              comentarios: `Migración histórica desde Bitácora Excel 2026 (Hoja PAGO, Fila ${r}). Estado bitácora: ${estadoRaw}. Analista: ${inicialesAnalista || "N/A"}.`,
              fecha_hora: fechaRecepcion,
            },
          });

          migradosPago++;
        } catch (err: any) {
          errores.push({
            hoja: "PAGO",
            fila: r,
            mensaje: err.message || String(err),
          });
        }
      }
    }

    // =========================================================================
    // 2. PROCESAR HOJA GARANTÍA (537 registros)
    // =========================================================================
    const wsGarantia = wb.getWorksheet("GARANTÍA");
    if (wsGarantia) {
      for (let r = 4; r <= wsGarantia.rowCount; r++) {
        const row = wsGarantia.getRow(r);
        const colNum = (row.getCell(1).text || "").trim();
        const quipuxRaw = (row.getCell(4).text || "").trim();
        if (!colNum && !quipuxRaw) continue;

        try {
          const quipuxList = extraerQuipux(quipuxRaw);
          let primaryQuipux = quipuxList[0] || `GAR-2026-F${r}`;
          if (existingQuipuxSet.has(primaryQuipux.toUpperCase())) {
            primaryQuipux = `${primaryQuipux}-G${r}`;
          }
          existingQuipuxSet.add(primaryQuipux.toUpperCase());

          const tipoPagoRaw = (row.getCell(2).text || "Garantía").trim();
          const ciudad = normalizarCiudad(row.getCell(3).text);
          const fechaIngreso = parseExcelDate(row.getCell(5).value) || new Date("2026-01-05");
          const fechaEntregaAnalista = parseExcelDate(row.getCell(6).value);
          const descripcion = (row.getCell(7).text || "").trim();
          const nroLiquidacion = (row.getCell(8).text || "").trim() || null;
          const beneficiario = (row.getCell(9).text || "").trim() || "N/A";
          const valor = parseDecimal(row.getCell(10).value);
          const curContable = (row.getCell(11).text || "").trim() || null;
          const fechaRecibeJco = parseExcelDate(row.getCell(12).value);
          const fechaRecibeJac = parseExcelDate(row.getCell(13).value);
          const fechaSolPago = parseExcelDate(row.getCell(14).value);
          const inicialesAnalista = (row.getCell(15).text || "").trim();
          const idAnalista = mapearAnalista(inicialesAnalista);
          const estadoRaw = (row.getCell(16).text || "DFI").trim();
          const novedades = (row.getCell(17).text || "").trim() || null;
          const memoDevolucion = (row.getCell(19).text || "").trim() || null;

          const idTipoTramite = mapearTipoTramiteGarantia(tipoPagoRaw);
          const esAltaCuantia = valor >= 10000;

          // Mapeo del estado institucional
          let estadoGeneral = "DFI";
          let subEstado = "DERIVADO_A_DFI";
          let idAreaActual = 1;
          let idCustodioActual = 1;
          let esDevuelto = false;
          let estaPausado = false;
          let autorizadoPago = false;

          const estLower = estadoRaw.toLowerCase();
          if (estLower.includes("archivo")) {
            estadoGeneral = "ARCHIVO";
            subEstado = "ARCHIVADO_DEFINITIVO";
            idAreaActual = 6;
            idCustodioActual = 10;
          } else if (estLower.includes("devuelto")) {
            estadoGeneral = "DEVUELTO";
            subEstado = "DEVUELTO_FORMALMENTE";
            esDevuelto = true;
            idAreaActual = 1;
            idCustodioActual = 2;
          } else if (estLower.includes("observad")) {
            estadoGeneral = "OBSERVADO";
            subEstado = "OBSERVADO";
            estaPausado = true;
            idAreaActual = 2;
            idCustodioActual = idAnalista;
          } else if (estLower.includes("revisión") || estLower.includes("revision") || estLower.includes("presupuesto")) {
            estadoGeneral = "REVISION";
            subEstado = "EN_REVISION_PRESUPUESTO";
            idAreaActual = 2;
            idCustodioActual = idAnalista;
          } else if (estLower.includes("contabilidad")) {
            estadoGeneral = "CONTROL_PREVIO";
            subEstado = "EN_CONTROL_PREVIO";
            idAreaActual = 3;
            idCustodioActual = 6;
          } else {
            // DFI / Sol. Pago
            if (fechaSolPago) {
              estadoGeneral = "PAGADO";
              subEstado = "PAGO_EFECTIVO";
              autorizadoPago = true;
              idAreaActual = 5; // Cobranzas y Garantías
              idCustodioActual = 9; // Abg. Roberto Intriago
            } else {
              estadoGeneral = "DFI";
              subEstado = "DERIVADO_A_DFI";
              idAreaActual = 1;
              idCustodioActual = 1;
            }
          }

          const codigoTramite = `TRM-2026-G-${String(r).padStart(4, "0")}`;

          const nuevoTramite = await prisma.tramites.create({
            data: {
              codigo_tramite: codigoTramite,
              numero_quipux: primaryQuipux,
              fecha_memorando: fechaIngreso,
              fecha_recepcion_fisica: fechaIngreso,
              fecha_entrega_control_previo: fechaEntregaAnalista,
              id_tipo_tramite: idTipoTramite,
              tipo_flujo: "GARANTIA",
              padre_gestion: "GARANTIA",
              tipo_gestion: tipoPagoRaw.toUpperCase().includes("CAUCIÓN") ? "DEVOLUCION_CAUCION" : "GARANTIA",
              area_requirente: "Dirección Financiera Aduanera",
              ciudad,
              asunto: descripcion || `Devolución de Garantía / Caución`,
              nro_tramite: nroLiquidacion || null,
              numero_liquidacion: nroLiquidacion || null,
              proveedor_beneficiario: beneficiario,
              subtotal: valor,
              monto_total: valor,
              es_alta_cuantia: esAltaCuantia,
              numero_cur_contable: curContable,
              fecha_pago: fechaSolPago,
              autorizado_pago: autorizadoPago,
              fecha_autorizacion_pago: fechaSolPago || (estadoGeneral === "DFI" ? fechaRecibeJco : null),
              id_area_actual: idAreaActual,
              id_custodio_actual: idCustodioActual,
              estado_general: estadoGeneral,
              sub_estado: subEstado,
              es_devuelto: esDevuelto,
              esta_pausado: estaPausado,
              motivo_observacion: novedades,
              motivo_devolucion: memoDevolucion,
              fecha_ingreso: fechaIngreso,
              fecha_ultimo_movimiento: fechaSolPago || fechaRecibeJco || fechaEntregaAnalista || fechaIngreso,
              fecha_ultima_modificacion: new Date(),
            },
          });

          // Quipux adicionales
          const secondaryQuipux = quipuxList.slice(1);
          for (const extra of secondaryQuipux) {
            await prisma.tramite_referencias.create({
              data: {
                id_tramite: nuevoTramite.id_tramite,
                tipo_documento: "QUIPUX_VINCULADO",
                numero_documento: extra,
                fecha_documento: fechaIngreso,
                asunto_sumilla: "Quipux vinculado en Bitácora Histórica 2026 (Hoja GARANTÍA)",
                id_usuario_registro: idUsuarioAdmin,
              },
            });
            totalReferenciasCreadas++;
          }

          // Historial de movimientos
          await prisma.historial_movimientos.create({
            data: {
              id_tramite: nuevoTramite.id_tramite,
              id_usuario_entrega: idUsuarioAdmin,
              id_usuario_recibe: idCustodioActual,
              id_area_origen: 1,
              id_area_destino: idAreaActual,
              tipo_accion: "MIGRACION_EXCEL_2026",
              comentarios: `Migración histórica desde Bitácora Excel 2026 (Hoja GARANTÍA, Fila ${r}). Estado bitácora: ${estadoRaw}. Analista: ${inicialesAnalista || "N/A"}.`,
              fecha_hora: fechaIngreso,
            },
          });

          migradosGarantia++;
        } catch (err: any) {
          errores.push({
            hoja: "GARANTÍA",
            fila: r,
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
