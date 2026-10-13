import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifySessionToken, SESSION_COOKIE_NAME } from "@/lib/session";

/**
 * Obtiene y valida el usuario autenticado real desde la sesión criptográfica.
 * Retorna null si la sesión no es válida, ha expirado o el usuario está inactivo.
 */
export async function getAuthenticatedUser(request: NextRequest) {
  const sessionCookie = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  if (!sessionCookie) return null;

  const session = await verifySessionToken(sessionCookie);
  if (!session || !session.userId) return null;

  const user = await prisma.usuarios.findUnique({
    where: { id_usuario: session.userId },
    include: { areas: true },
  });

  if (!user || !user.activo) return null;
  return user;
}
