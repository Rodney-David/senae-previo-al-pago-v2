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
        { error: "No autorizado. Sesión requerida para despachar trámites." },
        { status: 401 }
      );
    }

    const rol = (currentUser.rol || "").toUpperCase();
    const esSecretariaDFIOAdmin =
      currentUser.id_area === 1 ||
      ["SECRETARIA", "SECRETARIA_DFI", "DIRECTORA", "DIRECTORA_FINANCIERA", "ADMIN", "ADMINISTRADOR"].includes(rol);

    if (!esSecretariaDFIOAdmin) {
      return NextResponse.json(
        {
          error:
            "No autorizado. Únicamente Secretaría de DFI, Directora o Administrador pueden entregar trámites aprobados a Tesorería.",
        },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { ids, accion = "ENTREGAR" } = body;

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json(
        { error: "Debe seleccionar al menos un trámite en estado PAGO_APROBADO." },
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

    // Validar que todos estén en estado PAGO_APROBADO
    const noAprobados = tramitesSeleccionados.filter(
      (t) =>
        t.estado_general !== "PAGO_APROBADO" &&
        t.sub_estado !== "APROBADO_POR_ENTREGAR_TESORERIA"
    );
    if (noAprobados.length > 0) {
      return NextResponse.json(
        {
          error: `Los siguientes trámites no están en estado PAGO_APROBADO: ${noAprobados
            .map((t) => t.numero_quipux || t.codigo_tramite)
            .join(", ")}`,
        },
        { status: 400 }
      );
    }

    // ACCIÓN 1: GENERAR / DESCARGAR EXCEL DE ACTA DE ENTREGA A TESORERÍA
    if (accion === "EXCEL") {
      const excelBuffer = await generarActaAutorizacionDfiExcel(tramitesSeleccionados as any);
      const now = new Date();
      const dd = String(now.getDate()).padStart(2, "0");
      const mm = String(now.getMonth() + 1).padStart(2, "0");
      const aa = String(now.getFullYear()).slice(-2);
      const filename = `Acta_Entrega_Tesoreria_Aprobados_${dd}-${mm}-${aa}.xlsx`;

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

    // ACCIÓN 2: ENTREGAR A TESORERÍA
    await TramiteService.entregarTesoreriaLote(numericIds, currentUser.id_usuario);

    return NextResponse.json({
      success: true,
      count: numericIds.length,
      mensaje: `${numericIds.length} trámite(s) entregados con éxito a Tesorería / Pagos.`,
    });
  } catch (error: any) {
    console.error("Error en entrega por lote a Tesorería:", error);
    return NextResponse.json(
      { error: error?.message || "Error al procesar la entrega a Tesorería" },
      { status: 500 }
    );
  }
}
