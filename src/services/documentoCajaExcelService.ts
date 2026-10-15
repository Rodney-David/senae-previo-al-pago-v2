import ExcelJS from "exceljs";

export interface TramiteParaDocumentoCaja {
  id_tramite: number;
  codigo_tramite?: string;
  numero_quipux: string;
  proveedor_beneficiario: string;
  asunto?: string | null;
  monto_total: number | string | any;
  numero_hojas?: number | null;
  numero_cur_devengado?: string | null;
  numero_cur_contable?: string | null;
  numero_cur_compromiso?: string | null;
}

export interface CajaParaDocumento {
  id_caja: number;
  codigo_caja: string;
  nombre?: string | null;
  tramites: TramiteParaDocumentoCaja[];
}

/**
 * Genera el documento oficial Excel para el control físico de la CAJA antes de enviarla al archivo.
 * Sigue fielmente la estructura, dimensiones, colores y tipografía de la nueva PLANTILLA DOC EXCEL CAJA.xlsx:
 * - 8 Columnas exactas:
 *   1. No. (Secuencial: 1, 2, 3...)
 *   2. Cartón (Siempre 1)
 *   3. CUR
 *   4. Hojas
 *   5. Proveedor y Asunto
 *   6. Valor
 *   7. Fecha y Observaciones
 *   8. Fecha envío de correos
 * - Colores exactos: Fondo azul marino #244062 para encabezados, #F1F5F9 para subtítulo, #E2E8F0 para totales
 * - Tipografía: Arial 11pt (13pt para título de caja)
 * - Dimensiones exactas de columnas y alturas de fila (40.05pt por fila de trámite para espaciado holgado)
 */
export async function generarDocumentoCajaExcel(caja: CajaParaDocumento): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "SENAE - Control Previo al Pago";
  workbook.created = new Date();

  const nombreCaja = (caja.nombre || caja.codigo_caja || "CAJA").trim();
  const safeSheetName = nombreCaja.replace(/[\\/*?[\]:]/g, "").substring(0, 31) || "Caja";

  const worksheet = workbook.addWorksheet(safeSheetName, {
    pageSetup: {
      orientation: "landscape",
      fitToPage: true,
      fitToWidth: 1,
      fitToHeight: 0,
      paperSize: 9, // A4
      margins: {
        left: 0.7,
        right: 0.7,
        top: 0.75,
        bottom: 0.75,
        header: 0.3,
        footer: 0.3,
      },
    },
  });

  // Ancho de las 8 columnas con márgenes holgados para evitar cortes y montado de celdas
  worksheet.getColumn(1).width = 11.0; // No.
  worksheet.getColumn(2).width = 12.0; // Cartón
  worksheet.getColumn(3).width = 22.0; // CUR (ampliado para permitir múltiples CURs con margen)
  worksheet.getColumn(4).width = 12.0; // Hojas
  worksheet.getColumn(5).width = 68.0; // Proveedor y Asunto (ampliado generosamente)
  worksheet.getColumn(6).width = 20.0; // Valor
  worksheet.getColumn(7).width = 20.0; // Fecha y Observaciones
  worksheet.getColumn(8).width = 20.0; // Fecha envío de correos

  const now = new Date();
  const dd = String(now.getDate()).padStart(2, "0");
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const aaaa = String(now.getFullYear());
  const fechaStr = `${dd}/${mm}/${aaaa}`;

  const thinBorder: Partial<ExcelJS.Borders> = {
    top: { style: "thin", color: { argb: "FF000000" } },
    left: { style: "thin", color: { argb: "FF000000" } },
    bottom: { style: "thin", color: { argb: "FF000000" } },
    right: { style: "thin", color: { argb: "FF000000" } },
  };

  // 1. FILA 1: NOMBRE DE LA CAJA (Merge A1:H1, Altura 28.8)
  worksheet.mergeCells("A1:H1");
  const row1 = worksheet.getRow(1);
  row1.height = 28.8;
  const titleCell = worksheet.getCell("A1");
  titleCell.value = nombreCaja.toUpperCase();
  titleCell.font = { name: "Arial", size: 13, bold: true, color: { argb: "FFFFFFFF" } };
  titleCell.alignment = { horizontal: "center", vertical: "middle" };
  titleCell.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FF244062" }, // Azul marino exacto plantilla
  };
  for (let c = 1; c <= 8; c++) {
    row1.getCell(c).border = thinBorder;
  }

  // 2. FILA 2: SUBTÍTULO INSTITUCIONAL (Merge A2:H2, Altura 28.2)
  worksheet.mergeCells("A2:H2");
  const row2 = worksheet.getRow(2);
  row2.height = 28.2;
  const subTitleCell = worksheet.getCell("A2");
  subTitleCell.value = `SERVICIO NACIONAL DE ADUANA DEL ECUADOR - ADMINISTRACIÓN DE CAJA | FECHA DE EMISIÓN: ${fechaStr}`;
  subTitleCell.font = { name: "Arial", size: 11, bold: true, color: { argb: "FF475569" } };
  subTitleCell.alignment = { horizontal: "center", vertical: "middle" };
  subTitleCell.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FFF1F5F9" }, // Gris claro exacto plantilla
  };
  for (let c = 1; c <= 8; c++) {
    row2.getCell(c).border = thinBorder;
  }

  // 3. FILA 3: ENCABEZADOS DE TABLA (Altura 27.6)
  const headers = [
    "No.",
    "Cartón",
    "CUR",
    "Hojas",
    "Proveedor y Asunto",
    "Valor",
    "Fecha y Observaciones",
    "Fecha envío de correos",
  ];

  const headerRow = worksheet.getRow(3);
  headerRow.height = 27.6;

  headers.forEach((headerText, index) => {
    const colNumber = index + 1;
    const cell = headerRow.getCell(colNumber);
    cell.value = headerText;
    cell.font = { name: "Arial", size: 11, bold: true, color: { argb: "FFFFFFFF" } };
    cell.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF244062" }, // Azul marino exacto plantilla
    };
    cell.border = thinBorder;
  });

  // 4. FILAS DE DATOS (Fila 4 en adelante con cálculo dinámico de altura para evitar cortes)
  let currentRowIdx = 4;
  let totalValor = 0;

  if (caja.tramites && caja.tramites.length > 0) {
    caja.tramites.forEach((t, index) => {
      const row = worksheet.getRow(currentRowIdx);

      // Col 1: Secuencial (1, 2, 3...)
      const secuencial = index + 1;

      // Col 2: En la columna de Cartón siempre va el número 1 en todos los trámites
      const carton = 1;

      // Col 3: CUR
      const curParts = [
        t.numero_cur_devengado,
        t.numero_cur_contable,
        t.numero_cur_compromiso,
      ].filter(Boolean);
      const curDisplay = curParts.length > 0 ? curParts.join(", ") : "-";

      // Col 4: Hojas
      const hojas = t.numero_hojas !== null && t.numero_hojas !== undefined ? Number(t.numero_hojas) : "-";

      // Col 6: Monto Valor
      const monto = Number(t.monto_total || 0);
      totalValor += monto;

      // Col 5: Proveedor y Asunto
      const proveedorAsunto = `${t.proveedor_beneficiario || ""}${
        t.asunto ? ` - ${t.asunto}` : ""
      }`.trim();

      // CÁLCULO DINÁMICO DE ALTURA DE FILA:
      // Ancho de columna 5 es 68 (aprox. 52-56 caracteres por línea con Arial 11).
      // Si el texto se envuelve en 2, 3 o 4 líneas, aumentamos la altura proporcionalmente para que NO se solapen.
      const charsPerLineCol5 = 54;
      const charsPerLineCur = 18;
      const estimatedLinesCol5 = Math.ceil(Math.max(1, proveedorAsunto.length) / charsPerLineCol5);
      const estimatedLinesCur = Math.ceil(Math.max(1, curDisplay.length) / charsPerLineCur);
      const maxLines = Math.max(1, estimatedLinesCol5, estimatedLinesCur);

      // 36pt base para 1 línea; +18pt por cada línea adicional para asegurar separación visual limpia
      row.height = Math.max(38, maxLines * 18 + 12);

      // Col 1: No.
      const c1 = row.getCell(1);
      c1.value = secuencial;
      c1.font = { name: "Arial", size: 11, bold: true };
      c1.alignment = { horizontal: "center", vertical: "middle" };

      // Col 2: Cartón
      const c2 = row.getCell(2);
      c2.value = carton;
      c2.font = { name: "Arial", size: 11, bold: true };
      c2.alignment = { horizontal: "center", vertical: "middle" };

      // Col 3: CUR
      const c3 = row.getCell(3);
      c3.value = curDisplay;
      c3.font = { name: "Arial", size: 11, bold: true };
      c3.alignment = { horizontal: "center", vertical: "middle", wrapText: true };

      // Col 4: Hojas
      const c4 = row.getCell(4);
      c4.value = hojas;
      c4.font = { name: "Arial", size: 11 };
      c4.alignment = { horizontal: "center", vertical: "middle" };

      // Col 5: Proveedor y Asunto
      const c5 = row.getCell(5);
      c5.value = proveedorAsunto;
      c5.font = { name: "Arial", size: 11 };
      c5.alignment = { horizontal: "left", vertical: "middle", wrapText: true };

      // Col 6: Valor
      const c6 = row.getCell(6);
      c6.value = monto;
      c6.font = { name: "Arial", size: 11, bold: true };
      c6.alignment = { horizontal: "right", vertical: "middle" };
      c6.numFmt = '"$"#,##0.00';

      // Col 7: Fecha y Observaciones (VACÍO)
      const c7 = row.getCell(7);
      c7.value = "";
      c7.font = { name: "Arial", size: 11 };
      c7.alignment = { horizontal: "center", vertical: "middle" };

      // Col 8: Fecha envío de correos (VACÍO)
      const c8 = row.getCell(8);
      c8.value = "";
      c8.font = { name: "Arial", size: 11 };
      c8.alignment = { horizontal: "center", vertical: "middle" };

      for (let c = 1; c <= 8; c++) {
        const cell = row.getCell(c);
        cell.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: "FFFFFFFF" },
        };
        cell.border = thinBorder;
      }

      currentRowIdx++;
    });
  }

  // 5. FILA DE TOTALES GENERALES (Altura 19.2)
  const totalsRow = worksheet.getRow(currentRowIdx);
  totalsRow.height = 19.2;

  totalsRow.getCell(1).value = "";
  totalsRow.getCell(2).value = "";
  totalsRow.getCell(3).value = "";
  totalsRow.getCell(4).value = "";

  const c5Total = totalsRow.getCell(5);
  c5Total.value = "TOTAL GENERAL VALORES:";
  c5Total.font = { name: "Arial", size: 11, bold: true };
  c5Total.alignment = { horizontal: "right", vertical: "middle" };

  const c6Total = totalsRow.getCell(6);
  c6Total.value = {
    formula: `SUM(F4:F${currentRowIdx - 1})`,
    result: totalValor,
  };
  c6Total.font = { name: "Arial", size: 11, bold: true };
  c6Total.alignment = { horizontal: "right", vertical: "middle" };
  c6Total.numFmt = '"$"#,##0.00';

  totalsRow.getCell(7).value = "";
  totalsRow.getCell(8).value = "";

  for (let c = 1; c <= 8; c++) {
    const cell = totalsRow.getCell(c);
    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FFE2E8F0" }, // Fondo gris azulado exacto plantilla
    };
    cell.border = thinBorder;
  }

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}
