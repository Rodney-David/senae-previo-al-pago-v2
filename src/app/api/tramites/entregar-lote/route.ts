import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthenticatedUser } from "@/lib/auth";
import { TramiteService } from "@/services/tramiteService";
import { generarActaEntregaExcel } from "@/services/actaExcelService";

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

    const body = await request.json();
    const { ids, accion = "ENTREGAR" } = body;

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json(
        { error: "Debe seleccionar al menos un trámite en estado INGRESADO." },
        { status: 400 }
      );
    }

    // Consultar los trámites para el acta
    const tramitesSeleccionados = await prisma.tramites.findMany({
      where: {
        id_tramite: { in: ids.map((id: any) => Number(id)) },
      },
    });

    if (tramitesSeleccionados.length === 0) {
      return NextResponse.json(
        { error: "No se encontraron los trámites seleccionados." },
        { status: 404 }
      );
    }

    // Validar que todos estén en estado INGRESADO
    const noIngresados = tramitesSeleccionados.filter((t) => t.estado_general !== "INGRESADO");
    if (noIngresados.length > 0) {
      return NextResponse.json(
        {
          error: `Los siguientes trámites no están en estado INGRESADO: ${noIngresados
            .map((t) => t.numero_quipux || t.codigo_tramite)
            .join(", ")}`,
        },
        { status: 400 }
      );
    }

    // MODO 1: SOLO GENERAR/DESCARGAR EXCEL (Sin cambiar de estado ni mover flujo)
    if (accion === "EXCEL") {
      const excelBuffer = await generarActaEntregaExcel(tramitesSeleccionados);
      const now = new Date();
      const dd = String(now.getDate()).padStart(2, "0");
      const mm = String(now.getMonth() + 1).padStart(2, "0");
      const aa = String(now.getFullYear()).slice(-2);
      const filename = `Acta_Entrega_Control_Previo_${dd}-${mm}-${aa}.xlsx`;

      return new NextResponse(new Uint8Array(excelBuffer), {
        status: 200,
        headers: {
          "Content-Type":
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          "Content-Disposition": `attachment; filename="${filename}"`,
          "X-Tramites-Count": String(ids.length),
        },
      });
    }

    // MODO 2: ENTREGAR A CONTROL PREVIO (Pasan a REVISION con custodio Jefa Presupuesto)
    await TramiteService.entregarControlPrevioLote(
      ids.map((id: any) => Number(id)),
      currentUser.id_usuario
    );

    return NextResponse.json({
      success: true,
      mensaje: `${ids.length} trámite(s) entregados con éxito a Control Previo (Presupuesto).`,
      count: ids.length,
    });
  } catch (error: any) {
    console.error("Error en entrega por lote:", error);
    return NextResponse.json(
      { error: error?.message || "Error al procesar el lote" },
      { status: 500 }
    );
  }
}
