import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthenticatedUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const currentUser = await getAuthenticatedUser(request);
    if (!currentUser || currentUser.rol !== "ADMIN") {
      return NextResponse.json({ error: "Acceso denegado: solo Administradores" }, { status: 403 });
    }

    const param = await prisma.parametros_sistema.findUnique({
      where: { clave: "UNIFICACION_TESORERIA_COBRANZAS" },
    });

    return NextResponse.json({
      unificacionTesoreriaCobranzas: param ? param.valor === "true" : true,
    });
  } catch (error: any) {
    console.error("Error al obtener configuración:", error);
    return NextResponse.json({ error: "Error al consultar parámetros del sistema" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const currentUser = await getAuthenticatedUser(request);
    if (!currentUser || currentUser.rol !== "ADMIN") {
      return NextResponse.json({ error: "Acceso denegado: solo Administradores" }, { status: 403 });
    }

    const body = await request.json();
    const { unificacionTesoreriaCobranzas } = body;

    const valorStr = unificacionTesoreriaCobranzas ? "true" : "false";

    await prisma.parametros_sistema.upsert({
      where: { clave: "UNIFICACION_TESORERIA_COBRANZAS" },
      update: {
        valor: valorStr,
        descripcion: "Determina si el Tesorero General asume de forma unificada las funciones de Cobranzas y Garantías",
        updated_at: new Date(),
      },
      create: {
        clave: "UNIFICACION_TESORERIA_COBRANZAS",
        valor: valorStr,
        descripcion: "Determina si el Tesorero General asume de forma unificada las funciones de Cobranzas y Garantías",
        tipo_dato: "BOOLEAN",
      },
    });

    return NextResponse.json({
      success: true,
      unificacionTesoreriaCobranzas: unificacionTesoreriaCobranzas ?? true,
    });
  } catch (error: any) {
    console.error("Error al actualizar configuración:", error);
    return NextResponse.json({ error: "Error al guardar parámetro del sistema" }, { status: 500 });
  }
}
