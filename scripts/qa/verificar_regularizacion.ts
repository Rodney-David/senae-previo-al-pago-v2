import ExcelJS from "exceljs";
import { prisma } from "../../src/lib/prisma";
import { calcularTiemposTramite } from "../../src/lib/tiemposCalculator";

async function main() {
  const feriadosBD = await prisma.feriados.findMany();
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile("C:/Users/PC/Documents/RODNEY SENAE/APLICATIVO PARA BUSQUEDA EN BASES PRESUPUESTO/Enero-Junio-2026.xlsx");
  const wsP = wb.getWorksheet("PAGO");

  const targetItems = [4, 21, 27, 48, 113, 134];
  console.log("=== ANÁLISIS QUIRÚRGICO DE REGULARIZACIONES POSTERIORES (Ítems 4, 21, 27, 48, 113, 134) ===");

  for (let r = 5; r <= wsP.rowCount; r++) {
    const row = wsP.getRow(r);
    const col1 = parseInt((row.getCell(1).text || "0").trim(), 10);

    if (targetItems.includes(col1)) {
      const qRaw = (row.getCell(4).text || "").trim();
      const primerQ = qRaw.split("\n")[0].trim();
      const recExcel = row.getCell(5).value;
      const entExcel = row.getCell(6).value;
      const jcoExcel = row.getCell(18).value;
      const pagExcel = row.getCell(20).value;

      const t = await prisma.tramites.findFirst({
        where: { numero_quipux: { startsWith: primerQ } },
        include: { historial_movimientos: true },
      });

      console.log(`\n--------------------------------------------------------------------------------`);
      console.log(`Ítem #${col1} (Fila Excel ${r}): Quipux = "${primerQ}"`);
      console.log(`   Excel Crudo:`);
      console.log(`      Rec: ${recExcel instanceof Date ? recExcel.toISOString().split("T")[0] : recExcel}`);
      console.log(`      Ent: ${entExcel instanceof Date ? entExcel.toISOString().split("T")[0] : entExcel}`);
      console.log(`      JCO: ${jcoExcel instanceof Date ? jcoExcel.toISOString().split("T")[0] : jcoExcel}`);
      console.log(`      Pag: ${pagExcel instanceof Date ? pagExcel.toISOString().split("T")[0] : pagExcel}`);

      if (t) {
        console.log(`   BD Fechas:`);
        console.log(`      Cod: ${t.codigo_tramite} | Estado: ${t.estado_general}`);
        console.log(`      Rec: ${t.fecha_recepcion_fisica?.toISOString().split("T")[0]}`);
        console.log(`      Ent: ${t.fecha_entrega_control_previo?.toISOString().split("T")[0]}`);
        console.log(`      JCO: ${t.fecha_aprobacion_presupuesto?.toISOString().split("T")[0]}`);
        console.log(`      Pag: ${t.fecha_pago?.toISOString().split("T")[0]}`);

        const fPag = t.fecha_pago?.getTime() || 0;
        const fJco = t.fecha_aprobacion_presupuesto?.getTime() || 0;
        console.log(`      ¿fecha_pago < fecha_recibe_jco?: ${fPag < fJco ? "SÍ (REGULARIZACIÓN)" : "NO"}`);

        const calc = calcularTiemposTramite(t as any, feriadosBD);
        console.log(`   Cálculo Motor Tiempos:`);
        console.log(`      Tramo Presupuesto Hábiles: ${calc.tramo_presupuesto_habiles} días`);
        console.log(`      Tramo Contabilidad/Tesorería: ${calc.historico_parcial?.tramo_contabilidad_tesoreria_habiles} días`);
        console.log(`      Tiempo Real Trabajado: ${calc.tiempo_real_trabajado_dias} días`);
        console.log(`      Tiempo Total Calendario: ${calc.tiempo_total_calendario_dias} días`);
        console.log(`      Alerta Inconsistencia: ${calc.alerta_inconsistencia} | Motivos: ${calc.motivos_alerta.join("; ") || "Ninguno"}`);

        // Diagnóstico: ¿Qué pasaría si usara fecha_recibe_jco como fin de presupuesto?
        const fEnt = t.fecha_entrega_control_previo || t.fecha_recepcion_fisica;
        if (fEnt && t.fecha_aprobacion_presupuesto) {
          const diasConJcoDistorsionado = ((t.fecha_aprobacion_presupuesto.getTime() - fEnt.getTime()) / (86400000)).toFixed(0);
          console.log(`      DIAGNÓSTICO: Si usara fecha JCO directamente, sumaría ~${diasConJcoDistorsionado} días al analista.`);
          console.log(`      EFECTO REGLA ANTI-DISTORSIÓN: Al cortar en fecha_pago, el tramo presupuesto queda en ${calc.tramo_presupuesto_habiles} días hábiles.`);
        }
      } else {
        console.log(`   [NO ENCONTRADO EN BD CON QUIPUX "${primerQ}"]`);
      }
    }
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
