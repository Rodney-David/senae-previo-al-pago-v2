import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthenticatedUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

/**
 * Endpoint unificado para administración de catálogos y desplegables institucionales:
 * - Áreas Requirentes (catalogo_areas)
 * - Tipos de Proceso Normativo (tipos_tramite)
 * - Tipos de Gestión (tipos_gestion)
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const tipo = searchParams.get("tipo") || "areas"; // areas | procesos | gestion

    if (tipo === "areas") {
      const items = await (prisma as any).catalogo_areas.findMany({
        orderBy: { nombre: "asc" },
      });
      return NextResponse.json({ success: true, items });
    }

    if (tipo === "procesos") {
      const items = await prisma.tipos_tramite.findMany({
        orderBy: { nombre: "asc" },
      });
      return NextResponse.json({ success: true, items });
    }

    if (tipo === "gestion") {
      const padre = searchParams.get("padre");
      const items = await prisma.tipos_gestion.findMany({
        where: padre ? { padre: padre.toUpperCase() } : undefined,
        orderBy: { nombre: "asc" },
      });
      return NextResponse.json({ success: true, items });
    }

    if (tipo === "items" || tipo === "items_presupuestarios") {
      const q = searchParams.get("q") || "";
      const limit = searchParams.get("limit") ? Number(searchParams.get("limit")) : undefined;
      const whereClause = q
        ? {
            OR: [
              { codigo: { contains: q } },
              { nombre: { contains: q } },
            ],
          }
        : undefined;

      const items = await (prisma as any).items_presupuestarios.findMany({
        where: whereClause,
        orderBy: { codigo: "asc" },
        take: limit || 2000,
      });
      return NextResponse.json({ success: true, items });
    }

    return NextResponse.json({ error: "Tipo de catálogo no válido" }, { status: 400 });
  } catch (error: any) {
    console.error("Error fetching catalogo:", error);
    return NextResponse.json(
      { error: error?.message || "Error al obtener catálogo" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser(request);
    const isAuthorized = user && (user.rol === "ADMIN" || user.rol === "ADMINISTRADOR");
    if (!isAuthorized) {
      return NextResponse.json(
        { error: "Acceso restringido. Solo Administradores TICs pueden modificar catálogos." },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { tipo, accion, data, text } = body;

    // 1. IMPORTAR DESDE TEXTO (.txt)
    if (accion === "importar") {
      if (!text || typeof text !== "string") {
        return NextResponse.json({ error: "Contenido de texto requerido para importar" }, { status: 400 });
      }

      const lines = text
        .split(/\r?\n/)
        .map((l: string) => l.trim())
        .filter((l: string) => l.length > 0);

      if (lines.length === 0) {
        return NextResponse.json({ error: "El archivo o texto no contiene líneas válidas" }, { status: 400 });
      }

      let insertados = 0;
      let omitidos = 0;

      if (tipo === "areas") {
        for (const nombre of lines) {
          try {
            await (prisma as any).catalogo_areas.upsert({
              where: { nombre },
              update: { activo: true },
              create: { nombre, activo: true },
            });
            insertados++;
          } catch (e) {
            omitidos++;
          }
        }
      } else if (tipo === "procesos") {
        for (const line of lines) {
          try {
            // Si la línea tiene formato "CODIGO - Nombre" o solo "Nombre"
            const parts = line.split(" - ");
            let codigo = parts.length > 1 ? parts[0].trim().toUpperCase() : line.substring(0, 20).trim().replace(/\s+/g, "_").toUpperCase();
            let nombre = parts.length > 1 ? parts.slice(1).join(" - ").trim() : line;
            // Asegurar código único
            codigo = codigo.replace(/[^A-Z0-9_]/gi, "").substring(0, 30);
            if (!codigo) codigo = `PROC_${Date.now()}_${Math.floor(Math.random() * 1000)}`;

            await prisma.tipos_tramite.upsert({
              where: { codigo },
              update: { nombre, activo: true },
              create: {
                codigo,
                nombre,
                activo: true,
                tipo_cur_permitido: "DEVENGADO",
                requiere_item_presupuestario: true,
                requiere_factura: true,
              },
            });
            insertados++;
          } catch (e) {
            omitidos++;
          }
        }
      } else if (tipo === "gestion") {
        for (const line of lines) {
          try {
            const parts = line.split(" - ");
            let codigo = parts.length > 1 ? parts[0].trim().toUpperCase() : line.substring(0, 20).trim().replace(/\s+/g, "_").toUpperCase();
            let nombre = parts.length > 1 ? parts.slice(1).join(" - ").trim() : line;
            codigo = codigo.replace(/[^A-Z0-9_]/gi, "").substring(0, 40);
            if (!codigo) codigo = `GES_${Date.now()}_${Math.floor(Math.random() * 1000)}`;

            await prisma.tipos_gestion.upsert({
              where: { codigo },
              update: { nombre, activo: true },
              create: {
                codigo,
                nombre,
                activo: true,
              },
            });
            insertados++;
          } catch (e) {
            omitidos++;
          }
        }
      } else if (tipo === "items" || tipo === "items_presupuestarios") {
        for (const line of lines) {
          try {
            const parts = line.split(" - ");
            let codigo = parts.length > 1 ? parts[0].trim() : line.substring(0, 15).trim();
            let nombre = parts.length > 1 ? parts.slice(1).join(" - ").trim() : line;
            if (!codigo) continue;

            await (prisma as any).items_presupuestarios.upsert({
              where: { codigo },
              update: { nombre, activo: true },
              create: {
                codigo,
                nombre,
                activo: true,
              },
            });
            insertados++;
          } catch (e) {
            omitidos++;
          }
        }
      }

      return NextResponse.json({
        success: true,
        message: `Importación completada: ${insertados} registros procesados, ${omitidos} omitidos/duplicados.`,
        insertados,
        omitidos,
      });
    }

    // 1.1 IMPORTAR DIRECTO DESDE PDF CLASIFICADOR OFICIAL
    if (accion === "importar_pdf") {
      try {
        const { execSync } = require("child_process");
        const path = require("path");
        const scriptPath = path.join(process.cwd(), "scripts", "import_items_presupuestarios.py");
        execSync(`python "${scriptPath}"`, { stdio: "pipe" });

        const total = await (prisma as any).items_presupuestarios.count();
        return NextResponse.json({
          success: true,
          message: `Catálogo de ítems presupuestarios importado exitosamente desde PDF oficial. Total en BD: ${total} ítems.`,
          total,
        });
      } catch (err: any) {
        console.error("Error importando PDF:", err);
        return NextResponse.json(
          { error: "Error al ejecutar la extracción del PDF oficial: " + (err?.message || "") },
          { status: 500 }
        );
      }
    }

    // 2. VACIAR CATÁLOGO
    if (accion === "vaciar") {
      if (tipo === "areas") {
        await (prisma as any).catalogo_areas.deleteMany({});
        return NextResponse.json({ success: true, message: "Catálogo de Áreas vaciado con éxito." });
      }

      if (tipo === "procesos") {
        // En procesos normativos, solo borrar los que no tengan trámites asociados
        const tramitesUsando = await prisma.tramites.findMany({ select: { id_tipo_tramite: true } });
        const idsUsados = new Set(tramitesUsando.map((t) => t.id_tipo_tramite));

        const res = await prisma.tipos_tramite.deleteMany({
          where: {
            id_tipo_tramite: { notIn: Array.from(idsUsados) },
          },
        });
        return NextResponse.json({
          success: true,
          message: `Se vaciaron ${res.count} procesos sin trámites vinculados. ${idsUsados.size} se protegieron por integridad.`,
        });
      }

      if (tipo === "gestion") {
        await prisma.tipos_gestion.deleteMany({});
        return NextResponse.json({ success: true, message: "Catálogo de Tipos de Gestión vaciado con éxito." });
      }

      if (tipo === "items" || tipo === "items_presupuestarios") {
        await (prisma as any).items_presupuestarios.deleteMany({});
        return NextResponse.json({ success: true, message: "Catálogo de Ítems Presupuestarios vaciado con éxito." });
      }
    }

    // 3. CREAR MANUALMENTE UN REGISTRO
    if (tipo === "items" || tipo === "items_presupuestarios") {
      if (!data?.codigo?.trim() || !data?.nombre?.trim()) {
        return NextResponse.json({ error: "El código y nombre del ítem presupuestario son obligatorios" }, { status: 400 });
      }
      const nuevo = await (prisma as any).items_presupuestarios.create({
        data: {
          codigo: data.codigo.trim(),
          nombre: data.nombre.trim(),
          descripcion: data.descripcion?.trim() || null,
          activo: data.activo !== undefined ? Boolean(data.activo) : true,
        },
      });
      return NextResponse.json({ success: true, item: nuevo }, { status: 201 });
    }

    // 3. CREAR MANUALMENTE UN REGISTRO
    if (tipo === "areas") {
      if (!data?.nombre?.trim()) {
        return NextResponse.json({ error: "El nombre del área es obligatorio" }, { status: 400 });
      }
      const nuevo = await (prisma as any).catalogo_areas.create({
        data: {
          nombre: data.nombre.trim(),
          codigo: data.codigo?.trim() || null,
          descripcion: data.descripcion?.trim() || null,
          activo: data.activo !== undefined ? Boolean(data.activo) : true,
        },
      });
      return NextResponse.json({ success: true, item: nuevo }, { status: 201 });
    }

    if (tipo === "procesos") {
      if (!data?.nombre?.trim() || !data?.codigo?.trim()) {
        return NextResponse.json({ error: "Nombre y código son obligatorios" }, { status: 400 });
      }
      const nuevo = await prisma.tipos_tramite.create({
        data: {
          codigo: data.codigo.trim().toUpperCase(),
          nombre: data.nombre.trim(),
          descripcion: data.descripcion?.trim() || null,
          tipo_cur_permitido: data.tipo_cur_permitido || "DEVENGADO",
          requiere_item_presupuestario: Boolean(data.requiere_item_presupuestario ?? true),
          requiere_factura: Boolean(data.requiere_factura ?? true),
          activo: data.activo !== undefined ? Boolean(data.activo) : true,
        },
      });
      return NextResponse.json({ success: true, item: nuevo }, { status: 201 });
    }

    if (tipo === "gestion") {
      if (!data?.nombre?.trim() || !data?.codigo?.trim()) {
        return NextResponse.json({ error: "Nombre y código son obligatorios" }, { status: 400 });
      }
      const nuevo = await prisma.tipos_gestion.create({
        data: {
          codigo: data.codigo.trim().toUpperCase(),
          nombre: data.nombre.trim(),
          descripcion: data.descripcion?.trim() || null,
          activo: data.activo !== undefined ? Boolean(data.activo) : true,
        },
      });
      return NextResponse.json({ success: true, item: nuevo }, { status: 201 });
    }

    return NextResponse.json({ error: "Operación no soportada" }, { status: 400 });
  } catch (error: any) {
    console.error("Error en catalogo POST:", error);
    return NextResponse.json(
      { error: error?.message || "Error al procesar operación de catálogo" },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser(request);
    const isAuthorized = user && (user.rol === "ADMIN" || user.rol === "ADMINISTRADOR");
    if (!isAuthorized) {
      return NextResponse.json(
        { error: "Acceso restringido. Solo Administradores TICs pueden modificar catálogos." },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { tipo, id, data } = body;

    if (!id || !data) {
      return NextResponse.json({ error: "ID y datos requeridos para modificar" }, { status: 400 });
    }

    if (tipo === "areas") {
      const actualizado = await (prisma as any).catalogo_areas.update({
        where: { id_area: Number(id) },
        data: {
          ...(data.nombre && { nombre: data.nombre.trim() }),
          ...(data.codigo !== undefined && { codigo: data.codigo?.trim() || null }),
          ...(data.descripcion !== undefined && { descripcion: data.descripcion?.trim() || null }),
          ...(data.activo !== undefined && { activo: Boolean(data.activo) }),
        },
      });
      return NextResponse.json({ success: true, item: actualizado });
    }

    if (tipo === "procesos") {
      const actualizado = await prisma.tipos_tramite.update({
        where: { id_tipo_tramite: Number(id) },
        data: {
          ...(data.nombre && { nombre: data.nombre.trim() }),
          ...(data.codigo && { codigo: data.codigo.trim().toUpperCase() }),
          ...(data.descripcion !== undefined && { descripcion: data.descripcion?.trim() || null }),
          ...(data.tipo_cur_permitido && { tipo_cur_permitido: data.tipo_cur_permitido }),
          ...(data.requiere_item_presupuestario !== undefined && {
            requiere_item_presupuestario: Boolean(data.requiere_item_presupuestario),
          }),
          ...(data.requiere_factura !== undefined && { requiere_factura: Boolean(data.requiere_factura) }),
          ...(data.activo !== undefined && { activo: Boolean(data.activo) }),
        },
      });
      return NextResponse.json({ success: true, item: actualizado });
    }

    if (tipo === "gestion") {
      const actualizado = await prisma.tipos_gestion.update({
        where: { id_tipo_gestion: Number(id) },
        data: {
          ...(data.nombre && { nombre: data.nombre.trim() }),
          ...(data.codigo && { codigo: data.codigo.trim().toUpperCase() }),
          ...(data.descripcion !== undefined && { descripcion: data.descripcion?.trim() || null }),
          ...(data.activo !== undefined && { activo: Boolean(data.activo) }),
        },
      });
      return NextResponse.json({ success: true, item: actualizado });
    }

    if (tipo === "items" || tipo === "items_presupuestarios") {
      const actualizado = await (prisma as any).items_presupuestarios.update({
        where: { id_item: Number(id) },
        data: {
          ...(data.nombre && { nombre: data.nombre.trim() }),
          ...(data.codigo && { codigo: data.codigo.trim() }),
          ...(data.descripcion !== undefined && { descripcion: data.descripcion?.trim() || null }),
          ...(data.activo !== undefined && { activo: Boolean(data.activo) }),
        },
      });
      return NextResponse.json({ success: true, item: actualizado });
    }

    return NextResponse.json({ error: "Tipo de catálogo no válido" }, { status: 400 });
  } catch (error: any) {
    console.error("Error en catalogo PUT:", error);
    return NextResponse.json(
      { error: error?.message || "Error al actualizar catálogo" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser(request);
    const isAuthorized = user && (user.rol === "ADMIN" || user.rol === "ADMINISTRADOR");
    if (!isAuthorized) {
      return NextResponse.json(
        { error: "Acceso restringido. Solo Administradores TICs pueden modificar catálogos." },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const tipo = searchParams.get("tipo") || "areas";
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "ID requerido para eliminar" }, { status: 400 });
    }

    if (tipo === "areas") {
      await (prisma as any).catalogo_areas.delete({
        where: { id_area: Number(id) },
      });
      return NextResponse.json({ success: true, message: "Área eliminada del catálogo" });
    }

    if (tipo === "procesos") {
      await prisma.tipos_tramite.delete({
        where: { id_tipo_tramite: Number(id) },
      });
      return NextResponse.json({ success: true, message: "Proceso normativo eliminado" });
    }

    if (tipo === "gestion") {
      await prisma.tipos_gestion.delete({
        where: { id_tipo_gestion: Number(id) },
      });
      return NextResponse.json({ success: true, message: "Tipo de gestión eliminado" });
    }

    if (tipo === "items" || tipo === "items_presupuestarios") {
      await (prisma as any).items_presupuestarios.delete({
        where: { id_item: Number(id) },
      });
      return NextResponse.json({ success: true, message: "Ítem presupuestario eliminado" });
    }

    return NextResponse.json({ error: "Tipo de catálogo no válido" }, { status: 400 });
  } catch (error: any) {
    console.error("Error en catalogo DELETE:", error);
    return NextResponse.json(
      { error: error?.message || "Error al eliminar registro de catálogo" },
      { status: 500 }
    );
  }
}
