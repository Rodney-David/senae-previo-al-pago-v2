import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { registrarBitacora } from "@/services/bitacoraService";
import { getAuthenticatedUser } from "@/lib/auth";

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

    const currentUser = await getAuthenticatedUser(request);
    if (!currentUser) {
      return NextResponse.json({ error: "No autorizado. Sesión inválida o expirada." }, { status: 401 });
    }
    const currentUserId = currentUser.id_usuario;

    const tramite = await prisma.tramites.findUnique({
      where: { id_tramite: idTramite },
    });
    if (!tramite) {
      return NextResponse.json({ error: "Trámite no encontrado" }, { status: 404 });
    }

    const body = await request.json();
    const { accion, datos, comentarios } = body;
    const now = new Date();

    // Si el trámite está INSUBSISTENTE, solo se permite revertir
    if (tramite.estado_general === "INSUBSISTENTE" && accion !== "REVERTIR_INSUBSISTENCIA") {
      return NextResponse.json(
        { error: "El trámite se encuentra INSUBSISTENTE. Su flujo está cortado. Solo se puede revertir la insubsistencia con la justificación obligatoria." },
        { status: 400 }
      );
    }

    // Si el trámite está ARCHIVADO, solo se permite desarchivar
    if ((tramite.estado_general === "ARCHIVO" || tramite.estado_general === "FINALIZADO_ARCHIVADO") && accion !== "DESARCHIVAR_TRAMITE") {
      return NextResponse.json(
        { error: "El trámite se encuentra archivado. Para continuar su gestión debe ser desarchivado con justificación obligatoria." },
        { status: 400 }
      );
    }

    let tramiteActualizado;

    switch (accion) {
      // ==========================================
      // 1. SECRETARÍA -> PRESUPUESTO (Individual)
      // ==========================================
      case "ENTREGAR_A_CONTROL_PREVIO": {
        if (tramite.estado_general !== "INGRESADO") {
          return NextResponse.json(
            { error: `El trámite ya no está en estado INGRESADO (actual: ${tramite.estado_general})` },
            { status: 400 }
          );
        }

        const jefePresupuesto = await prisma.usuarios.findFirst({
          where: { id_area: 2, rol: "JEFE", activo: true },
        });
        const idJefe = jefePresupuesto?.id_usuario || 3;

        tramiteActualizado = await prisma.tramites.update({
          where: { id_tramite: idTramite },
          data: {
            estado_general: "INGRESADO",
            sub_estado: "POR_RECIBIR_FISICAMENTE",
            id_area_actual: 2, // PRESUPUESTO
            id_custodio_actual: idJefe,
            fecha_entrega_control_previo: now,
            fecha_ultimo_movimiento: now,
            fecha_ultima_modificacion: now,
          },
        });

        await registrarBitacora({
          id_tramite: idTramite,
          id_usuario_entrega: currentUserId,
          id_usuario_recibe: idJefe,
          id_area_origen: 1,
          id_area_destino: 2,
          tipo_accion: "ENTREGA_CONTROL_PREVIO",
          comentarios: `Expediente entregado físicamente a Control Previo (Presupuesto). Custodio asignado: Jefa de Presupuesto. En espera de recepción física. ${comentarios || ""}`,
        });
        break;
      }

      case "RECIBIR_FISICAMENTE": {
        const userRole = (currentUser.rol || "").toUpperCase();
        const isPresupuestoOrAdmin = currentUser.id_area === 2 || ["ADMIN", "ADMINISTRADOR"].includes(userRole);
        if (!isPresupuestoOrAdmin) {
          return NextResponse.json(
            { error: "Solo personal de Presupuesto o Administrador puede dar recepción física al expediente" },
            { status: 403 }
          );
        }

        tramiteActualizado = await prisma.tramites.update({
          where: { id_tramite: idTramite },
          data: {
            estado_general: "REVISION",
            sub_estado: "RECIBIDO_EN_PRESUPUESTO",
            id_area_actual: 2,
            id_custodio_actual: currentUserId,
            fecha_recepcion_fisica: now,
            fecha_ultimo_movimiento: now,
            fecha_ultima_modificacion: now,
          },
        });

        await registrarBitacora({
          id_tramite: idTramite,
          id_usuario_entrega: currentUserId,
          id_usuario_recibe: currentUserId,
          id_area_origen: 2,
          id_area_destino: 2,
          tipo_accion: "RECEPCION_FISICA_PRESUPUESTO",
          comentarios: `Expediente recibido físicamente en Presupuesto por ${currentUser.nombre_completo}. Inicia cómputo de SLA institucional. ${comentarios || ""}`,
        });
        break;
      }

      // ==========================================
      // 2. FASE PRESUPUESTO (REVISION / REVISADO)
      // ==========================================
      case "ASIGNAR_ANALISTA_PRESUPUESTO": {
        const { id_analista } = datos || {};
        if (!id_analista) {
          return NextResponse.json({ error: "Debe seleccionar un analista de presupuesto" }, { status: 400 });
        }

        const analista = await prisma.usuarios.findUnique({
          where: { id_usuario: Number(id_analista) },
        });
        if (!analista || analista.id_area !== 2) {
          return NextResponse.json({ error: "El usuario seleccionado no pertenece al área de Presupuesto" }, { status: 400 });
        }

        tramiteActualizado = await prisma.tramites.update({
          where: { id_tramite: idTramite },
          data: {
            id_custodio_actual: analista.id_usuario,
            id_analista_presupuesto_previo: analista.id_usuario,
            sub_estado: `ASIGNADO_A_${analista.nombre_completo.toUpperCase().replace(/\s+/g, "_")}`,
            fecha_ultimo_movimiento: now,
            fecha_ultima_modificacion: now,
          },
        });

        await registrarBitacora({
          id_tramite: idTramite,
          id_usuario_entrega: currentUserId,
          id_usuario_recibe: analista.id_usuario,
          id_area_origen: 2,
          id_area_destino: 2,
          tipo_accion: "ASIGNACION_ANALISTA_PRESUPUESTO",
          comentarios: `Trámite asignado al analista de presupuesto: ${analista.nombre_completo}. ${comentarios || ""}`,
        });
        break;
      }

      case "GUARDAR_DATOS_PRESUPUESTO": {
        const esAnalista = currentUser.id_area === 2 && currentUser.rol === "ANALISTA";

        tramiteActualizado = await prisma.tramites.update({
          where: { id_tramite: idTramite },
          data: {
            certificacion_presupuestaria:
              datos?.certificacion_presupuestaria !== undefined ? (datos.certificacion_presupuestaria ? String(datos.certificacion_presupuestaria).trim() : null) : tramite.certificacion_presupuestaria,
            item_presupuestario:
              datos?.item_presupuestario !== undefined ? (datos.item_presupuestario ? String(datos.item_presupuestario).trim() : null) : tramite.item_presupuestario,
            numero_cur_compromiso:
              datos?.numero_cur_compromiso !== undefined
                ? (datos.numero_cur_compromiso ? String(datos.numero_cur_compromiso).trim() : null)
                : tramite.numero_cur_compromiso,
            nro_tramite:
              datos?.nro_tramite !== undefined ? (datos.nro_tramite ? String(datos.nro_tramite).trim() : null) : tramite.nro_tramite,
            numero_factura:
              datos?.numero_factura !== undefined ? (datos.numero_factura ? String(datos.numero_factura).trim() : null) : tramite.numero_factura,
            periodo_pago:
              datos?.periodo_pago !== undefined ? (datos.periodo_pago ? String(datos.periodo_pago).trim() : null) : tramite.periodo_pago,
            anexos: datos?.anexos !== undefined ? (datos.anexos ? String(datos.anexos).trim() : null) : tramite.anexos,
            ...(esAnalista && { id_analista_presupuesto_previo: currentUserId }),
            fecha_ultima_modificacion: now,
            fecha_ultimo_movimiento: now,
          },
        });

        await registrarBitacora({
          id_tramite: idTramite,
          id_usuario_entrega: currentUserId,
          id_usuario_recibe: currentUserId,
          id_area_origen: 2,
          id_area_destino: 2,
          tipo_accion: "REGISTRO_DATOS_PRESUPUESTO",
          comentarios: `Datos presupuestarios actualizados por ${currentUser.nombre_completo}. Nro / Cod Proceso: ${
            datos?.nro_tramite || tramite.nro_tramite || "N/A"
          }, Compromiso CUR: ${
            datos?.numero_cur_compromiso || tramite.numero_cur_compromiso || "N/A"
          }. ${comentarios || ""}`,
        });
        break;
      }

      case "ENVIAR_A_JEFATURA_PRESUPUESTO": {
        const jefePresupuesto = await prisma.usuarios.findFirst({
          where: { id_area: 2, rol: "JEFE", activo: true },
        });
        const idJefe = jefePresupuesto?.id_usuario || 3;

        tramiteActualizado = await prisma.tramites.update({
          where: { id_tramite: idTramite },
          data: {
            id_custodio_actual: idJefe,
            id_analista_presupuesto_previo: currentUserId,
            sub_estado: "PENDIENTE_VISTO_BUENO_JEFE",
            ...(datos?.numero_factura !== undefined && {
              numero_factura: datos.numero_factura ? String(datos.numero_factura).trim() : null,
            }),
            fecha_ultimo_movimiento: now,
            fecha_ultima_modificacion: now,
          },
        });

        await registrarBitacora({
          id_tramite: idTramite,
          id_usuario_entrega: currentUserId,
          id_usuario_recibe: idJefe,
          id_area_origen: 2,
          id_area_destino: 2,
          tipo_accion: "ENVIO_A_JEFATURA_PRESUPUESTO",
          comentarios: `Expediente remitido a la Jefa de Presupuesto para visto bueno y revisión final. ${comentarios || ""}`,
        });
        break;
      }

      case "APROBAR_JEFE_PRESUPUESTO": {
        // Visto Bueno "Revisado"
        if (currentUser.rol !== "JEFE" && currentUser.rol !== "ADMIN") {
          return NextResponse.json(
            { error: "Solo la Jefa de Presupuesto puede otorgar el visto bueno REVISADO" },
            { status: 403 }
          );
        }

        // Determinar a qué custodio regresa (Reasignación Inteligente)
        let idCustodioDestino = currentUserId;

        if (datos?.id_analista_reasignado) {
          // Si la jefa eligió explícitamente a un analista
          idCustodioDestino = Number(datos.id_analista_reasignado);
        } else if (tramite.id_analista_presupuesto_previo) {
          // Verificar disponibilidad del analista que lo llenó previamente
          const analistaPrevio = await prisma.usuarios.findUnique({
            where: { id_usuario: tramite.id_analista_presupuesto_previo },
          });

          if (analistaPrevio && analistaPrevio.activo && analistaPrevio.estado_disponibilidad === "DISPONIBLE") {
            idCustodioDestino = analistaPrevio.id_usuario;
          } else {
            // El analista está inactivo o de vacaciones/licencia
            // Si en la llamada no se envió reemplazo, avisamos para que el modal lo capture
            if (!datos?.forzar_reasignacion_jefe) {
              const analistasDisponibles = await prisma.usuarios.findMany({
                where: {
                  id_area: 2,
                  rol: "ANALISTA",
                  activo: true,
                  estado_disponibilidad: "DISPONIBLE",
                },
              });

              return NextResponse.json({
                requiere_reasignacion: true,
                mensaje: `El analista previo (${analistaPrevio?.nombre_completo || "Asignado"}) se encuentra ${
                  analistaPrevio?.estado_disponibilidad || "NO DISPONIBLE"
                }. Seleccione un analista activo disponible para continuar.`,
                analistas_disponibles: analistasDisponibles,
              });
            }
          }
        }

        tramiteActualizado = await prisma.tramites.update({
          where: { id_tramite: idTramite },
          data: {
            estado_general: "REVISADO",
            sub_estado: "VISTO_BUENO_REVISADO",
            aprobado_presupuesto: true,
            id_usuario_aprobador_presupuesto: currentUserId,
            fecha_aprobacion_presupuesto: now,
            id_custodio_actual: idCustodioDestino,
            fecha_ultima_modificacion: now,
            fecha_ultimo_movimiento: now,
          },
        });

        await registrarBitacora({
          id_tramite: idTramite,
          id_usuario_entrega: currentUserId,
          id_usuario_recibe: idCustodioDestino,
          id_area_origen: 2,
          id_area_destino: 2,
          tipo_accion: "VISTO_BUENO_REVISADO",
          comentarios: `Visto bueno formal otorgado por la Jefa de Presupuesto. Trámite pasa a estado REVISADO y queda bajo custodia del analista asignado (ID ${idCustodioDestino}). ${comentarios || ""}`,
        });
        break;
      }

      // ==========================================
      // 3. CONTROL DE FACTURA (REVISADO <-> FACTURA)
      // ==========================================
      case "PAUSAR_ESPERA_FACTURA": {
        tramiteActualizado = await prisma.tramites.update({
          where: { id_tramite: idTramite },
          data: {
            estado_general: "FACTURA",
            sub_estado: "ESPERA_FACTURA_TRIBUTARIA",
            esta_pausado: true,
            motivo_pausa: datos?.motivo || "En espera de factura tributaria del SRI",
            fecha_pausa: now,
            fecha_ultimo_movimiento: now,
            fecha_ultima_modificacion: now,
          },
        });

        await registrarBitacora({
          id_tramite: idTramite,
          id_usuario_entrega: currentUserId,
          id_usuario_recibe: currentUserId,
          id_area_origen: tramite.id_area_actual,
          id_area_destino: tramite.id_area_actual,
          tipo_accion: "PAUSA_FACTURA",
          comentarios: `Trámite pasa a estado FACTURA. Semáforo SLA congelado en espera de factura tributaria. Motivo: ${
            datos?.motivo || "En espera de emisión de factura"
          }`,
        });
        break;
      }

      case "REANUDAR_FACTURA_RECIBIDA": {
        const { numero_factura, fecha_factura } = datos || {};
        if (!numero_factura?.trim()) {
          return NextResponse.json({ error: "Debe registrar el número de factura tributaria recibido" }, { status: 400 });
        }

        // Calcular días de pausa transcurridos
        let diasPausa = 0;
        if (tramite.fecha_pausa) {
          const diffMs = now.getTime() - new Date(tramite.fecha_pausa).getTime();
          diasPausa = Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));
        }

        tramiteActualizado = await prisma.tramites.update({
          where: { id_tramite: idTramite },
          data: {
            estado_general: "REVISADO",
            sub_estado: "FACTURA_REGISTRADA_REVISADO",
            esta_pausado: false,
            motivo_pausa: null,
            dias_pausa_acumulados: (tramite.dias_pausa_acumulados || 0) + diasPausa,
            numero_factura: String(numero_factura).trim(),
            fecha_factura: fecha_factura ? new Date(fecha_factura) : now,
            fecha_ultimo_movimiento: now,
            fecha_ultima_modificacion: now,
          },
        });

        await registrarBitacora({
          id_tramite: idTramite,
          id_usuario_entrega: currentUserId,
          id_usuario_recibe: currentUserId,
          id_area_origen: tramite.id_area_actual,
          id_area_destino: tramite.id_area_actual,
          tipo_accion: "REANUDAR_FACTURA",
          comentarios: `Factura Nro. ${numero_factura} recibida y registrada. Estado restaurado a REVISADO. Semáforo SLA reactivado (+${diasPausa} días descontados).`,
        });
        break;
      }

      case "DERIVAR_A_CONTABILIDAD": {
        // Valida que esté en REVISADO y tenga factura
        if (tramite.estado_general !== "REVISADO" && !tramite.aprobado_presupuesto) {
          return NextResponse.json(
            { error: "El trámite debe estar en estado REVISADO para despacharse a Contabilidad" },
            { status: 400 }
          );
        }

        const esGarantia = (tramite.padre_gestion || "").toUpperCase() === "GARANTIA" || (tramite.tipo_flujo || "").toUpperCase() === "GARANTIA";
        const numFactura = datos?.numero_factura || tramite.numero_factura;

        if (!esGarantia && !numFactura) {
          const tipoTramite = await prisma.tipos_tramite.findUnique({
            where: { id_tipo_tramite: tramite.id_tipo_tramite },
          });
          const noRequiere = tipoTramite?.requiere_factura === false || ["EXPEDIENTE", "JUSTIFICACION"].includes((tramite.tipo_gestion || "").toUpperCase());
          if (!noRequiere) {
            return NextResponse.json(
              { error: "No se puede derivar a Contabilidad sin número de factura tributaria (SRI) para este tipo de trámite" },
              { status: 400 }
            );
          }
        }

        const contadorGeneral = await prisma.usuarios.findFirst({
          where: { id_area: 3, rol: "JEFE", activo: true },
        });
        const idContador = contadorGeneral?.id_usuario || 6;

        tramiteActualizado = await prisma.tramites.update({
          where: { id_tramite: idTramite },
          data: {
            id_area_actual: 3, // CONTABILIDAD
            id_custodio_actual: idContador,
            estado_general: "CONTABILIDAD",
            sub_estado: "RECEPCION_CONTADOR_GENERAL",
            numero_factura: numFactura,
            fecha_ultimo_movimiento: now,
            fecha_ultima_modificacion: now,
          },
        });

        await registrarBitacora({
          id_tramite: idTramite,
          id_usuario_entrega: currentUserId,
          id_usuario_recibe: idContador,
          id_area_origen: 2,
          id_area_destino: 3,
          tipo_accion: "DERIVACION_A_CONTABILIDAD",
          comentarios: `Expediente derivado a Contabilidad con Factura Nro: ${numFactura}. Custodio: Contador General. ${comentarios || ""}`,
        });
        break;
      }

      // ==========================================
      // 4. FASE CONTABILIDAD
      // ==========================================
      case "ASIGNAR_ANALISTA_CONTABLE": {
        const { id_analista } = datos || {};
        if (!id_analista) {
          return NextResponse.json({ error: "Debe seleccionar un analista contable" }, { status: 400 });
        }

        const analista = await prisma.usuarios.findUnique({
          where: { id_usuario: Number(id_analista) },
        });
        if (!analista || analista.id_area !== 3) {
          return NextResponse.json({ error: "El usuario seleccionado no pertenece al área de Contabilidad" }, { status: 400 });
        }

        tramiteActualizado = await prisma.tramites.update({
          where: { id_tramite: idTramite },
          data: {
            id_custodio_actual: analista.id_usuario,
            sub_estado: `ASIGNADO_A_${analista.nombre_completo.toUpperCase().replace(/\s+/g, "_")}`,
            fecha_ultimo_movimiento: now,
            fecha_ultima_modificacion: now,
          },
        });

        await registrarBitacora({
          id_tramite: idTramite,
          id_usuario_entrega: currentUserId,
          id_usuario_recibe: analista.id_usuario,
          id_area_origen: 3,
          id_area_destino: 3,
          tipo_accion: "ASIGNACION_ANALISTA_CONTABLE",
          comentarios: `Trámite asignado al analista contable: ${analista.nombre_completo}. ${comentarios || ""}`,
        });
        break;
      }

      case "GUARDAR_DATOS_CONTABILIDAD": {
        const curDevRaw = datos?.numero_cur_devengado;
        const curContRaw = datos?.numero_cur_contable;

        const curDev = Array.isArray(curDevRaw)
          ? curDevRaw.map((s) => String(s).trim()).filter(Boolean).join(", ")
          : (curDevRaw !== undefined ? (curDevRaw ? String(curDevRaw).trim() : null) : tramite.numero_cur_devengado);

        const curCont = Array.isArray(curContRaw)
          ? curContRaw.map((s) => String(s).trim()).filter(Boolean).join(", ")
          : (curContRaw !== undefined ? (curContRaw ? String(curContRaw).trim() : null) : tramite.numero_cur_contable);

        tramiteActualizado = await prisma.tramites.update({
          where: { id_tramite: idTramite },
          data: {
            numero_cur_devengado: curDev,
            numero_cur_contable: curCont,
            fecha_ultima_modificacion: now,
            fecha_ultimo_movimiento: now,
          },
        });

        await registrarBitacora({
          id_tramite: idTramite,
          id_usuario_entrega: currentUserId,
          id_usuario_recibe: currentUserId,
          id_area_origen: 3,
          id_area_destino: 3,
          tipo_accion: "REGISTRO_DATOS_CONTABILIDAD",
          comentarios: `Registro contable actualizado. CUR DEV: ${curDev || "N/A"} | CUR CON: ${
            curCont || "N/A"
          }. ${comentarios || ""}`,
        });
        break;
      }

      case "APROBAR_Y_DERIVAR_A_DFI":
      case "DERIVAR_A_DFI_PAGO": {
        if (currentUser.rol !== "JEFE" && currentUser.rol !== "ADMIN") {
          return NextResponse.json(
            { error: "Solo el Contador General puede aprobar formalmente y derivar a Dirección Financiera" },
            { status: 403 }
          );
        }

        const directora = await prisma.usuarios.findFirst({
          where: { rol: "DIRECTORA", activo: true },
        });
        const idDirectora = directora?.id_usuario || 1;

        tramiteActualizado = await prisma.tramites.update({
          where: { id_tramite: idTramite },
          data: {
            id_area_actual: 1, // DFI
            id_custodio_actual: idDirectora,
            estado_general: "DFI",
            sub_estado: "PENDIENTE_AUTORIZACION_DFI",
            aprobado_contabilidad: true,
            id_usuario_aprobador_contabilidad: currentUserId,
            fecha_aprobacion_contabilidad: now,
            fecha_ultimo_movimiento: now,
            fecha_ultima_modificacion: now,
          },
        });

        await registrarBitacora({
          id_tramite: idTramite,
          id_usuario_entrega: currentUserId,
          id_usuario_recibe: idDirectora,
          id_area_origen: 3,
          id_area_destino: 1,
          tipo_accion: "APROBACION_Y_DERIVACION_DFI",
          comentarios: `Expediente aprobado por Contador General y derivado a la Directora Financiera para autorización. ${comentarios || ""}`,
        });
        break;
      }

      // ==========================================
      // 5. DIRECCIÓN FINANCIERA (DFI) Y TESORERÍA
      // ==========================================
      case "AUTORIZAR_Y_DERIVAR_A_TESORERIA":
      case "AUTORIZAR_PAGO_DFI": {
        if (currentUser.rol !== "DIRECTORA" && currentUser.rol !== "ADMIN") {
          return NextResponse.json(
            { error: "Únicamente la Directora Financiera tiene facultad legal para autorizar el pago" },
            { status: 403 }
          );
        }

        const tesorero = await prisma.usuarios.findFirst({
          where: { id_area: 4, rol: "JEFE", activo: true },
        });
        const idTesorero = tesorero?.id_usuario || 8;

        // Según Sección 5 Paso 7: En Tesorería/Caja se mantiene en estado DFI hasta el pago
        tramiteActualizado = await prisma.tramites.update({
          where: { id_tramite: idTramite },
          data: {
            autorizado_pago: true,
            id_usuario_autoriza_pago: currentUserId,
            fecha_autorizacion_pago: now,
            id_area_actual: 4, // TESORERIA
            id_custodio_actual: idTesorero,
            estado_general: "DFI",
            sub_estado: "AUTORIZADO_EN_TESORERIA",
            fecha_ultimo_movimiento: now,
            fecha_ultima_modificacion: now,
          },
        });

        await registrarBitacora({
          id_tramite: idTramite,
          id_usuario_entrega: currentUserId,
          id_usuario_recibe: idTesorero,
          id_area_origen: 1,
          id_area_destino: 4,
          tipo_accion: "AUTORIZACION_DFI_PASE_TESORERIA",
          comentarios: `Pago autorizado por la Directora Financiera. Expediente despachado a Tesorería/Caja. ${comentarios || ""}`,
        });
        break;
      }

      // ==========================================
      // 6. TESORERÍA / CAJA -> ARCHIVO (PAGADO)
      // ==========================================
      case "PROGRAMAR_Y_PAGAR_MEF_BCE": {
        const { spi_bce_referencia, fecha_autorizacion_pago, fecha_pago, numero_hojas } = datos || {};

        const hojas = numero_hojas !== undefined && numero_hojas !== null && numero_hojas !== ""
          ? Number(numero_hojas)
          : (tramite.numero_hojas || null);

        // Sin fechas inventadas automaticas: respetar exactamente lo que ingresa el usuario o lo que ya existia
        const fAut = fecha_autorizacion_pago ? new Date(fecha_autorizacion_pago) : (tramite.fecha_autorizacion_pago || null);
        const fPago = fecha_pago ? new Date(fecha_pago) : (tramite.fecha_pago || null);

        const tieneAutorizacion = Boolean(fAut);
        const esEfectivamentePagado = Boolean(fPago);

        const nuevoEstado = esEfectivamentePagado
          ? "PAGADO"
          : (tieneAutorizacion ? "AUTORIZADO_PAGO" : tramite.estado_general);

        const nuevoSubEstado = esEfectivamentePagado
          ? "PAGADO_EN_CUSTODIA_CAJA"
          : (tieneAutorizacion ? "AUTORIZADO_PENDIENTE_PAGO" : tramite.sub_estado);

        const targetArea = (currentUser.id_area === 5 || currentUser.id_area === 4)
          ? currentUser.id_area
          : (tramite.id_area_actual === 5 ? 5 : 4);

        tramiteActualizado = await prisma.tramites.update({
          where: { id_tramite: idTramite },
          data: {
            spi_bce_referencia: spi_bce_referencia !== undefined ? spi_bce_referencia : tramite.spi_bce_referencia,
            fecha_pago: fPago,
            fecha_autorizacion_pago: fAut,
            autorizado_pago: tieneAutorizacion || Boolean(tramite.autorizado_pago),
            numero_hojas: hojas,
            id_area_actual: targetArea,
            id_custodio_actual: currentUserId,
            estado_general: nuevoEstado,
            sub_estado: nuevoSubEstado,
            fecha_ultimo_movimiento: now,
            fecha_ultima_modificacion: now,
          },
        });

        await registrarBitacora({
          id_tramite: idTramite,
          id_usuario_entrega: currentUserId,
          id_usuario_recibe: currentUserId,
          id_area_origen: targetArea,
          id_area_destino: targetArea,
          tipo_accion: esEfectivamentePagado ? "PAGO_CONFIRMADO_ADM_CAJA" : "AUTORIZACION_PAGO_REGISTRADA",
          comentarios: esEfectivamentePagado
            ? `Pago efectivo confirmado en Tesorería / Cobranzas. Fecha pago: ${fPago?.toISOString().split("T")[0]}. Ref SPI-BCE: ${spi_bce_referencia || "Sin registrar"}. Hojas verificadas: ${hojas ?? "Sin registrar"}. ${comentarios || ""}`
            : `Datos de autorización guardados en Tesorería / Cobranzas (Fin SLA institucional). Pendiente de pago efectivo. Ref SPI-BCE: ${spi_bce_referencia || "Sin registrar"}. Hojas: ${hojas ?? "Sin registrar"}. ${comentarios || ""}`,
        });
        break;
      }

      // ==========================================
      // 7. ARCHIVO CENTRAL (ARCHIVO)
      // ==========================================
      case "ARCHIVAR_DEFINITIVO": {
        const archivero = await prisma.usuarios.findFirst({
          where: { id_area: 6, activo: true },
        });
        const idArchivero = archivero?.id_usuario || 10;

        tramiteActualizado = await prisma.tramites.update({
          where: { id_tramite: idTramite },
          data: {
            id_area_actual: 6, // ARCHIVO
            id_custodio_actual: idArchivero,
            estado_general: "ARCHIVO",
            sub_estado: "ARCHIVADO_DEFINITIVO",
            fecha_ultimo_movimiento: now,
            fecha_ultima_modificacion: now,
          },
        });

        await registrarBitacora({
          id_tramite: idTramite,
          id_usuario_entrega: currentUserId,
          id_usuario_recibe: idArchivero,
          id_area_origen: tramite.id_area_actual,
          id_area_destino: 6,
          tipo_accion: "ARCHIVO_DEFINITIVO",
          comentarios: `Fin del ciclo. Trámite archivado definitivamente en Archivo Central. Caja: ${
            tramite.codigo_tomo_caja || "N/A"
          }. ${comentarios || ""}`,
        });
        break;
      }

      // ==========================================
      // 8. ESTADOS TRANSVERSALES: OBSERVADO & INSUBSISTENTE
      // ==========================================
      case "OBSERVAR_TRAMITE": {
        const { motivo } = datos || {};
        if (!motivo?.trim()) {
          return NextResponse.json({ error: "Debe ingresar el motivo obligatorio de la observación" }, { status: 400 });
        }

        // Guarda estado_previo_observacion, pasa a OBSERVADO y congela SLA
        tramiteActualizado = await prisma.tramites.update({
          where: { id_tramite: idTramite },
          data: {
            estado_previo_observacion: tramite.estado_general,
            estado_general: "OBSERVADO",
            sub_estado: "OBSERVACION_EXTERNA_72H",
            motivo_observacion: motivo.trim(),
            esta_pausado: true,
            motivo_pausa: `Observación externa: ${motivo.trim()}`,
            fecha_pausa: now,
            fecha_ultimo_movimiento: now,
            fecha_ultima_modificacion: now,
          },
        });

        await registrarBitacora({
          id_tramite: idTramite,
          id_usuario_entrega: currentUserId,
          id_usuario_recibe: currentUserId,
          id_area_origen: tramite.id_area_actual,
          id_area_destino: tramite.id_area_actual,
          tipo_accion: "OBSERVACION_TRANSVERSAL",
          comentarios: `Trámite OBSERVADO (Estado previo: ${tramite.estado_general}). Semáforo SLA congelado. Motivo: ${motivo.trim()}`,
        });
        break;
      }

      case "LEVANTAR_OBSERVACION": {
        if (tramite.estado_general !== "OBSERVADO") {
          return NextResponse.json({ error: "El trámite no se encuentra en estado OBSERVADO" }, { status: 400 });
        }

        // Buscar el usuario que reportó la última observación
        const ultimaObservacion = await prisma.historial_movimientos.findFirst({
          where: {
            id_tramite: idTramite,
            tipo_accion: "OBSERVACION_TRANSVERSAL",
          },
          orderBy: { fecha_hora: "desc" },
          include: {
            usuarios_historial_movimientos_id_usuario_entregaTousuarios: true,
          },
        });

        const idUsuarioObservo = ultimaObservacion?.id_usuario_entrega;
        const nombreObservador = ultimaObservacion?.usuarios_historial_movimientos_id_usuario_entregaTousuarios?.nombre_completo || "el usuario que observó";
        const isAdmin = ["ADMIN", "ADMINISTRADOR"].includes((currentUser.rol || "").toUpperCase());

        if (idUsuarioObservo && currentUserId !== idUsuarioObservo && !isAdmin) {
          return NextResponse.json(
            { error: `Solo ${nombreObservador} (quien reportó la observación) o un Administrador puede levantar formalmente la observación.` },
            { status: 403 }
          );
        }

        const { detalle_subsanacion } = datos || {};
        if (!detalle_subsanacion?.trim()) {
          return NextResponse.json({ error: "Debe ingresar el detalle de la resolución / subsanación" }, { status: 400 });
        }

        // Calcular días de pausa transcurridos
        let diasPausa = 0;
        if (tramite.fecha_pausa) {
          const diffMs = now.getTime() - new Date(tramite.fecha_pausa).getTime();
          diasPausa = Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));
        }

        const estadoRestaurado = tramite.estado_previo_observacion || "REVISION";

        tramiteActualizado = await prisma.tramites.update({
          where: { id_tramite: idTramite },
          data: {
            estado_general: estadoRestaurado,
            sub_estado: `OBSERVACION_SUBSANADA_EN_${estadoRestaurado}`,
            detalle_subsanacion: detalle_subsanacion.trim(),
            esta_pausado: false,
            motivo_pausa: null,
            dias_pausa_acumulados: (tramite.dias_pausa_acumulados || 0) + diasPausa,
            fecha_ultimo_movimiento: now,
            fecha_ultima_modificacion: now,
          },
        });

        await registrarBitacora({
          id_tramite: idTramite,
          id_usuario_entrega: currentUserId,
          id_usuario_recibe: currentUserId,
          id_area_origen: tramite.id_area_actual,
          id_area_destino: tramite.id_area_actual,
          tipo_accion: "LEVANTAR_OBSERVACION",
          comentarios: `Observación subsanada. Trámite restaurado a su estado previo: ${estadoRestaurado}. SLA reanudado (+${diasPausa} días de pausa). Detalle: ${detalle_subsanacion.trim()}`,
        });
        break;
      }

      case "DECLARAR_INSUBSISTENTE": {
        const { justificacion } = datos || {};
        if (!justificacion?.trim()) {
          return NextResponse.json({ error: "Debe ingresar la justificación legal de la insubsistencia" }, { status: 400 });
        }

        tramiteActualizado = await prisma.tramites.update({
          where: { id_tramite: idTramite },
          data: {
            estado_general: "INSUBSISTENTE",
            sub_estado: "ANULADO_POR_INSUBSISTENCIA",
            justificacion_insubsistencia: justificacion.trim(),
            esta_pausado: true,
            motivo_pausa: `Insubsistente: ${justificacion.trim()}`,
            fecha_ultimo_movimiento: now,
            fecha_ultima_modificacion: now,
          },
        });

        await registrarBitacora({
          id_tramite: idTramite,
          id_usuario_entrega: currentUserId,
          id_usuario_recibe: currentUserId,
          id_area_origen: tramite.id_area_actual,
          id_area_destino: tramite.id_area_actual,
          tipo_accion: "DECLARAR_INSUBSISTENTE",
          comentarios: `Trámite declarado INSUBSISTENTE (Estado terminal por nulidad o invalidez insubsanable). Exento de SLA. Justificación: ${justificacion.trim()}`,
        });
        break;
      }

      case "REVERTIR_INSUBSISTENCIA": {
        if (tramite.estado_general !== "INSUBSISTENTE") {
          return NextResponse.json({ error: "El trámite no se encuentra en estado INSUBSISTENTE" }, { status: 400 });
        }

        const { justificacion } = datos || {};
        if (!justificacion?.trim()) {
          return NextResponse.json({ error: "Debe ingresar la justificación obligatoria para revertir la insubsistencia" }, { status: 400 });
        }

        // Verificar quién declaró la insubsistencia
        const ultimoInsubsistente = await prisma.historial_movimientos.findFirst({
          where: {
            id_tramite: idTramite,
            tipo_accion: "DECLARAR_INSUBSISTENTE",
          },
          orderBy: { fecha_hora: "desc" },
          include: {
            usuarios_historial_movimientos_id_usuario_entregaTousuarios: true,
          },
        });

        const idUsuarioDeclaro = ultimoInsubsistente?.id_usuario_entrega;
        const nombreDeclaro = ultimoInsubsistente?.usuarios_historial_movimientos_id_usuario_entregaTousuarios?.nombre_completo || "el usuario que declaró la insubsistencia";
        const isAdmin = ["ADMIN", "ADMINISTRADOR"].includes((currentUser.rol || "").toUpperCase());

        if (idUsuarioDeclaro && currentUserId !== idUsuarioDeclaro && !isAdmin) {
          return NextResponse.json(
            { error: `Solo ${nombreDeclaro} o un Administrador puede revertir la declaratoria de insubsistencia.` },
            { status: 403 }
          );
        }

        const estadoRestaurado = tramite.estado_previo_observacion || "REVISION";

        tramiteActualizado = await prisma.tramites.update({
          where: { id_tramite: idTramite },
          data: {
            estado_general: estadoRestaurado,
            sub_estado: `INSUBSISTENCIA_REVERTIDA_EN_${estadoRestaurado}`,
            esta_pausado: false,
            motivo_pausa: null,
            justificacion_insubsistencia: null,
            fecha_ultimo_movimiento: now,
            fecha_ultima_modificacion: now,
          },
        });

        await registrarBitacora({
          id_tramite: idTramite,
          id_usuario_entrega: currentUserId,
          id_usuario_recibe: currentUserId,
          id_area_origen: tramite.id_area_actual,
          id_area_destino: tramite.id_area_actual,
          tipo_accion: "REVERSION_INSUBSISTENCIA",
          comentarios: `Insubsistencia revertida por ${currentUser.nombre_completo}. Expediente reactivado a estado ${estadoRestaurado}. Justificación: ${justificacion.trim()}`,
        });
        break;
      }

      case "DEVOLUCION_FORMAL": {
        const { numero_quipux_devolucion, motivo_devolucion } = datos || {};
        if (!numero_quipux_devolucion?.trim() || !motivo_devolucion?.trim()) {
          return NextResponse.json(
            { error: "El Número Quipux de devolución y el motivo son obligatorios para la devolución formal" },
            { status: 400 }
          );
        }

        tramiteActualizado = await prisma.tramites.update({
          where: { id_tramite: idTramite },
          data: {
            estado_general: "DEVUELTO",
            sub_estado: "DEVUELTO_FORMALMENTE",
            es_devuelto: true,
            motivo_devolucion: motivo_devolucion.trim(),
            id_area_actual: 1, // Devuelto a DFI / Ventanilla
            fecha_ultimo_movimiento: now,
            fecha_ultima_modificacion: now,
          },
        });

        await registrarBitacora({
          id_tramite: idTramite,
          id_usuario_entrega: currentUserId,
          id_usuario_recibe: currentUserId,
          id_area_origen: tramite.id_area_actual,
          id_area_destino: 1,
          tipo_accion: "DEVOLUCION_FORMAL",
          comentarios: `Expediente devuelto formalmente. Memo Quipux Devolución: ${numero_quipux_devolucion.trim()}. Motivo: ${motivo_devolucion.trim()}. Exento de SLA. ${comentarios || ""}`,
        });
        break;
      }

      case "DESARCHIVAR_TRAMITE": {
        const isArchivado = tramite.estado_general === "ARCHIVO" || tramite.estado_general === "FINALIZADO_ARCHIVADO";
        if (!isArchivado) {
          return NextResponse.json({ error: "El trámite no se encuentra en estado ARCHIVO" }, { status: 400 });
        }

        const { justificacion_desarchivo } = datos || {};
        if (!justificacion_desarchivo?.trim()) {
          return NextResponse.json({ error: "Debe ingresar la justificación obligatoria para desarchivar el expediente" }, { status: 400 });
        }

        const userRole = (currentUser.rol || "").toUpperCase();
        const canDesarchivar = currentUser.id_area === 6 || currentUser.id_area === 4 || ["ADMIN", "ADMINISTRADOR"].includes(userRole);
        if (!canDesarchivar) {
          return NextResponse.json(
            { error: "No tiene permisos para desarchivar este expediente institucional" },
            { status: 403 }
          );
        }

        tramiteActualizado = await prisma.tramites.update({
          where: { id_tramite: idTramite },
          data: {
            estado_general: "PAGADO",
            sub_estado: "DESARCHIVADO_EN_TRAMITE",
            id_area_actual: 4, // Regresa a Tesorería / Adm Caja
            id_custodio_actual: currentUserId,
            justificacion_desarchivo: justificacion_desarchivo.trim(),
            fecha_ultimo_movimiento: now,
            fecha_ultima_modificacion: now,
          },
        });

        await registrarBitacora({
          id_tramite: idTramite,
          id_usuario_entrega: currentUserId,
          id_usuario_recibe: currentUserId,
          id_area_origen: 6,
          id_area_destino: 4,
          tipo_accion: "DESARCHIVO_TRAMITE",
          comentarios: `Expediente desarchivado por ${currentUser.nombre_completo}. Devuelto a Tesorería para gestión activa. Justificación: ${justificacion_desarchivo.trim()}`,
        });
        break;
      }

      // Derivación general / Reasignación libre
      case "DERIVAR_TRAMITE":
      case "REASIGNAR_ANALISTA": {
        const { id_usuario_destino, id_area_destino, motivo } = datos || {};
        if (!id_usuario_destino && !id_area_destino) {
          return NextResponse.json({ error: "Debe seleccionar el área o usuario destinatario" }, { status: 400 });
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
