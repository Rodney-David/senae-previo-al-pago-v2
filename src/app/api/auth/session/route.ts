import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser(request);

    if (!user) {
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
