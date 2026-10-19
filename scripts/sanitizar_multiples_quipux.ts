import { prisma } from "../src/lib/prisma";
import { extraerQuipux } from "../src/services/migracionExcelService";

async function main() {
  console.log("===============================================================================");
  console.log("       SANEAMIENTO Y REGULARIZACIÓN DE MÚLTIPLES QUIPUX EN TRÁMITES SENAE     ");
  console.log("===============================================================================");

  const t0 = Date.now();

  // 1. Obtener todos los trámites de la base de datos
  const todosTramites = await prisma.tramites.findMany({
    select: {
      id_tramite: true,
      codigo_tramite: true,
      numero_quipux: true,
      fecha_memorando: true,
      fecha_ingreso: true,
    },
  });

  console.log(`Total trámites evaluados en base de datos: ${todosTramites.length}`);

  // 2. Identificar los trámites que tienen múltiples Quipux o espacios
  const tramitesAfectados = todosTramites.filter((t) => {
    if (!t.numero_quipux) return false;
    const codigos = extraerQuipux(t.numero_quipux);
    return codigos.length > 1 || t.numero_quipux.trim().includes(" ") || t.numero_quipux !== t.numero_quipux.trim();
  });

  console.log(`\nTrámites identificados para saneamiento: ${tramitesAfectados.length}`);

  if (tramitesAfectados.length === 0) {
    console.log("No se encontraron trámites con múltiples Quipux. La base de datos ya está limpia.");
    return;
  }

  let totalActualizados = 0;
  let totalReferenciasNuevas = 0;
  const reporteDetallado: Array<{
    id: number;
    codigo: string;
    quipuxOriginal: string;
    quipuxLimpio: string;
    vinculados: string;
  }> = [];

  // 3. Procesar cada trámite dentro de transacciones seguras
  for (const t of tramitesAfectados) {
    const codigos = extraerQuipux(t.numero_quipux);
    const primaryQuipux = codigos[0] || t.numero_quipux.trim();
    const secondaryQuipux = codigos.slice(1);

    await prisma.$transaction(async (tx) => {
      // a. Actualizar número de Quipux en el trámite
      await tx.tramites.update({
        where: { id_tramite: t.id_tramite },
        data: {
          numero_quipux: primaryQuipux,
          fecha_ultima_modificacion: new Date(),
        },
      });

      // b. Para cada Quipux secundario, verificar si ya existe en tramite_referencias
      for (const extra of secondaryQuipux) {
        const existeRef = await tx.tramite_referencias.findFirst({
          where: {
            id_tramite: t.id_tramite,
            numero_documento: extra,
          },
        });

        if (!existeRef) {
          await tx.tramite_referencias.create({
            data: {
              id_tramite: t.id_tramite,
              tipo_documento: "QUIPUX_VINCULADO",
              numero_documento: extra,
              fecha_documento: t.fecha_memorando || t.fecha_ingreso || new Date(),
              asunto_sumilla: "Memorando secundario vinculado al expediente original",
              id_usuario_registro: 11, // Ing. Administrador de Sistemas
            },
          });
          totalReferenciasNuevas++;
        }
      }
    });

    totalActualizados++;
    reporteDetallado.push({
      id: t.id_tramite,
      codigo: t.codigo_tramite,
      quipuxOriginal: t.numero_quipux.length > 45 ? `${t.numero_quipux.substring(0, 42)}...` : t.numero_quipux,
      quipuxLimpio: primaryQuipux,
      vinculados: secondaryQuipux.join(", ") || "(ninguno)",
    });
  }

  console.log("\n--- DETALLE DE TRÁMITES SANEADOS ---");
  console.table(reporteDetallado);

  // 4. Verificación exhaustiva post-saneamiento
  const tramitesPost = await prisma.tramites.findMany({
    select: {
      id_tramite: true,
      codigo_tramite: true,
      numero_quipux: true,
    },
  });

  const residuosMultiples = tramitesPost.filter((t) => {
    if (!t.numero_quipux) return false;
    const codigos = extraerQuipux(t.numero_quipux);
    return codigos.length > 1 || t.numero_quipux.trim().includes(" ");
  });

  console.log("\n===============================================================================");
  console.log("                           VERIFICACIÓN FINAL                                  ");
  console.log("===============================================================================");
  console.log(`- Trámites actualizados con Quipux principal limpio: ${totalActualizados}`);
  console.log(`- Nuevas referencias 'QUIPUX_VINCULADO' creadas:      ${totalReferenciasNuevas}`);
  console.log(`- Trámites restantes con múltiples Quipux en BD:      ${residuosMultiples.length} (Esperado: 0)`);
  console.log(`- Tiempo total de ejecución:                          ${((Date.now() - t0) / 1000).toFixed(2)}s`);
  console.log("===============================================================================");

  if (residuosMultiples.length === 0) {
    console.log("¡ÉXITO ABSOLUTO! La base de datos no contiene ningún trámite con múltiples Quipux.");
  } else {
    console.error("ADVERTENCIA: Aún existen trámites con anomalías:", residuosMultiples);
    process.exit(1);
  }
}

main()
  .catch((e) => {
    console.error("Error durante el saneamiento de Quipux:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
