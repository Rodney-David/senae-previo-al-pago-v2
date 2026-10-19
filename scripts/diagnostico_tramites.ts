import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const total = await prisma.tramites.count();
  const porTipoFlujo = await prisma.tramites.groupBy({
    by: ["tipo_flujo"],
    _count: true,
  });
  const porPadre = await prisma.tramites.groupBy({
    by: ["padre_gestion"],
    _count: true,
  });
  const sampleGarantia = await prisma.tramites.findMany({
    where: {
      OR: [
        { padre_gestion: "GARANTIA" },
        { tipo_flujo: "GARANTIA" },
        { codigo_tramite: { contains: "-G-" } },
      ],
    },
    take: 5,
  });
  console.log("Total tramites en DB:", total);
  console.log("Por tipo_flujo:", porTipoFlujo);
  console.log("Por padre_gestion:", porPadre);
  console.log("Muestra garantías encontradas:", sampleGarantia.length);
  if (sampleGarantia.length > 0) {
    console.log("Ejemplo:", sampleGarantia[0]);
  }
}

main().finally(() => prisma.$disconnect());
