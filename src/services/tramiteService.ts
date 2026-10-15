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

  /**
   * Pausar o reanudar el semáforo SLA por espera de factura en Presupuesto
   */
  public static async gestionarPausaFactura(
    idTramite: number,
    accion: "PAUSAR" | "REANUDAR",
    idUsuario: number,
    datosFactura?: { numero_factura: string; fecha_factura: string | Date }
  ) {
    const tramite = await prisma.tramites.findUnique({
      where: { id_tramite: idTramite },
    });

    if (!tramite) throw new Error("Trámite no encontrado");

    const now = new Date();

    if (accion === "PAUSAR") {
      await prisma.tramites.update({
        where: { id_tramite: idTramite },
        data: {
          esta_pausado: true,
          motivo_pausa: "En espera de factura del proveedor",
          fecha_pausa: now,
          fecha_ultimo_movimiento: now,
        },
      });

      await registrarBitacora({
        id_tramite: idTramite,
        id_usuario_entrega: idUsuario,
        id_usuario_recibe: idUsuario,
        id_area_origen: tramite.id_area_actual,
        id_area_destino: tramite.id_area_actual,
        tipo_accion: "PAUSA_SEMAFORO_FACTURA",
        comentarios: "Semáforo SLA pausado: En espera de emisión de factura.",
      });
    } else {
      // Reanudar
      let diasTranscurridosPausa = 0;
      if (tramite.fecha_pausa) {
        const diffMs = now.getTime() - new Date(tramite.fecha_pausa).getTime();
        diasTranscurridosPausa = Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));
      }

      await prisma.tramites.update({
        where: { id_tramite: idTramite },
        data: {
          esta_pausado: false,
          motivo_pausa: null,
          dias_pausa_acumulados: (tramite.dias_pausa_acumulados || 0) + diasTranscurridosPausa,
          numero_factura: datosFactura?.numero_factura || tramite.numero_factura,
          fecha_factura: datosFactura?.fecha_factura
            ? new Date(datosFactura.fecha_factura)
            : tramite.fecha_factura,
          fecha_ultimo_movimiento: now,
        },
      });

      await registrarBitacora({
        id_tramite: idTramite,
        id_usuario_entrega: idUsuario,
        id_usuario_recibe: idUsuario,
        id_area_origen: tramite.id_area_actual,
        id_area_destino: tramite.id_area_actual,
        tipo_accion: "REANUDACION_SEMAFORO_FACTURA",
        comentarios: `Semáforo reactivado con Factura Nro: ${datosFactura?.numero_factura || "Registrada"}. Días pausa sumados: ${diasTranscurridosPausa}.`,
      });
    }

    return prisma.tramites.findUnique({ where: { id_tramite: idTramite } });
  }

  /**
   * Solicitar Devolución Preventiva (Mecanismo Recall) por Memorando de Alcance Quipux
   */
  public static async solicitarRecall(
    idTramite: number,
    idUsuarioEmisor: number,
    numeroMemorandoAlcance: string,
    motivo: string
  ) {
    const tramite = await prisma.tramites.findUnique({
      where: { id_tramite: idTramite },
      include: { usuarios: true },
    });

    if (!tramite) throw new Error("Trámite no encontrado");

    const usuarioEmisor = await prisma.usuarios.findUnique({
      where: { id_usuario: idUsuarioEmisor },
    });

    if (!usuarioEmisor) throw new Error("Usuario emisor no encontrado");

    const now = new Date();

    // El trámite regresa inmediatamente a la bandeja del usuario emisor
    const tramiteActualizado = await prisma.tramites.update({
      where: { id_tramite: idTramite },
      data: {
        id_area_actual: usuarioEmisor.id_area,
        id_custodio_actual: usuarioEmisor.id_usuario,
        estado_general: "RECALL_SOLICITADO",
        sub_estado: "RECUPERADO_POR_ALCANCE",
        fecha_ultimo_movimiento: now,
        fecha_ultima_modificacion: now,
      },
    });

    // Registrar la referencia Quipux
    await prisma.tramite_referencias.create({
      data: {
        id_tramite: idTramite,
        tipo_documento: "MEMORANDO_ALCANCE",
        numero_documento: numeroMemorandoAlcance,
        fecha_documento: now,
        asunto_sumilla: `Recall por Memorando de Alcance: ${motivo}`,
        id_usuario_registro: idUsuarioEmisor,
      },
    });

    // Registrar en bitácora
    await registrarBitacora({
      id_tramite: idTramite,
      id_usuario_entrega: tramite.id_custodio_actual,
      id_usuario_recibe: idUsuarioEmisor,
      id_area_origen: tramite.id_area_actual,
      id_area_destino: usuarioEmisor.id_area,
      tipo_accion: "RECALL_PREVENTIVO",
      comentarios: `Recall ejecutado con Memo de Alcance Nro: ${numeroMemorandoAlcance}. Motivo: ${motivo}`,
    });

    return tramiteActualizado;
  }
}

