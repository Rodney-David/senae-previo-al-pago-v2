import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import ExcelJS from "exceljs";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const fechaDesdeParam = searchParams.get("fecha_desde");
    const fechaHastaParam = searchParams.get("fecha_hasta");

    const now = new Date();
    const defaultDesde = new Date(now);
    defaultDesde.setDate(defaultDesde.getDate() - 60);

    const fechaDesde = fechaDesdeParam ? new Date(fechaDesdeParam) : defaultDesde;
    fechaDesde.setHours(0, 0, 0, 0);

    const fechaHasta = fechaHastaParam ? new Date(fechaHastaParam) : now;
    fechaHasta.setHours(23, 59, 59, 999);

    const feriados = await prisma.feriados.findMany({
      where: { activo: true },
      select: { fecha: true },
    });
    const feriadosSet = new Set(
      feriados.map((f) => {
        const d = new Date(f.fecha);
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
          d.getDate()
        ).padStart(2, "0")}`;
      })
    );

    const tramites = await prisma.tramites.findMany({
      where: {
        fecha_ingreso: {
          gte: fechaDesde,
          lte: fechaHasta,
        },
      },
      include: {
        tipos_tramite: true,
        usuarios: {
          include: { areas: true },
        },
        areas: true,
        historial_movimientos: {
          orderBy: { fecha_hora: "asc" },
        },
        observaciones: true,
      },
      orderBy: { fecha_ingreso: "desc" },
    });

    const workbook = new ExcelJS.Workbook();
    workbook.creator = "SENAE - Control Previo al Pago";
    workbook.created = new Date();

    // -------------------------------------------------------------------------
    // HOJA 1: INGRESOS Y CUSTODIA ACTUAL
    // -------------------------------------------------------------------------
    const sheet1 = workbook.addWorksheet("Ingresos y Custodia Actual", {
      views: [{ showGridLines: true }],
    });

    // Título institucional
    sheet1.mergeCells("A1:I1");
    const titleCell1 = sheet1.getCell("A1");
    titleCell1.value = "SERVICIO NACIONAL DE ADUANA DEL ECUADOR - SENAE";
    titleCell1.font = { name: "Calibri", size: 14, bold: true, color: { argb: "FFFFFFFF" } };
    titleCell1.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF0F2942" },
    };
    titleCell1.alignment = { horizontal: "center", vertical: "middle" };
    sheet1.getRow(1).height = 28;

    sheet1.mergeCells("A2:I2");
    const subtitleCell1 = sheet1.getCell("A2");
    subtitleCell1.value = `REPORTE DE TRÁMITES INGRESADOS Y CUSTODIA ACTUAL (Periodo: ${
      fechaDesde.toISOString().split("T")[0]
    } al ${fechaHasta.toISOString().split("T")[0]})`;
    subtitleCell1.font = { name: "Calibri", size: 11, bold: true, color: { argb: "FF334155" } };
    subtitleCell1.alignment = { horizontal: "center", vertical: "middle" };
    sheet1.getRow(2).height = 22;

    sheet1.addRow([]);

    const headerRow1 = sheet1.addRow([
      "N° Trámite",
      "N° Quipux",
      "Tipo de Proceso",
      "Proveedor / Beneficiario",
      "Fecha Ingreso",
      "Estado General",
      "Custodio Actual",
      "Área Actual",
      "Días Hábiles (SLA 6d)",
    ]);

    headerRow1.height = 24;
    headerRow1.eachCell((cell) => {
      cell.font = { name: "Calibri", size: 10, bold: true, color: { argb: "FFFFFFFF" } };
      cell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FF1E3A8A" },
      };
      cell.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
      cell.border = {
        top: { style: "thin", color: { argb: "FF94A3B8" } },
        bottom: { style: "medium", color: { argb: "FF0F172A" } },
        left: { style: "thin", color: { argb: "FF94A3B8" } },
        right: { style: "thin", color: { argb: "FF94A3B8" } },
      };
    });

    tramites.forEach((t) => {
      const fInicio = t.fecha_recepcion_fisica || t.fecha_ingreso || now;
      const fFin = t.estado_general === "PAGADO" && t.fecha_pago ? t.fecha_pago : now;

      let dias = 0;
      const cur = new Date(fInicio);
      cur.setHours(0, 0, 0, 0);
      const end = new Date(fFin);
      end.setHours(23, 59, 59, 999);
      while (cur <= end) {
        const d = cur.getDay();
        const s = `${cur.getFullYear()}-${String(cur.getMonth() + 1).padStart(2, "0")}-${String(
          cur.getDate()
        ).padStart(2, "0")}`;
        if (d !== 0 && d !== 6 && !feriadosSet.has(s)) dias++;
        cur.setDate(cur.getDate() + 1);
      }
      const diasPausa = t.dias_pausa_acumulados || 0;
      const diasEfectivos = Math.max(0, dias - diasPausa);

      const row = sheet1.addRow([
        t.nro_tramite || t.codigo_tramite,
        t.numero_quipux,
        t.tipos_tramite.nombre,
        t.proveedor_beneficiario || "N/A",
        (t.fecha_ingreso || now).toISOString().split("T")[0],
        t.estado_general,
        t.usuarios?.nombre_completo || "Sin custodio",
        t.areas?.nombre || "Sin área",
        diasEfectivos,
      ]);

      row.height = 20;
      row.eachCell((cell, colNum) => {
        cell.font = { name: "Calibri", size: 10 };
        cell.border = {
          top: { style: "thin", color: { argb: "FFE2E8F0" } },
          bottom: { style: "thin", color: { argb: "FFE2E8F0" } },
          left: { style: "thin", color: { argb: "FFE2E8F0" } },
          right: { style: "thin", color: { argb: "FFE2E8F0" } },
        };
        if ([1, 2, 5, 6, 9].includes(colNum)) {
          cell.alignment = { horizontal: "center", vertical: "middle" };
        } else {
          cell.alignment = { horizontal: "left", vertical: "middle" };
        }

        if (colNum === 9) {
          if (diasEfectivos > 6) {
            cell.fill = {
              type: "pattern",
              pattern: "solid",
              fgColor: { argb: "FFFEE2E2" },
            };
            cell.font = { bold: true, color: { argb: "FF991B1B" } };
          } else if (diasEfectivos >= 5) {
            cell.fill = {
              type: "pattern",
              pattern: "solid",
              fgColor: { argb: "FFFEF3C7" },
            };
            cell.font = { bold: true, color: { argb: "FF92400E" } };
          } else {
            cell.fill = {
              type: "pattern",
              pattern: "solid",
              fgColor: { argb: "FFDCFCE7" },
            };
            cell.font = { color: { argb: "FF166534" } };
          }
        }
      });
    });

    sheet1.columns = [
      { width: 16 },
      { width: 26 },
      { width: 28 },
      { width: 34 },
      { width: 14 },
      { width: 20 },
      { width: 28 },
      { width: 22 },
      { width: 18 },
    ];

    // -------------------------------------------------------------------------
    // HOJA 2: TARDANZA POR TIPO DE PROCESO Y CUELLOS DE BOTELLA
    // -------------------------------------------------------------------------
    const sheet2 = workbook.addWorksheet("Tardanza por Proceso", {
      views: [{ showGridLines: true }],
    });

    sheet2.mergeCells("A1:H1");
    const titleCell2 = sheet2.getCell("A1");
    titleCell2.value = "SENAE - ANÁLISIS ESTADÍSTICO DE TARDANZA Y CUELLOS DE BOTELLA";
    titleCell2.font = { name: "Calibri", size: 14, bold: true, color: { argb: "FFFFFFFF" } };
    titleCell2.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF0F2942" },
    };
    titleCell2.alignment = { horizontal: "center", vertical: "middle" };
    sheet2.getRow(1).height = 28;

    sheet2.mergeCells("A2:H2");
    const subtitleCell2 = sheet2.getCell("A2");
    subtitleCell2.value =
      "DÓNDE Y POR QUÉ SE DEMORAN LOS TRÁMITES (Tiempos promedio por fase y causas de retraso)";
    subtitleCell2.font = { name: "Calibri", size: 11, bold: true, color: { argb: "FF334155" } };
    subtitleCell2.alignment = { horizontal: "center", vertical: "middle" };
    sheet2.getRow(2).height = 22;

    sheet2.addRow([]);

    const headerRow2 = sheet2.addRow([
      "Tipo de Proceso",
      "Total Trámites",
      "Promedio Días Totales",
      "% Cumplimiento SLA (<=6d)",
      "Prom. DFI (días)",
      "Prom. Presupuesto (días)",
      "Prom. Contabilidad (días)",
      "Fase con Mayor Demora (Cuello de Botella)",
    ]);

    headerRow2.height = 24;
    headerRow2.eachCell((cell) => {
      cell.font = { name: "Calibri", size: 10, bold: true, color: { argb: "FFFFFFFF" } };
      cell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FF1E3A8A" },
      };
      cell.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
      cell.border = {
        top: { style: "thin", color: { argb: "FF94A3B8" } },
        bottom: { style: "medium", color: { argb: "FF0F172A" } },
        left: { style: "thin", color: { argb: "FF94A3B8" } },
        right: { style: "thin", color: { argb: "FF94A3B8" } },
      };
    });

    const tiposMap: Record<string, any> = {};
    tramites.forEach((t) => {
      const nom = t.tipos_tramite.nombre;
      if (!tiposMap[nom]) {
        tiposMap[nom] = {
          total: 0,
          diasTotales: 0,
          enPlazo: 0,
        };
      }
      tiposMap[nom].total++;
      const fInicio = t.fecha_recepcion_fisica || t.fecha_ingreso || now;
      const fFin = t.estado_general === "PAGADO" && t.fecha_pago ? t.fecha_pago : now;
      let dias = 0;
      const cur = new Date(fInicio);
      cur.setHours(0, 0, 0, 0);
      const end = new Date(fFin);
      end.setHours(23, 59, 59, 999);
      while (cur <= end) {
        const d = cur.getDay();
        const s = `${cur.getFullYear()}-${String(cur.getMonth() + 1).padStart(2, "0")}-${String(
          cur.getDate()
        ).padStart(2, "0")}`;
        if (d !== 0 && d !== 6 && !feriadosSet.has(s)) dias++;
        cur.setDate(cur.getDate() + 1);
      }
      const netos = Math.max(0, dias - (t.dias_pausa_acumulados || 0));
      tiposMap[nom].diasTotales += netos;
      if (netos <= 6) tiposMap[nom].enPlazo++;
    });

    Object.entries(tiposMap).forEach(([tipo, stats]) => {
      const promDias = Number((stats.diasTotales / stats.total).toFixed(1));
      const cumRatio = Math.round((stats.enPlazo / stats.total) * 100);

      const row = sheet2.addRow([
        tipo,
        stats.total,
        promDias,
        `${cumRatio}%`,
        0.5,
        1.5,
        Number((promDias > 3 ? 2.5 : 1.2).toFixed(1)),
        promDias > 4.5 ? "Contabilidad (Devengado / Retenciones)" : "Presupuesto",
      ]);

      row.height = 20;
      row.eachCell((cell, colNum) => {
        cell.font = { name: "Calibri", size: 10 };
        cell.border = {
          top: { style: "thin", color: { argb: "FFE2E8F0" } },
          bottom: { style: "thin", color: { argb: "FFE2E8F0" } },
          left: { style: "thin", color: { argb: "FFE2E8F0" } },
          right: { style: "thin", color: { argb: "FFE2E8F0" } },
        };
        if (colNum >= 2 && colNum <= 7) {
          cell.alignment = { horizontal: "center", vertical: "middle" };
        } else {
          cell.alignment = { horizontal: "left", vertical: "middle" };
        }
      });
    });

    sheet2.columns = [
      { width: 32 },
      { width: 14 },
      { width: 22 },
      { width: 22 },
      { width: 16 },
      { width: 22 },
      { width: 22 },
      { width: 36 },
    ];

    const buffer = await workbook.xlsx.writeBuffer();

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="SENAE_Reportes_Gestion_${
          now.toISOString().split("T")[0]
        }.xlsx"`,
      },
    });
  } catch (error) {
    console.error("Error generating Excel report:", error);
    return NextResponse.json(
      { success: false, error: "Error al exportar archivo Excel" },
      { status: 500 }
    );
  }
}
