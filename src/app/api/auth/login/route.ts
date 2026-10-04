import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyCaptcha } from "@/lib/captcha";
import crypto from "crypto";

export const dynamic = "force-dynamic";

const AUTH_SECRET = process.env.AUTH_SECRET || "senae_auth_secret_key_2026";

function hashPassword(password: string): string {
  return crypto.createHash("sha256").update(password + "senae_salt_2026").digest("hex");
}

function generateTwoFactorToken(userId: number, code: string): string {
  const expiresAt = Date.now() + 5 * 60 * 1000; // 5 minutos
  const payload = `${userId}:${code}:${expiresAt}`;
  const hmac = crypto.createHmac("sha256", AUTH_SECRET).update(payload).digest("hex");
  return Buffer.from(`${payload}:${hmac}`).toString("base64");
}

function verifyTwoFactorToken(token: string, codeEntered: string): number | null {
  try {
    const decoded = Buffer.from(token, "base64").toString("utf-8");
    const [userIdStr, expectedCode, expiresAtStr, receivedHmac] = decoded.split(":");

    if (!userIdStr || !expectedCode || !expiresAtStr || !receivedHmac) return null;

    const expiresAt = parseInt(expiresAtStr, 10);
    if (isNaN(expiresAt) || Date.now() > expiresAt) return null;

    const payload = `${userIdStr}:${expectedCode}:${expiresAt}`;
    const calculatedHmac = crypto.createHmac("sha256", AUTH_SECRET).update(payload).digest("hex");

    if (calculatedHmac !== receivedHmac) return null;
    if (expectedCode.trim() !== codeEntered.trim()) return null;

    return parseInt(userIdStr, 10);
  } catch (err) {
    return null;
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action } = body;

    // ==========================================
    // PASO 2: VALIDACIÓN DE CÓDIGO 2FA
    // ==========================================
    if (action === "VERIFY_2FA") {
      const { twoFactorToken, code } = body;
      if (!twoFactorToken || !code) {
        return NextResponse.json(
          { error: "Debe ingresar el código de verificación 2FA de 6 dígitos" },
          { status: 400 }
        );
      }

      const userId = verifyTwoFactorToken(twoFactorToken, code);
      if (!userId) {
        return NextResponse.json(
          { error: "Código de verificación 2FA incorrecto o expirado (Válido por 5 minutos)." },
          { status: 400 }
        );
      }

      const user = await prisma.usuarios.findUnique({
        where: { id_usuario: userId },
        include: { areas: true },
      });

      if (!user || !user.activo) {
        return NextResponse.json({ error: "Cuenta institucional inactiva o no encontrada" }, { status: 403 });
      }

      const response = NextResponse.json({
        success: true,
        message: "Autenticación de doble factor exitosa",
        user,
      });

      // Establecer cookies de sesión institucional
      response.cookies.set("senae_simulated_user_id", String(user.id_usuario), {
        path: "/",
        maxAge: 60 * 60 * 24 * 7, // 7 días
        sameSite: "lax",
      });

      response.cookies.set("senae_auth_token", Buffer.from(`${user.id_usuario}:${Date.now()}`).toString("base64"), {
        path: "/",
        maxAge: 60 * 60 * 24 * 7,
        sameSite: "lax",
      });

      return response;
    }

    // ==========================================
    // PASO 1: VALIDACIÓN DE CREDENCIALES + CAPTCHA
    // ==========================================
    const { email_or_user, password, captcha_token, captcha_answer } = body;

    if (!email_or_user || !password) {
      return NextResponse.json(
        { error: "Ingrese su usuario o correo institucional y su contraseña" },
        { status: 400 }
      );
    }

    // 1. Validar Captcha
    if (!captcha_token || !captcha_answer) {
      return NextResponse.json(
        { error: "Debe resolver el código Captcha de seguridad visual" },
        { status: 400 }
      );
    }

    const isCaptchaValid = verifyCaptcha(captcha_token, captcha_answer);
    if (!isCaptchaValid) {
      return NextResponse.json(
        { error: "Código Captcha incorrecto o expirado. Ingrese los caracteres mostrados en la imagen." },
        { status: 400 }
      );
    }

    // 2. Buscar usuario
    const normalizedInput = email_or_user.trim().toLowerCase();
    const fullEmail = normalizedInput.includes("@")
      ? normalizedInput
      : `${normalizedInput}@aduana.gob.ec`;

    const user = await prisma.usuarios.findFirst({
      where: {
        OR: [
          { correo_institucional: fullEmail },
          { correo_institucional: normalizedInput },
        ],
      },
      include: { areas: true },
    });

    if (!user) {
      return NextResponse.json(
        { error: "Credenciales institucionales no válidas. Verifique su usuario o contraseña." },
        { status: 401 }
      );
    }

    if (!user.activo) {
      return NextResponse.json(
        { error: "El usuario institucional se encuentra INACTIVO. Contacte a la Dirección Financiera." },
        { status: 403 }
      );
    }

    // 3. Validar Contraseña
    const enteredHash = hashPassword(password);
    const isPasswordValid =
      user.password_hash === enteredHash ||
      password === "senae2026"; // Clave universal del prototipo

    if (!isPasswordValid) {
      return NextResponse.json(
        { error: "Contraseña incorrecta. Verifique sus credenciales institucionales." },
        { status: 401 }
      );
    }

    // 4. Generar Código 2FA aleatorio de 6 dígitos
    const randomCode = Math.floor(100000 + Math.random() * 900000).toString();
    const twoFactorToken = generateTwoFactorToken(user.id_usuario, randomCode);

    // Ocultar email parcialmente para seguridad: d***@aduana.gob.ec
    const emailParts = user.correo_institucional.split("@");
    const maskedEmail = `${emailParts[0].charAt(0)}***@${emailParts[1] || "aduana.gob.ec"}`;

    return NextResponse.json({
      require2FA: true,
      twoFactorToken,
      maskedEmail,
      fullEmail: user.correo_institucional,
      previewCode: randomCode, // Mostrado de apoyo para pruebas inmediatas del usuario y sus directivos
      message: `Código de seguridad 2FA enviado a ${maskedEmail}`,
    });
  } catch (error: any) {
    console.error("Error en login institucional:", error);
    return NextResponse.json(
      { error: error?.message || "Error procesando inicio de sesión institucional" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const response = NextResponse.json({ success: true, message: "Sesión cerrada correctamente" });
    response.cookies.delete("senae_simulated_user_id");
    response.cookies.delete("senae_auth_token");
    return response;
  } catch (error) {
    return NextResponse.json({ error: "Error al cerrar sesión" }, { status: 500 });
  }
}
