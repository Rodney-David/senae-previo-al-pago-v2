import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const usuarios = await prisma.usuarios.findMany({
      include: { areas: true },
      orderBy: { id_usuario: "asc" },
    });
    return NextResponse.json({ usuarios });
  } catch (error) {
    console.error("Error fetching users:", error);
    return NextResponse.json(
      { error: "Error al consultar los usuarios" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      nombre_completo,
      correo_institucional,
      email,
      cargo,
      rol,
      id_area,
      estado_disponibilidad,
    } = body;

    const correo = correo_institucional || email;

    if (!nombre_completo || !correo || !cargo || !rol || !id_area) {
      return NextResponse.json(
        { error: "Todos los campos obligatorios deben ser completados" },
        { status: 400 }
      );
    }

    const dispMap: Record<string, "DISPONIBLE" | "VACACIONES" | "PERMISO" | "INACTIVO"> = {
      ACTIVO: "DISPONIBLE",
      DISPONIBLE: "DISPONIBLE",
      VACACIONES: "VACACIONES",
      PERMISO: "PERMISO",
      INACTIVO: "INACTIVO",
    };

    const nuevoUsuario = await prisma.usuarios.create({
      data: {
        nombre_completo,
        correo_institucional: correo,
        cargo,
        rol: rol as any,
        id_area: Number(id_area),
        estado_disponibilidad: dispMap[estado_disponibilidad] || "DISPONIBLE",
        activo: true,
      },
      include: { areas: true },
    });

    return NextResponse.json({ success: true, usuario: nuevoUsuario }, { status: 201 });
  } catch (error: any) {
    console.error("Error creating user:", error);
    return NextResponse.json(
      { error: error?.message || "Error al crear el usuario" },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      id_usuario,
      nombre_completo,
      correo_institucional,
      email,
      cargo,
      rol,
      id_area,
      estado_disponibilidad,
      activo,
    } = body;

    if (!id_usuario) {
      return NextResponse.json({ error: "ID de usuario requerido" }, { status: 400 });
    }

    const dispMap: Record<string, "DISPONIBLE" | "VACACIONES" | "PERMISO" | "INACTIVO"> = {
      ACTIVO: "DISPONIBLE",
      DISPONIBLE: "DISPONIBLE",
      VACACIONES: "VACACIONES",
      PERMISO: "PERMISO",
      INACTIVO: "INACTIVO",
    };

    const correo = correo_institucional || email;

    const usuarioActualizado = await prisma.usuarios.update({
      where: { id_usuario: Number(id_usuario) },
      data: {
        ...(nombre_completo && { nombre_completo }),
        ...(correo && { correo_institucional: correo }),
        ...(cargo && { cargo }),
        ...(rol && { rol: rol as any }),
        ...(id_area && { id_area: Number(id_area) }),
        ...(estado_disponibilidad && {
          estado_disponibilidad: dispMap[estado_disponibilidad] || estado_disponibilidad,
        }),
        ...(activo !== undefined && { activo: Boolean(activo) }),
      },
      include: { areas: true },
    });

    return NextResponse.json({ success: true, usuario: usuarioActualizado });
  } catch (error: any) {
    console.error("Error updating user:", error);
    return NextResponse.json(
      { error: error?.message || "Error al actualizar el usuario" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "ID de usuario requerido" }, { status: 400 });
    }

    // Desactivar usuario
    await prisma.usuarios.update({
      where: { id_usuario: Number(id) },
      data: { activo: false, estado_disponibilidad: "INACTIVO" },
    });

    return NextResponse.json({ success: true, message: "Usuario desactivado correctamente" });
  } catch (error: any) {
    console.error("Error deactivating user:", error);
    return NextResponse.json(
      { error: error?.message || "Error al desactivar el usuario" },
      { status: 500 }
    );
  }
}
