import crypto from "crypto";

const CAPTCHA_SECRET = process.env.CAPTCHA_SECRET || "senae_captcha_secret_key_2026";

export interface CaptchaChallenge {
  token: string;
  svg: string;
  questionHint?: string;
}

/**
 * Genera un código aleatorio alfanumérico fácil de leer (evitando caracteres ambiguos como 0, O, 1, I)
 */
function generateRandomCode(length = 5): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < length; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

/**
 * Genera una imagen SVG con texto distorsionado, líneas de interferencia y ruido de seguridad
 */
export function generateCaptcha(): CaptchaChallenge {
  const text = generateRandomCode(5);
  const width = 160;
  const height = 50;

  // Generar líneas aleatorias de distorsión
  let lines = "";
  for (let i = 0; i < 4; i++) {
    const x1 = Math.floor(Math.random() * width);
    const y1 = Math.floor(Math.random() * height);
    const x2 = Math.floor(Math.random() * width);
    const y2 = Math.floor(Math.random() * height);
    const color = i % 2 === 0 ? "#3b82f6" : "#64748b";
    lines += `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${color}" stroke-width="1.5" opacity="0.4" />`;
  }

  // Generar puntos de ruido
  let dots = "";
  for (let i = 0; i < 25; i++) {
    const cx = Math.floor(Math.random() * width);
    const cy = Math.floor(Math.random() * height);
    dots += `<circle cx="${cx}" cy="${cy}" r="1" fill="#94a3b8" opacity="0.5" />`;
  }

  // Caracteres con rotación y desplazamiento individual
  let charsSvg = "";
  const letterSpacing = width / (text.length + 1);
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const x = Math.floor((i + 0.6) * letterSpacing);
    const y = 32 + (Math.random() * 6 - 3);
    const angle = Math.floor(Math.random() * 24 - 12); // Rotación entre -12 y +12 grados
    const colors = ["#0f172a", "#1e3a8a", "#0369a1", "#1e293b"];
    const color = colors[i % colors.length];

    charsSvg += `
      <text
        x="${x}"
        y="${y}"
        font-family="monospace, Arial, sans-serif"
        font-size="24"
        font-weight="bold"
        fill="${color}"
        transform="rotate(${angle}, ${x}, ${y})"
        text-anchor="middle"
      >${char}</text>
    `;
  }

  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
      <rect width="100%" height="100%" fill="#f8fafc" rx="6" />
      <rect width="100%" height="100%" fill="none" stroke="#cbd5e1" stroke-width="1" rx="6" />
      ${lines}
      ${dots}
      ${charsSvg}
    </svg>
  `.trim();

  // Firmar la respuesta con timestamp para validez de 5 minutos
  const expiresAt = Date.now() + 5 * 60 * 1000;
  const payload = `${text.toUpperCase()}:${expiresAt}`;
  const hmac = crypto.createHmac("sha256", CAPTCHA_SECRET).update(payload).digest("hex");
  const token = Buffer.from(`${payload}:${hmac}`).toString("base64");

  return {
    token,
    svg,
    questionHint: "Escriba los 5 caracteres de la imagen",
  };
}

/**
 * Valida si la respuesta del usuario coincide con el token generado y no ha expirado
 */
export function verifyCaptcha(token: string, userInput: string): boolean {
  if (!token || !userInput) return false;

  try {
    const decoded = Buffer.from(token, "base64").toString("utf-8");
    const [expectedCode, expiresAtStr, receivedHmac] = decoded.split(":");

    if (!expectedCode || !expiresAtStr || !receivedHmac) return false;

    const expiresAt = parseInt(expiresAtStr, 10);
    if (isNaN(expiresAt) || Date.now() > expiresAt) {
      return false; // Captcha expirado (más de 5 minutos)
    }

    const payload = `${expectedCode}:${expiresAt}`;
    const calculatedHmac = crypto.createHmac("sha256", CAPTCHA_SECRET).update(payload).digest("hex");

    if (calculatedHmac !== receivedHmac) {
      return false; // Token alterado
    }

    return expectedCode.toUpperCase().trim() === userInput.toUpperCase().trim();
  } catch (error) {
    console.error("Error al verificar captcha:", error);
    return false;
  }
}
