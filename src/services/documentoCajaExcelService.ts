import ExcelJS from "exceljs";

export interface TramiteParaDocumentoCaja {
  id_tramite: number;
  codigo_tramite: string;
  numero_quipux: string;
  proveedor_beneficiario: string;
  asunto?: string | null;
  monto_total: number | string | any;
  numero_hojas?: number | null;
  fojas_fisicas?: number | null;
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
 * Columnas requeridas:
 * 1. No. Cartón
 * 2. No. CUR
 * 3. No. Hojas
 * 4. Proveedor y Asunto
 * 5. Valor
 * 6. Fecha y Observaciones (VACÍO)
 * 7. Fecha envió de correos (VACÍO)
 */
export async function generarDocumentoCajaExcel(caja: CajaParaDocumento): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "SENAE - Control Previo al Pago";
  workbook.created = new Date();

  const worksheet = workbook.addWorksheet(caja.codigo_caja.substring(0, 30), {
    pageSetup: {
      orientation: "landscape",
      fitToPage: true,
      fitToWidth: 1,
      fitToHeight: 0,
      paperSize: 9, // A4
    },
  });

  const now = new Date();
  const dd = String(now.getDate()).padStart(2, "0");
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const aaaa = String(now.getFullYear());
  const fechaStr = `${dd}/${mm}/${aaaa}`;

  // 1. TÍTULO SUPERIOR CON EL NOMBRE DE LA CAJA
  worksheet.mergeCells("A1:G1");
  const titleCell = worksheet.getCell("A1");
  titleCell.value = `${caja.codigo_caja.toUpperCase()} ${
    caja.nombre ? `(${caja.nombre.toUpperCase()})` : ""
  } - CONTROL Y ENTREGA DE EXPEDIENTES`;
  titleCell.font = { name: "Arial", size: 13, bold: true, color: { argb: "FFFFFFFF" } };
  titleCell.alignment = { horizontal: "center", vertical: "middle" };
  titleCell.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FF0B3B60" }, // Azul institucional SENAE
  };
  worksheet.getRow(1).height = 36;

  // Subtítulo institucional con metadatos
  worksheet.mergeCells("A2:G2");
  const subTitleCell = worksheet.getCell("A2");
  subTitleCell.value = `SERVICIO NACIONAL DE ADUANA DEL ECUADOR - ADMINISTRACIÓN DE CAJA | FECHA DE EMISIÓN: ${fechaStr}`;
  subTitleCell.font = { name: "Arial", size: 9, bold: true, color: { argb: "FF475569" } };
  subTitleCell.alignment = { horizontal: "center", vertical: "middle" };
  subTitleCell.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FFF1F5F9" },
  };
  worksheet.getRow(2).height = 20;

  worksheet.getRow(3).height = 8; // Espacio

  // 2. ENCABEZADOS DE COLUMNAS (Fila 4)
  const headers = [
    "No. Cartón",
    "No. CUR",
    "No. Hojas",
    "Proveedor y Asunto",
    "Valor",
    "Fecha y Observaciones",
    "Fecha envió de correos",
  ];

  const headerRow = worksheet.getRow(4);
  headerRow.height = 26;

  headers.forEach((headerText, index) => {
    const colNumber = index + 1;
    const cell = headerRow.getCell(colNumber);
    cell.value = headerText;
    cell.font = { name: "Arial", size: 9, bold: true, color: { argb: "FFFFFFFF" } };
    cell.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF1E293B" }, // Slate 800 oscuro profesional
    };
    cell.border = {
      top: { style: "thin", color: { argb: "FF94A3B8" } },
      left: { style: "thin", color: { argb: "FF94A3B8" } },
      bottom: { style: "medium", color: { argb: "FF0B3B60" } },
      right: { style: "thin", color: { argb: "FF94A3B8" } },
    };
  });

  // Ancho de columnas adaptado
  worksheet.getColumn(1).width = 16; // No. Cartón
  worksheet.getColumn(2).width = 24; // No. CUR
  worksheet.getColumn(3).width = 13; // No. Hojas
  worksheet.getColumn(4).width = 46; // Proveedor y Asunto
  worksheet.getColumn(5).width = 16; // Valor
  worksheet.getColumn(6).width = 28; // Fecha y Observaciones (VACÍO)
  worksheet.getColumn(7).width = 22; // Fecha envió de correos (VACÍO)

  let currentRowIdx = 5;
  let totalHojas = 0;
  let totalValor = 0;

  // 3. FILAS DE DATOS
  caja.tramites.forEach((t, index) => {
    const row = worksheet.getRow(currentRowIdx);
    row.height = 28;

    const carton = caja.codigo_caja;

    // Concatenar CURs existentes
    const curParts = [
      t.numero_cur_devengado,
      t.numero_cur_contable,
      t.numero_cur_compromiso,
    ].filter(Boolean);
    const curDisplay = curParts.length > 0 ? curParts.join(", ") : "-";

    const hojas = t.numero_hojas || t.fojas_fisicas || 1;
    totalHojas += Number(hojas);

    const proveedorAsunto = `${t.proveedor_beneficiario || "S/P"} - ${t.asunto || ""}`.trim();
    const monto = Number(t.monto_total || 0);
    totalValor += monto;

    // 1. No. Cartón
    row.getCell(1).value = carton;
    row.getCell(1).alignment = { horizontal: "center", vertical: "middle" };
    row.getCell(1).font = { name: "Arial", size: 9, bold: true };

    // 2. No. CUR
    row.getCell(2).value = curDisplay;
    row.getCell(2).alignment = { horizontal: "center", vertical: "middle" };
    row.getCell(2).font = { name: "Arial", size: 8.5, bold: true };

    // 3. No. Hojas
    row.getCell(3).value = Number(hojas);
    row.getCell(3).alignment = { horizontal: "center", vertical: "middle" };
    row.getCell(3).font = { name: "Arial", size: 9 };

    // 4. Proveedor y Asunto
    row.getCell(4).value = proveedorAsunto;
    row.getCell(4).alignment = { horizontal: "left", vertical: "middle", wrapText: true };
    row.getCell(4).font = { name: "Arial", size: 8.5 };

    // 5. Valor
    row.getCell(5).value = monto;
    row.getCell(5).numFmt = '"$"#,##0.00';
    row.getCell(5).alignment = { horizontal: "right", vertical: "middle" };
    row.getCell(5).font = { name: "Arial", size: 9, bold: true };

    // 6. Fecha y Observaciones (VACÍO)
    row.getCell(6).value = "";
    row.getCell(6).alignment = { horizontal: "center", vertical: "middle" };

    // 7. Fecha envió de correos (VACÍO)
    row.getCell(7).value = "";
    row.getCell(7).alignment = { horizontal: "center", vertical: "middle" };

    // Bordes y zebra striping
    const isEven = index % 2 === 0;
    const bgFill = isEven ? "FFFFFFFF" : "FFF8FAFC";

    for (let c = 1; c <= 7; c++) {
      const cell = row.getCell(c);
      if (c !== 6 && c !== 7) {
        cell.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: bgFill },
        };
      }
      cell.border = {
        top: { style: "thin", color: { argb: "FFE2E8F0" } },
        left: { style: "thin", color: { argb: "FFE2E8F0" } },
        bottom: { style: "thin", color: { argb: "FFE2E8F0" } },
        right: { style: "thin", color: { argb: "FFE2E8F0" } },
      };
    }

    currentRowIdx++;
  });

  // 4. FILA DE TOTALES
  const totalsRow = worksheet.getRow(currentRowIdx);
  totalsRow.height = 24;

  totalsRow.getCell(1).value = `TOTAL: ${caja.tramites.length} EXP.`;
  totalsRow.getCell(1).alignment = { horizontal: "center", vertical: "middle" };
  totalsRow.getCell(1).font = { name: "Arial", size: 9, bold: true };

  totalsRow.getCell(2).value = "";

  totalsRow.getCell(3).value = totalHojas;
  totalsRow.getCell(3).alignment = { horizontal: "center", vertical: "middle" };
  totalsRow.getCell(3).font = { name: "Arial", size: 9, bold: true };

  totalsRow.getCell(4).value = "TOTAL GENERAL VALORES:";
  totalsRow.getCell(4).alignment = { horizontal: "right", vertical: "middle" };
  totalsRow.getCell(4).font = { name: "Arial", size: 9, bold: true };

  totalsRow.getCell(5).value = totalValor;
  totalsRow.getCell(5).numFmt = '"$"#,##0.00';
  totalsRow.getCell(5).alignment = { horizontal: "right", vertical: "middle" };
  totalsRow.getCell(5).font = { name: "Arial", size: 9, bold: true };

  totalsRow.getCell(6).value = "";
  totalsRow.getCell(7).value = "";

  for (let c = 1; c <= 7; c++) {
    const cell = totalsRow.getCell(c);
    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FFE2E8F0" },
    };
    cell.border = {
      top: { style: "medium", color: { argb: "FF0B3B60" } },
      left: { style: "thin", color: { argb: "FF94A3B8" } },
      bottom: { style: "medium", color: { argb: "FF0B3B60" } },
      right: { style: "thin", color: { argb: "FF94A3B8" } },
    };
  }

  // 5. ESPACIO DE FIRMAS AL PIE DE PÁGINA
  currentRowIdx += 3;
  const firmaRow = worksheet.getRow(currentRowIdx);
  firmaRow.height = 40;

  worksheet.mergeCells(`A${currentRowIdx}:C${currentRowIdx}`);
  const entregaCell = worksheet.getCell(`A${currentRowIdx}`);
  entregaCell.value = "_____________________________________\nENTREGADO POR (ADMINISTRACIÓN DE CAJA)";
  entregaCell.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
  entregaCell.font = { name: "Arial", size: 9, bold: true };

  worksheet.mergeCells(`E${currentRowIdx}:G${currentRowIdx}`);
  const recibeCell = worksheet.getCell(`E${currentRowIdx}`);
  recibeCell.value = "_____________________________________\nRECIBIDO POR (ARCHIVO CENTRAL)";
  recibeCell.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
  recibeCell.font = { name: "Arial", size: 9, bold: true };

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}
