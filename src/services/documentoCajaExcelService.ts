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
  carton?: number | string | null;
}

export interface CajaParaDocumento {
  id_caja: number;
  codigo_caja: string;
  nombre?: string | null;
  tramites: TramiteParaDocumentoCaja[];
}

/**
 * Genera el documento oficial Excel para el control físico de la CAJA antes de enviarla al Archivo Central.
 * Cumple fielmente con la estructura de 7 columnas solicitada por Tesorería/Cobranzas:
 *   1. NO (Secuencial: 1, 2, 3...) - Ancho ~8
 *   2. CARTON (Valor predeterminado "1" o el cartón del trámite) - Ancho ~10
 *   3. NUMERO DE QUIPUX (numero_quipux) - Ancho ~26
 *   4. NRO CUR (numero_cur_devengado || numero_cur_contable || numero_cur_compromiso || '-') - Ancho ~22
 *   5. PROVEEDOR (proveedor_beneficiario) - Ancho ~45
 *   6. MONTO (monto_total con formato moneda Excel $#,##0.00) - Ancho ~18
 *   7. OBSERVACION (Celda vacía para que el custodio anote '1 FOLDER', '2 CARTON', '2 CARPETAS', etc.) - Ancho ~30
 * - Fila de totales: Merge A-E para "TOTAL CAJA:", fórmula SUM en columna F (MONTO), estilos y bordes exactos.
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

  // Ancho exacto de las 7 columnas según especificación
  worksheet.getColumn(1).width = 8.0;  // NO
  worksheet.getColumn(2).width = 10.0; // CARTON
  worksheet.getColumn(3).width = 26.0; // NUMERO DE QUIPUX
  worksheet.getColumn(4).width = 22.0; // NRO CUR
  worksheet.getColumn(5).width = 45.0; // PROVEEDOR
  worksheet.getColumn(6).width = 18.0; // MONTO
  worksheet.getColumn(7).width = 30.0; // OBSERVACION

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

  // 1. FILA 1: NOMBRE DE LA CAJA (Merge A1:G1, Altura 28.8)
  worksheet.mergeCells("A1:G1");
  const row1 = worksheet.getRow(1);
  row1.height = 28.8;
  const titleCell = worksheet.getCell("A1");
  titleCell.value = nombreCaja.toUpperCase();
  titleCell.font = { name: "Arial", size: 13, bold: true, color: { argb: "FFFFFFFF" } };
  titleCell.alignment = { horizontal: "center", vertical: "middle" };
  titleCell.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FF244062" }, // Azul institucional SENAE
  };
  for (let c = 1; c <= 7; c++) {
    row1.getCell(c).border = thinBorder;
  }

  // 2. FILA 2: SUBTÍTULO INSTITUCIONAL (Merge A2:G2, Altura 28.2)
  worksheet.mergeCells("A2:G2");
  const row2 = worksheet.getRow(2);
  row2.height = 28.2;
  const subTitleCell = worksheet.getCell("A2");
  subTitleCell.value = `SERVICIO NACIONAL DE ADUANA DEL ECUADOR - ADMINISTRACIÓN DE CAJA | FECHA DE EMISIÓN: ${fechaStr}`;
  subTitleCell.font = { name: "Arial", size: 11, bold: true, color: { argb: "FF475569" } };
  subTitleCell.alignment = { horizontal: "center", vertical: "middle" };
  subTitleCell.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FFF1F5F9" }, // Fondo gris claro
  };
  for (let c = 1; c <= 7; c++) {
    row2.getCell(c).border = thinBorder;
  }

  // 3. FILA 3: ENCABEZADOS DE TABLA (Altura 27.6)
  const headers = [
    "NO",
    "CARTON",
    "NUMERO DE QUIPUX",
    "NRO CUR",
    "PROVEEDOR",
    "MONTO",
    "OBSERVACION",
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
      fgColor: { argb: "FF244062" },
    };
    cell.border = thinBorder;
  });

  // 4. FILAS DE DATOS (Fila 4 en adelante con cálculo dinámico de altura para legibilidad)
  let currentRowIdx = 4;
  let totalValor = 0;

  if (caja.tramites && caja.tramites.length > 0) {
    caja.tramites.forEach((t, index) => {
      const row = worksheet.getRow(currentRowIdx);

      // Col 1: NO (Secuencial 1, 2, 3...)
      const secuencial = index + 1;

      // Col 2: CARTON (Predeterminado 1 o cartón asignado)
      const carton =
        t.carton !== undefined && t.carton !== null && String(t.carton).trim() !== ""
          ? t.carton
          : 1;

      // Col 3: NUMERO DE QUIPUX
      const quipux = t.numero_quipux || "-";

      // Col 4: NRO CUR (numero_cur_devengado || numero_cur_contable || numero_cur_compromiso || '-')
      const curParts = [
        t.numero_cur_devengado,
        t.numero_cur_contable,
        t.numero_cur_compromiso,
      ].filter(Boolean);
      const curDisplay = curParts.length > 0 ? curParts.join(", ") : "-";

      // Col 5: PROVEEDOR
      const proveedor = t.proveedor_beneficiario || "-";

      // Col 6: MONTO
      const monto = Number(t.monto_total || 0);
      totalValor += monto;

      // Cálculo de altura según contenido
      const charsPerLineProv = 38;
      const charsPerLineQuipux = 22;
      const charsPerLineCur = 18;
      const estimatedLinesProv = Math.ceil(Math.max(1, proveedor.length) / charsPerLineProv);
      const estimatedLinesQuipux = Math.ceil(Math.max(1, quipux.length) / charsPerLineQuipux);
      const estimatedLinesCur = Math.ceil(Math.max(1, curDisplay.length) / charsPerLineCur);
      const maxLines = Math.max(1, estimatedLinesProv, estimatedLinesQuipux, estimatedLinesCur);

      row.height = Math.max(28, maxLines * 16 + 10);

      // Col 1: NO
      const c1 = row.getCell(1);
      c1.value = secuencial;
      c1.font = { name: "Arial", size: 11, bold: true };
      c1.alignment = { horizontal: "center", vertical: "middle" };

      // Col 2: CARTON
      const c2 = row.getCell(2);
      c2.value = carton;
      c2.font = { name: "Arial", size: 11, bold: true };
      c2.alignment = { horizontal: "center", vertical: "middle" };

      // Col 3: NUMERO DE QUIPUX
      const c3 = row.getCell(3);
      c3.value = quipux;
      c3.font = { name: "Arial", size: 10, bold: true };
      c3.alignment = { horizontal: "center", vertical: "middle", wrapText: true };

      // Col 4: NRO CUR
      const c4 = row.getCell(4);
      c4.value = curDisplay;
      c4.font = { name: "Arial", size: 10, bold: true };
      c4.alignment = { horizontal: "center", vertical: "middle", wrapText: true };

      // Col 5: PROVEEDOR
      const c5 = row.getCell(5);
      c5.value = proveedor;
      c5.font = { name: "Arial", size: 10 };
      c5.alignment = { horizontal: "left", vertical: "middle", wrapText: true };

      // Col 6: MONTO
      const c6 = row.getCell(6);
      c6.value = monto;
      c6.font = { name: "Arial", size: 11, bold: true };
      c6.alignment = { horizontal: "right", vertical: "middle" };
      c6.numFmt = '"$"#,##0.00';

      // Col 7: OBSERVACION (Vacía para anotaciones manuales: 1 FOLDER, 2 CARTON, 2 CARPETAS, etc.)
      const c7 = row.getCell(7);
      c7.value = "";
      c7.font = { name: "Arial", size: 10 };
      c7.alignment = { horizontal: "center", vertical: "middle" };

      for (let c = 1; c <= 7; c++) {
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

  // 5. FILA DE TOTALES GENERALES
  const totalsRow = worksheet.getRow(currentRowIdx);
  totalsRow.height = 22.0;

  worksheet.mergeCells(`A${currentRowIdx}:E${currentRowIdx}`);
  const cATotal = totalsRow.getCell(1);
  cATotal.value = "TOTAL CAJA:";
  cATotal.font = { name: "Arial", size: 11, bold: true };
  cATotal.alignment = { horizontal: "right", vertical: "middle" };

  const c6Total = totalsRow.getCell(6);
  c6Total.value = {
    formula: `SUM(F4:F${currentRowIdx - 1})`,
    result: totalValor,
  };
  c6Total.font = { name: "Arial", size: 11, bold: true };
  c6Total.alignment = { horizontal: "right", vertical: "middle" };
  c6Total.numFmt = '"$"#,##0.00';

  const c7Total = totalsRow.getCell(7);
  c7Total.value = "";

  for (let c = 1; c <= 7; c++) {
    const cell = totalsRow.getCell(c);
    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FFE2E8F0" }, // Fondo gris azulado exacto
    };
    cell.border = thinBorder;
  }

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}
