import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("Iniciando vaciado completo de trámites y datos transaccionales...");

  await prisma.$transaction(async (tx) => {
    // 1. Eliminar referencias y documentos dependientes
    const delDoc = await tx.documentos_tramite.deleteMany({});
    console.log(`- Documentos de trámites eliminados: ${delDoc.count}`);

    const delRef = await tx.tramite_referencias.deleteMany({});
    console.log(`- Referencias Quipux eliminadas: ${delRef.count}`);

    const delObs = await tx.observaciones.deleteMany({});
    console.log(`- Observaciones eliminadas: ${delObs.count}`);

    const delMov = await tx.historial_movimientos.deleteMany({});
    console.log(`- Historial de movimientos (Bitácoras) eliminados: ${delMov.count}`);

    const delSol = await tx.solicitudes_devolucion.deleteMany({});
    console.log(`- Solicitudes de devolución eliminadas: ${delSol.count}`);

    // 2. Eliminar trámites
    const delTra = await tx.tramites.deleteMany({});
    console.log(`- Trámites eliminados: ${delTra.count}`);

    // 3. Eliminar cajas de archivo
    const delCajas = await tx.cajas.deleteMany({});
    console.log(`- Cajas de archivo eliminadas: ${delCajas.count}`);

    // 4. Reiniciar asignación de turnos (round-robin)
    await tx.asignacion_turnos.updateMany({
      data: {
        id_ultimo_usuario_asignado: null,
        fecha_ultima_asignacion: new Date(),
      },
    });
    console.log("- Turnos de asignación inteligente reiniciados a cero.");

    // 5. Reiniciar secuencias de SQLite para que el próximo trámite empiece en 1
    const tablesToReset = [
      "tramites",
      "historial_movimientos",
      "observaciones",
      "tramite_referencias",
      "documentos_tramite",
      "solicitudes_devolucion",
      "cajas",
    ];

    for (const table of tablesToReset) {
      try {
        await tx.$executeRawUnsafe(
          `DELETE FROM sqlite_sequence WHERE name = '${table}';`
        );
      } catch (err) {
        // En caso de que no exista la secuencia aún
      }
    }
    console.log("- Secuencias numéricas reiniciadas (el próximo trámite será TRM-2026-0001).");
  });

  // Verificación final
  const tramitesRestantes = await prisma.tramites.count();
  const usuariosActivos = await prisma.usuarios.count({ where: { activo: true } });
  const areasActivas = await prisma.areas.count();
  const catalogosActivos = await prisma.tipos_tramite.count();

  console.log("\n==========================================");
  console.log("RESULTADO DEL VACIADO:");
  console.log(`Trámites en la base: ${tramitesRestantes}`);
  console.log(`Usuarios institucionales conservados: ${usuariosActivos}`);
  console.log(`Áreas institucionales conservadas: ${areasActivas}`);
  console.log(`Tipos de trámite conservados: ${catalogosActivos}`);
  console.log("==========================================");
}

main()
  .catch((e) => {
    console.error("Error al vaciar la base de datos:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
