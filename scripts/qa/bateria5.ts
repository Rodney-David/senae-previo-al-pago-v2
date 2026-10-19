import ExcelJS from "exceljs";
import { generarActaAutorizacionDfiExcel } from "../../src/services/actaAutorizacionDfiService";
import { generarDocumentoCajaExcel, CajaParaDocumento } from "../../src/services/documentoCajaExcelService";
import { prisma } from "../../src/lib/prisma";

export interface Bateria5Result {
  actaDfiBufferValido: boolean;
  actaDfiBufferTamanoBytes: number;
  actaDfiHojas: string[];
  actaDfiColumnasCabecera: string[];
  reporteCajaBufferValido: boolean;
  reporteCajaBufferTamanoBytes: number;
  reporteCajaTotalColumnas: number;
  reporteCajaColumnasExactas: boolean;
  reporteCajaCabecerasEncontradas: string[];
  reporteCajaCabecerasEsperadas: string[];
  aprobado: boolean;
  errores: string[];
}

export async function ejecutarBateria5(): Promise<Bateria5Result> {
  const errores: string[] = [];

  // -------------------------------------------------------------
  // TEST 1: Generación y Validación de Acta de Autorización DFI
  // -------------------------------------------------------------
  // Obtener trámites de muestra de la base de datos
  const tramitesMuestra = await prisma.tramites.findMany({
    take: 5,
    include: { tipos_tramite: true },
  });

  const tramitesParaDfi = tramitesMuestra.map((t) => ({
    id_tramite: t.id_tramite,
    codigo_tramite: t.codigo_tramite,
    numero_quipux: t.numero_quipux,
    proveedor_beneficiario: t.proveedor_beneficiario || "PROVEEDOR DE PRUEBA",
    ruc_proveedor: t.ruc_proveedor || "0990000000001",
    tipos_tramite: t.tipos_tramite ? { nombre: t.tipos_tramite.nombre } : null,
    asunto: t.asunto || "Asunto de prueba institucional",
    numero_cur_devengado: t.numero_cur_devengado || "12345",
    numero_cur_contable: t.numero_cur_contable || "67890",
    monto_total: t.monto_total || 1500.5,
  }));

  let actaDfiBuffer: Buffer;
  let actaDfiBufferValido = false;
  let actaDfiHojas: string[] = [];
  let actaDfiColumnasCabecera: string[] = [];

  try {
    actaDfiBuffer = await generarActaAutorizacionDfiExcel(tramitesParaDfi);
    if (!Buffer.isBuffer(actaDfiBuffer) || actaDfiBuffer.length === 0) {
      errores.push("El buffer generado por generarActaAutorizacionDfiExcel no es válido o está vacío.");
    } else {
      // Re-parsear el buffer con ExcelJS para asegurar integridad binaria
      const wbDfi = new ExcelJS.Workbook();
      await wbDfi.xlsx.load(actaDfiBuffer as any);
      actaDfiHojas = wbDfi.worksheets.map((w) => w.name);
      const wsDfi = wbDfi.worksheets[0];
      if (wsDfi) {
        const row3 = wsDfi.getRow(3);
        actaDfiColumnasCabecera = [];
        row3.eachCell((c) => {
          if (c.value) actaDfiColumnasCabecera.push(String(c.value).trim());
        });
        actaDfiBufferValido = actaDfiColumnasCabecera.length === 10;
      }
    }
  } catch (err: any) {
    errores.push(`Excepción al generar o verificar Acta DFI: ${err.message}`);
  }

  // -------------------------------------------------------------
  // TEST 2: Generación y Validación de Reporte de Caja
  // -------------------------------------------------------------
  const cajaMuestra: CajaParaDocumento = {
    id_caja: 1,
    codigo_caja: "CAJA-QA-2026-001",
    nombre: "Caja de Pruebas QA Automatizadas 2026",
    tramites: tramitesMuestra.map((t, idx) => ({
      id_tramite: t.id_tramite,
      codigo_tramite: t.codigo_tramite,
      numero_quipux: t.numero_quipux,
      proveedor_beneficiario: t.proveedor_beneficiario || `PROVEEDOR ${idx + 1}`,
      asunto: t.asunto || "Asunto de prueba",
      monto_total: t.monto_total || 2400.0,
      numero_hojas: t.numero_hojas || 45,
      numero_cur_devengado: t.numero_cur_devengado || "112233",
      numero_cur_contable: t.numero_cur_contable,
      carton: 1,
    })),
  };

  const reporteCajaCabecerasEsperadas = [
    "NO",
    "CARTON",
    "NUMERO DE QUIPUX",
    "NRO CUR",
    "PROVEEDOR",
    "MONTO",
    "OBSERVACION",
  ];

  let reporteCajaBuffer: Buffer;
  let reporteCajaBufferValido = false;
  let reporteCajaCabecerasEncontradas: string[] = [];
  let reporteCajaColumnasExactas = false;

  try {
    reporteCajaBuffer = await generarDocumentoCajaExcel(cajaMuestra);
    if (!Buffer.isBuffer(reporteCajaBuffer) || reporteCajaBuffer.length === 0) {
      errores.push("El buffer generado por generarDocumentoCajaExcel no es válido o está vacío.");
    } else {
      const wbCaja = new ExcelJS.Workbook();
      await wbCaja.xlsx.load(reporteCajaBuffer as any);
      const wsCaja = wbCaja.worksheets[0];
      if (wsCaja) {
        const row3 = wsCaja.getRow(3);
        reporteCajaCabecerasEncontradas = [];
        row3.eachCell({ includeEmpty: false }, (c) => {
          if (c.value) reporteCajaCabecerasEncontradas.push(String(c.value).trim().toUpperCase());
        });

        reporteCajaColumnasExactas =
          reporteCajaCabecerasEncontradas.length === reporteCajaCabecerasEsperadas.length &&
          reporteCajaCabecerasEsperadas.every(
            (col, idx) => col === reporteCajaCabecerasEncontradas[idx]
          );

        if (!reporteCajaColumnasExactas) {
          errores.push(
            `Las cabeceras del Reporte de Caja no coinciden exactamente. Esperadas: [${reporteCajaCabecerasEsperadas.join(", ")}], Encontradas: [${reporteCajaCabecerasEncontradas.join(", ")}]`
          );
        }
        reporteCajaBufferValido = true;
      }
    }
  } catch (err: any) {
    errores.push(`Excepción al generar o verificar Reporte de Caja: ${err.message}`);
  }

  const aprobado = errores.length === 0 && actaDfiBufferValido && reporteCajaColumnasExactas;

  return {
    actaDfiBufferValido,
    actaDfiBufferTamanoBytes: actaDfiBuffer!?.length || 0,
    actaDfiHojas,
    actaDfiColumnasCabecera,
    reporteCajaBufferValido,
    reporteCajaBufferTamanoBytes: reporteCajaBuffer!?.length || 0,
    reporteCajaTotalColumnas: reporteCajaCabecerasEncontradas.length,
    reporteCajaColumnasExactas,
    reporteCajaCabecerasEncontradas,
    reporteCajaCabecerasEsperadas,
    aprobado,
    errores,
  };
}

if (require.main === module) {
  ejecutarBateria5()
    .then((res) => {
      console.log("===============================================================================");
      console.log("  BATERÍA 5: PRUEBAS DEL ACTA DE AUTORIZACIÓN DFI Y REPORTE DE CAJA            ");
      console.log("===============================================================================");
      console.log("[1] ACTA DE AUTORIZACIÓN DFI:");
      console.log(`  - Generación de Buffer binario:               ${res.actaDfiBufferValido ? "CERTIFICADO (Válido)" : "FALLIDO"}`);
      console.log(`  - Tamaño de archivo generado:                 ${res.actaDfiBufferTamanoBytes} bytes`);
      console.log(`  - Nombre de hoja institucional:               ${res.actaDfiHojas.join(", ")}`);
      console.log(`  - Total columnas estructuradas (Fila 3):       ${res.actaDfiColumnasCabecera.length} columnas`);
      console.log("\n[2] REPORTE DE CAJA (TESORERÍA/COBRANZAS):");
      console.log(`  - Generación de Buffer binario:               ${res.reporteCajaBufferValido ? "CERTIFICADO (Válido)" : "FALLIDO"}`);
      console.log(`  - Tamaño de archivo generado:                 ${res.reporteCajaBufferTamanoBytes} bytes`);
      console.log(`  - Total columnas encontradas:                 ${res.reporteCajaTotalColumnas} (Esperado: 7)`);
      console.log(`  - Coincidencia exacta de 7 columnas:          ${res.reporteCajaColumnasExactas ? "CERTIFICADO (100% Exacto)" : "FALLIDO"}`);
      console.log("\n  COLUMNAS REPORTADAS:");
      res.reporteCajaCabecerasEsperadas.forEach((col, idx) => {
        const enc = res.reporteCajaCabecerasEncontradas[idx];
        console.log(`    Columna ${idx + 1}: ${col === enc ? "[OK]" : "[ERROR]"} ${enc}`);
      });
      if (res.errores.length > 0) {
        console.log("\nERRORES ENCONTRADOS:");
        res.errores.forEach((e) => console.log(`  [X] ${e}`));
      }
      console.log("===============================================================================");
      console.log(`RESULTADO BATERÍA 5: ${res.aprobado ? "CERTIFICADO / APROBADO (100% CUMPLIDO)" : "FALLIDO"}`);
      console.log("===============================================================================");
      process.exit(res.aprobado ? 0 : 1);
    })
    .catch((err) => {
      console.error("Error fatal en Batería 5:", err);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}
