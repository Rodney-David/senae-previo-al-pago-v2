/**
 * Utilidades para sanitizar datos sensibles de usuario (prevención de fugas de credenciales y hashes)
 * Proyecto: SENAE Control Previo al Pago
 */

/**
 * Remueve de forma segura el campo 'password_hash' de un objeto de usuario.
 * Si el usuario es null o undefined, retorna null.
 *
 * @param user Objeto de usuario o null/undefined
 * @returns Objeto sanitizado sin 'password_hash' o null
 */
export function sanitizeUser<T extends Record<string, any>>(
  user: T | null | undefined
): Omit<T, "password_hash"> | null {
  if (!user) return null;
  const { password_hash, ...safeUser } = user;
  return safeUser as Omit<T, "password_hash">;
}

/**
 * Remueve de forma segura el campo 'password_hash' de una lista de objetos de usuario.
 *
 * @param users Lista de objetos de usuario
 * @returns Lista de usuarios sanitizados sin 'password_hash'
 */
export function sanitizeUsers<T extends Record<string, any>>(
  users: T[]
): Omit<T, "password_hash">[] {
  if (!Array.isArray(users)) return [];
  return users
    .map((user) => sanitizeUser(user))
    .filter((u): u is Omit<T, "password_hash"> => u !== null);
}
