import { prisma } from "../../src/lib/prisma";
import { calcularTiemposTramite } from "../../src/lib/tiemposCalculator";

async function main() {
  const feriadosBD = await prisma.feriados.findMany();

  const multiQuipuxCasos = [
    { item: 16, primerQuipux: "SENAE-CDLA-2025-0006-M" },
    { item: 80, primerQuipux: "SENAE-DSV-2026-0001-M" },
    { item: 93, primerQuipux: "SENAE-CDGU-2026-0140-M" },
    { item: 131, primerQuipux: "SENAE-DDM-2026-0059-M" },
  ];

  console.log("=== INSPECCIÓN DE ÍTEMS CON MÚLTIPLES QUIPUX ===");
  for (const c of multiQuipuxCasos) {
    const t = await prisma.tramites.findFirst({
      where: { numero_quipux: { startsWith: c.primerQuipux } },
      include: { tramite_referencias: true, historial_movimientos: true },
    });
    if (t) {
      const calc = calcularTiemposTramite(t as any, feriadosBD);
      console.log(`\nÍtem #${c.item} -> BD Cod: ${t.codigo_tramite} | Quipux BD: ${t.numero_quipux}`);
      console.log(`   Referencias (${t.tramite_referencias.length}):`, t.tramite_referencias.map((r: any) => `${r.tipo_referencia || r.tipo_documento}:${r.numero_referencia || r.numero_documento}`));
      console.log(`   Fechas: Rec=${t.fecha_recepcion_fisica?.toISOString().split("T")[0]} | Ent=${t.fecha_entrega_control_previo?.toISOString().split("T")[0]} | JCO=${t.fecha_aprobacion_presupuesto?.toISOString().split("T")[0]} | Pag=${t.fecha_pago?.toISOString().split("T")[0]}`);
      console.log(`   CALC: Calidad=${calc.calidad_dato} | Alerta=${calc.alerta_inconsistencia} | Motivos=${calc.motivos_alerta.join("; ") || "Ninguno"}`);
      console.log(`         T.Cal=${calc.tiempo_total_calendario_dias}d | T.Real=${calc.tiempo_real_trabajado_dias}d | TramoPres=${calc.tramo_presupuesto_habiles}d | TramoContTes=${calc.historico_parcial?.tramo_contabilidad_tesoreria_habiles}d`);
    } else {
      console.log(`\nÍtem #${c.item} -> No encontrado con startsWith ${c.primerQuipux}`);
    }
  }

  // Ahora busquemos los dos trámites específicos mencionados en el requerimiento:
  // Fila Nº 692 de PAGO (SENAE-JIT-2026-0039-M con 16.57 en FECHA RECIBE JCO)
  // Fila 544 (SENAE-AIGU-2026-0064-M con serial 46112 en FECHA DE PAGO)
  console.log("\n\n=== CASOS ESPECÍFICOS MENCIONADOS POR QUIPUX ===");
  const quipuxEspecificos = ["SENAE-JIT-2026-0039-M", "SENAE-AIGU-2026-0064-M"];
  for (const q of quipuxEspecificos) {
    const t = await prisma.tramites.findFirst({
      where: { numero_quipux: q },
      include: { historial_movimientos: true, tramite_referencias: true },
    });
    if (t) {
      const calc = calcularTiemposTramite(t as any, feriadosBD);
      console.log(`\nQuipux: ${q} -> Cod: ${t.codigo_tramite} | Estado: ${t.estado_general}`);
      console.log(`   BD Fechas exactas (ISO):`);
      console.log(`      Rec: ${t.fecha_recepcion_fisica?.toISOString()}`);
      console.log(`      Ent: ${t.fecha_entrega_control_previo?.toISOString()}`);
      console.log(`      JCO: ${t.fecha_aprobacion_presupuesto?.toISOString()}`);
      console.log(`      Pag: ${t.fecha_pago?.toISOString()}`);
      console.log(`   CALC: Calidad=${calc.calidad_dato} | Alerta=${calc.alerta_inconsistencia} | Motivos=${calc.motivos_alerta.join("; ") || "Ninguno"}`);
      console.log(`         T.Cal=${calc.tiempo_total_calendario_dias}d | T.Real=${calc.tiempo_real_trabajado_dias}d | TramoPres=${calc.tramo_presupuesto_habiles}d | TramoContTes=${calc.historico_parcial?.tramo_contabilidad_tesoreria_habiles}d`);
    } else {
      console.log(`\nQuipux: ${q} -> NO ENCONTRADO`);
    }
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
