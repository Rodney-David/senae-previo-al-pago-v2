import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyCaptcha } from "@/lib/captcha";
import crypto from "crypto";

export const dynamic = "force-dynamic";

const AUTH_SECRET = process.env.AUTH_SECRET || "senae_auth_secret_key_2026";

function hashPassword(password: string): string {
  return crypto.createHash("sha256").update(password + "senae_salt_2026").digest("hex");
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

    // 4. Autenticación exitosa: Generar sesión segura y establecer cookie institucional
    const { createSessionToken, SESSION_COOKIE_NAME } = await import("@/lib/session");
    const sessionToken = await createSessionToken(user);

    const response = NextResponse.json({
      success: true,
      message: "Inicio de sesión institucional exitoso",
      user,
    });

    response.cookies.set(SESSION_COOKIE_NAME, sessionToken, {
      path: "/",
      maxAge: 60 * 60 * 24 * 7, // 7 días
      sameSite: "lax",
      httpOnly: true,
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
