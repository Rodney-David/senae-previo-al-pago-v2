import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { TramiteParaActa } from "./actaExcelService";

export function generarActaEntregaPdf(tramites: TramiteParaActa[]): jsPDF {
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

  // 1. BANNER PRINCIPAL (Título SENAE)
  doc.setFillColor(11, 59, 96); // #0B3B60
  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.2);
  doc.rect(marginX, 12, tableWidth, 9.5, "FD");

  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text("ACTA DE ENTREGA - RECEPCIÓN A CONTROL PREVIO", pageWidth / 2, 18.5, {
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

  const formatDate = (val?: Date | string | null) => {
    if (!val) return "-";
    try {
      const d = new Date(val);
      if (isNaN(d.getTime())) return String(val);
      const ddd = String(d.getDate()).padStart(2, "0");
      const mmm = String(d.getMonth() + 1).padStart(2, "0");
      const yyyy = String(d.getFullYear());
      return `${ddd}/${mmm}/${yyyy}`;
    } catch {
      return String(val);
    }
  };

  const bodyRows = (tramites || []).map((t, index) => {
    const gestion = [t.padre_gestion, t.tipo_gestion].filter(Boolean).join(" - ") || "PAGO";
    return [
      String(index + 1),
      gestion,
      t.area_requirente || "DIRECCIÓN FINANCIERA",
      t.numero_quipux || t.codigo_tramite,
      formatDate(t.fecha_memorando),
      formatDate(t.fecha_recepcion_fisica),
      t.asunto || "-",
      "", // Firma física / Recibe
      "", // Fecha recibido
    ];
  });

  const columnStyles: { [key: number]: any } = {
    0: { cellWidth: 10.0, halign: "center", fontStyle: "bold" }, // Nro
    1: { cellWidth: 26.0, halign: "left" },                       // Tipo Gestión
    2: { cellWidth: 32.0, halign: "left" },                       // Área
    3: { cellWidth: 32.0, halign: "center", fontStyle: "bold" }, // Documento / Quipux
    4: { cellWidth: 24.0, halign: "center" },                    // Fecha Memo
    5: { cellWidth: 24.0, halign: "center" },                    // Fecha Recep
    6: { cellWidth: 69.0, halign: "left" },                      // Asunto
    7: { cellWidth: 32.0, halign: "center" },                    // Recibe
    8: { cellWidth: 28.0, halign: "center" },                    // Fecha Recibido
  };

  autoTable(doc, {
    startY: 29.0,
    margin: { left: marginX, right: marginX },
    tableWidth: tableWidth,
    head: [
      [
        "Nro",
        "TIPO GESTIÓN",
        "ÁREA REQUIRENTE",
        "Documento / Quipux",
        "FECHA MEMO",
        "FECHA RECEPCIÓN",
        "ASUNTO",
        "RECIBE",
        "FECHA RECIBIDO",
      ],
    ],
    body: bodyRows,
    theme: "plain",
    styles: {
      font: "helvetica",
      fontSize: 8,
      textColor: [15, 23, 42],
      lineColor: [0, 0, 0],
      lineWidth: 0.15,
      cellPadding: 2,
      valign: "middle",
      overflow: "linebreak",
    },
    headStyles: {
      fillColor: [30, 58, 138], // #1E3A8A
      textColor: [255, 255, 255],
      fontStyle: "bold",
      halign: "center",
      valign: "middle",
      fontSize: 8,
      lineColor: [0, 0, 0],
      lineWidth: 0.2,
    },
    columnStyles: columnStyles,
  });

  return doc;
}
