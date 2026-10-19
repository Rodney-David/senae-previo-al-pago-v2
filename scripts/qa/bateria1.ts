import { prisma } from "../../src/lib/prisma";
import { extraerQuipux } from "../../src/services/migracionExcelService";

export interface Bateria1Result {
  totalTramites: number;
  tramitesConQuipuxNulo: number;
  tramitesConQuipuxVacio: number;
  tramitesConMultiplesQuipux: number;
  tramitesConEspacios: number;
  totalTramitesConQuipuxVinculado: number;
  los13Saneados: Array<{
    id_tramite: number;
    codigo_tramite: string;
    numero_quipux: string;
    quipuxSecundarios: string[];
    estadoCorrecto: boolean;
  }>;
  aprobado: boolean;
  errores: string[];
}

export async function ejecutarBateria1(): Promise<Bateria1Result> {
  const errores: string[] = [];

  // 1. Inspeccionar el 100% de los trámites en la base de datos
  const todos = await prisma.tramites.findMany({
    select: {
      id_tramite: true,
      codigo_tramite: true,
      numero_quipux: true,
    },
  });

  const totalTramites = todos.length;
  let tramitesConQuipuxNulo = 0;
  let tramitesConQuipuxVacio = 0;
  let tramitesConMultiplesQuipux = 0;
  let tramitesConEspacios = 0;

  for (const t of todos) {
    if (t.numero_quipux === null || t.numero_quipux === undefined) {
      tramitesConQuipuxNulo++;
      errores.push(`Trámite ID ${t.id_tramite} (${t.codigo_tramite}): numero_quipux es NULO.`);
    } else if (t.numero_quipux.trim() === "") {
      tramitesConQuipuxVacio++;
      errores.push(`Trámite ID ${t.id_tramite} (${t.codigo_tramite}): numero_quipux está VACÍO.`);
    } else {
      // Verificar espacios en blanco
      if (t.numero_quipux.includes(" ") || t.numero_quipux !== t.numero_quipux.trim()) {
        tramitesConEspacios++;
        errores.push(`Trámite ID ${t.id_tramite} (${t.codigo_tramite}): contiene espacios en blanco ("${t.numero_quipux}").`);
      }
      // Verificar múltiples códigos Quipux
      const codigos = extraerQuipux(t.numero_quipux);
      if (codigos.length > 1) {
        tramitesConMultiplesQuipux++;
        errores.push(`Trámite ID ${t.id_tramite} (${t.codigo_tramite}): contiene múltiples Quipux ("${t.numero_quipux}").`);
      }
    }
  }

  // 2. Verificar específicamente los 13 trámites saneados
  const ids13Saneados = [1351, 1639, 1655, 1785, 1819, 1916, 1918, 1919, 1928, 1931, 1972, 1979, 2083];
  const los13Saneados: Bateria1Result["los13Saneados"] = [];

  for (const id of ids13Saneados) {
    const tramite = todos.find((t) => t.id_tramite === id);
    if (!tramite) {
      errores.push(`Trámite saneado con ID ${id} no encontrado en la base de datos.`);
      continue;
    }

    const referencias = await prisma.tramite_referencias.findMany({
      where: {
        id_tramite: id,
        tipo_documento: "QUIPUX_VINCULADO",
      },
      select: {
        numero_documento: true,
      },
    });

    const secundarios = referencias.map((r) => r.numero_documento);
    const tieneEspacio = tramite.numero_quipux.includes(" ");
    const esMultiple = extraerQuipux(tramite.numero_quipux).length > 1;
    const tieneSecundarios = secundarios.length > 0;
    const estadoCorrecto = !tieneEspacio && !esMultiple && tieneSecundarios;

    if (!estadoCorrecto) {
      errores.push(`Trámite saneado ID ${id} (${tramite.codigo_tramite}) no cumple las condiciones requeridas.`);
    }

    los13Saneados.push({
      id_tramite: id,
      codigo_tramite: tramite.codigo_tramite,
      numero_quipux: tramite.numero_quipux,
      quipuxSecundarios: secundarios,
      estadoCorrecto,
    });
  }

  // Contar el total de trámites que tienen referencias QUIPUX_VINCULADO
  const tramitesConVinculados = await prisma.tramite_referencias.groupBy({
    by: ["id_tramite"],
    where: {
      tipo_documento: "QUIPUX_VINCULADO",
    },
  });

  const totalTramitesConQuipuxVinculado = tramitesConVinculados.length;

  const aprobado =
    errores.length === 0 &&
    tramitesConQuipuxNulo === 0 &&
    tramitesConQuipuxVacio === 0 &&
    tramitesConMultiplesQuipux === 0 &&
    tramitesConEspacios === 0 &&
    los13Saneados.length === 13 &&
    los13Saneados.every((s) => s.estadoCorrecto);

  return {
    totalTramites,
    tramitesConQuipuxNulo,
    tramitesConQuipuxVacio,
    tramitesConMultiplesQuipux,
    tramitesConEspacios,
    totalTramitesConQuipuxVinculado,
    los13Saneados,
    aprobado,
    errores,
  };
}

if (require.main === module) {
  ejecutarBateria1()
    .then((res) => {
      console.log("===============================================================================");
      console.log("       BATERÍA 1: INTEGRIDAD Y SANITIZACIÓN DE QUIPUX EN BASE DE DATOS         ");
      console.log("===============================================================================");
      console.log(`- Total de trámites auditados (100% de la BD): ${res.totalTramites}`);
      console.log(`- Trámites con Quipux NULO:                     ${res.tramitesConQuipuxNulo}`);
      console.log(`- Trámites con Quipux VACÍO:                    ${res.tramitesConQuipuxVacio}`);
      console.log(`- Trámites con múltiples Quipux en campo:       ${res.tramitesConMultiplesQuipux}`);
      console.log(`- Trámites con espacios en blanco en campo:     ${res.tramitesConEspacios}`);
      console.log(`- Trámites globales con QUIPUX_VINCULADO:       ${res.totalTramitesConQuipuxVinculado}`);
      console.log("\n--- DETALLE DE LOS 13 TRÁMITES SANEADOS ESPECÍFICOS ---");
      console.table(
        res.los13Saneados.map((d) => ({
          ID: d.id_tramite,
          Código: d.codigo_tramite,
          "Quipux Principal": d.numero_quipux,
          "Quipux Secundarios": d.quipuxSecundarios.join(" | "),
          "Certificación OK": d.estadoCorrecto ? "CORRECTO" : "ERROR",
        }))
      );
      if (res.errores.length > 0) {
        console.log("\nERRORES ENCONTRADOS:");
        res.errores.forEach((e) => console.log(`  [X] ${e}`));
      }
      console.log("===============================================================================");
      console.log(`RESULTADO BATERÍA 1: ${res.aprobado ? "CERTIFICADO / APROBADO (100% LIMPIO)" : "FALLIDO"}`);
      console.log("===============================================================================");
      process.exit(res.aprobado ? 0 : 1);
    })
    .catch((err) => {
      console.error("Error fatal en Batería 1:", err);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}
