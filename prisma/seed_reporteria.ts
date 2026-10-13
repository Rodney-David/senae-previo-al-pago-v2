import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function poblarDatosPrueba() {
  console.log("Limpiando transacciones anteriores de trámites...");

  // Eliminar en orden para respetar claves foráneas
  await prisma.historial_movimientos.deleteMany({});
  await prisma.observaciones.deleteMany({});
  await prisma.tramite_referencias.deleteMany({});
  await prisma.documentos_tramite.deleteMany({});
  await prisma.solicitudes_devolucion.deleteMany({});
  await prisma.tramites.deleteMany({});

  console.log("Tablas transaccionales limpiadas.");

  // Usuarios clave:
  // 1: Directora Financiera (DFI)
  // 2: Lorena Zambrano (Secretaria DFI)
  // 3: Carlos Mendoza (Jefe de Presupuesto)
  // 4: Ana Belén Gómez (Analista Presupuesto 1)
  // 5: Roberto Sánchez (Analista Presupuesto 2)
  // 6: Mario Paredes (Contador General)
  // 7: Diana Flores (Analista Contable)
  // 8: Elena Ríos (Tesorera / Caja)
  // 9: Javier Ortiz (Custodio Archivo Central)

  // Catálogo de trámites a sembrar con fechas cronológicas
  // Simularemos fechas entre 2026-08-15 y 2026-10-10 para ver rangos históricos y recientes
  const tramitesSeed = [
    // 1. Servicios Básicos - Flujo completo PAGADO (Rápido, 3 días)
    {
      id_tramite: 201,
      codigo_tramite: "SENAE-CP-2026-00201",
      numero_quipux: "SENAE-DAF-2026-1001-M",
      fecha_memorando: new Date("2026-09-01T08:30:00"),
      fecha_recepcion_fisica: new Date("2026-09-01T09:00:00"),
      fecha_ingreso: new Date("2026-09-01T09:00:00"),
      id_tipo_tramite: 1, // Servicios básicos
      tipo_flujo: "PAGO",
      padre_gestion: "PAGO",
      tipo_gestion: "PAGO",
      area_requirente: "Administrativo Financiero GYEM",
      asunto: "Planilla de suministro eléctrico Oficinas Centrales Agosto 2026",
      proveedor_beneficiario: "EMPRESA ELECTRICA PUBLICA GUAYAQUIL CNEL EP",
      ruc_proveedor: "0968599020001",
      subtotal: 12450.80,
      monto_total: 12450.80,
      es_alta_cuantia: true,
      id_area_actual: 4, // TESORERIA
      id_custodio_actual: 8, // Elena Ríos
      estado_general: "PAGADO",
      sub_estado: "PAGO_CONFIRMADO_BCE",
      spi_bce_referencia: "SPI-BCE-2026-99120",
      fecha_autorizacion_pago: new Date("2026-09-04T11:00:00"),
      fecha_pago: new Date("2026-09-04T15:30:00"),
      fecha_ultimo_movimiento: new Date("2026-09-04T15:30:00"),
      movimientos: [
        { fecha: "2026-09-01T09:00:00", deUser: 2, aUser: 2, deArea: 1, aArea: 1, accion: "INGRESO_EXPEDIENTE", nota: "Recepción documental en secretaría DFI" },
        { fecha: "2026-09-01T15:00:00", deUser: 2, aUser: 3, deArea: 1, aArea: 2, accion: "DESPACHO_LOTE_PRESUPUESTO", nota: "Entrega física con Acta Excel" },
        { fecha: "2026-09-02T09:30:00", deUser: 3, aUser: 4, deArea: 2, aArea: 2, accion: "ASIGNAR_ANALISTA_PRESUPUESTO", nota: "Asignación a Ana Gómez para control previo" },
        { fecha: "2026-09-02T16:00:00", deUser: 4, aUser: 3, deArea: 2, aArea: 2, accion: "VISTO_BUENO_PRESUPUESTO", nota: "Certificación y compromiso ok" },
        { fecha: "2026-09-03T10:00:00", deUser: 3, aUser: 6, deArea: 2, aArea: 3, accion: "DERIVAR_A_CONTABILIDAD", nota: "Revisado y derivado a Contabilidad" },
        { fecha: "2026-09-03T17:00:00", deUser: 6, aUser: 1, deArea: 3, aArea: 1, accion: "APROBACION_CONTABLE", nota: "CUR Devengado 1024 emitido" },
        { fecha: "2026-09-04T11:00:00", deUser: 1, aUser: 8, deArea: 1, aArea: 4, accion: "AUTORIZAR_PAGO_DFI", nota: "Aprobado por Directora para transferencia" },
        { fecha: "2026-09-04T15:30:00", deUser: 8, aUser: 8, deArea: 4, aArea: 4, accion: "PROGRAMAR_Y_PAGAR_MEF_BCE", nota: "Transferencia SPI Banco Central efectuada" },
      ]
    },

    // 2. Servicios Básicos - En Contabilidad (Día 4, normal)
    {
      id_tramite: 202,
      codigo_tramite: "SENAE-CP-2026-00202",
      numero_quipux: "SENAE-DAF-2026-1045-M",
      fecha_memorando: new Date("2026-09-28T09:00:00"),
      fecha_recepcion_fisica: new Date("2026-09-28T10:15:00"),
      fecha_ingreso: new Date("2026-09-28T10:15:00"),
      id_tipo_tramite: 1, // Servicios básicos
      tipo_flujo: "PAGO",
      padre_gestion: "PAGO",
      tipo_gestion: "PAGO",
      area_requirente: "Administrativo Financiero UIO",
      asunto: "Servicio de telecomunicaciones e internet satelital distritos norte",
      proveedor_beneficiario: "CORPORACION NACIONAL DE TELECOMUNICACIONES CNT EP",
      ruc_proveedor: "1768152560001",
      subtotal: 8900.00,
      monto_total: 8900.00,
      es_alta_cuantia: false,
      id_area_actual: 3, // CONTABILIDAD
      id_custodio_actual: 7, // Diana Flores (Analista Contable)
      estado_general: "CONTABILIDAD",
      sub_estado: "EN_CONTROL_CONTABLE",
      fecha_ultimo_movimiento: new Date("2026-09-30T11:00:00"),
      movimientos: [
        { fecha: "2026-09-28T10:15:00", deUser: 2, aUser: 2, deArea: 1, aArea: 1, accion: "INGRESO_EXPEDIENTE", nota: "Ingreso secretaría DFI" },
        { fecha: "2026-09-28T16:00:00", deUser: 2, aUser: 3, deArea: 1, aArea: 2, accion: "DESPACHO_LOTE_PRESUPUESTO", nota: "Despacho a Presupuesto" },
        { fecha: "2026-09-29T11:00:00", deUser: 3, aUser: 5, deArea: 2, aArea: 2, accion: "VISTO_BUENO_PRESUPUESTO", nota: "Revisado por Roberto Sánchez" },
        { fecha: "2026-09-30T09:30:00", deUser: 3, aUser: 6, deArea: 2, aArea: 3, accion: "DERIVAR_A_CONTABILIDAD", nota: "Derivado a Contabilidad" },
        { fecha: "2026-09-30T11:00:00", deUser: 6, aUser: 7, deArea: 3, aArea: 3, accion: "ASIGNAR_ANALISTA_CONTABLE", nota: "Asignado a Diana Flores para devengado" },
      ]
    },

    // 3. Ínfima Cuantía - Finalizado en Archivo (SLA 5 días, a tiempo)
    {
      id_tramite: 203,
      codigo_tramite: "SENAE-CP-2026-00203",
      numero_quipux: "SENAE-DAF-2026-0812-M",
      fecha_memorando: new Date("2026-08-20T08:00:00"),
      fecha_recepcion_fisica: new Date("2026-08-20T09:00:00"),
      fecha_ingreso: new Date("2026-08-20T09:00:00"),
      id_tipo_tramite: 2, // Ínfima cuantía
      tipo_flujo: "PAGO",
      padre_gestion: "PAGO",
      tipo_gestion: "PAGO",
      area_requirente: "Aforo MCRT",
      asunto: "Adquisición de kits de reactivos químicos para inspección física aduanera",
      proveedor_beneficiario: "QUIMICOS DEL ECUADOR CIA. LTDA.",
      ruc_proveedor: "0991827364001",
      subtotal: 4200.00,
      monto_total: 4200.00,
      es_alta_cuantia: false,
      id_area_actual: 6, // ARCHIVO
      id_custodio_actual: 9, // Javier Ortiz
      estado_general: "ARCHIVO",
      sub_estado: "ARCHIVADO_DEFINITIVO",
      codigo_tomo_caja: "TOMO-INF-2026-14",
      estanteria: "ESTANTE-C2-NIVEL3",
      fecha_pago: new Date("2026-08-25T14:00:00"),
      fecha_ultimo_movimiento: new Date("2026-08-26T10:00:00"),
      movimientos: [
        { fecha: "2026-08-20T09:00:00", deUser: 2, aUser: 3, deArea: 1, aArea: 2, accion: "DESPACHO_LOTE_PRESUPUESTO", nota: "Despacho a Presupuesto" },
        { fecha: "2026-08-21T14:00:00", deUser: 3, aUser: 6, deArea: 2, aArea: 3, accion: "DERIVAR_A_CONTABILIDAD", nota: "Presupuesto OK" },
        { fecha: "2026-08-22T16:00:00", deUser: 6, aUser: 1, deArea: 3, aArea: 1, accion: "APROBACION_CONTABLE", nota: "Contabilidad OK" },
        { fecha: "2026-08-25T14:00:00", deUser: 8, aUser: 9, deArea: 4, aArea: 6, accion: "ENTREGA_A_ARCHIVO", nota: "Pagado y entregado a custodia física" },
      ]
    },

    // 4. Ínfima Cuantía - Con Tardanza (9 días) - Demora en Contabilidad
    {
      id_tramite: 204,
      codigo_tramite: "SENAE-CP-2026-00204",
      numero_quipux: "SENAE-DIT-2026-0991-M",
      fecha_memorando: new Date("2026-09-02T10:00:00"),
      fecha_recepcion_fisica: new Date("2026-09-02T11:00:00"),
      fecha_ingreso: new Date("2026-09-02T11:00:00"),
      id_tipo_tramite: 2, // Ínfima cuantía
      tipo_flujo: "PAGO",
      padre_gestion: "PAGO",
      tipo_gestion: "PAGO",
      area_requirente: "Tecnología de la Información",
      asunto: "Renovación de cables estructurados y accesorios de red datacenter",
      proveedor_beneficiario: "REDES Y CONECTIVIDAD DEL PACIFICO S.A.",
      ruc_proveedor: "1792837465001",
      subtotal: 5800.00,
      monto_total: 5800.00,
      es_alta_cuantia: false,
      id_area_actual: 3, // CONTABILIDAD
      id_custodio_actual: 6, // Mario Paredes
      estado_general: "CONTABILIDAD",
      sub_estado: "EN_REVISION_CONTABLE",
      fecha_ultimo_movimiento: new Date("2026-09-15T16:00:00"),
      movimientos: [
        { fecha: "2026-09-02T11:00:00", deUser: 2, aUser: 3, deArea: 1, aArea: 2, accion: "DESPACHO_LOTE_PRESUPUESTO", nota: "Ingresado y despachado" },
        { fecha: "2026-09-03T10:00:00", deUser: 3, aUser: 6, deArea: 2, aArea: 3, accion: "DERIVAR_A_CONTABILIDAD", nota: "Presupuesto despachó rápido" },
        { fecha: "2026-09-12T15:00:00", deUser: 6, aUser: 6, deArea: 3, aArea: 3, accion: "REVISION_INTERNA_RETENIDA", nota: "Retención por carga de trabajo acumulada en Contabilidad" },
      ]
    },

    // 5. Contrataciones SNCP - Con Tardanza Crítica (14 días) - Cuello de botella: OBSERVACION 72H
    {
      id_tramite: 205,
      codigo_tramite: "SENAE-CP-2026-00205",
      numero_quipux: "SENAE-DTH-2026-1120-M",
      fecha_memorando: new Date("2026-08-25T09:00:00"),
      fecha_recepcion_fisica: new Date("2026-08-25T10:00:00"),
      fecha_ingreso: new Date("2026-08-25T10:00:00"),
      id_tipo_tramite: 3, // Contratación SNCP
      tipo_flujo: "PAGO",
      padre_gestion: "PAGO",
      tipo_gestion: "PAGO",
      area_requirente: "Talento Humano DTH",
      asunto: "Servicio de vigilancia armada para recintos aduaneros frontera sur",
      proveedor_beneficiario: "SEGURIDAD INTEGRAL Y CUSTODIA VIGILAN S.A.",
      ruc_proveedor: "0990011223001",
      subtotal: 48500.00,
      monto_total: 48500.00,
      es_alta_cuantia: true,
      id_area_actual: 2, // PRESUPUESTO
      id_custodio_actual: 4, // Ana Belén Gómez
      estado_general: "OBSERVADO",
      sub_estado: "OBSERVACION_EXTERNA_72H",
      esta_pausado: true,
      motivo_pausa: "Falta informe de cumplimiento suscrito por Administrador de Contrato",
      motivo_observacion: "Falta póliza de fiel cumplimiento actualizada y firmas de recibido conforme",
      fecha_pausa: new Date("2026-09-02T10:00:00"),
      dias_pausa_acumulados: 6,
      fecha_ultimo_movimiento: new Date("2026-09-10T11:00:00"),
      movimientos: [
        { fecha: "2026-08-25T10:00:00", deUser: 2, aUser: 3, deArea: 1, aArea: 2, accion: "DESPACHO_LOTE_PRESUPUESTO", nota: "Despachado a Presupuesto" },
        { fecha: "2026-08-27T11:00:00", deUser: 3, aUser: 4, deArea: 2, aArea: 2, accion: "ASIGNAR_ANALISTA_PRESUPUESTO", nota: "Asignado a Ana Gómez" },
        { fecha: "2026-09-02T10:00:00", deUser: 4, aUser: 4, deArea: 2, aArea: 2, accion: "REGISTRAR_OBSERVACION", nota: "Observación notificada a administrador de contrato. Pausa SLA." },
      ]
    },

    // 6. Contrataciones SNCP - Con Tardanza (11 días) - Cuello de botella: ESPERA FACTURA SRI
    {
      id_tramite: 206,
      codigo_tramite: "SENAE-CP-2026-00206",
      numero_quipux: "SENAE-DAF-2026-1188-M",
      fecha_memorando: new Date("2026-09-05T08:30:00"),
      fecha_recepcion_fisica: new Date("2026-09-05T09:30:00"),
      fecha_ingreso: new Date("2026-09-05T09:30:00"),
      id_tipo_tramite: 3, // Contratación SNCP
      tipo_flujo: "PAGO",
      padre_gestion: "PAGO",
      tipo_gestion: "PAGO",
      area_requirente: "Administrativo Financiero GYEM",
      asunto: "Mantenimiento integral de aires acondicionados edificio central",
      proveedor_beneficiario: "CLIMATIZACION Y SERVICIOS TECNICOS CIA. LTDA.",
      ruc_proveedor: "1790099887001",
      subtotal: 19800.00,
      monto_total: 19800.00,
      es_alta_cuantia: true,
      id_area_actual: 2, // PRESUPUESTO
      id_custodio_actual: 5, // Roberto Sánchez
      estado_general: "FACTURA",
      sub_estado: "ESPERA_FACTURA_SRI",
      esta_pausado: true,
      motivo_pausa: "Proveedor no ha remitido factura electrónica autorizada SRI",
      dias_pausa_acumulados: 5,
      fecha_ultimo_movimiento: new Date("2026-09-12T14:00:00"),
      movimientos: [
        { fecha: "2026-09-05T09:30:00", deUser: 2, aUser: 3, deArea: 1, aArea: 2, accion: "DESPACHO_LOTE_PRESUPUESTO", nota: "Ingresado" },
        { fecha: "2026-09-07T12:00:00", deUser: 3, aUser: 5, deArea: 2, aArea: 2, accion: "ASIGNAR_ANALISTA_PRESUPUESTO", nota: "En revisión presupuestaria" },
        { fecha: "2026-09-08T15:00:00", deUser: 5, aUser: 5, deArea: 2, aArea: 2, accion: "PASAR_A_FACTURA", nota: "Revisión lista, en pausa esperando factura SRI" },
      ]
    },

    // 7. Contratación DNTH - En DFI pendiente de pago (6 días, al límite)
    {
      id_tramite: 207,
      codigo_tramite: "SENAE-CP-2026-00207",
      numero_quipux: "SENAE-DTH-2026-1205-M",
      fecha_memorando: new Date("2026-09-22T08:00:00"),
      fecha_recepcion_fisica: new Date("2026-09-22T08:45:00"),
      fecha_ingreso: new Date("2026-09-22T08:45:00"),
      id_tipo_tramite: 4, // Contrataciones directas DNTH
      tipo_flujo: "PAGO",
      padre_gestion: "PAGO",
      tipo_gestion: "PAGO",
      area_requirente: "Talento Humano DTH",
      asunto: "Servicio de exámenes médicos ocupacionales periódicos SENAE",
      proveedor_beneficiario: "LABORATORIOS CLINICOS ESPECIALIZADOS LABMED",
      ruc_proveedor: "0992384729001",
      subtotal: 14200.00,
      monto_total: 14200.00,
      es_alta_cuantia: true,
      id_area_actual: 1, // DFI
      id_custodio_actual: 1, // Directora Financiera
      estado_general: "DFI",
      sub_estado: "PENDIENTE_AUTORIZACION_PAGO",
      fecha_ultimo_movimiento: new Date("2026-09-28T16:30:00"),
      movimientos: [
        { fecha: "2026-09-22T08:45:00", deUser: 2, aUser: 3, deArea: 1, aArea: 2, accion: "DESPACHO_LOTE_PRESUPUESTO", nota: "Despacho a Presupuesto" },
        { fecha: "2026-09-24T10:00:00", deUser: 3, aUser: 6, deArea: 2, aArea: 3, accion: "DERIVAR_A_CONTABILIDAD", nota: "Presupuesto aprobado" },
        { fecha: "2026-09-27T17:00:00", deUser: 6, aUser: 1, deArea: 3, aArea: 1, accion: "APROBACION_CONTABLE", nota: "Devengado OK" },
      ]
    },

    // 8. Viáticos Funcionarios - Rápido PAGADO (2 días)
    {
      id_tramite: 208,
      codigo_tramite: "SENAE-CP-2026-00208",
      numero_quipux: "SENAE-DIT-2026-1240-M",
      fecha_memorando: new Date("2026-09-25T09:00:00"),
      fecha_recepcion_fisica: new Date("2026-09-25T09:30:00"),
      fecha_ingreso: new Date("2026-09-25T09:30:00"),
      id_tipo_tramite: 8, // Viáticos
      tipo_flujo: "PAGO",
      padre_gestion: "PAGO",
      tipo_gestion: "PAGO",
      area_requirente: "Agencia de Inteligencia Azuay",
      asunto: "Liquidación de viáticos comisión de servicios operativos frontera",
      proveedor_beneficiario: "CAPITAN LUIS EDUARDO ORDOÑEZ",
      ruc_proveedor: "0103948572001",
      subtotal: 640.00,
      monto_total: 640.00,
      es_alta_cuantia: false,
      id_area_actual: 4, // TESORERIA
      id_custodio_actual: 8, // Elena Ríos
      estado_general: "PAGADO",
      sub_estado: "PAGO_EFECTIVO_CONFIRMADO",
      spi_bce_referencia: "SPI-VIAT-2026-114",
      fecha_autorizacion_pago: new Date("2026-09-27T10:00:00"),
      fecha_pago: new Date("2026-09-27T12:00:00"),
      fecha_ultimo_movimiento: new Date("2026-09-27T12:00:00"),
      movimientos: [
        { fecha: "2026-09-25T09:30:00", deUser: 2, aUser: 3, deArea: 1, aArea: 2, accion: "DESPACHO_LOTE_PRESUPUESTO", nota: "Ingreso viáticos" },
        { fecha: "2026-09-26T11:00:00", deUser: 3, aUser: 6, deArea: 2, aArea: 3, accion: "DERIVAR_A_CONTABILIDAD", nota: "Compromiso emitido" },
        { fecha: "2026-09-26T16:00:00", deUser: 6, aUser: 1, deArea: 3, aArea: 1, accion: "APROBACION_CONTABLE", nota: "Devengado emitido" },
        { fecha: "2026-09-27T12:00:00", deUser: 8, aUser: 8, deArea: 4, aArea: 4, accion: "PROGRAMAR_Y_PAGAR_MEF_BCE", nota: "Pago acreditado" },
      ]
    },

    // 9. Viáticos Funcionarios - En Presupuesto (Día 1)
    {
      id_tramite: 209,
      codigo_tramite: "SENAE-CP-2026-00209",
      numero_quipux: "SENAE-DTH-2026-1310-M",
      fecha_memorando: new Date("2026-10-09T08:00:00"),
      fecha_recepcion_fisica: new Date("2026-10-09T08:30:00"),
      fecha_ingreso: new Date("2026-10-09T08:30:00"),
      id_tipo_tramite: 8, // Viáticos
      tipo_flujo: "PAGO",
      padre_gestion: "PAGO",
      tipo_gestion: "PAGO",
      area_requirente: "Agencia de Inteligencia Carchi",
      asunto: "Viáticos inspección no intrusiva puente internacional de Rumichaca",
      proveedor_beneficiario: "ING. MARCELO ANDRES VACA",
      ruc_proveedor: "0401827364001",
      subtotal: 480.00,
      monto_total: 480.00,
      es_alta_cuantia: false,
      id_area_actual: 2, // PRESUPUESTO
      id_custodio_actual: 4, // Ana Belén Gómez
      estado_general: "REVISION",
      sub_estado: "ASIGNADO_A_ANALISTA",
      fecha_ultimo_movimiento: new Date("2026-10-09T14:00:00"),
      movimientos: [
        { fecha: "2026-10-09T08:30:00", deUser: 2, aUser: 3, deArea: 1, aArea: 2, accion: "DESPACHO_LOTE_PRESUPUESTO", nota: "Entrega física a Presupuesto" },
        { fecha: "2026-10-09T14:00:00", deUser: 3, aUser: 4, deArea: 2, aArea: 2, accion: "ASIGNAR_ANALISTA_PRESUPUESTO", nota: "Asignado a Ana Belén Gómez" },
      ]
    },

    // 10. Convenios de Pago - Con Tardanza (10 días) - Demora en Presupuesto (complejidad legal)
    {
      id_tramite: 210,
      codigo_tramite: "SENAE-CP-2026-00210",
      numero_quipux: "SENAE-DAF-2026-1355-M",
      fecha_memorando: new Date("2026-09-14T09:00:00"),
      fecha_recepcion_fisica: new Date("2026-09-14T09:45:00"),
      fecha_ingreso: new Date("2026-09-14T09:45:00"),
      id_tipo_tramite: 11, // Convenios de pago
      tipo_flujo: "PAGO",
      padre_gestion: "PAGO",
      tipo_gestion: "PAGO",
      area_requirente: "Administrativo Financiero BLVM",
      asunto: "Convenio de pago por arrendamiento retroactivo de bodegas aduaneras",
      proveedor_beneficiario: "INMOBILIARIA DEL PUERTO S.A.",
      ruc_proveedor: "0991928374001",
      subtotal: 32000.00,
      monto_total: 32000.00,
      es_alta_cuantia: true,
      id_area_actual: 2, // PRESUPUESTO
      id_custodio_actual: 3, // Carlos Mendoza (Jefe)
      estado_general: "REVISION",
      sub_estado: "ANALISIS_PRESUPUESTARIO_ESPECIAL",
      fecha_ultimo_movimiento: new Date("2026-09-24T15:00:00"),
      movimientos: [
        { fecha: "2026-09-14T09:45:00", deUser: 2, aUser: 3, deArea: 1, aArea: 2, accion: "DESPACHO_LOTE_PRESUPUESTO", nota: "Ingresado convenio de pago" },
        { fecha: "2026-09-20T16:00:00", deUser: 3, aUser: 3, deArea: 2, aArea: 2, accion: "REVISION_CERTIFICACIONES_ANTERIORES", nota: "Demora por validación de partidas de ejercicios fiscales anteriores" },
      ]
    },

    // 11. Pólizas de Seguros - Con Tardanza (8 días) - Demora en Contabilidad por devengado diferido
    {
      id_tramite: 211,
      codigo_tramite: "SENAE-CP-2026-00211",
      numero_quipux: "SENAE-DAF-2026-1402-M",
      fecha_memorando: new Date("2026-09-18T08:30:00"),
      fecha_recepcion_fisica: new Date("2026-09-18T09:15:00"),
      fecha_ingreso: new Date("2026-09-18T09:15:00"),
      id_tipo_tramite: 15, // Pólizas de seguros
      tipo_flujo: "PAGO",
      padre_gestion: "PAGO",
      tipo_gestion: "PAGO",
      area_requirente: "Administrativo Financiero GYEM",
      asunto: "Prima de seguro multirriesgo y deshonestidad flota de patrullas",
      proveedor_beneficiario: "SEGUROS EQUINOCCIAL S.A.",
      ruc_proveedor: "1790013589001",
      subtotal: 54000.00,
      monto_total: 54000.00,
      es_alta_cuantia: true,
      id_area_actual: 3, // CONTABILIDAD
      id_custodio_actual: 6, // Mario Paredes
      estado_general: "CONTABILIDAD",
      sub_estado: "DEVENGADO_EN_TRAMITE",
      fecha_ultimo_movimiento: new Date("2026-09-29T10:00:00"),
      movimientos: [
        { fecha: "2026-09-18T09:15:00", deUser: 2, aUser: 3, deArea: 1, aArea: 2, accion: "DESPACHO_LOTE_PRESUPUESTO", nota: "Ingresado a presupuesto" },
        { fecha: "2026-09-21T11:00:00", deUser: 3, aUser: 6, deArea: 2, aArea: 3, accion: "DERIVAR_A_CONTABILIDAD", nota: "Presupuesto aprobado" },
        { fecha: "2026-09-28T17:00:00", deUser: 6, aUser: 6, deArea: 3, aArea: 3, accion: "ANALISIS_CONTABLE_DIFERIDO", nota: "Demora en cálculo de amortizaciones mensuales de póliza anual" },
      ]
    },

    // 12. Devolución de Garantías - Rápido PAGADO (4 días)
    {
      id_tramite: 212,
      codigo_tramite: "SENAE-CP-2026-00212",
      numero_quipux: "SENAE-DCG-2026-0440-M",
      fecha_memorando: new Date("2026-09-29T10:00:00"),
      fecha_recepcion_fisica: new Date("2026-09-29T10:30:00"),
      fecha_ingreso: new Date("2026-09-29T10:30:00"),
      id_tipo_tramite: 6, // Garantías aduana
      tipo_flujo: "GARANTIA",
      padre_gestion: "GARANTIA",
      tipo_gestion: "Garantia",
      area_requirente: "Gestión de Cobranzas y Garantías",
      asunto: "Devolución de garantía aduanera por nacionalización cumplida",
      proveedor_beneficiario: "IMPORTACIONES ANDINAS DEL ECUADOR S.A.",
      ruc_proveedor: "0992384729001",
      subtotal: 15000.00,
      monto_total: 15000.00,
      es_alta_cuantia: true,
      id_area_actual: 4, // TESORERIA
      id_custodio_actual: 8, // Elena Ríos
      estado_general: "PAGADO",
      sub_estado: "TRANSFERENCIA_REALIZADA",
      spi_bce_referencia: "SPI-BCE-GAR-2026-09",
      fecha_autorizacion_pago: new Date("2026-10-02T10:00:00"),
      fecha_pago: new Date("2026-10-03T11:00:00"),
      fecha_ultimo_movimiento: new Date("2026-10-03T11:00:00"),
      movimientos: [
        { fecha: "2026-09-29T10:30:00", deUser: 2, aUser: 6, deArea: 1, aArea: 3, accion: "DERIVAR_A_CONTABILIDAD", nota: "Ingreso garantía" },
        { fecha: "2026-10-01T15:00:00", deUser: 6, aUser: 1, deArea: 3, aArea: 1, accion: "APROBACION_CONTABLE", nota: "Contabilidad validó caución" },
        { fecha: "2026-10-03T11:00:00", deUser: 8, aUser: 8, deArea: 4, aArea: 4, accion: "PROGRAMAR_Y_PAGAR_MEF_BCE", nota: "Transferencia efectuada" },
      ]
    },

    // 13. Caja Chica - Rápido PAGADO (2 días)
    {
      id_tramite: 213,
      codigo_tramite: "SENAE-CP-2026-00213",
      numero_quipux: "SENAE-DAF-2026-1480-M",
      fecha_memorando: new Date("2026-10-05T08:00:00"),
      fecha_recepcion_fisica: new Date("2026-10-05T08:30:00"),
      fecha_ingreso: new Date("2026-10-05T08:30:00"),
      id_tipo_tramite: 5, // Caja chica
      tipo_flujo: "PAGO",
      padre_gestion: "PAGO",
      tipo_gestion: "JUSTIFICACION",
      area_requirente: "Administrativo Financiero LTC",
      asunto: "Reposición mensual de caja chica distrito Latacunga",
      proveedor_beneficiario: "LIC. PATRICIA GUERRERO (CUSTODIA CAJA CHICA)",
      ruc_proveedor: "0501827364001",
      subtotal: 1500.00,
      monto_total: 1500.00,
      es_alta_cuantia: false,
      id_area_actual: 4, // TESORERIA
      id_custodio_actual: 8, // Elena Ríos
      estado_general: "PAGADO",
      sub_estado: "REPOSICION_PAGADA",
      spi_bce_referencia: "SPI-CCH-2026-05",
      fecha_autorizacion_pago: new Date("2026-10-06T15:00:00"),
      fecha_pago: new Date("2026-10-07T10:00:00"),
      fecha_ultimo_movimiento: new Date("2026-10-07T10:00:00"),
      movimientos: [
        { fecha: "2026-10-05T08:30:00", deUser: 2, aUser: 6, deArea: 1, aArea: 3, accion: "DERIVAR_A_CONTABILIDAD", nota: "Ingreso caja chica" },
        { fecha: "2026-10-06T11:00:00", deUser: 6, aUser: 1, deArea: 3, aArea: 1, accion: "APROBACION_CONTABLE", nota: "Liquidación contable revisada" },
        { fecha: "2026-10-07T10:00:00", deUser: 8, aUser: 8, deArea: 4, aArea: 4, accion: "PROGRAMAR_Y_PAGAR_MEF_BCE", nota: "Acreditado" },
      ]
    },

    // 14. Servicios Básicos - Recién Ingresado en DFI (Día 0)
    {
      id_tramite: 214,
      codigo_tramite: "SENAE-CP-2026-00214",
      numero_quipux: "SENAE-DAF-2026-1510-M",
      fecha_memorando: new Date("2026-10-12T09:00:00"),
      fecha_recepcion_fisica: new Date("2026-10-12T09:30:00"),
      fecha_ingreso: new Date("2026-10-12T09:30:00"),
      id_tipo_tramite: 1, // Servicios básicos
      tipo_flujo: "PAGO",
      padre_gestion: "PAGO",
      tipo_gestion: "PAGO",
      area_requirente: "Administrativo Financiero ESMM",
      asunto: "Servicio de agua potable y saneamiento distrito Esmeraldas Septiembre",
      proveedor_beneficiario: "EMPRESA PUBLICA DE AGUA POTABLE ESMERALDAS EPMAPSE",
      ruc_proveedor: "0860001230001",
      subtotal: 1850.00,
      monto_total: 1850.00,
      es_alta_cuantia: false,
      id_area_actual: 1, // DFI
      id_custodio_actual: 2, // Lorena Zambrano
      estado_general: "INGRESADO",
      sub_estado: "RECEPCIONADO_DFI",
      fecha_ultimo_movimiento: new Date("2026-10-12T09:30:00"),
      movimientos: [
        { fecha: "2026-10-12T09:30:00", deUser: 2, aUser: 2, deArea: 1, aArea: 1, accion: "INGRESO_EXPEDIENTE", nota: "Expediente físico recibido en recepción DFI" },
      ]
    },

    // 15. Contrataciones SNCP - Recién Ingresado en DFI listo para entregar (Día 1)
    {
      id_tramite: 215,
      codigo_tramite: "SENAE-CP-2026-00215",
      numero_quipux: "SENAE-DIT-2026-1522-M",
      fecha_memorando: new Date("2026-10-11T10:00:00"),
      fecha_recepcion_fisica: new Date("2026-10-11T11:00:00"),
      fecha_ingreso: new Date("2026-10-11T11:00:00"),
      id_tipo_tramite: 3, // Contrataciones SNCP
      tipo_flujo: "PAGO",
      padre_gestion: "PAGO",
      tipo_gestion: "PAGO",
      area_requirente: "Tecnología de la Información",
      asunto: "Soporte y licenciamiento anual para cortafuegos perimetrales SENAE",
      proveedor_beneficiario: "FORTINET SOLUTIONS ECUADOR S.A.",
      ruc_proveedor: "1791829304001",
      subtotal: 28500.00,
      monto_total: 28500.00,
      es_alta_cuantia: true,
      id_area_actual: 1, // DFI
      id_custodio_actual: 2, // Lorena Zambrano
      estado_general: "INGRESADO",
      sub_estado: "RECEPCIONADO_DFI",
      fecha_ultimo_movimiento: new Date("2026-10-11T11:00:00"),
      movimientos: [
        { fecha: "2026-10-11T11:00:00", deUser: 2, aUser: 2, deArea: 1, aArea: 1, accion: "INGRESO_EXPEDIENTE", nota: "Ingresado en recepción DFI pendiente de despacho por lote" },
      ]
    },

    // 16. Obras y Mantenimiento - En Presupuesto (Día 2)
    {
      id_tramite: 216,
      codigo_tramite: "SENAE-CP-2026-00216",
      numero_quipux: "SENAE-DAF-2026-1540-M",
      fecha_memorando: new Date("2026-10-08T08:00:00"),
      fecha_recepcion_fisica: new Date("2026-10-08T09:00:00"),
      fecha_ingreso: new Date("2026-10-08T09:00:00"),
      id_tipo_tramite: 3, // SNCP
      tipo_flujo: "PAGO",
      padre_gestion: "PAGO",
      tipo_gestion: "PAGO",
      area_requirente: "Administrativo Financiero HQLT",
      asunto: "Reparación de cubierta y pisos bodega de mercaderías incautadas Huaquillas",
      proveedor_beneficiario: "ING. GUSTAVO PAREDES CONSTRUCTOR",
      ruc_proveedor: "0701928374001",
      subtotal: 16500.00,
      monto_total: 16500.00,
      es_alta_cuantia: true,
      id_area_actual: 2, // PRESUPUESTO
      id_custodio_actual: 5, // Roberto Sánchez
      estado_general: "REVISION",
      sub_estado: "EN_CONTROL_PREVIO",
      fecha_ultimo_movimiento: new Date("2026-10-09T10:00:00"),
      movimientos: [
        { fecha: "2026-10-08T09:00:00", deUser: 2, aUser: 3, deArea: 1, aArea: 2, accion: "DESPACHO_LOTE_PRESUPUESTO", nota: "Despacho por lote" },
        { fecha: "2026-10-09T10:00:00", deUser: 3, aUser: 5, deArea: 2, aArea: 2, accion: "ASIGNAR_ANALISTA_PRESUPUESTO", nota: "Asignado a Roberto Sánchez" },
      ]
    },

    // 17. Contratación DNTH - Insubsistente (Nulidad)
    {
      id_tramite: 217,
      codigo_tramite: "SENAE-CP-2026-00217",
      numero_quipux: "SENAE-DTH-2026-0701-M",
      fecha_memorando: new Date("2026-08-18T09:00:00"),
      fecha_recepcion_fisica: new Date("2026-08-18T10:00:00"),
      fecha_ingreso: new Date("2026-08-18T10:00:00"),
      id_tipo_tramite: 4, // DNTH
      tipo_flujo: "PAGO",
      padre_gestion: "PAGO",
      tipo_gestion: "PAGO",
      area_requirente: "Talento Humano DTH",
      asunto: "Consultoría de clima laboral y evaluación de desempeño",
      proveedor_beneficiario: "GESTION DE TALENTO & ASOCIADOS",
      ruc_proveedor: "1791827364001",
      subtotal: 9500.00,
      monto_total: 9500.00,
      es_alta_cuantia: false,
      id_area_actual: 1, // DFI
      id_custodio_actual: 2, // Secretaria Lorena
      estado_general: "INSUBSISTENTE",
      sub_estado: "ANULADO_POR_INSUBSISTENCIA",
      justificacion_insubsistencia: "El proceso precontractual no contó con la certificación POA previa requerida por la Contraloría",
      fecha_ultimo_movimiento: new Date("2026-08-22T14:00:00"),
      movimientos: [
        { fecha: "2026-08-18T10:00:00", deUser: 2, aUser: 3, deArea: 1, aArea: 2, accion: "DESPACHO_LOTE_PRESUPUESTO", nota: "Despachado" },
        { fecha: "2026-08-22T14:00:00", deUser: 3, aUser: 2, deArea: 2, aArea: 1, accion: "DECLARAR_INSUBSISTENTE", nota: "Declarado nulo por vicio insubsanable de origen" },
      ]
    },

    // 18. Convenios de Pago - PAGADO con Tardanza (12 días) - Cuello de botella en DFI / Presupuesto
    {
      id_tramite: 218,
      codigo_tramite: "SENAE-CP-2026-00218",
      numero_quipux: "SENAE-DAF-2026-0950-M",
      fecha_memorando: new Date("2026-08-28T08:00:00"),
      fecha_recepcion_fisica: new Date("2026-08-28T09:00:00"),
      fecha_ingreso: new Date("2026-08-28T09:00:00"),
      id_tipo_tramite: 11, // Convenios de pago
      tipo_flujo: "PAGO",
      padre_gestion: "PAGO",
      tipo_gestion: "PAGO",
      area_requirente: "Administrativo Financiero MTAM",
      asunto: "Pago de servicios de custodia física de vehículos decomisados 2025-2026",
      proveedor_beneficiario: "COMPAÑIA DE PARQUEADEROS Y CUSTODIAS MANABI S.A.",
      ruc_proveedor: "1391827364001",
      subtotal: 24000.00,
      monto_total: 24000.00,
      es_alta_cuantia: true,
      id_area_actual: 4, // TESORERIA
      id_custodio_actual: 8, // Elena Ríos
      estado_general: "PAGADO",
      sub_estado: "PAGO_CONFIRMADO_BCE",
      spi_bce_referencia: "SPI-CONV-2026-88",
      fecha_autorizacion_pago: new Date("2026-09-14T11:00:00"),
      fecha_pago: new Date("2026-09-15T16:00:00"),
      fecha_ultimo_movimiento: new Date("2026-09-15T16:00:00"),
      movimientos: [
        { fecha: "2026-08-28T09:00:00", deUser: 2, aUser: 3, deArea: 1, aArea: 2, accion: "DESPACHO_LOTE_PRESUPUESTO", nota: "Ingreso convenio" },
        { fecha: "2026-09-08T16:00:00", deUser: 3, aUser: 6, deArea: 2, aArea: 3, accion: "DERIVAR_A_CONTABILIDAD", nota: "Presupuesto tardó 7 días laborables en liquidar" },
        { fecha: "2026-09-12T15:00:00", deUser: 6, aUser: 1, deArea: 3, aArea: 1, accion: "APROBACION_CONTABLE", nota: "Contabilidad liquidó en 3 días" },
        { fecha: "2026-09-15T16:00:00", deUser: 8, aUser: 8, deArea: 4, aArea: 4, accion: "PROGRAMAR_Y_PAGAR_MEF_BCE", nota: "Pago concluido" },
      ]
    }
  ];

  for (const tData of tramitesSeed) {
    const { movimientos, ...tramiteFields } = tData;

    await prisma.tramites.create({
      data: {
        ...tramiteFields,
        nro_tramite: tData.codigo_tramite,
      },
    });

    // Crear referencia Quipux
    await prisma.tramite_referencias.create({
      data: {
        id_tramite: tData.id_tramite,
        tipo_documento: "MEMORANDO_OFICIAL",
        numero_documento: tData.numero_quipux,
        fecha_documento: tData.fecha_memorando,
        asunto_sumilla: `Documento oficial de radicación: ${tData.asunto}`,
        id_usuario_registro: 2,
      },
    });

    // Si tiene observaciones sembradas, crearlas en la tabla observaciones
    if (tData.estado_general === "OBSERVADO") {
      await prisma.observaciones.create({
        data: {
          id_tramite: tData.id_tramite,
          id_area_reporta: tData.id_area_actual,
          id_usuario_reporta: tData.id_custodio_actual,
          detalle_observacion: tData.motivo_observacion || "Observación formal a terceros",
          fecha_reporte: tData.fecha_ultimo_movimiento,
          estado_observacion: "PENDIENTE",
        },
      });
    }

    // Insertar la secuencia cronológica de movimientos
    for (const m of movimientos) {
      await prisma.historial_movimientos.create({
        data: {
          id_tramite: tData.id_tramite,
          id_usuario_entrega: m.deUser,
          id_usuario_recibe: m.aUser,
          id_area_origen: m.deArea,
          id_area_destino: m.aArea,
          tipo_accion: m.accion,
          comentarios: m.nota,
          fecha_hora: new Date(m.fecha),
        },
      });
    }
  }

  console.log(`¡Sembrado exitoso de ${tramitesSeed.length} trámites de prueba con historial de movimientos completo!`);
}

poblarDatosPrueba()
  .catch((e) => {
    console.error("Error al poblar datos:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
