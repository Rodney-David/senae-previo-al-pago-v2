import { prisma } from "@/lib/prisma";

export interface RegistrarBitacoraParams {
  id_tramite: number;
  id_usuario_entrega: number;
  id_usuario_recibe: number;
  id_area_origen: number;
  id_area_destino: number;
  tipo_accion: string;
  comentarios?: string | null;
}

/**
 * Registra un movimiento inmutable en la bitácora institucional (historial_movimientos)
 * y actualiza la fecha de último movimiento en el trámite para garantizar la prioridad
 * por "Última Novedad" en Mi Escritorio.
 */
export async function registrarBitacora(params: RegistrarBitacoraParams) {
  const now = new Date();

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
}
