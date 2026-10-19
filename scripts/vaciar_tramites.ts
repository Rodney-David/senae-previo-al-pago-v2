import fs from "fs";
import path from "path";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

function detectDatabaseProvider(): "postgresql" | "sqlite" {
  const dbUrl = process.env.DATABASE_URL || "";
  if (dbUrl.startsWith("postgresql://") || dbUrl.startsWith("postgres://")) {
    return "postgresql";
  }
  if (dbUrl.startsWith("file:")) {
    return "sqlite";
  }
  try {
    const schemaPath = path.join(process.cwd(), "prisma", "schema.prisma");
    if (fs.existsSync(schemaPath)) {
      const content = fs.readFileSync(schemaPath, "utf-8");
      if (/provider\s*=\s*"postgresql"/.test(content)) {
        return "postgresql";
      }
    }
  } catch {}
  return "sqlite";
}

async function main() {
  console.log("Iniciando vaciado completo de trámites y datos transaccionales...");

  const provider = detectDatabaseProvider();
  console.log(`Motor de base de datos detectado: ${provider.toUpperCase()}`);

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

    // 5. Reiniciar secuencias según proveedor de base de datos
    const tablesToReset = [
      { table: "tramites", idCol: "id_tramite", seq: "tramites_id_tramite_seq" },
      { table: "historial_movimientos", idCol: "id_movimiento", seq: "historial_movimientos_id_movimiento_seq" },
      { table: "observaciones", idCol: "id_observacion", seq: "observaciones_id_observacion_seq" },
      { table: "tramite_referencias", idCol: "id_referencia", seq: "tramite_referencias_id_referencia_seq" },
      { table: "documentos_tramite", idCol: "id_documento", seq: "documentos_tramite_id_documento_seq" },
      { table: "solicitudes_devolucion", idCol: "id_solicitud", seq: "solicitudes_devolucion_id_solicitud_seq" },
      { table: "cajas", idCol: "id_caja", seq: "cajas_id_caja_seq" },
    ];

    if (provider === "postgresql") {
      console.log("- Reiniciando secuencias de PostgreSQL 16 (ALTER SEQUENCE ... RESTART WITH 1)...");
      for (const item of tablesToReset) {
        try {
          await tx.$executeRawUnsafe(
            `ALTER SEQUENCE IF EXISTS "${item.seq}" RESTART WITH 1;`
          );
        } catch (err) {
          try {
            await tx.$executeRawUnsafe(
              `SELECT setval(pg_get_serial_sequence('${item.table}', '${item.idCol}'), 1, false);`
            );
          } catch (err2) {
            // Silencioso en caso de que la tabla o secuencia no existan aún
          }
        }
      }
      console.log("- Secuencias PostgreSQL reiniciadas con éxito (el próximo trámite será TRM-2026-0001).");
    } else {
      console.log("- Reiniciando secuencias en SQLite (DELETE FROM sqlite_sequence)...");
      for (const item of tablesToReset) {
        try {
          await tx.$executeRawUnsafe(
            `DELETE FROM sqlite_sequence WHERE name = '${item.table}';`
          );
        } catch (err) {
          // En caso de que no exista la secuencia aún
        }
      }
      console.log("- Secuencias SQLite reiniciadas con éxito (el próximo trámite será TRM-2026-0001).");
    }
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
