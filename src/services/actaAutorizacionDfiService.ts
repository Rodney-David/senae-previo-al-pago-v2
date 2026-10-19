import ExcelJS from "exceljs";

export interface TramiteParaActaDfi {
  id_tramite: number;
  codigo_tramite?: string;
  numero_quipux: string;
  proveedor_beneficiario: string;
  ruc_proveedor?: string | null;
  tipos_tramite?: { nombre: string } | null;
  asunto?: string | null;
  numero_cur_devengado?: string | null;
  numero_cur_contable?: string | null;
  monto_total: any; // Decimal | number | string
}

/**
 * Genera el documento oficial de Acta de Autorización de Pago para la Dirección Financiera (DFI).
 * Estructura y calidad visual institucional SENAE (ExcelJS, azul SENAE #0B3B60, subtítulo #F1F5F9, A4 apaisado).
 */
export async function generarActaAutorizacionDfiExcel(
  tramites: TramiteParaActaDfi[]
): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "SENAE - Dirección Financiera";
  workbook.created = new Date();

  const worksheet = workbook.addWorksheet("Autorización de Pago DFI", {
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

  const now = new Date();
  const dd = String(now.getDate()).padStart(2, "0");
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const yyyy = String(now.getFullYear());
  const fechaEmisionStr = `${dd}/${mm}/${yyyy}`;

  // 1. TÍTULO UNIFICADO INSTITUCIONAL (Fila 1 - Altura 28.8pt)
  worksheet.mergeCells("A1:J1");
  const titleCell = worksheet.getCell("A1");
  titleCell.value = "ACTA DE AUTORIZACIÓN DE PAGO - DIRECCIÓN FINANCIERA";
  titleCell.font = { name: "Arial", size: 13, bold: true, color: { argb: "FFFFFFFF" } };
  titleCell.alignment = { horizontal: "center", vertical: "middle" };
  titleCell.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FF0B3B60" }, // Azul institucional SENAE
  };
  worksheet.getRow(1).height = 28.8;

  // 2. SUBTÍTULO CON FECHA DE EMISIÓN (Fila 2 - Altura 16.05pt)
  worksheet.mergeCells("A2:J2");
  const subTitleCell = worksheet.getCell("A2");
  subTitleCell.value = `SERVICIO NACIONAL DE ADUANA DEL ECUADOR | FECHA DE EMISIÓN: ${fechaEmisionStr}`;
  subTitleCell.font = { name: "Arial", size: 9, bold: true, color: { argb: "FF475569" } };
  subTitleCell.alignment = { horizontal: "center", vertical: "middle" };
  subTitleCell.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FFF1F5F9" }, // Subtítulo gris suave
  };
  worksheet.getRow(2).height = 16.05;

  // 3. ENCABEZADOS DE COLUMNAS (Fila 3 - Altura 40.05pt)
  const headerRow = worksheet.getRow(3);
  headerRow.values = [
    "No.",
    "Documento / Quipux",
    "Proveedor / Beneficiario",
    "RUC / Cédula",
    "Tipo de Proceso",
    "Asunto / Objeto",
    "N° CUR Devengado",
    "N° CUR Contable",
    "Monto Autorizado ($)",
    "Firma Autorización DFI",
  ];
  headerRow.height = 40.05;

  const thinBorder: Partial<ExcelJS.Borders> = {
    top: { style: "thin", color: { argb: "FF000000" } },
    left: { style: "thin", color: { argb: "FF000000" } },
    bottom: { style: "thin", color: { argb: "FF000000" } },
    right: { style: "thin", color: { argb: "FF000000" } },
  };

  headerRow.eachCell((cell) => {
    cell.font = { name: "Arial", size: 10, bold: true, color: { argb: "FFFFFFFF" } };
    cell.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF1E3A8A" }, // Azul corporativo
    };
    cell.border = thinBorder;
  });

  // Configuración de anchos de columnas
  worksheet.columns = [
    { key: "no", width: 6 },
    { key: "quipux", width: 26 },
    { key: "proveedor", width: 34 },
    { key: "ruc", width: 16 },
    { key: "tipo_proceso", width: 22 },
    { key: "asunto", width: 36 },
    { key: "cur_devengado", width: 18 },
    { key: "cur_contable", width: 18 },
    { key: "monto", width: 22 },
    { key: "firma", width: 24 },
  ];

  // 4. FILAS DE DATOS (A partir de la Fila 4)
  let totalMonto = 0;

  tramites.forEach((t, index) => {
    const rowNumber = 4 + index;
    const row = worksheet.getRow(rowNumber);

    const montoNum = Number(t.monto_total) || 0;
    totalMonto += montoNum;

    row.values = [
      index + 1,
      t.numero_quipux,
      t.proveedor_beneficiario || "-",
      t.ruc_proveedor || "-",
      t.tipos_tramite?.nombre || "-",
      t.asunto || "-",
      t.numero_cur_devengado || "-",
      t.numero_cur_contable || "-",
      montoNum,
      "", // Blanco para firma física / sumilla
    ];

    row.height = 36;

    row.eachCell((cell, colNumber) => {
      cell.font = { name: "Arial", size: 9.5 };
      cell.border = thinBorder;

      if (colNumber === 1 || colNumber === 4 || colNumber === 7 || colNumber === 8) {
        cell.alignment = { horizontal: "center", vertical: "middle" };
      } else if (colNumber === 2) {
        cell.alignment = { horizontal: "center", vertical: "middle" };
        cell.font = { name: "Arial", size: 9.5, bold: true };
      } else if (colNumber === 9) {
        cell.alignment = { horizontal: "right", vertical: "middle" };
        cell.numFmt = '"$"#,##0.00;("$"#,##0.00);"-"';
        cell.font = { name: "Arial", size: 9.5, bold: true };
      } else if (colNumber === 10) {
        cell.alignment = { horizontal: "center", vertical: "middle" };
        cell.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: "FFFAFAFA" },
        };
      } else {
        cell.alignment = { horizontal: "left", vertical: "middle", wrapText: true };
      }
    });
  });

  // 5. FILA DE TOTALIZACIÓN AL FINAL
  const totalRowNumber = 4 + tramites.length;
  const totalRow = worksheet.getRow(totalRowNumber);
  totalRow.height = 26;

  worksheet.mergeCells(`A${totalRowNumber}:H${totalRowNumber}`);
  const totalLabelCell = worksheet.getCell(`A${totalRowNumber}`);
  totalLabelCell.value = "TOTAL MONTO AUTORIZADO ($):";
  totalLabelCell.font = { name: "Arial", size: 10, bold: true, color: { argb: "FF0B3B60" } };
  totalLabelCell.alignment = { horizontal: "right", vertical: "middle" };
  totalLabelCell.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FFF1F5F9" },
  };

  const totalValueCell = worksheet.getCell(`I${totalRowNumber}`);
  totalValueCell.value = totalMonto;
  totalValueCell.font = { name: "Arial", size: 10.5, bold: true, color: { argb: "FF0B3B60" } };
  totalValueCell.alignment = { horizontal: "right", vertical: "middle" };
  totalValueCell.numFmt = '"$"#,##0.00;("$"#,##0.00);"-"';
  totalValueCell.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FFF1F5F9" },
  };

  const totalFirmaCell = worksheet.getCell(`J${totalRowNumber}`);
  totalFirmaCell.value = "";
  totalFirmaCell.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FFF1F5F9" },
  };

  for (let c = 1; c <= 10; c++) {
    const cell = totalRow.getCell(c);
    cell.border = {
      top: { style: "thin", color: { argb: "FF000000" } },
      bottom: { style: "double", color: { argb: "FF000000" } },
      left: { style: "thin", color: { argb: "FF000000" } },
      right: { style: "thin", color: { argb: "FF000000" } },
    };
  }

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}
