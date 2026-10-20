import { prisma } from "../../src/lib/prisma";

async function main() {
  console.log("===============================================================================");
  console.log("            EJECUTANDO AUDITORÍA FORENSE QA-1: MIGRACIÓN Y BD                  ");
  console.log("===============================================================================\n");

  // -----------------------------------------------------------------------------
  // 1. CONTEO EXACTO DE FILAS
  // -----------------------------------------------------------------------------
  console.log(">>> [PUNTO 1] CONTEO EXACTO DE FILAS MIGRADAS");
  const totalTramitesBD = await prisma.tramites.count();
  const totalPago = await prisma.tramites.count({
    where: { codigo_tramite: { startsWith: "TRM-2026-P-" } },
  });
  const totalGarantia = await prisma.tramites.count({
    where: { codigo_tramite: { startsWith: "TRM-2026-G-" } },
  });
  const totalMigrados = totalPago + totalGarantia;
  const otrosTramites = await prisma.tramites.count({
    where: {
      AND: [
        { codigo_tramite: { not: { startsWith: "TRM-2026-P-" } } },
        { codigo_tramite: { not: { startsWith: "TRM-2026-G-" } } },
      ],
    },
  });

  const pagoPorPadre = await prisma.tramites.count({ where: { padre_gestion: "PAGO" } });
  const garantiaPorPadre = await prisma.tramites.count({ where: { padre_gestion: "GARANTIA" } });

  console.log(`- Total registros en BD: ${totalTramitesBD}`);
  console.log(`- Trámites PAGO (TRM-2026-P-): ${totalPago} (Esperado: 1099) | padre_gestion="PAGO": ${pagoPorPadre}`);
  console.log(`- Trámites GARANTÍA (TRM-2026-G-): ${totalGarantia} (Esperado: 537) | padre_gestion="GARANTIA": ${garantiaPorPadre}`);
  console.log(`- Total Migrados 2026: ${totalMigrados} (Esperado: 1636)`);
  console.log(`- Otros trámites (no 2026 / pruebas previas): ${otrosTramites}`);

  // -----------------------------------------------------------------------------
  // 2. CUADRE FINANCIERO Y ALTA CUANTÍA
  // -----------------------------------------------------------------------------
  console.log("\n>>> [PUNTO 2] CUADRE FINANCIERO Y ALTA CUANTÍA");
  
  // PAGO
  const tramitesPago = await prisma.tramites.findMany({
    where: { codigo_tramite: { startsWith: "TRM-2026-P-" } },
    select: { id_tramite: true, monto_total: true, es_alta_cuantia: true },
  });
  let sumaMontoPago = 0;
  let countAltaCuantiaPago = 0;
  let sumaAltaCuantiaPago = 0;
  for (const t of tramitesPago) {
    const val = Number(t.monto_total);
    sumaMontoPago += val;
    if (t.es_alta_cuantia) {
      countAltaCuantiaPago++;
      sumaAltaCuantiaPago += val;
    }
  }

  // GARANTIA
  const tramitesGarantia = await prisma.tramites.findMany({
    where: { codigo_tramite: { startsWith: "TRM-2026-G-" } },
    select: { id_tramite: true, monto_total: true, es_alta_cuantia: true },
  });
  let sumaMontoGarantia = 0;
  let countAltaCuantiaGarantia = 0;
  let sumaAltaCuantiaGarantia = 0;
  for (const t of tramitesGarantia) {
    const val = Number(t.monto_total);
    sumaMontoGarantia += val;
    if (t.es_alta_cuantia) {
      countAltaCuantiaGarantia++;
      sumaAltaCuantiaGarantia += val;
    }
  }

  console.log(`- PAGO Suma Monto Total: $${sumaMontoPago.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} (Esperado: $11,109,966.86)`);
  console.log(`- PAGO Alta Cuantía (es_alta_cuantia=true): ${countAltaCuantiaPago} trámites (Esperado: 73) | Suma: $${sumaAltaCuantiaPago.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`);
  console.log(`- GARANTÍA Suma Monto Total: $${sumaMontoGarantia.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} (Esperado: $1,695,118.85)`);
  console.log(`- GARANTÍA Alta Cuantía (es_alta_cuantia=true): ${countAltaCuantiaGarantia} trámites (Esperado: 38) | Suma: $${sumaAltaCuantiaGarantia.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`);

  // -----------------------------------------------------------------------------
  // 3. CUADRE EXACTO DE LOS 7 ESTADOS OFICIALES (estado_general y sub_estado)
  // -----------------------------------------------------------------------------
  console.log("\n>>> [PUNTO 3] CUADRE EXACTO DE LOS 7 ESTADOS Y SUB-ESTADOS");

  console.log("\n--- HOJA PAGO (TRM-2026-P-) ---");
  const estadosPago = await prisma.tramites.groupBy({
    by: ["estado_general", "sub_estado"],
    where: { codigo_tramite: { startsWith: "TRM-2026-P-" } },
    _count: { id_tramite: true },
  });
  console.table(
    estadosPago.map((e) => ({
      Estado: e.estado_general,
      SubEstado: e.sub_estado,
      Cantidad: e._count.id_tramite,
    }))
  );

  const totalEstadoPago = await prisma.tramites.groupBy({
    by: ["estado_general"],
    where: { codigo_tramite: { startsWith: "TRM-2026-P-" } },
    _count: { id_tramite: true },
  });
  console.log("Totales por Estado General en PAGO:");
  console.table(
    totalEstadoPago.map((e) => ({
      Estado: e.estado_general,
      Cantidad: e._count.id_tramite,
    }))
  );

  console.log("\n--- HOJA GARANTÍA (TRM-2026-G-) ---");
  const estadosGarantia = await prisma.tramites.groupBy({
    by: ["estado_general", "sub_estado"],
    where: { codigo_tramite: { startsWith: "TRM-2026-G-" } },
    _count: { id_tramite: true },
  });
  console.table(
    estadosGarantia.map((e) => ({
      Estado: e.estado_general,
      SubEstado: e.sub_estado,
      Cantidad: e._count.id_tramite,
    }))
  );

  const totalEstadoGarantia = await prisma.tramites.groupBy({
    by: ["estado_general"],
    where: { codigo_tramite: { startsWith: "TRM-2026-G-" } },
    _count: { id_tramite: true },
  });
  console.log("Totales por Estado General en GARANTÍA:");
  console.table(
    totalEstadoGarantia.map((e) => ({
      Estado: e.estado_general,
      Cantidad: e._count.id_tramite,
    }))
  );

  // Investigar los 2 trámites de GARANTIA en DFI
  const garantiasDFI = await prisma.tramites.findMany({
    where: {
      codigo_tramite: { startsWith: "TRM-2026-G-" },
      estado_general: "DFI",
    },
    select: {
      codigo_tramite: true,
      numero_quipux: true,
      proveedor_beneficiario: true,
      estado_general: true,
      sub_estado: true,
      asunto: true,
      anexos: true,
      motivo_observacion: true,
    },
  });
  console.log("\nDetalle de los trámites GARANTÍA en DFI (esperado 1, actual 2):");
  console.table(garantiasDFI);

  // Investigar el trámite con analista previo ID 9 (Abg. Roberto Intriago)
  const garantiaConAnalista9 = await prisma.tramites.findMany({
    where: {
      codigo_tramite: { startsWith: "TRM-2026-G-" },
      id_analista_presupuesto_previo: 9,
    },
    select: {
      codigo_tramite: true,
      numero_quipux: true,
      proveedor_beneficiario: true,
      estado_general: true,
      sub_estado: true,
      asunto: true,
    },
  });
  console.log("\nDetalle del trámite GARANTÍA con id_analista_presupuesto_previo = 9 (Roberto Intriago):");
  console.table(garantiaConAnalista9);


  // -----------------------------------------------------------------------------
  // 4. VERIFICACIÓN DE tipo_gestion (Columna 2 de PAGO)
  // -----------------------------------------------------------------------------
  console.log("\n>>> [PUNTO 4] VERIFICACIÓN DE tipo_gestion (PAGO)");
  const tipoGestionPago = await prisma.tramites.groupBy({
    by: ["tipo_gestion"],
    where: { codigo_tramite: { startsWith: "TRM-2026-P-" } },
    _count: { id_tramite: true },
  });
  console.table(
    tipoGestionPago.map((t) => ({
      TipoGestion: t.tipo_gestion,
      Cantidad: t._count.id_tramite,
    }))
  );

  const tipoGestionGarantia = await prisma.tramites.groupBy({
    by: ["tipo_gestion"],
    where: { codigo_tramite: { startsWith: "TRM-2026-G-" } },
    _count: { id_tramite: true },
  });
  console.log("Tipo Gestión en GARANTÍA:");
  console.table(
    tipoGestionGarantia.map((t) => ({
      TipoGestion: t.tipo_gestion,
      Cantidad: t._count.id_tramite,
    }))
  );

  // -----------------------------------------------------------------------------
  // 5. ATRIBUCIÓN HISTÓRICA DE ANALISTAS (id_analista_presupuesto_previo)
  // -----------------------------------------------------------------------------
  console.log("\n>>> [PUNTO 5] ATRIBUCIÓN HISTÓRICA DE ANALISTAS");
  const analistaNuloPago = await prisma.tramites.count({
    where: {
      codigo_tramite: { startsWith: "TRM-2026-P-" },
      id_analista_presupuesto_previo: null,
    },
  });
  const analistaNuloGarantia = await prisma.tramites.count({
    where: {
      codigo_tramite: { startsWith: "TRM-2026-G-" },
      id_analista_presupuesto_previo: null,
    },
  });

  console.log(`- Trámites con id_analista_presupuesto_previo NULO en PAGO: ${analistaNuloPago} (Esperado: 0)`);
  console.log(`- Trámites con id_analista_presupuesto_previo NULO en GARANTÍA: ${analistaNuloGarantia} (Esperado: 1)`);

  if (analistaNuloGarantia > 0) {
    const tramitesGarantiaNulo = await prisma.tramites.findMany({
      where: {
        codigo_tramite: { startsWith: "TRM-2026-G-" },
        id_analista_presupuesto_previo: null,
      },
      select: {
        codigo_tramite: true,
        numero_quipux: true,
        proveedor_beneficiario: true,
        estado_general: true,
        sub_estado: true,
        asunto: true,
      },
    });
    console.log("Detalle del trámite GARANTÍA con analista nulo:");
    console.table(tramitesGarantiaNulo);
  }

  // Verificar que el analista siga guardado incluso cuando está en PAGADO, ARCHIVO o CONTABILIDAD
  const estadosFinales = ["PAGADO", "ARCHIVO", "CONTABILIDAD"];
  const desgloseFinales = await prisma.tramites.groupBy({
    by: ["estado_general"],
    where: {
      OR: [
        { codigo_tramite: { startsWith: "TRM-2026-P-" } },
        { codigo_tramite: { startsWith: "TRM-2026-G-" } },
      ],
      estado_general: { in: estadosFinales },
      id_analista_presupuesto_previo: { not: null },
    },
    _count: { id_tramite: true },
  });
  console.log("Trámites en PAGADO, ARCHIVO o CONTABILIDAD con analista previo preservado:");
  console.table(
    desgloseFinales.map((d) => ({
      Estado: d.estado_general,
      ConAnalistaPresupuestoPrevio: d._count.id_tramite,
    }))
  );

  // Conteo total por analista en id_analista_presupuesto_previo
  const usuarios = await prisma.usuarios.findMany({
    select: { id_usuario: true, nombre_completo: true, iniciales: true, cargo: true },
  });
  const uMap = new Map(usuarios.map((u) => [u.id_usuario, u]));

  const conteoAnalistasPrevios = await prisma.tramites.groupBy({
    by: ["id_analista_presupuesto_previo"],
    where: {
      OR: [
        { codigo_tramite: { startsWith: "TRM-2026-P-" } },
        { codigo_tramite: { startsWith: "TRM-2026-G-" } },
      ],
    },
    _count: { id_tramite: true },
  });
  console.log("Distribución total de id_analista_presupuesto_previo:");
  console.table(
    conteoAnalistasPrevios.map((c) => {
      const u = c.id_analista_presupuesto_previo ? uMap.get(c.id_analista_presupuesto_previo) : null;
      return {
        ID: c.id_analista_presupuesto_previo,
        Iniciales: u?.iniciales || "NULO",
        Nombre: u?.nombre_completo || "Sin Asignar",
        Tramites: c._count.id_tramite,
      };
    })
  );

  // -----------------------------------------------------------------------------
  // 6. INDEXACIÓN DOCUMENTAL (tramite_referencias)
  // -----------------------------------------------------------------------------
  console.log("\n>>> [PUNTO 6] INDEXACIÓN DOCUMENTAL (tramite_referencias)");
  const totalReferencias = await prisma.tramite_referencias.count();
  const referenciasPorTipo = await prisma.tramite_referencias.groupBy({
    by: ["tipo_documento"],
    _count: { id_referencia: true },
  });
  console.log(`- Total Referencias Documentales creadas: ${totalReferencias}`);
  console.table(
    referenciasPorTipo.map((r) => ({
      TipoDocumento: r.tipo_documento,
      Cantidad: r._count.id_referencia,
    }))
  );

  // Memorandos temporales
  const memorandosTemp = await prisma.tramites.count({
    where: { numero_quipux: { startsWith: "JPR-" } },
  });
  console.log(`- Trámites con memorando temporal JPR-...-TEMP: ${memorandosTemp}`);
  const referenciasTemp = await prisma.tramite_referencias.count({
    where: { numero_documento: { startsWith: "JPR-" } },
  });
  console.log(`- Referencias registradas con JPR-...-TEMP: ${referenciasTemp}`);

  // Muestras de Quipux vinculados
  const muestraVinculados = await prisma.tramite_referencias.findMany({
    where: { tipo_documento: "QUIPUX_VINCULADO" },
    take: 5,
    select: {
      id_referencia: true,
      id_tramite: true,
      numero_documento: true,
      asunto_sumilla: true,
    },
  });
  console.log("\nMuestra de Quipux vinculados en tramite_referencias:");
  console.table(muestraVinculados);

  // Muestras de Juicio Coactivo en referencias
  const referenciasJuicio = await prisma.tramite_referencias.findMany({
    where: { tipo_documento: "JUICIO_COACTIVO" },
    take: 5,
    select: {
      id_referencia: true,
      id_tramite: true,
      numero_documento: true,
      asunto_sumilla: true,
    },
  });
  console.log("\nMuestra de Juicios Coactivos en tramite_referencias:");
  console.table(referenciasJuicio);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
