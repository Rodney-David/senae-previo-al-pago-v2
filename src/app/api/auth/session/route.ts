import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const userIdCookie = request.cookies.get("senae_simulated_user_id")?.value;
    const userId = userIdCookie ? parseInt(userIdCookie, 10) : 1; // Default to Directora Financiera

    const user = await prisma.usuarios.findUnique({
      where: { id_usuario: userId },
      include: { areas: true },
    });

    if (!user) {
      // Fallback al primer usuario
      const firstUser = await prisma.usuarios.findFirst({
        include: { areas: true },
        orderBy: { id_usuario: "asc" },
      });
      return NextResponse.json({ user: firstUser });
    }

    return NextResponse.json({ user });
  } catch (error) {
    console.error("Error fetching simulated session:", error);
    return NextResponse.json(
      { error: "Error interno al obtener sesión simulada" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { id_usuario } = body;

    const user = await prisma.usuarios.findUnique({
      where: { id_usuario: Number(id_usuario) },
      include: { areas: true },
    });

    if (!user) {
      return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });
    }

    const response = NextResponse.json({ success: true, user });
    response.cookies.set("senae_simulated_user_id", String(user.id_usuario), {
      path: "/",
      maxAge: 60 * 60 * 24 * 7, // 7 days
      sameSite: "lax",
    });

    return response;
  } catch (error) {
    console.error("Error setting simulated session:", error);
    return NextResponse.json(
      { error: "Error interno al actualizar sesión simulada" },
      { status: 500 }
    );
  }
}
