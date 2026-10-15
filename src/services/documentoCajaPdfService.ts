import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { CajaParaDocumento, TramiteParaDocumentoCaja } from "./documentoCajaExcelService";

/**
 * Genera el documento oficial PDF para el control físico de la CAJA antes de enviarla al archivo.
 * Sigue 1:1 las especificaciones de la nueva PLANTILLA DOC EXCEL CAJA:
 * - Orientación: Horizontal (Landscape) A4
 * - 8 Columnas exactas:
 *   1. No. (Secuencial 1, 2, 3...)
 *   2. Cartón (Siempre 1)
 *   3. CUR
 *   4. Hojas
 *   5. Proveedor y Asunto
 *   6. Valor
 *   7. Fecha y Observaciones
 *   8. Fecha envío de correos
 * - Colores: Azul marino institucional #244062, Subtítulo #F1F5F9 con texto #475569, Totales #E2E8F0
 * - Tipografía: Arial / Helvetica
 * - Espaciado razonable en celdas para legibilidad ejecutiva
 */
export function generarDocumentoCajaPdf(caja: CajaParaDocumento): jsPDF {
  const doc = new jsPDF({
    orientation: "landscape",
    format: "a4",
    unit: "mm",
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const marginX = 14;
  const tableWidth = pageWidth - marginX * 2; // 269mm

  const nombreCaja = (caja.nombre || caja.codigo_caja || "CAJA").trim();

  const now = new Date();
  const dd = String(now.getDate()).padStart(2, "0");
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const aaaa = String(now.getFullYear());
  const fechaStr = `${dd}/${mm}/${aaaa}`;

  // 1. BANNER PRINCIPAL (Fila 1: Nombre de la Caja)
  doc.setFillColor(36, 64, 98); // #244062
  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.2);
  doc.rect(marginX, 14, tableWidth, 10, "FD");

  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.text(nombreCaja.toUpperCase(), pageWidth / 2, 20.5, { align: "center" });

  // 2. SUBTÍTULO INSTITUCIONAL (Fila 2: SENAE DAF)
  doc.setFillColor(241, 245, 249); // #F1F5F9
  doc.rect(marginX, 24, tableWidth, 8.5, "FD");

  doc.setTextColor(71, 85, 105); // #475569
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.text(
    `SERVICIO NACIONAL DE ADUANA DEL ECUADOR - ADMINISTRACIÓN DE CAJA | FECHA DE EMISIÓN: ${fechaStr}`,
    pageWidth / 2,
    29.5,
    { align: "center" }
  );

  // 3. DATOS DE LA TABLA (8 Columnas)
  let totalValor = 0;
  const bodyRows = (caja.tramites || []).map((t, index) => {
    const curParts = [
      t.numero_cur_devengado,
      t.numero_cur_contable,
      t.numero_cur_compromiso,
    ].filter(Boolean);
    const curDisplay = curParts.length > 0 ? curParts.join(", ") : "-";

    const hojas = t.numero_hojas !== null && t.numero_hojas !== undefined ? t.numero_hojas : "-";
    const monto = Number(t.monto_total || 0);
    totalValor += monto;

    const proveedorAsunto = `${t.proveedor_beneficiario || "S/P"}${
      t.asunto ? ` - ${t.asunto}` : ""
    }`.trim();

    const formattedMonto = `$${monto.toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;

    return [
      String(index + 1), // Col 1: No. (Secuencial)
      "1", // Col 2: Cartón (Siempre 1)
      curDisplay, // Col 3: CUR
      String(hojas), // Col 4: Hojas
      proveedorAsunto, // Col 5: Proveedor y Asunto
      formattedMonto, // Col 6: Valor
      "", // Col 7: Fecha y Observaciones
      "", // Col 8: Fecha envío de correos
    ];
  });

  const formattedTotal = `$${totalValor.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

  const footRows = [
    ["", "", "", "", "TOTAL GENERAL VALORES:", formattedTotal, "", ""],
  ];

  // Proporciones exactas de las 8 columnas para A4 horizontal (269mm total)
  const columnStyles: { [key: number]: any } = {
    0: { cellWidth: 15.0, halign: "center", fontStyle: "bold" }, // No.
    1: { cellWidth: 18.0, halign: "center", fontStyle: "bold" }, // Cartón
    2: { cellWidth: 20.0, halign: "center", fontStyle: "bold" }, // CUR
    3: { cellWidth: 18.0, halign: "center" }, // Hojas
    4: { cellWidth: 86.0, halign: "left" }, // Proveedor y Asunto
    5: { cellWidth: 36.0, halign: "right", fontStyle: "bold" }, // Valor
    6: { cellWidth: 38.0, halign: "center" }, // Fecha y Observaciones
    7: { cellWidth: 38.0, halign: "center" }, // Fecha envío de correos
  };

  autoTable(doc, {
    startY: 32.5,
    margin: { left: marginX, right: marginX },
    tableWidth: tableWidth,
    head: [
      [
        "No.",
        "Cartón",
        "CUR",
        "Hojas",
        "Proveedor y Asunto",
        "Valor",
        "Fecha y Observaciones",
        "Fecha envío de correos",
      ],
    ],
    body: bodyRows,
    foot: footRows,
    theme: "plain",
    headStyles: {
      fillColor: [36, 64, 98],
      textColor: [255, 255, 255],
      fontStyle: "bold",
      fontSize: 9.5,
      halign: "center",
      valign: "middle",
      minCellHeight: 9,
      lineColor: [0, 0, 0],
      lineWidth: 0.2,
    },
    bodyStyles: {
      fontSize: 9,
      textColor: [15, 23, 42],
      valign: "middle",
      lineColor: [0, 0, 0],
      lineWidth: 0.2,
      cellPadding: { top: 3.5, bottom: 3.5, left: 3.5, right: 3.5 },
    },
    columnStyles,
    footStyles: {
      fillColor: [226, 232, 240], // #E2E8F0
      textColor: [15, 23, 42],
      fontStyle: "bold",
      fontSize: 9.5,
      valign: "middle",
      lineColor: [0, 0, 0],
      lineWidth: 0.2,
      minCellHeight: 8,
    },
  });

  return doc;
}
