import { prisma } from "@/lib/prisma";
import { registrarBitacora } from "@/services/bitacoraService";

export interface CrearTramiteInput {
  padre_gestion?: string; // PAGO, GARANTIA
  tipo_gestion?: string; // PAGO, EXPEDIENTE, JUSTIFICACION, etc.
  tipo_flujo?: string;
  numero_quipux: string;
  area_requirente?: string;
  ciudad?: string;
  asunto?: string;
  fecha_memorando?: string | Date | null;
  fecha_recepcion_fisica?: string | Date | null;
  id_tipo_tramite: number;
  proveedor_beneficiario?: string;
  ruc_proveedor?: string;
  numero_juicio?: string | null;
  numero_liquidacion?: string | null;
  subtotal?: number;
  id_usuario_creador: number;
  comentarios?: string;
}

/**
 * Servicio central para la gestión del ciclo de vida, transiciones de estado,
 * asignaciones inteligentes y flujo institucional de control previo SENAE.
 */
export class TramiteService {
  /**
   * Paso 1: Ingreso en Secretaría (DFI).
   * El trámite queda en estado INGRESADO en su propia bandeja de "Mi Escritorio".
   * CERO autoasignación. Custodio: la secretaria creadora. Área: 1 (DFI).
   */
  public static async crearTramite(input: CrearTramiteInput) {
    const sub = input.subtotal ? Number(input.subtotal) : 0;
    const esAltaCuantia = sub >= 10000;

    // Generar código de trámite correlativo anual: TRM-2026-XXXX
    const count = await prisma.tramites.count();
    const codigoTramite = `TRM-${new Date().getFullYear()}-${String(count + 1).padStart(4, "0")}`;

    const nuevoTramite = await prisma.tramites.create({
      data: {
        codigo_tramite: codigoTramite,
        numero_quipux: input.numero_quipux,
        fecha_memorando: input.fecha_memorando ? new Date(input.fecha_memorando) : new Date(),
        fecha_recepcion_fisica: input.fecha_recepcion_fisica
          ? new Date(input.fecha_recepcion_fisica)
          : new Date(),
        id_tipo_tramite: input.id_tipo_tramite,
        tipo_flujo: input.padre_gestion || "PAGO",
        padre_gestion: input.padre_gestion || "PAGO",
        tipo_gestion: input.tipo_gestion || "PAGO",
        area_requirente: input.area_requirente || null,
        ciudad: input.ciudad?.trim() || null,
        asunto: input.asunto || null,
        proveedor_beneficiario: input.proveedor_beneficiario || "N/A",
        ruc_proveedor: input.ruc_proveedor || null,
        numero_juicio: input.numero_juicio || null,
        numero_liquidacion: input.numero_liquidacion || null,
        subtotal: sub,
        monto_total: sub,
        es_alta_cuantia: esAltaCuantia,
        numero_hojas: null,
        id_area_actual: 1, // DFI
        id_custodio_actual: input.id_usuario_creador, // Secretaría creadora en Mi Escritorio
        estado_general: "INGRESADO",
        sub_estado: "RECEPCIONADO_DFI",
        fecha_ingreso: new Date(),
        fecha_ultimo_movimiento: new Date(),
        fecha_ultima_modificacion: new Date(),
      },
    });

    // Registrar en bitácora inmutable
    await registrarBitacora({
      id_tramite: nuevoTramite.id_tramite,
      id_usuario_entrega: input.id_usuario_creador,
      id_usuario_recibe: input.id_usuario_creador,
      id_area_origen: 1, // DFI
      id_area_destino: 1, // DFI
      tipo_accion: "INGRESO_SECRETARIA",
      comentarios: `Trámite ingresado en DFI por Secretaría en Mi Escritorio. Estado INGRESADO. Ciudad: ${input.ciudad || "N/A"}. Gestión: ${
        input.padre_gestion || "PAGO"
      } - ${input.tipo_gestion || "PAGO"}. ${input.comentarios || ""}`,
    });

    return nuevoTramite;
  }

  /**
   * Paso 2: Despacho por Lote a Presupuesto (Control Previo).
   * Custodio pasa a la Jefa de Presupuesto (id_area: 2).
   * Estado permanece en INGRESADO (sub_estado: POR_RECIBIR_FISICAMENTE) hasta que la Jefa marque recibo físico.
   */
  public static async entregarControlPrevioLote(
    idsTramites: number[],
    idUsuarioEntrega: number
  ) {
    if (!idsTramites || idsTramites.length === 0) {
      throw new Error("Debe seleccionar al menos un trámite para entregar");
    }

    const jefePresupuesto = await prisma.usuarios.findFirst({
      where: { id_area: 2, rol: "JEFE", activo: true },
    });
    const idJefePresupuesto = jefePresupuesto?.id_usuario || 3;

    const now = new Date();
    const tramitesActualizados = [];

    for (const id of idsTramites) {
      const tramite = await prisma.tramites.findUnique({
        where: { id_tramite: id },
      });

      if (!tramite) continue;

      if (tramite.estado_general !== "INGRESADO") {
        throw new Error(
          `El trámite ${tramite.codigo_tramite} no está en estado INGRESADO (actual: ${tramite.estado_general}).`
        );
      }

      const updated = await prisma.tramites.update({
        where: { id_tramite: id },
        data: {
          estado_general: "INGRESADO",
          sub_estado: "POR_RECIBIR_FISICAMENTE",
          id_area_actual: 2, // PRESUPUESTO
          id_custodio_actual: idJefePresupuesto,
          fecha_entrega_control_previo: now,
          fecha_ultimo_movimiento: now,
          fecha_ultima_modificacion: now,
        },
      });

      tramitesActualizados.push(updated);

      await registrarBitacora({
        id_tramite: id,
        id_usuario_entrega: idUsuarioEntrega,
        id_usuario_recibe: idJefePresupuesto,
        id_area_origen: 1, // DFI
        id_area_destino: 2, // PRESUPUESTO
        tipo_accion: "ENTREGA_CONTROL_PREVIO_LOTE",
        comentarios: "Expediente despachado formalmente a Control Previo (Presupuesto) con Acta oficial. En espera de recepción física.",
      });
    }

    return tramitesActualizados;
  }

  /**
   * Paso 2.5: Recepción Física por la Jefa de Presupuesto.
   * Cambia INGRESADO -> REVISION.
   * Inicia formalmente el cómputo de SLA reglamentario (6 días laborables).
   */
  public static async recibirFisicamenteLote(
    idsTramites: number[],
    idUsuarioRecibe: number
  ) {
    if (!idsTramites || idsTramites.length === 0) {
      throw new Error("Debe seleccionar al menos un trámite para recibir físicamente");
    }

    const now = new Date();
    const tramitesRecibidos = [];

    for (const id of idsTramites) {
      const tramite = await prisma.tramites.findUnique({
        where: { id_tramite: id },
      });

      if (!tramite) continue;

      const updated = await prisma.tramites.update({
        where: { id_tramite: id },
        data: {
          estado_general: "REVISION",
          sub_estado: "EN_REVISION_PRESUPUESTO",
          id_area_actual: 2, // PRESUPUESTO
          id_custodio_actual: idUsuarioRecibe,
          fecha_recepcion_fisica: now,
          fecha_ultimo_movimiento: now,
          fecha_ultima_modificacion: now,
        },
      });

      tramitesRecibidos.push(updated);

      await registrarBitacora({
        id_tramite: id,
        id_usuario_entrega: idUsuarioRecibe,
        id_usuario_recibe: idUsuarioRecibe,
        id_area_origen: 2,
        id_area_destino: 2,
        tipo_accion: "RECEPCION_FISICA_PRESUPUESTO",
        comentarios: "Expediente recibido físicamente en Control Previo (Presupuesto). Inicio formal del conteo de SLA reglamentario (6 días laborables).",
      });
    }

    return tramitesRecibidos;
  }

}


