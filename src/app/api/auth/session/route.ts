import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifySessionToken, createSessionToken, SESSION_COOKIE_NAME } from "@/lib/session";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const sessionCookie = request.cookies.get(SESSION_COOKIE_NAME)?.value;
    const sessionPayload = await verifySessionToken(sessionCookie);

    if (!sessionPayload) {
      return NextResponse.json({ user: null, authenticated: false }, { status: 401 });
    }

    const user = await prisma.usuarios.findUnique({
      where: { id_usuario: sessionPayload.userId },
      include: { areas: true },
    });

    if (!user || !user.activo) {
      return NextResponse.json({ user: null, authenticated: false }, { status: 401 });
    }

    return NextResponse.json({ user, authenticated: true });
  } catch (error) {
    console.error("Error fetching session:", error);
    return NextResponse.json(
      { error: "Error interno al verificar sesión institucional", authenticated: false },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const sessionCookie = request.cookies.get(SESSION_COOKIE_NAME)?.value;
    const sessionPayload = await verifySessionToken(sessionCookie);

    if (!sessionPayload) {
      return NextResponse.json({ error: "Sesión no autenticada" }, { status: 401 });
    }

    const body = await request.json();
    const { id_usuario } = body;

    const user = await prisma.usuarios.findUnique({
      where: { id_usuario: Number(id_usuario) },
      include: { areas: true },
    });

    if (!user || !user.activo) {
      return NextResponse.json({ error: "Usuario no encontrado o inactivo" }, { status: 404 });
    }

    // Actualizar token con la nueva identidad autorizada
    const newSessionToken = await createSessionToken(user);

    const response = NextResponse.json({ success: true, user });
    response.cookies.set(SESSION_COOKIE_NAME, newSessionToken, {
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
      sameSite: "lax",
      httpOnly: true,
    });
    response.cookies.set("senae_simulated_user_id", String(user.id_usuario), {
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
      sameSite: "lax",
    });

    return response;
  } catch (error) {
    console.error("Error setting session:", error);
    return NextResponse.json(
      { error: "Error interno al actualizar sesión" },
      { status: 500 }
    );
  }
}
