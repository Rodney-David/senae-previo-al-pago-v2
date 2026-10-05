import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { registrarBitacora } from "@/services/bitacoraService";
import { getAuthenticatedUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const idTramite = parseInt(params.id, 10);
    if (isNaN(idTramite)) {
      return NextResponse.json({ error: "ID de trámite inválido" }, { status: 400 });
    }

    const referencias = await prisma.tramite_referencias.findMany({
      where: { id_tramite: idTramite },
      include: { usuarios: true },
      orderBy: { created_at: "desc" },
    });

    return NextResponse.json({ referencias });
  } catch (error) {
    console.error("Error fetching references:", error);
    return NextResponse.json(
      { error: "Error al consultar las referencias institucionales" },
      { status: 500 }
    );
  }
}

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
    const { tipo_documento, tipo_personalizado, numero_documento, fecha_documento, asunto_sumilla } =
      body;

    if (!tipo_documento || !numero_documento || !asunto_sumilla) {
      return NextResponse.json(
        { error: "Tipo, número y asunto son campos obligatorios" },
        { status: 400 }
      );
    }

    const nuevaReferencia = await prisma.tramite_referencias.create({
      data: {
        id_tramite: idTramite,
        tipo_documento,
        tipo_personalizado: tipo_personalizado || null,
        numero_documento,
        fecha_documento: fecha_documento ? new Date(fecha_documento) : new Date(),
        asunto_sumilla,
        id_usuario_registro: currentUserId,
      },
      include: {
        usuarios: true,
      },
    });

    const tramite = await prisma.tramites.findUnique({
      where: { id_tramite: idTramite },
    });

    if (tramite) {
      await registrarBitacora({
        id_tramite: idTramite,
        id_usuario_entrega: currentUserId,
        id_usuario_recibe: currentUserId,
        id_area_origen: tramite.id_area_actual,
        id_area_destino: tramite.id_area_actual,
        tipo_accion: "REFERENCIA_INSTITUCIONAL_AGREGADA",
        comentarios: `Referencia agregada: ${tipo_documento} Nro. ${numero_documento} - ${asunto_sumilla}`,
      });
    }

    return NextResponse.json({ success: true, referencia: nuevaReferencia }, { status: 201 });
  } catch (error: any) {
    console.error("Error creating reference:", error);
    return NextResponse.json(
      { error: error?.message || "Error al registrar la referencia institucional" },
      { status: 500 }
    );
  }
}
