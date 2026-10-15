import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthenticatedUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const currentUser = await getAuthenticatedUser(request);
    if (!currentUser) {
      return NextResponse.json({ error: "Sesión requerida" }, { status: 401 });
    }

    const idCaja = parseInt(params.id, 10);
    if (isNaN(idCaja)) {
      return NextResponse.json({ error: "ID de caja inválido" }, { status: 400 });
    }

    const body = await request.json();
    const { accion, motivo_devolucion } = body;

    const caja = await prisma.cajas.findUnique({
      where: { id_caja: idCaja },
      include: { tramites: true },
    });

    if (!caja) {
      return NextResponse.json({ error: "Caja no encontrada" }, { status: 404 });
    }

    const userArea = currentUser.id_area;
    const userRole = (currentUser.rol || "").toUpperCase();
    const isAdmin = userRole === "ADMIN" || userRole === "ADMINISTRADOR" || userRole === "DIRECTORA";
    const isAdmCaja = userArea === 4 || userRole.includes("TESOR") || userRole.includes("CAJA") || isAdmin;
    const isCustodio = userArea === 6 || userRole.includes("ARCHIVO") || isAdmin;

    const now = new Date();

    // 1. ACCIÓN: CERRAR CAJA (Adm. Caja)
    if (accion === "CERRAR") {
      if (!isAdmCaja) {
        return NextResponse.json(
          { error: "Solo el personal de Administración de Caja o Administrador puede cerrar la caja." },
          { status: 403 }
        );
      }
      if (caja.estado !== "ABIERTA") {
        return NextResponse.json(
          { error: `Solo se pueden cerrar cajas en estado ABIERTA (estado actual: ${caja.estado})` },
          { status: 400 }
        );
      }
      if (caja.tramites.length === 0) {
        return NextResponse.json(
          { error: "No se puede cerrar una caja vacía. Asigne al menos un trámite pagado." },
          { status: 400 }
        );
      }

      const cajaActualizada = await prisma.cajas.update({
        where: { id_caja: idCaja },
        data: {
          estado: "CERRADA",
          fecha_cierre: now,
        },
      });

      return NextResponse.json({
        success: true,
        message: `Caja "${caja.codigo_caja}" cerrada exitosamente. Ahora es candidata para enviarse al Archivo.`,
        caja: cajaActualizada,
      });
    }

    // 2. ACCIÓN: REABRIR CAJA (Adm. Caja)
    if (accion === "REABRIR") {
      if (!isAdmCaja) {
        return NextResponse.json(
          { error: "Solo el personal de Administración de Caja o Administrador puede reabrir la caja." },
          { status: 403 }
        );
      }
      if (caja.estado !== "CERRADA") {
        return NextResponse.json(
          { error: "Solo se pueden reabrir cajas en estado CERRADA que aún no hayan sido enviadas o archivadas." },
          { status: 400 }
        );
      }

      const cajaActualizada = await prisma.cajas.update({
        where: { id_caja: idCaja },
        data: {
          estado: "ABIERTA",
          fecha_cierre: null,
        },
      });

      return NextResponse.json({
        success: true,
        message: `Caja "${caja.codigo_caja}" reabierta exitosamente para edición y modificación de trámites.`,
        caja: cajaActualizada,
      });
    }

    // 3. ACCIÓN: ENVIAR A ARCHIVO (Adm. Caja)
    if (accion === "ENVIAR_ARCHIVO") {
      if (!isAdmCaja) {
        return NextResponse.json(
          { error: "Solo Administración de Caja o Administrador puede enviar la caja al Archivo." },
          { status: 403 }
        );
      }
      if (caja.estado !== "CERRADA") {
        return NextResponse.json(
          { error: "La caja debe estar CERRADA antes de poder ser enviada al Archivo." },
          { status: 400 }
        );
      }

      // Obtener el custodio de Archivo
      const archivero = await prisma.usuarios.findFirst({
        where: { id_area: 6, activo: true },
      });
      const idArchivero = archivero?.id_usuario || 10;

      // Actualizar estado de la caja a ENVIADA
      const cajaActualizada = await prisma.cajas.update({
        where: { id_caja: idCaja },
        data: {
          estado: "ENVIADA",
        },
      });

      // Transferir trámites de la caja a custodia de Archivo
      await prisma.tramites.updateMany({
        where: { id_caja: idCaja },
        data: {
          id_area_actual: 6, // ARCHIVO
          id_custodio_actual: idArchivero,
          fecha_ultimo_movimiento: now,
          fecha_ultima_modificacion: now,
        },
      });

      // Registrar bitácora de entrega por cada trámite
      for (const t of caja.tramites) {
        await prisma.historial_movimientos.create({
          data: {
            id_tramite: t.id_tramite,
            id_usuario_entrega: currentUser.id_usuario,
            id_usuario_recibe: idArchivero,
            id_area_origen: 4, // ADM CAJA
            id_area_destino: 6, // ARCHIVO
            tipo_accion: "CAJA_ENVIADA_A_ARCHIVO",
            comentarios: `Caja "${caja.codigo_caja}" entregada y despachada formalmente al Archivo Central para recepción y revisión.`,
          },
        });
      }

      return NextResponse.json({
        success: true,
        message: `Caja "${caja.codigo_caja}" enviada formalmente al Archivo Central. Pasó a custodia del Custodio de Archivo.`,
        caja: cajaActualizada,
      });
    }

    // 4. ACCIÓN: APROBAR Y ARCHIVAR DEFINITIVAMENTE (Custodio de Archivo)
    if (accion === "APROBAR_ARCHIVAR") {
      if (!isCustodio) {
        return NextResponse.json(
          { error: "Solo el Custodio de Archivo Contable o Administrador puede aprobar y archivar la caja." },
          { status: 403 }
        );
      }
      if (caja.estado !== "ENVIADA" && caja.estado !== "CERRADA") {
        return NextResponse.json(
          { error: "Solo se pueden aprobar y archivar cajas que hayan sido enviadas o cerradas para archivo." },
          { status: 400 }
        );
      }

      // Marcar caja como ARCHIVADA
      const cajaActualizada = await prisma.cajas.update({
        where: { id_caja: idCaja },
        data: {
          estado: "ARCHIVADA",
          fecha_cierre: now,
        },
      });

      // Pasar todos los trámites a estado general ARCHIVO
      await prisma.tramites.updateMany({
        where: { id_caja: idCaja },
        data: {
          estado_general: "ARCHIVO",
          sub_estado: "ARCHIVADO_DEFINITIVO",
          id_area_actual: 6, // ARCHIVO
          id_custodio_actual: currentUser.id_usuario,
          fecha_ultimo_movimiento: now,
          fecha_ultima_modificacion: now,
        },
      });

      // Registrar historial de archivo definitivo
      for (const t of caja.tramites) {
        await prisma.historial_movimientos.create({
          data: {
            id_tramite: t.id_tramite,
            id_usuario_entrega: currentUser.id_usuario,
            id_usuario_recibe: currentUser.id_usuario,
            id_area_origen: 6, // ARCHIVO
            id_area_destino: 6, // ARCHIVO
            tipo_accion: "CAJA_APROBADA_Y_ARCHIVADA",
            comentarios: `Caja "${caja.codigo_caja}" revisada, aprobada y custodiada definitivamente en Archivo Central. Trámite en ARCHIVO definitivo.`,
          },
        });
      }

      return NextResponse.json({
        success: true,
        message: `Caja "${caja.codigo_caja}" aprobada y archivada exitosamente. ${caja.tramites.length} trámite(s) pasaron a estado ARCHIVO.`,
        caja: cajaActualizada,
      });
    }

    // 5. ACCIÓN: DEVOLVER CAJA A ADM. CAJA (Custodio de Archivo con Observación)
    if (accion === "DEVOLVER") {
      if (!isCustodio) {
        return NextResponse.json(
          { error: "Solo el Custodio de Archivo Contable o Administrador puede devolver una caja." },
          { status: 403 }
        );
      }

      // Obtener un usuario de Adm. Caja
      const tesorero = await prisma.usuarios.findFirst({
        where: { id_area: 4, activo: true },
      });
      const idTesorero = tesorero?.id_usuario || 8;

      // La caja regresa a estado CERRADA en custodia de Adm. Caja
      const cajaActualizada = await prisma.cajas.update({
        where: { id_caja: idCaja },
        data: {
          estado: "CERRADA",
          observaciones: motivo_devolucion
            ? `[DEVOLUCIÓN ARCHIVO]: ${motivo_devolucion}`
            : caja.observaciones,
        },
      });

      // Revertir trámites a custodia de Adm. Caja
      await prisma.tramites.updateMany({
        where: { id_caja: idCaja },
        data: {
          id_area_actual: 4, // Regresa a ADM CAJA
          id_custodio_actual: idTesorero,
          fecha_ultimo_movimiento: now,
          fecha_ultima_modificacion: now,
        },
      });

      // Registrar devolución en bitácora
      for (const t of caja.tramites) {
        await prisma.historial_movimientos.create({
          data: {
            id_tramite: t.id_tramite,
            id_usuario_entrega: currentUser.id_usuario,
            id_usuario_recibe: idTesorero,
            id_area_origen: 6, // ARCHIVO
            id_area_destino: 4, // ADM CAJA
            tipo_accion: "CAJA_DEVUELTA_A_ADM_CAJA",
            comentarios: `Caja "${caja.codigo_caja}" devuelta por Archivo a Adm. Caja. Motivo: ${
              motivo_devolucion || "Observación documental"
            }`,
          },
        });
      }

      return NextResponse.json({
        success: true,
        message: `Caja "${caja.codigo_caja}" devuelta a Administración de Caja para subsanación.`,
        caja: cajaActualizada,
      });
    }

    return NextResponse.json(
      { error: "Acción no reconocida. Acciones válidas: CERRAR, REABRIR, ENVIAR_ARCHIVO, APROBAR_ARCHIVAR, DEVOLVER" },
      { status: 400 }
    );
  } catch (error: any) {
    console.error("Error en POST /api/cajas/[id]/estado:", error);
    return NextResponse.json(
      { error: error?.message || "Error al procesar cambio de estado de la caja" },
      { status: 500 }
    );
  }
}
