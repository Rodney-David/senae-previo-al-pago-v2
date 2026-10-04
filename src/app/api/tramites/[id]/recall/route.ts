import { NextRequest, NextResponse } from "next/server";
import { TramiteService } from "@/services/tramiteService";

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

    const userIdCookie = request.cookies.get("senae_simulated_user_id")?.value;
    const currentUserId = userIdCookie ? parseInt(userIdCookie, 10) : 1;

    const body = await request.json();
    const { numero_memorando, motivo } = body;

    if (!numero_memorando) {
      return NextResponse.json(
        { error: "Debe ingresar el número del Memorando de Alcance" },
        { status: 400 }
      );
    }

    const tramiteActualizado = await TramiteService.solicitarRecall(
      idTramite,
      currentUserId,
      numero_memorando,
      motivo || "Solicitud de devolución por Memorando de Alcance recibido"
    );

    return NextResponse.json({ success: true, tramite: tramiteActualizado });
  } catch (error: any) {
    console.error("Error executing recall:", error);
    return NextResponse.json(
      { error: error?.message || "Error al procesar la devolución preventiva (Recall)" },
      { status: 500 }
    );
  }
}
