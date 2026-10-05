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

export async function POST() {
  return NextResponse.json(
    { error: "Operación no permitida en entorno seguro. La sesión solo se establece mediante autenticación en /login." },
    { status: 405 }
  );
}
