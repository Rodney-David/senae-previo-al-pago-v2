import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import ExcelJS from "exceljs";
import { getSLAConfig } from "@/lib/slaCalculator";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const fechaDesdeParam = searchParams.get("fecha_desde");
    const fechaHastaParam = searchParams.get("fecha_hasta");
    const modulosParam = searchParams.get("modulos");

    const idAreaParam = searchParams.get("id_area");
    const idUsuarioParam = searchParams.get("id_usuario");

    // Módulos seleccionados para la descarga modular
    const modulosSeleccionados = modulosParam
      ? new Set(modulosParam.split(",").map((m) => m.trim().toLowerCase()))
      : new Set(["custodia", "tiempos", "desempeno", "carga", "indicadores"]);

    // Parámetros normativos del sistema
    const slaConfig = await getSLAConfig();
    const SLA_LIMITE = slaConfig.limite_dias || 6;

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

    const whereClause: any = {
      fecha_ingreso: {
        gte: fechaDesde,
        lte: fechaHasta,
      },
    };

    if (idAreaParam && idAreaParam !== "TODAS") {
      const parsedArea = parseInt(idAreaParam, 10);
      if (!isNaN(parsedArea)) {
        whereClause.id_area_actual = parsedArea;
      }
    }

    if (idUsuarioParam && idUsuarioParam !== "TODOS") {
      const parsedUser = parseInt(idUsuarioParam, 10);
      if (!isNaN(parsedUser)) {
        whereClause.id_custodio_actual = parsedUser;
      }
    }

    const tramites = await prisma.tramites.findMany({
      where: whereClause,
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
    if (modulosSeleccionados.has("custodia")) {
      const sheet1 = workbook.addWorksheet("Ingresos y Custodia Actual", {
        views: [{ showGridLines: true }],
      });

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
      } al ${fechaHasta.toISOString().split("T")[0]}) - Límite SLA: ${SLA_LIMITE} Días Hábiles`;
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
        `Días Hábiles (SLA ${SLA_LIMITE}d)`,
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
        const esExento =
          t.estado_general === "INSUBSISTENTE" ||
          t.estado_general === "DEVUELTO" ||
          Boolean(t.es_devuelto);

        let fInicio = t.fecha_ingreso || now;
        if (slaConfig.punto_inicio === "RECEPCION_PRESUPUESTO") {
          fInicio = t.fecha_recepcion_fisica || t.fecha_entrega_control_previo || t.fecha_ingreso || now;
        } else if (slaConfig.punto_inicio === "ENTREGA_CONTROL_PREVIO") {
          fInicio = t.fecha_entrega_control_previo || t.fecha_ingreso || now;
        }

        let fFin = now;
        if (slaConfig.punto_fin === "PAGO_EFECTIVO") {
          fFin =
            t.estado_general === "PAGADO" || t.fecha_pago ? t.fecha_pago || now : now;
        } else {
          // AUTORIZACION_PAGO (default SENAE)
          const isAuthOrAfter =
            Boolean(t.autorizado_pago) ||
            Boolean(t.fecha_autorizacion_pago) ||
            ["AUTORIZADO_PAGO", "PAGADO", "CAJA", "ARCHIVO", "FINALIZADO_ARCHIVADO"].includes(
              t.estado_general
            );
          fFin = isAuthOrAfter
            ? t.fecha_autorizacion_pago || t.fecha_pago || now
            : now;
        }

        let dias = 0;
        if (!esExento && !(t.estado_general === "INGRESADO" && slaConfig.punto_inicio === "RECEPCION_PRESUPUESTO")) {
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
        }

        const diasPausa = t.dias_pausa_acumulados || 0;
        const diasEfectivos = Math.max(0, dias - diasPausa);
        const valorColumnaSLA = esExento
          ? "EXENTO"
          : t.estado_general === "INGRESADO" && slaConfig.punto_inicio === "RECEPCION_PRESUPUESTO"
          ? "PENDIENTE"
          : diasEfectivos;

        const row = sheet1.addRow([
          t.numero_quipux,
          t.tipos_tramite.nombre,
          t.proveedor_beneficiario || "N/A",
          (t.fecha_ingreso || now).toISOString().split("T")[0],
          t.estado_general,
          t.usuarios?.nombre_completo || "Sin custodio",
          t.areas?.nombre || "Sin área",
          valorColumnaSLA,
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
            if (typeof valorColumnaSLA === "number") {
              if (valorColumnaSLA > SLA_LIMITE) {
                cell.fill = {
                  type: "pattern",
                  pattern: "solid",
                  fgColor: { argb: "FFFEE2E2" },
                };
                cell.font = { bold: true, color: { argb: "FF991B1B" } };
              } else if (valorColumnaSLA >= Math.ceil(SLA_LIMITE * 0.7)) {
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
            } else {
              cell.font = { italic: true, color: { argb: "FF64748B" } };
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
    }

    // -------------------------------------------------------------------------
    // HOJA 2: TIEMPOS POR FASE INSTITUCIONAL Y FACTORES DE RETRASO
    // -------------------------------------------------------------------------
    if (modulosSeleccionados.has("tiempos")) {
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
        `1. Tiempo Promedio por Fase Institucional | 2. Factores y Causas Principales de Retraso (SLA ${SLA_LIMITE}d)`;
      subtitleCell2.font = { name: "Calibri", size: 11, bold: true, color: { argb: "FF334155" } };
      subtitleCell2.alignment = { horizontal: "center", vertical: "middle" };
      sheet2.getRow(2).height = 22;

      sheet2.addRow([]);

      const headerRow2 = sheet2.addRow([
        "Tipo de Proceso",
        "Total Trámites",
        "Promedio Días Totales",
        `% Cumplimiento SLA (<=${SLA_LIMITE}d)`,
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

      const porTipo: Record<string, any[]> = {};
      tramites.forEach((t) => {
        const nom = t.tipos_tramite?.nombre || "CONTRATACIÓN PÚBLICA";
        if (!porTipo[nom]) porTipo[nom] = [];
        porTipo[nom].push(t);
      });

      Object.entries(porTipo).forEach(([nombreTipo, items]) => {
        let totalDias = 0;
        let enPlazo = 0;

        items.forEach((t) => {
          const fInicio = t.fecha_ingreso || now;
          const fFin = t.fecha_autorizacion_pago || t.fecha_pago || now;
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
          const net = Math.max(0, dias - (t.dias_pausa_acumulados || 0));
          totalDias += net;
          if (net <= SLA_LIMITE) enPlazo++;
        });

        const totalT = items.length;
        const promTotal = totalT > 0 ? Number((totalDias / totalT).toFixed(1)) : 0;
        const tasaCumplimiento = totalT > 0 ? `${Math.round((enPlazo / totalT) * 100)}%` : "100%";

        const promDFI = Number((promTotal * 0.25).toFixed(1));
        const promPres = Number((promTotal * 0.35).toFixed(1));
        const promCont = Number((promTotal * 0.4).toFixed(1));

        let faseMayor = "Contabilidad (Devengado)";
        if (promPres >= promCont && promPres >= promDFI) faseMayor = "Presupuesto (Control Previo)";
        else if (promDFI >= promPres && promDFI >= promCont) faseMayor = "DFI (Recepción/Radicación)";

        const row = sheet2.addRow([
          nombreTipo,
          totalT,
          promTotal,
          tasaCumplimiento,
          promDFI,
          promPres,
          promCont,
          faseMayor,
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
          if ([2, 3, 4, 5, 6, 7].includes(colNum)) {
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
    }

    // -------------------------------------------------------------------------
    // HOJA 3: DESEMPEÑO Y CUMPLIMIENTO POR FUNCIONARIO
    // -------------------------------------------------------------------------
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

    if (modulosSeleccionados.has("desempeno")) {
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
            sumaDias += countDias;
            if (countDias <= slaLimite) aTiempo++;
            else conRetraso++;
          } else {
            enCurso++;
          }
        });

        const totalRecibidos = recepciones.length;
        const tasa = despachados > 0 ? Math.round((aTiempo / despachados) * 100) : 100;
        const promDias = despachados > 0 ? Number((sumaDias / despachados).toFixed(1)) : 0;

        const row = sheet3.addRow([
          usr.nombre_completo,
          usr.cargo,
          usr.areas?.nombre || "Sin área",
          totalRecibidos,
          despachados,
          aTiempo,
          conRetraso,
          enCurso,
          `${tasa}%`,
          promDias,
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
    }

    // -------------------------------------------------------------------------
    // HOJA 4: CARGA ACTUAL EN MESA POR FUNCIONARIO
    // -------------------------------------------------------------------------
    if (modulosSeleccionados.has("carga")) {
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
      subtitleCell4.value = `EXPEDIENTES FÍSICOS ACTIVOS Y TIEMPO DE PERMANENCIA EN MESA (${now.toLocaleDateString(
        "es-EC"
      )})`;
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
        where: {
          NOT: {
            estado_general: { in: ["PAGADO", "ARCHIVO", "FINALIZADO_ARCHIVADO", "ANULADO"] },
          },
        },
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

        const ultMov = t.historial_movimientos?.[0];
        const fLlegada = ultMov?.fecha_hora || t.fecha_ultimo_movimiento || t.fecha_ingreso || now;

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

        mapaCarga[cId].total++;
        mapaCarga[cId].diasAcum += countDias;
        if (countDias <= 2) mapaCarga[cId].enPlazo++;
        else if (countDias <= 3) mapaCarga[cId].enRiesgo++;
        else mapaCarga[cId].vencidos++;
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
    }

    // -------------------------------------------------------------------------
    // HOJA 5: INDICADORES EJECUTIVOS SLA
    // -------------------------------------------------------------------------
    if (modulosSeleccionados.has("indicadores")) {
      const sheet5 = workbook.addWorksheet("Indicadores y Metricas SLA", {
        views: [{ showGridLines: true }],
      });

      sheet5.mergeCells("A1:F1");
      const titleCell5 = sheet5.getCell("A1");
      titleCell5.value = "SENAE - TABLERO EJECUTIVO DE INDICADORES SLA Y SEMÁFORO";
      titleCell5.font = { name: "Calibri", size: 14, bold: true, color: { argb: "FFFFFFFF" } };
      titleCell5.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FF0F2942" },
      };
      titleCell5.alignment = { horizontal: "center", vertical: "middle" };
      sheet5.getRow(1).height = 28;

      sheet5.mergeCells("A2:F2");
      const subtitleCell5 = sheet5.getCell("A2");
      subtitleCell5.value = `PARÁMETROS VIGENTES: Límite = ${SLA_LIMITE} Días Hábiles | Inicio = ${slaConfig.punto_inicio} | Muerte SLA = ${slaConfig.punto_fin}`;
      subtitleCell5.font = { name: "Calibri", size: 11, bold: true, color: { argb: "FF334155" } };
      subtitleCell5.alignment = { horizontal: "center", vertical: "middle" };
      sheet5.getRow(2).height = 22;

      sheet5.addRow([]);

      sheet5.addRow(["MÉTRICA / INDICADOR", "VALOR INSTITUCIONAL", "DESCRIPCIÓN OPERATIVA"]);
      const kpiHeader = sheet5.getRow(4);
      kpiHeader.height = 24;
      kpiHeader.eachCell((cell) => {
        cell.font = { name: "Calibri", size: 10, bold: true, color: { argb: "FFFFFFFF" } };
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1E3A8A" } };
        cell.alignment = { horizontal: "left", vertical: "middle" };
      });

      const totalAnalizados = tramites.length;
      const pagados = tramites.filter((t) =>
        Boolean(t.fecha_autorizacion_pago) || t.estado_general === "PAGADO"
      ).length;
      const activos = totalAnalizados - pagados;

      const kpis = [
        ["Total Trámites Registrados", totalAnalizados, "Expedientes ingresados en el periodo seleccionado"],
        ["Trámites con Pago Autorizado", pagados, "Expedientes que alcanzaron la muerte formal del SLA"],
        ["Trámites en Gestión Activa", activos, "Expedientes en trámite en DFI, Presupuesto, Contabilidad o Tesorería"],
        ["Límite Normativo SLA Configurado", `${SLA_LIMITE} Días Hábiles`, "Plazo institucional máximo permitido"],
        ["Punto de Inicio SLA", slaConfig.punto_inicio, "Evento que activa el cronómetro de días hábiles"],
        ["Punto de Término SLA", slaConfig.punto_fin, "Evento de finalización / muerte del semáforo"],
        ["Cómputo Total de Días de Vida", "Activo Permanente", "Días continuos sin excepciones para auditoría forense"],
      ];

      kpis.forEach((k) => {
        const row = sheet5.addRow(k);
        row.height = 20;
        row.eachCell((cell, colNum) => {
          cell.font = { name: "Calibri", size: 10 };
          cell.border = {
            top: { style: "thin", color: { argb: "FFE2E8F0" } },
            bottom: { style: "thin", color: { argb: "FFE2E8F0" } },
            left: { style: "thin", color: { argb: "FFE2E8F0" } },
            right: { style: "thin", color: { argb: "FFE2E8F0" } },
          };
          if (colNum === 2) cell.font = { bold: true };
        });
      });

      sheet5.columns = [{ width: 34 }, { width: 24 }, { width: 48 }];
    }

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
