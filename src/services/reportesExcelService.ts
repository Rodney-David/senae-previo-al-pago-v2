/**
 * SERVICIO DE EXPORTACIÓN DE REPORTES EXCEL CON EXCELJS DEL SENAE
 * Archivo: src/services/reportesExcelService.ts
 *
 * Generación simplificada y ejecutiva de reportes oficiales de tiempos para el SENAE:
 * - LIBRO 1: Reporte de Auditoría de Trámites (Hoja 1: Trámites | Hoja 2: Resumen y Promedios)
 * - LIBRO 2: Reporte de Desempeño por Funcionario (Hoja 1: Rendimiento Funcionarios)
 * - LIBRO 3: Reporte por Tipo de Proceso (Hoja 1: Tiempos por Proceso)
 *
 * Principio rector:
 * Claridad total, visualización inmediata de los dos resultados clave:
 *   1) TIEMPO TOTAL DEL TRÁMITE (Días Calendario - Incluido todo)
 *   2) TIEMPO REAL TRABAJADO (Días Hábiles Efectivos)
 * Desglose explicativo a la derecha para contrastar y auditar la razón del tiempo.
 * Paleta oficial institucional SENAE (#0F2942, blanco, azul suave de realce).
 */

import ExcelJS from "exceljs";
import {
  FiltrosReportesTiempos,
  TramiteAuditoriaItem,
  RendimientoFuncionarioItem,
  SeccionAnalisisCompartido,
  AuditoriaProcesoItem,
  FamiliaCanonicaItem,
} from "./reportesTiemposService";

// -------------------------------------------------------------
// CONSTANTES DE COLOR Y ESTILOS CORPORATIVOS SENAE
// -------------------------------------------------------------
const COLOR_AZUL_OSCURO = "FF0F2942"; // #0F2942 - Encabezados institucionales principales SENAE
const COLOR_AZUL_SECUNDARIO = "FF1E3A8A"; // #1E3A8A - Subtítulos y cabecera de columnas destacadas
const COLOR_FONDO_REINA = "FFDBEAFE"; // #DBEAFE - Fondo azul claro para las dos columnas reinas
const COLOR_TEXTO_REINA = "FF0F2942"; // #0F2942 - Texto negrita para columnas reinas
const COLOR_BORDE_GRIS = "FFE2E8F0"; // #E2E8F0 - Separador suave de celdas
const COLOR_BORDE_HEADER = "FF94A3B8"; // #94A3B8 - Borde de cabecera
const COLOR_FONDO_ZEBRA = "FFF8FAFC"; // #F8FAFC - Filas pares
const COLOR_BLANCO = "FFFFFFFF";
const COLOR_TEXTO_OSCURO = "FF0F172A"; // #0F172A
const COLOR_TEXTO_MUTED = "FF64748B"; // #64748B

// Badges de cumplimiento SLA y alertas
const COLOR_VERDE_BG = "FFDCFCE7";
const COLOR_VERDE_TXT = "FF166534";
const COLOR_AMBAR_BG = "FFFEF3C7";
const COLOR_AMBAR_TXT = "FF92400E";
const COLOR_ROJO_BG = "FFFEE2E2";
const COLOR_ROJO_TXT = "FF991B1B";
const COLOR_COMPARTIDO_BG = "FFEDE9FE";
const COLOR_COMPARTIDO_TXT = "FF5B21B6";

const FONT_FAMILY = "Segoe UI";

const BORDE_DELGADO: Partial<ExcelJS.Borders> = {
  top: { style: "thin", color: { argb: COLOR_BORDE_GRIS } },
  left: { style: "thin", color: { argb: COLOR_BORDE_GRIS } },
  bottom: { style: "thin", color: { argb: COLOR_BORDE_GRIS } },
  right: { style: "thin", color: { argb: COLOR_BORDE_GRIS } },
};

// -------------------------------------------------------------
// FUNCIONES AUXILIARES DE FORMATEO Y MATEMÁTICA
// -------------------------------------------------------------

function formatearFecha(d: Date | string | null | undefined): string {
  if (!d) return "N/D";
  const dt = d instanceof Date ? d : new Date(d);
  if (isNaN(dt.getTime())) return "N/D";
  const dd = String(dt.getUTCDate()).padStart(2, "0");
  const mm = String(dt.getUTCMonth() + 1).padStart(2, "0");
  const yyyy = dt.getUTCFullYear();
  return `${dd}/${mm}/${yyyy}`;
}

function calcularMediana(nums: number[]): number {
  if (!nums || nums.length === 0) return 0;
  const ordenados = nums.filter((n) => typeof n === "number" && !isNaN(n)).sort((a, b) => a - b);
  if (ordenados.length === 0) return 0;
  const mitad = Math.floor(ordenados.length / 2);
  if (ordenados.length % 2 !== 0) {
    return Number(ordenados[mitad].toFixed(1));
  }
  return Number(((ordenados[mitad - 1] + ordenados[mitad]) / 2).toFixed(1));
}

function calcularPromedio(nums: number[]): number {
  if (!nums || nums.length === 0) return 0;
  const validos = nums.filter((n) => typeof n === "number" && !isNaN(n));
  if (validos.length === 0) return 0;
  const suma = validos.reduce((a, b) => a + b, 0);
  return Number((suma / validos.length).toFixed(1));
}

/**
 * Aplica estilos estándar de cabecera SENAE (Azul Oscuro, texto blanco en negrita, altura 28pt).
 */
function estilizarCabecera(row: ExcelJS.Row, bgArgb: string = COLOR_AZUL_OSCURO) {
  row.height = 28;
  row.eachCell({ includeEmpty: true }, (cell) => {
    cell.font = { name: FONT_FAMILY, size: 9.5, bold: true, color: { argb: COLOR_BLANCO } };
    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: bgArgb },
    };
    cell.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
    cell.border = {
      top: { style: "thin", color: { argb: COLOR_BORDE_HEADER } },
      bottom: { style: "medium", color: { argb: COLOR_AZUL_OSCURO } },
      left: { style: "thin", color: { argb: COLOR_BORDE_HEADER } },
      right: { style: "thin", color: { argb: COLOR_BORDE_HEADER } },
    };
  });
}

/**
 * Aplica estilos a filas de datos (altura 20pt, bordes delgados, tipografía limpia).
 */
function estilizarFilaDatos(row: ExcelJS.Row, esPar: boolean = false) {
  row.height = 20;
  const bg = esPar ? COLOR_FONDO_ZEBRA : COLOR_BLANCO;
  row.eachCell({ includeEmpty: true }, (cell) => {
    if (
      !cell.fill ||
      (cell.fill as any).fgColor?.argb === COLOR_BLANCO ||
      (cell.fill as any).fgColor?.argb === COLOR_FONDO_ZEBRA
    ) {
      cell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: bg },
      };
    }
    if (!cell.font) {
      cell.font = { name: FONT_FAMILY, size: 9, color: { argb: COLOR_TEXTO_OSCURO } };
    }
    cell.border = BORDE_DELGADO;
    if (!cell.alignment) {
      cell.alignment = { vertical: "middle" };
    } else {
      cell.alignment.vertical = "middle";
    }
  });
}

/**
 * Ajusta automáticamente el ancho de las columnas ignorando encabezados fusionados de las primeras filas.
 */
function autoAjustarColumnas(ws: ExcelJS.Worksheet, extraPadding: number = 4) {
  ws.columns.forEach((col) => {
    let maxLen = 10;
    col.eachCell?.({ includeEmpty: true }, (cell) => {
      const rowNum = typeof cell.row === "number" ? cell.row : Number(cell.row);
      // Ignorar títulos generales de carátula o cabeceras fusionadas
      if (rowNum <= 3 && typeof cell.value === "string" && cell.value.length > 30) {
        return;
      }
      const val = cell.value;
      if (val !== null && val !== undefined) {
        const text = typeof val === "object" && "text" in val ? String(val.text) : String(val);
        const lines = text.split("\n");
        for (const line of lines) {
          if (line.length > maxLen) {
            maxLen = line.length;
          }
        }
      }
    });
    col.width = Math.min(Math.max(maxLen + extraPadding, 12), 60);
  });
}

// -------------------------------------------------------------------------------------------------
// LIBRO 1: REPORTE DE AUDITORÍA DE TRÁMITES (exportarExcelAuditoriaTramites)
// -------------------------------------------------------------------------------------------------

export interface ExportarAuditoriaInput {
  tramites: TramiteAuditoriaItem[];
  kpis?: {
    total_tramites_analizados?: number;
    mediana_tiempo_auditoria_dias?: number;
    mediana_tiempo_trabajo_real_dias?: string | number;
    cantidad_tramites_alerta?: number;
    distribucion_calidad?: {
      completo: number;
      historico_parcial: number;
      incompleto: number;
    };
  };
  resumen?: {
    total_registros?: number;
    total_completos?: number;
    total_historicos?: number;
    total_incompletos?: number;
    total_con_alertas?: number;
    tasa_invariante_cumplida_pct?: number;
  };
  filtros: FiltrosReportesTiempos;
  slaLimite: number;
  usuarioGenerador?: string;
}

export async function exportarExcelAuditoriaTramites(input: ExportarAuditoriaInput): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  wb.creator = "Servicio Nacional de Aduana del Ecuador (SENAE)";
  wb.created = new Date();

  const { tramites, filtros, usuarioGenerador } = input;
  const fechaGeneracionStr = `${formatearFecha(new Date())} ${new Date().toLocaleTimeString("es-EC")}`;
  const usuarioGenera = usuarioGenerador || "Auditor SENAE - Control Previo";
  const padreGestionTexto =
    filtros.padre_gestion === "GARANTIA"
      ? "Garantías"
      : filtros.padre_gestion === "TODOS"
      ? "Todos (Pagos y Garantías)"
      : "Pagos";

  // =========================================================================
  // HOJA 1: TRÁMITES (Tabla Principal Simplificada con las 2 Columnas Reinas)
  // =========================================================================
  const wsTramites = wb.addWorksheet("Trámites", { views: [{ showGridLines: true }] });

  // Banner Superior Oficial SENAE
  wsTramites.mergeCells("A1:P1");
  const cBanner = wsTramites.getCell("A1");
  cBanner.value = "SERVICIO NACIONAL DE ADUANA DEL ECUADOR - REPORTE DE AUDITORÍA DE TRÁMITES";
  cBanner.font = { name: FONT_FAMILY, size: 12, bold: true, color: { argb: COLOR_BLANCO } };
  cBanner.fill = { type: "pattern", pattern: "solid", fgColor: { argb: COLOR_AZUL_OSCURO } };
  cBanner.alignment = { horizontal: "center", vertical: "middle" };
  wsTramites.getRow(1).height = 30;

  // Subtítulo con metadata ejecutiva
  wsTramites.mergeCells("A2:P2");
  const cMeta = wsTramites.getCell("A2");
  cMeta.value = `Gestión: ${padreGestionTexto}  •  Periodo: ${formatearFecha(filtros.fecha_desde)} al ${formatearFecha(
    filtros.fecha_hasta
  )}  •  Auditor: ${usuarioGenera}  •  Generado: ${fechaGeneracionStr}`;
  cMeta.font = { name: FONT_FAMILY, size: 9, bold: true, color: { argb: COLOR_TEXTO_MUTED } };
  cMeta.fill = { type: "pattern", pattern: "solid", fgColor: { argb: COLOR_FONDO_ZEBRA } };
  cMeta.alignment = { horizontal: "center", vertical: "middle" };
  wsTramites.getRow(2).height = 20;

  // 16 Columnas Oficiales Solicitadas
  const headersTramites = [
    "N° Quipux",
    "Gestión",
    "Tipo de Proceso",
    "Proveedor / Beneficiario",
    "RUC / Cédula",
    "Monto ($)",
    "Estado Actual",
    "Funcionario Custodio",
    "Fecha Recepción",
    "Fecha Pago / Cierre",
    "TIEMPO TOTAL DEL TRÁMITE\n(Días Calendario)",
    "TIEMPO REAL TRABAJADO\n(Días Hábiles)",
    "Días en Pausa\n(Factura / Observación)",
    "Días No Laborables\n(Fines de Sem. y Feriados)",
    "Calidad del Dato",
    "Observaciones",
  ];

  const hRow = wsTramites.addRow(headersTramites);
  estilizarCabecera(hRow, COLOR_AZUL_OSCURO);
  hRow.height = 32;

  // Realce de cabeceras para las dos columnas reinas (Columnas 11 y 12)
  const cellH11 = hRow.getCell(11);
  cellH11.fill = { type: "pattern", pattern: "solid", fgColor: { argb: COLOR_AZUL_SECUNDARIO } };
  cellH11.font = { name: FONT_FAMILY, size: 10, bold: true, color: { argb: COLOR_BLANCO } };

  const cellH12 = hRow.getCell(12);
  cellH12.fill = { type: "pattern", pattern: "solid", fgColor: { argb: COLOR_AZUL_SECUNDARIO } };
  cellH12.font = { name: FONT_FAMILY, size: 10, bold: true, color: { argb: COLOR_BLANCO } };

  // Llenado de Filas de Datos
  tramites.forEach((t, idx) => {
    // 1. Cálculos de tiempos deterministas
    const tiempoTotal =
      t.calidad_dato === "HISTORICO_PARCIAL" && t.historico_parcial?.total_calendario_dias != null
        ? t.historico_parcial.total_calendario_dias
        : t.reloj_a.total_calendario_dias || 0;

    const tiempoReal =
      t.calidad_dato === "COMPLETO"
        ? t.reloj_a.dias_laborables_trabajo || 0
        : t.historico_parcial?.total_habiles_brutos ?? t.reloj_a.dias_laborables_trabajo ?? 0;

    const diasPausa =
      t.calidad_dato === "COMPLETO"
        ? (t.reloj_a.dias_pausa_factura || 0) + (t.reloj_a.dias_pausa_observado || 0)
        : 0;

    const diasNoLaborables =
      t.calidad_dato === "COMPLETO"
        ? t.reloj_a.dias_no_laborables || 0
        : Math.max(0, Number((tiempoTotal - tiempoReal).toFixed(1)));

    const calidadTexto =
      t.calidad_dato === "COMPLETO"
        ? "Completo"
        : t.calidad_dato === "HISTORICO_PARCIAL"
        ? "Histórico"
        : "Incompleto";

    let observacionTexto = "";
    if (t.motivos_alerta && t.motivos_alerta.length > 0) {
      observacionTexto = t.motivos_alerta.join(" | ");
    } else if (t.esta_pausado && t.motivo_pausa) {
      observacionTexto = `Pausado: ${t.motivo_pausa}`;
    } else if (t.en_curso) {
      observacionTexto = "Trámite en gestión activa";
    } else {
      observacionTexto = "Finalizado / Liquidado";
    }

    const row = wsTramites.addRow([
      t.numero_quipux || t.codigo_tramite,
      t.padre_gestion === "GARANTIA" ? "Garantía" : "Pago",
      t.tipo_proceso,
      t.proveedor_beneficiario,
      t.ruc_proveedor || "N/D",
      Number(t.monto_total || 0),
      t.estado_general,
      t.custodio_actual || "Sin asignar",
      formatearFecha(t.fecha_recepcion_fisica || t.fecha_ingreso),
      t.en_curso ? "EN CURSO" : formatearFecha(t.fecha_pago || t.fecha_ultimo_movimiento),
      tiempoTotal,
      tiempoReal,
      diasPausa,
      diasNoLaborables,
      calidadTexto,
      observacionTexto,
    ]);

    estilizarFilaDatos(row, idx % 2 === 1);

    // Alineaciones y formatos
    row.getCell(1).alignment = { horizontal: "center", vertical: "middle" };
    row.getCell(2).alignment = { horizontal: "center", vertical: "middle" };
    row.getCell(3).alignment = { horizontal: "left", vertical: "middle" };
    row.getCell(4).alignment = { horizontal: "left", vertical: "middle" };
    row.getCell(5).alignment = { horizontal: "center", vertical: "middle" };

    // Monto formateado numéricamente como moneda Excel
    const cMonto = row.getCell(6);
    cMonto.numFmt = '"$"#,##0.00';
    cMonto.alignment = { horizontal: "right", vertical: "middle" };

    row.getCell(7).alignment = { horizontal: "center", vertical: "middle" };
    row.getCell(8).alignment = { horizontal: "left", vertical: "middle" };
    row.getCell(9).alignment = { horizontal: "center", vertical: "middle" };
    row.getCell(10).alignment = { horizontal: "center", vertical: "middle" };

    // =========================================================
    // LAS DOS COLUMNAS REINAS DESTACADAS (Columnas 11 y 12)
    // Fondo azul suave (#DBEAFE) y tipografía en negrita
    // =========================================================
    const c11 = row.getCell(11);
    c11.fill = { type: "pattern", pattern: "solid", fgColor: { argb: COLOR_FONDO_REINA } };
    c11.font = { name: FONT_FAMILY, size: 9.5, bold: true, color: { argb: COLOR_TEXTO_REINA } };
    c11.alignment = { horizontal: "center", vertical: "middle" };
    c11.numFmt = "#,##0.0";

    const c12 = row.getCell(12);
    c12.fill = { type: "pattern", pattern: "solid", fgColor: { argb: COLOR_FONDO_REINA } };
    c12.font = { name: FONT_FAMILY, size: 9.5, bold: true, color: { argb: COLOR_TEXTO_REINA } };
    c12.alignment = { horizontal: "center", vertical: "middle" };
    c12.numFmt = "#,##0.0";

    // Columnas de desglose explicativo a la derecha
    const c13 = row.getCell(13);
    c13.alignment = { horizontal: "center", vertical: "middle" };
    c13.numFmt = "#,##0.0";
    c13.font = { name: FONT_FAMILY, size: 9, color: { argb: COLOR_TEXTO_MUTED } };

    const c14 = row.getCell(14);
    c14.alignment = { horizontal: "center", vertical: "middle" };
    c14.numFmt = "#,##0.0";
    c14.font = { name: FONT_FAMILY, size: 9, color: { argb: COLOR_TEXTO_MUTED } };

    const c15 = row.getCell(15);
    c15.alignment = { horizontal: "center", vertical: "middle" };
    if (calidadTexto === "Incompleto") {
      c15.font = { name: FONT_FAMILY, size: 9, bold: true, color: { argb: COLOR_ROJO_TXT } };
    } else {
      c15.font = { name: FONT_FAMILY, size: 9, color: { argb: COLOR_TEXTO_MUTED } };
    }

    const c16 = row.getCell(16);
    c16.alignment = { horizontal: "left", vertical: "middle" };
    c16.font = { name: FONT_FAMILY, size: 8.5, color: { argb: COLOR_TEXTO_MUTED } };
  });

  autoAjustarColumnas(wsTramites);
  wsTramites.getColumn(11).width = 22;
  wsTramites.getColumn(12).width = 20;
  wsTramites.getColumn(13).width = 18;
  wsTramites.getColumn(14).width = 20;

  // =========================================================================
  // HOJA 2: RESUMEN Y PROMEDIOS (Resumen Ejecutivo Simple)
  // =========================================================================
  const wsResumen = wb.addWorksheet("Resumen y Promedios", { views: [{ showGridLines: true }] });

  wsResumen.mergeCells("B2:E2");
  const cResTitulo = wsResumen.getCell("B2");
  cResTitulo.value = "SERVICIO NACIONAL DE ADUANA DEL ECUADOR - RESUMEN EJECUTIVO Y PROMEDIOS";
  cResTitulo.font = { name: FONT_FAMILY, size: 12, bold: true, color: { argb: COLOR_BLANCO } };
  cResTitulo.fill = { type: "pattern", pattern: "solid", fgColor: { argb: COLOR_AZUL_OSCURO } };
  cResTitulo.alignment = { horizontal: "center", vertical: "middle" };
  wsResumen.getRow(2).height = 30;

  wsResumen.mergeCells("B3:E3");
  const cResSub = wsResumen.getCell("B3");
  cResSub.value = `Gestión: ${padreGestionTexto} • Periodo: ${formatearFecha(
    filtros.fecha_desde
  )} al ${formatearFecha(filtros.fecha_hasta)} • Fecha de Corte: ${fechaGeneracionStr}`;
  cResSub.font = { name: FONT_FAMILY, size: 9, bold: true, color: { argb: COLOR_TEXTO_MUTED } };
  cResSub.fill = { type: "pattern", pattern: "solid", fgColor: { argb: COLOR_FONDO_ZEBRA } };
  cResSub.alignment = { horizontal: "center", vertical: "middle" };
  wsResumen.getRow(3).height = 20;

  // Cálculos consolidados
  const totalTramites = tramites.length;
  const montoTotal = tramites.reduce((acc, t) => acc + (Number(t.monto_total) || 0), 0);

  const arrayTiempoTotal = tramites.map((t) =>
    t.calidad_dato === "HISTORICO_PARCIAL" && t.historico_parcial?.total_calendario_dias != null
      ? t.historico_parcial.total_calendario_dias
      : t.reloj_a.total_calendario_dias || 0
  );

  const arrayTiempoReal = tramites.map((t) =>
    t.calidad_dato === "COMPLETO"
      ? t.reloj_a.dias_laborables_trabajo || 0
      : t.historico_parcial?.total_habiles_brutos ?? t.reloj_a.dias_laborables_trabajo ?? 0
  );

  const promTiempoTotal = calcularPromedio(arrayTiempoTotal);
  const medTiempoTotal = calcularMediana(arrayTiempoTotal);
  const promTiempoReal = calcularPromedio(arrayTiempoReal);
  const medTiempoReal = calcularMediana(arrayTiempoReal);

  // Tabla 1: Indicadores Clave de Tiempos y Monto
  const kpisFilas = [
    ["Total Trámites Reportados", totalTramites, "Expedientes"],
    ["Monto Total Tramitado", montoTotal, "$ Dólares"],
    ["Promedio de Tiempo Total (Calendario)", promTiempoTotal, "Días Calendario (Total incluido todo)"],
    ["Mediana de Tiempo Total (Calendario)", medTiempoTotal, "Días Calendario (Mediana P50)"],
    ["Promedio de Tiempo Real Trabajado", promTiempoReal, "Días Hábiles Efectivos"],
    ["Mediana de Tiempo Real Trabajado", medTiempoReal, "Días Hábiles Efectivos"],
  ];

  wsResumen.mergeCells("B5:E5");
  const cKpiHead = wsResumen.getCell("B5");
  cKpiHead.value = "INDICADORES CONSOLIDADOS DE TIEMPO Y VOLUMEN";
  cKpiHead.font = { name: FONT_FAMILY, size: 10, bold: true, color: { argb: COLOR_BLANCO } };
  cKpiHead.fill = { type: "pattern", pattern: "solid", fgColor: { argb: COLOR_AZUL_SECUNDARIO } };
  cKpiHead.alignment = { horizontal: "center", vertical: "middle" };
  wsResumen.getRow(5).height = 24;

  let rIdx = 6;
  kpisFilas.forEach(([concepto, val, unidad]) => {
    wsResumen.mergeCells(`B${rIdx}:C${rIdx}`);
    const cConcepto = wsResumen.getCell(`B${rIdx}`);
    cConcepto.value = concepto;
    cConcepto.font = { name: FONT_FAMILY, size: 9.5, bold: true, color: { argb: COLOR_TEXTO_OSCURO } };
    cConcepto.border = BORDE_DELGADO;

    const cVal = wsResumen.getCell(`D${rIdx}`);
    cVal.value = val;
    cVal.font = { name: FONT_FAMILY, size: 10, bold: true, color: { argb: COLOR_AZUL_OSCURO } };
    cVal.alignment = { horizontal: "right", vertical: "middle" };
    cVal.border = BORDE_DELGADO;
    if (typeof val === "number" && String(concepto).includes("Monto")) {
      cVal.numFmt = '"$"#,##0.00';
    } else if (typeof val === "number") {
      cVal.numFmt = "#,##0.0";
    }

    const cUnidad = wsResumen.getCell(`E${rIdx}`);
    cUnidad.value = unidad;
    cUnidad.font = { name: FONT_FAMILY, size: 8.5, color: { argb: COLOR_TEXTO_MUTED } };
    cUnidad.alignment = { horizontal: "left", vertical: "middle" };
    cUnidad.border = BORDE_DELGADO;

    wsResumen.getRow(rIdx).height = 22;
    rIdx++;
  });

  // Tabla 2: Trámites por Estado Actual
  rIdx += 2;
  wsResumen.mergeCells(`B${rIdx}:E${rIdx}`);
  const cEstadoHead = wsResumen.getCell(`B${rIdx}`);
  cEstadoHead.value = "DISTRIBUCIÓN DE TRÁMITES POR ESTADO ACTUAL";
  cEstadoHead.font = { name: FONT_FAMILY, size: 10, bold: true, color: { argb: COLOR_BLANCO } };
  cEstadoHead.fill = { type: "pattern", pattern: "solid", fgColor: { argb: COLOR_AZUL_SECUNDARIO } };
  cEstadoHead.alignment = { horizontal: "center", vertical: "middle" };
  wsResumen.getRow(rIdx).height = 24;
  rIdx++;

  // Cabecera de la tabla por estado
  const headersEstado = ["Estado Actual", "Cantidad Trámites", "Porcentaje (%)", "Monto Total ($)"];
  headersEstado.forEach((h, colI) => {
    const colLetter = String.fromCharCode(66 + colI); // B, C, D, E
    const cell = wsResumen.getCell(`${colLetter}${rIdx}`);
    cell.value = h;
    cell.font = { name: FONT_FAMILY, size: 9, bold: true, color: { argb: COLOR_BLANCO } };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: COLOR_AZUL_OSCURO } };
    cell.alignment = { horizontal: "center", vertical: "middle" };
    cell.border = BORDE_DELGADO;
  });
  wsResumen.getRow(rIdx).height = 24;
  rIdx++;

  // Agrupación por estado
  const estadosMap = new Map<string, { count: number; monto: number }>();
  for (const t of tramites) {
    const est = t.estado_general || "SIN ESTADO";
    const cur = estadosMap.get(est) || { count: 0, monto: 0 };
    cur.count++;
    cur.monto += Number(t.monto_total || 0);
    estadosMap.set(est, cur);
  }

  const estadosOrdenados = Array.from(estadosMap.entries()).sort((a, b) => b[1].count - a[1].count);

  estadosOrdenados.forEach(([est, datos], idx) => {
    const pct = totalTramites > 0 ? (datos.count / totalTramites) * 100 : 0;
    const isPar = idx % 2 === 1;

    const c1 = wsResumen.getCell(`B${rIdx}`);
    c1.value = est;
    c1.font = { name: FONT_FAMILY, size: 9, bold: true, color: { argb: COLOR_TEXTO_OSCURO } };
    c1.alignment = { horizontal: "left", vertical: "middle" };
    c1.border = BORDE_DELGADO;

    const c2 = wsResumen.getCell(`C${rIdx}`);
    c2.value = datos.count;
    c2.font = { name: FONT_FAMILY, size: 9, color: { argb: COLOR_TEXTO_OSCURO } };
    c2.alignment = { horizontal: "center", vertical: "middle" };
    c2.border = BORDE_DELGADO;

    const c3 = wsResumen.getCell(`D${rIdx}`);
    c3.value = `${pct.toFixed(1)}%`;
    c3.font = { name: FONT_FAMILY, size: 9, color: { argb: COLOR_TEXTO_OSCURO } };
    c3.alignment = { horizontal: "center", vertical: "middle" };
    c3.border = BORDE_DELGADO;

    const c4 = wsResumen.getCell(`E${rIdx}`);
    c4.value = datos.monto;
    c4.font = { name: FONT_FAMILY, size: 9, color: { argb: COLOR_TEXTO_OSCURO } };
    c4.numFmt = '"$"#,##0.00';
    c4.alignment = { horizontal: "right", vertical: "middle" };
    c4.border = BORDE_DELGADO;

    const bg = isPar ? COLOR_FONDO_ZEBRA : COLOR_BLANCO;
    [c1, c2, c3, c4].forEach((c) => {
      c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: bg } };
    });

    wsResumen.getRow(rIdx).height = 20;
    rIdx++;
  });

  // Fila Total
  const cTot1 = wsResumen.getCell(`B${rIdx}`);
  cTot1.value = "TOTAL GENERAL";
  cTot1.font = { name: FONT_FAMILY, size: 9.5, bold: true, color: { argb: COLOR_AZUL_OSCURO } };
  cTot1.border = BORDE_DELGADO;

  const cTot2 = wsResumen.getCell(`C${rIdx}`);
  cTot2.value = totalTramites;
  cTot2.font = { name: FONT_FAMILY, size: 9.5, bold: true, color: { argb: COLOR_AZUL_OSCURO } };
  cTot2.alignment = { horizontal: "center", vertical: "middle" };
  cTot2.border = BORDE_DELGADO;

  const cTot3 = wsResumen.getCell(`D${rIdx}`);
  cTot3.value = "100.0%";
  cTot3.font = { name: FONT_FAMILY, size: 9.5, bold: true, color: { argb: COLOR_AZUL_OSCURO } };
  cTot3.alignment = { horizontal: "center", vertical: "middle" };
  cTot3.border = BORDE_DELGADO;

  const cTot4 = wsResumen.getCell(`E${rIdx}`);
  cTot4.value = montoTotal;
  cTot4.font = { name: FONT_FAMILY, size: 9.5, bold: true, color: { argb: COLOR_AZUL_OSCURO } };
  cTot4.numFmt = '"$"#,##0.00';
  cTot4.alignment = { horizontal: "right", vertical: "middle" };
  cTot4.border = BORDE_DELGADO;

  [cTot1, cTot2, cTot3, cTot4].forEach((c) => {
    c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: COLOR_FONDO_REINA } };
  });
  wsResumen.getRow(rIdx).height = 22;

  wsResumen.getColumn("B").width = 38;
  wsResumen.getColumn("C").width = 20;
  wsResumen.getColumn("D").width = 18;
  wsResumen.getColumn("E").width = 38;

  const buffer = await wb.xlsx.writeBuffer();
  return Buffer.from(buffer);
}

// -------------------------------------------------------------------------------------------------
// LIBRO 2: REPORTE DE DESEMPEÑO POR FUNCIONARIO (exportarExcelFuncionarios)
// -------------------------------------------------------------------------------------------------

export interface ExportarFuncionariosInput {
  funcionarios: RendimientoFuncionarioItem[];
  analisis_compartido: SeccionAnalisisCompartido;
  filtros: FiltrosReportesTiempos;
  slaLimite: number;
  usuarioGenerador?: string;
}

export async function exportarExcelFuncionarios(input: ExportarFuncionariosInput): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  wb.creator = "Servicio Nacional de Aduana del Ecuador (SENAE)";
  wb.created = new Date();

  const { funcionarios, analisis_compartido, filtros, slaLimite } = input;
  const fechaGeneracionStr = `${formatearFecha(new Date())} ${new Date().toLocaleTimeString("es-EC")}`;

  // =========================================================================
  // HOJA 1: RENDIMIENTO FUNCIONARIOS (Tabla Principal Ejecutiva)
  // =========================================================================
  const ws = wb.addWorksheet("Rendimiento Funcionarios", { views: [{ showGridLines: true }] });

  // Banner Superior
  ws.mergeCells("A1:G1");
  const cBanner = ws.getCell("A1");
  cBanner.value = "SERVICIO NACIONAL DE ADUANA DEL ECUADOR - REPORTE DE DESEMPEÑO POR FUNCIONARIO";
  cBanner.font = { name: FONT_FAMILY, size: 12, bold: true, color: { argb: COLOR_BLANCO } };
  cBanner.fill = { type: "pattern", pattern: "solid", fgColor: { argb: COLOR_AZUL_OSCURO } };
  cBanner.alignment = { horizontal: "center", vertical: "middle" };
  ws.getRow(1).height = 30;

  // Subtítulo
  ws.mergeCells("A2:G2");
  const cSub = ws.getCell("A2");
  cSub.value = `Periodo Evaluado: ${formatearFecha(filtros.fecha_desde)} al ${formatearFecha(
    filtros.fecha_hasta
  )}  •  Límite SLA Normativo: ${slaLimite} Días Hábiles  •  Fecha de Emisión: ${fechaGeneracionStr}`;
  cSub.font = { name: FONT_FAMILY, size: 9, bold: true, color: { argb: COLOR_TEXTO_MUTED } };
  cSub.fill = { type: "pattern", pattern: "solid", fgColor: { argb: COLOR_FONDO_ZEBRA } };
  cSub.alignment = { horizontal: "center", vertical: "middle" };
  ws.getRow(2).height = 20;

  // 7 Columnas Oficiales Solicitadas
  const headers = [
    "Funcionario (Nombre y Apellidos)",
    "Cargo y Área",
    "Trámites Asignados / Recibidos",
    "Trámites Despachados",
    "Trámites En Curso",
    "TIEMPO PROMEDIO DE DESPACHO\n(Días Hábiles)",
    "Cumplimiento SLA (%)",
  ];

  const hRow = ws.addRow(headers);
  estilizarCabecera(hRow, COLOR_AZUL_OSCURO);
  hRow.height = 32;

  // Realce para la columna reina (Columna 6: Tiempo Promedio de Despacho)
  const cellH6 = hRow.getCell(6);
  cellH6.fill = { type: "pattern", pattern: "solid", fgColor: { argb: COLOR_AZUL_SECUNDARIO } };
  cellH6.font = { name: FONT_FAMILY, size: 10, bold: true, color: { argb: COLOR_BLANCO } };

  // Filas individuales por funcionario
  funcionarios.forEach((f, idx) => {
    const tiempoPromedio =
      f.tramites_resumen && f.tramites_resumen.length > 0
        ? Number(
            (
              f.tramites_resumen.reduce((acc, r) => acc + (r.dias_despacho || 0), 0) /
              f.tramites_resumen.length
            ).toFixed(1)
          )
        : f.mediana_dias_despacho || 0;

    const row = ws.addRow([
      f.nombre_completo,
      `${f.cargo || "Analista"} - ${f.area_nombre || "Dirección Financiera"}`,
      f.total_asignados,
      f.total_despachados,
      f.total_en_curso,
      tiempoPromedio,
      `${f.tasa_cumplimiento}%`,
    ]);

    estilizarFilaDatos(row, idx % 2 === 1);

    row.getCell(1).alignment = { horizontal: "left", vertical: "middle" };
    row.getCell(2).alignment = { horizontal: "left", vertical: "middle" };
    row.getCell(3).alignment = { horizontal: "center", vertical: "middle" };
    row.getCell(4).alignment = { horizontal: "center", vertical: "middle" };
    row.getCell(5).alignment = { horizontal: "center", vertical: "middle" };

    // Columna Reina 6: Tiempo Promedio de Despacho (Días Hábiles)
    const c6 = row.getCell(6);
    c6.fill = { type: "pattern", pattern: "solid", fgColor: { argb: COLOR_FONDO_REINA } };
    c6.font = { name: FONT_FAMILY, size: 9.5, bold: true, color: { argb: COLOR_TEXTO_REINA } };
    c6.alignment = { horizontal: "center", vertical: "middle" };
    c6.numFmt = "#,##0.0";

    // Columna 7: Cumplimiento SLA con semáforo
    const c7 = row.getCell(7);
    c7.alignment = { horizontal: "center", vertical: "middle" };
    if (f.tasa_cumplimiento >= 90) {
      c7.fill = { type: "pattern", pattern: "solid", fgColor: { argb: COLOR_VERDE_BG } };
      c7.font = { name: FONT_FAMILY, size: 9, bold: true, color: { argb: COLOR_VERDE_TXT } };
    } else if (f.tasa_cumplimiento >= 75) {
      c7.fill = { type: "pattern", pattern: "solid", fgColor: { argb: COLOR_AMBAR_BG } };
      c7.font = { name: FONT_FAMILY, size: 9, bold: true, color: { argb: COLOR_AMBAR_TXT } };
    } else {
      c7.fill = { type: "pattern", pattern: "solid", fgColor: { argb: COLOR_ROJO_BG } };
      c7.font = { name: FONT_FAMILY, size: 9, bold: true, color: { argb: COLOR_ROJO_TXT } };
    }
  });

  // Fila separadora visual
  const sep = ws.addRow([]);
  sep.height = 12;

  // =========================================================================
  // SECCIÓN SEPARADA CLARA: TRÁMITES CON ANÁLISIS COMPARTIDO (CO-RESPONSABILIDAD)
  // =========================================================================
  const rCompHeader = ws.addRow([
    "Trámites con Análisis Compartido (Co-Responsabilidad de Duplas)",
    "Múltiples Analistas - Presupuesto / Control Previo",
    analisis_compartido.total_tramites,
    analisis_compartido.total_tramites,
    0,
    analisis_compartido.mediana_dias_despacho,
    `${analisis_compartido.tasa_cumplimiento}%`,
  ]);

  rCompHeader.height = 24;
  rCompHeader.eachCell((cell) => {
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: COLOR_COMPARTIDO_BG } };
    cell.font = { name: FONT_FAMILY, size: 9.5, bold: true, color: { argb: COLOR_COMPARTIDO_TXT } };
    cell.border = {
      top: { style: "medium", color: { argb: COLOR_COMPARTIDO_TXT } },
      bottom: { style: "medium", color: { argb: COLOR_COMPARTIDO_TXT } },
      left: { style: "thin", color: { argb: COLOR_BORDE_GRIS } },
      right: { style: "thin", color: { argb: COLOR_BORDE_GRIS } },
    };
  });
  rCompHeader.getCell(1).alignment = { horizontal: "left", vertical: "middle" };
  rCompHeader.getCell(2).alignment = { horizontal: "left", vertical: "middle" };
  rCompHeader.getCell(3).alignment = { horizontal: "center", vertical: "middle" };
  rCompHeader.getCell(4).alignment = { horizontal: "center", vertical: "middle" };
  rCompHeader.getCell(5).alignment = { horizontal: "center", vertical: "middle" };
  rCompHeader.getCell(6).alignment = { horizontal: "center", vertical: "middle" };
  rCompHeader.getCell(7).alignment = { horizontal: "center", vertical: "middle" };

  // Subgrupos de análisis compartido si existen
  if (analisis_compartido.grupos && analisis_compartido.grupos.length > 0) {
    analisis_compartido.grupos.forEach((g) => {
      const gRow = ws.addRow([
        `   • Asignación Conjunta: ${g.analistas}`,
        "Co-Responsabilidad Operativa",
        g.total_tramites,
        g.total_tramites,
        0,
        g.mediana_dias_despacho,
        `${g.tasa_cumplimiento}%`,
      ]);
      gRow.height = 20;
      gRow.eachCell((cell) => {
        cell.font = { name: FONT_FAMILY, size: 9, color: { argb: COLOR_COMPARTIDO_TXT } };
        cell.border = BORDE_DELGADO;
      });
      gRow.getCell(1).alignment = { horizontal: "left", vertical: "middle" };
      gRow.getCell(2).alignment = { horizontal: "left", vertical: "middle" };
      gRow.getCell(3).alignment = { horizontal: "center", vertical: "middle" };
      gRow.getCell(4).alignment = { horizontal: "center", vertical: "middle" };
      gRow.getCell(5).alignment = { horizontal: "center", vertical: "middle" };
      gRow.getCell(6).alignment = { horizontal: "center", vertical: "middle" };
      gRow.getCell(7).alignment = { horizontal: "center", vertical: "middle" };
    });
  }

  // Nota explicativa metodológica
  const notaRow = ws.addRow([
    "(*) AVISO METODOLÓGICO: Los trámites asignados conjuntamente a duplas de analistas o comisiones técnicas se presentan en esta sección separada para preservar la equidad y no distorsionar las evaluaciones individuales de desempeño.",
  ]);
  ws.mergeCells(`A${notaRow.number}:G${notaRow.number}`);
  notaRow.height = 24;
  notaRow.getCell(1).font = { name: FONT_FAMILY, size: 8.5, italic: true, color: { argb: COLOR_TEXTO_MUTED } };
  notaRow.getCell(1).alignment = { horizontal: "left", vertical: "middle" };

  autoAjustarColumnas(ws);
  ws.getColumn(6).width = 22;

  const buffer = await wb.xlsx.writeBuffer();
  return Buffer.from(buffer);
}

// -------------------------------------------------------------------------------------------------
// LIBRO 3: REPORTE POR TIPO DE PROCESO (exportarExcelProcesos)
// -------------------------------------------------------------------------------------------------

export interface ExportarProcesosInput {
  familias_canonicas?: FamiliaCanonicaItem[];
  procesos: AuditoriaProcesoItem[];
  filtros: FiltrosReportesTiempos;
  slaLimite: number;
  usuarioGenerador?: string;
}

export async function exportarExcelProcesos(input: ExportarProcesosInput): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  wb.creator = "Servicio Nacional de Aduana del Ecuador (SENAE)";
  wb.created = new Date();

  const { procesos, filtros, slaLimite } = input;
  const fechaGeneracionStr = `${formatearFecha(new Date())} ${new Date().toLocaleTimeString("es-EC")}`;

  // =========================================================================
  // HOJA 1: TIEMPOS POR PROCESO (Nombre Oficial del Catálogo SENAE)
  // =========================================================================
  const ws = wb.addWorksheet("Tiempos por Proceso", { views: [{ showGridLines: true }] });

  // Banner Superior
  ws.mergeCells("A1:F1");
  const cBanner = ws.getCell("A1");
  cBanner.value = "SERVICIO NACIONAL DE ADUANA DEL ECUADOR - REPORTE DE TIEMPOS POR TIPO DE PROCESO";
  cBanner.font = { name: FONT_FAMILY, size: 12, bold: true, color: { argb: COLOR_BLANCO } };
  cBanner.fill = { type: "pattern", pattern: "solid", fgColor: { argb: COLOR_AZUL_OSCURO } };
  cBanner.alignment = { horizontal: "center", vertical: "middle" };
  ws.getRow(1).height = 30;

  // Subtítulo
  ws.mergeCells("A2:F2");
  const cSub = ws.getCell("A2");
  cSub.value = `Periodo: ${formatearFecha(filtros.fecha_desde)} al ${formatearFecha(
    filtros.fecha_hasta
  )}  •  SLA Institucional: ${slaLimite} Días Hábiles  •  Fecha de Emisión: ${fechaGeneracionStr}`;
  cSub.font = { name: FONT_FAMILY, size: 9, bold: true, color: { argb: COLOR_TEXTO_MUTED } };
  cSub.fill = { type: "pattern", pattern: "solid", fgColor: { argb: COLOR_FONDO_ZEBRA } };
  cSub.alignment = { horizontal: "center", vertical: "middle" };
  ws.getRow(2).height = 20;

  // 6 Columnas Oficiales Solicitadas
  const headers = [
    "Tipo de Proceso",
    "Cantidad de Trámites",
    "Monto Total ($)",
    "TIEMPO TOTAL PROMEDIO\n(Días Calendario)",
    "TIEMPO REAL TRABAJADO PROMEDIO\n(Días Hábiles)",
    "Etapa con Mayor Demora",
  ];

  const hRow = ws.addRow(headers);
  estilizarCabecera(hRow, COLOR_AZUL_OSCURO);
  hRow.height = 32;

  // Realce para las dos columnas reinas (Columnas 4 y 5)
  const cellH4 = hRow.getCell(4);
  cellH4.fill = { type: "pattern", pattern: "solid", fgColor: { argb: COLOR_AZUL_SECUNDARIO } };
  cellH4.font = { name: FONT_FAMILY, size: 10, bold: true, color: { argb: COLOR_BLANCO } };

  const cellH5 = hRow.getCell(5);
  cellH5.fill = { type: "pattern", pattern: "solid", fgColor: { argb: COLOR_AZUL_SECUNDARIO } };
  cellH5.font = { name: FONT_FAMILY, size: 10, bold: true, color: { argb: COLOR_BLANCO } };

  let totalTramitesGlobal = 0;
  let montoTotalGlobal = 0;
  let sumaPonderadaTotal = 0;
  let sumaPonderadaReal = 0;

  // Filas por cada tipo de proceso (nombre oficial de catálogo)
  procesos.forEach((p, idx) => {
    const tTotal = p.tiempo_total_promedio ?? p.mediana_dias_totales ?? 0;
    const tReal = p.tiempo_real_promedio ?? p.mediana_dias_totales ?? 0;
    const monto = p.monto_total || 0;

    totalTramitesGlobal += p.total_tramites;
    montoTotalGlobal += monto;
    sumaPonderadaTotal += tTotal * p.total_tramites;
    sumaPonderadaReal += tReal * p.total_tramites;

    const row = ws.addRow([
      p.nombre_proceso,
      p.total_tramites,
      monto,
      tTotal,
      tReal,
      p.fase_mayor_demora,
    ]);

    estilizarFilaDatos(row, idx % 2 === 1);

    row.getCell(1).alignment = { horizontal: "left", vertical: "middle" };
    row.getCell(1).font = { name: FONT_FAMILY, size: 9, bold: true, color: { argb: COLOR_TEXTO_OSCURO } };

    row.getCell(2).alignment = { horizontal: "center", vertical: "middle" };

    const cMonto = row.getCell(3);
    cMonto.numFmt = '"$"#,##0.00';
    cMonto.alignment = { horizontal: "right", vertical: "middle" };

    // =========================================================
    // LAS DOS COLUMNAS REINAS DESTACADAS (Columnas 4 y 5)
    // =========================================================
    const c4 = row.getCell(4);
    c4.fill = { type: "pattern", pattern: "solid", fgColor: { argb: COLOR_FONDO_REINA } };
    c4.font = { name: FONT_FAMILY, size: 9.5, bold: true, color: { argb: COLOR_TEXTO_REINA } };
    c4.alignment = { horizontal: "center", vertical: "middle" };
    c4.numFmt = "#,##0.0";

    const c5 = row.getCell(5);
    c5.fill = { type: "pattern", pattern: "solid", fgColor: { argb: COLOR_FONDO_REINA } };
    c5.font = { name: FONT_FAMILY, size: 9.5, bold: true, color: { argb: COLOR_TEXTO_REINA } };
    c5.alignment = { horizontal: "center", vertical: "middle" };
    c5.numFmt = "#,##0.0";

    // Columna 6: Etapa con Mayor Demora
    const c6 = row.getCell(6);
    c6.alignment = { horizontal: "center", vertical: "middle" };
    if (p.fase_mayor_demora.includes("Contabilidad") || p.fase_mayor_demora.includes("Presupuesto")) {
      c6.fill = { type: "pattern", pattern: "solid", fgColor: { argb: COLOR_AMBAR_BG } };
      c6.font = { name: FONT_FAMILY, size: 9, bold: true, color: { argb: COLOR_AMBAR_TXT } };
    } else {
      c6.font = { name: FONT_FAMILY, size: 9, color: { argb: COLOR_TEXTO_OSCURO } };
    }
  });

  // Fila Totalizadora General
  const promTotalPond = totalTramitesGlobal > 0 ? sumaPonderadaTotal / totalTramitesGlobal : 0;
  const promRealPond = totalTramitesGlobal > 0 ? sumaPonderadaReal / totalTramitesGlobal : 0;

  const totalRow = ws.addRow([
    "TOTAL GENERAL / PROMEDIO",
    totalTramitesGlobal,
    montoTotalGlobal,
    Number(promTotalPond.toFixed(1)),
    Number(promRealPond.toFixed(1)),
    "-",
  ]);

  totalRow.height = 24;
  totalRow.eachCell((cell) => {
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: COLOR_FONDO_REINA } };
    cell.font = { name: FONT_FAMILY, size: 9.5, bold: true, color: { argb: COLOR_AZUL_OSCURO } };
    cell.border = {
      top: { style: "medium", color: { argb: COLOR_AZUL_OSCURO } },
      bottom: { style: "medium", color: { argb: COLOR_AZUL_OSCURO } },
      left: { style: "thin", color: { argb: COLOR_BORDE_GRIS } },
      right: { style: "thin", color: { argb: COLOR_BORDE_GRIS } },
    };
  });

  totalRow.getCell(1).alignment = { horizontal: "left", vertical: "middle" };
  totalRow.getCell(2).alignment = { horizontal: "center", vertical: "middle" };

  const cTotMonto = totalRow.getCell(3);
  cTotMonto.numFmt = '"$"#,##0.00';
  cTotMonto.alignment = { horizontal: "right", vertical: "middle" };

  const cTot4 = totalRow.getCell(4);
  cTot4.numFmt = "#,##0.0";
  cTot4.alignment = { horizontal: "center", vertical: "middle" };

  const cTot5 = totalRow.getCell(5);
  cTot5.numFmt = "#,##0.0";
  cTot5.alignment = { horizontal: "center", vertical: "middle" };

  totalRow.getCell(6).alignment = { horizontal: "center", vertical: "middle" };

  autoAjustarColumnas(ws);
  ws.getColumn(1).width = 36;
  ws.getColumn(4).width = 24;
  ws.getColumn(5).width = 24;
  ws.getColumn(6).width = 22;

  const buffer = await wb.xlsx.writeBuffer();
  return Buffer.from(buffer);
}
