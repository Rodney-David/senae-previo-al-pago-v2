import { prisma } from "../src/lib/prisma";
import { calculateTramiteSLA } from "../src/lib/slaCalculator";

async function main() {
  console.log("=== VERIFICACIÓN DE TRÁMITES Y SLA TRAS MIGRACIÓN ===");

  const total = await prisma.tramites.count();
  console.log(`Total trámites en base: ${total}`);

  // 1. Distribución por estado
  const estados = await prisma.tramites.groupBy({
    by: ["estado_general", "tipo_flujo"],
    _count: { id_tramite: true },
  });
  console.log("\n--- DISTRIBUCIÓN POR ESTADO GENERAL ---");
  console.table(
    estados.map((e) => ({
      Flujo: e.tipo_flujo,
      Estado: e.estado_general,
      Cantidad: e._count.id_tramite,
    }))
  );

  // 2. Muestra de Trámite PAGADO
  console.log("\n--- 1. CÁLCULO SLA: TRÁMITE PAGADO (Debe ser FINALIZADO, nunca Vencido) ---");
  const muestraPagado = await prisma.tramites.findFirst({
    where: { estado_general: "PAGADO", tipo_flujo: "PAGO" },
  });
  if (muestraPagado) {
    const sla = await calculateTramiteSLA(muestraPagado);
    console.log({
      codigo: muestraPagado.codigo_tramite,
      quipux: muestraPagado.numero_quipux,
      recepcion: muestraPagado.fecha_recepcion_fisica?.toISOString().slice(0, 10),
      fechaPago: muestraPagado.fecha_pago?.toISOString().slice(0, 10),
      autorizadoPago: muestraPagado.autorizado_pago,
      slaEstado: sla.estado,
      diasHabiles: sla.diasHabilesTranscurridos,
      estaPausado: sla.estaPausado,
    });
  }

  // 3. Muestra de Trámite DEVUELTO
  console.log("\n--- 2. CÁLCULO SLA: TRÁMITE DEVUELTO (Debe ser EXENTO) ---");
  const muestraDevuelto = await prisma.tramites.findFirst({
    where: { estado_general: "DEVUELTO" },
  });
  if (muestraDevuelto) {
    const sla = await calculateTramiteSLA(muestraDevuelto);
    console.log({
      codigo: muestraDevuelto.codigo_tramite,
      quipux: muestraDevuelto.numero_quipux,
      recepcion: muestraDevuelto.fecha_recepcion_fisica?.toISOString().slice(0, 10),
      esDevuelto: muestraDevuelto.es_devuelto,
      motivoDevolucion: muestraDevuelto.motivo_devolucion,
      slaEstado: sla.estado,
      diasHabiles: sla.diasHabilesTranscurridos,
    });
  }

  // 4. Muestra de Trámite OBSERVADO / PAUSADO
  console.log("\n--- 3. CÁLCULO SLA: TRÁMITE OBSERVADO (Debe ser PAUSADO) ---");
  const muestraObservado = await prisma.tramites.findFirst({
    where: { estado_general: "OBSERVADO" },
  });
  if (muestraObservado) {
    const sla = await calculateTramiteSLA(muestraObservado);
    console.log({
      codigo: muestraObservado.codigo_tramite,
      quipux: muestraObservado.numero_quipux,
      recepcion: muestraObservado.fecha_recepcion_fisica?.toISOString().slice(0, 10),
      fechaPausa: muestraObservado.fecha_pausa?.toISOString().slice(0, 10),
      estaPausado: muestraObservado.esta_pausado,
      motivoPausa: muestraObservado.motivo_pausa,
      slaEstado: sla.estado,
      diasHabiles: sla.diasHabilesTranscurridos,
    });
  }

  // 5. Muestra de Trámite ARCHIVADO
  console.log("\n--- 4. CÁLCULO SLA: TRÁMITE ARCHIVADO (Debe ser FINALIZADO) ---");
  const muestraArchivado = await prisma.tramites.findFirst({
    where: { estado_general: "ARCHIVO" },
  });
  if (muestraArchivado) {
    const sla = await calculateTramiteSLA(muestraArchivado);
    console.log({
      codigo: muestraArchivado.codigo_tramite,
      quipux: muestraArchivado.numero_quipux,
      recepcion: muestraArchivado.fecha_recepcion_fisica?.toISOString().slice(0, 10),
      slaEstado: sla.estado,
      diasHabiles: sla.diasHabilesTranscurridos,
    });
  }

  // 6. Verificación de Historial de Traspaso de Analistas
  console.log("\n--- 5. HISTORIAL DE TRASPASOS ENTRE ANALISTAS (DB, ID / MS, NM) ---");
  const traspasos = await prisma.historial_movimientos.findMany({
    where: { tipo_accion: "TRASPASO_CUSTODIA" },
    take: 4,
    include: {
      tramites: { select: { codigo_tramite: true, numero_quipux: true } },
    },
  });
  for (const tr of traspasos) {
    console.log(`[${tr.tramites.codigo_tramite}] ${tr.comentarios} (${tr.fecha_hora?.toISOString().slice(0, 10) || "N/A"})`);
  }

  // 7. Verificación de Referencias de Novedades y Quipux
  console.log("\n--- 6. MUESTRA DE REFERENCIAS INDEXADAS PARA BÚSQUEDA ---");
  const refs = await prisma.tramite_referencias.findMany({
    take: 6,
    include: {
      tramites: { select: { codigo_tramite: true } },
    },
  });
  for (const ref of refs) {
    console.log(`[${ref.tramites.codigo_tramite}] Tipo: ${ref.tipo_documento} | Doc: ${ref.numero_documento} | Asunto: ${ref.asunto_sumilla}`);
  }
}

main()
  .catch((e) => {
    console.error("Error en script:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
