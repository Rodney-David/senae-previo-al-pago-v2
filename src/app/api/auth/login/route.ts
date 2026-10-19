import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyCaptcha } from "@/lib/captcha";
import crypto from "crypto";
import { sanitizeUser } from "@/lib/sanitize";

export const dynamic = "force-dynamic";

import { AUTH_SECRET } from "@/lib/session";

function hashPasswordLegacy(password: string): string {
  return crypto.createHash("sha256").update(password + "senae_salt_2026").digest("hex");
}

function verifyUserPassword(enteredPassword: string, storedHash?: string | null): boolean {
  if (!storedHash) return false;
  if (storedHash.startsWith("pbkdf2$")) {
    try {
      const parts = storedHash.split("$");
      const salt = parts[1];
      const iterations = parseInt(parts[2], 10);
      const expectedKey = parts[3];
      const calculatedKey = crypto.pbkdf2Sync(enteredPassword, salt, iterations, 64, "sha512").toString("hex");
      const expectedBuf = Buffer.from(expectedKey, "hex");
      const calculatedBuf = Buffer.from(calculatedKey, "hex");
      if (expectedBuf.length !== calculatedBuf.length) return false;
      return crypto.timingSafeEqual(expectedBuf, calculatedBuf);
    } catch {
      return false;
    }
  }
  const legacyHash = hashPasswordLegacy(enteredPassword);
  try {
    const legacyBuf = Buffer.from(legacyHash, "hex");
    const storedBuf = Buffer.from(storedHash, "hex");
    if (legacyBuf.length === storedBuf.length) {
      return crypto.timingSafeEqual(legacyBuf, storedBuf);
    }
  } catch {
    // fallback
  }
  return legacyHash === storedHash;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
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

    // 3. Validar Contraseña (PBKDF2 seguro con fallback a SHA-256 institucional)
    const isPasswordValid = verifyUserPassword(password, user.password_hash);

    if (!isPasswordValid) {
      return NextResponse.json(
        { error: "Contraseña incorrecta. Verifique sus credenciales institucionales." },
        { status: 401 }
      );
    }

    // 4. Autenticación exitosa: Generar sesión segura y establecer cookie institucional
    const { createSessionToken, SESSION_COOKIE_NAME } = await import("@/lib/session");
    const sessionToken = await createSessionToken(user);

    // L-06: Excluir password_hash de la respuesta JSON enviada al cliente de forma segura
    const safeUser = sanitizeUser(user);

    const response = NextResponse.json({
      success: true,
      message: "Inicio de sesión institucional exitoso",
      user: safeUser,
    });

    response.cookies.set(SESSION_COOKIE_NAME, sessionToken, {
      path: "/",
      maxAge: 60 * 60 * 2, // 2 horas máximo (7200 s)
      sameSite: "lax",
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
    });

    return response;
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
    response.cookies.delete("senae_session");
    response.cookies.delete("senae_simulated_user_id");
    response.cookies.delete("senae_auth_token");
    return response;
  } catch (error) {
    return NextResponse.json({ error: "Error al cerrar sesión" }, { status: 500 });
  }
}
