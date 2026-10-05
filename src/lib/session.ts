/**
 * Servicio Criptográfico de Sesión Institucional SENAE
 * Compatible con Node.js y Edge Runtime (Next.js Middleware)
 * Utiliza Web Crypto API estándar para firma y verificación HMAC-SHA256
 */

const AUTH_SECRET = process.env.AUTH_SECRET || "senae_clave_maestra_seguridad_control_previo_2026";
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
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(hex.substr(i * 2, 2), 16);
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

/**
 * Genera un token de sesión firmado criptográficamente
 * Duración por defecto: 7 días
 */
export async function createSessionToken(
  user: { id_usuario: number; correo_institucional: string; rol: string },
  durationMs: number = 7 * 24 * 60 * 60 * 1000
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
