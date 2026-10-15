import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthenticatedUser } from "@/lib/auth";
import { generarDocumentoCajaExcel } from "@/services/documentoCajaExcelService";

export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const currentUser = await getAuthenticatedUser(request);
    if (!currentUser) {
      return NextResponse.json({ error: "Sesión requerida" }, { status: 401 });
    }

    const userArea = currentUser.id_area;
    const userRole = (currentUser.rol || "").toUpperCase();
    const isAdmin = userRole === "ADMIN" || userRole === "ADMINISTRADOR";
    const isAdmCaja = userArea === 4 || userRole.includes("TESOR") || userRole.includes("CAJA") || isAdmin;

    if (!isAdmCaja) {
      return NextResponse.json(
        { error: "Acceso no autorizado. La generación y exportación del reporte oficial de caja es exclusiva para Administración de Caja." },
        { status: 403 }
      );
    }

    const idCaja = parseInt(params.id, 10);
    if (isNaN(idCaja)) {
      return NextResponse.json({ error: "ID de caja inválido" }, { status: 400 });
    }

    const caja = await prisma.cajas.findUnique({
      where: { id_caja: idCaja },
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
          },
          orderBy: {
            fecha_pago: "desc",
          },
        },
      },
    });

    if (!caja) {
      return NextResponse.json({ error: "Caja no encontrada" }, { status: 404 });
    }

    const excelBuffer = await generarDocumentoCajaExcel(caja as any);

    const safeCodigo = caja.codigo_caja.replace(/[^a-zA-Z0-9_-]/g, "_");
    const filename = `Documento_Control_Caja_${safeCodigo}.xlsx`;

    return new NextResponse(new Uint8Array(excelBuffer), {
      status: 200,
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (error: any) {
    console.error("Error en GET /api/cajas/[id]/exportar:", error);
    return NextResponse.json(
      { error: "Error al exportar documento de la caja" },
      { status: 500 }
    );
  }
}
