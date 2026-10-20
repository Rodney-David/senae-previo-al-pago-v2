import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

/**
 * GET /api/catalogos
 * Endpoint institucional para desplegables de catálogos:
 * - tipo=areas (Áreas requirentes activas)
 * - tipo=procesos (Tipos de trámite/procesos normativos activos)
 * - tipo=gestion (Tipos de gestión / subtipos de pago o garantía)
 * - tipo=items (Ítems presupuestarios)
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const tipo = searchParams.get("tipo") || "areas";

    if (tipo === "areas") {
      // 1. Consultar catalogo_areas (las 266 áreas requirentes institucionales)
      let items = await prisma.catalogo_areas.findMany({
        where: { activo: true },
        orderBy: { nombre: "asc" },
      });

      // Si por alguna razón no hay registros activos, traer todas las de catalogo_areas
      if (items.length === 0) {
        items = await prisma.catalogo_areas.findMany({
          orderBy: { nombre: "asc" },
        });
      }

      // Si aún estuviera vacía, hacer fallback a la tabla interna 'areas'
      if (items.length === 0) {
        const fallbackAreas = await prisma.areas.findMany({
          orderBy: { nombre: "asc" },
        });
        return NextResponse.json({
          success: true,
          items: fallbackAreas.map((a) => ({
            id_area: a.id_area,
            nombre: a.nombre,
            codigo: a.codigo,
            activo: a.activo ?? true,
          })),
        });
      }

      return NextResponse.json({ success: true, items });
    }

    if (tipo === "procesos" || tipo === "tipos_tramite") {
      const tipos = await prisma.tipos_tramite.findMany({
        where: { activo: true },
        orderBy: { id_tipo_tramite: "asc" },
      });

      // Devolver formato compatible con todos los consumidores
      return NextResponse.json({
        success: true,
        tipos,
        items: tipos,
        procesos: tipos,
      });
    }

    if (tipo === "gestion") {
      const padre = searchParams.get("padre");
      const items = await prisma.tipos_gestion.findMany({
        where: {
          ...(padre ? { padre: padre.toUpperCase() } : {}),
          activo: true,
        },
        orderBy: { id_tipo_gestion: "asc" },
      });
      return NextResponse.json({ success: true, items, gestiones: items });
    }

    if (tipo === "items" || tipo === "items_presupuestarios") {
      const q = searchParams.get("q") || "";
      const limit = searchParams.get("limit") ? Number(searchParams.get("limit")) : 2000;
      const whereClause = q
        ? {
            OR: [
              { codigo: { contains: q } },
              { nombre: { contains: q } },
            ],
            activo: true,
          }
        : { activo: true };

      const items = await prisma.items_presupuestarios.findMany({
        where: whereClause,
        orderBy: { codigo: "asc" },
        take: limit,
      });
      return NextResponse.json({ success: true, items });
    }

    return NextResponse.json({ error: "Tipo de catálogo no válido" }, { status: 400 });
  } catch (error: any) {
    console.error("Error en GET /api/catalogos:", error);
    return NextResponse.json(
      { error: error?.message || "Error al obtener catálogo institucional" },
      { status: 500 }
    );
  }
}
