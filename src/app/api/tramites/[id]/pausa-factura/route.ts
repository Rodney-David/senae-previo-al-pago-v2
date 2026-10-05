import { NextRequest, NextResponse } from "next/server";
import { TramiteService } from "@/services/tramiteService";
import { getAuthenticatedUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const idTramite = parseInt(params.id, 10);
    if (isNaN(idTramite)) {
      return NextResponse.json({ error: "ID de trámite inválido" }, { status: 400 });
    }

    const currentUser = await getAuthenticatedUser(request);
    if (!currentUser) {
      return NextResponse.json({ error: "No autorizado. Sesión inválida o expirada." }, { status: 401 });
    }
    const currentUserId = currentUser.id_usuario;

    const body = await request.json();
    const { accion, datosFactura } = body;

    if (accion !== "PAUSAR" && accion !== "REANUDAR") {
      return NextResponse.json({ error: "Acción no válida" }, { status: 400 });
    }

    const tramiteActualizado = await TramiteService.gestionarPausaFactura(
      idTramite,
      accion,
      currentUserId,
      datosFactura
    );

    return NextResponse.json({ success: true, tramite: tramiteActualizado });
  } catch (error: any) {
    console.error("Error managing SLA invoice pause:", error);
    return NextResponse.json(
      { error: error?.message || "Error al gestionar la pausa del semáforo SLA" },
      { status: 500 }
    );
  }
}
