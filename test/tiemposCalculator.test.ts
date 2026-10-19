import assert from "node:assert";
import {
  calcularTiemposTramite,
  calcularParticionTiempo,
  calcularDiasHabilesBrutos,
  evaluarCalidadDato,
  TramiteCalculoInput,
} from "../src/lib/tiemposCalculator";
import { prisma } from "../src/lib/prisma";

async function runTests() {
  console.log("=================================================");
  console.log("INICIANDO PRUEBAS UNITARIAS: MOTOR TIEMPOS SENAE");
  console.log("=================================================\n");

  const feriadosPrueba = ["2026-01-01", "2026-02-16", "2026-02-17", "2026-05-01"];

  // -------------------------------------------------------------
  // TEST 1: Trámite sin pausas que cruza fin de semana
  // -------------------------------------------------------------
  console.log("TEST 1: Trámite sin pausas que cruza fin de semana...");
  const t1: TramiteCalculoInput = {
    id_tramite: 1001,
    codigo_tramite: "TRM-SYS-001",
    numero_quipux: "SENAE-TEST-001",
    estado_general: "PAGADO",
    fecha_recepcion_fisica: new Date("2026-05-15T08:00:00Z"), // Viernes
    fecha_pago: new Date("2026-05-18T17:00:00Z"), // Lunes
    historial_movimientos: [
      {
        tipo_accion: "INGRESO_EXPEDIENTE",
        fecha_hora: new Date("2026-05-15T08:00:00Z"),
      },
      {
        tipo_accion: "PAGO_CONFIRMADO",
        fecha_hora: new Date("2026-05-18T17:00:00Z"),
      },
    ],
  };

  const res1 = calcularTiemposTramite(t1, feriadosPrueba);
  assert.strictEqual(res1.calidad_dato, "COMPLETO");
  assert.strictEqual(res1.reloj_a.invariante_cumplida, true, "Invariante debe cumplirse en Test 1");
  assert(res1.reloj_a.dias_no_laborables >= 2.0, "Debe descontar 2 días de fin de semana (sábado y domingo)");
  assert(res1.reloj_a.dias_laborables_trabajo > 1.0, "Debe registrar trabajo en viernes y lunes");
  console.log(`  -> Total: ${res1.reloj_a.total_calendario_dias}d | Trabajo: ${res1.reloj_a.dias_laborables_trabajo}d | NoLab: ${res1.reloj_a.dias_no_laborables}d | Invariante: OK (dif: ${res1.reloj_a.diferencia_invariante}d)`);

  // -------------------------------------------------------------
  // TEST 2: Feriado en medio
  // -------------------------------------------------------------
  console.log("\nTEST 2: Trámite con feriado nacional en medio...");
  // 2026-05-01 es feriado nacional (Viernes del Trabajo)
  const t2: TramiteCalculoInput = {
    id_tramite: 1002,
    codigo_tramite: "TRM-SYS-002",
    numero_quipux: "SENAE-TEST-002",
    estado_general: "PAGADO",
    fecha_recepcion_fisica: new Date("2026-04-30T08:00:00Z"), // Jueves
    fecha_pago: new Date("2026-05-04T08:00:00Z"), // Lunes siguiente
    historial_movimientos: [
      {
        tipo_accion: "INGRESO_EXPEDIENTE",
        fecha_hora: new Date("2026-04-30T08:00:00Z"),
      },
      {
        tipo_accion: "PAGO_CONFIRMADO",
        fecha_hora: new Date("2026-05-04T08:00:00Z"),
      },
    ],
  };

  const res2 = calcularTiemposTramite(t2, feriadosPrueba);
  assert.strictEqual(res2.reloj_a.invariante_cumplida, true);
  // Viernes 1 Mayo es feriado, Sábado 2 y Domingo 3 son fin de semana -> 3 días no laborables
  assert(res2.reloj_a.dias_no_laborables >= 3.0, "Debe registrar 3 días no laborables (feriado + fin de semana)");
  console.log(`  -> Total: ${res2.reloj_a.total_calendario_dias}d | NoLab: ${res2.reloj_a.dias_no_laborables}d | Trabajo: ${res2.reloj_a.dias_laborables_trabajo}d | Invariante: OK`);

  // -------------------------------------------------------------
  // TEST 3: Pausa de factura que cruza fin de semana (NO DUPLICAR DESCUENTO)
  // -------------------------------------------------------------
  console.log("\nTEST 3: Pausa de factura que cruza fin de semana (sin duplicar descuento)...");
  // Ingreso: Jueves 14-Mayo 08:00
  // Pausa Factura: Viernes 15-Mayo 12:00 a Martes 19-Mayo 12:00 (Cruza sábado 16 y domingo 17)
  // Pago: Miércoles 20-Mayo 12:00
  const t3: TramiteCalculoInput = {
    id_tramite: 1003,
    codigo_tramite: "TRM-SYS-003",
    numero_quipux: "SENAE-TEST-003",
    estado_general: "PAGADO",
    fecha_recepcion_fisica: new Date("2026-05-14T08:00:00Z"),
    fecha_pago: new Date("2026-05-20T12:00:00Z"),
    historial_movimientos: [
      {
        tipo_accion: "INGRESO_EXPEDIENTE",
        fecha_hora: new Date("2026-05-14T08:00:00Z"),
      },
      {
        tipo_accion: "PAUSAR_TRAMITE_FACTURA",
        fecha_hora: new Date("2026-05-15T12:00:00Z"), // Viernes 12h
      },
      {
        tipo_accion: "REANUDAR_TRAMITE_FACTURA",
        fecha_hora: new Date("2026-05-19T12:00:00Z"), // Martes 12h
      },
      {
        tipo_accion: "PAGO_CONFIRMADO",
        fecha_hora: new Date("2026-05-20T12:00:00Z"),
      },
    ],
  };

  const res3 = calcularTiemposTramite(t3, feriadosPrueba);
  assert.strictEqual(res3.reloj_a.invariante_cumplida, true, "Invariante debe cumplirse en Test 3");
  // Fin de semana (16 y 17) = 2.0 días no laborables
  assert.strictEqual(res3.reloj_a.dias_no_laborables, 2.0, "Fin de semana son exactamente 2 días no laborables");
  // Pausa factura en días hábiles = Viernes 12h (0.5d) + Lunes 24h (1.0d) + Martes 12h (0.5d) = 2.0d hábiles de pausa
  assert.strictEqual(res3.reloj_a.dias_pausa_factura, 2.0, "Pausa hábil de factura debe ser exactamente 2.0 días");
  console.log(`  -> Total: ${res3.reloj_a.total_calendario_dias}d | Pausa Factura: ${res3.reloj_a.dias_pausa_factura}d | NoLab: ${res3.reloj_a.dias_no_laborables}d | Invariante: OK (dif: ${res3.reloj_a.diferencia_invariante}d)`);

  // -------------------------------------------------------------
  // TEST 4: Observado 72h
  // -------------------------------------------------------------
  console.log("\nTEST 4: Trámite con Observación 72h...");
  const t4: TramiteCalculoInput = {
    id_tramite: 1004,
    codigo_tramite: "TRM-SYS-004",
    numero_quipux: "SENAE-TEST-004",
    estado_general: "PAGADO",
    fecha_recepcion_fisica: new Date("2026-05-04T08:00:00Z"),
    fecha_pago: new Date("2026-05-08T18:00:00Z"),
    historial_movimientos: [
      {
        tipo_accion: "INGRESO_EXPEDIENTE",
        fecha_hora: new Date("2026-05-04T08:00:00Z"),
      },
      {
        tipo_accion: "OBSERVAR_EXPEDIENTE_72H",
        fecha_hora: new Date("2026-05-05T08:00:00Z"),
      },
      {
        tipo_accion: "SUBSANAR_OBSERVACION",
        fecha_hora: new Date("2026-05-07T08:00:00Z"), // 2 días de observación
      },
      {
        tipo_accion: "PAGO_CONFIRMADO",
        fecha_hora: new Date("2026-05-08T18:00:00Z"),
      },
    ],
  };

  const res4 = calcularTiemposTramite(t4, feriadosPrueba);
  assert.strictEqual(res4.reloj_a.invariante_cumplida, true);
  assert.strictEqual(res4.reloj_a.dias_pausa_observado, 2.0, "Pausa por observación debe ser exactamente 2.0 días");
  console.log(`  -> Pausa Observado: ${res4.reloj_a.dias_pausa_observado}d | Trabajo: ${res4.reloj_a.dias_laborables_trabajo}d | Invariante: OK`);

  // -------------------------------------------------------------
  // TEST 5: Trámite en curso
  // -------------------------------------------------------------
  console.log("\nTEST 5: Trámite en curso (abierto)...");
  const fechaHoySimulada = new Date("2026-05-20T12:00:00Z");
  const t5: TramiteCalculoInput = {
    id_tramite: 1005,
    codigo_tramite: "TRM-SYS-005",
    numero_quipux: "SENAE-TEST-005",
    estado_general: "REVISION",
    fecha_recepcion_fisica: new Date("2026-05-18T08:00:00Z"), // Lunes
    fecha_pago: null,
    historial_movimientos: [
      {
        tipo_accion: "INGRESO_EXPEDIENTE",
        fecha_hora: new Date("2026-05-18T08:00:00Z"),
      },
    ],
  };

  const res5 = calcularTiemposTramite(t5, feriadosPrueba, fechaHoySimulada);
  assert.strictEqual(res5.en_curso, true, "Debe marcarse como en curso");
  assert.strictEqual(res5.reloj_a.invariante_cumplida, true);
  console.log(`  -> En curso: ${res5.en_curso} | Total días hasta hoy: ${res5.reloj_a.total_calendario_dias}d | Invariante: OK`);

  // -------------------------------------------------------------
  // TEST 6: Trámite devuelto (Exento)
  // -------------------------------------------------------------
  console.log("\nTEST 6: Trámite devuelto (exento de promedios de trabajo)...");
  const t6: TramiteCalculoInput = {
    id_tramite: 1006,
    codigo_tramite: "TRM-SYS-006",
    numero_quipux: "SENAE-TEST-006",
    estado_general: "DEVUELTO",
    es_devuelto: true,
    fecha_recepcion_fisica: new Date("2026-05-11T08:00:00Z"),
    fecha_pago: null,
    historial_movimientos: [
      {
        tipo_accion: "DEVOLUCION_FORMAL_REQUIRENTE",
        fecha_hora: new Date("2026-05-13T10:00:00Z"),
      },
    ],
  };

  const res6 = calcularTiemposTramite(t6, feriadosPrueba);
  assert.strictEqual(res6.reloj_a.invariante_cumplida, true);
  console.log(`  -> Estado: ${res6.estado_general} | Días exento: ${res6.reloj_a.dias_exento}d | Invariante: OK`);

  // -------------------------------------------------------------
  // TEST 7: Trámite sin historial
  // -------------------------------------------------------------
  console.log("\nTEST 7: Trámite sin historial de movimientos...");
  const t7: TramiteCalculoInput = {
    id_tramite: 1007,
    codigo_tramite: "TRM-SYS-007",
    numero_quipux: "SENAE-TEST-007",
    estado_general: "PAGADO",
    fecha_recepcion_fisica: new Date("2026-05-11T08:00:00Z"),
    fecha_pago: new Date("2026-05-13T08:00:00Z"),
    historial_movimientos: [],
  };

  const res7 = calcularTiemposTramite(t7, feriadosPrueba);
  assert.strictEqual(res7.reloj_a.invariante_cumplida, true);
  console.log(`  -> Total: ${res7.reloj_a.total_calendario_dias}d | Trabajo: ${res7.reloj_a.dias_laborables_trabajo}d | Invariante: OK`);

  // -------------------------------------------------------------
  // TEST 8: Trámite HISTORICO_PARCIAL con cadena coherente
  // -------------------------------------------------------------
  console.log("\nTEST 8: Trámite HISTORICO_PARCIAL migrado (3 tramos hábiles brutos)...");
  const t8: TramiteCalculoInput = {
    id_tramite: 2001,
    codigo_tramite: "TRM-2026-P-0001",
    numero_quipux: "SENAE-HIST-001",
    estado_general: "PAGADO",
    fecha_recepcion_fisica: new Date("2026-01-05T08:00:00Z"), // Lunes
    fecha_entrega_control_previo: new Date("2026-01-05T12:00:00Z"), // Mismo día
    fecha_aprobacion_presupuesto: new Date("2026-01-12T10:00:00Z"), // Lunes siguiente
    fecha_pago: new Date("2026-01-14T15:00:00Z"), // Miércoles
    historial_movimientos: [
      { tipo_accion: "MIGRACION_EXCEL_2026", fecha_hora: new Date("2026-01-05T08:00:00Z") },
      { tipo_accion: "PASE_A_CONTABILIDAD", fecha_hora: new Date("2026-01-12T10:00:00Z") },
    ],
  };

  const res8 = calcularTiemposTramite(t8, feriadosPrueba);
  assert.strictEqual(res8.calidad_dato, "HISTORICO_PARCIAL");
  assert.strictEqual(res8.reloj_b.aplica, false);
  assert.strictEqual(res8.reloj_b.dias_laborables_efectivos, "n/d", "Reloj B debe ser estrictamente 'n/d'");
  assert(res8.historico_parcial !== undefined);
  console.log(`  -> Tramo Secretaría: ${res8.historico_parcial?.tramo_secretaria_habiles}d`);
  console.log(`  -> Tramo Presupuesto: ${res8.historico_parcial?.tramo_presupuesto_habiles}d`);
  console.log(`  -> Tramo Contabilidad/Tesorería: ${res8.historico_parcial?.tramo_contabilidad_tesoreria_habiles}d`);
  console.log(`  -> Total Hábiles Brutos: ${res8.historico_parcial?.total_habiles_brutos}d | Total Calendario: ${res8.historico_parcial?.total_calendario_dias}d`);

  // -------------------------------------------------------------
  // TEST 9: Trámite con fechas fuera de orden
  // -------------------------------------------------------------
  console.log("\nTEST 9: Trámite con fechas fuera de orden...");
  const t9: TramiteCalculoInput = {
    id_tramite: 2002,
    codigo_tramite: "TRM-2026-P-0002",
    numero_quipux: "SENAE-HIST-002",
    estado_general: "PAGADO",
    fecha_recepcion_fisica: new Date("2026-01-15T08:00:00Z"),
    fecha_entrega_control_previo: new Date("2026-01-10T08:00:00Z"), // Entrega antes que recepción
    fecha_pago: new Date("2026-01-20T08:00:00Z"),
  };

  const res9 = calcularTiemposTramite(t9, feriadosPrueba);
  assert.strictEqual(res9.alerta_inconsistencia, true, "Debe encender alerta de inconsistencia");
  assert(res9.motivos_alerta.some(m => m.includes("anterior a la recepción física")));
  console.log(`  -> Alerta detectada: ${res9.motivos_alerta[0]} | Propuesta: ${res9.propuestas_correccion[0]}`);

  // -------------------------------------------------------------
  // TEST 10: Fecha en fin de semana
  // -------------------------------------------------------------
  console.log("\nTEST 10: Fecha en fin de semana...");
  const t10: TramiteCalculoInput = {
    id_tramite: 2003,
    codigo_tramite: "TRM-2026-P-0003",
    numero_quipux: "SENAE-HIST-003",
    estado_general: "PAGADO",
    fecha_recepcion_fisica: new Date("2026-01-17T08:00:00Z"), // Sábado
    fecha_pago: new Date("2026-01-21T08:00:00Z"),
  };

  const res10 = calcularTiemposTramite(t10, feriadosPrueba);
  assert.strictEqual(res10.alerta_inconsistencia, true);
  assert(res10.motivos_alerta.some(m => m.includes("fin de semana")));
  console.log(`  -> Alerta detectada: ${res10.motivos_alerta[0]}`);

  // -------------------------------------------------------------
  // TEST 11: Fecha de 1970 (Epoch UNIX corrupta)
  // -------------------------------------------------------------
  console.log("\nTEST 11: Fecha de 1970 corrupta...");
  const t11: TramiteCalculoInput = {
    id_tramite: 2004,
    codigo_tramite: "TRM-2026-P-0004",
    numero_quipux: "SENAE-HIST-004",
    estado_general: "PAGADO",
    fecha_recepcion_fisica: new Date("1970-01-01T00:00:00Z"),
    fecha_pago: new Date("2026-01-21T08:00:00Z"),
  };

  const res11 = calcularTiemposTramite(t11, feriadosPrueba);
  assert.strictEqual(res11.calidad_dato, "INCOMPLETO", "Debe clasificarse como INCOMPLETO");
  assert.strictEqual(res11.alerta_inconsistencia, true);
  console.log(`  -> Calidad: ${res11.calidad_dato} | Alerta: ${res11.motivos_alerta[0]}`);

  // -------------------------------------------------------------
  // TEST 12: PRUEBA CON 5 TRÁMITES REALES DE LA BASE DE DATOS
  // -------------------------------------------------------------
  console.log("\n=================================================");
  console.log("TEST 12: EVALUACIÓN CON 5 TRÁMITES REALES DE LA BD");
  console.log("=================================================");

  // 12.1 Obtener feriados reales de la BD
  const feriadosBD = await prisma.feriados.findMany({ where: { activo: true } });

  // 12.2 Consultar 3 trámites COMPLETO (manuales del sistema)
  const tramitesCompleto = await prisma.tramites.findMany({
    where: {
      NOT: { codigo_tramite: { startsWith: "TRM-2026-P-" } },
      AND: [
        { NOT: { codigo_tramite: { startsWith: "TRM-2026-G-" } } },
      ],
    },
    take: 3,
    include: {
      historial_movimientos: true,
    },
  });

  console.log(`\n--- Evaluando ${tramitesCompleto.length} Trámites COMPLETO Reales ---`);
  for (const tc of tramitesCompleto) {
    const res = calcularTiemposTramite(
      {
        id_tramite: tc.id_tramite,
        codigo_tramite: tc.codigo_tramite,
        numero_quipux: tc.numero_quipux,
        padre_gestion: tc.padre_gestion,
        tipo_flujo: tc.tipo_flujo,
        estado_general: tc.estado_general,
        fecha_recepcion_fisica: tc.fecha_recepcion_fisica,
        fecha_ingreso: tc.fecha_ingreso,
        fecha_entrega_control_previo: tc.fecha_entrega_control_previo,
        fecha_aprobacion_presupuesto: tc.fecha_aprobacion_presupuesto,
        fecha_autorizacion_pago: tc.fecha_autorizacion_pago,
        fecha_pago: tc.fecha_pago,
        fecha_ultimo_movimiento: tc.fecha_ultimo_movimiento,
        historial_movimientos: tc.historial_movimientos,
      },
      feriadosBD
    );

    console.log(`\nTrámite Real: ${res.codigo_tramite} (${res.numero_quipux})`);
    console.log(`  Calidad: ${res.calidad_dato} | Estado: ${res.estado_general} | En curso: ${res.en_curso}`);
    console.log(`  Reloj A (Total Auditoría): ${res.reloj_a.total_calendario_dias}d`);
    console.log(`    - Trabajo efectivo: ${res.reloj_a.dias_laborables_trabajo}d`);
    console.log(`    - Pausa Factura: ${res.reloj_a.dias_pausa_factura}d`);
    console.log(`    - Pausa Observado: ${res.reloj_a.dias_pausa_observado}d`);
    console.log(`    - No Laborables: ${res.reloj_a.dias_no_laborables}d`);
    console.log(`    - Post-Autorización: ${res.reloj_a.dias_post_autorizacion}d`);
    console.log(`    - Invariante Cumplida: ${res.reloj_a.invariante_cumplida ? "SÍ (OK)" : "FALLÓ"} (dif: ${res.reloj_a.diferencia_invariante}d)`);
    console.log(`  Reloj B (Trabajo Real): ${res.reloj_b.dias_laborables_efectivos}d (Presupuesto: ${res.reloj_b.fase_presupuesto_dias}d, Contab: ${res.reloj_b.fase_contabilidad_dias}d)`);

    assert.strictEqual(res.reloj_a.invariante_cumplida, true, `Invariante debe cumplirse en ${tc.codigo_tramite}`);
  }

  // 12.3 Consultar 2 trámites HISTORICO_PARCIAL (1 Pago, 1 Garantía)
  const tramiteMigradoPago = await prisma.tramites.findFirst({
    where: {
      codigo_tramite: { startsWith: "TRM-2026-P-" },
      estado_general: "PAGADO",
      fecha_recepcion_fisica: { not: null },
      fecha_entrega_control_previo: { not: null },
      fecha_pago: { not: null },
    },
    include: { historial_movimientos: true },
  });

  const tramiteMigradoGarantia = await prisma.tramites.findFirst({
    where: {
      codigo_tramite: { startsWith: "TRM-2026-G-" },
      estado_general: "PAGADO",
      fecha_recepcion_fisica: { not: null },
      fecha_entrega_control_previo: { not: null },
      fecha_pago: { not: null },
    },
    include: { historial_movimientos: true },
  });

  const migrados = [tramiteMigradoPago, tramiteMigradoGarantia].filter(Boolean);

  console.log(`\n--- Evaluando ${migrados.length} Trámites HISTORICO_PARCIAL Reales ---`);
  for (const tm of migrados) {
    if (!tm) continue;
    const res = calcularTiemposTramite(
      {
        id_tramite: tm.id_tramite,
        codigo_tramite: tm.codigo_tramite,
        numero_quipux: tm.numero_quipux,
        padre_gestion: tm.padre_gestion,
        tipo_flujo: tm.tipo_flujo,
        estado_general: tm.estado_general,
        fecha_recepcion_fisica: tm.fecha_recepcion_fisica,
        fecha_ingreso: tm.fecha_ingreso,
        fecha_entrega_control_previo: tm.fecha_entrega_control_previo,
        fecha_aprobacion_presupuesto: tm.fecha_aprobacion_presupuesto,
        fecha_autorizacion_pago: tm.fecha_autorizacion_pago,
        fecha_pago: tm.fecha_pago,
        fecha_ultimo_movimiento: tm.fecha_ultimo_movimiento,
        historial_movimientos: tm.historial_movimientos,
      },
      feriadosBD
    );

    console.log(`\nTrámite Migrado Real: ${res.codigo_tramite} (${res.numero_quipux})`);
    console.log(`  Flujo: ${res.padre_gestion} | Calidad: ${res.calidad_dato} | Estado: ${res.estado_general}`);
    console.log(`  Reloj B Aplica: ${res.reloj_b.aplica} -> Valor: ${res.reloj_b.dias_laborables_efectivos}`);
    console.log(`  Tramos Hábiles Brutos:`);
    console.log(`    - Tramo 1 (Secretaría: Recepción -> Entrega Analista): ${res.historico_parcial?.tramo_secretaria_habiles}d`);
    console.log(`    - Tramo 2 (Presupuesto: Entrega Analista -> Recibe JCO): ${res.historico_parcial?.tramo_presupuesto_habiles}d`);
    console.log(`    - Tramo 3 (Contab/Tesorería: Recibe JCO -> Pago): ${res.historico_parcial?.tramo_contabilidad_tesoreria_habiles}d`);
    console.log(`    - Total Hábiles Brutos: ${res.historico_parcial?.total_habiles_brutos}d`);
    console.log(`    - Total Calendario: ${res.historico_parcial?.total_calendario_dias}d`);
    console.log(`  Alerta Inconsistencia: ${res.alerta_inconsistencia} ${res.motivos_alerta.length > 0 ? "(" + res.motivos_alerta.join(", ") + ")" : ""}`);

    assert.strictEqual(res.calidad_dato, "HISTORICO_PARCIAL");
    assert.strictEqual(res.reloj_b.dias_laborables_efectivos, "n/d");
  }

  console.log("\n=================================================");
  console.log("¡TODAS LAS PRUEBAS UNITARIAS Y REALES PASARON CON ÉXITO! (12/12)");
  console.log("=================================================\n");
}

runTests()
  .catch((err) => {
    console.error("ERROR EN PRUEBAS UNITARIAS:", err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
