import { prisma } from "../../src/lib/prisma";
import { formatDate } from "../../src/lib/utils";

async function verificar() {
  console.log("========================================================================================");
  console.log("                 VERIFICACIÓN EXCLUSIVA DE FECHAS UTC Y TRAMITES SENAE                  ");
  console.log("========================================================================================\n");

  // 1. Trámite SENAE-DCVA-2026-0125-M
  const t1040 = await prisma.tramites.findFirst({
    where: { numero_quipux: "SENAE-DCVA-2026-0125-M" },
    include: { tipos_tramite: true }
  });

  console.log("--- 1. VERIFICACIÓN DEL TRÁMITE SENAE-DCVA-2026-0125-M (ÍTEM 1040) ---");
  if (t1040) {
    console.table([
      {
        Campo: "fecha_memorando",
        "ISO SQLite": t1040.fecha_memorando?.toISOString(),
        "formatDate()": formatDate(t1040.fecha_memorando),
        "Esperado": "2026-07-03T12:00:00.000Z",
        "Check": t1040.fecha_memorando?.toISOString() === "2026-07-03T12:00:00.000Z" ? "✅ EXACTO" : "❌ ERROR"
      },
      {
        Campo: "fecha_recepcion_fisica",
        "ISO SQLite": t1040.fecha_recepcion_fisica?.toISOString(),
        "formatDate()": formatDate(t1040.fecha_recepcion_fisica),
        "Esperado": "2026-07-03T12:00:00.000Z",
        "Check": t1040.fecha_recepcion_fisica?.toISOString() === "2026-07-03T12:00:00.000Z" ? "✅ EXACTO" : "❌ ERROR"
      },
      {
        Campo: "fecha_aprobacion_presupuesto",
        "ISO SQLite": t1040.fecha_aprobacion_presupuesto?.toISOString(),
        "formatDate()": formatDate(t1040.fecha_aprobacion_presupuesto),
        "Esperado": "2026-07-10T12:00:00.000Z",
        "Check": t1040.fecha_aprobacion_presupuesto?.toISOString() === "2026-07-10T12:00:00.000Z" ? "✅ EXACTO" : "❌ ERROR"
      },
      {
        Campo: "fecha_pago",
        "ISO SQLite": t1040.fecha_pago?.toISOString(),
        "formatDate()": formatDate(t1040.fecha_pago),
        "Esperado": "2026-07-13T12:00:00.000Z",
        "Check": t1040.fecha_pago?.toISOString() === "2026-07-13T12:00:00.000Z" ? "✅ EXACTO" : "❌ ERROR"
      }
    ]);
    console.log("Tipo Trámite asignado:", t1040.tipo_tramite?.nombre, "(ID:", t1040.id_tipo_tramite, ")");
  } else {
    console.error("❌ Trámite SENAE-DCVA-2026-0125-M no encontrado!");
  }

  // 2. 10 Trámites Muestra de Enero a Julio
  console.log("\n--- 2. VERIFICACIÓN DE LOS 10 TRÁMITES MUESTRA (ENERO A JULIO) ---");
  const muestras = [
    { mes: "Enero", quipux: "SENAE-JDAL-2026-0009-M", excelRec: "14/01/2026", expRec: "2026-01-14T12:00:00.000Z", excelPago: "27/02/2026", expPago: "2026-02-27T12:00:00.000Z" },
    { mes: "Febrero", quipux: "SENAE-CZPL-2026-0134-M", excelRec: "05/02/2026", expRec: "2026-02-05T12:00:00.000Z", excelPago: "N/A", expPago: null },
    { mes: "Marzo", quipux: "SENAE-ADFE-2026-0059-M", excelRec: "05/03/2026", expRec: "2026-03-05T12:00:00.000Z", excelPago: "06/03/2026", expPago: "2026-03-06T12:00:00.000Z" },
    { mes: "Abril", quipux: "SENAE-DAM-2026-0130-M", excelRec: "30/03/2026", expRec: "2026-03-30T12:00:00.000Z", excelPago: "18/04/2026", expPago: "2026-04-18T12:00:00.000Z" },
    { mes: "Mayo", quipux: "SENAE-ADFC-2026-0104-M", excelRec: "06/05/2026", expRec: "2026-05-06T12:00:00.000Z", excelPago: "12/05/2026", expPago: "2026-05-12T12:00:00.000Z" },
    { mes: "Junio", quipux: "SENAE-JDAL-2026-0115-M", excelRec: "10/06/2026", expRec: "2026-06-10T12:00:00.000Z", excelPago: "27/06/2026", expPago: "2026-06-27T12:00:00.000Z" },
    { mes: "Julio", quipux: "SENAE-DCVA-2026-0125-M", excelRec: "03/07/2026", expRec: "2026-07-03T12:00:00.000Z", excelPago: "13/07/2026", expPago: "2026-07-13T12:00:00.000Z" },
    { mes: "Julio fin", quipux: "SENAE-DCP-2026-0253-M", excelRec: "29/06/2026", expRec: "2026-06-29T12:00:00.000Z", excelPago: "N/A", expPago: null },
    { mes: "Garantía 1", quipux: "SENAE-DDZM-2026-0009-M", excelRec: "09/01/2026", expRec: "2026-01-09T12:00:00.000Z", excelPago: "16/03/2026", expPago: "2026-03-16T12:00:00.000Z" },
    { mes: "Garantía 2", quipux: "SENAE-DPP-2026-0306-M", excelRec: "19/05/2026", expRec: "2026-05-19T12:00:00.000Z", excelPago: "N/A", expPago: null },
  ];

  const resultadosMuestras = [];
  for (const m of muestras) {
    const t = await prisma.tramites.findFirst({ where: { numero_quipux: m.quipux } });
    const recIso = t?.fecha_recepcion_fisica?.toISOString() || null;
    const pagoIso = t?.fecha_pago?.toISOString() || null;
    const recOk = recIso === m.expRec;
    const pagoOk = pagoIso === m.expPago;

    resultadosMuestras.push({
      Mes: m.mes,
      Quipux: m.quipux,
      "Excel Rec": m.excelRec,
      "BD Rec (formatDate)": formatDate(t?.fecha_recepcion_fisica),
      "ISO Rec": recIso,
      "Excel Pago": m.excelPago,
      "BD Pago (formatDate)": formatDate(t?.fecha_pago),
      "ISO Pago": pagoIso,
      "Check": (recOk && pagoOk) ? "✅ 100% EXACTO" : "❌ DESFASE"
    });
  }
  console.table(resultadosMuestras);

  // 3. Feriados
  console.log("\n--- 3. VERIFICACIÓN DE FERIADOS (HORA UTC) ---");
  const feriados = await prisma.feriados.findMany({ orderBy: { fecha: "asc" } });
  console.table(feriados.map(f => ({
    ID: f.id_feriado,
    "Descripción": f.descripcion,
    "ISO SQLite": f.fecha.toISOString(),
    "formatDate()": formatDate(f.fecha),
    "12:00Z Check": f.fecha.toISOString().endsWith("12:00:00.000Z") ? "✅ 12:00Z" : "❌ HORA NO 12Z"
  })));

  // 4. Conteo Total
  console.log("\n--- 4. CONTEO TOTAL DE TRÁMITES ---");
  const count = await prisma.tramites.count();
  const countPago = await prisma.tramites.count({ where: { codigo_tramite: { startsWith: "TRM-2026-P-" } } });
  const countGarantia = await prisma.tramites.count({ where: { codigo_tramite: { startsWith: "TRM-2026-G-" } } });
  console.log("- Trámites PAGO:     " + countPago + " (Esperado: 1099)");
  console.log("- Trámites GARANTÍA: " + countGarantia + " (Esperado: 537)");
  console.log("- TOTAL TRÁMITES:    " + count + " (Esperado: 1636) -> " + (count === 1636 ? "✅ EXACTO 1,636" : "❌ ERROR"));
}

verificar()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
