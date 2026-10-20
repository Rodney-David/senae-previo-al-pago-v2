import { prisma } from "../../src/lib/prisma";
import ExcelJS from "exceljs";
import { RUTA_DEFAULT_EXCEL_2026, mapearTipoTramitePago } from "../../src/services/migracionExcelService";

async function main() {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(RUTA_DEFAULT_EXCEL_2026);
  const wsPago = wb.getWorksheet("PAGO")!;
  const wsGarantia = wb.getWorksheet("GARANTÍA") || wb.getWorksheet("GARANTIA")!;

  console.log("=== COMPARACIÓN FORENSE EXACTA DE 10 TRÁMITES (EXCEL VS BD) ===");

  // 10 trámites de diferentes meses
  const muestras = [
    { mes: "Enero (PAGO)", fila: 52, item: 50 },
    { mes: "Febrero (PAGO)", fila: 202, item: 200 },
    { mes: "Marzo (PAGO)", fila: 382, item: 380 },
    { mes: "Abril (PAGO)", fila: 552, item: 550 },
    { mes: "Mayo (PAGO)", fila: 722, item: 720 },
    { mes: "Junio (PAGO)", fila: 902, item: 900 },
    { mes: "Julio (PAGO)", fila: 1041, item: 1040 },
    { mes: "Julio final (PAGO)", fila: 1081, item: 1080 },
    { mes: "Enero (GARANTÍA)", fila: 12, item: 10, garantia: true },
    { mes: "Mayo (GARANTÍA)", fila: 402, item: 400, garantia: true },
  ];

  for (const m of muestras) {
    const ws = m.garantia ? wsGarantia : wsPago;
    const r = ws.getRow(m.fila);

    // En PAGO:
    // col 1: Item
    // col 2: Tipo Gestión
    // col 3: Ciudad
    // col 4: Quipux
    // col 5: Fecha Recepción Física
    // col 6: Fecha Entrega Analista
    // col 18: Fecha Recibe JCO
    // col 20: Fecha Pago
    //
    // En GARANTÍA:
    // col 1: Item
    // col 2: Quipux
    // col 3: Fecha Recepción / Ingreso
    // col 4: Fecha Entrega Analista (o similar)
    // col 15: Fecha Pago / Devolución

    let quipuxRaw = "";
    let excelRecDate: any = null;
    let excelEntDate: any = null;
    let excelJcoDate: any = null;
    let excelPagoDate: any = null;

    if (!m.garantia) {
      quipuxRaw = r.getCell(4).text.trim();
      excelRecDate = r.getCell(5).value;
      excelEntDate = r.getCell(6).value;
      excelJcoDate = r.getCell(18).value;
      excelPagoDate = r.getCell(20).value;
    } else {
      quipuxRaw = r.getCell(2).text.trim();
      excelRecDate = r.getCell(3).value;
      excelEntDate = r.getCell(4).value;
      excelPagoDate = r.getCell(15).value;
    }

    const firstQuipux = quipuxRaw.split(/[\n\r,;/]+/)[0].trim();
    const tBD = await prisma.tramites.findFirst({
      where: { numero_quipux: { contains: firstQuipux } },
    });

    console.log(`\n--------------------------------------------------------------------------------`);
    console.log(`[Muestra ${m.mes}] Item #${m.item} (Fila Excel ${m.fila})`);
    console.log(`Quipux Excel: "${firstQuipux}" | Quipux BD: "${tBD?.numero_quipux}"`);
    console.log(`Codigo Tramite: ${tBD?.codigo_tramite} | Estado: ${tBD?.estado_general}`);

    function formatVal(v: any) {
      if (!v) return "VACÍO";
      if (v instanceof Date) return `Date(${v.toISOString()})`;
      return `Str/Num("${v}")`;
    }

    console.log(`  FECHA RECEPCIÓN:`);
    console.log(`     Excel Celda:  ${formatVal(excelRecDate)} (Texto celda: "${m.garantia ? r.getCell(3).text : r.getCell(5).text}")`);
    console.log(`     BD Guardado:  ${tBD?.fecha_recepcion_fisica?.toISOString() || "NULL"}`);
    
    console.log(`  FECHA ENTREGA ANALISTA:`);
    console.log(`     Excel Celda:  ${formatVal(excelEntDate)} (Texto celda: "${m.garantia ? r.getCell(4).text : r.getCell(6).text}")`);
    console.log(`     BD Guardado:  ${tBD?.fecha_entrega_control_previo?.toISOString() || "NULL"}`);

    if (!m.garantia) {
      console.log(`  FECHA RECIBE JCO (Presupuesto):`);
      console.log(`     Excel Celda:  ${formatVal(excelJcoDate)} (Texto celda: "${r.getCell(18).text}")`);
      console.log(`     BD Guardado:  ${tBD?.fecha_aprobacion_presupuesto?.toISOString() || "NULL"}`);
    }

    console.log(`  FECHA PAGO:`);
    console.log(`     Excel Celda:  ${formatVal(excelPagoDate)} (Texto celda: "${m.garantia ? r.getCell(15).text : r.getCell(20).text}")`);
    console.log(`     BD Guardado:  ${tBD?.fecha_pago?.toISOString() || "NULL"}`);
  }

  // AUDITORÍA DE STRINGS DE FECHA EN JAVASCRIPT
  console.log("\n================================================================================");
  console.log("=== COMPORTAMIENTO DE PARSEO DE FECHAS EN RUNTIME NODE (ZONA HORARIA LOCAL) ===");
  console.log("================================================================================");
  const testDates = ["13-jul-26", "03/07/2026", "2026-07-03", "13-JUL-2026"];
  for (const td of testDates) {
    const d = new Date(td);
    console.log(`Input "${td}":`);
    console.log(`  new Date("${td}").getTime(): ${d.getTime()}`);
    console.log(`  .toISOString(): ${isNaN(d.getTime()) ? "INVALID" : d.toISOString()}`);
    console.log(`  .toString() [local]: ${isNaN(d.getTime()) ? "INVALID" : d.toString()}`);
    if (!isNaN(d.getTime())) {
      console.log(`  .getFullYear()=${d.getFullYear()}, .getMonth()=${d.getMonth()}, .getDate()=${d.getDate()}`);
      console.log(`  .getUTCFullYear()=${d.getUTCFullYear()}, .getUTCMonth()=${d.getUTCMonth()}, .getUTCDate()=${d.getUTCDate()}`);
    }
  }

  // AUDITORÍA DE FALLBACK DE PROCESO
  console.log("\n================================================================================");
  console.log("=== AUDITORÍA DE TIPOS DE CONTRATACIÓN (COLUMNA 7) Y SU MAPEO ===");
  console.log("================================================================================");
  const casosCol7 = [
    { tipo: "Servicio Arrendamiento", desc: 'informe de conformidad del contrato no. r-018-2024 "servicio de arrendamiento..."' },
    { tipo: "Servicio Arrendamiento", desc: 'sin palabra c-o-n-t-r-a-t-o en descripcion' },
    { tipo: "Servicio de Limpieza", desc: 'limpieza de oficinas' },
    { tipo: "Orden de compra", desc: 'adquisición de suministros' },
    { tipo: "Servicio de Seguridad", desc: 'vigilancia' },
    { tipo: "Combustible", desc: 'abastecimiento' },
  ];

  for (const c of casosCol7) {
    const id = mapearTipoTramitePago(c.tipo, c.desc);
    const tp = await prisma.tipos_tramite.findUnique({ where: { id_tipo_tramite: id } });
    console.log(`Tipo: "${c.tipo}" | Desc: "${c.desc.slice(0, 30)}..." -> ID=${id} (${tp?.codigo}: ${tp?.nombre})`);
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
