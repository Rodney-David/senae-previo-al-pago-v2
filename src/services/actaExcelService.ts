import ExcelJS from "exceljs";

export interface TramiteParaActa {
  id_tramite: number;
  codigo_tramite: string;
  padre_gestion?: string | null;
  tipo_gestion?: string | null;
  area_requirente?: string | null;
  numero_quipux: string;
  fecha_memorando?: Date | string | null;
  fecha_recepcion_fisica?: Date | string | null;
  asunto?: string | null;
}

/**
 * Genera el archivo Excel oficial para el despacho por lote de Secretaría DFI a Control Previo.
 * Formato de impresión oficial con encabezado unificado y 9 columnas.
 */
export async function generarActaEntregaExcel(tramites: TramiteParaActa[]): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "SENAE - Control Previo al Pago";
  workbook.created = new Date();

  const worksheet = workbook.addWorksheet("Acta de Entrega", {
    pageSetup: { orientation: "landscape", fitToPage: true, fitToWidth: 1, fitToHeight: 0 },
  });

  const now = new Date();
  const dd = String(now.getDate()).padStart(2, "0");
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const aa = String(now.getFullYear()).slice(-2);
  const fechaStr = `${dd}-${mm}-${aa}`;

  // 1. TÍTULO UNIFICADO
  // "DOCUMENTO ENTREGADOS A CONTROL PREVIO / RECIBIDO [DD-MM-AA]"
  worksheet.mergeCells("A1:I1");
  const titleCell = worksheet.getCell("A1");
  titleCell.value = `DOCUMENTO ENTREGADOS A CONTROL PREVIO / RECIBIDO [${fechaStr}]`;
  titleCell.font = { name: "Arial", size: 13, bold: true, color: { argb: "FFFFFFFF" } };
  titleCell.alignment = { horizontal: "center", vertical: "middle" };
  titleCell.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FF0B3B60" }, // Azul institucional SENAE
  };
  worksheet.getRow(1).height = 36;

  // Subtítulo institucional
  worksheet.mergeCells("A2:I2");
  const subTitleCell = worksheet.getCell("A2");
  subTitleCell.value = "SERVICIO NACIONAL DE ADUANA DEL ECUADOR - DIRECCIÓN FINANCIERA (DFI)";
  subTitleCell.font = { name: "Arial", size: 9, bold: true, color: { argb: "FF475569" } };
  subTitleCell.alignment = { horizontal: "center", vertical: "middle" };
  subTitleCell.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FFF1F5F9" },
  };
  worksheet.getRow(2).height = 20;

  // Espaciador
  worksheet.getRow(3).height = 8;

  // 2. ENCABEZADOS DE COLUMNAS (Fila 4)
  // Columnas oficiales:
  // 1. Nro
  // 2. TIPO GESTION
  // 3. AREA
  // 4. Documento / Quipux
  // 5. FECHA MEMORANDO
  // 6. FECHA RECEPCION
  // 7. ASUNTO
  // 8. RECIBE
  // 9. FECHA RECIBIDO
  const headerRow = worksheet.getRow(4);
  headerRow.values = [
    "Nro",
    "TIPO GESTION",
    "AREA",
    "Documento / Quipux",
    "FECHA MEMORANDO",
    "FECHA RECEPCION",
    "ASUNTO",
    "RECIBE",
    "FECHA RECIBIDO",
  ];
  headerRow.height = 28;

  headerRow.eachCell((cell) => {
    cell.font = { name: "Arial", size: 9, bold: true, color: { argb: "FFFFFFFF" } };
    cell.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF1E3A8A" }, // Azul oscuro corporativo
    };
    cell.border = {
      top: { style: "thin", color: { argb: "FF0F172A" } },
      left: { style: "thin", color: { argb: "FF0F172A" } },
      bottom: { style: "medium", color: { argb: "FF0F172A" } },
      right: { style: "thin", color: { argb: "FF0F172A" } },
    };
  });

  // Configuración de anchos de columnas
  worksheet.columns = [
    { key: "nro", width: 6 },
    { key: "tipo_gestion", width: 22 },
    { key: "area", width: 26 },
    { key: "quipux", width: 26 },
    { key: "fecha_memo", width: 15 },
    { key: "fecha_recep", width: 15 },
    { key: "asunto", width: 38 },
    { key: "recibe", width: 22 },
    { key: "fecha_recibido", width: 18 },
  ];

  // 3. FILAS DE DATOS
  tramites.forEach((t, index) => {
    const rowNumber = 5 + index;
    const row = worksheet.getRow(rowNumber);

    const padre = t.padre_gestion || "PAGO";
    const hijo = t.tipo_gestion || "PAGO";
    const tipoGestionEtiqueta = `${padre} - ${hijo}`;

    const fechaMemoStr = t.fecha_memorando
      ? new Date(t.fecha_memorando).toISOString().split("T")[0]
      : "N/A";
    const fechaRecepStr = t.fecha_recepcion_fisica
      ? new Date(t.fecha_recepcion_fisica).toISOString().split("T")[0]
      : "N/A";

    row.values = [
      index + 1,
      tipoGestionEtiqueta,
      t.area_requirente || "N/A",
      t.numero_quipux,
      fechaMemoStr,
      fechaRecepStr,
      t.asunto || "Sin asunto especificado",
      "", // Blanco para firma manuscrita
      "", // Blanco para fecha manuscrita
    ];

    row.height = 36; // Altura cómoda para firmas y anotaciones manuscritas

    row.eachCell((cell, colNumber) => {
      cell.font = { name: "Arial", size: 8.5 };
      cell.border = {
        top: { style: "thin", color: { argb: "FFCBD5E1" } },
        left: { style: "thin", color: { argb: "FFCBD5E1" } },
        bottom: { style: "thin", color: { argb: "FFCBD5E1" } },
        right: { style: "thin", color: { argb: "FFCBD5E1" } },
      };

      if (colNumber === 1 || colNumber === 5 || colNumber === 6) {
        cell.alignment = { horizontal: "center", vertical: "middle" };
      } else if (colNumber === 8 || colNumber === 9) {
        // Celdas para firma
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

  // 4. PIE DE PÁGINA Y CONTROL DE ENTREGA
  const totalTramites = tramites.length;
  const startFooterRow = 5 + totalTramites + 2;

  worksheet.mergeCells(`A${startFooterRow}:I${startFooterRow}`);
  const footerCell = worksheet.getCell(`A${startFooterRow}`);
  footerCell.value = `Total de expedientes entregados en este lote: ${totalTramites}`;
  footerCell.font = { name: "Arial", size: 9, bold: true, color: { argb: "FF1E293B" } };
  footerCell.alignment = { horizontal: "left", vertical: "middle" };

  // Bloques de firma al pie
  const signatureRow = startFooterRow + 3;
  worksheet.mergeCells(`B${signatureRow}:D${signatureRow}`);
  const signEntregado = worksheet.getCell(`B${signatureRow}`);
  signEntregado.value = "_____________________________________\nENTREGADO POR: SECRETARÍA DFI";
  signEntregado.font = { name: "Arial", size: 8.5, bold: true };
  signEntregado.alignment = { horizontal: "center", vertical: "middle", wrapText: true };

  worksheet.mergeCells(`F${signatureRow}:H${signatureRow}`);
  const signRecibido = worksheet.getCell(`F${signatureRow}`);
  signRecibido.value = "_____________________________________\nRECIBIDO POR: CONTROL PREVIO (PRESUPUESTO)";
  signRecibido.font = { name: "Arial", size: 8.5, bold: true };
  signRecibido.alignment = { horizontal: "center", vertical: "middle", wrapText: true };

  worksheet.getRow(signatureRow).height = 36;

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}
