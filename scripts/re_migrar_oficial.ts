import { prisma } from "../src/lib/prisma";
import { MigracionExcelService, RUTA_DEFAULT_EXCEL_2026 } from "../src/services/migracionExcelService";

async function main() {
  console.log("=== VACIANDO TRÁMITES PREVIOS PARA MIGRACIÓN CON USUARIOS OFICIALES ===");

  await prisma.$transaction(async (tx) => {
    await tx.documentos_tramite.deleteMany({});
    await tx.tramite_referencias.deleteMany({});
    await tx.observaciones.deleteMany({});
    await tx.historial_movimientos.deleteMany({});
    await tx.solicitudes_devolucion.deleteMany({});
    await tx.tramites.deleteMany({});
    await tx.cajas.deleteMany({});

    for (const table of [
      "tramites",
      "historial_movimientos",
      "observaciones",
      "tramite_referencias",
      "documentos_tramite",
      "solicitudes_devolucion",
      "cajas",
    ]) {
      try {
        await tx.$executeRawUnsafe(`DELETE FROM sqlite_sequence WHERE name = '${table}';`);
      } catch (err) { }
    }
  });

  console.log("Base de datos limpia. Ejecutando migración histórica con catálogo oficial...");

  const res = await MigracionExcelService.ejecutarMigracion(RUTA_DEFAULT_EXCEL_2026, 11);

  console.log("\n=======================================================");
  console.log("RESULTADOS DE LA MIGRACIÓN CON USUARIOS OFICIALES:");
  console.log(`- Trámites Hoja PAGO: ${res.migrados_pago}`);
  console.log(`- Trámites Hoja GARANTÍA: ${res.migrados_garantia}`);
  console.log(`- Total Migrados: ${res.total_migrados}`);
  console.log(`- Total Referencias Creadas: ${res.total_referencias_creadas}`);
  console.log(`- Errores: ${res.errores.length}`);
  console.log(`- Tiempo total: ${(res.tiempo_ms / 1000).toFixed(2)} segundos`);
  console.log("=======================================================");

  // Verificación de asignación a funcionarios oficiales
  const conteoPorCustodio = await prisma.tramites.groupBy({
    by: ["id_custodio_actual"],
    _count: { id_tramite: true },
  });

  const usuarios = await prisma.usuarios.findMany({
    select: { id_usuario: true, nombre_completo: true, iniciales: true, cargo: true },
  });
  const userMap = new Map(usuarios.map((u) => [u.id_usuario, u]));

  console.log("\n--- TRÁMITES ACTIVOS / EN CUSTODIA POR FUNCIONARIO ---");
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

  // Verificación de cadenas de traspaso con nombres oficiales
  const traspasos = await prisma.historial_movimientos.findMany({
    where: { tipo_accion: "TRASPASO_CUSTODIA" },
    take: 5,
    include: {
      tramites: { select: { codigo_tramite: true } },
    },
  });

  console.log("\n--- MUESTRA DE MOVIMIENTOS HISTÓRICOS CON NOMBRES OFICIALES ---");
  for (const tr of traspasos) {
    console.log(`[${tr.tramites.codigo_tramite}] ${tr.comentarios}`);
  }
}

main()
  .catch((e) => {
    console.error("Error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
