import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { CajaParaDocumento, TramiteParaDocumentoCaja } from "./documentoCajaExcelService";

/**
 * Genera el documento oficial PDF para el control físico de la CAJA antes de enviarla al Archivo Central.
 * Sigue fielmente la estructura de 7 columnas requerida:
 * - Orientación: Horizontal (Landscape) A4
 * - 7 Columnas exactas:
 *   1. NO (Secuencial 1, 2, 3...)
 *   2. CARTON (Predeterminado 1)
 *   3. NUMERO DE QUIPUX
 *   4. NRO CUR
 *   5. PROVEEDOR
 *   6. MONTO
 *   7. OBSERVACION (Vacía para anotación física)
 * - Colores: Azul marino institucional #244062, Subtítulo #F1F5F9 con texto #475569, Totales #E2E8F0
 * - Tipografía: Helvetica
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

  // 3. DATOS DE LA TABLA (7 Columnas exactas)
  let totalValor = 0;
  const bodyRows = (caja.tramites || []).map((t, index) => {
    const curParts = [
      t.numero_cur_devengado,
      t.numero_cur_contable,
      t.numero_cur_compromiso,
    ].filter(Boolean);
    const curDisplay = curParts.length > 0 ? curParts.join(", ") : "-";

    const carton = (t as any).carton ? String((t as any).carton) : "1";
    const monto = Number(t.monto_total || 0);
    totalValor += monto;

    const formattedMonto = `$${monto.toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;

    return [
      String(index + 1),               // Col 1: NO (Secuencial)
      carton,                          // Col 2: CARTON (Predeterminado 1)
      t.numero_quipux || "-",          // Col 3: NUMERO DE QUIPUX
      curDisplay,                      // Col 4: NRO CUR
      t.proveedor_beneficiario || "-", // Col 5: PROVEEDOR
      formattedMonto,                  // Col 6: MONTO
      "",                              // Col 7: OBSERVACION
    ];
  });

  const formattedTotal = `$${totalValor.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

  const footRows: any[] = [
    [
      {
        content: "TOTAL CAJA:",
        colSpan: 5,
        styles: { halign: "right", fontStyle: "bold" },
      },
      {
        content: formattedTotal,
        styles: { halign: "right", fontStyle: "bold" },
      },
      {
        content: "",
        styles: { halign: "center" },
      },
    ],
  ];

  // Proporciones exactas de las 7 columnas para A4 horizontal (269mm total)
  const columnStyles: { [key: number]: any } = {
    0: { cellWidth: 14.0, halign: "center", fontStyle: "bold" }, // NO
    1: { cellWidth: 16.0, halign: "center", fontStyle: "bold" }, // CARTON
    2: { cellWidth: 46.0, halign: "center" },                     // NUMERO DE QUIPUX
    3: { cellWidth: 30.0, halign: "center", fontStyle: "bold" }, // NRO CUR
    4: { cellWidth: 88.0, halign: "left" },                       // PROVEEDOR
    5: { cellWidth: 35.0, halign: "right", fontStyle: "bold" },  // MONTO
    6: { cellWidth: 40.0, halign: "center" },                     // OBSERVACION
  };

  autoTable(doc, {
    startY: 32.5,
    margin: { left: marginX, right: marginX },
    tableWidth: tableWidth,
    head: [
      [
        "NO",
        "CARTON",
        "NUMERO DE QUIPUX",
        "NRO CUR",
        "PROVEEDOR",
        "MONTO",
        "OBSERVACION",
      ],
    ],
    body: bodyRows,
    foot: footRows,
    theme: "plain",
    headStyles: {
      fillColor: [36, 64, 98],
      textColor: [255, 255, 255],
      fontStyle: "bold",
      fontSize: 9,
      halign: "center",
      valign: "middle",
      minCellHeight: 9,
      lineColor: [0, 0, 0],
      lineWidth: 0.2,
    },
    bodyStyles: {
      fontSize: 8.5,
      textColor: [15, 23, 42],
      valign: "middle",
      lineColor: [0, 0, 0],
      lineWidth: 0.2,
      cellPadding: { top: 3.0, bottom: 3.0, left: 3.0, right: 3.0 },
    },
    columnStyles,
    footStyles: {
      fillColor: [226, 232, 240], // #E2E8F0
      textColor: [15, 23, 42],
      fontStyle: "bold",
      fontSize: 9,
      valign: "middle",
      lineColor: [0, 0, 0],
      lineWidth: 0.2,
      minCellHeight: 8,
    },
  });

  return doc;
}
