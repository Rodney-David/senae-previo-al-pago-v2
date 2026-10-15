import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("==================================================================");
  console.log("INICIANDO PURGA COMPLETA Y CARGA DE 40 TRÁMITES INSTITUCIONALES");
  console.log("==================================================================");

  // 1. PURGA TOTAL DE TRÁMITES, CAJAS Y AUDITORÍA
  console.log("-> Purgando tablas transaccionales...");
  await prisma.historial_movimientos.deleteMany({});
  await prisma.observaciones.deleteMany({});
  await prisma.tramite_referencias.deleteMany({});
  await prisma.documentos_tramite.deleteMany({});
  await prisma.solicitudes_devolucion.deleteMany({});
  await prisma.tramites.deleteMany({});
  await prisma.cajas.deleteMany({});
  console.log("-> Tablas transaccionales purgadas con éxito.");

  // 2. CREACIÓN DE CAJAS OFICIALES PARA EXPEDIENTES ARCHIVADOS
  console.log("-> Creando cajas oficiales...");
  const caja1 = await prisma.cajas.create({
    data: {
      codigo_caja: "SENAE-CAJA-2026-001",
      nombre: "Tomo 1 - Pagos Enero 2026",
      estado: "ARCHIVADA",
      fecha_creacion: new Date("2026-01-05T08:30:00Z"),
      fecha_cierre: new Date("2026-02-15T16:00:00Z"),
      id_usuario_creacion: 8, // Econ. Margarita Alarcón
      observaciones: "Caja cerrada formalmente con 10 expedientes de pagos transferidos al Archivo Definitivo. Bodega General Estante 3 Nivel 2.",
    },
  });

  const caja2 = await prisma.cajas.create({
    data: {
      codigo_caja: "SENAE-CAJA-2026-002",
      nombre: "Tomo 2 - Pagos Febrero 2026",
      estado: "ARCHIVADA",
      fecha_creacion: new Date("2026-02-01T08:30:00Z"),
      fecha_cierre: new Date("2026-03-20T17:00:00Z"),
      id_usuario_creacion: 8, // Econ. Margarita Alarcón
      observaciones: "Caja cerrada con 10 expedientes archivados con observaciones subsanadas y auditoría completa. Bodega General Estante 3 Nivel 3.",
    },
  });

  const cajaAbierta = await prisma.cajas.create({
    data: {
      codigo_caja: "SENAE-CAJA-2026-003",
      nombre: "Tomo 3 - Operativo Tesorería",
      estado: "ABIERTA",
      fecha_creacion: new Date("2026-04-01T09:00:00Z"),
      id_usuario_creacion: 8,
      observaciones: "Caja operativa abierta en Tesorería para empaquetado de expedientes pagados.",
    },
  });

  // 3. OBTENER CATÁLOGO DE ITEMS PRESUPUESTARIOS LIMPIOS (SIN PUNTOS)
  const itemsDisponibles = await (prisma as any).items_presupuestarios.findMany({
    take: 30,
    orderBy: { id_item: "asc" },
  });

  const getCleanItem = (index: number) => {
    if (itemsDisponibles.length === 0) return "530204 - SERVICIOS DE EDICION IMPRESION";
    const it = itemsDisponibles[index % itemsDisponibles.length];
    return `${it.codigo} - ${it.nombre}`;
  };

  // Catálogo de áreas solicitantes
  const areasSolicitantes = [
    "Dirección de Tecnología de la Información",
    "Dirección de Talento Humano",
    "Dirección Administrativa",
    "Dirección de Operaciones Aduaneras",
    "Dirección de Inteligencia Aduanera",
    "Subdirección General de Normativa",
    "Dirección Distrital de Guayaquil",
    "Dirección Distrital de Quito",
  ];

  // Proveedores reales
  const proveedores = [
    { nombre: "TELCONET S.A.", ruc: "0991327371001" },
    { nombre: "CORPORACIÓN NACIONAL DE TELECOMUNICACIONES CNT EP", ruc: "1768152560001" },
    { nombre: "EMPRESA ELECTRICA PUBLICA DE GUAYAQUIL EP", ruc: "0968599020001" },
    { nombre: "SEGURIDAD Y PROTECCION VIGILANCIA C. LTDA.", ruc: "0990847291001" },
    { nombre: "LIMPIEZA INSTITUCIONAL DEL PACIFICO LIMPAC S.A.", ruc: "0992384728001" },
    { nombre: "PAPELERIA Y SUMINISTROS NACIONALES PAPELSA S.A.", ruc: "1790482938001" },
    { nombre: "CONSORCIO DE VEHICULOS Y MANTENIMIENTO CONVEMA S.A.", ruc: "0992837491001" },
    { nombre: "SEGUROS EQUINOCCIAL S.A.", ruc: "1790053881001" },
    { nombre: "SERVICIOS DE ALIMENTACION ADUANERA DEL ECUADOR", ruc: "0993049182001" },
    { nombre: "SERVICIOS TECNICOS Y CALIBRACION CALIBREX S.A.", ruc: "1791827364001" },
    { nombre: "PAGOS JUDICIALES - CONSEJO DE LA JUDICATURA", ruc: "1768097520001" },
    { nombre: "BANCO CENTRAL DEL ECUADOR (GARANTIAS)", ruc: "1760002600001" },
  ];

  // 4. ESTRUCTURA DE LOS 40 TRÁMITES
  // 10 PAGO PAGO (id 1 a 10)
  // 10 PAGO JUSTIFICACION (id 11 a 20)
  // 10 PAGO EXPEDIENTE (id 21 a 30)
  // 10 GARANTIA (id 31 a 40)
  const tramitesData: any[] = [];

  for (let i = 1; i <= 40; i++) {
    const numQuipux = `SENAE-DFI-2026-${String(1000 + i).padStart(4, "0")}-M`;
    const codTramite = `CP-2026-${String(i).padStart(4, "0")}`;
    const prov = proveedores[(i - 1) % proveedores.length];
    const areaReq = areasSolicitantes[(i - 1) % areasSolicitantes.length];
    const monto = Math.round((800 + (i * 245.5)) * 100) / 100;
    const subtotal = Math.round((monto / 1.15) * 100) / 100;
    const iva = Math.round((monto - subtotal) * 100) / 100;

    let padreGestion = "PAGO";
    let tipoGestion = "PAGO";
    let idTipoTramite = 2; // Ínfima Cuantía por defecto

    let nroJuicio: string | null = null;
    let nroLiquidacion: string | null = null;

    if (i <= 10) {
      padreGestion = "PAGO";
      tipoGestion = "PAGO";
      idTipoTramite = ((i - 1) % 4) + 1; // 1, 2, 3, 4
    } else if (i <= 20) {
      padreGestion = "PAGO";
      tipoGestion = "JUSTIFICACION";
      idTipoTramite = 5; // Caja Chica o Reembolsos
    } else if (i <= 30) {
      padreGestion = "PAGO";
      tipoGestion = "EXPEDIENTE";
      idTipoTramite = 4; // Contratos directos o remuneraciones
    } else {
      // 31 a 40: GARANTIA
      padreGestion = "GARANTIA";
      idTipoTramite = 6; // Devolución y ejecución de garantías aduaneras
      const gIndex = i - 30;
      if (gIndex <= 2) {
        tipoGestion = "GARANTIA";
        nroLiquidacion = `LIQ-GAR-${202600 + i}`;
      } else if (gIndex <= 4) {
        tipoGestion = "JUICIO";
        nroJuicio = `09332-2025-${1000 + i}`;
        nroLiquidacion = `LIQ-JUD-${202600 + i}`;
      } else if (gIndex <= 6) {
        tipoGestion = "PAGO_INDEBIDO";
        nroLiquidacion = `RESOL-INDEB-${202600 + i}`;
      } else if (gIndex <= 8) {
        tipoGestion = "PROCESO_COACTIVO";
        nroJuicio = `COAC-SENAE-2026-${i}`;
      } else if (gIndex === 9) {
        tipoGestion = "REPARACION_ECONOMICA";
        nroJuicio = `SENT-REP-2025-${i}`;
      } else {
        tipoGestion = "SENTENCIA";
        nroJuicio = `09100-2024-${i}`;
        nroLiquidacion = `LIQ-SENT-${i}`;
      }
    }

    // Clasificación del estado final de este trámite:
    // Trámites 1 al 10: ARCHIVADOS PERFECTOS (Cumplieron SLA, sin demoras)
    // Trámites 11 al 20: ARCHIVADOS CON RETRASO / OBSERVACIONES / REASIGNACIONES (SLA vencido)
    // Trámites 21 al 24: INSUBSISTENTES (en Presupuesto)
    // Trámites 25 al 27: INGRESADOS en Secretaría (SLA no iniciado)
    // Trámites 28 al 31: En PRESUPUESTO (Revisión, Revisado, Factura)
    // Trámites 32 al 34: En CONTABILIDAD (Pendiente devengado)
    // Trámites 35 al 37: En DFI (Pendiente autorización)
    // Trámites 38 al 40: En TESORERIA (Pagados o en caja)

    let categoria = "";
    if (i <= 10) categoria = "PERFECTO_ARCHIVADO";
    else if (i <= 20) categoria = "RETRASO_OBSERVADO_ARCHIVADO";
    else if (i <= 24) categoria = "INSUBSISTENTE";
    else if (i <= 27) categoria = "SECRETARIA_INGRESADO";
    else if (i <= 31) categoria = "PRESUPUESTO_ACTIVO";
    else if (i <= 34) categoria = "CONTABILIDAD_ACTIVO";
    else if (i <= 37) categoria = "DFI_ACTIVO";
    else categoria = "TESORERIA_ACTIVO";

    tramitesData.push({
      index: i,
      codigoTramite: codTramite,
      numeroQuipux: numQuipux,
      padreGestion,
      tipoGestion,
      idTipoTramite,
      prov,
      areaReq,
      monto,
      subtotal,
      iva,
      nroJuicio,
      nroLiquidacion,
      categoria,
    });
  }

  console.log(`-> Estructurados ${tramitesData.length} trámites. Procediendo a insertar con bitácora...`);

  // Bucle de inserción con fechas coherentes y bitácora
  for (const t of tramitesData) {
    const { index, categoria, prov, areaReq, monto, subtotal, iva } = t;

    // Configuración base de fechas según categoría
    let fechaIngreso: Date;
    let fechaEntregaControlPrevio: Date | null = null;
    let idAreaActual = 1;
    let idCustodioActual = 2; // Lorena Zambrano
    let estadoGeneral = "INGRESADO";
    let subEstado = "RECEPCIONADO_DFI";
    let estaPausado = false;
    let motivoPausa: string | null = null;
    let diasPausaAcumulados = 0;
    let fechaPausa: Date | null = null;
    let fechaAprobacionPresupuesto: Date | null = null;
    let fechaAprobacionContabilidad: Date | null = null;
    let fechaAutorizacionPago: Date | null = null;
    let fechaPago: Date | null = null;
    let idCaja: number | null = null;
    let justificacionInsubsistencia: string | null = null;

    const itemPresupuestario = getCleanItem(index);
    const numFactura = `001-002-${String(100000 + index).padStart(9, "0")}`;
    const certPresupuestaria = `CERT-PRE-2026-${String(200 + index)}`;
    const curCompromiso = `789${String(100 + index)}`;
    const curDevengado = `890${String(200 + index)}`;

    const bitacoraEvents: Array<{
      deUsuario: number;
      aUsuario: number;
      deArea: number;
      aArea: number;
      accion: string;
      nota: string;
      fecha: Date;
    }> = [];

    // -------------------------------------------------------------
    // CATEGORÍA 1: 10 ARCHIVADOS PERFECTOS (1 a 10)
    // -------------------------------------------------------------
    if (categoria === "PERFECTO_ARCHIVADO") {
      // Iniciaron hace 60 días, tomaron 3 días hábiles
      const baseDaysAgo = 60 + index * 2;
      fechaIngreso = new Date(Date.now() - baseDaysAgo * 86400000);
      fechaEntregaControlPrevio = new Date(fechaIngreso.getTime() + 4 * 3600000); // 4 horas después
      
      const fPresupuesto = new Date(fechaEntregaControlPrevio.getTime() + 24 * 3600000);
      const fVistoBueno = new Date(fPresupuesto.getTime() + 4 * 3600000);
      const fContabilidad = new Date(fVistoBueno.getTime() + 24 * 3600000);
      const fDFI = new Date(fContabilidad.getTime() + 8 * 3600000);
      const fPago = new Date(fDFI.getTime() + 24 * 3600000); // Total ~3 días hábiles (SLA CUMPLIDO)
      const fArchivo = new Date(fPago.getTime() + 48 * 3600000);

      idAreaActual = 6; // Archivo Contable
      idCustodioActual = 10; // Sr. Manuel Ramos
      estadoGeneral = "ARCHIVO";
      subEstado = "ARCHIVADO_DEFINITIVO";
      idCaja = caja1.id_caja;

      fechaAprobacionPresupuesto = fVistoBueno;
      fechaAprobacionContabilidad = fContabilidad;
      fechaAutorizacionPago = fDFI;
      fechaPago = fPago;

      bitacoraEvents.push(
        { deUsuario: 2, aUsuario: 2, deArea: 1, aArea: 1, accion: "RECEPCION_DFI", nota: "Expediente físico recibido en ventanilla DFI.", fecha: fechaIngreso },
        { deUsuario: 2, aUsuario: 3, deArea: 1, aArea: 2, accion: "ENTREGA_CONTROL_PREVIO", nota: "Despachado a Control Previo Presupuesto.", fecha: fechaEntregaControlPrevio },
        { deUsuario: 3, aUsuario: 4, deArea: 2, aArea: 2, accion: "ASIGNACION_ANALISTA_PRESUPUESTO", nota: "Asignado a la analista Econ. Ana Belén Gómez.", fecha: fPresupuesto },
        { deUsuario: 4, aUsuario: 4, deArea: 2, aArea: 2, accion: "REGISTRO_DATOS_PRESUPUESTO", nota: `Item asignado: ${itemPresupuestario}, CUR Compromiso: ${curCompromiso}.`, fecha: fPresupuesto },
        { deUsuario: 3, aUsuario: 4, deArea: 2, aArea: 2, accion: "VISTO_BUENO_REVISADO", nota: "Visto bueno formal otorgado por Jefatura de Presupuesto.", fecha: fVistoBueno },
        { deUsuario: 4, aUsuario: 6, deArea: 2, aArea: 3, accion: "DERIVACION_A_CONTABILIDAD", nota: `Derivado a Contabilidad con Factura Nro: ${numFactura}.`, fecha: fVistoBueno },
        { deUsuario: 7, aUsuario: 7, deArea: 3, aArea: 3, accion: "REGISTRO_DEVENGADO_CONTABILIDAD", nota: `Devengado registrado exitosamente. CUR: ${curDevengado}.`, fecha: fContabilidad },
        { deUsuario: 6, aUsuario: 1, deArea: 3, aArea: 1, accion: "DERIVACION_A_DFI", nota: "Remitido a la Dirección Financiera para autorización de pago.", fecha: fContabilidad },
        { deUsuario: 1, aUsuario: 8, deArea: 1, aArea: 4, accion: "AUTORIZACION_PAGO_DIRECTORA", nota: "Pago autorizado. Se envía a Tesorería para emisión de transferencia SPI.", fecha: fDFI },
        { deUsuario: 8, aUsuario: 8, deArea: 4, aArea: 4, accion: "PAGO_TRANSFERENCIA_SPI", nota: "Transferencia SPI-BCE ejecutada con éxito. Lote MEF confirmado.", fecha: fPago },
        { deUsuario: 8, aUsuario: 10, deArea: 4, aArea: 6, accion: "INCORPORACION_CAJA", nota: `Expediente archivado e incorporado a la Caja SENAE-CAJA-2026-001.`, fecha: fArchivo }
      );
    }

    // -------------------------------------------------------------
    // CATEGORÍA 2: 10 ARCHIVADOS CON RETRASO / OBSERVADOS (11 a 20)
    // -------------------------------------------------------------
    else if (categoria === "RETRASO_OBSERVADO_ARCHIVADO") {
      // Iniciaron hace 40 días, tomaron 12 a 15 días hábiles (SLA VENCIDO)
      const baseDaysAgo = 45 + (index - 10) * 2;
      fechaIngreso = new Date(Date.now() - baseDaysAgo * 86400000);
      fechaEntregaControlPrevio = new Date(fechaIngreso.getTime() + 12 * 3600000);

      const fObservacion = new Date(fechaEntregaControlPrevio.getTime() + 48 * 3600000);
      const fLevantamiento = new Date(fObservacion.getTime() + 120 * 3600000); // 5 días observados
      const fReasignacion = new Date(fLevantamiento.getTime() + 24 * 3600000);
      const fVistoBueno = new Date(fReasignacion.getTime() + 48 * 3600000);
      const fContabilidad = new Date(fVistoBueno.getTime() + 72 * 3600000);
      const fDFI = new Date(fContabilidad.getTime() + 48 * 3600000);
      const fPago = new Date(fDFI.getTime() + 72 * 3600000); // Demorado > 10 días
      const fArchivo = new Date(fPago.getTime() + 24 * 3600000);

      idAreaActual = 6;
      idCustodioActual = 10;
      estadoGeneral = "ARCHIVO";
      subEstado = "ARCHIVADO_DEFINITIVO";
      idCaja = caja2.id_caja;

      fechaAprobacionPresupuesto = fVistoBueno;
      fechaAprobacionContabilidad = fContabilidad;
      fechaAutorizacionPago = fDFI;
      fechaPago = fPago;

      bitacoraEvents.push(
        { deUsuario: 2, aUsuario: 2, deArea: 1, aArea: 1, accion: "RECEPCION_DFI", nota: "Expediente recibido en ventanilla.", fecha: fechaIngreso },
        { deUsuario: 2, aUsuario: 3, deArea: 1, aArea: 2, accion: "ENTREGA_CONTROL_PREVIO", nota: "Entregado a Control Previo Presupuesto.", fecha: fechaEntregaControlPrevio },
        { deUsuario: 3, aUsuario: 5, deArea: 2, aArea: 2, accion: "ASIGNACION_ANALISTA_PRESUPUESTO", nota: "Asignado al analista Ing. David Paredes.", fecha: fObservacion },
        { deUsuario: 5, aUsuario: 5, deArea: 2, aArea: 2, accion: "OBSERVAR_TRAMITE", nota: "Observación: Falta informe técnico del administrador de contrato y desglose de retenciones.", fecha: fObservacion },
        { deUsuario: 5, aUsuario: 5, deArea: 2, aArea: 2, accion: "LEVANTAR_OBSERVACION", nota: "Observación subsanada. Se adjuntó alcance Quipux con informe firmado.", fecha: fLevantamiento },
        { deUsuario: 3, aUsuario: 4, deArea: 2, aArea: 2, accion: "REASIGNACION_CUSTODIO", nota: "Reasignado a Econ. Ana Belén Gómez por redistribución de carga laboral.", fecha: fReasignacion },
        { deUsuario: 3, aUsuario: 4, deArea: 2, aArea: 2, accion: "VISTO_BUENO_REVISADO", nota: "Visto bueno REVISADO emitido con retraso tras subsanación.", fecha: fVistoBueno },
        { deUsuario: 4, aUsuario: 6, deArea: 2, aArea: 3, accion: "DERIVACION_A_CONTABILIDAD", nota: `Derivado a Contabilidad con Factura Nro: ${numFactura}.`, fecha: fVistoBueno },
        { deUsuario: 7, aUsuario: 7, deArea: 3, aArea: 3, accion: "REGISTRO_DEVENGADO_CONTABILIDAD", nota: `Devengado registrado. CUR: ${curDevengado}.`, fecha: fContabilidad },
        { deUsuario: 6, aUsuario: 1, deArea: 3, aArea: 1, accion: "DERIVACION_A_DFI", nota: "Remitido a Dirección Financiera.", fecha: fContabilidad },
        { deUsuario: 1, aUsuario: 8, deArea: 1, aArea: 4, accion: "AUTORIZACION_PAGO_DIRECTORA", nota: "Autorizado por Directora Financiera.", fecha: fDFI },
        { deUsuario: 8, aUsuario: 8, deArea: 4, aArea: 4, accion: "PAGO_TRANSFERENCIA_SPI", nota: "Transferencia SPI-BCE completada tras resolución de observaciones.", fecha: fPago },
        { deUsuario: 8, aUsuario: 10, deArea: 4, aArea: 6, accion: "INCORPORACION_CAJA", nota: `Expediente archivado en Caja SENAE-CAJA-2026-002 con auditoría de novedades.`, fecha: fArchivo }
      );
    }

    // -------------------------------------------------------------
    // CATEGORÍA 3: 4 INSUBSISTENTES (21 a 24)
    // -------------------------------------------------------------
    else if (categoria === "INSUBSISTENTE") {
      const baseDaysAgo = 20 + index;
      fechaIngreso = new Date(Date.now() - baseDaysAgo * 86400000);
      fechaEntregaControlPrevio = new Date(fechaIngreso.getTime() + 8 * 3600000);
      const fInsubsistente = new Date(fechaEntregaControlPrevio.getTime() + 48 * 3600000);

      idAreaActual = 2; // Presupuesto
      idCustodioActual = 3; // Ing. Carlos Mendoza
      estadoGeneral = "INSUBSISTENTE";
      subEstado = "DECLARADO_INSUBSISTENTE";
      justificacionInsubsistencia = `Trámite declarado insubsistente por causal insubsanable: Incumplimiento de la cláusula de vigencia presupuestaria en el contrato Nro. CONTR-2025-${index}. No procede el pago institucional.`;

      bitacoraEvents.push(
        { deUsuario: 2, aUsuario: 2, deArea: 1, aArea: 1, accion: "RECEPCION_DFI", nota: "Expediente ingresado en ventanilla.", fecha: fechaIngreso },
        { deUsuario: 2, aUsuario: 3, deArea: 1, aArea: 2, accion: "ENTREGA_CONTROL_PREVIO", nota: "Despachado a Control Previo Presupuesto.", fecha: fechaEntregaControlPrevio },
        { deUsuario: 3, aUsuario: 4, deArea: 2, aArea: 2, accion: "ASIGNACION_ANALISTA_PRESUPUESTO", nota: "Asignado para verificación presupuestaria.", fecha: fechaEntregaControlPrevio },
        { deUsuario: 3, aUsuario: 3, deArea: 2, aArea: 2, accion: "DECLARAR_INSUBSISTENTE", nota: justificacionInsubsistencia, fecha: fInsubsistente }
      );
    }

    // -------------------------------------------------------------
    // CATEGORÍA 4: 3 EN SECRETARÍA DFI (25 a 27) -> SLA NO_INICIADO
    // -------------------------------------------------------------
    else if (categoria === "SECRETARIA_INGRESADO") {
      fechaIngreso = new Date(Date.now() - (index - 24) * 3600000 * 5); // Hace pocas horas
      fechaEntregaControlPrevio = null; // Aún en ventanilla, SLA NO INICIADO

      idAreaActual = 1;
      idCustodioActual = 2; // Lorena Zambrano
      estadoGeneral = "INGRESADO";
      subEstado = "RECEPCIONADO_DFI";

      bitacoraEvents.push({
        deUsuario: 2,
        aUsuario: 2,
        deArea: 1,
        aArea: 1,
        accion: "RECEPCION_DFI",
        nota: "Expediente físico recibido en Secretaría DFI. Pendiente de entrega por lote a Control Previo.",
        fecha: fechaIngreso,
      });
    }

    // -------------------------------------------------------------
    // CATEGORÍA 5: 4 EN PRESUPUESTO (28 a 31)
    // -------------------------------------------------------------
    else if (categoria === "PRESUPUESTO_ACTIVO") {
      const pIndex = index - 27;
      fechaIngreso = new Date(Date.now() - (pIndex + 2) * 86400000);
      fechaEntregaControlPrevio = new Date(fechaIngreso.getTime() + 6 * 3600000);

      idAreaActual = 2;

      if (pIndex === 1) {
        // En REVISION con Ana Belén Gómez
        idCustodioActual = 4;
        estadoGeneral = "REVISION";
        subEstado = "EN_REVISION_ANALISTA";
        bitacoraEvents.push(
          { deUsuario: 2, aUsuario: 2, deArea: 1, aArea: 1, accion: "RECEPCION_DFI", nota: "Ingresado en ventanilla.", fecha: fechaIngreso },
          { deUsuario: 2, aUsuario: 3, deArea: 1, aArea: 2, accion: "ENTREGA_CONTROL_PREVIO", nota: "Entregado a Control Previo Presupuesto.", fecha: fechaEntregaControlPrevio },
          { deUsuario: 3, aUsuario: 4, deArea: 2, aArea: 2, accion: "ASIGNACION_ANALISTA_PRESUPUESTO", nota: "Asignado a Econ. Ana Belén Gómez.", fecha: new Date(fechaEntregaControlPrevio.getTime() + 2 * 3600000) }
        );
      } else if (pIndex === 2) {
        // En REVISION con David Paredes
        idCustodioActual = 5;
        estadoGeneral = "REVISION";
        subEstado = "EN_REVISION_ANALISTA";
        bitacoraEvents.push(
          { deUsuario: 2, aUsuario: 2, deArea: 1, aArea: 1, accion: "RECEPCION_DFI", nota: "Ingresado en ventanilla.", fecha: fechaIngreso },
          { deUsuario: 2, aUsuario: 3, deArea: 1, aArea: 2, accion: "ENTREGA_CONTROL_PREVIO", nota: "Entregado a Control Previo Presupuesto.", fecha: fechaEntregaControlPrevio },
          { deUsuario: 3, aUsuario: 5, deArea: 2, aArea: 2, accion: "ASIGNACION_ANALISTA_PRESUPUESTO", nota: "Asignado a Ing. David Paredes.", fecha: new Date(fechaEntregaControlPrevio.getTime() + 2 * 3600000) }
        );
      } else if (pIndex === 3) {
        // REVISADO (con visto bueno de Jefatura, pendiente de Contabilidad)
        idCustodioActual = 4;
        estadoGeneral = "REVISADO";
        subEstado = "VISTO_BUENO_REVISADO";
        fechaAprobacionPresupuesto = new Date();
        bitacoraEvents.push(
          { deUsuario: 2, aUsuario: 2, deArea: 1, aArea: 1, accion: "RECEPCION_DFI", nota: "Ingresado en ventanilla.", fecha: fechaIngreso },
          { deUsuario: 2, aUsuario: 3, deArea: 1, aArea: 2, accion: "ENTREGA_CONTROL_PREVIO", nota: "Entregado a Presupuesto.", fecha: fechaEntregaControlPrevio },
          { deUsuario: 3, aUsuario: 4, deArea: 2, aArea: 2, accion: "ASIGNACION_ANALISTA_PRESUPUESTO", nota: "Asignado a Econ. Ana Belén Gómez.", fecha: new Date(fechaEntregaControlPrevio.getTime() + 2 * 3600000) },
          { deUsuario: 3, aUsuario: 4, deArea: 2, aArea: 2, accion: "VISTO_BUENO_REVISADO", nota: "Visto bueno formal otorgado por Jefa de Presupuesto.", fecha: new Date() }
        );
      } else {
        // FACTURA (En espera de factura SRI, pausado)
        idCustodioActual = 4;
        estadoGeneral = "FACTURA";
        subEstado = "ESPERA_FACTURA_TRIBUTARIA";
        estaPausado = true;
        motivoPausa = "En espera de emisión de factura electrónica autorizada por el SRI.";
        fechaPausa = new Date(Date.now() - 48 * 3600000);
        bitacoraEvents.push(
          { deUsuario: 2, aUsuario: 2, deArea: 1, aArea: 1, accion: "RECEPCION_DFI", nota: "Ingresado en ventanilla.", fecha: fechaIngreso },
          { deUsuario: 2, aUsuario: 3, deArea: 1, aArea: 2, accion: "ENTREGA_CONTROL_PREVIO", nota: "Entregado a Presupuesto.", fecha: fechaEntregaControlPrevio },
          { deUsuario: 4, aUsuario: 4, deArea: 2, aArea: 2, accion: "PAUSA_FACTURA", nota: motivoPausa, fecha: fechaPausa }
        );
      }
    }

    // -------------------------------------------------------------
    // CATEGORÍA 6: 3 EN CONTABILIDAD (32 a 34)
    // -------------------------------------------------------------
    else if (categoria === "CONTABILIDAD_ACTIVO") {
      const cIndex = index - 31;
      fechaIngreso = new Date(Date.now() - (cIndex + 3) * 86400000);
      fechaEntregaControlPrevio = new Date(fechaIngreso.getTime() + 6 * 3600000);
      const fPresupuesto = new Date(fechaEntregaControlPrevio.getTime() + 24 * 3600000);

      idAreaActual = 3; // Contabilidad
      idCustodioActual = cIndex === 1 ? 6 : 7; // Sergio Lindao o Mariana Torres
      estadoGeneral = "CONTABILIDAD";
      subEstado = "EN_REVISION_CONTABLE";
      fechaAprobacionPresupuesto = fPresupuesto;

      bitacoraEvents.push(
        { deUsuario: 2, aUsuario: 2, deArea: 1, aArea: 1, accion: "RECEPCION_DFI", nota: "Ingresado en ventanilla.", fecha: fechaIngreso },
        { deUsuario: 2, aUsuario: 3, deArea: 1, aArea: 2, accion: "ENTREGA_CONTROL_PREVIO", nota: "Entregado a Presupuesto.", fecha: fechaEntregaControlPrevio },
        { deUsuario: 3, aUsuario: 4, deArea: 2, aArea: 2, accion: "VISTO_BUENO_REVISADO", nota: "Presupuesto aprobado.", fecha: fPresupuesto },
        { deUsuario: 4, aUsuario: idCustodioActual, deArea: 2, aArea: 3, accion: "DERIVACION_A_CONTABILIDAD", nota: `Derivado a Contabilidad con Factura Nro: ${numFactura}.`, fecha: fPresupuesto }
      );
    }

    // -------------------------------------------------------------
    // CATEGORÍA 7: 3 EN DFI (35 a 37) -> Pendientes de Autorización
    // -------------------------------------------------------------
    else if (categoria === "DFI_ACTIVO") {
      const dIndex = index - 34;
      fechaIngreso = new Date(Date.now() - (dIndex + 4) * 86400000);
      fechaEntregaControlPrevio = new Date(fechaIngreso.getTime() + 6 * 3600000);
      const fPresupuesto = new Date(fechaEntregaControlPrevio.getTime() + 24 * 3600000);
      const fContabilidad = new Date(fPresupuesto.getTime() + 24 * 3600000);

      idAreaActual = 1; // Dirección Financiera
      idCustodioActual = 1; // Dra. Patricia Morales
      estadoGeneral = "DFI";
      subEstado = "PENDIENTE_AUTORIZACION_DFI";
      fechaAprobacionPresupuesto = fPresupuesto;
      fechaAprobacionContabilidad = fContabilidad;

      bitacoraEvents.push(
        { deUsuario: 2, aUsuario: 2, deArea: 1, aArea: 1, accion: "RECEPCION_DFI", nota: "Ingresado en ventanilla.", fecha: fechaIngreso },
        { deUsuario: 2, aUsuario: 3, deArea: 1, aArea: 2, accion: "ENTREGA_CONTROL_PREVIO", nota: "Entregado a Presupuesto.", fecha: fechaEntregaControlPrevio },
        { deUsuario: 3, aUsuario: 4, deArea: 2, aArea: 2, accion: "VISTO_BUENO_REVISADO", nota: "Presupuesto aprobado.", fecha: fPresupuesto },
        { deUsuario: 4, aUsuario: 7, deArea: 2, aArea: 3, accion: "DERIVACION_A_CONTABILIDAD", nota: `Aprobado con Factura Nro: ${numFactura}.`, fecha: fPresupuesto },
        { deUsuario: 7, aUsuario: 1, deArea: 3, aArea: 1, accion: "REGISTRO_DEVENGADO_CONTABILIDAD", nota: `Devengado registrado (CUR: ${curDevengado}). Remitido a Directora para autorización.`, fecha: fContabilidad }
      );
    }

    // -------------------------------------------------------------
    // CATEGORÍA 8: 3 EN TESORERÍA / CAJA (38 a 40)
    // -------------------------------------------------------------
    else {
      const tIndex = index - 37;
      fechaIngreso = new Date(Date.now() - (tIndex + 5) * 86400000);
      fechaEntregaControlPrevio = new Date(fechaIngreso.getTime() + 6 * 3600000);
      const fPresupuesto = new Date(fechaEntregaControlPrevio.getTime() + 24 * 3600000);
      const fContabilidad = new Date(fPresupuesto.getTime() + 24 * 3600000);
      const fDFI = new Date(fContabilidad.getTime() + 12 * 3600000);
      const fPago = new Date(fDFI.getTime() + 12 * 3600000);

      idAreaActual = 4; // Tesorería
      idCustodioActual = 8; // Econ. Margarita Alarcón
      fechaAprobacionPresupuesto = fPresupuesto;
      fechaAprobacionContabilidad = fContabilidad;
      fechaAutorizacionPago = fDFI;
      fechaPago = fPago;

      if (tIndex === 1) {
        // Pagado por SPI, pendiente de empaque en caja
        estadoGeneral = "PAGADO";
        subEstado = "PAGO_TRANSFERENCIA_SPI";
      } else {
        // En caja abierta
        estadoGeneral = "CAJA";
        subEstado = "EN_CAJA";
        idCaja = cajaAbierta.id_caja;
      }

      bitacoraEvents.push(
        { deUsuario: 2, aUsuario: 2, deArea: 1, aArea: 1, accion: "RECEPCION_DFI", nota: "Ingresado en ventanilla.", fecha: fechaIngreso },
        { deUsuario: 2, aUsuario: 3, deArea: 1, aArea: 2, accion: "ENTREGA_CONTROL_PREVIO", nota: "Entregado a Presupuesto.", fecha: fechaEntregaControlPrevio },
        { deUsuario: 3, aUsuario: 4, deArea: 2, aArea: 2, accion: "VISTO_BUENO_REVISADO", nota: "Presupuesto aprobado.", fecha: fPresupuesto },
        { deUsuario: 4, aUsuario: 7, deArea: 2, aArea: 3, accion: "DERIVACION_A_CONTABILIDAD", nota: `Aprobado con Factura Nro: ${numFactura}.`, fecha: fPresupuesto },
        { deUsuario: 7, aUsuario: 1, deArea: 3, aArea: 1, accion: "REGISTRO_DEVENGADO_CONTABILIDAD", nota: `Devengado registrado (CUR: ${curDevengado}).`, fecha: fContabilidad },
        { deUsuario: 1, aUsuario: 8, deArea: 1, aArea: 4, accion: "AUTORIZACION_PAGO_DIRECTORA", nota: "Pago autorizado por Directora Financiera.", fecha: fDFI },
        { deUsuario: 8, aUsuario: 8, deArea: 4, aArea: 4, accion: "PAGO_TRANSFERENCIA_SPI", nota: "Transferencia SPI-BCE ejecutada con éxito.", fecha: fPago }
      );

      if (tIndex > 1) {
        bitacoraEvents.push({
          deUsuario: 8,
          aUsuario: 8,
          deArea: 4,
          aArea: 4,
          accion: "INCORPORACION_CAJA",
          nota: `Incorporado a la Caja Abierta SENAE-CAJA-2026-003.`,
          fecha: new Date(),
        });
      }
    }

    // Inserción del trámite
    const tramiteCreado = await prisma.tramites.create({
      data: {
        codigo_tramite: t.codigoTramite,
        numero_quipux: t.numeroQuipux,
        fecha_memorando: fechaIngreso,
        fecha_recepcion_fisica: fechaIngreso,
        id_tipo_tramite: t.idTipoTramite,
        tipo_flujo: t.padreGestion,
        padre_gestion: t.padreGestion,
        tipo_gestion: t.tipoGestion,
        area_requirente: areaReq,
        asunto: `Gestión de ${t.padreGestion} - ${t.tipoGestion}: ${prov.nombre} para ${areaReq}`,
        nro_tramite: `PROC-${202600 + index}`,
        periodo_pago: "MENSUAL_2026",
        proveedor_beneficiario: prov.nombre,
        ruc_proveedor: prov.ruc,
        monto_total: monto,
        subtotal: subtotal,
        monto_iva: iva,
        numero_cur_compromiso: curCompromiso,
        numero_cur_devengado: curDevengado,
        numero_juicio: t.nroJuicio,
        numero_liquidacion: t.nroLiquidacion,
        aprobado_presupuesto: !!fechaAprobacionPresupuesto,
        fecha_aprobacion_presupuesto: fechaAprobacionPresupuesto,
        id_usuario_aprobador_presupuesto: fechaAprobacionPresupuesto ? 3 : null,
        id_analista_presupuesto_previo: 4,
        aprobado_contabilidad: !!fechaAprobacionContabilidad,
        fecha_aprobacion_contabilidad: fechaAprobacionContabilidad,
        id_usuario_aprobador_contabilidad: fechaAprobacionContabilidad ? 6 : null,
        autorizado_pago: !!fechaAutorizacionPago,
        fecha_autorizacion_pago: fechaAutorizacionPago,
        id_usuario_autoriza_pago: fechaAutorizacionPago ? 1 : null,
        fecha_pago: fechaPago,
        comprobante_pago: fechaPago ? `SPI-BCE-${202600 + index}` : null,
        certificacion_presupuestaria: certPresupuestaria,
        item_presupuestario: itemPresupuestario,
        numero_factura: numFactura,
        id_area_actual: idAreaActual,
        id_custodio_actual: idCustodioActual,
        estado_general: estadoGeneral,
        sub_estado: subEstado,
        fecha_entrega_control_previo: fechaEntregaControlPrevio,
        justificacion_insubsistencia: justificacionInsubsistencia,
        esta_pausado: estaPausado,
        motivo_pausa: motivoPausa,
        fecha_pausa: fechaPausa,
        dias_pausa_acumulados: diasPausaAcumulados,
        id_caja: idCaja,
        fojas_fisicas: 35 + (index % 25),
        fecha_ingreso: fechaIngreso,
        fecha_ultimo_movimiento: bitacoraEvents[bitacoraEvents.length - 1]?.fecha || fechaIngreso,
        fecha_ultima_modificacion: bitacoraEvents[bitacoraEvents.length - 1]?.fecha || fechaIngreso,
      },
    });

    // Inserción de bitácora
    for (const b of bitacoraEvents) {
      await prisma.historial_movimientos.create({
        data: {
          id_tramite: tramiteCreado.id_tramite,
          id_usuario_entrega: b.deUsuario,
          id_usuario_recibe: b.aUsuario,
          id_area_origen: b.deArea,
          id_area_destino: b.aArea,
          tipo_accion: b.accion,
          comentarios: b.nota,
          fecha_hora: b.fecha,
        },
      });
    }
  }

  console.log("==================================================================");
  console.log("CARGA COMPLETADA CON ÉXITO: 40 TRÁMITES INSTITUCIONALES");
  console.log("- 10 PAGO PAGO");
  console.log("- 10 PAGO JUSTIFICACION");
  console.log("- 10 PAGO EXPEDIENTE");
  console.log("- 10 GARANTIA (repartidos entre subtipos)");
  console.log("- 20 Finalizados (10 perfectos cumplimiento SLA + 10 con novedades/retraso)");
  console.log("- 4 Insubsistentes en Presupuesto");
  console.log("- 16 En camino (Secretaría, Presupuesto, Contabilidad, DFI, Tesorería)");
  console.log("==================================================================");
}

main()
  .catch((e) => {
    console.error("Error al ejecutar seed_40_tramites:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
