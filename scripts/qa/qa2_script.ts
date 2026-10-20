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
import path from "path";

async function runQA2() {
  console.log("===============================================================================");
  console.log("      AUDITORÍA INTEGRAL QA-2: MOTOR DE TIEMPOS, SLA Y MOVIMIENTOS            ");
  console.log("===============================================================================\n");

  const feriadosBD = await prisma.feriados.findMany();
  console.log(`[INIT] Feriados cargados desde BD: ${feriadosBD.length} registros`);
  for (const f of feriadosBD) {
    console.log(`   - ${f.fecha ? f.fecha.toISOString().split("T")[0] : "n/a"} : ${f.descripcion}`);
  }

  const feriadosSet = normalizarFeriadosSet(feriadosBD.map(f => f.fecha));

  // =========================================================================
  // BLOQUE 1: INVARIANTE MATEMÁTICA Y CASOS EXTREMOS DEL EXCEL
  // =========================================================================
  console.log("\n===============================================================================");
  console.log(">>> BLOQUE 1: INVARIANTE MATEMÁTICA Y CASOS EXTREMOS DEL EXCEL");
  console.log("===============================================================================");

  // 1.1 ERRATAS DE AÑO 2025
  // Las filas del Excel de PAGO: 16, 79, 80, 82, 93, 126, 130, 131, 136, 232, 305
  const excelPath = "C:/Users/PC/Documents/RODNEY SENAE/APLICATIVO PARA BUSQUEDA EN BASES PRESUPUESTO/Enero-Junio-2026.xlsx";
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(excelPath);
  const hojaPago = workbook.getWorksheet("PAGO");

  console.log(`\n--- 1.1 INSPECCIÓN DE ERRATAS DE AÑO 2025 ---`);
  const filasTarget2025 = [16, 79, 80, 82, 93, 126, 130, 131, 136, 232, 305];
  
  for (const numFila of filasTarget2025) {
    const row = hojaPago ? hojaPago.getRow(numFila) : null;
    const quipuxExcel = row ? String(row.getCell(1).value || "").trim() : "NO ROW";
    const fechaRecExcel = row ? row.getCell(4).value : undefined;
    const fechaEntExcel = row ? row.getCell(5).value : undefined;
    const fechaJcoExcel = row ? row.getCell(6).value : undefined;
    const fechaPagExcel = row ? row.getCell(7).value : undefined;

    // Buscar en BD por quipux o por código TRM-2026-P-xxxx
    const padStr = String(numFila - 1).padStart(4, "0");
    const codProbable = `TRM-2026-P-${padStr}`;
    const tramiteBD = await prisma.tramites.findFirst({
      where: {
        OR: [
          { numero_quipux: quipuxExcel },
          { codigo_tramite: codProbable },
        ],
      },
      include: { historial_movimientos: true },
    });

    if (tramiteBD) {
      const calculo = calcularTiemposTramite(tramiteBD as any, feriadosBD);
      console.log(`\nFila Excel #${numFila} -> Cod: ${tramiteBD.codigo_tramite} | Quipux: ${tramiteBD.numero_quipux}`);
      console.log(`   Excel crudo: Rec=${fechaRecExcel} | Ent=${fechaEntExcel} | JCO=${fechaJcoExcel} | Pag=${fechaPagExcel}`);
      console.log(`   BD fechas:   Rec=${tramiteBD.fecha_recepcion_fisica?.toISOString().split("T")[0] || "null"} | Ent=${tramiteBD.fecha_entrega_control_previo?.toISOString().split("T")[0] || "null"} | JCO=${tramiteBD.fecha_aprobacion_presupuesto?.toISOString().split("T")[0] || "null"} | Pag=${tramiteBD.fecha_pago?.toISOString().split("T")[0] || "null"}`);
      console.log(`   Calidad Dato: ${calculo.calidad_dato} | Alerta: ${calculo.alerta_inconsistencia}`);
      console.log(`   Motivos alerta: ${calculo.motivos_alerta.join(" | ") || "Ninguno"}`);
      console.log(`   T. Calendario: ${calculo.tiempo_total_calendario_dias}d | T. Real Trabajado: ${calculo.tiempo_real_trabajado_dias}d | Tramo Presupuesto: ${calculo.tramo_presupuesto_habiles}d | Tramo Sec: ${calculo.historico_parcial?.tramo_secretaria_habiles}d`);
    } else {
      console.log(`\nFila Excel #${numFila} -> Quipux: ${quipuxExcel} [NO ENCONTRADO EN BD]`);
    }
  }

  // 1.2 CELDA CON DECIMAL EN FECHA Y SERIAL NUMÉRICO
  console.log(`\n--- 1.2 INSPECCIÓN DE CELDAS CON VALORES DECIMALES / SERIALES ---`);
  // Fila 692 (SENAE-JIT-2026-0039-M con 16.57 en FECHA RECIBE JCO)
  // Fila 544 (SENAE-AIGU-2026-0064-M con serial 46112 en FECHA DE PAGO)
  const casosDecimales = [
    { numFila: 692, quipux: "SENAE-JIT-2026-0039-M", desc: "Decimal 16.57 en FECHA RECIBE JCO" },
    { numFila: 544, quipux: "SENAE-AIGU-2026-0064-M", desc: "Serial 46112 en FECHA DE PAGO" },
  ];

  for (const c of casosDecimales) {
    const row = hojaPago ? hojaPago.getRow(c.numFila) : null;
    const tramiteBD = await prisma.tramites.findFirst({
      where: { numero_quipux: c.quipux },
      include: { historial_movimientos: true },
    });
    console.log(`\nFila #${c.numFila}: ${c.quipux} (${c.desc})`);
    if (row) {
      console.log(`   Excel crudo: Rec=${row.getCell(4).value} | Ent=${row.getCell(5).value} | JCO=${row.getCell(6).value} | Pag=${row.getCell(7).value}`);
    }
    if (tramiteBD) {
      console.log(`   BD fechas:   Rec=${tramiteBD.fecha_recepcion_fisica?.toISOString() || "null"}`);
      console.log(`                Ent=${tramiteBD.fecha_entrega_control_previo?.toISOString() || "null"}`);
      console.log(`                JCO=${tramiteBD.fecha_aprobacion_presupuesto?.toISOString() || "null"}`);
      console.log(`                Pag=${tramiteBD.fecha_pago?.toISOString() || "null"}`);
      const calculo = calcularTiemposTramite(tramiteBD as any, feriadosBD);
      console.log(`   Calidad: ${calculo.calidad_dato} | Alerta: ${calculo.alerta_inconsistencia} | Motivos: ${calculo.motivos_alerta.join("; ")}`);
      console.log(`   Métricas: TotalCal=${calculo.tiempo_total_calendario_dias}d | TramoPres=${calculo.tramo_presupuesto_habiles}d | TramoContTes=${calculo.historico_parcial?.tramo_contabilidad_tesoreria_habiles}d`);
    } else {
      console.log(`   [NO ENCONTRADO EN BD CON QUIPUX ${c.quipux}]`);
    }
  }

  // 1.3 26 CASOS DE REGULARIZACIÓN POSTERIOR (fecha_pago < fecha_recibe_jco)
  console.log(`\n--- 1.3 LOS 26 CASOS DE REGULARIZACIÓN POSTERIOR (fecha_pago < fecha_recibe_jco) ---`);
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

  console.log(`Total de trámites en BD con fecha_pago < fecha_recibe_jco: ${regularizaciones.length}`);

  // Probar específicamente los números de fila pedidos: 4, 21, 27, 48, 113, 134
  const casosRegulPedidos = [4, 21, 27, 48, 113, 134];
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
      console.log(`\nFila #${numFila} -> Cod: ${tramiteBD.codigo_tramite} | Quipux: ${tramiteBD.numero_quipux}`);
      console.log(`   Fechas BD: Entrega/Rec=${tramiteBD.fecha_entrega_control_previo?.toISOString().split("T")[0] || tramiteBD.fecha_recepcion_fisica?.toISOString().split("T")[0]}`);
      console.log(`              Pago=${tramiteBD.fecha_pago?.toISOString().split("T")[0]}`);
      console.log(`              JCO=${tramiteBD.fecha_aprobacion_presupuesto?.toISOString().split("T")[0]}`);
      console.log(`   Tramo Presupuesto Hábiles: ${calculo.tramo_presupuesto_habiles} días`);
      console.log(`   Tramo Contabilidad/Tesorería: ${calculo.historico_parcial?.tramo_contabilidad_tesoreria_habiles} días`);
      console.log(`   Tiempo Real Trabajado: ${calculo.tiempo_real_trabajado_dias} días`);
      console.log(`   Alerta de Inconsistencia: ${calculo.alerta_inconsistencia} | Motivos: ${calculo.motivos_alerta.join("; ") || "Ninguno"}`);
    }
  }

  // =========================================================================
  // BLOQUE 2: SEPARACIÓN DE RELOJES Y EXCLUSIONES DEL SLA
  // =========================================================================
  console.log("\n===============================================================================");
  console.log(">>> BLOQUE 2: SEPARACIÓN DE RELOJES Y EXCLUSIONES DEL SLA");
  console.log("===============================================================================");

  // 2.1 Verificación de cálculo de días hábiles: fines de semana y feriados
  console.log(`\n--- 2.1 VERIFICACIÓN DE FINES DE SEMANA Y FERIADOS EN MOTOR ---`);
  const dLunes = new Date(Date.UTC(2026, 0, 12));
  const dViernes = new Date(Date.UTC(2026, 0, 16));
  const dDomingo = new Date(Date.UTC(2026, 0, 18));
  const habilesSemana = calcularDiasHabilesBrutos(dLunes, dViernes, feriadosSet);
  const habilesConFinSem = calcularDiasHabilesBrutos(dLunes, dDomingo, feriadosSet);
  console.log(`Prueba Lun-Vie (12-16 Ene 2026): ${habilesSemana} días hábiles (Esperado: 5)`);
  console.log(`Prueba Lun-Dom (12-18 Ene 2026): ${habilesConFinSem} días hábiles (Esperado: 5)`);

  const dCarnavalInicio = new Date(Date.UTC(2026, 1, 13)); // Viernes 13 Feb
  const dCarnavalFin = new Date(Date.UTC(2026, 1, 18)); // Miércoles 18 Feb
  const habilesCarnaval = calcularDiasHabilesBrutos(dCarnavalInicio, dCarnavalFin, feriadosSet);
  console.log(`Prueba Carnaval (Vie 13 a Mie 18 Feb 2026): ${habilesCarnaval} días hábiles (Esperado: 2 -> Vie 13 y Mie 18)`);

  const dSantoInicio = new Date(Date.UTC(2026, 3, 2)); // Jueves 2 Abr
  const dSantoFin = new Date(Date.UTC(2026, 3, 6)); // Lunes 6 Abr
  const habilesSemanaSanta = calcularDiasHabilesBrutos(dSantoInicio, dSantoFin, feriadosSet);
  console.log(`Prueba Viernes Santo (Jue 2 a Lun 6 Abr 2026): ${habilesSemanaSanta} días hábiles (Esperado: 2 -> Jue 2 y Lun 6)`);

  // 2.2 Verificación de tramo_secretaria_habiles y su impacto en SLA
  console.log(`\n--- 2.2 VERIFICACIÓN DE TRAMO SECRETARÍA Y CUMPLIMIENTO DEL SLA ---`);
  const muestraConSecretaria = await prisma.tramites.findMany({
    where: {
      AND: [
        { fecha_recepcion_fisica: { not: null } },
        { fecha_entrega_control_previo: { not: null } },
      ],
    },
    take: 5,
    include: { historial_movimientos: true },
  });

  for (const t of muestraConSecretaria) {
    const fRec = t.fecha_recepcion_fisica!;
    const fEnt = t.fecha_entrega_control_previo!;
    const diasSec = calcularDiasHabilesBrutos(fRec, fEnt, feriadosSet);
    const res = calcularTiemposTramite(t as any, feriadosBD);
    console.log(`Tramite ${t.codigo_tramite} (${t.numero_quipux}):`);
    console.log(`   Rec=${fRec.toISOString().split("T")[0]} | Ent=${fEnt.toISOString().split("T")[0]} -> Tramo Secretaría: ${res.historico_parcial?.tramo_secretaria_habiles}d (cálculo directo: ${diasSec}d)`);
    console.log(`   Tramo Presupuesto: ${res.tramo_presupuesto_habiles}d`);
    console.log(`   Tiempo Real Trabajado: ${res.tiempo_real_trabajado_dias}d`);
    console.log(`   ¿Tiempo Real Trabajado incluye Tramo Secretaría?: ${res.tiempo_real_trabajado_dias === (res.tramo_presupuesto_habiles || 0) + diasSec ? "SÍ (ALERTA)" : "NO (CORRECTO)"}`);
  }

  // 2.3 Verificación de los 35 trámites en estado OBSERVADO (17 en PAGO + 18 en GARANTÍA)
  console.log(`\n--- 2.3 ESTADO OBSERVADO (35 TRÁMITES) Y SU COMPORTAMIENTO SLA ---`);
  const tramitesObservados = await prisma.tramites.findMany({
    where: { estado_general: "OBSERVADO" },
    include: { historial_movimientos: true },
  });

  console.log(`Total trámites en estado_general = 'OBSERVADO': ${tramitesObservados.length}`);
  const obsPago = tramitesObservados.filter(t => t.codigo_tramite.startsWith("TRM-2026-P-"));
  const obsGarantia = tramitesObservados.filter(t => t.codigo_tramite.startsWith("TRM-2026-G-"));
  console.log(`   - En PAGO: ${obsPago.length} (Esperado: 17)`);
  console.log(`   - En GARANTÍA: ${obsGarantia.length} (Esperado: 18)`);

  let countPausados = 0;
  let distSemaforo: Record<string, number> = { VERDE: 0, AMBAR: 0, ROJO: 0, PENDIENTE: 0, EXENTO: 0, OTRO: 0 };

  for (const t of tramitesObservados) {
    if (t.esta_pausado) countPausados++;

    const res = calcularTiemposTramite(t as any, feriadosBD);
    
    // Evaluar semáforo según reportesTiemposService
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

    distSemaforo[semaforo] = (distSemaforo[semaforo] || 0) + 1;
  }

  console.log(`   - Trámites con esta_pausado = true: ${countPausados} de ${tramitesObservados.length}`);
  console.log(`   - Distribución de alerta_sla según lógica oficial:`, distSemaforo);

  console.log(`\nMuestra de 5 trámites OBSERVADOS:`);
  for (const t of tramitesObservados.slice(0, 5)) {
    const res = calcularTiemposTramite(t as any, feriadosBD);
    console.log(`   ${t.codigo_tramite} (${t.numero_quipux}): esta_pausado=${t.esta_pausado} | motivo_pausa="${t.motivo_pausa || ''}" | dias_pausa=${res.dias_pausa} | T.Real=${res.tiempo_real_trabajado_dias}d | TramoPres=${res.tramo_presupuesto_habiles}d`);
  }

  // =========================================================================
  // BLOQUE 3: TRAZABILIDAD EN HISTORIAL_MOVIMIENTOS Y ANALISTAS COMPARTIDOS
  // =========================================================================
  console.log("\n===============================================================================");
  console.log(">>> BLOQUE 3: TRAZABILIDAD EN HISTORIAL_MOVIMIENTOS");
  console.log("===============================================================================");

  // 3.1 Trámites con cadena de analistas (ej. RG/DB, MS/HA, RG/NM/RG)
  console.log(`\n--- 3.1 TRÁMITES CON CADENA DE ANALISTAS COMPARTIDOS ---`);
  const todosTramites = await prisma.tramites.findMany({
    include: {
      historial_movimientos: {
        include: {
          usuarios_historial_movimientos_id_usuario_entregaTousuarios: true,
          usuarios_historial_movimientos_id_usuario_recibeTousuarios: true,
        },
        orderBy: { id_movimiento: "asc" },
      },
    },
  });

  const compartidos: any[] = [];
  for (const t of todosTramites) {
    const cal = evaluarCalidadDato(t as any);
    if (cal.analistaCompartido || (t.anexos && t.anexos.includes("/")) || ((t as any).comentarios_bitacora && (t as any).comentarios_bitacora.includes("/"))) {
      compartidos.push({ tramite: t, evalCal: cal });
    }
  }

  console.log(`Total de trámites identificados con analistas compartidos: ${compartidos.length}`);

  console.log(`\nInspección detallada de movimientos en casos representativos de analistas compartidos:`);
  for (const item of compartidos.slice(0, 8)) {
    const t = item.tramite;
    console.log(`\nTrámite: ${t.codigo_tramite} | Quipux: ${t.numero_quipux}`);
    console.log(`   Anexos: "${t.anexos || ''}" | Comentarios: "${t.comentarios_bitacora || ''}"`);
    console.log(`   Analistas detectados: ${item.evalCal.analistas.join(", ")} | Compartido=${item.evalCal.analistaCompartido}`);
    console.log(`   Movimientos (${t.historial_movimientos.length}):`);
    for (const m of t.historial_movimientos) {
      const uEnt = m.usuarios_historial_movimientos_id_usuario_entregaTousuarios?.nombre_completo || "N/A";
      const uRec = m.usuarios_historial_movimientos_id_usuario_recibeTousuarios?.nombre_completo || "N/A";
      console.log(`     - [${m.tipo_accion}] Fecha: ${m.fecha_hora?.toISOString().split("T")[0] || "null"} | Entrega: ${uEnt} -> Recibe: ${uRec} | Coment: "${m.comentarios || ''}"`);
    }
  }

  // 3.2 Endpoint de Auditoría (/api/admin/auditoria)
  console.log(`\n--- 3.2 AUDITORÍA DE MOVIMIENTOS TOTALES EN BD ---`);
  const totalMovimientos = await prisma.historial_movimientos.count();
  console.log(`Total registros en tabla historial_movimientos: ${totalMovimientos}`);

  const conteoPorAccion = await prisma.historial_movimientos.groupBy({
    by: ["tipo_accion"],
    _count: { id_movimiento: true },
    orderBy: { _count: { id_movimiento: "desc" } },
  });

  console.log(`Distribución de tipos de acción en historial_movimientos:`);
  for (const a of conteoPorAccion) {
    console.log(`   - ${a.tipo_accion}: ${a._count.id_movimiento}`);
  }

  console.log(`\nVerificación del comportamiento de /api/admin/auditoria:`);
  console.log(`   - Take límite actual en código: 200`);
  console.log(`   - Impacto: Al haber ${totalMovimientos} movimientos, un 'findMany' sin paginación devuelve los 200 más recientes`);
  console.log(`   - Filtros soportados en backend: id_tramite, tipo_accion, id_usuario, search`);

  console.log("\n===============================================================================");
  console.log("            AUDITORÍA QA-2 FINALIZADA SATISFACTORIAMENTE                       ");
  console.log("===============================================================================");
}

runQA2()
  .catch(err => {
    console.error("Error en ejecución de QA-2:", err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
