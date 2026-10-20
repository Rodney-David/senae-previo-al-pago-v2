import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("================================================================================");
  console.log("INICIO: TAREA C - PURGA QUIRÚRGICA DE LOS 29 TRÁMITES FICTICIOS DE PRUEBA");
  console.log("================================================================================");

  // 1. Identificar trámites de prueba cuyo código no comienza con TRM-2026-P- ni TRM-2026-G-
  const testTramites = await prisma.tramites.findMany({
    where: {
      NOT: {
        OR: [
          { codigo_tramite: { startsWith: "TRM-2026-P-" } },
          { codigo_tramite: { startsWith: "TRM-2026-G-" } },
        ],
      },
    },
    select: {
      id_tramite: true,
      codigo_tramite: true,
      numero_quipux: true,
      proveedor_beneficiario: true,
    },
  });

  console.log(`\n1. Diagnóstico previo:`);
  console.log(`- Trámites de prueba detectados: ${testTramites.length}`);

  if (testTramites.length !== 29) {
    throw new Error(
      `ALERTA DE SEGURIDAD: Se esperaban exactamente 29 trámites de prueba, pero se encontraron ${testTramites.length}. Operación cancelada.`
    );
  }

  const ids = testTramites.map((t) => t.id_tramite);

  // 2. Ejecutar purga atómica dentro de una transacción Prisma
  console.log("\n2. Ejecutando purga en transacción atómica (prisma.$transaction)...");

  const resultado = await prisma.$transaction(async (tx) => {
    const delDoc = await tx.documentos_tramite.deleteMany({
      where: { id_tramite: { in: ids } },
    });
    const delSol = await tx.solicitudes_devolucion.deleteMany({
      where: { id_tramite: { in: ids } },
    });
    const delObs = await tx.observaciones.deleteMany({
      where: { id_tramite: { in: ids } },
    });
    const delRef = await tx.tramite_referencias.deleteMany({
      where: { id_tramite: { in: ids } },
    });
    const delMov = await tx.historial_movimientos.deleteMany({
      where: { id_tramite: { in: ids } },
    });
    const delTra = await tx.tramites.deleteMany({
      where: { id_tramite: { in: ids } },
    });

    return {
      documentos: delDoc.count,
      solicitudes: delSol.count,
      observaciones: delObs.count,
      referencias: delRef.count,
      movimientos: delMov.count,
      tramites: delTra.count,
    };
  });

  console.log(`- Movimientos de historial eliminados: ${resultado.movimientos}`);
  console.log(`- Observaciones eliminadas: ${resultado.observaciones}`);
  console.log(`- Referencias Quipux eliminadas: ${resultado.referencias}`);
  console.log(`- Documentos eliminados: ${resultado.documentos}`);
  console.log(`- Solicitudes eliminadas: ${resultado.solicitudes}`);
  console.log(`- Trámites de prueba eliminados: ${resultado.tramites}`);

  // 3. Verificación de conteos oficiales
  console.log("\n3. Verificación de integridad en Base de Datos:");
  const totalTramites = await prisma.tramites.count();
  const totalPago = await prisma.tramites.count({
    where: { padre_gestion: "PAGO" },
  });
  const totalGarantia = await prisma.tramites.count({
    where: { padre_gestion: "GARANTIA" },
  });

  console.log(`- Total general de trámites: ${totalTramites} (Esperado: 1,636)`);
  console.log(`  * Trámites de PAGO:       ${totalPago} (Esperado: 1,099)`);
  console.log(`  * Trámites de GARANTÍA:    ${totalGarantia} (Esperado: 537)`);

  if (totalTramites !== 1636 || totalPago !== 1099 || totalGarantia !== 537) {
    throw new Error(
      `ERROR EN VERIFICACIÓN: Los conteos finales (${totalTramites} total, ${totalPago} pago, ${totalGarantia} garantía) no coinciden con la meta oficial (1636 total, 1099 pago, 537 garantía).`
    );
  }

  console.log("\n================================================================================");
  console.log("✅ ÉXITO TOTAL: Base de datos limpia con exactamente 1,636 trámites oficiales.");
  console.log("================================================================================");
}

main()
  .catch((e) => {
    console.error("\n❌ Error durante la purga:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
