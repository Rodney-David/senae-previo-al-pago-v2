import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthenticatedUser } from "@/lib/auth";
import { invalidateSLAConfigCache } from "@/lib/slaCalculator";

export const dynamic = "force-dynamic";

// Valores por defecto normativos SENAE
const DEFAULT_SLA_CONFIG = {
  limite_dias: 6,
  punto_inicio: "RECEPCION_PRESUPUESTO", // RECEPCION_PRESUPUESTO | INGRESO_VENTANILLA | ENTREGA_CONTROL_PREVIO
  punto_fin: "AUTORIZACION_PAGO", // AUTORIZACION_PAGO | PAGO_EFECTIVO | APROBACION_CONTABILIDAD | ARCHIVO_CAJA
};

export async function GET(request: NextRequest) {
  try {
    const params = await prisma.parametros_sistema.findMany({
      where: {
        clave: {
          in: ["sla_limite_dias", "sla_punto_inicio", "sla_punto_fin"],
        },
      },
    });

    const configMap: Record<string, string> = {};
    params.forEach((p) => {
      configMap[p.clave] = p.valor;
    });

    const limiteDias = configMap["sla_limite_dias"]
      ? parseInt(configMap["sla_limite_dias"], 10)
      : DEFAULT_SLA_CONFIG.limite_dias;

    const puntoInicio =
      configMap["sla_punto_inicio"] || DEFAULT_SLA_CONFIG.punto_inicio;

    const puntoFin =
      configMap["sla_punto_fin"] || DEFAULT_SLA_CONFIG.punto_fin;

    return NextResponse.json({
      config: {
        limite_dias: isNaN(limiteDias) ? 6 : limiteDias,
        punto_inicio: puntoInicio,
        punto_fin: puntoFin,
      },
      defaults: DEFAULT_SLA_CONFIG,
    });
  } catch (error: any) {
    console.error("Error al obtener configuración SLA:", error);
    return NextResponse.json(
      { error: "Error al consultar la configuración del semáforo SLA", details: error.message },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const currentUser = await getAuthenticatedUser(request);
    if (!currentUser) {
      return NextResponse.json(
        { error: "No autorizado. Sesión requerida." },
        { status: 401 }
      );
    }

    const rol = (currentUser.rol || "").toUpperCase();
    if (!["ADMIN", "ADMINISTRADOR", "DIRECTORA", "DIRECTORA_FINANCIERA"].includes(rol)) {
      return NextResponse.json(
        { error: "Permiso denegado. Solo administradores pueden parametrizar el SLA institucional." },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { limite_dias, punto_inicio, punto_fin } = body;

    const numDias = parseInt(String(limite_dias), 10);
    if (isNaN(numDias) || numDias < 1 || numDias > 60) {
      return NextResponse.json(
        { error: "El límite de días del SLA debe ser un número entero entre 1 y 60 días." },
        { status: 400 }
      );
    }

    const puntosInicioValidos = [
      "RECEPCION_PRESUPUESTO",
      "INGRESO_VENTANILLA",
      "ENTREGA_CONTROL_PREVIO",
    ];
    if (!puntosInicioValidos.includes(punto_inicio)) {
      return NextResponse.json(
        { error: `Punto de inicio no válido. Debe ser uno de: ${puntosInicioValidos.join(", ")}` },
        { status: 400 }
      );
    }

    const puntosFinValidos = [
      "AUTORIZACION_PAGO",
      "PAGO_EFECTIVO",
      "APROBACION_CONTABILIDAD",
      "ARCHIVO_CAJA",
    ];
    if (!puntosFinValidos.includes(punto_fin)) {
      return NextResponse.json(
        { error: `Punto de término no válido. Debe ser uno de: ${puntosFinValidos.join(", ")}` },
        { status: 400 }
      );
    }

    // Actualizar o crear los 3 parámetros en parametros_sistema
    await prisma.$transaction([
      prisma.parametros_sistema.upsert({
        where: { clave: "sla_limite_dias" },
        update: {
          valor: String(numDias),
          descripcion: "Límite normativo de días hábiles del semáforo SLA",
          tipo_dato: "INTEGER",
          updated_at: new Date(),
        },
        create: {
          clave: "sla_limite_dias",
          valor: String(numDias),
          descripcion: "Límite normativo de días hábiles del semáforo SLA",
          tipo_dato: "INTEGER",
        },
      }),
      prisma.parametros_sistema.upsert({
        where: { clave: "sla_punto_inicio" },
        update: {
          valor: punto_inicio,
          descripcion: "Momento de inicio de conteo de días hábiles del SLA",
          tipo_dato: "STRING",
          updated_at: new Date(),
        },
        create: {
          clave: "sla_punto_inicio",
          valor: punto_inicio,
          descripcion: "Momento de inicio de conteo de días hábiles del SLA",
          tipo_dato: "STRING",
        },
      }),
      prisma.parametros_sistema.upsert({
        where: { clave: "sla_punto_fin" },
        update: {
          valor: punto_fin,
          descripcion: "Momento de finalización/muerte formal del conteo de SLA",
          tipo_dato: "STRING",
          updated_at: new Date(),
        },
        create: {
          clave: "sla_punto_fin",
          valor: punto_fin,
          descripcion: "Momento de finalización/muerte formal del conteo de SLA",
          tipo_dato: "STRING",
        },
      }),
    ]);

    invalidateSLAConfigCache();

    return NextResponse.json({
      success: true,
      message: `Semáforo SLA configurado con éxito (${numDias} días hábiles, inicio en ${punto_inicio}, fin en ${punto_fin}).`,
      config: {
        limite_dias: numDias,
        punto_inicio,
        punto_fin,
      },
    });
  } catch (error: any) {
    console.error("Error al actualizar configuración SLA:", error);
    return NextResponse.json(
      { error: "Error al guardar la configuración del SLA", details: error.message },
      { status: 500 }
    );
  }
}
