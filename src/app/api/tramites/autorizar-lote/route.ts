import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthenticatedUser } from "@/lib/auth";
import { TramiteService } from "@/services/tramiteService";
import { generarActaAutorizacionDfiExcel } from "@/services/actaAutorizacionDfiService";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const currentUser = await getAuthenticatedUser(request);
    if (!currentUser) {
      return NextResponse.json(
        { error: "No autorizado. Sesión requerida para autorizar trámites." },
        { status: 401 }
      );
    }

    const rol = (currentUser.rol || "").toUpperCase();
    const esDirectoraOAdmin =
      rol === "DIRECTORA" ||
      rol === "DIRECTORA_FINANCIERA" ||
      rol === "ADMIN" ||
      rol === "ADMINISTRADOR";

    if (!esDirectoraOAdmin) {
      return NextResponse.json(
        {
          error:
            "No autorizado. Únicamente la Directora Financiera o el Administrador pueden autorizar pagos en lote.",
        },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { ids, accion = "AUTORIZAR" } = body;

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json(
        { error: "Debe seleccionar al menos un trámite para autorizar." },
        { status: 400 }
      );
    }

    const numericIds = ids.map((id: any) => Number(id));

    // Consultar trámites seleccionados
    const tramitesSeleccionados = await prisma.tramites.findMany({
      where: {
        id_tramite: { in: numericIds },
      },
      include: {
        tipos_tramite: true,
      },
    });

    if (tramitesSeleccionados.length === 0) {
      return NextResponse.json(
        { error: "No se encontraron los trámites seleccionados." },
        { status: 404 }
      );
    }

    // ACCIÓN 1: GENERAR / DESCARGAR EXCEL DE AUTORIZACIÓN
    if (accion === "EXCEL") {
      const excelBuffer = await generarActaAutorizacionDfiExcel(tramitesSeleccionados);
      const now = new Date();
      const dd = String(now.getDate()).padStart(2, "0");
      const mm = String(now.getMonth() + 1).padStart(2, "0");
      const aa = String(now.getFullYear()).slice(-2);
      const filename = `Acta_Autorizacion_Pago_DFI_${dd}-${mm}-${aa}.xlsx`;

      return new NextResponse(new Uint8Array(excelBuffer), {
        status: 200,
        headers: {
          "Content-Type":
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          "Content-Disposition": `attachment; filename="${filename}"`,
          "X-Tramites-Count": String(numericIds.length),
        },
      });
    }

    // ACCIÓN 2: AUTORIZAR EN LOTE Y DERIVAR A TESORERÍA
    await TramiteService.autorizarPagoDfiLote(numericIds, currentUser.id_usuario);

    return NextResponse.json({
      success: true,
      count: numericIds.length,
      mensaje: "Trámites autorizados y derivados formalmente a Tesorería / Pagos.",
    });
  } catch (error: any) {
    console.error("Error en autorización por lote DFI:", error);
    return NextResponse.json(
      { error: error?.message || "Error al procesar la autorización en lote" },
      { status: 500 }
    );
  }
}
