import { prisma } from "../src/lib/prisma";
import { MigracionExcelService, RUTA_DEFAULT_EXCEL_2026, extraerQuipux } from "../src/services/migracionExcelService";

async function main() {
  console.log("===============================================================================");
  console.log("       INICIANDO MIGRACIÓN OFICIAL SENAE 2026 (MOTOR V2 DE ALTA PRECISIÓN)     ");
  console.log("===============================================================================");
  console.log(`Archivo objetivo: ${RUTA_DEFAULT_EXCEL_2026}`);

  const t0 = Date.now();
  console.log("\n[1/3] Ejecutando purga e inserción transaccional por lotes (V2)...");
  const res = await MigracionExcelService.ejecutarMigracion(RUTA_DEFAULT_EXCEL_2026, 11, true);

  console.log("\n===============================================================================");
  console.log("               RESULTADOS OFICIALES DE LA MIGRACIÓN V2:                        ");
  console.log("===============================================================================");
  console.log(`- Trámites Hoja PAGO:               ${res.migrados_pago} (Esperado: 1099)`);
  console.log(`- Trámites Hoja GARANTÍA:           ${res.migrados_garantia} (Esperado: 537)`);
  console.log(`- Total Trámites Migrados:          ${res.total_migrados} (Esperado: 1636)`);
  console.log(`- Total Referencias Indexadas:      ${res.total_referencias_creadas}`);
  console.log(`- Errores Reportados:               ${res.errores.length}`);
  console.log(`- Tiempo Total de Motor V2:         ${(res.tiempo_ms / 1000).toFixed(2)} segundos`);
  console.log("===============================================================================");

  if (res.errores.length > 0) {
    console.log("\nMuestra de errores:", res.errores.slice(0, 10));
  }

  // 2. Verificación de trámites en base de datos
  const totalEnBD = await prisma.tramites.count();
  const migrados2026 = await prisma.tramites.count({
    where: {
      OR: [
        { codigo_tramite: { startsWith: "TRM-2026-P-" } },
        { codigo_tramite: { startsWith: "TRM-2026-G-" } },
      ],
    },
  });
  console.log(`\n[2/3] Verificación en Base de Datos:`);
  console.log(`- Total trámites 2026 en BD:        ${migrados2026}`);
  console.log(`- Total general en tabla tramites:  ${totalEnBD}`);

  // 3. Verificación de desglose por estados oficiales inmutables
  const conteoPorEstado = await prisma.tramites.groupBy({
    by: ["estado_general"],
    where: {
      OR: [
        { codigo_tramite: { startsWith: "TRM-2026-P-" } },
        { codigo_tramite: { startsWith: "TRM-2026-G-" } },
      ],
    },
    _count: { id_tramite: true },
  });

  console.log("\n--- DISTRIBUCIÓN POR LOS 7 ESTADOS OFICIALES (BITÁCORA 2026) ---");
  console.table(
    conteoPorEstado.map((e) => ({
      Estado: e.estado_general,
      Cantidad: e._count.id_tramite,
    }))
  );

  // 4. Verificación de distribución de custodios y analistas oficiales
  const conteoPorCustodio = await prisma.tramites.groupBy({
    by: ["id_custodio_actual"],
    where: {
      OR: [
        { codigo_tramite: { startsWith: "TRM-2026-P-" } },
        { codigo_tramite: { startsWith: "TRM-2026-G-" } },
      ],
    },
    _count: { id_tramite: true },
  });

  const usuarios = await prisma.usuarios.findMany({
    select: { id_usuario: true, nombre_completo: true, iniciales: true, cargo: true },
  });
  const userMap = new Map(usuarios.map((u) => [u.id_usuario, u]));

  console.log("\n--- TRÁMITES ACTIVOS / EN CUSTODIA POR FUNCIONARIO OFICIAL ---");
  console.table(
    conteoPorCustodio.map((c) => {
      const u = c.id_custodio_actual ? userMap.get(c.id_custodio_actual) : null;
      return {
        ID: c.id_custodio_actual,
        Iniciales: u?.iniciales || "N/A",
        Funcionario: u?.nombre_completo || "Desconocido",
        Cargo: u?.cargo || "N/A",
        Tramites: c._count.id_tramite,
      };
    })
  );

  // 5. Verificación de Causas Judiciales y Procesos Coactivos extraídos
  const conJuicio = await prisma.tramites.count({
    where: {
      numero_juicio: { not: null },
      codigo_tramite: { startsWith: "TRM-2026-G-" },
    },
  });
  console.log(`\n[3/3] Trámites de Garantías con Causa Judicial identificada: ${conJuicio}`);

  const muestrasJuicios = await prisma.tramites.findMany({
    where: {
      numero_juicio: { not: null },
      codigo_tramite: { startsWith: "TRM-2026-G-" },
    },
    take: 5,
    select: {
      codigo_tramite: true,
      numero_juicio: true,
      proveedor_beneficiario: true,
      monto_total: true,
    },
  });
  console.log("\nMuestra de Causas Judiciales extraídas:");
  console.table(
    muestrasJuicios.map((m) => ({
      Codigo: m.codigo_tramite,
      Juicio: m.numero_juicio,
      Beneficiario: m.proveedor_beneficiario.substring(0, 30),
      Monto: Number(m.monto_total),
    }))
  );

  // 6. Verificación de Referencias Quipux Vinculados
  const referenciasVinculadas = await prisma.tramite_referencias.count({
    where: { tipo_documento: "QUIPUX_VINCULADO" },
  });
  console.log(`\nTotal Quipux Secundarios Vinculados en Referencias: ${referenciasVinculadas}`);

  // 7. Verificación de trámites con múltiples Quipux en numero_quipux
  const todosTramites = await prisma.tramites.findMany({ select: { numero_quipux: true } });
  const tramitesConMultiples = todosTramites.filter(
    (t) => extraerQuipux(t.numero_quipux).length > 1 || t.numero_quipux.trim().includes(" ")
  );
  console.log(`- Trámites con múltiples Quipux en campo principal: ${tramitesConMultiples.length} (Esperado: 0)`);

  console.log(`\nProceso completado exitosamente en ${((Date.now() - t0) / 1000).toFixed(2)} segundos.`);
}

main()
  .catch((e) => {
    console.error("Error fatal en migración oficial:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
