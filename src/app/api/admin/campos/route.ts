import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const campos = await prisma.campos_tramite.findMany({
      orderBy: { orden: "asc" },
    });
    const reglas = await prisma.reglas_campo_flujo.findMany();
    return NextResponse.json({ campos, reglas });
  } catch (error) {
    console.error("Error fetching dynamic fields:", error);
    return NextResponse.json(
      { error: "Error al consultar los campos dinámicos" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      tipo_recurso, // "CAMPO" | "REGLA"
      clave,
      etiqueta,
      tipo_dato,
      departamento,
      orden,
      activo,
      // Para reglas:
      clave_campo,
      tipo_flujo,
      id_tipo_tramite,
      etapa_flujo,
      visibilidad,
      obligatoriedad,
    } = body;

    if (tipo_recurso === "REGLA" || (!clave && clave_campo)) {
      if (!clave_campo || !etapa_flujo) {
        return NextResponse.json(
          { error: "clave_campo y etapa_flujo son obligatorios para la regla" },
          { status: 400 }
        );
      }
      const nuevaRegla = await prisma.reglas_campo_flujo.create({
        data: {
          clave_campo,
          tipo_flujo: tipo_flujo || "TODOS",
          id_tipo_tramite: id_tipo_tramite ? Number(id_tipo_tramite) : null,
          etapa_flujo,
          visibilidad: visibilidad || "VISIBLE",
          obligatoriedad: obligatoriedad || "OPCIONAL",
        },
      });
      return NextResponse.json({ success: true, regla: nuevaRegla }, { status: 201 });
    }

    if (!clave || !etiqueta) {
      return NextResponse.json(
        { error: "Clave y etiqueta son campos obligatorios" },
        { status: 400 }
      );
    }

    const nuevoCampo = await prisma.campos_tramite.create({
      data: {
        clave: clave.trim().toLowerCase(),
        etiqueta: etiqueta.trim(),
        tipo_dato: tipo_dato || "TEXT",
        departamento: departamento || "GLOBAL",
        orden: orden ? Number(orden) : 0,
        activo: activo ?? true,
      },
    });

    return NextResponse.json({ success: true, campo: nuevoCampo }, { status: 201 });
  } catch (error: any) {
    console.error("Error creating dynamic field/rule:", error);
    return NextResponse.json(
      { error: error?.message || "Error al crear el campo o regla" },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      tipo_recurso, // "CAMPO" | "REGLA"
      id_campo,
      clave,
      etiqueta,
      tipo_dato,
      departamento,
      orden,
      activo,
      // Para reglas:
      id_regla,
      clave_campo,
      tipo_flujo,
      id_tipo_tramite,
      etapa_flujo,
      visibilidad,
      obligatoriedad,
    } = body;

    if (tipo_recurso === "REGLA" || id_regla) {
      if (!id_regla) {
        return NextResponse.json({ error: "ID de regla requerido" }, { status: 400 });
      }
      const reglaActualizada = await prisma.reglas_campo_flujo.update({
        where: { id_regla: Number(id_regla) },
        data: {
          ...(clave_campo && { clave_campo }),
          ...(tipo_flujo && { tipo_flujo }),
          ...(id_tipo_tramite !== undefined && {
            id_tipo_tramite: id_tipo_tramite ? Number(id_tipo_tramite) : null,
          }),
          ...(etapa_flujo && { etapa_flujo }),
          ...(visibilidad && { visibilidad }),
          ...(obligatoriedad && { obligatoriedad }),
        },
      });
      return NextResponse.json({ success: true, regla: reglaActualizada });
    }

    if (!id_campo) {
      return NextResponse.json({ error: "ID de campo requerido" }, { status: 400 });
    }

    const campoActualizado = await prisma.campos_tramite.update({
      where: { id_campo: Number(id_campo) },
      data: {
        ...(clave && { clave: clave.trim().toLowerCase() }),
        ...(etiqueta && { etiqueta: etiqueta.trim() }),
        ...(tipo_dato && { tipo_dato }),
        ...(departamento && { departamento }),
        ...(orden !== undefined && { orden: Number(orden) }),
        ...(activo !== undefined && { activo: Boolean(activo) }),
      },
    });

    return NextResponse.json({ success: true, campo: campoActualizado });
  } catch (error: any) {
    console.error("Error updating field/rule:", error);
    return NextResponse.json(
      { error: error?.message || "Error al actualizar el campo o regla" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const tipo = searchParams.get("tipo") || "CAMPO";
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "ID requerido" }, { status: 400 });
    }

    if (tipo === "REGLA") {
      await prisma.reglas_campo_flujo.delete({
        where: { id_regla: Number(id) },
      });
      return NextResponse.json({ success: true, message: "Regla eliminada con éxito" });
    }

    await prisma.campos_tramite.delete({
      where: { id_campo: Number(id) },
    });

    return NextResponse.json({ success: true, message: "Campo dinámico eliminado con éxito" });
  } catch (error: any) {
    console.error("Error deleting field/rule:", error);
    return NextResponse.json(
      { error: error?.message || "Error al eliminar" },
      { status: 500 }
    );
  }
}
