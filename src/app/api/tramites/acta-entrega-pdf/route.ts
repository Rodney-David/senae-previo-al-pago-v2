import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthenticatedUser } from "@/lib/auth";
import { generarActaEntregaPdf } from "@/services/actaEntregaPdfService";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const currentUser = await getAuthenticatedUser(request);
    if (!currentUser) {
      return NextResponse.json(
        { error: "No autorizado. Sesión requerida." },
        { status: 401 }
      );
    }

    const rol = (currentUser.rol || "").toUpperCase();
    const esAutorizado =
      rol === "SECRETARIA" ||
      rol === "SECRETARIA_DFI" ||
      rol === "JEFE" ||
      rol === "JEFE_PRESUPUESTO" ||
      rol === "ADMIN" ||
      rol === "ADMINISTRADOR";

    if (!esAutorizado) {
      return NextResponse.json(
        { error: "No autorizado para generar el Acta de Entrega en PDF." },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { ids } = body;

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json(
        { error: "Debe proporcionar al menos un ID de trámite." },
        { status: 400 }
      );
    }

    const numericIds = ids.map((id: any) => Number(id));

    const tramites = await prisma.tramites.findMany({
      where: { id_tramite: { in: numericIds } },
    });

    if (tramites.length === 0) {
      return NextResponse.json(
        { error: "No se encontraron los trámites especificados." },
        { status: 404 }
      );
    }

    const doc = generarActaEntregaPdf(tramites as any);
    const pdfOutput = doc.output("arraybuffer");

    const now = new Date();
    const dd = String(now.getDate()).padStart(2, "0");
    const mm = String(now.getMonth() + 1).padStart(2, "0");
    const aa = String(now.getFullYear()).slice(-2);
    const filename = `Acta_Entrega_Control_Previo_${dd}-${mm}-${aa}.pdf`;

    return new NextResponse(new Uint8Array(pdfOutput), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "X-Tramites-Count": String(numericIds.length),
      },
    });
  } catch (error: any) {
    console.error("Error en POST /api/tramites/acta-entrega-pdf:", error);
    return NextResponse.json(
      { error: error?.message || "Error al generar PDF del acta de entrega" },
      { status: 500 }
    );
  }
}
