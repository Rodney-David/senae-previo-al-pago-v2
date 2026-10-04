import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { feriados_tipo } from "@prisma/client";

export const dynamic = "force-dynamic";

// Computus algorithm for Easter and movable holidays
function getMovableHolidaysEcuador(year: number) {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const L = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * L) / 451);
  const month = Math.floor((h + L - 7 * m + 114) / 31) - 1; // 0-indexed
  const day = ((h + L - 7 * m + 114) % 31) + 1;

  const easterSunday = new Date(Date.UTC(year, month, day));

  // Carnaval Lunes (Easter - 48 days)
  const carnavalLunes = new Date(easterSunday);
  carnavalLunes.setUTCDate(carnavalLunes.getUTCDate() - 48);

  // Carnaval Martes (Easter - 47 days)
  const carnavalMartes = new Date(easterSunday);
  carnavalMartes.setUTCDate(carnavalMartes.getUTCDate() - 47);

  // Viernes Santo (Easter - 2 days)
  const viernesSanto = new Date(easterSunday);
  viernesSanto.setUTCDate(viernesSanto.getUTCDate() - 2);

  return [
    { fecha: carnavalLunes, descripcion: "Carnaval (Lunes)", tipo: "NACIONAL" },
    { fecha: carnavalMartes, descripcion: "Carnaval (Martes)", tipo: "NACIONAL" },
    { fecha: viernesSanto, descripcion: "Viernes Santo", tipo: "NACIONAL" },
  ];
}

function getOfficialHolidaysEcuador(year: number) {
  const fixed = [
    { fecha: new Date(Date.UTC(year, 0, 1)), descripcion: "Año Nuevo", tipo: "NACIONAL" },
    { fecha: new Date(Date.UTC(year, 4, 1)), descripcion: "Día Internacional del Trabajo", tipo: "NACIONAL" },
    { fecha: new Date(Date.UTC(year, 4, 24)), descripcion: "Batalla de Pichincha", tipo: "NACIONAL" },
    { fecha: new Date(Date.UTC(year, 7, 10)), descripcion: "Primer Grito de Independencia", tipo: "NACIONAL" },
    { fecha: new Date(Date.UTC(year, 9, 9)), descripcion: "Independencia de Guayaquil", tipo: "NACIONAL" },
    { fecha: new Date(Date.UTC(year, 10, 2)), descripcion: "Día de los Difuntos", tipo: "NACIONAL" },
    { fecha: new Date(Date.UTC(year, 10, 3)), descripcion: "Independencia de Cuenca", tipo: "NACIONAL" },
    { fecha: new Date(Date.UTC(year, 11, 25)), descripcion: "Navidad", tipo: "NACIONAL" },
  ];

  const movable = getMovableHolidaysEcuador(year);
  return [...fixed, ...movable].sort((a, b) => a.fecha.getTime() - b.fecha.getTime());
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const anio = searchParams.get("anio");

    const feriados = await prisma.feriados.findMany({
      where: anio ? { anio: parseInt(anio, 10) } : undefined,
      orderBy: { fecha: "asc" },
    });
    return NextResponse.json({ feriados });
  } catch (error) {
    console.error("Error fetching holidays:", error);
    return NextResponse.json(
      { error: "Error al consultar los días no laborables" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { accion, anio, fecha, descripcion, tipo } = body;

    // Acción para auto-calcular feriados del año
    if (accion === "CALCULAR_ANIO") {
      const yearToCalc = parseInt(anio, 10) || new Date().getFullYear();
      const holidaysToInsert = getOfficialHolidaysEcuador(yearToCalc);

      let insertCount = 0;
      for (const h of holidaysToInsert) {
        // Verificar si ya existe para este año con fecha similar
        const startOfDay = new Date(h.fecha);
        startOfDay.setUTCHours(0, 0, 0, 0);
        const endOfDay = new Date(h.fecha);
        endOfDay.setUTCHours(23, 59, 59, 999);

        const exists = await prisma.feriados.findFirst({
          where: {
            fecha: {
              gte: startOfDay,
              lte: endOfDay,
            },
          },
        });

        if (!exists) {
          await prisma.feriados.create({
            data: {
              fecha: h.fecha,
              descripcion: h.descripcion,
              anio: yearToCalc,
              tipo: h.tipo as feriados_tipo,
              activo: true,
            },
          });
          insertCount++;
        }
      }

      return NextResponse.json({
        success: true,
        message: `Se calcularon y agregaron ${insertCount} feriados oficiales para el año ${yearToCalc}.`,
      });
    }

    if (!fecha || !descripcion) {
      return NextResponse.json(
        { error: "Fecha y descripción son obligatorios" },
        { status: 400 }
      );
    }

    const d = new Date(fecha);
    const nuevoFeriado = await prisma.feriados.create({
      data: {
        fecha: d,
        descripcion,
        anio: d.getFullYear(),
        tipo: (tipo as feriados_tipo) || "NACIONAL",
        activo: true,
      },
    });

    return NextResponse.json({ success: true, feriado: nuevoFeriado }, { status: 201 });
  } catch (error: any) {
    console.error("Error creating holiday:", error);
    return NextResponse.json(
      { error: error?.message || "Error al crear el día no laborable" },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id_feriado, fecha, descripcion, tipo, activo } = body;

    if (!id_feriado) {
      return NextResponse.json({ error: "ID de feriado requerido" }, { status: 400 });
    }

    const d = fecha ? new Date(fecha) : undefined;

    const feriadoActualizado = await prisma.feriados.update({
      where: { id_feriado: Number(id_feriado) },
      data: {
        ...(d && { fecha: d, anio: d.getFullYear() }),
        ...(descripcion && { descripcion }),
        ...(tipo && { tipo: tipo as feriados_tipo }),
        ...(activo !== undefined && { activo: Boolean(activo) }),
      },
    });

    return NextResponse.json({ success: true, feriado: feriadoActualizado });
  } catch (error: any) {
    console.error("Error updating holiday:", error);
    return NextResponse.json(
      { error: error?.message || "Error al modificar el feriado" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "ID de feriado requerido" }, { status: 400 });
    }

    await prisma.feriados.delete({
      where: { id_feriado: Number(id) },
    });

    return NextResponse.json({ success: true, message: "Feriado eliminado correctamente" });
  } catch (error: any) {
    console.error("Error deleting holiday:", error);
    return NextResponse.json(
      { error: error?.message || "Error al eliminar el feriado" },
      { status: 500 }
    );
  }
}
