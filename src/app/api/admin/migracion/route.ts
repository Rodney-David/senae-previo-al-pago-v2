import { NextRequest, NextResponse } from "next/server";
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
    const user = await getAuthenticatedUser(request);

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

import path from "path";
import fs from "fs";

/**
 * POST: Procesa subidas de archivos Excel de bitácora (multipart/form-data) o ejecuta la migración masiva.
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser(request);

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

    const contentType = request.headers.get("content-type") || "";

    // 1. CARGA MANUAL DE ARCHIVO EXCEL (multipart/form-data)
    if (contentType.includes("multipart/form-data")) {
      const formData = await request.formData();
      const file = formData.get("file") as File | null;

      if (!file) {
        return NextResponse.json(
          { error: "No se proporcionó ningún archivo Excel para analizar." },
          { status: 400 }
        );
      }

      const bytes = await file.arrayBuffer();
      const buffer = Buffer.from(bytes);

      const uploadsDir = path.join(process.cwd(), "uploads");
      if (!fs.existsSync(uploadsDir)) {
        fs.mkdirSync(uploadsDir, { recursive: true });
      }

      const cleanFileName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
      const filePath = path.join(uploadsDir, `bitacora_${Date.now()}_${cleanFileName}`);
      fs.writeFileSync(filePath, buffer);

      // Analizar el archivo recién subido
      const analisis = await MigracionExcelService.analizarArchivo(filePath);

      return NextResponse.json({
        success: true,
        analisis,
        ruta_archivo: filePath,
        nombre_archivo: file.name,
      });
    }

    // 2. EJECUCIÓN O ANÁLISIS VÍA JSON
    const body = await request.json().catch(() => ({}));
    const accion = body.accion || "MIGRAR";
    const ruta = body.ruta || RUTA_DEFAULT_EXCEL_2026;

    if (accion === "ANALIZAR") {
      const analisis = await MigracionExcelService.analizarArchivo(ruta);
      return NextResponse.json({
        success: true,
        analisis,
        ruta_archivo: ruta,
      });
    }

    // Ejecutar migración masiva
    const resultado = await MigracionExcelService.ejecutarMigracion(
      ruta,
      user.id_usuario
    );

    return NextResponse.json({
      success: resultado.exito,
      resultado,
    });
  } catch (error: any) {
    console.error("Error en endpoint de migración Excel:", error);
    return NextResponse.json(
      { error: error.message || "Error al procesar la solicitud de migración" },
      { status: 500 }
    );
  }
}
