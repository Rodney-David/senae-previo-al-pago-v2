import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { TramiteService } from "@/services/tramiteService";
import { calculateTramiteSLA } from "@/lib/slaCalculator";
import { getAuthenticatedUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const tipo = searchParams.get("tipo") || "todos";
    const search = searchParams.get("search") || "";

    // Obtener datos del usuario real autenticado
    const currentUser = await getAuthenticatedUser(request);
    if (!currentUser) {
      return NextResponse.json({ error: "No autorizado. Sesión requerida." }, { status: 401 });
    }

    const conditions: Record<string, any>[] = [];

    if (search.trim()) {
      conditions.push({
        OR: [
          { codigo_tramite: { contains: search.trim() } },
          { numero_quipux: { contains: search.trim() } },
          { proveedor_beneficiario: { contains: search.trim() } },
          { ruc_proveedor: { contains: search.trim() } },
          { numero_factura: { contains: search.trim() } },
          { area_requirente: { contains: search.trim() } },
          { ciudad: { contains: search.trim() } },
          { asunto: { contains: search.trim() } },
        ],
      });
    }

    // Filtros de Mi Escritorio (estrictamente adaptados al área y custodio)
    if (tipo !== "todos" && currentUser) {
      const userRole = (currentUser.rol || "").toUpperCase();
      const userArea = currentUser.id_area;

      if (tipo === "escritorio") {
        // En Mi Escritorio: estrictamente los trámites de mi área que tengo físicamente bajo mi custodia personal
        conditions.push({
          id_area_actual: userArea,
          id_custodio_actual: currentUser.id_usuario,
          NOT: {
            estado_general: { in: ["ARCHIVO", "FINALIZADO_ARCHIVADO", "ANULADO"] },
          },
        });
      } else if (tipo === "reasignados") {
        // Reasignados / Derivados: trámites dentro de mi misma área que están en manos de otros funcionarios de mi área
        conditions.push({
          id_area_actual: userArea,
          id_custodio_actual: { not: currentUser.id_usuario },
          NOT: {
            estado_general: { in: ["ARCHIVO", "FINALIZADO_ARCHIVADO", "ANULADO"] },
          },
        });
      } else if (tipo === "todos_area" || tipo === "area") {
        // Todos: la totalidad de los trámites activos que pertenecen a mi área institucional
        conditions.push({
          id_area_actual: userArea,
          NOT: {
            estado_general: { in: ["ARCHIVO", "FINALIZADO_ARCHIVADO", "ANULADO"] },
          },
        });
      } else if (tipo === "aprobacion") {
        // En Aprobación: trámites enviados a jefatura para visto bueno / revisión de jefatura (Presupuesto y Contabilidad)
        conditions.push({
          id_area_actual: userArea,
          sub_estado: {
            in: ["PENDIENTE_VISTO_BUENO_JEFE", "PENDIENTE_APROBACION_CONTABLE", "ENVIADO_A_JEFATURA"],
          },
          NOT: {
            estado_general: { in: ["ARCHIVO", "FINALIZADO_ARCHIVADO", "ANULADO"] },
          },
        });
      } else if (tipo === "observados") {
        // Observados: trámites con novedad u observación activa en mi área
        conditions.push({
          id_area_actual: userArea,
          OR: [
            { estado_general: "OBSERVADO" },
            { estado_general: "OBSERVADO_72H" },
            { esta_pausado: true },
          ],
        });
      } else if (tipo === "ingresados") {
        // Exclusivo para DFI / Secretaría: trámites en estado INGRESADO para despacho por lote
        conditions.push({ estado_general: "INGRESADO" });
      } else if (tipo === "caja") {
        // Trámites en caja en custodia de Tesorería o Archivo
        conditions.push({
          OR: [
            { estado_general: "CAJA" },
            { sub_estado: "EN_CAJA" },
            { id_caja: { not: null } },
          ],
        });
      }
    }

    const whereClause: Record<string, any> = conditions.length > 0 ? { AND: conditions } : {};

    // Consulta ordenada estrictamente por fecha_ultimo_movimiento DESC (prioridad por Última Novedad)
    const tramites = await prisma.tramites.findMany({
      where: whereClause,
      include: {
        areas: true,
        usuarios: true,
        tipos_tramite: true,
        caja: true,
      },
      orderBy: {
        fecha_ultimo_movimiento: "desc",
      },
    });

    // Calcular SLA para cada trámite
    const tramitesConSLA = await Promise.all(
      tramites.map(async (t) => {
        const sla = await calculateTramiteSLA(t);
        return {
          ...t,
          sla,
        };
      })
    );

    return NextResponse.json({ tramites: tramitesConSLA });
  } catch (error) {
    console.error("Error fetching tramites:", error);
    return NextResponse.json(
      { error: "Error al consultar los trámites" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const currentUser = await getAuthenticatedUser(request);
    if (!currentUser) {
      return NextResponse.json({ error: "No autorizado. Sesión requerida para registrar trámites." }, { status: 401 });
    }
    const currentUserId = currentUser.id_usuario;
    const userRole = (currentUser.rol || "").toUpperCase();
    const isDFIOrAdmin =
      currentUser.id_area === 1 ||
      ["DIRECTORA", "SECRETARIA", "DIRECTORA_FINANCIERA", "SECRETARIA_DFI"].includes(userRole) ||
      ["ADMIN", "ADMINISTRADOR"].includes(userRole);

    if (!isDFIOrAdmin) {
      return NextResponse.json(
        { error: "Permiso denegado. Solo personal de Dirección Financiera (DFI - Secretaría/Directora) o Administrador puede crear trámites." },
        { status: 403 }
      );
    }

    const body = await request.json();

    const {
      padre_gestion,
      tipo_gestion,
      numero_quipux,
      area_requirente,
      ciudad,
      asunto,
      fecha_memorando,
      fecha_recepcion_fisica,
      id_tipo_tramite,
      proveedor_beneficiario,
      ruc_proveedor,
      numero_juicio,
      numero_liquidacion,
      subtotal,
      comentarios,
    } = body;

    const padre = (padre_gestion || "PAGO").toUpperCase();
    const tipo = tipo_gestion || "PAGO";

    // Validaciones base obligatorias para todos
    if (!numero_quipux?.trim() || !id_tipo_tramite || !area_requirente?.trim() || !asunto?.trim()) {
      return NextResponse.json(
        { error: "Número Quipux, Área Requirente, Asunto y Tipo de Proceso son obligatorios." },
        { status: 400 }
      );
    }

    // Si es TIPO PAGO - PAGO: Proveedor y Subtotal son obligatorios (RUC es opcional según regla SENAE)
    const esPagoPago = padre === "PAGO" && tipo === "PAGO";
    if (esPagoPago) {
      if (!proveedor_beneficiario?.trim() || subtotal === undefined || subtotal === null || Number(subtotal) <= 0) {
        return NextResponse.json(
          { error: "Para trámites PAGO - PAGO es obligatorio registrar Razón Social/Proveedor y Subtotal mayor a 0." },
          { status: 400 }
        );
      }
    }

    const sub = subtotal ? Number(subtotal) : 0;

    const nuevoTramite = await TramiteService.crearTramite({
      padre_gestion: padre,
      tipo_gestion: tipo,
      numero_quipux: numero_quipux.trim(),
      area_requirente: area_requirente.trim(),
      ciudad: ciudad?.trim() || "GUAYAQUIL",
      asunto: asunto.trim(),
      fecha_memorando: fecha_memorando || new Date(),
      fecha_recepcion_fisica: fecha_recepcion_fisica || new Date(),
      id_tipo_tramite: Number(id_tipo_tramite),
      proveedor_beneficiario: proveedor_beneficiario?.trim() || "N/A",
      ruc_proveedor: ruc_proveedor?.trim() || null,
      numero_juicio: numero_juicio?.trim() || null,
      numero_liquidacion: numero_liquidacion?.trim() || null,
      subtotal: sub,
      id_usuario_creador: currentUserId,
      comentarios: comentarios?.trim() || "",
    });

    return NextResponse.json({ success: true, tramite: nuevoTramite }, { status: 201 });
  } catch (error: any) {
    console.error("Error creating tramite:", error);
    return NextResponse.json(
      { error: error?.message || "Error al crear el trámite en recepción" },
      { status: 500 }
    );
  }
}
