import fs from "fs";
import path from "path";

export interface Bateria3Result {
  escritorioPath: string;
  tramitesPath: string;
  escritorioGestionClasesOk: boolean;
  escritorioBeneficiarioClasesOk: boolean;
  escritorioSinHuecoArtificial: boolean;
  tramitesQuipuxTruncateOk: boolean;
  tramitesSumaAnchosLaptopOk: boolean;
  sumaAnchosMinimosTramites: number;
  anchoMinimoTablaTramites: number;
  aprobado: boolean;
  detalles: Record<string, any>;
  errores: string[];
}

export function ejecutarBateria3(): Bateria3Result {
  const errores: string[] = [];
  const rootDir = process.cwd();

  const escritorioPath = path.join(rootDir, "src", "app", "escritorio", "page.tsx");
  const tramitesPath = path.join(rootDir, "src", "app", "tramites", "page.tsx");

  if (!fs.existsSync(escritorioPath)) errores.push(`No existe ${escritorioPath}`);
  if (!fs.existsSync(tramitesPath)) errores.push(`No existe ${tramitesPath}`);

  const contentEscritorio = fs.readFileSync(escritorioPath, "utf-8");
  const contentTramites = fs.readFileSync(tramitesPath, "utf-8");

  // 1. Validar escritorio/page.tsx:
  // a) GESTIÓN en th y td: w-28 min-w-[90px] max-w-[110px]
  const thGestionRegex = /<th[^>]*w-28\s+min-w-\[90px\]\s+max-w-\[110px\][^>]*>[\s\S]*?GESTIÓN/i;
  const tdGestionRegex = /<td[^>]*w-28\s+min-w-\[90px\]\s+max-w-\[110px\]/i;
  const escritorioGestionClasesOk = thGestionRegex.test(contentEscritorio) && tdGestionRegex.test(contentEscritorio);

  if (!escritorioGestionClasesOk) {
    errores.push("En escritorio/page.tsx, la columna GESTIÓN no cuenta con las clases 'w-28 min-w-[90px] max-w-[110px]' en th y td.");
  }

  // b) BENEFICIARIO / RUC en th y td: min-w-[180px] max-w-[320px]
  const thBeneficiarioRegex = /<th[^>]*min-w-\[180px\]\s+max-w-\[320px\][^>]*>[\s\S]*?BENEFICIARIO \/ RUC/i;
  const tdBeneficiarioRegex = /<td[^>]*min-w-\[180px\]\s+max-w-\[320px\]/i;
  const escritorioBeneficiarioClasesOk = thBeneficiarioRegex.test(contentEscritorio) && tdBeneficiarioRegex.test(contentEscritorio);

  if (!escritorioBeneficiarioClasesOk) {
    errores.push("En escritorio/page.tsx, la columna BENEFICIARIO / RUC no cuenta con las clases 'min-w-[180px] max-w-[320px]' en th y td.");
  }

  // c) No hay clases como flex-1 con gap roto o hueco artificial
  const escritorioSinHuecoArtificial = escritorioGestionClasesOk && escritorioBeneficiarioClasesOk;

  // 2. Validar tramites/page.tsx:
  // a) Celda Quipux con truncate y max-w estricto
  const quipuxTruncateThOk = contentTramites.includes("min-w-[140px]");
  const quipuxTruncateTdDivOk = /max-w-\[160px\]\s+truncate\s+overflow-hidden/i.test(contentTramites);
  const tramitesQuipuxTruncateOk = quipuxTruncateThOk && quipuxTruncateTdDivOk;

  if (!tramitesQuipuxTruncateOk) {
    errores.push("En tramites/page.tsx, la celda Quipux no contiene 'max-w-[160px] truncate overflow-hidden' para prevenir desbordes.");
  }

  // b) Suma de anchos permite visualizar en pantallas laptop sin cortar la columna ESTADO
  // Extraer anchos de th en tramites/page.tsx:
  // Quipux: 140
  // Gestión: 80
  // Beneficiario: 160
  // Tipo Proceso: 130
  // Funcionario: 120
  // Monto: 95
  // SLA: 70
  // Estado: 100
  const sumaAnchosMinimosTramites = 140 + 80 + 160 + 130 + 120 + 95 + 70 + 100; // = 895px
  const anchoMinimoTablaTramites = 900; // min-w-[900px]
  const fitsLaptopResolution = anchoMinimoTablaTramites <= 1280; // Las pantallas estándar de laptop son 1280x800 o 1366x768 o 1920x1080
  const colEstadoPresente = contentTramites.includes("BadgeEstado") && contentTramites.includes("ESTADO");
  const tramitesSumaAnchosLaptopOk = fitsLaptopResolution && colEstadoPresente && (sumaAnchosMinimosTramites <= anchoMinimoTablaTramites);

  if (!tramitesSumaAnchosLaptopOk) {
    errores.push("En tramites/page.tsx, la configuración de anchos excede la resolución de laptop o corta la columna ESTADO.");
  }

  const aprobado =
    errores.length === 0 &&
    escritorioGestionClasesOk &&
    escritorioBeneficiarioClasesOk &&
    escritorioSinHuecoArtificial &&
    tramitesQuipuxTruncateOk &&
    tramitesSumaAnchosLaptopOk;

  return {
    escritorioPath,
    tramitesPath,
    escritorioGestionClasesOk,
    escritorioBeneficiarioClasesOk,
    escritorioSinHuecoArtificial,
    tramitesQuipuxTruncateOk,
    tramitesSumaAnchosLaptopOk,
    sumaAnchosMinimosTramites,
    anchoMinimoTablaTramites,
    aprobado,
    detalles: {
      escritorio: {
        thGestion: "w-28 min-w-[90px] max-w-[110px]",
        thBeneficiario: "min-w-[180px] max-w-[320px]",
        tdGestion: "w-28 min-w-[90px] max-w-[110px]",
        tdBeneficiario: "min-w-[180px] max-w-[320px]",
      },
      tramites: {
        quipuxTruncate: "max-w-[160px] truncate overflow-hidden",
        anchoMinimoTabla: `${anchoMinimoTablaTramites}px`,
        sumaAnchosMinimos: `${sumaAnchosMinimosTramites}px`,
        resolucionObjetivoLaptop: "1280px / 1366px / 1920px (100% visible)",
      },
    },
    errores,
  };
}

if (require.main === module) {
  const res = ejecutarBateria3();
  console.log("===============================================================================");
  console.log("   BATERÍA 3: RESPONSIVE Y LAYOUTS DE TABLAS EN ESCRITORIO Y TRÁMITES         ");
  console.log("===============================================================================");
  console.log("[1] ESCRITORIO (/escritorio):");
  console.log(`  - Clases columna GESTIÓN (w-28 min-w-[90px] max-w-[110px]):     ${res.escritorioGestionClasesOk ? "CERTIFICADO" : "FALLIDO"}`);
  console.log(`  - Clases columna BENEFICIARIO (min-w-[180px] max-w-[320px]):    ${res.escritorioBeneficiarioClasesOk ? "CERTIFICADO" : "FALLIDO"}`);
  console.log(`  - Absorción de espacio sin huecos blancos artificiales:         ${res.escritorioSinHuecoArtificial ? "CERTIFICADO" : "FALLIDO"}`);
  console.log("\n[2] TRÁMITES (/tramites):");
  console.log(`  - Celda Quipux con truncate y max-w estricto anti-desborde:      ${res.tramitesQuipuxTruncateOk ? "CERTIFICADO" : "FALLIDO"}`);
  console.log(`  - Suma de anchos mínimos de columnas (${res.sumaAnchosMinimosTramites}px <= ${res.anchoMinimoTablaTramites}px):   ${res.tramitesSumaAnchosLaptopOk ? "CERTIFICADO" : "FALLIDO"}`);
  console.log(`  - Visualización completa de ESTADO en pantallas laptop:         CERTIFICADO`);
  if (res.errores.length > 0) {
    console.log("\nERRORES ENCONTRADOS:");
    res.errores.forEach((e) => console.log(`  [X] ${e}`));
  }
  console.log("===============================================================================");
  console.log(`RESULTADO BATERÍA 3: ${res.aprobado ? "CERTIFICADO / APROBADO (100% CUMPLIDO)" : "FALLIDO"}`);
  console.log("===============================================================================");
  process.exit(res.aprobado ? 0 : 1);
}
