import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { TramiteParaActaDfi } from "./actaAutorizacionDfiService";

export function generarActaAutorizacionDfiPdf(tramites: TramiteParaActaDfi[]): jsPDF {
  const doc = new jsPDF({
    orientation: "landscape",
    format: "a4",
    unit: "mm",
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const marginX = 10;
  const tableWidth = pageWidth - marginX * 2; // 277mm

  const now = new Date();
  const dd = String(now.getDate()).padStart(2, "0");
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const aaaa = String(now.getFullYear());
  const fechaStr = `${dd}/${mm}/${aaaa}`;

  // 1. BANNER PRINCIPAL (Título SENAE DFI)
  doc.setFillColor(11, 59, 96); // #0B3B60
  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.2);
  doc.rect(marginX, 12, tableWidth, 9.5, "FD");

  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text("ACTA DE AUTORIZACIÓN DE PAGO - DIRECCIÓN FINANCIERA", pageWidth / 2, 18.5, {
    align: "center",
  });

  // 2. SUBTÍTULO INSTITUCIONAL
  doc.setFillColor(241, 245, 249); // #F1F5F9
  doc.rect(marginX, 21.5, tableWidth, 7.5, "FD");

  doc.setTextColor(71, 85, 105); // #475569
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.text(
    `SERVICIO NACIONAL DE ADUANA DEL ECUADOR | FECHA DE EMISIÓN: ${fechaStr}`,
    pageWidth / 2,
    26.5,
    { align: "center" }
  );

  let totalMonto = 0;
  const bodyRows = (tramites || []).map((t, index) => {
    const monto = Number(t.monto_total || 0);
    totalMonto += monto;

    const formattedMonto = `$${monto.toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;

    return [
      String(index + 1),
      t.numero_quipux || "-",
      t.proveedor_beneficiario || "-",
      t.ruc_proveedor || "-",
      t.tipos_tramite?.nombre || "-",
      t.asunto || "-",
      t.numero_cur_devengado || "-",
      t.numero_cur_contable || "-",
      formattedMonto,
      "", // Firma DFI
      "", // Recibe
      "", // Fecha recibido
    ];
  });

  const formattedTotal = `$${totalMonto.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

  const footRows: any[] = [
    [
      {
        content: "TOTAL MONTO AUTORIZADO ($):",
        colSpan: 8,
        styles: { halign: "right", fontStyle: "bold" },
      },
      {
        content: formattedTotal,
        styles: { halign: "right", fontStyle: "bold" },
      },
      { content: "", styles: { halign: "center" } },
      { content: "", styles: { halign: "center" } },
      { content: "", styles: { halign: "center" } },
    ],
  ];

  // 12 Columnas exactas - Anchos proporcionales para 277mm
  const columnStyles: { [key: number]: any } = {
    0: { cellWidth: 8.0, halign: "center", fontStyle: "bold" }, // No.
    1: { cellWidth: 28.0, halign: "center", fontStyle: "bold" }, // Documento / Quipux
    2: { cellWidth: 38.0, halign: "left" },                      // Proveedor / Beneficiario
    3: { cellWidth: 18.0, halign: "center" },                    // RUC
    4: { cellWidth: 24.0, halign: "left" },                      // Tipo de Proceso
    5: { cellWidth: 41.0, halign: "left" },                      // Asunto
    6: { cellWidth: 18.0, halign: "center" },                    // CUR Devengado
    7: { cellWidth: 18.0, halign: "center" },                    // CUR Contable
    8: { cellWidth: 26.0, halign: "right", fontStyle: "bold" },  // Monto
    9: { cellWidth: 20.0, halign: "center" },                    // Firma DFI
    10: { cellWidth: 20.0, halign: "center" },                   // Recibe
    11: { cellWidth: 18.0, halign: "center" },                   // Fecha Recibido
  };

  autoTable(doc, {
    startY: 29.0,
    margin: { left: marginX, right: marginX },
    tableWidth: tableWidth,
    head: [
      [
        "No.",
        "Documento / Quipux",
        "Proveedor / Beneficiario",
        "RUC / Cédula",
        "Tipo de Proceso",
        "Asunto / Objeto",
        "N° CUR Devengado",
        "N° CUR Contable",
        "Monto Autorizado ($)",
        "Firma DFI",
        "RECIBE",
        "FECHA RECIBIDO",
      ],
    ],
    body: bodyRows,
    foot: footRows,
    theme: "plain",
    styles: {
      font: "helvetica",
      fontSize: 7.5,
      textColor: [15, 23, 42],
      lineColor: [0, 0, 0],
      lineWidth: 0.15,
      cellPadding: 1.5,
      valign: "middle",
      overflow: "linebreak",
    },
    headStyles: {
      fillColor: [30, 58, 138], // Azul oscuro corporativo #1E3A8A
      textColor: [255, 255, 255],
      fontStyle: "bold",
      halign: "center",
      valign: "middle",
      fontSize: 7.5,
      lineColor: [0, 0, 0],
      lineWidth: 0.2,
    },
    footStyles: {
      fillColor: [241, 245, 249],
      textColor: [11, 59, 96],
      fontSize: 8,
      lineColor: [0, 0, 0],
      lineWidth: 0.2,
    },
    columnStyles: columnStyles,
  });

  return doc;
}
