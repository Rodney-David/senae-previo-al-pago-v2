import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifySessionToken, SESSION_COOKIE_NAME } from "@/lib/session";

// Caché en memoria para usuarios autenticados (60 segundos de TTL)
const userSessionCache = new Map<number, { user: any; expiresAt: number }>();
const USER_CACHE_TTL_MS = 60 * 1000;

export function invalidateUserSessionCache(userId?: number) {
  if (userId) {
    userSessionCache.delete(userId);
  } else {
    userSessionCache.clear();
  }
}

/**
 * Obtiene y valida el usuario autenticado real desde la sesión criptográfica.
 * Retorna null si la sesión no es válida, ha expirado o el usuario está inactivo.
 * Implementa caché en memoria ultra-rápida (60s) para evitar sobrecargar MySQL remoto.
 */
export async function getAuthenticatedUser(request: NextRequest) {
  const sessionCookie = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  if (!sessionCookie) return null;

  const session = await verifySessionToken(sessionCookie);
  if (!session || !session.userId) return null;

  const now = Date.now();
  const cached = userSessionCache.get(session.userId);
  if (cached && cached.expiresAt > now) {
    return cached.user;
  }

  const user = await prisma.usuarios.findUnique({
    where: { id_usuario: session.userId },
    include: { areas: true },
  });

  if (!user || !user.activo) {
    userSessionCache.delete(session.userId);
    return null;
  }

  userSessionCache.set(session.userId, {
    user,
    expiresAt: now + USER_CACHE_TTL_MS,
  });

  return user;
}

