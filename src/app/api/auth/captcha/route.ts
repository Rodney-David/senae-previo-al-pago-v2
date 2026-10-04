import { NextResponse } from "next/server";
import { generateCaptcha } from "@/lib/captcha";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const challenge = generateCaptcha();
    return NextResponse.json({
      success: true,
      token: challenge.token,
      svg: challenge.svg,
      hint: challenge.questionHint,
    });
  } catch (error) {
    console.error("Error al generar captcha:", error);
    return NextResponse.json({ error: "Error al generar desafío de seguridad" }, { status: 500 });
  }
}
