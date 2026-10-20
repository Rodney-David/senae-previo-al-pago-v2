import { prisma } from "../../src/lib/prisma";
import { evaluarCalidadDato, calcularTiemposTramite } from "../../src/lib/tiemposCalculator";

async function main() {
  console.log("=== AUDITORÍA FORENSE DE TRAZABILIDAD Y CADENAS DE ANALISTAS ===");

  const tramitesConCadena = await prisma.tramites.findMany({
    where: {
      anexos: { contains: "/" },
    },
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

  console.log(`Total trámites con '/' en anexos: ${tramitesConCadena.length}`);

  let totalCompartidosDetectados = 0;
  let conAsignacionAnalista = 0;
  let conTraspasoCustodia = 0;
  let conAmbosMovimientos = 0;

  // Agrupamiento por patrón de analistas (ej: RG/DB, MS/HA, RG/NM/RG, etc.)
  const patrones: Record<string, { total: number; ejemplos: string[] }> = {};

  for (const t of tramitesConCadena) {
    const cal = evaluarCalidadDato(t as any);
    if (cal.analistaCompartido) totalCompartidosDetectados++;

    const tieneAsignacion = t.historial_movimientos.some(m => m.tipo_accion === "ASIGNACION_ANALISTA");
    const tieneTraspaso = t.historial_movimientos.some(m => m.tipo_accion === "TRASPASO_CUSTODIA");

    if (tieneAsignacion) conAsignacionAnalista++;
    if (tieneTraspaso) conTraspasoCustodia++;
    if (tieneAsignacion && tieneTraspaso) conAmbosMovimientos++;

    const key = cal.analistas.join("/") || "DESCONOCIDO";
    if (!patrones[key]) patrones[key] = { total: 0, ejemplos: [] };
    patrones[key].total++;
    if (patrones[key].ejemplos.length < 2) {
      patrones[key].ejemplos.push(`${t.codigo_tramite} (${t.numero_quipux})`);
    }
  }

  console.log(`\nEstadísticas de Trazabilidad en Historial:`);
  console.log(`- Trámites con es_analista_compartido = true: ${totalCompartidosDetectados} de ${tramitesConCadena.length}`);
  console.log(`- Trámites con movimiento ASIGNACION_ANALISTA: ${conAsignacionAnalista}`);
  console.log(`- Trámites con movimiento TRASPASO_CUSTODIA:    ${conTraspasoCustodia}`);
  console.log(`- Trámites con AMBOS movimientos (cadena completa): ${conAmbosMovimientos}`);

  console.log(`\nDesglose por Cadenas de Analistas Encontradas:`);
  for (const [cadena, data] of Object.entries(patrones)) {
    console.log(`   - [${cadena}]: ${data.total} trámites | Ejemplos: ${data.ejemplos.join(", ")}`);
  }

  // Verificar casos específicos pedidos: RG/DB, MS/HA, RG/NM/RG
  console.log(`\nDetalle forense de casos emblemáticos:`);
  const cadenasInteres = ["RG/DB", "MS/HA", "RG/NM"];
  for (const cad of cadenasInteres) {
    const t = tramitesConCadena.find(item => {
      const cal = evaluarCalidadDato(item as any);
      return cal.analistas.join("/") === cad;
    });
    if (t) {
      console.log(`\nTrámite: ${t.codigo_tramite} | Quipux: ${t.numero_quipux} | Cadena: ${cad}`);
      console.log(`   Anexos: "${t.anexos}"`);
      console.log(`   Movimientos (${t.historial_movimientos.length}):`);
      for (const m of t.historial_movimientos) {
        const uEnt = m.usuarios_historial_movimientos_id_usuario_entregaTousuarios?.nombre_completo || "N/A";
        const uRec = m.usuarios_historial_movimientos_id_usuario_recibeTousuarios?.nombre_completo || "N/A";
        console.log(`     -> [${m.tipo_accion}] (${m.fecha_hora?.toISOString().split("T")[0]}): ${uEnt} -> ${uRec} | "${m.comentarios}"`);
      }
    }
  }

  // Buscar casos triples como RG/NM/RG o similares
  const triples = tramitesConCadena.filter(item => {
    const cal = evaluarCalidadDato(item as any);
    return cal.analistas.length >= 3;
  });
  console.log(`\nTrámites con 3 o más analistas en cadena: ${triples.length}`);
  for (const t of triples) {
    const cal = evaluarCalidadDato(t as any);
    console.log(`   - ${t.codigo_tramite} (${t.numero_quipux}): Analistas=[${cal.analistas.join(", ")}] | Anexos="${t.anexos}"`);
    for (const m of t.historial_movimientos) {
      console.log(`       [${m.tipo_accion}] ${m.comentarios}`);
    }
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
