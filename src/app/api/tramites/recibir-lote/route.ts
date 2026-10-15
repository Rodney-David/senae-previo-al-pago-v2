import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth";
import { TramiteService } from "@/services/tramiteService";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const currentUser = await getAuthenticatedUser(request);
    if (!currentUser) {
      return NextResponse.json(
        { error: "No autorizado. Sesión requerida para recibir trámites." },
        { status: 401 }
      );
    }

    const userRole = (currentUser.rol || "").toUpperCase();
    const isJefePresupuesto = currentUser.id_area === 2 && (userRole === "JEFE" || userRole === "JEFE_PRESUPUESTO");
    const isAdmin = userRole === "ADMIN" || userRole === "ADMINISTRADOR";

    if (!isJefePresupuesto && !isAdmin) {
      return NextResponse.json(
        { error: "Solo la Jefa de Presupuesto o Administrador pueden registrar la recepción física que inicia el SLA." },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { ids } = body;

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json(
        { error: "Debe seleccionar al menos un trámite para recibir físicamente." },
        { status: 400 }
      );
    }

    const tramitesRecibidos = await TramiteService.recibirFisicamenteLote(
      ids.map((id: any) => Number(id)),
      currentUser.id_usuario
    );

    return NextResponse.json({
      success: true,
      mensaje: `${tramitesRecibidos.length} expediente(s) recibidos físicamente en Control Previo (Presupuesto). Estado cambiado a REVISION y cómputo de SLA iniciado.`,
      count: tramitesRecibidos.length,
    });
  } catch (error: any) {
    console.error("Error en recepción física por lote:", error);
    return NextResponse.json(
      { error: error?.message || "Error al procesar la recepción física" },
      { status: 500 }
    );
  }
}
