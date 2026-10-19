import fs from "fs";
import path from "path";

export interface Bateria2Result {
  archivoTramiteId: string;
  archivoTramitesId: string;
  reexportaValido: boolean;
  contieneGridColumnasEnLayoutTarjetas: boolean;
  flujoVerticalEspaciado: boolean;
  ordenTarjetasEncontrado: string[];
  ordenEsperado: string[];
  ordenEsExacto: boolean;
  aprobado: boolean;
  errores: string[];
}

export function ejecutarBateria2(): Bateria2Result {
  const errores: string[] = [];
  const rootDir = process.cwd();

  const archivoTramiteId = path.join(rootDir, "src", "app", "tramite", "[id]", "page.tsx");
  const archivoTramitesId = path.join(rootDir, "src", "app", "tramites", "[id]", "page.tsx");

  if (!fs.existsSync(archivoTramiteId)) {
    errores.push(`No existe el archivo ${archivoTramiteId}`);
  }
  if (!fs.existsSync(archivoTramitesId)) {
    errores.push(`No existe el archivo ${archivoTramitesId}`);
  }

  // Verificar reexport en tramites/[id]/page.tsx
  const contentTramitesId = fs.readFileSync(archivoTramitesId, "utf-8");
  const reexportaValido =
    contentTramitesId.includes(`export { default } from "@/app/tramite/[id]/page"`) ||
    contentTramitesId.includes(`from "@/app/tramite/[id]/page"`);

  if (!reexportaValido) {
    errores.push("tramites/[id]/page.tsx no reexporta correctamente tramite/[id]/page");
  }

  // Analizar tramite/[id]/page.tsx
  const contentTramiteId = fs.readFileSync(archivoTramiteId, "utf-8");

  // Buscar si hay grid-cols-2 o similar en el layout de las tarjetas
  // Extraemos la sección del return principal
  const returnIndex = contentTramiteId.indexOf("return (");
  const returnContent = returnIndex !== -1 ? contentTramiteId.substring(returnIndex) : contentTramiteId;

  // Verificamos si en el contenedor de tarjetas hay grids
  const hasGridCols2InContainer = /<div[^>]*className="[^"]*grid-cols-2[^"]*"[^>]*>[\s\S]*?<Tarjeta/gi.test(returnContent);
  const hasColSpanInCards = /col-span-\d/gi.test(returnContent);
  const contieneGridColumnasEnLayoutTarjetas = hasGridCols2InContainer || hasColSpanInCards;

  if (contieneGridColumnasEnLayoutTarjetas) {
    errores.push("Se detectaron clases de grid o col-span en el layout de tarjetas de la ficha de trámite.");
  }

  // Verificar contenedor vertical con space-y-6
  const flujoVerticalEspaciado = returnContent.includes("space-y-6");
  if (!flujoVerticalEspaciado) {
    errores.push("El contenedor principal de la ficha no utiliza 'space-y-6' para el flujo vertical estricto.");
  }

  // Verificar el orden exacto de renderizado de las 7 tarjetas
  const ordenEsperado = [
    "TarjetaDatosGenerales",
    "TablaReferencias",
    "TarjetaPresupuesto",
    "TarjetaContabilidad",
    "TarjetaTesoreria",
    "TarjetaArchivo",
    "TimelineBitacora",
  ];

  const ordenEncontrado: string[] = [];
  const cardRegex = /<(TarjetaDatosGenerales|TablaReferencias|TarjetaPresupuesto|TarjetaContabilidad|TarjetaTesoreria|TarjetaArchivo|TimelineBitacora)\b/g;
  let match;
  while ((match = cardRegex.exec(returnContent)) !== null) {
    ordenEncontrado.push(match[1]);
  }

  const ordenEsExacto =
    ordenEncontrado.length === ordenEsperado.length &&
    ordenEsperado.every((val, idx) => val === ordenEncontrado[idx]);

  if (!ordenEsExacto) {
    errores.push(`El orden de las tarjetas no coincide con la arquitectura esperada. Encontrado: ${ordenEncontrado.join(" -> ")}`);
  }

  const aprobado =
    errores.length === 0 &&
    reexportaValido &&
    !contieneGridColumnasEnLayoutTarjetas &&
    flujoVerticalEspaciado &&
    ordenEsExacto;

  return {
    archivoTramiteId,
    archivoTramitesId,
    reexportaValido,
    contieneGridColumnasEnLayoutTarjetas,
    flujoVerticalEspaciado,
    ordenTarjetasEncontrado: ordenEncontrado,
    ordenEsperado,
    ordenEsExacto,
    aprobado,
    errores,
  };
}

if (require.main === module) {
  const res = ejecutarBateria2();
  console.log("===============================================================================");
  console.log("         BATERÍA 2: ARQUITECTURA VISUAL DE LA FICHA DE TRÁMITE                 ");
  console.log("===============================================================================");
  console.log(`- Archivo base:                  ${res.archivoTramiteId}`);
  console.log(`- Archivo alias /tramites/[id]:  ${res.archivoTramitesId}`);
  console.log(`- Re-exportación íntegra:        ${res.reexportaValido ? "OK" : "ERROR"}`);
  console.log(`- Layout sin grid de 2 columnas: ${!res.contieneGridColumnasEnLayoutTarjetas ? "OK (Flujo Monocolumna)" : "ERROR"}`);
  console.log(`- Espaciado vertical (space-y-6):${res.flujoVerticalEspaciado ? "OK" : "ERROR"}`);
  console.log("\n--- ORDEN DE RENDERIZADO DE TARJETAS INSTITUCIONALES ---");
  res.ordenEsperado.forEach((nombre, i) => {
    const enc = res.ordenTarjetasEncontrado[i];
    console.log(`  Posición ${i + 1}: ${enc === nombre ? "[OK]" : "[ERROR]"} ${nombre}`);
  });
  if (res.errores.length > 0) {
    console.log("\nERRORES:");
    res.errores.forEach((e) => console.log(`  [X] ${e}`));
  }
  console.log("===============================================================================");
  console.log(`RESULTADO BATERÍA 2: ${res.aprobado ? "CERTIFICADO / APROBADO (100% CUMPLIDO)" : "FALLIDO"}`);
  console.log("===============================================================================");
  process.exit(res.aprobado ? 0 : 1);
}
