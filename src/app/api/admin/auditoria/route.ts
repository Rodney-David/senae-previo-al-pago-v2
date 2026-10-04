import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const idTramite = searchParams.get("id_tramite");
    const tipoAccion = searchParams.get("tipo_accion");
    const idUsuario = searchParams.get("id_usuario");
    const search = searchParams.get("search");

    const whereClause: Record<string, unknown> = {};

    if (idTramite) {
      whereClause.id_tramite = Number(idTramite);
    }

    if (tipoAccion && tipoAccion !== "TODAS") {
      whereClause.tipo_accion = tipoAccion;
    }

    if (idUsuario && idUsuario !== "TODOS") {
      whereClause.OR = [
        { id_usuario_entrega: Number(idUsuario) },
        { id_usuario_recibe: Number(idUsuario) },
      ];
    }

    if (search && search.trim()) {
      whereClause.comentarios = { contains: search.trim() };
    }

    const movimientos = await prisma.historial_movimientos.findMany({
      where: whereClause,
      include: {
        tramites: {
          select: {
            id_tramite: true,
            codigo_tramite: true,
            numero_quipux: true,
            proveedor_beneficiario: true,
          },
        },
        usuarios_historial_movimientos_id_usuario_entregaTousuarios: {
          select: { id_usuario: true, nombre_completo: true, cargo: true },
        },
        usuarios_historial_movimientos_id_usuario_recibeTousuarios: {
          select: { id_usuario: true, nombre_completo: true, cargo: true },
        },
        areas_historial_movimientos_id_area_origenToareas: {
          select: { id_area: true, nombre: true, codigo: true },
        },
        areas_historial_movimientos_id_area_destinoToareas: {
          select: { id_area: true, nombre: true, codigo: true },
        },
      },
      orderBy: { fecha_hora: "desc" },
      take: 200,
    });

    return NextResponse.json({ movimientos });
  } catch (error: any) {
    console.error("Error fetching audit trail:", error);
    return NextResponse.json(
      { error: error?.message || "Error al consultar la auditoría institucional" },
      { status: 500 }
    );
  }
}
