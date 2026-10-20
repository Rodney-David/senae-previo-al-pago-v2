import { prisma } from "../../src/lib/prisma";
import {
  calcularTiemposTramite,
  evaluarCalidadDato,
  calcularDiasHabilesBrutos,
  calcularTramoPresupuestoHabiles,
  parseDate,
  toIsoDateOnly,
  esDiaLaborable,
  normalizarFeriadosSet,
} from "../../src/lib/tiemposCalculator";
import ExcelJS from "exceljs";
import fs from "fs";
import path from "path";

async function main() {
  const feriadosBD = await prisma.feriados.findMany();
  const feriadosSet = normalizarFeriadosSet(feriadosBD.map(f => f.fecha));

  const excelPath = "C:/Users/PC/Documents/RODNEY SENAE/APLICATIVO PARA BUSQUEDA EN BASES PRESUPUESTO/Enero-Junio-2026.xlsx";
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(excelPath);
  const hojaPago = workbook.getWorksheet("PAGO");

  // 1.1 ERRATAS 2025
  const filasTarget2025 = [16, 79, 80, 82, 93, 126, 130, 131, 136, 232, 305];
  const resultadosErratas2025: any[] = [];

  for (const numFila of filasTarget2025) {
    const row = hojaPago ? hojaPago.getRow(numFila) : null;
    const quipuxExcel = row ? String(row.getCell(1).value || "").trim() : "";
    const fechaRecExcel = row ? row.getCell(4).value : null;
    const fechaEntExcel = row ? row.getCell(5).value : null;
    const fechaJcoExcel = row ? row.getCell(6).value : null;
    const fechaPagExcel = row ? row.getCell(7).value : null;

    const padStr = String(numFila - 1).padStart(4, "0");
    const codProbable = `TRM-2026-P-${padStr}`;

    const tramiteBD = await prisma.tramites.findFirst({
      where: {
        OR: [{ numero_quipux: quipuxExcel }, { codigo_tramite: codProbable }],
      },
      include: { historial_movimientos: true },
    });

    if (tramiteBD) {
      const calculo = calcularTiemposTramite(tramiteBD as any, feriadosBD);
      resultadosErratas2025.push({
        numFila,
        codigo_tramite: tramiteBD.codigo_tramite,
        quipux: tramiteBD.numero_quipux,
        excel_crudo: {
          rec: fechaRecExcel,
          ent: fechaEntExcel,
          jco: fechaJcoExcel,
          pag: fechaPagExcel,
        },
        bd_fechas: {
          rec: tramiteBD.fecha_recepcion_fisica?.toISOString() || null,
          ent: tramiteBD.fecha_entrega_control_previo?.toISOString() || null,
          jco: tramiteBD.fecha_aprobacion_presupuesto?.toISOString() || null,
          pag: tramiteBD.fecha_pago?.toISOString() || null,
        },
        calidad_dato: calculo.calidad_dato,
        alerta_inconsistencia: calculo.alerta_inconsistencia,
        motivos_alerta: calculo.motivos_alerta,
        propuestas_correccion: calculo.propuestas_correccion,
        tiempo_total_calendario_dias: calculo.tiempo_total_calendario_dias,
        tiempo_real_trabajado_dias: calculo.tiempo_real_trabajado_dias,
        tramo_presupuesto_habiles: calculo.tramo_presupuesto_habiles,
        tramo_secretaria_habiles: calculo.historico_parcial?.tramo_secretaria_habiles,
        tramo_contabilidad_tesoreria_habiles: calculo.historico_parcial?.tramo_contabilidad_tesoreria_habiles,
      });
    }
  }

  // 1.2 CASOS DECIMALES
  const casosDecimales = [
    { numFila: 692, quipux: "SENAE-JIT-2026-0039-M", desc: "Decimal 16.57 en FECHA RECIBE JCO" },
    { numFila: 544, quipux: "SENAE-AIGU-2026-0064-M", desc: "Serial 46112 en FECHA DE PAGO" },
  ];
  const resultadosDecimales: any[] = [];
  for (const c of casosDecimales) {
    const row = hojaPago ? hojaPago.getRow(c.numFila) : null;
    const tramiteBD = await prisma.tramites.findFirst({
      where: { numero_quipux: c.quipux },
      include: { historial_movimientos: true },
    });
    if (tramiteBD) {
      const calculo = calcularTiemposTramite(tramiteBD as any, feriadosBD);
      resultadosDecimales.push({
        numFila: c.numFila,
        quipux: c.quipux,
        descripcion: c.desc,
        excel_crudo: {
          rec: row ? row.getCell(4).value : null,
          ent: row ? row.getCell(5).value : null,
          jco: row ? row.getCell(6).value : null,
          pag: row ? row.getCell(7).value : null,
        },
        bd_fechas: {
          rec: tramiteBD.fecha_recepcion_fisica?.toISOString() || null,
          ent: tramiteBD.fecha_entrega_control_previo?.toISOString() || null,
          jco: tramiteBD.fecha_aprobacion_presupuesto?.toISOString() || null,
          pag: tramiteBD.fecha_pago?.toISOString() || null,
        },
        calidad_dato: calculo.calidad_dato,
        alerta_inconsistencia: calculo.alerta_inconsistencia,
        motivos_alerta: calculo.motivos_alerta,
        tiempo_total_calendario_dias: calculo.tiempo_total_calendario_dias,
        tramo_presupuesto_habiles: calculo.tramo_presupuesto_habiles,
        tramo_contabilidad_tesoreria_habiles: calculo.historico_parcial?.tramo_contabilidad_tesoreria_habiles,
      });
    }
  }

  // 1.3 26 CASOS DE REGULARIZACIÓN
  const todosConAmbasFechas = await prisma.tramites.findMany({
    where: {
      AND: [
        { fecha_pago: { not: null } },
        { fecha_aprobacion_presupuesto: { not: null } },
      ],
    },
    include: { historial_movimientos: true },
  });
  const regularizaciones = todosConAmbasFechas.filter(
    t => t.fecha_pago!.getTime() < t.fecha_aprobacion_presupuesto!.getTime()
  );

  const casosRegulPedidos = [4, 21, 27, 48, 113, 134];
  const resultadosRegulPedidos: any[] = [];
  for (const numFila of casosRegulPedidos) {
    const row = hojaPago ? hojaPago.getRow(numFila) : null;
    const quipuxExcel = row ? String(row.getCell(1).value || "").trim() : "";
    const padStr = String(numFila - 1).padStart(4, "0");
    const codProbable = `TRM-2026-P-${padStr}`;

    const tramiteBD = await prisma.tramites.findFirst({
      where: {
        OR: [{ numero_quipux: quipuxExcel }, { codigo_tramite: codProbable }],
      },
      include: { historial_movimientos: true },
    });
    if (tramiteBD) {
      const calculo = calcularTiemposTramite(tramiteBD as any, feriadosBD);
      resultadosRegulPedidos.push({
        numFila,
        codigo_tramite: tramiteBD.codigo_tramite,
        quipux: tramiteBD.numero_quipux,
        bd_fechas: {
          rec: tramiteBD.fecha_recepcion_fisica?.toISOString() || null,
          ent: tramiteBD.fecha_entrega_control_previo?.toISOString() || null,
          jco: tramiteBD.fecha_aprobacion_presupuesto?.toISOString() || null,
          pag: tramiteBD.fecha_pago?.toISOString() || null,
        },
        tramo_presupuesto_habiles: calculo.tramo_presupuesto_habiles,
        tramo_contabilidad_tesoreria_habiles: calculo.historico_parcial?.tramo_contabilidad_tesoreria_habiles,
        tiempo_real_trabajado_dias: calculo.tiempo_real_trabajado_dias,
        tiempo_total_calendario_dias: calculo.tiempo_total_calendario_dias,
        alerta_inconsistencia: calculo.alerta_inconsistencia,
        motivos_alerta: calculo.motivos_alerta,
      });
    }
  }

  // 2.3 OBSERVADOS
  const tramitesObservados = await prisma.tramites.findMany({
    where: { estado_general: "OBSERVADO" },
    include: { historial_movimientos: true },
  });
  const resultadosObservados = tramitesObservados.map(t => {
    const res = calcularTiemposTramite(t as any, feriadosBD);
    const esPausadoOObservado =
      t.estado_general === "OBSERVADO" ||
      t.estado_general === "OBSERVADO_72H" ||
      Boolean(t.esta_pausado) ||
      t.sub_estado === "ESPERA_FACTURA" ||
      t.sub_estado === "OBSERVADO";

    let semaforo = "VERDE";
    if (t.estado_general === "DEVUELTO" || t.estado_general === "INSUBSISTENTE") {
      semaforo = "EXENTO";
    } else if (esPausadoOObservado) {
      semaforo = "PENDIENTE";
    } else {
      semaforo = res.tiempo_real_trabajado_dias > 3 ? "ROJO" : "VERDE";
    }

    return {
      codigo_tramite: t.codigo_tramite,
      quipux: t.numero_quipux,
      padre: t.padre_gestion,
      estado_general: t.estado_general,
      sub_estado: t.sub_estado,
      esta_pausado: t.esta_pausado,
      motivo_pausa: t.motivo_pausa,
      dias_pausa: res.dias_pausa,
      tiempo_real_trabajado_dias: res.tiempo_real_trabajado_dias,
      tramo_presupuesto_habiles: res.tramo_presupuesto_habiles,
      alerta_sla: semaforo,
    };
  });

  const fullData = {
    erratas2025: resultadosErratas2025,
    decimales: resultadosDecimales,
    totalRegularizacionesBD: regularizaciones.length,
    regularizacionesPedidos: resultadosRegulPedidos,
    observados: {
      total: tramitesObservados.length,
      pago: tramitesObservados.filter(t => t.codigo_tramite.startsWith("TRM-2026-P-")).length,
      garantia: tramitesObservados.filter(t => t.codigo_tramite.startsWith("TRM-2026-G-")).length,
      todosPausados: tramitesObservados.every(t => t.esta_pausado === true),
      detalles: resultadosObservados,
    },
  };

  fs.writeFileSync(
    path.join(__dirname, "qa2_datos_completos.json"),
    JSON.stringify(fullData, null, 2),
    "utf-8"
  );
  console.log("Datos exportados exitosamente a scripts/qa/qa2_datos_completos.json");
}

main().catch(console.error).finally(() => prisma.$disconnect());
