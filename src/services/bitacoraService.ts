import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";

export interface RegistrarBitacoraParams {
  id_tramite: number;
  id_usuario_entrega: number;
  id_usuario_recibe: number;
  id_area_origen: number;
  id_area_destino: number;
  tipo_accion: string;
  comentarios?: string | null;
  fecha_hora?: Date;
  actualizarUltimoMovimiento?: boolean;
}

/**
 * Registra un movimiento inmutable en la bitácora institucional (historial_movimientos)
 * y actualiza la fecha de último movimiento en el trámite para garantizar la prioridad
 * por "Última Novedad" en Mi Escritorio.
 *
 * Si se proporciona un cliente transaccional `tx`, las operaciones se ejecutan dentro de dicha transacción.
 * Para evitar la doble escritura innecesaria sobre `tramites` cuando ya ha sido actualizado
 * en la misma transacción, `actualizarUltimoMovimiento` es falso por defecto si se provee `tx`,
 * a menos que se indique explícitamente `actualizarUltimoMovimiento: true`.
 */
export async function registrarBitacora(
  params: RegistrarBitacoraParams,
  tx?: Prisma.TransactionClient
) {
  const now = params.fecha_hora || new Date();
  const debeActualizarTramite =
    params.actualizarUltimoMovimiento !== undefined
      ? params.actualizarUltimoMovimiento
      : tx
      ? false
      : true;

  if (tx) {
    const movimiento = await tx.historial_movimientos.create({
      data: {
        id_tramite: params.id_tramite,
        id_usuario_entrega: params.id_usuario_entrega,
        id_usuario_recibe: params.id_usuario_recibe,
        id_area_origen: params.id_area_origen,
        id_area_destino: params.id_area_destino,
        tipo_accion: params.tipo_accion,
        comentarios: params.comentarios,
        fecha_hora: now,
      },
    });

    if (debeActualizarTramite) {
      await tx.tramites.update({
        where: { id_tramite: params.id_tramite },
        data: {
          fecha_ultimo_movimiento: now,
          fecha_ultima_modificacion: now,
        },
      });
    }

    return movimiento;
  }

  // Si no se proporcionó cliente transaccional externo
  if (debeActualizarTramite) {
    const [movimiento] = await prisma.$transaction([
      prisma.historial_movimientos.create({
        data: {
          id_tramite: params.id_tramite,
          id_usuario_entrega: params.id_usuario_entrega,
          id_usuario_recibe: params.id_usuario_recibe,
          id_area_origen: params.id_area_origen,
          id_area_destino: params.id_area_destino,
          tipo_accion: params.tipo_accion,
          comentarios: params.comentarios,
          fecha_hora: now,
        },
      }),
      prisma.tramites.update({
        where: { id_tramite: params.id_tramite },
        data: {
          fecha_ultimo_movimiento: now,
          fecha_ultima_modificacion: now,
        },
      }),
    ]);
    return movimiento;
  } else {
    return await prisma.historial_movimientos.create({
      data: {
        id_tramite: params.id_tramite,
        id_usuario_entrega: params.id_usuario_entrega,
        id_usuario_recibe: params.id_usuario_recibe,
        id_area_origen: params.id_area_origen,
        id_area_destino: params.id_area_destino,
        tipo_accion: params.tipo_accion,
        comentarios: params.comentarios,
        fecha_hora: now,
      },
    });
  }
}
