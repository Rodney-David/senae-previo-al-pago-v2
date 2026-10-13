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
          { asunto: { contains: search.trim() } },
        ],
      });
    }

    // Filtros de Mi Escritorio (estrictamente limitados a lo que le corresponde al usuario en su bandeja)
    if (tipo !== "todos" && currentUser) {
      const userRole = (currentUser.rol || "").toUpperCase();

      // Condición de pertenencia al escritorio/área del usuario (salvo ADMIN)
      if (userRole !== "ADMIN" && userRole !== "ADMINISTRADOR") {
        if (userRole === "JEFE" || userRole === "DIRECTORA") {
          conditions.push({
            OR: [
              { id_custodio_actual: currentUser.id_usuario },
              { id_area_actual: currentUser.id_area },
            ],
          });
        } else {
          // Analista / Secretaria
          conditions.push({
            id_custodio_actual: currentUser.id_usuario,
          });
        }
      }

      if (tipo === "ingresados") {
        // Exclusivo para DFI: trámites en estado INGRESADO para despacho por lote
        conditions.push({ estado_general: "INGRESADO" });
      } else if (tipo === "observados") {
        // Trámites observados o pausados en la bandeja del usuario
        conditions.push({
          OR: [
            { estado_general: "OBSERVADO" },
            { estado_general: "OBSERVADO_72H" },
            { esta_pausado: true },
          ],
        });
      } else if (tipo === "caja") {
        // Trámites en caja en la bandeja del usuario
        conditions.push({
          OR: [
            { estado_general: "CAJA" },
            { sub_estado: "EN_CAJA" },
            { id_caja: { not: null } },
          ],
        });
      } else {
        // tipo === "escritorio" ("En Mi Gestión")
        // Trámites activos en mi bandeja (no archivados ni anulados)
        conditions.push({
          NOT: {
            estado_general: { in: ["ARCHIVO", "FINALIZADO_ARCHIVADO", "ANULADO"] },
          },
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
      asunto,
      fecha_memorando,
      fecha_recepcion_fisica,
      id_tipo_tramite,
      proveedor_beneficiario,
      ruc_proveedor,
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

    // Si es TIPO PAGO - PAGO: Proveedor, RUC y Subtotal son OBLIGATORIOS
    const esPagoPago = padre === "PAGO" && tipo === "PAGO";
    if (esPagoPago) {
      if (!proveedor_beneficiario?.trim() || !ruc_proveedor?.trim() || subtotal === undefined || subtotal === null || Number(subtotal) <= 0) {
        return NextResponse.json(
          { error: "Para trámites PAGO - PAGO es obligatorio registrar Razón Social/Proveedor, RUC y Subtotal mayor a 0." },
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
      asunto: asunto.trim(),
      fecha_memorando: fecha_memorando || new Date(),
      fecha_recepcion_fisica: fecha_recepcion_fisica || new Date(),
      id_tipo_tramite: Number(id_tipo_tramite),
      proveedor_beneficiario: proveedor_beneficiario?.trim() || "N/A",
      ruc_proveedor: ruc_proveedor?.trim() || null,
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
