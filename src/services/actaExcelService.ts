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
  const yyyy = String(now.getFullYear());
  const fechaEmisionStr = `${dd}/${mm}/${yyyy}`;

  // Configuración de página exacta de la plantilla
  worksheet.pageSetup = {
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
  };

  // 1. TÍTULO UNIFICADO (Fila 1 - Altura 28.8pt)
  worksheet.mergeCells("A1:I1");
  const titleCell = worksheet.getCell("A1");
  titleCell.value = "DOCUMENTO ENTREGADOS A CONTROL PREVIO";
  titleCell.font = { name: "Arial", size: 13, bold: true, color: { argb: "FFFFFFFF" } };
  titleCell.alignment = { horizontal: "center", vertical: "middle" };
  titleCell.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FF0B3B60" }, // Azul institucional SENAE
  };
  worksheet.getRow(1).height = 28.8;

  // 2. SUBTÍTULO CON FECHA DE EMISIÓN (Fila 2 - Altura 16.05pt)
  worksheet.mergeCells("A2:I2");
  const subTitleCell = worksheet.getCell("A2");
  subTitleCell.value = `SERVICIO NACIONAL DE ADUANA DEL ECUADOR | FECHA DE EMISION: ${fechaEmisionStr}`;
  subTitleCell.font = { name: "Arial", size: 9, bold: true, color: { argb: "FF475569" } };
  subTitleCell.alignment = { horizontal: "center", vertical: "middle" };
  subTitleCell.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FFF1F5F9" },
  };
  worksheet.getRow(2).height = 16.05;

  // 3. ENCABEZADOS DE COLUMNAS (Fila 3 - Altura 40.05pt)
  const headerRow = worksheet.getRow(3);
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
      fgColor: { argb: "FF1E3A8A" }, // Azul oscuro corporativo
    };
    cell.border = thinBorder;
  });

  // Configuración de anchos de columnas exacta de la plantilla
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

  // 4. FILAS DE DATOS (A partir de la Fila 4 - Altura 40.05pt)
  tramites.forEach((t, index) => {
    const rowNumber = 4 + index;
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
      "", // Blanco para firma manuscrita / recepción
      "", // Blanco para fecha manuscrita / recepción
    ];

    row.height = 40.05; // Altura exacta plantilla para espaciado holgado y cómodo

    row.eachCell((cell, colNumber) => {
      cell.font = { name: "Arial", size: 10 };
      cell.border = thinBorder;

      if (colNumber === 1 || colNumber === 5 || colNumber === 6) {
        cell.alignment = { horizontal: "center", vertical: "middle" };
      } else if (colNumber === 8 || colNumber === 9) {
        // Celdas para firma y fecha de recepción
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

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}
