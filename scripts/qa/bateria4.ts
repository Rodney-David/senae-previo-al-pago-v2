import {
  obtenerAuditoriaTramites,
  obtenerRendimientoFuncionarios,
  obtenerAuditoriaProcesos,
} from "../../src/services/reportesTiemposService";
import { prisma } from "../../src/lib/prisma";

export interface Bateria4Result {
  conteoTodos: number;
  conteoPago: number;
  conteoGarantia: number;
  sumaEsConsistente: boolean;
  sinNaNs: boolean;
  sinDivisionPorCero: boolean;
  valoresCalculados: {
    todos: {
      total: number;
      medianaAuditoria: any;
      medianaTrabajoReal: any;
      distribucionCalidad: any;
    };
    pago: {
      total: number;
      medianaAuditoria: any;
      medianaTrabajoReal: any;
    };
    garantia: {
      total: number;
      medianaAuditoria: any;
      medianaTrabajoReal: any;
    };
  };
  aprobado: boolean;
  errores: string[];
}

function contieneNaN(obj: any, path = ""): string[] {
  const encontrados: string[] = [];
  if (obj === null || obj === undefined) return encontrados;

  if (typeof obj === "number") {
    if (isNaN(obj)) {
      encontrados.push(`NaN encontrado en ${path}`);
    } else if (!isFinite(obj)) {
      encontrados.push(`Infinito (División por cero) encontrado en ${path}`);
    }
  } else if (Array.isArray(obj)) {
    obj.forEach((item, index) => {
      encontrados.push(...contieneNaN(item, `${path}[${index}]`));
    });
  } else if (typeof obj === "object") {
    for (const [key, value] of Object.entries(obj)) {
      encontrados.push(...contieneNaN(value, path ? `${path}.${key}` : key));
    }
  }
  return encontrados;
}

export async function ejecutarBateria4(): Promise<Bateria4Result> {
  const errores: string[] = [];

  // 1. Ejecutar llamadas simuladas a reportesTiemposService
  const resTodos = await obtenerAuditoriaTramites({ padre_gestion: "TODOS" });
  const resPago = await obtenerAuditoriaTramites({ padre_gestion: "PAGO" });
  const resGarantia = await obtenerAuditoriaTramites({ padre_gestion: "GARANTIA" });

  const conteoTodos = resTodos.kpis.total_tramites_analizados;
  const conteoPago = resPago.kpis.total_tramites_analizados;
  const conteoGarantia = resGarantia.kpis.total_tramites_analizados;

  // Verificación matemática de la partición estricta
  const sumaEsConsistente = conteoPago + conteoGarantia === conteoTodos;
  if (!sumaEsConsistente) {
    errores.push(
      `Inconsistencia matemática en conteos: PAGO (${conteoPago}) + GARANTIA (${conteoGarantia}) !== TODOS (${conteoTodos})`
    );
  }

  // 2. Ejecutar pestañas de funcionarios y procesos para auditoría completa de cálculos
  const resFuncionariosTodos = await obtenerRendimientoFuncionarios({ padre_gestion: "TODOS" });
  const resProcesosTodos = await obtenerAuditoriaProcesos({ padre_gestion: "TODOS" });

  // 3. Inspeccionar presencia de NaN o divisiones por cero en todas las respuestas
  const nansEnAuditoria = [
    ...contieneNaN(resTodos, "resTodos"),
    ...contieneNaN(resPago, "resPago"),
    ...contieneNaN(resGarantia, "resGarantia"),
    ...contieneNaN(resFuncionariosTodos, "resFuncionariosTodos"),
    ...contieneNaN(resProcesosTodos, "resProcesosTodos"),
  ];

  if (nansEnAuditoria.length > 0) {
    errores.push(...nansEnAuditoria);
  }

  const sinNaNs = nansEnAuditoria.length === 0;
  const sinDivisionPorCero = !nansEnAuditoria.some((e) => e.includes("Infinito"));

  const aprobado = errores.length === 0 && sumaEsConsistente && sinNaNs && sinDivisionPorCero;

  return {
    conteoTodos,
    conteoPago,
    conteoGarantia,
    sumaEsConsistente,
    sinNaNs,
    sinDivisionPorCero,
    valoresCalculados: {
      todos: {
        total: conteoTodos,
        medianaAuditoria: resTodos.kpis.mediana_tiempo_auditoria_dias,
        medianaTrabajoReal: resTodos.kpis.mediana_tiempo_trabajo_real_dias,
        distribucionCalidad: resTodos.kpis.distribucion_calidad,
      },
      pago: {
        total: conteoPago,
        medianaAuditoria: resPago.kpis.mediana_tiempo_auditoria_dias,
        medianaTrabajoReal: resPago.kpis.mediana_tiempo_trabajo_real_dias,
      },
      garantia: {
        total: conteoGarantia,
        medianaAuditoria: resGarantia.kpis.mediana_tiempo_auditoria_dias,
        medianaTrabajoReal: resGarantia.kpis.mediana_tiempo_trabajo_real_dias,
      },
    },
    aprobado,
    errores,
  };
}

if (require.main === module) {
  ejecutarBateria4()
    .then((res) => {
      console.log("===============================================================================");
      console.log("     BATERÍA 4: PRUEBAS FUNCIONALES DE API DE REPORTERÍA Y CONTEOS             ");
      console.log("===============================================================================");
      console.log(`- Conteo TODOS:                   ${res.conteoTodos}`);
      console.log(`- Conteo PAGO:                    ${res.conteoPago}`);
      console.log(`- Conteo GARANTÍA:                ${res.conteoGarantia}`);
      console.log(`- Invariante Suma (${res.conteoPago} + ${res.conteoGarantia} === ${res.conteoTodos}): ${res.sumaEsConsistente ? "CUMPLE (EXACTO)" : "FALLA"}`);
      console.log(`- Ausencia total de NaN:          ${res.sinNaNs ? "CERTIFICADO (0 NaN)" : "FALLA"}`);
      console.log(`- Ausencia de división por cero:  ${res.sinDivisionPorCero ? "CERTIFICADO (0 Div/0)" : "FALLA"}`);
      console.log("\n--- MÉTRICAS Y MEDIANAS CALCULADAS ---");
      console.log("POBLACIÓN TOTAL (TODOS):", res.valoresCalculados.todos);
      console.log("FLUJO PAGO:", res.valoresCalculados.pago);
      console.log("FLUJO GARANTÍA:", res.valoresCalculados.garantia);
      if (res.errores.length > 0) {
        console.log("\nERRORES ENCONTRADOS:");
        res.errores.forEach((e) => console.log(`  [X] ${e}`));
      }
      console.log("===============================================================================");
      console.log(`RESULTADO BATERÍA 4: ${res.aprobado ? "CERTIFICADO / APROBADO (100% LIMPIO)" : "FALLIDO"}`);
      console.log("===============================================================================");
      process.exit(res.aprobado ? 0 : 1);
    })
    .catch((err) => {
      console.error("Error fatal en Batería 4:", err);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}
