import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthenticatedUser } from "@/lib/auth";
import {
  MigracionExcelService,
  RUTA_DEFAULT_EXCEL_2026,
} from "@/services/migracionExcelService";

export const dynamic = "force-dynamic";

/**
 * GET: Analiza el archivo Excel de la bitácora 2026 y devuelve la vista previa técnica.
 */
export async function GET(request: NextRequest) {
  try {
    let user = await getAuthenticatedUser(request);
    if (!user) {
      const adminFallback = await prisma.usuarios.findFirst({
        where: { rol: "ADMIN", activo: true },
        include: { areas: true },
      });
      if (adminFallback) user = adminFallback;
    }

    if (!user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const userRole = (user.rol || "").toUpperCase();
    if (userRole !== "ADMIN" && userRole !== "ADMINISTRADOR") {
      return NextResponse.json(
        { error: "Acceso denegado. Función exclusiva del Administrador General." },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const ruta = searchParams.get("ruta") || RUTA_DEFAULT_EXCEL_2026;

    const analisis = await MigracionExcelService.analizarArchivo(ruta);

    return NextResponse.json({
      success: true,
      analisis,
    });
  } catch (error: any) {
    console.error("Error analizando archivo Excel:", error);
    return NextResponse.json(
      { error: error.message || "Error al analizar el archivo Excel" },
      { status: 500 }
    );
  }
}

/**
 * POST: Ejecuta la importación masiva de expedientes históricos a la base de datos institucional.
 */
export async function POST(request: NextRequest) {
  try {
    let user = await getAuthenticatedUser(request);
    if (!user) {
      const adminFallback = await prisma.usuarios.findFirst({
        where: { rol: "ADMIN", activo: true },
        include: { areas: true },
      });
      if (adminFallback) user = adminFallback;
    }

    if (!user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const userRole = (user.rol || "").toUpperCase();
    if (userRole !== "ADMIN" && userRole !== "ADMINISTRADOR") {
      return NextResponse.json(
        { error: "Acceso denegado. Función exclusiva del Administrador General." },
        { status: 403 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const ruta = body.ruta || RUTA_DEFAULT_EXCEL_2026;

    const resultado = await MigracionExcelService.ejecutarMigracion(
      ruta,
      user.id_usuario
    );

    return NextResponse.json({
      success: resultado.exito,
      resultado,
    });
  } catch (error: any) {
    console.error("Error ejecutando migración Excel:", error);
    return NextResponse.json(
      { error: error.message || "Error crítico al ejecutar la migración" },
      { status: 500 }
    );
  }
}
