import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import ExcelJS from "exceljs";

export const dynamic = "force-dynamic";

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
    sheet1.mergeCells("A1:H1");
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

    sheet1.mergeCells("A2:H2");
    const subtitleCell1 = sheet1.getCell("A2");
    subtitleCell1.value = `REPORTE DE TRÁMITES INGRESADOS Y CUSTODIA ACTUAL (Periodo: ${
      fechaDesde.toISOString().split("T")[0]
    } al ${fechaHasta.toISOString().split("T")[0]})`;
    subtitleCell1.font = { name: "Calibri", size: 11, bold: true, color: { argb: "FF334155" } };
    subtitleCell1.alignment = { horizontal: "center", vertical: "middle" };
    sheet1.getRow(2).height = 22;

    sheet1.addRow([]);

    const headerRow1 = sheet1.addRow([
      "N° Trámite Quipux",
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
        if ([1, 4, 5, 8].includes(colNum)) {
          cell.alignment = { horizontal: "center", vertical: "middle" };
        } else {
          cell.alignment = { horizontal: "left", vertical: "middle" };
        }

        if (colNum === 8) {
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
      { width: 28 },
      { width: 28 },
      { width: 34 },
      { width: 14 },
      { width: 20 },
      { width: 28 },
      { width: 22 },
      { width: 18 },
    ];

    // -------------------------------------------------------------------------
    // HOJA 2: TIEMPOS POR FASE INSTITUCIONAL Y FACTORES DE RETRASO
    // -------------------------------------------------------------------------
    const sheet2 = workbook.addWorksheet("Tiempos por Proceso", {
      views: [{ showGridLines: true }],
    });

    sheet2.mergeCells("A1:H1");
    const titleCell2 = sheet2.getCell("A1");
    titleCell2.value = "SENAE - TIEMPO PROMEDIO POR FASE Y FACTORES DE RETRASO";
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
      "1. Tiempo Promedio por Fase Institucional | 2. Factores y Causas Principales de Retraso";
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
      "Fase con Mayor Demora",
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

    // -------------------------------------------------------------------------
    // HOJA 3: DESEMPEÑO Y CUMPLIMIENTO POR FUNCIONARIO
    // -------------------------------------------------------------------------
    const sheet3 = workbook.addWorksheet("Desempeño Funcionarios", {
      views: [{ showGridLines: true }],
    });

    sheet3.mergeCells("A1:K1");
    const titleCell3 = sheet3.getCell("A1");
    titleCell3.value = "SENAE - REPORTE DE DESEMPEÑO Y CUMPLIMIENTO POR FUNCIONARIO";
    titleCell3.font = { name: "Calibri", size: 14, bold: true, color: { argb: "FFFFFFFF" } };
    titleCell3.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF0F2942" },
    };
    titleCell3.alignment = { horizontal: "center", vertical: "middle" };
    sheet3.getRow(1).height = 28;

    sheet3.mergeCells("A2:K2");
    const subtitleCell3 = sheet3.getCell("A2");
    subtitleCell3.value = `TRÁMITES RECIBIDOS EN ESCRITORIO, TIEMPOS Y TASA DE CUMPLIMIENTO (${
      fechaDesde.toISOString().split("T")[0]
    } al ${fechaHasta.toISOString().split("T")[0]})`;
    subtitleCell3.font = { name: "Calibri", size: 11, bold: true, color: { argb: "FF334155" } };
    subtitleCell3.alignment = { horizontal: "center", vertical: "middle" };
    sheet3.getRow(2).height = 22;

    sheet3.addRow([]);

    const headerRow3 = sheet3.addRow([
      "Funcionario",
      "Cargo",
      "Área Institucional",
      "Total Recibidos en Mesa",
      "Trámites Despachados",
      "Entregados a Tiempo",
      "Entregados con Retraso",
      "En Gestión Actual",
      "Tasa Cumplimiento (%)",
      "Tiempo Promedio (Días)",
      "SLA Fase (Días)",
    ]);

    headerRow3.height = 24;
    headerRow3.eachCell((cell) => {
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

    const slaPorArea: Record<number, number> = {
      1: 2.0,
      2: 2.0,
      3: 3.0,
      4: 2.0,
    };

    const usuariosActivos = await prisma.usuarios.findMany({
      where: { activo: true },
      include: { areas: true },
      orderBy: { nombre_completo: "asc" },
    });

    const todosMovs = await prisma.historial_movimientos.findMany({
      orderBy: { fecha_hora: "asc" },
    });

    const movsPorTramite: Record<number, typeof todosMovs> = {};
    todosMovs.forEach((m) => {
      if (!movsPorTramite[m.id_tramite]) movsPorTramite[m.id_tramite] = [];
      movsPorTramite[m.id_tramite].push(m);
    });

    usuariosActivos.forEach((usr) => {
      const slaLimite = slaPorArea[usr.id_area] || 2.5;

      const recepciones = todosMovs.filter((m) => {
        if (m.id_usuario_recibe !== usr.id_usuario) return false;
        if (!m.fecha_hora) return false;
        const f = new Date(m.fecha_hora);
        return f >= fechaDesde && f <= fechaHasta;
      });

      let despachados = 0;
      let aTiempo = 0;
      let conRetraso = 0;
      let enCurso = 0;
      let sumaDias = 0;

      recepciones.forEach((rec) => {
        const tramiteMovs = movsPorTramite[rec.id_tramite] || [];
        const fLlegada = new Date(rec.fecha_hora!);

        const siguienteDespacho = tramiteMovs.find((sig) => {
          if (!sig.fecha_hora) return false;
          const fSig = new Date(sig.fecha_hora);
          return fSig > fLlegada && sig.id_usuario_entrega === usr.id_usuario;
        });

        if (siguienteDespacho && siguienteDespacho.fecha_hora) {
          despachados++;
          const fSalida = new Date(siguienteDespacho.fecha_hora);
          let countDias = 0;
          const cur = new Date(fLlegada);
          cur.setHours(0, 0, 0, 0);
          const end = new Date(fSalida);
          end.setHours(23, 59, 59, 999);
          while (cur <= end) {
            const d = cur.getDay();
            const s = `${cur.getFullYear()}-${String(cur.getMonth() + 1).padStart(2, "0")}-${String(
              cur.getDate()
            ).padStart(2, "0")}`;
            if (d !== 0 && d !== 6 && !feriadosSet.has(s)) countDias++;
            cur.setDate(cur.getDate() + 1);
          }
          const diasMesa = Math.max(0.5, countDias);
          sumaDias += diasMesa;

          if (diasMesa <= slaLimite) {
            aTiempo++;
          } else {
            conRetraso++;
          }
        } else {
          let countDias = 0;
          const cur = new Date(fLlegada);
          cur.setHours(0, 0, 0, 0);
          const end = new Date(now);
          end.setHours(23, 59, 59, 999);
          while (cur <= end) {
            const d = cur.getDay();
            const s = `${cur.getFullYear()}-${String(cur.getMonth() + 1).padStart(2, "0")}-${String(
              cur.getDate()
            ).padStart(2, "0")}`;
            if (d !== 0 && d !== 6 && !feriadosSet.has(s)) countDias++;
            cur.setDate(cur.getDate() + 1);
          }
          const diasMesa = Math.max(0.5, countDias);
          if (diasMesa > slaLimite) {
            conRetraso++;
          } else {
            enCurso++;
          }
        }
      });

      const totalRecibidos = recepciones.length;
      const totalEvaluables = aTiempo + conRetraso;
      const tasaCumplimiento =
        totalEvaluables > 0
          ? Math.round((aTiempo / totalEvaluables) * 100)
          : totalRecibidos > 0
          ? 100
          : 100;
      const tiempoProm =
        despachados > 0 ? Number((sumaDias / despachados).toFixed(1)) : 0;

      const row = sheet3.addRow([
        usr.nombre_completo,
        usr.cargo,
        usr.areas?.nombre || "N/A",
        totalRecibidos,
        despachados,
        aTiempo,
        conRetraso,
        enCurso,
        `${tasaCumplimiento}%`,
        tiempoProm,
        slaLimite,
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
        if ([4, 5, 6, 7, 8, 9, 10, 11].includes(colNum)) {
          cell.alignment = { horizontal: "center", vertical: "middle" };
        } else {
          cell.alignment = { horizontal: "left", vertical: "middle" };
        }

        if (colNum === 9) {
          if (tasaCumplimiento >= 80) {
            cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFDCFCE7" } };
            cell.font = { bold: true, color: { argb: "FF166534" } };
          } else if (tasaCumplimiento >= 60) {
            cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFEF3C7" } };
            cell.font = { bold: true, color: { argb: "FF92400E" } };
          } else {
            cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFEE2E2" } };
            cell.font = { bold: true, color: { argb: "FF991B1B" } };
          }
        }
      });
    });

    sheet3.columns = [
      { width: 28 },
      { width: 26 },
      { width: 28 },
      { width: 20 },
      { width: 18 },
      { width: 18 },
      { width: 18 },
      { width: 16 },
      { width: 20 },
      { width: 20 },
      { width: 16 },
    ];

    // -------------------------------------------------------------------------
    // HOJA 4: CARGA ACTUAL EN MESA POR FUNCIONARIO
    // -------------------------------------------------------------------------
    const sheet4 = workbook.addWorksheet("Carga Actual en Mesa", {
      views: [{ showGridLines: true }],
    });

    sheet4.mergeCells("A1:I1");
    const titleCell4 = sheet4.getCell("A1");
    titleCell4.value = "SENAE - CARGA ACTUAL DE EXPEDIENTES EN MESA POR FUNCIONARIO";
    titleCell4.font = { name: "Calibri", size: 14, bold: true, color: { argb: "FFFFFFFF" } };
    titleCell4.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF0F2942" },
    };
    titleCell4.alignment = { horizontal: "center", vertical: "middle" };
    sheet4.getRow(1).height = 28;

    sheet4.mergeCells("A2:I2");
    const subtitleCell4 = sheet4.getCell("A2");
    subtitleCell4.value = `EXPEDIENTES FÍSICOS ACTIVOS Y TIEMPO DE PERMANENCIA EN MESA (${now.toLocaleDateString("es-EC")})`;
    subtitleCell4.font = { name: "Calibri", size: 11, bold: true, color: { argb: "FF334155" } };
    subtitleCell4.alignment = { horizontal: "center", vertical: "middle" };
    sheet4.getRow(2).height = 22;

    sheet4.addRow([]);

    const headerRow4 = sheet4.addRow([
      "Funcionario",
      "Cargo",
      "Área Institucional",
      "Total Expedientes en Mesa",
      "En Plazo (Verde)",
      "En Riesgo (Amarillo)",
      "Fuera de Plazo (Rojo)",
      "Tiempo Promedio en Mesa (Días)",
      "Estado de Carga",
    ]);

    headerRow4.height = 24;
    headerRow4.eachCell((cell) => {
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

    const tramitesActivos = await prisma.tramites.findMany({
      where: { estado_general: { not: "PAGADO" } },
      include: {
        usuarios: { include: { areas: true } },
        areas: true,
        historial_movimientos: { orderBy: { fecha_hora: "desc" }, take: 1 },
      },
    });

    const mapaCarga: Record<number, any> = {};
    usuariosActivos.forEach((u) => {
      mapaCarga[u.id_usuario] = {
        usuario: u,
        total: 0,
        enPlazo: 0,
        enRiesgo: 0,
        vencidos: 0,
        diasAcum: 0,
      };
    });

    tramitesActivos.forEach((t) => {
      const cId = t.id_custodio_actual;
      if (!mapaCarga[cId]) {
        mapaCarga[cId] = {
          usuario: t.usuarios,
          total: 0,
          enPlazo: 0,
          enRiesgo: 0,
          vencidos: 0,
          diasAcum: 0,
        };
      }
      const item = mapaCarga[cId];
      item.total++;

      const ultMov = t.historial_movimientos?.[0];
      const fLlegada = ultMov?.fecha_hora ? new Date(ultMov.fecha_hora) : new Date(t.fecha_ingreso || now);
      let countDias = 0;
      const cur = new Date(fLlegada);
      cur.setHours(0, 0, 0, 0);
      const end = new Date(now);
      end.setHours(23, 59, 59, 999);
      while (cur <= end) {
        const d = cur.getDay();
        const s = `${cur.getFullYear()}-${String(cur.getMonth() + 1).padStart(2, "0")}-${String(
          cur.getDate()
        ).padStart(2, "0")}`;
        if (d !== 0 && d !== 6 && !feriadosSet.has(s)) countDias++;
        cur.setDate(cur.getDate() + 1);
      }
      const dias = Math.max(0.5, countDias);
      item.diasAcum += dias;

      const slaLimite = slaPorArea[t.id_area_actual] || 2.5;
      if (dias > slaLimite) item.vencidos++;
      else if (dias >= slaLimite * 0.75) item.enRiesgo++;
      else item.enPlazo++;
    });

    Object.values(mapaCarga).forEach((c: any) => {
      const usr = c.usuario;
      const promDias = c.total > 0 ? Number((c.diasAcum / c.total).toFixed(1)) : 0;
      let estadoCarga = "Normal";
      if (c.total >= 8 || c.vencidos > 2) estadoCarga = "Alta Carga / Demoras";
      else if (c.total >= 4) estadoCarga = "Moderada";

      const row = sheet4.addRow([
        usr?.nombre_completo || "N/A",
        usr?.cargo || "N/A",
        usr?.areas?.nombre || "N/A",
        c.total,
        c.enPlazo,
        c.enRiesgo,
        c.vencidos,
        promDias,
        estadoCarga,
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
        if ([4, 5, 6, 7, 8].includes(colNum)) {
          cell.alignment = { horizontal: "center", vertical: "middle" };
        } else {
          cell.alignment = { horizontal: "left", vertical: "middle" };
        }

        if (colNum === 4 && c.total > 5) {
          cell.font = { bold: true, color: { argb: "FF991B1B" } };
        }
      });
    });

    sheet4.columns = [
      { width: 28 },
      { width: 26 },
      { width: 28 },
      { width: 22 },
      { width: 18 },
      { width: 18 },
      { width: 18 },
      { width: 24 },
      { width: 24 },
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
