import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { registrarBitacora } from "@/services/bitacoraService";
import { getAuthenticatedUser } from "@/lib/auth";
import { calcularDiasPausaHabiles } from "@/lib/slaCalculator";

export const dynamic = "force-dynamic";

class HttpError extends Error {
  status: number;
  data?: any;
  constructor(status: number, message: string, data?: any) {
    super(message);
    this.name = "HttpError";
    this.status = status;
    this.data = data;
    Object.setPrototypeOf(this, HttpError.prototype);
  }
}

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

    const body = await request.json();
    const { accion, datos, comentarios } = body;
    const now = new Date();

    // ========================================================
    // TRANSACCIÓN ATÓMICA DE PRISMA PARA BLINDAJE DE FLUJO
    // ========================================================
    const result = await prisma.$transaction(async (tx) => {
      const tramite = await tx.tramites.findUnique({
        where: { id_tramite: idTramite },
      });
      if (!tramite) {
        throw new HttpError(404, "Trámite no encontrado");
      }

      // Si el trámite está INSUBSISTENTE, solo se permite revertir
      if (tramite.estado_general === "INSUBSISTENTE" && accion !== "REVERTIR_INSUBSISTENCIA") {
        throw new HttpError(
          400,
          "El trámite se encuentra INSUBSISTENTE. Su flujo está cortado. Solo se puede revertir la insubsistencia con la justificación obligatoria."
        );
      }

      // Si el trámite está ARCHIVADO, solo se permite desarchivar
      if (
        (tramite.estado_general === "ARCHIVO" || tramite.estado_general === "FINALIZADO_ARCHIVADO") &&
        accion !== "DESARCHIVAR_TRAMITE"
      ) {
        throw new HttpError(
          400,
          "El trámite se encuentra archivado. Para continuar su gestión debe ser desarchivado con justificación obligatoria."
        );
      }

      let tramiteActualizado;

      switch (accion) {
        // ==========================================
        // 1. SECRETARÍA -> PRESUPUESTO (Individual)
        // ==========================================
        case "ENTREGAR_A_CONTROL_PREVIO": {
          if (tramite.estado_general !== "INGRESADO") {
            throw new HttpError(
              400,
              `El trámite ya no está en estado INGRESADO (actual: ${tramite.estado_general})`
            );
          }

          const jefePresupuesto = await tx.usuarios.findFirst({
            where: { id_area: 2, rol: "JEFE", activo: true },
          });
          if (!jefePresupuesto) {
            throw new HttpError(
              503,
              "No se encontró un Jefe de Presupuesto activo en el sistema. Contacte al Administrador."
            );
          }
          const idJefe = jefePresupuesto.id_usuario;

          tramiteActualizado = await tx.tramites.update({
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

          await registrarBitacora(
            {
              id_tramite: idTramite,
              id_usuario_entrega: currentUserId,
              id_usuario_recibe: idJefe,
              id_area_origen: 1,
              id_area_destino: 2,
              tipo_accion: "ENTREGA_CONTROL_PREVIO",
              comentarios: `Expediente entregado físicamente a Control Previo (Presupuesto). Custodio asignado: Jefa de Presupuesto. En espera de recepción física. ${comentarios || ""}`,
            },
            tx
          );
          break;
        }

        case "RECIBIR_FISICAMENTE": {
          const userRole = (currentUser.rol || "").toUpperCase();
          const isPresupuestoOrAdmin = currentUser.id_area === 2 || ["ADMIN", "ADMINISTRADOR"].includes(userRole);
          if (!isPresupuestoOrAdmin) {
            throw new HttpError(
              403,
              "Solo personal de Presupuesto o Administrador puede dar recepción física al expediente"
            );
          }

          tramiteActualizado = await tx.tramites.update({
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

          await registrarBitacora(
            {
              id_tramite: idTramite,
              id_usuario_entrega: currentUserId,
              id_usuario_recibe: currentUserId,
              id_area_origen: 2,
              id_area_destino: 2,
              tipo_accion: "RECEPCION_FISICA_PRESUPUESTO",
              comentarios: `Expediente recibido físicamente en Presupuesto por ${currentUser.nombre_completo}. Inicia cómputo de SLA institucional. ${comentarios || ""}`,
            },
            tx
          );
          break;
        }

        // ==========================================
        // 2. FASE PRESUPUESTO (REVISION / REVISADO)
        // ==========================================
        case "ASIGNAR_ANALISTA_PRESUPUESTO": {
          const { id_analista } = datos || {};
          if (!id_analista) {
            throw new HttpError(400, "Debe seleccionar un analista de presupuesto");
          }

          const analista = await tx.usuarios.findUnique({
            where: { id_usuario: Number(id_analista) },
          });
          if (!analista || analista.id_area !== 2) {
            throw new HttpError(400, "El usuario seleccionado no pertenece al área de Presupuesto");
          }

          tramiteActualizado = await tx.tramites.update({
            where: { id_tramite: idTramite },
            data: {
              id_custodio_actual: analista.id_usuario,
              id_analista_presupuesto_previo: analista.id_usuario,
              sub_estado: "ASIGNADO_ANALISTA_PRESUPUESTO",
              fecha_ultimo_movimiento: now,
              fecha_ultima_modificacion: now,
            },
          });

          await registrarBitacora(
            {
              id_tramite: idTramite,
              id_usuario_entrega: currentUserId,
              id_usuario_recibe: analista.id_usuario,
              id_area_origen: 2,
              id_area_destino: 2,
              tipo_accion: "ASIGNACION_ANALISTA_PRESUPUESTO",
              comentarios: `Trámite asignado al analista de presupuesto: ${analista.nombre_completo}. ${comentarios || ""}`,
            },
            tx
          );
          break;
        }

        case "GUARDAR_DATOS_PRESUPUESTO": {
          const esAnalista = currentUser.id_area === 2 && currentUser.rol === "ANALISTA";

          tramiteActualizado = await tx.tramites.update({
            where: { id_tramite: idTramite },
            data: {
              certificacion_presupuestaria:
                datos?.certificacion_presupuestaria !== undefined
                  ? (datos.certificacion_presupuestaria ? String(datos.certificacion_presupuestaria).trim() : null)
                  : tramite.certificacion_presupuestaria,
              item_presupuestario:
                datos?.item_presupuestario !== undefined
                  ? (datos.item_presupuestario ? String(datos.item_presupuestario).trim() : null)
                  : tramite.item_presupuestario,
              numero_cur_compromiso:
                datos?.numero_cur_compromiso !== undefined
                  ? (datos.numero_cur_compromiso ? String(datos.numero_cur_compromiso).trim() : null)
                  : tramite.numero_cur_compromiso,
              nro_tramite:
                datos?.nro_tramite !== undefined
                  ? (datos.nro_tramite ? String(datos.nro_tramite).trim() : null)
                  : tramite.nro_tramite,
              numero_factura:
                datos?.numero_factura !== undefined
                  ? (datos.numero_factura ? String(datos.numero_factura).trim() : null)
                  : tramite.numero_factura,
              periodo_pago:
                datos?.periodo_pago !== undefined
                  ? (datos.periodo_pago ? String(datos.periodo_pago).trim() : null)
                  : tramite.periodo_pago,
              anexos:
                datos?.anexos !== undefined
                  ? (datos.anexos ? String(datos.anexos).trim() : null)
                  : tramite.anexos,
              ...(esAnalista && { id_analista_presupuesto_previo: currentUserId }),
              fecha_ultima_modificacion: now,
              fecha_ultimo_movimiento: now,
            },
          });

          await registrarBitacora(
            {
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
            },
            tx
          );
          break;
        }

        case "ENVIAR_A_JEFATURA_PRESUPUESTO": {
          const jefePresupuesto = await tx.usuarios.findFirst({
            where: { id_area: 2, rol: "JEFE", activo: true },
          });
          if (!jefePresupuesto) {
            throw new HttpError(
              503,
              "No se encontró un Jefe de Presupuesto activo para recibir el visto bueno."
            );
          }
          const idJefe = jefePresupuesto.id_usuario;

          tramiteActualizado = await tx.tramites.update({
            where: { id_tramite: idTramite },
            data: {
              id_custodio_actual: idJefe,
              id_analista_presupuesto_previo: currentUserId,
              sub_estado: "PENDIENTE_VISTO_BUENO_JEFE",
              ...(datos?.certificacion_presupuestaria !== undefined && {
                certificacion_presupuestaria: datos.certificacion_presupuestaria ? String(datos.certificacion_presupuestaria).trim() : null,
              }),
              ...(datos?.item_presupuestario !== undefined && {
                item_presupuestario: datos.item_presupuestario ? String(datos.item_presupuestario).trim() : null,
              }),
              ...(datos?.nro_tramite !== undefined && {
                nro_tramite: datos.nro_tramite ? String(datos.nro_tramite).trim() : null,
              }),
              ...(datos?.periodo_pago !== undefined && {
                periodo_pago: datos.periodo_pago ? String(datos.periodo_pago).trim() : null,
              }),
              ...(datos?.numero_cur_compromiso !== undefined && {
                numero_cur_compromiso: datos.numero_cur_compromiso ? String(datos.numero_cur_compromiso).trim() : null,
              }),
              ...(datos?.anexos !== undefined && {
                anexos: datos.anexos,
              }),
              ...(datos?.numero_factura !== undefined && {
                numero_factura: datos.numero_factura ? String(datos.numero_factura).trim() : null,
              }),
              fecha_ultimo_movimiento: now,
              fecha_ultima_modificacion: now,
            },
          });

          await registrarBitacora(
            {
              id_tramite: idTramite,
              id_usuario_entrega: currentUserId,
              id_usuario_recibe: idJefe,
              id_area_origen: 2,
              id_area_destino: 2,
              tipo_accion: "ENVIO_A_JEFATURA_PRESUPUESTO",
              comentarios: `Expediente remitido a la Jefa de Presupuesto para visto bueno y revisión final. ${comentarios || ""}`,
            },
            tx
          );
          break;
        }

        case "APROBAR_JEFE_PRESUPUESTO": {
          // Visto Bueno "Revisado"
          if (currentUser.rol !== "JEFE" && currentUser.rol !== "ADMIN") {
            throw new HttpError(
              403,
              "Solo la Jefa de Presupuesto puede otorgar el visto bueno REVISADO"
            );
          }

          // Determinar a qué custodio regresa (Reasignación Inteligente)
          let idCustodioDestino = currentUserId;

          if (datos?.id_analista_reasignado) {
            // Si la jefa eligió explícitamente a un analista
            idCustodioDestino = Number(datos.id_analista_reasignado);
          } else if (tramite.id_analista_presupuesto_previo) {
            // Verificar disponibilidad del analista que lo llenó previamente
            const analistaPrevio = await tx.usuarios.findUnique({
              where: { id_usuario: tramite.id_analista_presupuesto_previo },
            });

            if (analistaPrevio && analistaPrevio.activo && analistaPrevio.estado_disponibilidad === "DISPONIBLE") {
              idCustodioDestino = analistaPrevio.id_usuario;
            } else {
              // El analista está inactivo o de vacaciones/licencia
              if (!datos?.forzar_reasignacion_jefe) {
                const analistasDisponibles = await tx.usuarios.findMany({
                  where: {
                    id_area: 2,
                    rol: "ANALISTA",
                    activo: true,
                    estado_disponibilidad: "DISPONIBLE",
                  },
                });

                return {
                  requiere_reasignacion: true,
                  mensaje: `El analista previo (${analistaPrevio?.nombre_completo || "Asignado"}) se encuentra ${
                    analistaPrevio?.estado_disponibilidad || "NO DISPONIBLE"
                  }. Seleccione un analista activo disponible para continuar.`,
                  analistas_disponibles: analistasDisponibles,
                };
              }
            }
          }

          tramiteActualizado = await tx.tramites.update({
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

          await registrarBitacora(
            {
              id_tramite: idTramite,
              id_usuario_entrega: currentUserId,
              id_usuario_recibe: idCustodioDestino,
              id_area_origen: 2,
              id_area_destino: 2,
              tipo_accion: "VISTO_BUENO_REVISADO",
              comentarios: `Visto bueno formal otorgado por la Jefa de Presupuesto. Trámite pasa a estado REVISADO y queda bajo custodia del analista asignado (ID ${idCustodioDestino}). ${comentarios || ""}`,
            },
            tx
          );
          break;
        }

        // ==========================================
        // 3. CONTROL DE FACTURA (REVISADO <-> FACTURA)
        // ==========================================
        case "PAUSAR_ESPERA_FACTURA": {
          tramiteActualizado = await tx.tramites.update({
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

          await registrarBitacora(
            {
              id_tramite: idTramite,
              id_usuario_entrega: currentUserId,
              id_usuario_recibe: currentUserId,
              id_area_origen: tramite.id_area_actual,
              id_area_destino: tramite.id_area_actual,
              tipo_accion: "PAUSA_FACTURA",
              comentarios: `Trámite pasa a estado FACTURA. Semáforo SLA congelado en espera de factura tributaria. Motivo: ${
                datos?.motivo || "En espera de emisión de factura"
              }`,
            },
            tx
          );
          break;
        }

        case "REANUDAR_FACTURA_RECIBIDA": {
          const { numero_factura, fecha_factura } = datos || {};
          if (!numero_factura?.trim()) {
            throw new HttpError(400, "Debe registrar el número de factura tributaria recibido");
          }

          // Calcular días hábiles de pausa transcurridos
          let diasPausa = 0;
          if (tramite.fecha_pausa) {
            const feriadosList = await tx.feriados.findMany({
              where: { activo: true },
              select: { fecha: true },
            });
            const feriadosSet = new Set(
              feriadosList.map((f: { fecha: Date | string }) =>
                f.fecha instanceof Date
                  ? f.fecha.toISOString().split("T")[0]
                  : String(f.fecha).split("T")[0]
              )
            );
            diasPausa = calcularDiasPausaHabiles(tramite.fecha_pausa, now, feriadosSet);
          }

          tramiteActualizado = await tx.tramites.update({
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

          await registrarBitacora(
            {
              id_tramite: idTramite,
              id_usuario_entrega: currentUserId,
              id_usuario_recibe: currentUserId,
              id_area_origen: tramite.id_area_actual,
              id_area_destino: tramite.id_area_actual,
              tipo_accion: "REANUDAR_FACTURA",
              comentarios: `Factura Nro. ${numero_factura} recibida y registrada. Estado restaurado a REVISADO. Semáforo SLA reactivado (+${diasPausa} días descontados).`,
            },
            tx
          );
          break;
        }

        case "DERIVAR_A_CONTABILIDAD": {
          // Valida que esté en REVISADO y tenga aprobación formal
          if (tramite.estado_general !== "REVISADO" || !tramite.aprobado_presupuesto) {
            throw new HttpError(
              400,
              "El trámite debe estar en estado REVISADO y contar con visto bueno de Presupuesto para despacharse a Contabilidad"
            );
          }

          const esGarantia =
            (tramite.padre_gestion || "").toUpperCase() === "GARANTIA" ||
            (tramite.tipo_flujo || "").toUpperCase() === "GARANTIA";
          const numFactura = datos?.numero_factura || tramite.numero_factura;

          if (!esGarantia && !numFactura) {
            const tipoTramite = await tx.tipos_tramite.findUnique({
              where: { id_tipo_tramite: tramite.id_tipo_tramite },
            });
            const noRequiere =
              tipoTramite?.requiere_factura === false ||
              ["EXPEDIENTE", "JUSTIFICACION"].includes((tramite.tipo_gestion || "").toUpperCase());
            if (!noRequiere) {
              throw new HttpError(
                400,
                "No se puede derivar a Contabilidad sin número de factura tributaria (SRI) para este tipo de trámite"
              );
            }
          }

          const contadorGeneral = await tx.usuarios.findFirst({
            where: { id_area: 3, rol: "JEFE", activo: true },
          });
          if (!contadorGeneral) {
            throw new HttpError(
              503,
              "No se encontró un Contador General activo en el área de Contabilidad."
            );
          }
          const idContador = contadorGeneral.id_usuario;

          tramiteActualizado = await tx.tramites.update({
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

          await registrarBitacora(
            {
              id_tramite: idTramite,
              id_usuario_entrega: currentUserId,
              id_usuario_recibe: idContador,
              id_area_origen: 2,
              id_area_destino: 3,
              tipo_accion: "DERIVACION_A_CONTABILIDAD",
              comentarios: `Expediente derivado a Contabilidad con Factura Nro: ${numFactura}. Custodio: Contador General. ${comentarios || ""}`,
            },
            tx
          );
          break;
        }

        // ==========================================
        // 4. FASE CONTABILIDAD
        // ==========================================
        case "ASIGNAR_ANALISTA_CONTABLE": {
          const { id_analista } = datos || {};
          if (!id_analista) {
            throw new HttpError(400, "Debe seleccionar un analista contable");
          }

          const analista = await tx.usuarios.findUnique({
            where: { id_usuario: Number(id_analista) },
          });
          if (!analista || analista.id_area !== 3) {
            throw new HttpError(400, "El usuario seleccionado no pertenece al área de Contabilidad");
          }

          tramiteActualizado = await tx.tramites.update({
            where: { id_tramite: idTramite },
            data: {
              id_custodio_actual: analista.id_usuario,
              sub_estado: "ASIGNADO_ANALISTA_CONTABILIDAD",
              fecha_ultimo_movimiento: now,
              fecha_ultima_modificacion: now,
            },
          });

          await registrarBitacora(
            {
              id_tramite: idTramite,
              id_usuario_entrega: currentUserId,
              id_usuario_recibe: analista.id_usuario,
              id_area_origen: 3,
              id_area_destino: 3,
              tipo_accion: "ASIGNACION_ANALISTA_CONTABLE",
              comentarios: `Trámite asignado al analista contable: ${analista.nombre_completo}. ${comentarios || ""}`,
            },
            tx
          );
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

          tramiteActualizado = await tx.tramites.update({
            where: { id_tramite: idTramite },
            data: {
              numero_cur_devengado: curDev,
              numero_cur_contable: curCont,
              fecha_ultima_modificacion: now,
              fecha_ultimo_movimiento: now,
            },
          });

          await registrarBitacora(
            {
              id_tramite: idTramite,
              id_usuario_entrega: currentUserId,
              id_usuario_recibe: currentUserId,
              id_area_origen: 3,
              id_area_destino: 3,
              tipo_accion: "REGISTRO_DATOS_CONTABILIDAD",
              comentarios: `Registro contable actualizado. CUR DEV: ${curDev || "N/A"} | CUR CON: ${
                curCont || "N/A"
              }. ${comentarios || ""}`,
            },
            tx
          );
          break;
        }

        case "ENVIAR_A_JEFATURA_CONTABILIDAD": {
          const curDevRaw = datos?.numero_cur_devengado;
          const curContRaw = datos?.numero_cur_contable;

          const curDev = Array.isArray(curDevRaw)
            ? curDevRaw.map((s) => String(s).trim()).filter(Boolean).join(", ")
            : (curDevRaw !== undefined ? (curDevRaw ? String(curDevRaw).trim() : null) : tramite.numero_cur_devengado);

          const curCont = Array.isArray(curContRaw)
            ? curContRaw.map((s) => String(s).trim()).filter(Boolean).join(", ")
            : (curContRaw !== undefined ? (curContRaw ? String(curContRaw).trim() : null) : tramite.numero_cur_contable);

          const contadorGeneral = await tx.usuarios.findFirst({
            where: { id_area: 3, rol: "JEFE", activo: true },
          });
          if (!contadorGeneral) {
            throw new HttpError(
              503,
              "No se encontró un Contador General activo para recibir el visto bueno."
            );
          }
          const idContador = contadorGeneral.id_usuario;

          tramiteActualizado = await tx.tramites.update({
            where: { id_tramite: idTramite },
            data: {
              id_custodio_actual: idContador,
              sub_estado: "PENDIENTE_VISTO_BUENO_JEFE",
              numero_cur_devengado: curDev,
              numero_cur_contable: curCont,
              fecha_ultimo_movimiento: now,
              fecha_ultima_modificacion: now,
            },
          });

          await registrarBitacora(
            {
              id_tramite: idTramite,
              id_usuario_entrega: currentUserId,
              id_usuario_recibe: idContador,
              id_area_origen: 3,
              id_area_destino: 3,
              tipo_accion: "ENVIO_A_JEFATURA_CONTABILIDAD",
              comentarios: `Expediente contable remitido al Contador General para revisión y visto bueno de devengado por ${currentUser.nombre_completo}. CUR DEV: ${curDev || "N/A"} | CUR CON: ${curCont || "N/A"}. ${comentarios || ""}`,
            },
            tx
          );
          break;
        }

        case "APROBAR_Y_DERIVAR_A_DFI":
        case "DERIVAR_A_DFI_PAGO": {
          if (currentUser.rol !== "JEFE" && currentUser.rol !== "ADMIN") {
            throw new HttpError(
              403,
              "Solo el Contador General puede aprobar formalmente y derivar a Dirección Financiera"
            );
          }

          const directora = await tx.usuarios.findFirst({
            where: { rol: "DIRECTORA", activo: true },
          });
          if (!directora) {
            throw new HttpError(
              503,
              "No se encontró la Directora Financiera activa para la derivación a DFI."
            );
          }
          const idDirectora = directora.id_usuario;

          tramiteActualizado = await tx.tramites.update({
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

          await registrarBitacora(
            {
              id_tramite: idTramite,
              id_usuario_entrega: currentUserId,
              id_usuario_recibe: idDirectora,
              id_area_origen: 3,
              id_area_destino: 1,
              tipo_accion: "APROBACION_Y_DERIVACION_DFI",
              comentarios: `Expediente aprobado por Contador General y derivado a la Directora Financiera para autorización. ${comentarios || ""}`,
            },
            tx
          );
          break;
        }

        // ==========================================
        // 5. DIRECCIÓN FINANCIERA (DFI) Y TESORERÍA
        // ==========================================
        case "AUTORIZAR_Y_DERIVAR_A_TESORERIA":
        case "AUTORIZAR_PAGO_DFI": {
          if (currentUser.rol !== "DIRECTORA" && currentUser.rol !== "ADMIN") {
            throw new HttpError(
              403,
              "Únicamente la Directora Financiera tiene facultad legal para autorizar el pago"
            );
          }

          const tesorero = await tx.usuarios.findFirst({
            where: { id_area: 4, rol: "JEFE", activo: true },
          });
          if (!tesorero) {
            throw new HttpError(
              503,
              "No se encontró un Tesorero activo para autorizar y recibir el expediente en Tesorería."
            );
          }
          const idTesorero = tesorero.id_usuario;

          tramiteActualizado = await tx.tramites.update({
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

          await registrarBitacora(
            {
              id_tramite: idTramite,
              id_usuario_entrega: currentUserId,
              id_usuario_recibe: idTesorero,
              id_area_origen: 1,
              id_area_destino: 4,
              tipo_accion: "AUTORIZACION_DFI_PASE_TESORERIA",
              comentarios: `Pago autorizado por la Directora Financiera. Expediente despachado a Tesorería/Caja. ${comentarios || ""}`,
            },
            tx
          );
          break;
        }

        // ==========================================
        // 6. TESORERÍA / CAJA -> ARCHIVO (PAGADO)
        // ==========================================
        case "PROGRAMAR_Y_PAGAR_MEF_BCE": {
          const { spi_bce_referencia, fecha_autorizacion_pago, fecha_pago, numero_hojas } = datos || {};

          const hojas =
            numero_hojas !== undefined && numero_hojas !== null && numero_hojas !== ""
              ? Number(numero_hojas)
              : tramite.numero_hojas || null;

          const fAut = fecha_autorizacion_pago ? new Date(fecha_autorizacion_pago) : tramite.fecha_autorizacion_pago || null;
          const fPago = fecha_pago ? new Date(fecha_pago) : tramite.fecha_pago || null;

          const tieneAutorizacion = Boolean(fAut);
          const esEfectivamentePagado = Boolean(fPago);

          const nuevoEstado = esEfectivamentePagado
            ? "PAGADO"
            : tieneAutorizacion
            ? "AUTORIZADO_PAGO"
            : tramite.estado_general;

          const nuevoSubEstado = esEfectivamentePagado
            ? "PAGADO_EN_CUSTODIA_CAJA"
            : tieneAutorizacion
            ? "AUTORIZADO_PENDIENTE_PAGO"
            : tramite.sub_estado;

          const targetArea =
            currentUser.id_area === 5 || currentUser.id_area === 4
              ? currentUser.id_area
              : tramite.id_area_actual === 5
              ? 5
              : 4;

          tramiteActualizado = await tx.tramites.update({
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

          await registrarBitacora(
            {
              id_tramite: idTramite,
              id_usuario_entrega: currentUserId,
              id_usuario_recibe: currentUserId,
              id_area_origen: targetArea,
              id_area_destino: targetArea,
              tipo_accion: esEfectivamentePagado ? "PAGO_CONFIRMADO_ADM_CAJA" : "AUTORIZACION_PAGO_REGISTRADA",
              comentarios: esEfectivamentePagado
                ? `Pago efectivo confirmado en Tesorería / Cobranzas. Fecha pago: ${fPago?.toISOString().split("T")[0]}. Ref SPI-BCE: ${spi_bce_referencia || "Sin registrar"}. Hojas verificadas: ${hojas ?? "Sin registrar"}. ${comentarios || ""}`
                : `Datos de autorización guardados en Tesorería / Cobranzas (Fin SLA institucional). Pendiente de pago efectivo. Ref SPI-BCE: ${spi_bce_referencia || "Sin registrar"}. Hojas: ${hojas ?? "Sin registrar"}. ${comentarios || ""}`,
            },
            tx
          );
          break;
        }

        // ==========================================
        // 7. ARCHIVO CENTRAL (ARCHIVO)
        // ==========================================
        case "ARCHIVAR_DEFINITIVO": {
          const archivero = await tx.usuarios.findFirst({
            where: { id_area: 6, activo: true },
          });
          if (!archivero) {
            throw new HttpError(
              503,
              "No se encontró personal activo en Archivo Central para custodiar el expediente."
            );
          }
          const idArchivero = archivero.id_usuario;

          tramiteActualizado = await tx.tramites.update({
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

          await registrarBitacora(
            {
              id_tramite: idTramite,
              id_usuario_entrega: currentUserId,
              id_usuario_recibe: idArchivero,
              id_area_origen: tramite.id_area_actual,
              id_area_destino: 6,
              tipo_accion: "ARCHIVO_DEFINITIVO",
              comentarios: `Fin del ciclo. Trámite archivado definitivamente en Archivo Central. Caja: ${
                tramite.codigo_tomo_caja || "N/A"
              }. ${comentarios || ""}`,
            },
            tx
          );
          break;
        }

        // ==========================================
        // 8. ESTADOS TRANSVERSALES: OBSERVADO & INSUBSISTENTE
        // ==========================================
        case "OBSERVAR_TRAMITE": {
          const { motivo } = datos || {};
          if (!motivo?.trim()) {
            throw new HttpError(400, "Debe ingresar el motivo obligatorio de la observación");
          }

          tramiteActualizado = await tx.tramites.update({
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

          await registrarBitacora(
            {
              id_tramite: idTramite,
              id_usuario_entrega: currentUserId,
              id_usuario_recibe: currentUserId,
              id_area_origen: tramite.id_area_actual,
              id_area_destino: tramite.id_area_actual,
              tipo_accion: "OBSERVACION_TRANSVERSAL",
              comentarios: `Trámite OBSERVADO (Estado previo: ${tramite.estado_general}). Semáforo SLA congelado. Motivo: ${motivo.trim()}`,
            },
            tx
          );
          break;
        }

        case "LEVANTAR_OBSERVACION": {
          if (tramite.estado_general !== "OBSERVADO") {
            throw new HttpError(400, "El trámite no se encuentra en estado OBSERVADO");
          }

          const ultimaObservacion = await tx.historial_movimientos.findFirst({
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
          const nombreObservador =
            ultimaObservacion?.usuarios_historial_movimientos_id_usuario_entregaTousuarios?.nombre_completo ||
            "el usuario que observó";
          const isAdmin = ["ADMIN", "ADMINISTRADOR"].includes((currentUser.rol || "").toUpperCase());

          if (idUsuarioObservo && currentUserId !== idUsuarioObservo && !isAdmin) {
            throw new HttpError(
              403,
              `Solo ${nombreObservador} (quien reportó la observación) o un Administrador puede levantar formalmente la observación.`
            );
          }

          const { detalle_subsanacion } = datos || {};
          if (!detalle_subsanacion?.trim()) {
            throw new HttpError(400, "Debe ingresar el detalle de la resolución / subsanación");
          }

          let diasPausa = 0;
          if (tramite.fecha_pausa) {
            const feriadosList = await tx.feriados.findMany({
              where: { activo: true },
              select: { fecha: true },
            });
            const feriadosSet = new Set(
              feriadosList.map((f: { fecha: Date | string }) =>
                f.fecha instanceof Date
                  ? f.fecha.toISOString().split("T")[0]
                  : String(f.fecha).split("T")[0]
              )
            );
            diasPausa = calcularDiasPausaHabiles(tramite.fecha_pausa, now, feriadosSet);
          }

          const estadoRestaurado = tramite.estado_previo_observacion || "REVISION";

          tramiteActualizado = await tx.tramites.update({
            where: { id_tramite: idTramite },
            data: {
              estado_general: estadoRestaurado,
              sub_estado: `OBSERVACION_SUBSANADA_EN_${estadoRestaurado}`,
              detalle_subsanacion: detalle_subsanacion.trim(),
              esta_pausado: false,
              motivo_pausa: null,
              motivo_observacion: null,
              estado_previo_observacion: null,
              dias_pausa_acumulados: (tramite.dias_pausa_acumulados || 0) + diasPausa,
              fecha_ultimo_movimiento: now,
              fecha_ultima_modificacion: now,
            },
          });

          await registrarBitacora(
            {
              id_tramite: idTramite,
              id_usuario_entrega: currentUserId,
              id_usuario_recibe: currentUserId,
              id_area_origen: tramite.id_area_actual,
              id_area_destino: tramite.id_area_actual,
              tipo_accion: "LEVANTAR_OBSERVACION",
              comentarios: `Observación subsanada. Trámite restaurado a su estado previo: ${estadoRestaurado}. SLA reanudado (+${diasPausa} días de pausa). Detalle: ${detalle_subsanacion.trim()}`,
            },
            tx
          );
          break;
        }

        case "DECLARAR_INSUBSISTENTE": {
          const { justificacion } = datos || {};
          if (!justificacion?.trim()) {
            throw new HttpError(400, "Debe ingresar la justificación legal de la insubsistencia");
          }

          tramiteActualizado = await tx.tramites.update({
            where: { id_tramite: idTramite },
            data: {
              estado_previo_observacion: tramite.estado_general,
              estado_general: "INSUBSISTENTE",
              sub_estado: "ANULADO_POR_INSUBSISTENCIA",
              justificacion_insubsistencia: justificacion.trim(),
              esta_pausado: true,
              motivo_pausa: `Insubsistente: ${justificacion.trim()}`,
              fecha_ultimo_movimiento: now,
              fecha_ultima_modificacion: now,
            },
          });

          await registrarBitacora(
            {
              id_tramite: idTramite,
              id_usuario_entrega: currentUserId,
              id_usuario_recibe: currentUserId,
              id_area_origen: tramite.id_area_actual,
              id_area_destino: tramite.id_area_actual,
              tipo_accion: "DECLARAR_INSUBSISTENTE",
              comentarios: `Trámite declarado INSUBSISTENTE (Estado terminal por nulidad o invalidez insubsanable). Exento de SLA. Justificación: ${justificacion.trim()}`,
            },
            tx
          );
          break;
        }

        case "REVERTIR_INSUBSISTENCIA": {
          if (tramite.estado_general !== "INSUBSISTENTE") {
            throw new HttpError(400, "El trámite no se encuentra en estado INSUBSISTENTE");
          }

          const { justificacion } = datos || {};
          if (!justificacion?.trim()) {
            throw new HttpError(400, "Debe ingresar la justificación obligatoria para revertir la insubsistencia");
          }

          const ultimoInsubsistente = await tx.historial_movimientos.findFirst({
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
          const nombreDeclaro =
            ultimoInsubsistente?.usuarios_historial_movimientos_id_usuario_entregaTousuarios?.nombre_completo ||
            "el usuario que declaró la insubsistencia";
          const isAdmin = ["ADMIN", "ADMINISTRADOR"].includes((currentUser.rol || "").toUpperCase());

          if (idUsuarioDeclaro && currentUserId !== idUsuarioDeclaro && !isAdmin) {
            throw new HttpError(
              403,
              `Solo ${nombreDeclaro} o un Administrador puede revertir la declaratoria de insubsistencia.`
            );
          }

          const estadoRestaurado = tramite.estado_previo_observacion || "REVISION";

          tramiteActualizado = await tx.tramites.update({
            where: { id_tramite: idTramite },
            data: {
              estado_general: estadoRestaurado,
              sub_estado: `INSUBSISTENCIA_REVERTIDA_EN_${estadoRestaurado}`,
              esta_pausado: false,
              motivo_pausa: null,
              justificacion_insubsistencia: null,
              estado_previo_observacion: null,
              fecha_ultimo_movimiento: now,
              fecha_ultima_modificacion: now,
            },
          });

          await registrarBitacora(
            {
              id_tramite: idTramite,
              id_usuario_entrega: currentUserId,
              id_usuario_recibe: currentUserId,
              id_area_origen: tramite.id_area_actual,
              id_area_destino: tramite.id_area_actual,
              tipo_accion: "REVERSION_INSUBSISTENCIA",
              comentarios: `Insubsistencia revertida por ${currentUser.nombre_completo}. Expediente reactivado a estado ${estadoRestaurado}. Justificación: ${justificacion.trim()}`,
            },
            tx
          );
          break;
        }

        case "DEVOLUCION_FORMAL": {
          const { numero_quipux_devolucion, motivo_devolucion } = datos || {};
          if (!numero_quipux_devolucion?.trim() || !motivo_devolucion?.trim()) {
            throw new HttpError(
              400,
              "El Número Quipux de devolución y el motivo son obligatorios para la devolución formal"
            );
          }

          tramiteActualizado = await tx.tramites.update({
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

          await registrarBitacora(
            {
              id_tramite: idTramite,
              id_usuario_entrega: currentUserId,
              id_usuario_recibe: currentUserId,
              id_area_origen: tramite.id_area_actual,
              id_area_destino: 1,
              tipo_accion: "DEVOLUCION_FORMAL",
              comentarios: `Expediente devuelto formalmente. Memo Quipux Devolución: ${numero_quipux_devolucion.trim()}. Motivo: ${motivo_devolucion.trim()}. Exento de SLA. ${comentarios || ""}`,
            },
            tx
          );
          break;
        }

        case "DESARCHIVAR_TRAMITE": {
          const isArchivado = tramite.estado_general === "ARCHIVO" || tramite.estado_general === "FINALIZADO_ARCHIVADO";
          if (!isArchivado) {
            throw new HttpError(400, "El trámite no se encuentra en estado ARCHIVO");
          }

          const { justificacion_desarchivo } = datos || {};
          if (!justificacion_desarchivo?.trim()) {
            throw new HttpError(400, "Debe ingresar la justificación obligatoria para desarchivar el expediente");
          }

          const userRole = (currentUser.rol || "").toUpperCase();
          const canDesarchivar =
            currentUser.id_area === 6 || currentUser.id_area === 4 || ["ADMIN", "ADMINISTRADOR"].includes(userRole);
          if (!canDesarchivar) {
            throw new HttpError(
              403,
              "No tiene permisos para desarchivar este expediente institucional"
            );
          }

          tramiteActualizado = await tx.tramites.update({
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

          await registrarBitacora(
            {
              id_tramite: idTramite,
              id_usuario_entrega: currentUserId,
              id_usuario_recibe: currentUserId,
              id_area_origen: 6,
              id_area_destino: 4,
              tipo_accion: "DESARCHIVO_TRAMITE",
              comentarios: `Expediente desarchivado por ${currentUser.nombre_completo}. Devuelto a Tesorería para gestión activa. Justificación: ${justificacion_desarchivo.trim()}`,
            },
            tx
          );
          break;
        }

        // =============================================================
        // DERIVACIÓN GENERAL / REASIGNACIÓN LIBRE CON HARDENING DE RBAC
        // =============================================================
        case "DERIVAR_TRAMITE":
        case "REASIGNAR_ANALISTA": {
          const { id_usuario_destino, id_area_destino, motivo } = datos || {};
          if (!id_usuario_destino && !id_area_destino) {
            throw new HttpError(400, "Debe seleccionar el área o usuario destinatario");
          }

          let usuarioDestino = null;
          if (id_usuario_destino) {
            usuarioDestino = await tx.usuarios.findUnique({
              where: { id_usuario: Number(id_usuario_destino) },
            });
          }

          const areaDestinoId = id_area_destino
            ? Number(id_area_destino)
            : usuarioDestino?.id_area || tramite.id_area_actual;

          // Si cambia de área institucional, actualizar coherentemente estado_general y sub_estado
          let nuevoEstado = tramite.estado_general;
          let nuevoSubEstado = tramite.sub_estado;
          if (areaDestinoId !== tramite.id_area_actual) {
            if (areaDestinoId === 2) {
              nuevoEstado = "REVISION";
              nuevoSubEstado = "DERIVADO_A_PRESUPUESTO";
            } else if (areaDestinoId === 3) {
              nuevoEstado = "CONTABILIDAD";
              nuevoSubEstado = "DERIVADO_A_CONTABILIDAD";
            } else if (areaDestinoId === 4) {
              nuevoEstado = "DFI";
              nuevoSubEstado = "DERIVADO_A_TESORERIA";
            } else if (areaDestinoId === 1) {
              nuevoEstado = "DFI";
              nuevoSubEstado = "DERIVADO_A_DFI";
            } else if (areaDestinoId === 6) {
              nuevoEstado = "ARCHIVO";
              nuevoSubEstado = "DERIVADO_A_ARCHIVO";
            }
          }

          // Hardening de RBAC: Validar que no se permita mutar estado_general a "ARCHIVO" o "DFI"
          // arbitrariamente si el usuario no tiene permisos de Jefatura/Admin.
          const userRole = (currentUser.rol || "").toUpperCase();
          const esJefaturaOAdmin = ["JEFE", "DIRECTORA", "ADMIN", "ADMINISTRADOR"].includes(userRole);
          if ((nuevoEstado === "ARCHIVO" || nuevoEstado === "DFI") && !esJefaturaOAdmin) {
            throw new HttpError(
              403,
              `No tiene permisos de Jefatura o Administrador para derivar el trámite a ${nuevoEstado}.`
            );
          }

          tramiteActualizado = await tx.tramites.update({
            where: { id_tramite: idTramite },
            data: {
              id_area_actual: areaDestinoId,
              ...(usuarioDestino && { id_custodio_actual: usuarioDestino.id_usuario }),
              estado_general: nuevoEstado,
              sub_estado: nuevoSubEstado,
              fecha_ultimo_movimiento: now,
              fecha_ultima_modificacion: now,
            },
          });

          await registrarBitacora(
            {
              id_tramite: idTramite,
              id_usuario_entrega: currentUserId,
              id_usuario_recibe: usuarioDestino?.id_usuario || currentUserId,
              id_area_origen: tramite.id_area_actual,
              id_area_destino: areaDestinoId,
              tipo_accion: "DERIVACION_TRAMITE",
              comentarios: `Trámite derivado/reasignado a ${
                usuarioDestino ? usuarioDestino.nombre_completo : "Área " + areaDestinoId
              }. Motivo: ${motivo || comentarios || "Sin observaciones adicionales"}`,
            },
            tx
          );
          break;
        }

        // =============================================================
        // 9. ACCIONES DE DEVOLUCIÓN INTERNA (RUPTURA DE LIMBOS L-01, L-02, L-03)
        // =============================================================

        // L-01: La Jefa de Presupuesto devuelve el trámite al analista de presupuesto con observaciones.
        case "DEVOLVER_A_ANALISTA_PRESUPUESTO": {
          const userRole = (currentUser.rol || "").toUpperCase();
          const esJefaPresupuesto =
            (currentUser.id_area === 2 && userRole === "JEFE") || ["ADMIN", "ADMINISTRADOR"].includes(userRole);
          if (!esJefaPresupuesto) {
            throw new HttpError(
              403,
              "Solo la Jefa de Presupuesto o un Administrador puede devolver el trámite al analista de presupuesto."
            );
          }

          if (tramite.id_area_actual !== 2 || !["REVISION", "REVISADO"].includes(tramite.estado_general)) {
            throw new HttpError(
              400,
              "El trámite no se encuentra en la fase de Presupuesto para ser devuelto al analista."
            );
          }

          const observacionesTexto = (datos?.observaciones || datos?.motivo || comentarios || "").trim();
          if (!observacionesTexto) {
            throw new HttpError(
              400,
              "Debe ingresar las observaciones de la devolución al analista de presupuesto."
            );
          }

          let idAnalistaDestino = datos?.id_analista ? Number(datos.id_analista) : tramite.id_analista_presupuesto_previo;
          if (!idAnalistaDestino) {
            const primerAnalista = await tx.usuarios.findFirst({
              where: { id_area: 2, rol: "ANALISTA", activo: true },
            });
            if (primerAnalista) {
              idAnalistaDestino = primerAnalista.id_usuario;
            } else {
              throw new HttpError(400, "Debe especificar el analista de presupuesto al que se devuelve el trámite.");
            }
          }

          const analistaDestino = await tx.usuarios.findUnique({
            where: { id_usuario: idAnalistaDestino },
          });
          if (!analistaDestino || analistaDestino.id_area !== 2) {
            throw new HttpError(400, "El analista de destino seleccionado no pertenece al área de Presupuesto.");
          }

          tramiteActualizado = await tx.tramites.update({
            where: { id_tramite: idTramite },
            data: {
              estado_general: "REVISION",
              sub_estado: "EN_REVISION_PRESUPUESTO",
              aprobado_presupuesto: false,
              fecha_aprobacion_presupuesto: null,
              id_usuario_aprobador_presupuesto: null,
              id_custodio_actual: idAnalistaDestino,
              id_analista_presupuesto_previo: idAnalistaDestino,
              fecha_ultimo_movimiento: now,
              fecha_ultima_modificacion: now,
            },
          });

          await registrarBitacora(
            {
              id_tramite: idTramite,
              id_usuario_entrega: currentUserId,
              id_usuario_recibe: idAnalistaDestino,
              id_area_origen: 2,
              id_area_destino: 2,
              tipo_accion: "DEVOLUCION_A_ANALISTA_PRESUPUESTO",
              comentarios: `Trámite devuelto al analista de presupuesto (${analistaDestino.nombre_completo}) por Jefatura. Observaciones: ${observacionesTexto}`,
            },
            tx
          );
          break;
        }

        // L-02: El Contador General devuelve el devengado al analista contable con observaciones.
        case "DEVOLVER_A_ANALISTA_CONTABLE": {
          const userRole = (currentUser.rol || "").toUpperCase();
          const esContadorGeneral =
            (currentUser.id_area === 3 && userRole === "JEFE") || ["ADMIN", "ADMINISTRADOR"].includes(userRole);
          if (!esContadorGeneral) {
            throw new HttpError(
              403,
              "Solo el Contador General o un Administrador puede devolver el trámite al analista contable."
            );
          }

          if (tramite.id_area_actual !== 3 || tramite.estado_general !== "CONTABILIDAD") {
            throw new HttpError(
              400,
              "El trámite no se encuentra en la fase de Contabilidad para ser devuelto al analista contable."
            );
          }

          const observacionesTexto = (datos?.observaciones || datos?.motivo || comentarios || "").trim();
          if (!observacionesTexto) {
            throw new HttpError(
              400,
              "Debe ingresar las observaciones de la devolución al analista contable."
            );
          }

          let idAnalistaDestino = datos?.id_analista ? Number(datos.id_analista) : null;
          if (!idAnalistaDestino) {
            // Buscar el último analista contable que intervino en el trámite
            const ultimoMovimientoContable = await tx.historial_movimientos.findFirst({
              where: {
                id_tramite: idTramite,
                tipo_accion: {
                  in: [
                    "ASIGNACION_ANALISTA_CONTABLE",
                    "ENVIO_A_JEFATURA_CONTABILIDAD",
                    "REGISTRO_DATOS_CONTABILIDAD",
                  ],
                },
              },
              orderBy: { fecha_hora: "desc" },
            });

            if (ultimoMovimientoContable) {
              idAnalistaDestino =
                ultimoMovimientoContable.tipo_accion === "ASIGNACION_ANALISTA_CONTABLE"
                  ? ultimoMovimientoContable.id_usuario_recibe
                  : ultimoMovimientoContable.id_usuario_entrega;
            }
          }

          if (!idAnalistaDestino) {
            const primerAnalista = await tx.usuarios.findFirst({
              where: { id_area: 3, rol: "ANALISTA", activo: true },
            });
            if (primerAnalista) {
              idAnalistaDestino = primerAnalista.id_usuario;
            } else {
              throw new HttpError(400, "Debe especificar el analista contable al que se devuelve el trámite.");
            }
          }

          const analistaDestino = await tx.usuarios.findUnique({
            where: { id_usuario: idAnalistaDestino },
          });
          if (!analistaDestino || analistaDestino.id_area !== 3) {
            throw new HttpError(400, "El analista contable de destino seleccionado no pertenece al área de Contabilidad.");
          }

          tramiteActualizado = await tx.tramites.update({
            where: { id_tramite: idTramite },
            data: {
              estado_general: "CONTABILIDAD",
              sub_estado: "ASIGNADO_ANALISTA_CONTABILIDAD",
              aprobado_contabilidad: false,
              fecha_aprobacion_contabilidad: null,
              id_usuario_aprobador_contabilidad: null,
              id_custodio_actual: idAnalistaDestino,
              fecha_ultimo_movimiento: now,
              fecha_ultima_modificacion: now,
            },
          });

          await registrarBitacora(
            {
              id_tramite: idTramite,
              id_usuario_entrega: currentUserId,
              id_usuario_recibe: idAnalistaDestino,
              id_area_origen: 3,
              id_area_destino: 3,
              tipo_accion: "DEVOLUCION_A_ANALISTA_CONTABLE",
              comentarios: `Devengado devuelto al analista contable (${analistaDestino.nombre_completo}) por el Contador General. Observaciones: ${observacionesTexto}`,
            },
            tx
          );
          break;
        }

        // L-03: La Directora Financiera devuelve el trámite a Contabilidad si detecta inconsistencias antes de autorizar.
        case "DEVOLVER_A_CONTABILIDAD": {
          const userRole = (currentUser.rol || "").toUpperCase();
          const esDirectoraOAdmin = userRole === "DIRECTORA" || ["ADMIN", "ADMINISTRADOR"].includes(userRole);
          if (!esDirectoraOAdmin) {
            throw new HttpError(
              403,
              "Únicamente la Directora Financiera o un Administrador tiene facultad para devolver el trámite a Contabilidad."
            );
          }

          if (tramite.id_area_actual !== 1 && tramite.estado_general !== "DFI") {
            throw new HttpError(
              400,
              "El trámite no se encuentra en Dirección Financiera (DFI) para ser devuelto a Contabilidad."
            );
          }

          const observacionesTexto = (datos?.observaciones || datos?.motivo || comentarios || "").trim();
          if (!observacionesTexto) {
            throw new HttpError(
              400,
              "Debe ingresar las observaciones de la devolución a Contabilidad."
            );
          }

          const contadorGeneral = await tx.usuarios.findFirst({
            where: { id_area: 3, rol: "JEFE", activo: true },
          });
          if (!contadorGeneral) {
            throw new HttpError(503, "No se encontró un Contador General activo en Contabilidad para recibir el trámite.");
          }

          let subEstadoDestino = "PENDIENTE_VISTO_BUENO_JEFE";
          let idCustodioDestino = contadorGeneral.id_usuario;

          if (datos?.sub_estado === "ASIGNADO_ANALISTA_CONTABILIDAD" || datos?.id_analista) {
            subEstadoDestino = "ASIGNADO_ANALISTA_CONTABILIDAD";
            if (datos?.id_analista) {
              idCustodioDestino = Number(datos.id_analista);
            } else {
              // Buscar el último analista contable del trámite
              const ultimoAnalista = await tx.historial_movimientos.findFirst({
                where: {
                  id_tramite: idTramite,
                  tipo_accion: {
                    in: [
                      "ASIGNACION_ANALISTA_CONTABLE",
                      "ENVIO_A_JEFATURA_CONTABILIDAD",
                      "REGISTRO_DATOS_CONTABILIDAD",
                    ],
                  },
                },
                orderBy: { fecha_hora: "desc" },
              });
              if (ultimoAnalista) {
                idCustodioDestino =
                  ultimoAnalista.tipo_accion === "ASIGNACION_ANALISTA_CONTABLE"
                    ? ultimoAnalista.id_usuario_recibe
                    : ultimoAnalista.id_usuario_entrega;
              } else {
                const primerAnalista = await tx.usuarios.findFirst({
                  where: { id_area: 3, rol: "ANALISTA", activo: true },
                });
                if (primerAnalista) {
                  idCustodioDestino = primerAnalista.id_usuario;
                }
              }
            }
          }

          const custodioDestino = await tx.usuarios.findUnique({
            where: { id_usuario: idCustodioDestino },
          });
          if (!custodioDestino || custodioDestino.id_area !== 3) {
            throw new HttpError(400, "El custodio destinatario no pertenece al área de Contabilidad.");
          }

          tramiteActualizado = await tx.tramites.update({
            where: { id_tramite: idTramite },
            data: {
              id_area_actual: 3, // CONTABILIDAD
              id_custodio_actual: idCustodioDestino,
              estado_general: "CONTABILIDAD",
              sub_estado: subEstadoDestino,
              aprobado_contabilidad: false,
              fecha_aprobacion_contabilidad: null,
              id_usuario_aprobador_contabilidad: null,
              fecha_ultimo_movimiento: now,
              fecha_ultima_modificacion: now,
            },
          });

          await registrarBitacora(
            {
              id_tramite: idTramite,
              id_usuario_entrega: currentUserId,
              id_usuario_recibe: idCustodioDestino,
              id_area_origen: 1, // DFI
              id_area_destino: 3, // CONTABILIDAD
              tipo_accion: "DEVOLUCION_A_CONTABILIDAD",
              comentarios: `Trámite devuelto a Contabilidad por Dirección Financiera (${subEstadoDestino}). Observaciones: ${observacionesTexto}`,
            },
            tx
          );
          break;
        }

        default:
          throw new HttpError(400, "Acción no reconocida");
      }

      // Garantizar que tramiteActualizado nunca sea undefined
      if (!tramiteActualizado) {
        tramiteActualizado = await tx.tramites.findUnique({
          where: { id_tramite: idTramite },
          include: { areas: true, usuarios: true, tipos_tramite: true },
        });
      }

      return { tramite: tramiteActualizado };
    });

    if (result && "requiere_reasignacion" in result && result.requiere_reasignacion) {
      return NextResponse.json(result);
    }

    return NextResponse.json({ success: true, tramite: (result as any).tramite });
  } catch (error: any) {
    if (error instanceof HttpError || (error && typeof error.status === "number" && error.name === "HttpError")) {
      if (error.data) {
        return NextResponse.json({ error: error.message, ...error.data }, { status: error.status });
      }
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("Error executing flow action:", error);
    return NextResponse.json(
      { error: error?.message || "Error al procesar la acción del flujo" },
      { status: 500 }
    );
  }
}
