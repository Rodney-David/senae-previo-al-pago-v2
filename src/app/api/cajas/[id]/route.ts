import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthenticatedUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(
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

    const caja = await prisma.cajas.findUnique({
      where: { id_caja: idCaja },
      include: {
        tramites: {
          include: {
            tipos_tramite: true,
            areas: true,
            usuarios: true,
          },
          orderBy: {
            fecha_pago: "desc",
          },
        },
      },
    });

    if (!caja) {
      return NextResponse.json({ error: "Caja no encontrada" }, { status: 404 });
    }

    const totalTramites = caja.tramites.length;
    const totalHojas = caja.tramites.reduce(
      (acc, t) => acc + (t.numero_hojas || 0),
      0
    );
    const totalMonto = caja.tramites.reduce(
      (acc, t) => acc + Number(t.monto_total || 0),
      0
    );

    return NextResponse.json({
      caja: {
        ...caja,
        total_tramites: totalTramites,
        total_hojas: totalHojas,
        total_monto: totalMonto,
      },
    });
  } catch (error: any) {
    console.error("Error en GET /api/cajas/[id]:", error);
    return NextResponse.json(
      { error: "Error al consultar detalle de la caja" },
      { status: 500 }
    );
  }
}

export async function DELETE(
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

    const userRole = (currentUser.rol || "").toUpperCase();
    const userCargo = (currentUser.cargo || "").toUpperCase();
    const isAdminOrDFI = currentUser.id_area === 1 || userRole === "ADMIN" || userRole === "DIRECTORA";
    const isAdmCaja =
      currentUser.id_area === 4 ||
      currentUser.id_area === 5 ||
      userRole.includes("TESOR") ||
      userRole.includes("COBRANZA") ||
      userRole.includes("CAJA") ||
      userCargo.includes("COBRANZA") ||
      userCargo.includes("TESOR") ||
      isAdminOrDFI;

    if (!isAdmCaja) {
      return NextResponse.json(
        { error: "La eliminación de cajas es una función exclusiva de Administración de Caja / Tesorería y Cobranzas." },
        { status: 403 }
      );
    }

    const caja = await prisma.cajas.findUnique({
      where: { id_caja: idCaja },
      include: { tramites: true },
    });

    if (!caja) {
      return NextResponse.json({ error: "Caja no encontrada" }, { status: 404 });
    }

    if (caja.estado === "ARCHIVADA") {
      return NextResponse.json(
        { error: "No se puede eliminar una caja que ya ha sido archivada definitivamente." },
        { status: 400 }
      );
    }

    // Desvincular trámites y devolverlos a estado PAGADO
    if (caja.tramites.length > 0) {
      await prisma.tramites.updateMany({
        where: { id_caja: idCaja },
        data: {
          id_caja: null,
          codigo_tomo_caja: null,
          estado_general: "PAGADO",
          sub_estado: "PAGADO_EN_CUSTODIA_CAJA",
        },
      });
    }

    await prisma.cajas.delete({
      where: { id_caja: idCaja },
    });

    return NextResponse.json({ message: "Caja eliminada exitosamente" });
  } catch (error: any) {
    console.error("Error en DELETE /api/cajas/[id]:", error);
    return NextResponse.json(
      { error: "Error al eliminar la caja" },
      { status: 500 }
    );
  }
}
