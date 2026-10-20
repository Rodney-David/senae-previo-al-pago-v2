import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const idTramite = searchParams.get("id_tramite");
    const tipoAccion = searchParams.get("tipo_accion");
    const idUsuario = searchParams.get("id_usuario");
    const idArea = searchParams.get("id_area");
    const fechaDesde = searchParams.get("fecha_desde");
    const fechaHasta = searchParams.get("fecha_hasta");
    const search = searchParams.get("search");
    const pageParam = searchParams.get("page");
    const limitParam = searchParams.get("limit");

    const page = Math.max(1, parseInt(pageParam || "1", 10) || 1);
    const rawLimit = parseInt(limitParam || "100", 10) || 100;
    const limit = Math.min(500, Math.max(1, rawLimit));
    const skip = (page - 1) * limit;

    const whereConditions: any[] = [];

    if (idTramite) {
      whereConditions.push({ id_tramite: Number(idTramite) });
    }

    if (tipoAccion && tipoAccion !== "TODAS" && tipoAccion !== "TODOS") {
      whereConditions.push({ tipo_accion: tipoAccion });
    }

    if (idUsuario && idUsuario !== "TODOS") {
      const uId = Number(idUsuario);
      if (!isNaN(uId)) {
        whereConditions.push({
          OR: [
            { id_usuario_entrega: uId },
            { id_usuario_recibe: uId },
          ],
        });
      }
    }

    if (idArea && idArea !== "TODAS" && idArea !== "TODOS") {
      const aId = Number(idArea);
      if (!isNaN(aId)) {
        whereConditions.push({
          OR: [
            { id_area_origen: aId },
            { id_area_destino: aId },
          ],
        });
      }
    }

    if (fechaDesde || fechaHasta) {
      const fechaFilter: Record<string, any> = {};
      if (fechaDesde) {
        fechaFilter.gte = new Date(fechaDesde);
      }
      if (fechaHasta) {
        const dHasta = new Date(fechaHasta);
        if (fechaHasta.length <= 10) {
          dHasta.setHours(23, 59, 59, 999);
        }
        fechaFilter.lte = dHasta;
      }
      whereConditions.push({ fecha_hora: fechaFilter });
    }

    if (search && search.trim()) {
      const term = search.trim();
      whereConditions.push({
        OR: [
          { comentarios: { contains: term } },
          { tipo_accion: { contains: term } },
          { tramites: { codigo_tramite: { contains: term } } },
          { tramites: { numero_quipux: { contains: term } } },
          { tramites: { proveedor_beneficiario: { contains: term } } },
          {
            usuarios_historial_movimientos_id_usuario_entregaTousuarios: {
              nombre_completo: { contains: term },
            },
          },
          {
            usuarios_historial_movimientos_id_usuario_recibeTousuarios: {
              nombre_completo: { contains: term },
            },
          },
        ],
      });
    }

    const whereClause = whereConditions.length > 0 ? { AND: whereConditions } : {};

    const [total, movimientos] = await Promise.all([
      prisma.historial_movimientos.count({ where: whereClause }),
      prisma.historial_movimientos.findMany({
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
        skip,
        take: limit,
      }),
    ]);

    const totalPages = Math.ceil(total / limit) || 1;

    return NextResponse.json({
      movimientos,
      data: movimientos,
      meta: {
        total,
        page,
        limit,
        totalPages,
      },
      total,
      totalPages,
      page,
      limit,
    });
  } catch (error: any) {
    console.error("Error fetching audit trail:", error);
    return NextResponse.json(
      { error: error?.message || "Error al consultar la auditoría institucional" },
      { status: 500 }
    );
  }
}
