/**
 * Servicio Criptográfico de Sesión Institucional SENAE
 * Compatible con Node.js y Edge Runtime (Next.js Middleware)
 * Utiliza Web Crypto API estándar para firma y verificación HMAC-SHA256
 */

export const AUTH_SECRET = process.env.AUTH_SECRET || "senae_clave_maestra_seguridad_control_previo_2026";
if (!process.env.AUTH_SECRET && process.env.NODE_ENV === "production") {
  console.error("[SENAE ADVERTENCIA CRÍTICA DE SEGURIDAD] La variable de entorno AUTH_SECRET no está configurada en producción. Usar una clave predeterminada compromete gravemente la seguridad de las sesiones institucionales. Configure AUTH_SECRET de inmediato en el entorno de producción.");
}
export const SESSION_COOKIE_NAME = "senae_session";

async function getCryptoKey(): Promise<CryptoKey> {
  const encoder = new TextEncoder();
  const keyData = encoder.encode(AUTH_SECRET);
  return await crypto.subtle.importKey(
    "raw",
    keyData,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"]
  );
}

function bufferToHex(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let hex = "";
  for (let i = 0; i < bytes.length; i++) {
    hex += bytes[i].toString(16).padStart(2, "0");
  }
  return hex;
}

function hexToUint8Array(hex: string): Uint8Array {
  if (hex.length % 2 !== 0) return new Uint8Array(0);
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    const val = parseInt(hex.substring(i * 2, i * 2 + 2), 16);
    if (isNaN(val)) return new Uint8Array(0);
    bytes[i] = val;
  }
  return bytes;
}

export interface SessionPayload {
  userId: number;
  email: string;
  role: string;
  issuedAt: number;
  expiresAt: number;
}

export const DEFAULT_SESSION_DURATION_MS = 2 * 60 * 60 * 1000; // 2 horas máximo de sesión activa

/**
 * Genera un token de sesión firmado criptográficamente
 * Duración por defecto: 2 horas de vigencia estricta
 */
export async function createSessionToken(
  user: { id_usuario: number; correo_institucional: string; rol: string },
  durationMs: number = DEFAULT_SESSION_DURATION_MS
): Promise<string> {
  const now = Date.now();
  const payload: SessionPayload = {
    userId: user.id_usuario,
    email: user.correo_institucional,
    role: user.rol,
    issuedAt: now,
    expiresAt: now + durationMs,
  };

  const payloadStr = JSON.stringify(payload);
  const encoder = new TextEncoder();
  const data = encoder.encode(payloadStr);

  const key = await getCryptoKey();
  const signatureBuffer = await crypto.subtle.sign("HMAC", key, data);
  const signatureHex = bufferToHex(signatureBuffer);

  // Formato: base64(payloadStr).signatureHex
  const payloadBase64 = typeof btoa !== "undefined"
    ? btoa(unescape(encodeURIComponent(payloadStr)))
    : Buffer.from(payloadStr, "utf-8").toString("base64");

  return `${payloadBase64}.${signatureHex}`;
}

/**
 * Verifica la autenticidad e integridad del token de sesión
 */
export async function verifySessionToken(token: string | undefined | null): Promise<SessionPayload | null> {
  if (!token || typeof token !== "string") return null;

  const parts = token.split(".");
  if (parts.length !== 2) return null;

  const [payloadBase64, signatureHex] = parts;

  try {
    const payloadStr = typeof atob !== "undefined"
      ? decodeURIComponent(escape(atob(payloadBase64)))
      : Buffer.from(payloadBase64, "base64").toString("utf-8");

    const payload: SessionPayload = JSON.parse(payloadStr);

    // Verificar expiración
    if (!payload.expiresAt || Date.now() > payload.expiresAt) {
      return null;
    }

    // Verificar firma criptográfica
    const encoder = new TextEncoder();
    const data = encoder.encode(payloadStr);
    const signatureBytes = hexToUint8Array(signatureHex);

    const key = await getCryptoKey();
    const isValid = await crypto.subtle.verify(
      "HMAC",
      key,
      signatureBytes as unknown as BufferSource,
      data as unknown as BufferSource
    );

    if (!isValid) return null;

    return payload;
  } catch (err) {
    return null;
  }
}

/**
 * Obtiene la sesión actual desde las cookies en Server Components y Route Handlers
 */
export async function getSession(): Promise<SessionPayload | null> {
  try {
    const { cookies } = await import("next/headers");
    const cookieStore = cookies();
    const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
    return await verifySessionToken(token);
  } catch {
    return null;
  }
}
