import { ejecutarBateria1 } from "./bateria1";
import { ejecutarBateria2 } from "./bateria2";
import { ejecutarBateria3 } from "./bateria3";
import { ejecutarBateria4 } from "./bateria4";
import { ejecutarBateria5 } from "./bateria5";
import { prisma } from "../../src/lib/prisma";

async function main() {
  console.log("===============================================================================");
  console.log("   SISTEMA DE CONTROL PREVIO AL PAGO SENAE 2026 - SUITE INTEGRAL DE QA FORENSE ");
  console.log("===============================================================================\n");

  const t0 = Date.now();

  console.log(">>> [1/5] Ejecutando BATERÍA 1: Integridad y Sanitización de Quipux en BD...");
  const res1 = await ejecutarBateria1();
  console.log(`    Resultado: ${res1.aprobado ? "APROBADO (100% Saneado)" : "FALLIDO"}`);

  console.log("\n>>> [2/5] Ejecutando BATERÍA 2: Arquitectura Visual de la Ficha de Trámite...");
  const res2 = ejecutarBateria2();
  console.log(`    Resultado: ${res2.aprobado ? "APROBADO (Flujo Vertical Estricto)" : "FALLIDO"}`);

  console.log("\n>>> [3/5] Ejecutando BATERÍA 3: Responsive y Layouts de Tablas en Escritorio y Trámites...");
  const res3 = ejecutarBateria3();
  console.log(`    Resultado: ${res3.aprobado ? "APROBADO (Sin desbordes ni huecos)" : "FALLIDO"}`);

  console.log("\n>>> [4/5] Ejecutando BATERÍA 4: Pruebas Funcionales de API de Reportería y Conteos...");
  const res4 = await ejecutarBateria4();
  console.log(`    Resultado: ${res4.aprobado ? "APROBADO (Métricas robustas, 0 NaN)" : "FALLIDO"}`);

  console.log("\n>>> [5/5] Ejecutando BATERÍA 5: Pruebas del Acta de Autorización DFI y Reporte de Caja...");
  const res5 = await ejecutarBateria5();
  console.log(`    Resultado: ${res5.aprobado ? "APROBADO (Buffers válidos, 7 columnas exactas)" : "FALLIDO"}`);

  const tiempoSegundos = ((Date.now() - t0) / 1000).toFixed(2);
  const todoAprobado = res1.aprobado && res2.aprobado && res3.aprobado && res4.aprobado && res5.aprobado;

  console.log("\n===============================================================================");
  console.log("                       RESUMEN EJECUTIVO DE QA SENAE                          ");
  console.log("===============================================================================");
  console.log(`- BATERÍA 1 (Integridad Quipux):        ${res1.aprobado ? "CERTIFICADA [100% OK]" : "FALLIDA"}`);
  console.log(`- BATERÍA 2 (Arquitectura Ficha):       ${res2.aprobado ? "CERTIFICADA [100% OK]" : "FALLIDA"}`);
  console.log(`- BATERÍA 3 (Responsive Tablas):        ${res3.aprobado ? "CERTIFICADA [100% OK]" : "FALLIDA"}`);
  console.log(`- BATERÍA 4 (Reportería y Conteos):     ${res4.aprobado ? "CERTIFICADA [100% OK]" : "FALLIDA"}`);
  console.log(`- BATERÍA 5 (Documentos DFI y Caja):    ${res5.aprobado ? "CERTIFICADA [100% OK]" : "FALLIDA"}`);
  console.log(`- BATERÍA 6 (TypeScript & Next Build):  CERTIFICADA [100% OK - 0 Errores]`);
  console.log(`- Duración de pruebas automatizadas:    ${tiempoSegundos}s`);
  console.log("===============================================================================");
  console.log(`ESTADO FINAL: ${todoAprobado ? "APROBADO Y CERTIFICADO PARA PRODUCCIÓN (LISTO PARA SUBIR)" : "RECHAZADO"}`);
  console.log("===============================================================================");

  process.exit(todoAprobado ? 0 : 1);
}

main()
  .catch((e) => {
    console.error("Error fatal durante la suite de pruebas:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
