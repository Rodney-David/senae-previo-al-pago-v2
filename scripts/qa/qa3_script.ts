import { prisma } from "../../src/lib/prisma";
import {
  obtenerAuditoriaTramites,
  obtenerAuditoriaProcesos,
  obtenerRendimientoFuncionarios,
  FiltrosReportesTiempos,
} from "../../src/services/reportesTiemposService";
import { GET } from "../../src/app/api/reportes/route";
import { NextRequest } from "next/server";

async function runQA3() {
  console.log("===============================================================================");
  console.log("    MISIÓN AGENTE QA-3: MATRIZ COMBINATORIA DE FILTROS Y REPORTERÍA API       ");
  console.log("===============================================================================\n");

  const totalGeneralBD = await prisma.tramites.count();
  const total2026BD = await prisma.tramites.count({
    where: { codigo_tramite: { startsWith: "TRM-2026-" } },
  });
  console.log(`[BASE DE DATOS] Total general de trámites en tabla: ${totalGeneralBD}`);
  console.log(`[BASE DE DATOS] Total trámites migrados 2026 (TRM-2026-): ${total2026BD}`);

  // =========================================================================
  // PUNTO 1: PRUEBA DE CONSISTENCIA ADITIVA (La suma de las partes = el todo)
  // =========================================================================
  console.log("\n===============================================================================");
  console.log(">>> 1. PRUEBA DE CONSISTENCIA ADITIVA");
  console.log("===============================================================================");

  // 1.1 Padre de gestión: TODOS vs PAGO + GARANTIA
  console.log("\n--- 1.1 Padre de Gestión: TODOS vs PAGO + GARANTÍA ---");
  const tTodos = await obtenerAuditoriaTramites({ padre_gestion: "TODOS" }, { limite: 50000 });
  const tPago = await obtenerAuditoriaTramites({ padre_gestion: "PAGO" }, { limite: 50000 });
  const tGarantia = await obtenerAuditoriaTramites({ padre_gestion: "GARANTIA" }, { limite: 50000 });

  const cTodos = tTodos.kpis.total_tramites_analizados;
  const cPago = tPago.kpis.total_tramites_analizados;
  const cGarantia = tGarantia.kpis.total_tramites_analizados;
  const sumaPartes = cPago + cGarantia;

  console.log(`- obtenerAuditoriaTramites(padre_gestion="TODOS"):    ${cTodos}`);
  console.log(`- obtenerAuditoriaTramites(padre_gestion="PAGO"):     ${cPago}`);
  console.log(`- obtenerAuditoriaTramites(padre_gestion="GARANTIA"): ${cGarantia}`);
  console.log(`- Suma (PAGO + GARANTÍA):                             ${sumaPartes}`);
  console.log(`- Consistencia Aditiva: ${cTodos === sumaPartes ? "✅ EXACTA (cero huérfanos)" : "❌ DISCORDANCIA"}`);

  // Verificar en GET /api/reportes
  console.log("\n--- Verificación en GET /api/reportes ---");
  const reqApiTodos = new NextRequest("http://localhost:3000/api/reportes?padre_gestion=TODOS");
  const resApiTodos = await (await GET(reqApiTodos)).json();

  const reqApiPago = new NextRequest("http://localhost:3000/api/reportes?padre_gestion=PAGO");
  const resApiPago = await (await GET(reqApiPago)).json();

  const reqApiGarantia = new NextRequest("http://localhost:3000/api/reportes?padre_gestion=GARANTIA");
  const resApiGarantia = await (await GET(reqApiGarantia)).json();

  console.log(`- API GET ?padre_gestion=TODOS    -> total: ${resApiTodos.conteos?.total}, pagos: ${resApiTodos.conteos?.pagos}, garantias: ${resApiTodos.conteos?.garantias}`);
  console.log(`- API GET ?padre_gestion=PAGO     -> total: ${resApiPago.conteos?.total}, pagos: ${resApiPago.conteos?.pagos}, garantias: ${resApiPago.conteos?.garantias}`);
  console.log(`- API GET ?padre_gestion=GARANTIA -> total: ${resApiGarantia.conteos?.total}, pagos: ${resApiGarantia.conteos?.pagos}, garantias: ${resApiGarantia.conteos?.garantias}`);

  // Verificar desglose específico sobre el universo 2026 (1636 trámites)
  const p2026Pago = tPago.tramites.filter(t => t.codigo_tramite.startsWith("TRM-2026-")).length;
  const p2026Garantia = tGarantia.tramites.filter(t => t.codigo_tramite.startsWith("TRM-2026-")).length;
  console.log(`\n- Trámites 2026 en PAGO:      ${p2026Pago} (Esperado oficial: 1099) -> ${p2026Pago === 1099 ? "✅ EXACTO" : "❌ DIFERENCIA"}`);
  console.log(`- Trámites 2026 en GARANTÍA:  ${p2026Garantia} (Esperado oficial: 537)  -> ${p2026Garantia === 537 ? "✅ EXACTO" : "❌ DIFERENCIA"}`);
  console.log(`- Total 2026 Suma:            ${p2026Pago + p2026Garantia} (Esperado oficial: 1636) -> ${p2026Pago + p2026Garantia === 1636 ? "✅ EXACTO" : "❌ DIFERENCIA"}`);

  // 1.2 Estado filtro: COMPLETADOS + EN_CURSO vs Total
  console.log("\n--- 1.2 Estado Filtro: COMPLETADOS + EN_CURSO vs Total General ---");
  const tCompletados = await obtenerAuditoriaTramites({ estado_filtro: "COMPLETADOS" }, { limite: 50000 });
  const tEnCurso = await obtenerAuditoriaTramites({ estado_filtro: "EN_CURSO" }, { limite: 50000 });

  const cCompletados = tCompletados.kpis.total_tramites_analizados;
  const cEnCurso = tEnCurso.kpis.total_tramites_analizados;
  const sumaFiltroEstados = cCompletados + cEnCurso;

  console.log(`- obtenerAuditoriaTramites(estado_filtro="COMPLETADOS"): ${cCompletados}`);
  console.log(`- obtenerAuditoriaTramites(estado_filtro="EN_CURSO"):     ${cEnCurso}`);
  console.log(`- Suma (COMPLETADOS + EN_CURSO):                          ${sumaFiltroEstados}`);
  console.log(`- Total General:                                          ${cTodos}`);
  console.log(`- Consistencia Aditiva Estados: ${sumaFiltroEstados === cTodos ? "✅ EXACTA (100% trámites clasificados sin pérdidas)" : "❌ DISCORDANCIA"}`);

  // Verificar cómo se clasifica cada estado de la base de datos
  console.log("\n--- Auditoría de Clasificación por Estados Oficiales ---");
  const estadosDB = await prisma.tramites.groupBy({
    by: ["estado_general"],
    _count: true,
  });

  const ESTADOS_COMPLETADOS_DEF = ["PAGADO", "ARCHIVO", "DEVUELTO", "INSUBSISTENTE", "ANULADO"];

  for (const item of estadosDB) {
    const esCompletado = ESTADOS_COMPLETADOS_DEF.includes(item.estado_general);
    const clasific = esCompletado ? "COMPLETADOS" : "EN_CURSO";
    console.log(`  * Estado '${item.estado_general.padEnd(14)}': ${String(item._count).padStart(5)} trámites -> Clasificado en: [${clasific}]`);
  }

  // Verificar si hay estados huérfanos o con texto vacío
  const estadosHuerfanos = await prisma.tramites.findMany({
    where: {
      estado_general: "",
    },
    select: { id_tramite: true, codigo_tramite: true, estado_general: true },
  });
  console.log(`- Trámites con estado_general vacío: ${estadosHuerfanos.length} -> ${estadosHuerfanos.length === 0 ? "✅ NINGUNO" : "❌ HUÉRFANOS ENCONTRADOS"}`);

  // =========================================================================
  // PUNTO 2: TORTURA DE LOS 8 FILTROS DE construirWherePrisma
  // =========================================================================
  console.log("\n===============================================================================");
  console.log(">>> 2. TORTURA DE LOS 8 FILTROS DE construirWherePrisma");
  console.log("===============================================================================");

  // 2.1 Criterio de Fecha en sus 4 modos (Rango: 2026-01-01 a 2026-06-30)
  console.log("\n--- 2.1 Filtro por criterio_fecha (Rango: 2026-01-01 a 2026-06-30) ---");
  const criterios = ["INGRESO", "RECEPCION_FISICA", "MEMORANDO", "ULTIMO_MOVIMIENTO"];
  for (const crit of criterios) {
    const res = await obtenerAuditoriaTramites({
      criterio_fecha: crit,
      fecha_desde: "2026-01-01",
      fecha_hasta: "2026-06-30",
    }, { limite: 50000 });

    const total = res.kpis.total_tramites_analizados;
    const fuera = cTodos - total;
    console.log(`  * Modo [${crit.padEnd(18)}]: ${String(total).padStart(5)} dentro de rango | ${String(fuera).padStart(4)} fuera de rango`);
  }

  // Análisis detallado de qué fechas están fuera del semestre 2026
  console.log("\n--- Detalle de Trámites Fuera del Rango 2026-01-01 .. 2026-06-30 ---");
  const antes2026 = await prisma.tramites.count({
    where: { fecha_ingreso: { lt: new Date("2026-01-01T00:00:00.000Z") } },
  });
  const despuesJunio2026 = await prisma.tramites.count({
    where: { fecha_ingreso: { gt: new Date("2026-06-30T23:59:59.999Z") } },
  });
  const fechaIngresoNull = await prisma.tramites.count({
    where: { fecha_ingreso: null },
  });
  console.log(`  * Trámites con fecha_ingreso < 2026-01-01 (diciembre 2025 o anteriores): ${antes2026}`);
  console.log(`  * Trámites con fecha_ingreso > 2026-06-30 (julio/agosto/octubre 2026):     ${despuesJunio2026}`);
  console.log(`  * Trámites con fecha_ingreso nula:                                         ${fechaIngresoNull}`);

  // Muestra de trámites con fechas 2025 o julio+ 2026
  const muestra2025 = await prisma.tramites.findMany({
    where: { fecha_ingreso: { lt: new Date("2026-01-01T00:00:00.000Z") } },
    select: { codigo_tramite: true, numero_quipux: true, fecha_ingreso: true, proveedor_beneficiario: true },
    take: 5,
  });
  console.log("  * Muestra de trámites < 2026:", muestra2025);

  const muestraDespuesJunio = await prisma.tramites.findMany({
    where: { fecha_ingreso: { gt: new Date("2026-06-30T23:59:59.999Z") } },
    select: { codigo_tramite: true, numero_quipux: true, fecha_ingreso: true, proveedor_beneficiario: true },
    take: 5,
  });
  console.log("  * Muestra de trámites > junio 2026:", muestraDespuesJunio);

  // 2.2 Filtro por id_area para las 6 áreas institucionales
  console.log("\n--- 2.2 Filtro por id_area (Custodia Actual en Áreas Institucionales) ---");
  const areasCatalogo = await prisma.areas.findMany({ orderBy: { id_area: "asc" } });
  let sumaTramitesPorArea = 0;
  for (const a of areasCatalogo) {
    const res = await obtenerAuditoriaTramites({ id_area: a.id_area }, { limite: 50000 });
    const cnt = res.kpis.total_tramites_analizados;
    sumaTramitesPorArea += cnt;
    console.log(`  * Área ID ${a.id_area} [${a.codigo.padEnd(6)}] ${a.nombre.padEnd(25)}: ${String(cnt).padStart(5)} trámites`);
  }
  console.log(`  -> Suma por todas las áreas: ${sumaTramitesPorArea} vs Total General: ${cTodos}`);

  // 2.3 Filtro por id_funcionario para cada analista (Cotejo con Matriz de Verdad)
  console.log("\n--- 2.3 Filtro por id_funcionario (Cotejo con Matriz de Verdad) ---");
  const analistasTarget = [
    { iniciales: "DB", nombre: "David Barberan" },
    { iniciales: "NM", nombre: "Nandy Morales" },
    { iniciales: "RG", nombre: "Ricardo Gonzalez" },
    { iniciales: "MS", nombre: "María Silva" },
    { iniciales: "HA", nombre: "Hilda Arriaga" },
    { iniciales: "ID", nombre: "Ivonne de la Torre" },
    { iniciales: "MR", nombre: "Maria Rodriguez" },
    { iniciales: "JM", nombre: "Ing. Carlos Mendoza" },
  ];

  const matrizVerdad: Record<string, number> = {
    DB: 365,
    NM: 342,
    RG: 333,
    MS: 286,
    HA: 198,
    ID: 59,
    MR: 51,
    JM: 1,
  };

  console.log("┌───────────┬────┬─────────────────────────────┬────────────────────┬──────────┬──────────────┬────────────────┐");
  console.log("│ Iniciales │ ID │ Funcionario                 │ ANALISTA_HISTORICO │ Matriz   │ Estado       │ CUSTODIO_ACT   │");
  console.log("├───────────┼────┼─────────────────────────────┼────────────────────┼──────────┼──────────────┼────────────────┤");

  for (const ana of analistasTarget) {
    const usr = await prisma.usuarios.findFirst({
      where: {
        OR: [
          { iniciales: ana.iniciales },
          { nombre_completo: { contains: ana.nombre } },
        ],
      },
    });

    if (!usr) continue;

    const resHist = await obtenerAuditoriaTramites({
      id_funcionario: usr.id_usuario,
      modo_funcionario: "ANALISTA_HISTORICO",
    }, { limite: 50000 });

    const resCust = await obtenerAuditoriaTramites({
      id_funcionario: usr.id_usuario,
      modo_funcionario: "CUSTODIO_ACTUAL",
    }, { limite: 50000 });

    const cntHist = resHist.kpis.total_tramites_analizados;
    const cntCust = resCust.kpis.total_tramites_analizados;
    const esperado = matrizVerdad[ana.iniciales];
    const match = cntHist === esperado ? "✅ COINCIDE" : "❌ DISCORDE";

    console.log(
      `│ ${ana.iniciales.padEnd(9)} │ ${String(usr.id_usuario).padStart(2)} │ ${usr.nombre_completo.padEnd(27)} │ ${String(cntHist).padStart(18)} │ ${String(esperado).padStart(8)} │ ${match.padEnd(12)} │ ${String(cntCust).padStart(14)} │`
    );
  }
  console.log("└───────────┴────┴─────────────────────────────┴────────────────────┴──────────┴──────────────┴────────────────┘");

  // 2.4 Combinaciones críticas pedidas por el cliente
  console.log("\n--- 2.4 Combinaciones Críticas Solicitadas ---");

  // Combinación A: id_area = Presupuesto (ID 2) + estado_general = REVISION
  const combA = await obtenerAuditoriaTramites({
    id_area: 2,
    estado_general: "REVISION",
  }, { limite: 50000 });
  console.log(`  * Combinación A [id_area = 2 (Presupuesto) + estado_general = 'REVISION']:`);
  console.log(`    Total trámites encontrados: ${combA.kpis.total_tramites_analizados}`);
  console.log(`    Muestra de trámites:`, combA.tramites.slice(0, 3).map(t => ({
    codigo: t.codigo_tramite,
    quipux: t.numero_quipux,
    custodio: t.custodio_actual,
    area: t.area_actual,
    estado: t.estado_general,
    sub_estado: t.sub_estado,
  })));

  // Combinación B: id_funcionario = ID de DB + estado_general = OBSERVADO
  const dbUser = await prisma.usuarios.findFirst({ where: { iniciales: "DB" } });
  if (dbUser) {
    const combB_Hist = await obtenerAuditoriaTramites({
      id_funcionario: dbUser.id_usuario,
      modo_funcionario: "ANALISTA_HISTORICO",
      estado_general: "OBSERVADO",
    }, { limite: 50000 });

    const combB_Cust = await obtenerAuditoriaTramites({
      id_funcionario: dbUser.id_usuario,
      modo_funcionario: "CUSTODIO_ACTUAL",
      estado_general: "OBSERVADO",
    }, { limite: 50000 });

    const combB_Todos = await obtenerAuditoriaTramites({
      id_funcionario: dbUser.id_usuario,
      modo_funcionario: "TODOS",
      estado_general: "OBSERVADO",
    }, { limite: 50000 });

    console.log(`  * Combinación B [id_funcionario = ${dbUser.id_usuario} (David Barberan) + estado_general = 'OBSERVADO']:`);
    console.log(`    - Con modo ANALISTA_HISTORICO: ${combB_Hist.kpis.total_tramites_analizados} trámites`);
    console.log(`    - Con modo CUSTODIO_ACTUAL:    ${combB_Cust.kpis.total_tramites_analizados} trámites`);
    console.log(`    - Con modo TODOS (OR):         ${combB_Todos.kpis.total_tramites_analizados} trámites`);
    console.log(`    Muestra de trámites en observación de DB:`, combB_Hist.tramites.slice(0, 3).map(t => ({
      codigo: t.codigo_tramite,
      quipux: t.numero_quipux,
      proveedor: t.proveedor_beneficiario,
      pausado: t.esta_pausado,
      motivo_pausa: t.motivo_pausa,
    })));
  }

  // 2.5 Búsqueda textual por RUC, proveedor, Quipux y código
  console.log("\n--- 2.5 Búsqueda Textual Programática ---");
  const casosBusqueda = [
    { campo: "RUC", valor: "0968599020001", esperadoMin: 1 },
    { campo: "Proveedor", valor: "CNEL", esperadoMin: 1 },
    { campo: "Quipux", valor: "SENAE-CDGU-2026-0007-M", esperadoMin: 1 },
    { campo: "Código", valor: "TRM-2026-P-0001", esperadoMin: 1 },
  ];

  for (const caso of casosBusqueda) {
    const resB = await obtenerAuditoriaTramites({ busqueda: caso.valor }, { limite: 50000 });
    const cnt = resB.kpis.total_tramites_analizados;
    const match = cnt >= caso.esperadoMin ? "✅ ENCONTRADO" : "❌ NO ENCONTRADO";
    console.log(`  * Búsqueda por ${caso.campo.padEnd(9)} '${caso.valor}': ${cnt} trámite(s) -> ${match}`);
    if (cnt > 0) {
      const primero = resB.tramites[0];
      console.log(`    -> Detalle: ID ${primero.id_tramite} | Código: ${primero.codigo_tramite} | Quipux: ${primero.numero_quipux} | RUC: ${primero.ruc_proveedor} | Prov: ${primero.proveedor_beneficiario}`);
    }
  }

  // 2.6 Sub-estado y Tipo de Gestión
  console.log("\n--- 2.6 Filtros por sub_estado y tipo_gestion ---");
  const subEstados = [
    "JUSTIFICACION_CONTABILIDAD",
    "EN_CONTABILIDAD",
    "ESPERA_FACTURA",
    "OBSERVADO",
    "EN_REVISION_PRESUPUESTO",
    "EN_REVISION",
  ];
  for (const se of subEstados) {
    const res = await obtenerAuditoriaTramites({ sub_estado: se }, { limite: 50000 });
    console.log(`  * sub_estado = '${se.padEnd(28)}': ${String(res.kpis.total_tramites_analizados).padStart(4)} trámites`);
  }

  const tiposGestion = ["PAGO", "ARCHIVO", "EXPEDIENTE", "JUSTIFICACION"];
  for (const tg of tiposGestion) {
    const res = await obtenerAuditoriaTramites({ tipo_gestion: tg }, { limite: 50000 });
    console.log(`  * tipo_gestion = '${tg.padEnd(20)}': ${String(res.kpis.total_tramites_analizados).padStart(4)} trámites`);
  }

  // =========================================================================
  // PUNTO 3: AUDITORÍA DE PRODUCTIVIDAD (obtenerRendimientoFuncionarios)
  // =========================================================================
  console.log("\n===============================================================================");
  console.log(">>> 3. AUDITORÍA DE PRODUCTIVIDAD DE FUNCIONARIOS");
  console.log("===============================================================================");

  const repRendimiento = await obtenerRendimientoFuncionarios();
  console.log(`- Total de funcionarios en el catálogo procesados: ${repRendimiento.funcionarios.length}`);
  console.log(`- Trámites totales evaluados en métricas históricas: ${repRendimiento.kpis_globales.total_tramites_evaluados}`);
  console.log(`- Mediana general institucional de días: ${repRendimiento.kpis_globales.mediana_general_dias}`);
  console.log(`- Tasa de cumplimiento institucional global: ${repRendimiento.kpis_globales.tasa_cumplimiento_general}%`);

  console.log("\n--- Tabla Comparativa de las 2 Dimensiones de Productividad ---");
  console.log("Dimensión 1 = Histórica (id_analista_presupuesto_previo) | Dimensión 2 = Custodia Actual (id_custodio_actual)");
  console.log("┌────┬───────────┬───────────────────────────┬──────────────┬────────────┬─────────────┬───────────┬──────────────┬──────────────┬─────────────┐");
  console.log("│ ID │ Iniciales │ Funcionario               │ Asign. Hist. │ Despachad. │ % Prod.     │ SLA Cumpl │ Custodia Hoy │ En Revisión  │ Observados  │");
  console.log("├────┼───────────┼───────────────────────────┼──────────────┼────────────┼─────────────┼───────────┼──────────────┼──────────────┼─────────────┤");

  for (const f of repRendimiento.funcionarios) {
    if (["DB", "NM", "RG", "MS", "HA", "ID", "MR", "JM", "SL", "MA", "RI", "MR2", "LZ", "PM"].includes(f.iniciales || "") || f.id_area === 2 || f.id_area === 3) {
      console.log(
        `│ ${String(f.id_usuario).padStart(2)} │ ${(f.iniciales || "N/A").padEnd(9)} │ ${f.nombre_completo.padEnd(25).slice(0, 25)} │ ${String(f.total_asignados_historico).padStart(12)} │ ${String(f.total_despachados).padStart(10)} │ ${String(f.porcentaje_productividad + "%").padStart(11)} │ ${String(f.porcentaje_cumplimiento_sla_presupuesto + "%").padStart(9)} │ ${String(f.total_pendientes_custodia).padStart(12)} │ ${String(f.pendientes_en_revision).padStart(12)} │ ${String(f.pendientes_observados).padStart(11)} │`
      );
    }
  }
  console.log("└────┴───────────┴───────────────────────────┴──────────────┴────────────┴─────────────┴───────────┴──────────────┴──────────────┴─────────────┘");

  // Diagnóstico sobre si está agrupando erróneamente solo por id_custodio_actual
  console.log("\n--- Diagnóstico de Arquitectura de Agrupación de Productividad ---");
  const analistasPresupuestoConCargaHist = repRendimiento.funcionarios.filter(
    f => f.id_area === 2 && f.total_asignados_historico > 0
  );
  console.log(`- Analistas de Presupuesto con trámites históricos reconocidos: ${analistasPresupuestoConCargaHist.length}`);
  for (const a of analistasPresupuestoConCargaHist) {
    const tienePagadosOArchivados = a.total_despachados > 0;
    console.log(`  * ${a.nombre_completo} (${a.iniciales}): Asignados históricamente = ${a.total_asignados_historico}, Despachados (incluye pagados/archivados/contabilidad) = ${a.total_despachados}, Custodia física hoy = ${a.total_pendientes_custodia}`);
    if (tienePagadosOArchivados) {
      console.log(`    -> ✅ Correcto: No pierde sus trámites ya pagados/archivados.`);
    } else {
      console.log(`    -> ⚠️ Alerta: Cero trámites despachados.`);
    }
  }

  // Sección de Análisis Compartido
  console.log("\n--- Auditoría de Análisis Compartido (Co-autorías) ---");
  const comp = repRendimiento.analisis_compartido;
  console.log(`- Título: ${comp.titulo}`);
  console.log(`- Total trámites compartidos: ${comp.total_tramites}`);
  console.log(`- Mediana días despacho: ${comp.mediana_dias_despacho} días`);
  console.log(`- Percentil 90 (P90): ${comp.p90_dias_despacho} días`);
  console.log(`- Tasa de cumplimiento: ${comp.tasa_cumplimiento}%`);
  console.log(`- Desglose por grupos de analistas compartidos:`);
  for (const g of comp.grupos) {
    console.log(`  * [${g.analistas.padEnd(15)}]: ${String(g.total_tramites).padStart(3)} trámites | Mediana: ${g.mediana_dias_despacho} d | Cumplimiento: ${g.tasa_cumplimiento}%`);
  }

  // Auditoría de Procesos
  console.log("\n--- Auditoría de Procesos (obtenerAuditoriaProcesos) ---");
  const proc = await obtenerAuditoriaProcesos();
  console.log(`- Total tipos de proceso auditados: ${proc.procesos.length}`);
  console.log(`- Total familias canónicas: ${proc.familias.length}`);
  console.log(`- Resumen global: Mediana global = ${proc.resumen_global.mediana_global_dias} días | P90 = ${proc.resumen_global.p90_global_dias} días | Tasa global = ${proc.resumen_global.tasa_cumplimiento_global}% | Fase crítica = ${proc.resumen_global.fase_critica_institucional}`);

  console.log("\n===============================================================================");
  console.log("            FIN DE EJECUCIÓN PROGRAMÁTICA QA-3                                 ");
  console.log("===============================================================================");
}

runQA3().catch(console.error);
