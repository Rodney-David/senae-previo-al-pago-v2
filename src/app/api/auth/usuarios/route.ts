import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sanitizeUsers } from "@/lib/sanitize";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const usuarios = await prisma.usuarios.findMany({
      where: { activo: true },
      include: { areas: true },
      orderBy: { id_usuario: "asc" },
    });

    return NextResponse.json({ usuarios: sanitizeUsers(usuarios) });
  } catch (error) {
    console.error("Error fetching users list:", error);
    return NextResponse.json(
      { error: "Error al consultar usuarios del sistema" },
      { status: 500 }
    );
  }
}
