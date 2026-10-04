import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import ExcelJS from "exceljs";

export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const idTramite = parseInt(params.id, 10);
    if (isNaN(idTramite)) {
      return NextResponse.json({ error: "ID inválido" }, { status: 400 });
    }

    const tramite = await prisma.tramites.findUnique({
      where: { id_tramite: idTramite },
      include: {
        tipos_tramite: true,
        areas: true,
        usuarios: true,
      },
    });

    if (!tramite) {
      return NextResponse.json({ error: "Trámite no encontrado" }, { status: 404 });
    }

    // Obtener requisitos
    let requisitos = await prisma.requisitos_checklist.findMany({
      where: {
        id_tipo_tramite: tramite.id_tipo_tramite,
        activo: true,
      },
      orderBy: { orden: "asc" },
    });

    if (requisitos.length === 0) {
      const tipoGeneral = await prisma.tipos_tramite.findFirst({
        where: { codigo: "CONTRATACION_SNCP" },
      });
      if (tipoGeneral) {
        requisitos = await prisma.requisitos_checklist.findMany({
          where: {
            id_tipo_tramite: tipoGeneral.id_tipo_tramite,
            activo: true,
          },
          orderBy: { orden: "asc" },
        });
      }
    }

    // Obtener respuestas
    const respuestas = await prisma.respuestas_checklist.findMany({
      where: { id_tramite: idTramite },
      include: {
        usuarios: true,
      },
    });

    const respuestasMap = new Map();
    for (const r of respuestas) {
      respuestasMap.set(r.id_requisito, r);
    }

    // Crear libro de Excel
    const workbook = new ExcelJS.Workbook();
    workbook.creator = "SENAE - Dirección Financiera";
    workbook.created = new Date();

    const sheet = workbook.addWorksheet("Checklist Control Previo", {
      views: [{ showGridLines: true }],
    });

    // Ancho de columnas
    sheet.columns = [
      { width: 6 },  // A: #
      { width: 62 }, // B: Requisito
      { width: 16 }, // C: Estado
      { width: 36 }, // D: Observaciones
      { width: 26 }, // E: Evaluador
      { width: 16 }, // F: Fecha
    ];

    // Encabezado institucional
    sheet.mergeCells("A1:F1");
    const titleCell1 = sheet.getCell("A1");
    titleCell1.value = "SERVICIO NACIONAL DE ADUANA DEL ECUADOR - SENAE";
    titleCell1.font = { name: "Arial", size: 13, bold: true, color: { argb: "FFFFFFFF" } };
    titleCell1.alignment = { horizontal: "center", vertical: "middle" };
    titleCell1.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF0F172A" } }; // Slate 900
    sheet.getRow(1).height = 28;

    sheet.mergeCells("A2:F2");
    const titleCell2 = sheet.getCell("A2");
    titleCell2.value = "DIRECCIÓN FINANCIERA - CONTROL PREVIO AL PAGO";
    titleCell2.font = { name: "Arial", size: 10, bold: true, color: { argb: "FF3B82F6" } }; // Blue 500
    titleCell2.alignment = { horizontal: "center", vertical: "middle" };
    titleCell2.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1E293B" } }; // Slate 800
    sheet.getRow(2).height = 20;

    sheet.mergeCells("A3:F3");
    const titleCell3 = sheet.getCell("A3");
    titleCell3.value = `HOJA DE VERIFICACIÓN: ${tramite.tipos_tramite?.nombre?.toUpperCase() || "PROCESO DE PAGO"}`;
    titleCell3.font = { name: "Arial", size: 9, bold: true, color: { argb: "FF0F172A" } };
    titleCell3.alignment = { horizontal: "center", vertical: "middle" };
    titleCell3.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFE2E8F0" } }; // Slate 200
    sheet.getRow(3).height = 22;

    // Fila en blanco
    sheet.getRow(4).height = 8;

    // Metadatos del trámite
    const addMetaRow = (rowNum: number, label1: string, val1: any, label2: string, val2: any) => {
      sheet.getCell(`A${rowNum}`).value = label1;
      sheet.getCell(`A${rowNum}`).font = { name: "Arial", size: 9, bold: true, color: { argb: "FF334155" } };
      sheet.getCell(`B${rowNum}`).value = val1;
      sheet.getCell(`B${rowNum}`).font = { name: "Arial", size: 9, color: { argb: "FF0F172A" } };

      sheet.getCell(`C${rowNum}`).value = label2;
      sheet.getCell(`C${rowNum}`).font = { name: "Arial", size: 9, bold: true, color: { argb: "FF334155" } };
      sheet.mergeCells(`D${rowNum}:F${rowNum}`);
      sheet.getCell(`D${rowNum}`).value = val2;
      sheet.getCell(`D${rowNum}`).font = { name: "Arial", size: 9, color: { argb: "FF0F172A" } };

      sheet.getRow(rowNum).height = 20;
    };

    addMetaRow(5, "NRO. QUIPUX:", tramite.numero_quipux, "CÓDIGO SISTEMA:", tramite.codigo_tramite);
    addMetaRow(6, "BENEFICIARIO:", tramite.proveedor_beneficiario, "RUC:", tramite.ruc_proveedor || "NO APLICA");
    addMetaRow(
      7,
      "MONTO TOTAL:",
      `$ ${Number(tramite.monto_total || 0).toLocaleString("es-EC", { minimumFractionDigits: 2 })}`,
      "ÁREA ACTUAL:",
      `${tramite.areas?.nombre || "DFI"} (${tramite.usuarios?.nombre_completo || "Asignado"})`
    );
    addMetaRow(
      8,
      "FECHA MEMO:",
      tramite.fecha_memorando ? new Date(tramite.fecha_memorando).toISOString().split("T")[0] : "S/F",
      "ESTADO DEL FLUJO:",
      `${tramite.estado_general} - ${tramite.sub_estado || ""}`
    );

    // Fila en blanco
    sheet.getRow(9).height = 10;

    // Cabecera de la tabla de requisitos
    const tableHeaderRow = 10;
    sheet.getRow(tableHeaderRow).values = [
      "#",
      "REQUISITO NORMATIVO (MANUAL SENAE-ME-3-6-001)",
      "ESTADO",
      "OBSERVACIONES / DETALLE",
      "EVALUADOR",
      "FECHA",
    ];
    sheet.getRow(tableHeaderRow).height = 24;

    ["A", "B", "C", "D", "E", "F"].forEach((col) => {
      const cell = sheet.getCell(`${col}${tableHeaderRow}`);
      cell.font = { name: "Arial", size: 9, bold: true, color: { argb: "FFFFFFFF" } };
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1E3A8A" } }; // Navy blue
      cell.alignment = { horizontal: col === "B" ? "left" : "center", vertical: "middle" };
      cell.border = {
        top: { style: "thin", color: { argb: "FFCBD5E1" } },
        bottom: { style: "thin", color: { argb: "FFCBD5E1" } },
      };
    });

    let currentRow = 11;
    let cumplidos = 0;
    let noCumplidos = 0;
    let noAplica = 0;

    requisitos.forEach((req, idx) => {
      const resp = respuestasMap.get(req.id_requisito);
      const estado = resp ? resp.estado_cumplimiento : "PENDIENTE";
      const obs = resp?.observacion_especifica || "";
      const evalName = resp?.usuarios?.nombre_completo || "";
      const fechaEval = resp?.fecha_evaluacion
        ? new Date(resp.fecha_evaluacion).toISOString().split("T")[0]
        : "";

      if (estado === "CUMPLE") cumplidos++;
      else if (estado === "NO_CUMPLE") noCumplidos++;
      else if (estado === "NO_APLICA") noAplica++;

      const r = sheet.getRow(currentRow);
      r.values = [idx + 1, req.descripcion, estado, obs, evalName, fechaEval];
      r.height = Math.max(22, Math.ceil(req.descripcion.length / 55) * 16);

      // Estilos de celdas
      r.getCell(1).alignment = { horizontal: "center", vertical: "middle" };
      r.getCell(2).alignment = { horizontal: "left", vertical: "middle", wrapText: true };
      r.getCell(3).alignment = { horizontal: "center", vertical: "middle" };
      r.getCell(4).alignment = { horizontal: "left", vertical: "middle", wrapText: true };
      r.getCell(5).alignment = { horizontal: "center", vertical: "middle" };
      r.getCell(6).alignment = { horizontal: "center", vertical: "middle" };

      // Colores de estado
      const estadoCell = r.getCell(3);
      estadoCell.font = { name: "Arial", size: 9, bold: true };
      if (estado === "CUMPLE") {
        estadoCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFD1FAE5" } }; // Emerald 100
        estadoCell.font = { name: "Arial", size: 9, bold: true, color: { argb: "FF065F46" } };
      } else if (estado === "NO_CUMPLE") {
        estadoCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFEE2E2" } }; // Rose 100
        estadoCell.font = { name: "Arial", size: 9, bold: true, color: { argb: "FF991B1B" } };
      } else if (estado === "NO_APLICA") {
        estadoCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF1F5F9" } }; // Slate 100
        estadoCell.font = { name: "Arial", size: 9, bold: true, color: { argb: "FF475569" } };
      } else {
        estadoCell.font = { name: "Arial", size: 9, italic: true, color: { argb: "FF94A3B8" } };
      }

      // Bordes
      for (let c = 1; c <= 6; c++) {
        r.getCell(c).border = {
          top: { style: "thin", color: { argb: "FFE2E8F0" } },
          bottom: { style: "thin", color: { argb: "FFE2E8F0" } },
          left: { style: "thin", color: { argb: "FFE2E8F0" } },
          right: { style: "thin", color: { argb: "FFE2E8F0" } },
        };
      }

      currentRow++;
    });

    // Fila de resumen estadístico
    sheet.getRow(currentRow).height = 10;
    currentRow++;

    sheet.mergeCells(`A${currentRow}:B${currentRow}`);
    const summaryCell = sheet.getCell(`A${currentRow}`);
    const totalReq = requisitos.length;
    const porcentaje = totalReq > 0 ? Math.round((cumplidos / totalReq) * 100) : 0;
    summaryCell.value = `RESUMEN DE VERIFICACIÓN: Total: ${totalReq} | Cumple: ${cumplidos} | No Cumple: ${noCumplidos} | No Aplica: ${noAplica} (${porcentaje}% Conformidad)`;
    summaryCell.font = { name: "Arial", size: 9, bold: true, color: { argb: "FF0F172A" } };
    summaryCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFE2E8F0" } };
    sheet.getRow(currentRow).height = 22;

    // Bloque de firmas
    currentRow += 3;
    sheet.mergeCells(`A${currentRow}:B${currentRow}`);
    sheet.getCell(`A${currentRow}`).value = "_________________________________________";
    sheet.getCell(`A${currentRow}`).alignment = { horizontal: "center" };

    sheet.mergeCells(`D${currentRow}:F${currentRow}`);
    sheet.getCell(`D${currentRow}`).value = "_________________________________________";
    sheet.getCell(`D${currentRow}`).alignment = { horizontal: "center" };

    currentRow++;
    sheet.mergeCells(`A${currentRow}:B${currentRow}`);
    sheet.getCell(`A${currentRow}`).value = "ANALISTA RESPONSABLE CONTROL PREVIO\nDirección Financiera Aduanera";
    sheet.getCell(`A${currentRow}`).font = { name: "Arial", size: 8, bold: true };
    sheet.getCell(`A${currentRow}`).alignment = { horizontal: "center", wrapText: true };

    sheet.mergeCells(`D${currentRow}:F${currentRow}`);
    sheet.getCell(`D${currentRow}`).value = "JEFE DE ÁREA / CONTADOR GENERAL\nRevisión y Aprobación de Conformidad";
    sheet.getCell(`D${currentRow}`).font = { name: "Arial", size: 8, bold: true };
    sheet.getCell(`D${currentRow}`).alignment = { horizontal: "center", wrapText: true };

    // Generar buffer binario
    const buffer = await workbook.xlsx.writeBuffer();
    const cleanQuipux = (tramite.numero_quipux || "TRAMITE").replace(/[/\\?%*:|"<>]/g, "_");
    const filename = `CHECKLIST_${cleanQuipux}.xlsx`;

    return new Response(buffer, {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (error: any) {
    console.error("Error al exportar checklist en Excel:", error);
    return NextResponse.json(
      { error: error?.message || "Error al generar archivo Excel del checklist" },
      { status: 500 }
    );
  }
}
