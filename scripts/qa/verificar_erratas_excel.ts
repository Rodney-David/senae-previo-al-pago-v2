import ExcelJS from "exceljs";
import { prisma } from "../../src/lib/prisma";
import { calcularTiemposTramite, normalizarFeriadosSet } from "../../src/lib/tiemposCalculator";

async function main() {
  const feriadosBD = await prisma.feriados.findMany();
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile("C:/Users/PC/Documents/RODNEY SENAE/APLICATIVO PARA BUSQUEDA EN BASES PRESUPUESTO/Enero-Junio-2026.xlsx");
  const wsP = wb.getWorksheet("PAGO");

  if (!wsP) {
    console.error("No se encontró hoja PAGO");
    return;
  }

  // Comprobar tanto por Columna 1 (Nº) como por fila de Excel
  const targets = [16, 79, 80, 82, 93, 126, 130, 131, 136, 232, 305];
  console.log("=== INSPECCIONANDO ÍTEMS / FILAS:", targets.join(", "), "===");

  for (let r = 5; r <= wsP.rowCount; r++) {
    const row = wsP.getRow(r);
    const col1Val = (row.getCell(1).text || "").trim();
    const col1Num = parseInt(col1Val, 10);

    if (targets.includes(col1Num)) {
      const q = (row.getCell(4).text || "").trim();
      const rec = row.getCell(5).value;
      const ent = row.getCell(6).value;
      const jco = row.getCell(18).value;
      const pag = row.getCell(20).value;

      const t = await prisma.tramites.findFirst({
        where: { numero_quipux: q },
        include: { historial_movimientos: true },
      });

      console.log(`\n-------------------------------------------------------------`);
      console.log(`Ítem #${col1Num} (Fila Excel ${r}): Quipux = "${q}"`);
      console.log(`   Excel: Rec=${rec instanceof Date ? rec.toISOString().split("T")[0] : rec}`);
      console.log(`          Ent=${ent instanceof Date ? ent.toISOString().split("T")[0] : ent}`);
      console.log(`          JCO=${jco instanceof Date ? jco.toISOString().split("T")[0] : jco}`);
      console.log(`          Pag=${pag instanceof Date ? pag.toISOString().split("T")[0] : pag}`);

      if (t) {
        const calc = calcularTiemposTramite(t as any, feriadosBD);
        console.log(`   BD:    Cod: ${t.codigo_tramite} | Estado: ${t.estado_general}`);
        console.log(`          Rec=${t.fecha_recepcion_fisica?.toISOString().split("T")[0] || "null"}`);
        console.log(`          Ent=${t.fecha_entrega_control_previo?.toISOString().split("T")[0] || "null"}`);
        console.log(`          JCO=${t.fecha_aprobacion_presupuesto?.toISOString().split("T")[0] || "null"}`);
        console.log(`          Pag=${t.fecha_pago?.toISOString().split("T")[0] || "null"}`);
        console.log(`   CALC:  Calidad=${calc.calidad_dato} | Alerta=${calc.alerta_inconsistencia}`);
        console.log(`          Motivos: ${calc.motivos_alerta.join("; ") || "Ninguno"}`);
        console.log(`          T.Calendario=${calc.tiempo_total_calendario_dias}d | T.Real=${calc.tiempo_real_trabajado_dias}d | TramoPres=${calc.tramo_presupuesto_habiles}d | TramoSec=${calc.historico_parcial?.tramo_secretaria_habiles}d | TramoContTes=${calc.historico_parcial?.tramo_contabilidad_tesoreria_habiles}d`);
      } else {
        console.log(`   BD:    [NO ENCONTRADO EN BD CON QUIPUX "${q}"]`);
      }
    }
  }

  // Revisar casos decimales fila 692 (ítem 688) y fila 544 (ítem 540)
  console.log("\n\n=== CASOS DECIMALES / SERIALES ===");
  const filasEspeciales = [
    { rowIdx: 692, quipuxEsperado: "SENAE-JIT-2026-0039-M" },
    { rowIdx: 544, quipuxEsperado: "SENAE-AIGU-2026-0064-M" },
  ];
  for (const esp of filasEspeciales) {
    const row = wsP.getRow(esp.rowIdx);
    const col1 = row.getCell(1).text;
    const q = (row.getCell(4).text || "").trim();
    const rec = row.getCell(5).value;
    const ent = row.getCell(6).value;
    const jco = row.getCell(18).value;
    const pag = row.getCell(20).value;
    console.log(`\nFila Excel ${esp.rowIdx} (Ítem #${col1}): Quipux = "${q}"`);
    console.log(`   Excel: Rec=${rec} | Ent=${ent} | JCO=${jco} | Pag=${pag}`);
    const t = await prisma.tramites.findFirst({
      where: { numero_quipux: q },
      include: { historial_movimientos: true },
    });
    if (t) {
      const calc = calcularTiemposTramite(t as any, feriadosBD);
      console.log(`   BD:    Cod: ${t.codigo_tramite} | Rec=${t.fecha_recepcion_fisica?.toISOString()} | Ent=${t.fecha_entrega_control_previo?.toISOString()} | JCO=${t.fecha_aprobacion_presupuesto?.toISOString()} | Pag=${t.fecha_pago?.toISOString()}`);
      console.log(`   CALC:  Calidad=${calc.calidad_dato} | Alerta=${calc.alerta_inconsistencia} | Motivos=${calc.motivos_alerta.join("; ")} | T.Cal=${calc.tiempo_total_calendario_dias}d | TramoPres=${calc.tramo_presupuesto_habiles}d | TramoContTes=${calc.historico_parcial?.tramo_contabilidad_tesoreria_habiles}d`);
    }
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
