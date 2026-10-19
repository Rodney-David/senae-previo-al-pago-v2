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

    // C-07: Generar código de trámite correlativo anual determinando el último número emitido
    const year = new Date().getFullYear();
    const prefix = `TRM-${year}-`;
    const ultimoTramite = await prisma.tramites.findFirst({
      where: { codigo_tramite: { startsWith: prefix } },
      orderBy: { id_tramite: "desc" },
      select: { codigo_tramite: true },
    });

    let nextSeq = 1;
    if (ultimoTramite?.codigo_tramite) {
      const parts = ultimoTramite.codigo_tramite.split("-");
      const lastNum = parseInt(parts[2], 10);
      if (!isNaN(lastNum)) nextSeq = lastNum + 1;
    }
    const codigoTramite = `${prefix}${String(nextSeq).padStart(4, "0")}`;

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
    if (!jefePresupuesto) {
      throw new Error("No se encontró un Jefe de Presupuesto activo para recibir el lote de trámites.");
    }
    const idJefePresupuesto = jefePresupuesto.id_usuario;

    // Validación previa de estado de todos los trámites
    const tramitesAVerificar = await prisma.tramites.findMany({
      where: { id_tramite: { in: idsTramites } },
    });

    for (const t of tramitesAVerificar) {
      if (t.estado_general !== "INGRESADO") {
        throw new Error(`El trámite ${t.codigo_tramite} no está en estado INGRESADO (actual: ${t.estado_general}).`);
      }
    }

    const now = new Date();

    // M-03: Actualización atómica en transacción
    await prisma.$transaction(
      idsTramites.map((id) =>
        prisma.tramites.update({
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
        })
      )
    );

    const tramitesActualizados = await prisma.tramites.findMany({
      where: { id_tramite: { in: idsTramites } },
    });

    for (const id of idsTramites) {
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

    // M-03: Actualización atómica en transacción
    await prisma.$transaction(
      idsTramites.map((id) =>
        prisma.tramites.update({
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
        })
      )
    );

    const tramitesRecibidos = await prisma.tramites.findMany({
      where: { id_tramite: { in: idsTramites } },
    });

    for (const id of idsTramites) {
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
   * Paso 5: Autorización de Pago por la Directora Financiera (DFI) por lote.
   * Cambia estado_general: "DFI", sub_estado: "AUTORIZADO_EN_TESORERIA",
   * marca autorizado_pago: true, fecha_autorizacion_pago y deriva a Tesorería (id_area: 4).
   */
  public static async autorizarPagoDfiLote(
    idsTramites: number[],
    idUsuarioAutoriza: number
  ) {
    if (!idsTramites || idsTramites.length === 0) {
      throw new Error("Debe seleccionar al menos un trámite para autorizar");
    }

    const tesorero = await prisma.usuarios.findFirst({
      where: { id_area: 4, rol: "JEFE", activo: true },
    });
    if (!tesorero) {
      throw new Error("No se encontró un Tesorero activo para autorizar y recibir los trámites en Tesorería.");
    }
    const idTesorero = tesorero.id_usuario;
    const now = new Date();

    await prisma.$transaction(async (tx) => {
      for (const id of idsTramites) {
        await tx.tramites.update({
          where: { id_tramite: id },
          data: {
            autorizado_pago: true,
            id_usuario_autoriza_pago: idUsuarioAutoriza,
            fecha_autorizacion_pago: now,
            id_area_actual: 4, // Tesorería
            id_custodio_actual: idTesorero,
            estado_general: "DFI",
            sub_estado: "AUTORIZADO_EN_TESORERIA",
            fecha_ultimo_movimiento: now,
            fecha_ultima_modificacion: now,
          },
        });

        await registrarBitacora(
          {
            id_tramite: id,
            id_usuario_entrega: idUsuarioAutoriza,
            id_usuario_recibe: idTesorero,
            id_area_origen: 1, // DFI
            id_area_destino: 4, // Tesorería
            tipo_accion: "AUTORIZACION_DFI_PASE_TESORERIA",
            comentarios:
              "Pago autorizado en lote por la Dirección Financiera. Expedientes derivados formalmente a Tesorería / Pagos.",
            fecha_hora: now,
          },
          tx
        );
      }
    });

    return prisma.tramites.findMany({
      where: { id_tramite: { in: idsTramites } },
    });
  }
}


