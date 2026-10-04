import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { registrarBitacora } from "@/services/bitacoraService";

export const dynamic = "force-dynamic";

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const idTramite = parseInt(params.id, 10);
    if (isNaN(idTramite)) {
      return NextResponse.json({ error: "ID de trámite inválido" }, { status: 400 });
    }

    const userIdCookie = request.cookies.get("senae_simulated_user_id")?.value;
    const currentUserId = userIdCookie ? parseInt(userIdCookie, 10) : 1;

    const currentUser = await prisma.usuarios.findUnique({
      where: { id_usuario: currentUserId },
    });
    if (!currentUser) {
      return NextResponse.json({ error: "Usuario activo no válido" }, { status: 401 });
    }

    const tramite = await prisma.tramites.findUnique({
      where: { id_tramite: idTramite },
    });
    if (!tramite) {
      return NextResponse.json({ error: "Trámite no encontrado" }, { status: 404 });
    }

    const body = await request.json();
    const { accion, datos, comentarios } = body;
    const now = new Date();

    let tramiteActualizado;

    switch (accion) {
      // 1. PRESUPUESTO
      case "GUARDAR_DATOS_PRESUPUESTO": {
        tramiteActualizado = await prisma.tramites.update({
          where: { id_tramite: idTramite },
          data: {
            certificacion_presupuestaria:
              datos?.certificacion_presupuestaria ?? tramite.certificacion_presupuestaria,
            item_presupuestario: datos?.item_presupuestario ?? tramite.item_presupuestario,
            numero_cur_compromiso:
              datos?.numero_cur_compromiso ?? tramite.numero_cur_compromiso,
            numero_factura: datos?.numero_factura ?? tramite.numero_factura,
            fecha_factura: datos?.fecha_factura
              ? new Date(datos.fecha_factura)
              : tramite.fecha_factura,
            anexos: datos?.anexos ?? tramite.anexos,
            fecha_ultima_modificacion: now,
            fecha_ultimo_movimiento: now,
          },
        });

        await registrarBitacora({
          id_tramite: idTramite,
          id_usuario_entrega: currentUserId,
          id_usuario_recibe: currentUserId,
          id_area_origen: tramite.id_area_actual,
          id_area_destino: tramite.id_area_actual,
          tipo_accion: "REGISTRO_DATOS_PRESUPUESTO",
          comentarios: `Datos presupuestarios actualizados. Compromiso CUR: ${
            datos?.numero_cur_compromiso || tramite.numero_cur_compromiso || "N/A"
          }. ${comentarios || ""}`,
        });
        break;
      }

      case "APROBAR_JEFE_PRESUPUESTO": {
        if (currentUser.rol !== "JEFE" && currentUser.rol !== "ADMIN") {
          return NextResponse.json(
            { error: "Solo el Jefe de Presupuesto puede emitir esta aprobación institucional" },
            { status: 403 }
          );
        }

        tramiteActualizado = await prisma.tramites.update({
          where: { id_tramite: idTramite },
          data: {
            aprobado_presupuesto: true,
            id_usuario_aprobador_presupuesto: currentUserId,
            fecha_aprobacion_presupuesto: now,
            sub_estado: "APROBADO_JEFE_PRESUPUESTO",
            fecha_ultima_modificacion: now,
            fecha_ultimo_movimiento: now,
          },
        });

        await registrarBitacora({
          id_tramite: idTramite,
          id_usuario_entrega: currentUserId,
          id_usuario_recibe: currentUserId,
          id_area_origen: tramite.id_area_actual,
          id_area_destino: tramite.id_area_actual,
          tipo_accion: "VISTO_BUENO_PRESUPUESTO",
          comentarios: `Aprobación de Jefatura de Presupuesto emitida formalmente. ${comentarios || ""}`,
        });
        break;
      }

      case "DERIVAR_A_CONTABILIDAD": {
        if (!tramite.aprobado_presupuesto) {
          return NextResponse.json(
            { error: "No se puede derivar a Contabilidad sin la aprobación obligatoria del Jefe de Presupuesto" },
            { status: 400 }
          );
        }
        if (!tramite.numero_factura && !datos?.numero_factura) {
          return NextResponse.json(
            { error: "El número de factura es obligatorio para despachar el trámite a Contabilidad" },
            { status: 400 }
          );
        }

        // Derivar a Contabilidad (Area 3), asignando al Contador General (id 6)
        tramiteActualizado = await prisma.tramites.update({
          where: { id_tramite: idTramite },
          data: {
            id_area_actual: 3, // CONTABILIDAD
            id_custodio_actual: 6, // Contador General
            estado_general: "EN_CONTABILIDAD",
            sub_estado: "RECEPCION_CONTADOR_GENERAL",
            fecha_ultimo_movimiento: now,
            fecha_ultima_modificacion: now,
          },
        });

        await registrarBitacora({
          id_tramite: idTramite,
          id_usuario_entrega: currentUserId,
          id_usuario_recibe: 6,
          id_area_origen: 2,
          id_area_destino: 3,
          tipo_accion: "DERIVACION_A_CONTABILIDAD",
          comentarios: `Expediente derivado a Contabilidad con Factura Nro: ${
            tramite.numero_factura || datos?.numero_factura
          }. ${comentarios || ""}`,
        });
        break;
      }

      // 2. CONTABILIDAD
      case "GUARDAR_DATOS_CONTABILIDAD": {
        // Consultar configuración del tipo de proceso
        const tipoProc = await prisma.tipos_tramite.findUnique({
          where: { id_tipo_tramite: tramite.id_tipo_tramite },
        });

        const curDev = datos?.numero_cur_devengado ?? tramite.numero_cur_devengado;
        const curCont = datos?.numero_cur_contable ?? tramite.numero_cur_contable;

        if (tipoProc?.tipo_cur_permitido === "CONTABLE" && !curCont) {
          return NextResponse.json(
            { error: `El proceso "${tipoProc.nombre}" requiere obligatoriamente el CUR Contable.` },
            { status: 400 }
          );
        }

        if (tipoProc?.tipo_cur_permitido === "DEVENGADO" && !curDev) {
          return NextResponse.json(
            { error: `El proceso "${tipoProc.nombre}" requiere obligatoriamente el CUR Devengado.` },
            { status: 400 }
          );
        }

        tramiteActualizado = await prisma.tramites.update({
          where: { id_tramite: idTramite },
          data: {
            numero_cur_devengado: curDev,
            numero_cur_contable: curCont,
            numero_liquidacion: datos?.numero_liquidacion ?? tramite.numero_liquidacion,
            numero_juicio: datos?.numero_juicio ?? tramite.numero_juicio,
            monto_retenciones:
              datos?.monto_retenciones !== undefined
                ? Number(datos.monto_retenciones)
                : tramite.monto_retenciones,
            monto_multas:
              datos?.monto_multas !== undefined
                ? Number(datos.monto_multas)
                : tramite.monto_multas,
            fecha_ultima_modificacion: now,
            fecha_ultimo_movimiento: now,
          },
        });

        await registrarBitacora({
          id_tramite: idTramite,
          id_usuario_entrega: currentUserId,
          id_usuario_recibe: currentUserId,
          id_area_origen: tramite.id_area_actual,
          id_area_destino: tramite.id_area_actual,
          tipo_accion: "REGISTRO_DATOS_CONTABILIDAD",
          comentarios: `Registro contable actualizado. CUR Devengado: ${
            curDev || "N/A"
          } | CUR Contable: ${curCont || "N/A"}. ${comentarios || ""}`,
        });
        break;
      }

      case "APROBAR_CONTADOR_GENERAL": {
        if (currentUser.rol !== "JEFE" && currentUser.rol !== "ADMIN") {
          return NextResponse.json(
            { error: "Solo el Contador General puede emitir esta aprobación contable" },
            { status: 403 }
          );
        }

        tramiteActualizado = await prisma.tramites.update({
          where: { id_tramite: idTramite },
          data: {
            aprobado_contabilidad: true,
            id_usuario_aprobador_contabilidad: currentUserId,
            fecha_aprobacion_contabilidad: now,
            sub_estado: "APROBADO_CONTADOR_GENERAL",
            fecha_ultima_modificacion: now,
            fecha_ultimo_movimiento: now,
          },
        });

        await registrarBitacora({
          id_tramite: idTramite,
          id_usuario_entrega: currentUserId,
          id_usuario_recibe: currentUserId,
          id_area_origen: tramite.id_area_actual,
          id_area_destino: tramite.id_area_actual,
          tipo_accion: "VISTO_BUENO_CONTABILIDAD",
          comentarios: `Aprobación del Contador General emitida formalmente. ${comentarios || ""}`,
        });
        break;
      }

      case "DERIVAR_A_DFI_PAGO": {
        if (!tramite.aprobado_contabilidad) {
          return NextResponse.json(
            { error: "No se puede derivar a DFI sin la aprobación obligatoria del Contador General" },
            { status: 400 }
          );
        }

        // Derivar a Dirección Financiera (Area 1), asignando a Directora Financiera (id 1)
        tramiteActualizado = await prisma.tramites.update({
          where: { id_tramite: idTramite },
          data: {
            id_area_actual: 1, // DFI
            id_custodio_actual: 1, // Directora Financiera
            estado_general: "EN_AUTORIZACION_DFI",
            sub_estado: "PENDIENTE_AUTORIZACION_PAGO",
            fecha_ultimo_movimiento: now,
            fecha_ultima_modificacion: now,
          },
        });

        await registrarBitacora({
          id_tramite: idTramite,
          id_usuario_entrega: currentUserId,
          id_usuario_recibe: 1,
          id_area_origen: 3,
          id_area_destino: 1,
          tipo_accion: "DERIVACION_A_DFI_PAGO",
          comentarios: `Expediente devengado remitido a la Directora Financiera para autorización de pago. ${
            comentarios || ""
          }`,
        });
        break;
      }

      // 3. DFI PAGO
      case "AUTORIZAR_PAGO_DFI": {
        if (currentUser.rol !== "DIRECTORA" && currentUser.rol !== "ADMIN") {
          return NextResponse.json(
            { error: "Únicamente la Directora Financiera tiene facultad legal para autorizar el pago" },
            { status: 403 }
          );
        }

        // Autoriza y deriva a Tesorería / Cobranzas (Area 4), asignando al Tesorero (id 8)
        tramiteActualizado = await prisma.tramites.update({
          where: { id_tramite: idTramite },
          data: {
            autorizado_pago: true,
            id_usuario_autoriza_pago: currentUserId,
            fecha_autorizacion_pago: now,
            id_area_actual: 4, // TESORERIA
            id_custodio_actual: 8, // Tesorero General
            estado_general: "PAGO_AUTORIZADO",
            sub_estado: "EN_TESORERIA_PROGRAMACION_MEF",
            fecha_ultimo_movimiento: now,
            fecha_ultima_modificacion: now,
          },
        });

        await registrarBitacora({
          id_tramite: idTramite,
          id_usuario_entrega: currentUserId,
          id_usuario_recibe: 8,
          id_area_origen: 1,
          id_area_destino: 4,
          tipo_accion: "AUTORIZACION_DE_PAGO",
          comentarios: `Pago autorizado por la Directora Financiera. Expediente derivado a Tesorería/Caja. ${
            comentarios || ""
          }`,
        });
        break;
      }

      // 4. TESORERIA Y COBRANZAS
      case "PROGRAMAR_Y_PAGAR_MEF_BCE": {
        const { lote_mef, spi_bce_referencia, comprobante_pago } = datos || {};
        if (!spi_bce_referencia && !comprobante_pago) {
          return NextResponse.json(
            { error: "Debe ingresar la referencia bancaria SPI Banco Central o comprobante de pago" },
            { status: 400 }
          );
        }

        // Paga y deriva a Archivo (Area 6), asignando al Custodio (id 10)
        tramiteActualizado = await prisma.tramites.update({
          where: { id_tramite: idTramite },
          data: {
            lote_mef: lote_mef ?? tramite.lote_mef,
            spi_bce_referencia: spi_bce_referencia ?? tramite.spi_bce_referencia,
            comprobante_pago: comprobante_pago ?? tramite.comprobante_pago,
            fecha_pago: now,
            id_area_actual: 6, // ARCHIVO
            id_custodio_actual: 10, // Custodio Archivo
            estado_general: "PAGADO_SPI_BCE",
            sub_estado: "PAGO_CONFIRMADO_DERIVADO_ARCHIVO",
            fecha_ultimo_movimiento: now,
            fecha_ultima_modificacion: now,
          },
        });

        await registrarBitacora({
          id_tramite: idTramite,
          id_usuario_entrega: currentUserId,
          id_usuario_recibe: 10,
          id_area_origen: 4,
          id_area_destino: 6,
          tipo_accion: "PAGO_MEF_BCE_CONFIRMADO",
          comentarios: `Transferencia SPI-BCE confirmada. Ref: ${spi_bce_referencia || "OK"}. Lote eSIGEF: ${
            lote_mef || "N/A"
          }. Expediente remitido a Archivo. ${comentarios || ""}`,
        });
        break;
      }

      // 5. ARCHIVO
      case "ARCHIVAR_DEFINITIVO": {
        const { fojas_fisicas, codigo_tomo_caja, estanteria, ubicacion_archivo } =
          datos || {};

        tramiteActualizado = await prisma.tramites.update({
          where: { id_tramite: idTramite },
          data: {
            fojas_fisicas: fojas_fisicas ? Number(fojas_fisicas) : tramite.fojas_fisicas,
            codigo_tomo_caja: codigo_tomo_caja ?? tramite.codigo_tomo_caja,
            estanteria: estanteria ?? tramite.estanteria,
            ubicacion_archivo:
              ubicacion_archivo ||
              `Tomo/Caja: ${codigo_tomo_caja || "T-1"} | Estante: ${estanteria || "E-1"}`,
            estado_general: "FINALIZADO_ARCHIVADO",
            sub_estado: "ARCHIVADO_DEFINITIVO",
            fecha_ultimo_movimiento: now,
            fecha_ultima_modificacion: now,
          },
        });

        await registrarBitacora({
          id_tramite: idTramite,
          id_usuario_entrega: currentUserId,
          id_usuario_recibe: currentUserId,
          id_area_origen: 6,
          id_area_destino: 6,
          tipo_accion: "ARCHIVO_DEFINITIVO",
          comentarios: `Ciclo del trámite finalizado y archivado. Fojas: ${
            fojas_fisicas || tramite.fojas_fisicas || 1
          }. Caja: ${codigo_tomo_caja || "N/A"}. Estante: ${estanteria || "N/A"}. ${
            comentarios || ""
          }`,
        });
        break;
      }

      // Derivar trámite interdepartamental o reasignar
      case "DERIVAR_TRAMITE":
      case "REASIGNAR_ANALISTA": {
        const { id_usuario_destino, id_area_destino, motivo } = datos || {};
        if (!id_usuario_destino && !id_area_destino) {
          return NextResponse.json(
            { error: "Debe seleccionar el área o usuario destinatario" },
            { status: 400 }
          );
        }

        let usuarioDestino = null;
        if (id_usuario_destino) {
          usuarioDestino = await prisma.usuarios.findUnique({
            where: { id_usuario: Number(id_usuario_destino) },
          });
        }

        const areaDestinoId = id_area_destino
          ? Number(id_area_destino)
          : usuarioDestino?.id_area || tramite.id_area_actual;

        tramiteActualizado = await prisma.tramites.update({
          where: { id_tramite: idTramite },
          data: {
            id_area_actual: areaDestinoId,
            ...(usuarioDestino && { id_custodio_actual: usuarioDestino.id_usuario }),
            fecha_ultimo_movimiento: now,
            fecha_ultima_modificacion: now,
          },
        });

        await registrarBitacora({
          id_tramite: idTramite,
          id_usuario_entrega: currentUserId,
          id_usuario_recibe: usuarioDestino?.id_usuario || currentUserId,
          id_area_origen: tramite.id_area_actual,
          id_area_destino: areaDestinoId,
          tipo_accion: "DERIVACION_TRAMITE",
          comentarios: `Trámite derivado/reasignado a ${
            usuarioDestino ? usuarioDestino.nombre_completo : "Área " + areaDestinoId
          }. Motivo: ${motivo || comentarios || "Sin observaciones adicionales"}`,
        });
        break;
      }

      default:
        return NextResponse.json({ error: "Acción no reconocida" }, { status: 400 });
    }

    return NextResponse.json({ success: true, tramite: tramiteActualizado });
  } catch (error: any) {
    console.error("Error executing flow action:", error);
    return NextResponse.json(
      { error: error?.message || "Error al procesar la acción del flujo" },
      { status: 500 }
    );
  }
}
