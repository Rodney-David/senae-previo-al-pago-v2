import { prisma } from "@/lib/prisma";
import { registrarBitacora } from "@/services/bitacoraService";

export interface CrearTramiteInput {
  tipo_gestion: string; // PAGO, EXPEDIENTE
  numero_quipux: string;
  fecha_memorando?: string | Date | null;
  fecha_recepcion_fisica?: string | Date | null;
  id_tipo_tramite: number;
  proveedor_beneficiario: string;
  ruc_proveedor?: string;
  subtotal?: number;
  monto_iva?: number;
  monto_retenciones?: number;
  monto_multas?: number;
  monto_total: number;
  numero_factura?: string;
  fecha_factura?: string | Date | null;
  id_usuario_creador: number;
  comentarios?: string;
}

/**
 * Servicio central para la gestión del ciclo de vida, transiciones de estado,
 * asignaciones por cuantía, round-robin y flujo bidireccional de trámites SENAE.
 */
export class TramiteService {
  /**
   * Obtiene el próximo analista de presupuesto activo según Round-Robin
   */
  private static async obtenerAnalistaPresupuestoRoundRobin(): Promise<number> {
    // Buscar analistas de presupuesto (Area 2, Rol ANALISTA) activos y disponibles
    const analistas = await prisma.usuarios.findMany({
      where: {
        id_area: 2, // PRESUPUESTO
        rol: "ANALISTA",
        activo: true,
        estado_disponibilidad: "DISPONIBLE",
      },
      orderBy: { id_usuario: "asc" },
    });

    if (analistas.length === 0) {
      // Fallback al jefe de presupuesto (id 3)
      return 3;
    }

    // Buscar último analista asignado en asignacion_turnos para el área 2
    const turno = await prisma.asignacion_turnos.findUnique({
      where: { id_area: 2 },
    });

    let proximoIndex = 0;
    if (turno && turno.id_ultimo_usuario_asignado) {
      const currentIndex = analistas.findIndex(
        (a) => a.id_usuario === turno.id_ultimo_usuario_asignado
      );
      if (currentIndex !== -1) {
        proximoIndex = (currentIndex + 1) % analistas.length;
      }
    }

    const elegido = analistas[proximoIndex];

    // Actualizar registro de turno
    await prisma.asignacion_turnos.upsert({
      where: { id_area: 2 },
      update: {
        id_ultimo_usuario_asignado: elegido.id_usuario,
        fecha_ultima_asignacion: new Date(),
      },
      create: {
        id_area: 2,
        id_ultimo_usuario_asignado: elegido.id_usuario,
        fecha_ultima_asignacion: new Date(),
      },
    });

    return elegido.id_usuario;
  }

  /**
   * Recepción inicial del trámite físico en Dirección Financiera (Secretaria o Directora).
   * Aplica la regla de bifurcación por cuantía:
   *  - Monto >= $10.000 -> Asignación directa a Jefe de Presupuesto (id: 3)
   *  - Monto < $10.000  -> Asignación Round-Robin entre Analistas de Presupuesto activos
   */
  public static async crearTramite(input: CrearTramiteInput) {
    const esAltaCuantia = Number(input.monto_total) >= 10000;
    let idUsuarioAsignado = 3; // Jefe de Presupuesto por defecto

    if (!esAltaCuantia) {
      idUsuarioAsignado = await this.obtenerAnalistaPresupuestoRoundRobin();
    }

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
        tipo_flujo: input.tipo_gestion || "PAGO",
        proveedor_beneficiario: input.proveedor_beneficiario,
        ruc_proveedor: input.ruc_proveedor || null,
        subtotal: input.subtotal ? Number(input.subtotal) : null,
        monto_iva: input.monto_iva ? Number(input.monto_iva) : null,
        monto_retenciones: input.monto_retenciones ? Number(input.monto_retenciones) : null,
        monto_multas: input.monto_multas ? Number(input.monto_multas) : null,
        monto_total: Number(input.monto_total),
        es_alta_cuantia: esAltaCuantia,
        numero_factura: input.numero_factura || null,
        fecha_factura: input.fecha_factura ? new Date(input.fecha_factura) : null,
        id_area_actual: 2, // Se deriva inmediatamente a PRESUPUESTO
        id_custodio_actual: idUsuarioAsignado,
        estado_general: "EN_PRESUPUESTO",
        sub_estado: esAltaCuantia ? "ASIGNADO_ALTA_CUANTIA_JEFE" : "ASIGNADO_ROUND_ROBIN",
        fecha_ingreso: new Date(),
        fecha_ultimo_movimiento: new Date(),
        fecha_ultima_modificacion: new Date(),
      },
    });

    // Registrar en bitácora inmutable
    await registrarBitacora({
      id_tramite: nuevoTramite.id_tramite,
      id_usuario_entrega: input.id_usuario_creador,
      id_usuario_recibe: idUsuarioAsignado,
      id_area_origen: 1, // DFI
      id_area_destino: 2, // PRESUPUESTO
      tipo_accion: "RECEPCION_Y_ASIGNACION",
      comentarios: `Trámite ingresado en DFI. Asignado a Presupuesto por ${
        esAltaCuantia ? "Alta Cuantía (Jefe)" : "Round-Robin (Analista)"
      }. ${input.comentarios || ""}`,
    });

    return nuevoTramite;
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
