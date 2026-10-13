import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthenticatedUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const currentUser = await getAuthenticatedUser(request);
    if (!currentUser) {
      return NextResponse.json({ error: "Sesión no autorizada" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const disponibles = searchParams.get("disponibles") === "true";
    const estado = searchParams.get("estado"); // "ABIERTA" | "ARCHIVADA" | "TODAS"

    // Si se piden los trámites PAGADOS disponibles para asignar a cajas
    if (disponibles) {
      const tramitesDisponibles = await prisma.tramites.findMany({
        where: {
          estado_general: "PAGADO",
          id_caja: null,
        },
        include: {
          tipos_tramite: true,
          areas: true,
        },
        orderBy: {
          fecha_pago: "desc",
        },
      });

      return NextResponse.json({ tramites: tramitesDisponibles });
    }

    // Listado de Cajas
    const whereClause: any = {};
    if (estado && estado !== "TODAS") {
      whereClause.estado = estado;
    }

    const cajas = await prisma.cajas.findMany({
      where: whereClause,
      include: {
        tramites: {
          select: {
            id_tramite: true,
            codigo_tramite: true,
            numero_quipux: true,
            proveedor_beneficiario: true,
            asunto: true,
            monto_total: true,
            numero_hojas: true,
            fojas_fisicas: true,
            numero_cur_devengado: true,
            numero_cur_contable: true,
            numero_cur_compromiso: true,
            estado_general: true,
          },
        },
      },
      orderBy: {
        fecha_creacion: "desc",
      },
    });

    // Formatear métricas por caja
    const cajasFormateadas = cajas.map((c) => {
      const totalTramites = c.tramites.length;
      const totalHojas = c.tramites.reduce(
        (acc, t) => acc + (t.numero_hojas || t.fojas_fisicas || 1),
        0
      );
      const totalMonto = c.tramites.reduce(
        (acc, t) => acc + Number(t.monto_total || 0),
        0
      );

      return {
        ...c,
        total_tramites: totalTramites,
        total_hojas: totalHojas,
        total_monto: totalMonto,
      };
    });

    return NextResponse.json({ cajas: cajasFormateadas });
  } catch (error: any) {
    console.error("Error en GET /api/cajas:", error);
    return NextResponse.json(
      { error: "Error al consultar las cajas físicas" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const currentUser = await getAuthenticatedUser(request);
    if (!currentUser) {
      return NextResponse.json({ error: "Sesión requerida" }, { status: 401 });
    }

    const body = await request.json();
    const { codigo_caja, nombre, observaciones } = body;

    if (!codigo_caja || !codigo_caja.trim()) {
      return NextResponse.json(
        { error: "Debe ingresar el código o nombre obligatorio de la caja (ej. Caja 1, Cartón 24)" },
        { status: 400 }
      );
    }

    const codigoLimpio = codigo_caja.trim();

    // Validar unicidad
    const existente = await prisma.cajas.findUnique({
      where: { codigo_caja: codigoLimpio },
    });

    if (existente) {
      return NextResponse.json(
        { error: `Ya existe una caja registrada con el nombre o código "${codigoLimpio}"` },
        { status: 400 }
      );
    }

    const nuevaCaja = await prisma.cajas.create({
      data: {
        codigo_caja: codigoLimpio,
        nombre: nombre?.trim() || null,
        observaciones: observaciones?.trim() || null,
        estado: "ABIERTA",
        id_usuario_creacion: currentUser.id_usuario,
        fecha_creacion: new Date(),
      },
    });

    return NextResponse.json({ caja: nuevaCaja, message: "Caja creada exitosamente" }, { status: 201 });
  } catch (error: any) {
    console.error("Error en POST /api/cajas:", error);
    return NextResponse.json(
      { error: "Error interno al crear la caja" },
      { status: 500 }
    );
  }
}
