/**
 * Utilidad Forense de Auditoría SENAE
 * Genera comparativas detalladas (diffs) entre los valores antes y después
 * de una modificación en el expediente para cumplir con normativas de Contraloría.
 */

export interface AuditFieldDiff {
  campo: string;
  etiqueta: string;
  anterior: any;
  nuevo: any;
}

export const ETIQUETAS_CAMPOS: Record<string, string> = {
  tipo_flujo: "Tipo de Gestión",
  numero_quipux: "Nro. Memorando Quipux",
  fecha_memorando: "Fecha del Memorando",
  fecha_recepcion_fisica: "Fecha de Recepción Física",
  id_tipo_tramite: "Tipo de Proceso",
  proveedor_beneficiario: "Beneficiario / Proveedor",
  ruc_proveedor: "RUC",
  monto_total: "Monto Total",
  numero_liquidacion: "Nro. Liquidación",
  numero_juicio: "Nro. Juicio",
  certificacion_presupuestaria: "Certificación Presupuestaria",
  item_presupuestario: "Ítem Presupuestario",
  numero_cur_compromiso: "CUR Compromiso",
  numero_cur_devengado: "CUR Devengado",
  numero_cur_contable: "CUR Contable",
  numero_factura: "Nro. Factura SRI",
  fecha_factura: "Fecha Factura",
  anexos: "Anexos Documentales",
  subtotal: "Subtotal",
  monto_iva: "IVA",
  monto_retenciones: "Retenciones",
  monto_multas: "Multas",
  lote_mef: "Lote MEF",
  spi_bce_referencia: "Referencia SPI (BCE)",
  comprobante_pago: "Comprobante de Pago",
  ubicacion_archivo: "Ubicación en Archivo",
  codigo_tomo_caja: "Código Tomo/Caja Pasiva",
  estanteria: "Estantería / Balda",
};

function formatValue(val: any): string {
  if (val === null || val === undefined || val === "") return "«Vacío»";
  if (val instanceof Date) return val.toISOString().slice(0, 10);
  if (typeof val === "number" || typeof val === "bigint") {
    return String(val);
  }
  if (typeof val === "boolean") return val ? "Sí" : "No";
  return String(val).trim();
}

export function computeAuditDiff(
  original: Record<string, any>,
  actualizado: Record<string, any>,
  camposRevisados?: string[]
): {
  cambios: AuditFieldDiff[];
  resumenTexto: string;
  tieneCambios: boolean;
} {
  const campos = camposRevisados || Object.keys(actualizado);
  const cambios: AuditFieldDiff[] = [];

  for (const campo of campos) {
    if (!(campo in actualizado)) continue;

    const valOrig = original[campo];
    const valNuevo = actualizado[campo];

    // Normalizar para comparación
    const strOrig = formatValue(valOrig);
    const strNuevo = formatValue(valNuevo);

    if (strOrig !== strNuevo) {
      cambios.push({
        campo,
        etiqueta: ETIQUETAS_CAMPOS[campo] || campo,
        anterior: strOrig,
        nuevo: strNuevo,
      });
    }
  }

  const tieneCambios = cambios.length > 0;
  const resumenTexto = tieneCambios
    ? "Modificaciones: " +
      cambios
        .map((c) => `[${c.etiqueta}: ${c.anterior} → ${c.nuevo}]`)
        .join("; ")
    : "Sin alteraciones de valores.";

  return { cambios, resumenTexto, tieneCambios };
}
