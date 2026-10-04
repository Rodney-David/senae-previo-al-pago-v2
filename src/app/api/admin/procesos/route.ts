import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const tipos = await prisma.tipos_tramite.findMany({
      orderBy: { id_tipo_tramite: "asc" },
    });
    return NextResponse.json({ tipos });
  } catch (error) {
    console.error("Error fetching process types:", error);
    return NextResponse.json(
      { error: "Error al consultar los tipos de procesos normativos" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      codigo,
      nombre,
      descripcion,
      tipo_cur_permitido,
      requiere_item_presupuestario,
      requiere_factura,
      activo,
    } = body;

    if (!codigo || !nombre) {
      return NextResponse.json(
        { error: "Código y nombre son campos obligatorios" },
        { status: 400 }
      );
    }

    const nuevoTipo = await prisma.tipos_tramite.create({
      data: {
        codigo: codigo.trim().toUpperCase(),
        nombre: nombre.trim(),
        descripcion: descripcion?.trim() || null,
        tipo_cur_permitido: tipo_cur_permitido || "DEVENGADO",
        requiere_item_presupuestario: requiere_item_presupuestario ?? true,
        requiere_factura: requiere_factura ?? true,
        activo: activo ?? true,
      },
    });

    return NextResponse.json({ success: true, tipo: nuevoTipo }, { status: 201 });
  } catch (error: any) {
    console.error("Error creating process type:", error);
    return NextResponse.json(
      { error: error?.message || "Error al crear el tipo de proceso" },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      id_tipo_tramite,
      codigo,
      nombre,
      descripcion,
      tipo_cur_permitido,
      requiere_item_presupuestario,
      requiere_factura,
      activo,
    } = body;

    if (!id_tipo_tramite) {
      return NextResponse.json({ error: "ID de tipo de trámite requerido" }, { status: 400 });
    }

    const tipoActualizado = await prisma.tipos_tramite.update({
      where: { id_tipo_tramite: Number(id_tipo_tramite) },
      data: {
        ...(codigo && { codigo: codigo.trim().toUpperCase() }),
        ...(nombre && { nombre: nombre.trim() }),
        ...(descripcion !== undefined && { descripcion }),
        ...(tipo_cur_permitido && { tipo_cur_permitido }),
        ...(requiere_item_presupuestario !== undefined && {
          requiere_item_presupuestario: Boolean(requiere_item_presupuestario),
        }),
        ...(requiere_factura !== undefined && {
          requiere_factura: Boolean(requiere_factura),
        }),
        ...(activo !== undefined && { activo: Boolean(activo) }),
      },
    });

    return NextResponse.json({ success: true, tipo: tipoActualizado });
  } catch (error: any) {
    console.error("Error updating process type:", error);
    return NextResponse.json(
      { error: error?.message || "Error al actualizar el tipo de proceso" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "ID de proceso requerido" }, { status: 400 });
    }

    await prisma.tipos_tramite.update({
      where: { id_tipo_tramite: Number(id) },
      data: { activo: false },
    });

    return NextResponse.json({ success: true, message: "Proceso desactivado con éxito" });
  } catch (error: any) {
    console.error("Error deactivating process type:", error);
    return NextResponse.json(
      { error: error?.message || "Error al desactivar el tipo de proceso" },
      { status: 500 }
    );
  }
}
