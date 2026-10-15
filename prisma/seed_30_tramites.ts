import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function seed30Tramites() {
  console.log("Iniciando limpieza de tablas transaccionales...");

  await prisma.historial_movimientos.deleteMany({});
  await prisma.observaciones.deleteMany({});
  await prisma.tramite_referencias.deleteMany({});
  await prisma.solicitudes_devolucion.deleteMany({});
  await prisma.tramites.deleteMany({});
  await prisma.cajas.deleteMany({});

  console.log("Base de datos limpia.");

  // Usuarios disponibles:
  // 1: Dra. Patricia Morales (DIRECTORA - DFI)
  // 2: Lorena Zambrano (SECRETARIA - DFI)
  // 3: Ing. Carlos Mendoza (JEFE - PRESUPUESTO)
  // 4: Econ. Ana Belén Gómez (ANALISTA - PRESUPUESTO)
  // 5: Ing. David Paredes (ANALISTA - PRESUPUESTO)
  // 6: CPA. Sergio Lindao (JEFE - CONTABILIDAD)
  // 7: CPA. Mariana Torres (ANALISTA - CONTABILIDAD)
  // 8: Econ. Margarita Alarcón (JEFE - TESORERIA)
  // 9: Abg. Roberto Intriago (ANALISTA - COBRANZAS)
  // 10: Sr. Manuel Ramos (ANALISTA - ARCHIVO)
  // 11: Ing. Administrador de Sistemas (ADMIN - DFI)

  // Crear una caja para los trámites archivados
  const caja1 = await prisma.cajas.create({
    data: {
      id_caja: 1,
      codigo_caja: "CAJA-2026-001",
      nombre: "CAJA PRINCIPAL DAF - SERVICIOS BÁSICOS Y ADQUISICIONES SEPTIEMBRE 2026",
      estado: "ABIERTA",
      fecha_creacion: new Date("2026-10-05T09:00:00"),
      id_usuario_creacion: 8, // Margarita Alarcón
      observaciones: "Expedientes liquidados correspondientes al período fiscal septiembre 2026 para custodia oficial.",
    },
  });

  console.log("Caja creada:", caja1.codigo_caja);

  // 30 trámites realistas
  const tramitesData = [
    // --- GRUPO 1: INGRESADO (5 trámites) ---
    {
      id: 301,
      quipux: "SENAE-DAF-2026-1510-M",
      tipo: 1, // Servicios básicos
      areaReq: "ADMINISTRATIVO FINANCIERO ESMM",
      asunto: "Servicio de agua potable y saneamiento campamento San Lorenzo",
      beneficiario: "EMPRESA PUBLICA DE AGUA POTABLE ESMERALDAS EPMAPSE",
      ruc: "0860001230001",
      monto: 1850.00,
      hojas: 18,
      estado: "INGRESADO",
      subEstado: "RECEPCIONADO_DFI",
      areaActual: 1,
      custodio: 2, // Lorena Zambrano
      fecIngreso: "2026-10-12T08:30:00",
      movs: [
        { fecha: "2026-10-12T08:30:00", de: 2, a: 2, deArea: 1, aArea: 1, accion: "INGRESO_EXPEDIENTE", nota: "Expediente físico recibido en ventanilla de Secretaría DFI con memorando original y anexos de respaldo." },
      ]
    },
    {
      id: 302,
      quipux: "SENAE-DIT-2026-1522-M",
      tipo: 3, // Procesos de contratación
      areaReq: "TECNOLOGÍA DE LA INFORMACIÓN",
      asunto: "Soporte y licenciamiento anual para cortafuegos perimetrales Fortigate",
      beneficiario: "FORTINET SOLUTIONS ECUADOR S.A.",
      ruc: "1791829384001",
      monto: 28500.00,
      hojas: 45,
      estado: "INGRESADO",
      subEstado: "RECEPCIONADO_DFI",
      areaActual: 1,
      custodio: 2,
      fecIngreso: "2026-10-12T09:15:00",
      movs: [
        { fecha: "2026-10-12T09:15:00", de: 2, a: 2, deArea: 1, aArea: 1, accion: "INGRESO_EXPEDIENTE", nota: "Recepción documental en secretaría DFI. Trámite de alta cuantía ingresado para control previo." },
      ]
    },
    {
      id: 303,
      quipux: "SENAE-DTH-2026-1530-M",
      tipo: 4, // Contrataciones directas DTH
      areaReq: "TALENTO HUMANO DTH",
      asunto: "Servicio de exámenes médicos ocupacionales y pruebas de laboratorio personal operativo",
      beneficiario: "LABORATORIOS CLINICOS ESPECIALIZADOS LABMED S.A.",
      ruc: "0992384729001",
      monto: 14200.00,
      hojas: 32,
      estado: "INGRESADO",
      subEstado: "RECEPCIONADO_DFI",
      areaActual: 1,
      custodio: 2,
      fecIngreso: "2026-10-12T10:45:00",
      movs: [
        { fecha: "2026-10-12T10:45:00", de: 2, a: 2, deArea: 1, aArea: 1, accion: "INGRESO_EXPEDIENTE", nota: "Recepción de expediente en Secretaría DFI. Documentación de soporte completa." },
      ]
    },
    {
      id: 304,
      quipux: "SENAE-DAF-2026-1535-M",
      tipo: 2, // Ínfima cuantía
      areaReq: "ADMINISTRATIVO GUAYAQUIL",
      asunto: "Adquisición de insumos de cafetería y limpieza para edificio matriz",
      beneficiario: "DISTRIBUIDORA COMERCIAL NACIONAL DISCOM S.A.",
      ruc: "0990145892001",
      monto: 3450.00,
      hojas: 20,
      estado: "INGRESADO",
      subEstado: "RECEPCIONADO_DFI",
      areaActual: 1,
      custodio: 2,
      fecIngreso: "2026-10-12T11:30:00",
      movs: [
        { fecha: "2026-10-12T11:30:00", de: 2, a: 2, deArea: 1, aArea: 1, accion: "INGRESO_EXPEDIENTE", nota: "Ingreso por ventanilla. Facturas físicas y orden de compra adjuntas." },
      ]
    },
    {
      id: 305,
      quipux: "SENAE-DNVA-2026-1540-M",
      tipo: 8, // Viáticos
      areaReq: "DIRECCION NACIONAL DE VIGILANCIA ADUANERA",
      asunto: "Liquidación de viáticos y subsistencias comisión operativa frontera sur Huaquillas",
      beneficiario: "SUBT. ERICK JOAO ALVAREZ ZAMBRANO",
      ruc: "0704938291001",
      monto: 890.00,
      hojas: 12,
      estado: "INGRESADO",
      subEstado: "RECEPCIONADO_DFI",
      areaActual: 1,
      custodio: 2,
      fecIngreso: "2026-10-12T14:00:00",
      movs: [
        { fecha: "2026-10-12T14:00:00", de: 2, a: 2, deArea: 1, aArea: 1, accion: "INGRESO_EXPEDIENTE", nota: "Recepción de informe de comisión de servicios, pases a bordo y facturas de hospedaje/alimentación." },
      ]
    },

    // --- GRUPO 2: REVISION (PRESUPUESTO) (7 trámites) ---
    {
      id: 306,
      quipux: "SENAE-DAF-2026-1402-M",
      tipo: 1, // Servicios básicos
      areaReq: "ADMINISTRATIVO FINANCIERO UIO",
      asunto: "Servicio de energía eléctrica subestación Tababela y bodegas aduaneras",
      beneficiario: "EMPRESA ELECTRICA QUITO S.A. EEQ",
      ruc: "1790053881001",
      monto: 7890.50,
      hojas: 24,
      estado: "REVISION",
      subEstado: "ASIGNADO_A_ECON._ANA_BELEN_GOMEZ",
      areaActual: 2,
      custodio: 4, // Ana Belén Gómez
      fecIngreso: "2026-10-08T09:00:00",
      movs: [
        { fecha: "2026-10-08T09:00:00", de: 2, a: 2, deArea: 1, aArea: 1, accion: "INGRESO_EXPEDIENTE", nota: "Ingreso en Secretaría DFI." },
        { fecha: "2026-10-08T15:00:00", de: 2, a: 3, deArea: 1, aArea: 2, accion: "ENTREGA_CONTROL_PREVIO", nota: "Expediente entregado físicamente a Control Previo (Presupuesto) con Acta de Entrega-Recepción." },
        { fecha: "2026-10-09T08:30:00", de: 3, a: 4, deArea: 2, aArea: 2, accion: "ASIGNAR_ANALISTA_PRESUPUESTO", nota: "Asignado a la analista Econ. Ana Belén Gómez para revisión de partida y compromiso presupuestario." },
      ]
    },
    {
      id: 307,
      quipux: "SENAE-DIT-2026-1410-M",
      tipo: 3, // Contratación pública
      areaReq: "TECNOLOGÍA DE LA INFORMACIÓN",
      asunto: "Servicio de enlaces de datos y fibra óptica redundante para distrito Manta y Esmeraldas",
      beneficiario: "TELCONET S.A.",
      ruc: "0991316467001",
      monto: 16400.00,
      hojas: 56,
      estado: "REVISION",
      subEstado: "ASIGNADO_A_ING._DAVID_PAREDES",
      areaActual: 2,
      custodio: 5, // David Paredes
      fecIngreso: "2026-10-08T10:30:00",
      movs: [
        { fecha: "2026-10-08T10:30:00", de: 2, a: 2, deArea: 1, aArea: 1, accion: "INGRESO_EXPEDIENTE", nota: "Recepción de informe técnico y facturas." },
        { fecha: "2026-10-08T16:00:00", de: 2, a: 3, deArea: 1, aArea: 2, accion: "ENTREGA_CONTROL_PREVIO", nota: "Entrega física a Presupuesto." },
        { fecha: "2026-10-09T09:00:00", de: 3, a: 5, deArea: 2, aArea: 2, accion: "ASIGNAR_ANALISTA_PRESUPUESTO", nota: "Asignado a Ing. David Paredes para verificación de certificación POA y disponibilidad presupuestaria." },
      ]
    },
    {
      id: 308,
      quipux: "SENAE-DTH-2026-1415-M",
      tipo: 8, // Viáticos
      areaReq: "TALENTO HUMANO DTH",
      asunto: "Viáticos comisión técnica de aforo conjunto puerto marítimo Guayaquil",
      beneficiario: "ING. CARMEN SOFIA ANDRADE PEÑA",
      ruc: "0918273645001",
      monto: 650.00,
      hojas: 15,
      estado: "REVISION",
      subEstado: "ASIGNADO_A_ECON._ANA_BELEN_GOMEZ",
      areaActual: 2,
      custodio: 4,
      fecIngreso: "2026-10-09T08:00:00",
      movs: [
        { fecha: "2026-10-09T08:00:00", de: 2, a: 2, deArea: 1, aArea: 1, accion: "INGRESO_EXPEDIENTE", nota: "Ingreso secretaría DFI." },
        { fecha: "2026-10-09T14:30:00", de: 2, a: 3, deArea: 1, aArea: 2, accion: "ENTREGA_CONTROL_PREVIO", nota: "Despacho a Presupuesto por lote." },
        { fecha: "2026-10-10T09:00:00", de: 3, a: 4, deArea: 2, aArea: 2, accion: "ASIGNAR_ANALISTA_PRESUPUESTO", nota: "Asignación a Econ. Ana Belén Gómez para revisión de escala arancelaria de viáticos." },
      ]
    },
    {
      id: 309,
      quipux: "SENAE-DAF-2026-1422-M",
      tipo: 2, // Ínfima cuantía
      areaReq: "ADMINISTRATIVO MATRIZ",
      asunto: "Mantenimiento correctivo y preventivo de ascensores edificio financiero matriz",
      beneficiario: "ELEVADORES Y SERVICIOS OTIS ECUADOR CIA. LTDA.",
      ruc: "1790014282001",
      monto: 4980.00,
      hojas: 28,
      estado: "REVISION",
      subEstado: "ASIGNADO_A_ING._DAVID_PAREDES",
      areaActual: 2,
      custodio: 5,
      fecIngreso: "2026-10-09T10:00:00",
      movs: [
        { fecha: "2026-10-09T10:00:00", de: 2, a: 2, deArea: 1, aArea: 1, accion: "INGRESO_EXPEDIENTE", nota: "Recepción en Secretaría DFI." },
        { fecha: "2026-10-09T15:00:00", de: 2, a: 3, deArea: 1, aArea: 2, accion: "ENTREGA_CONTROL_PREVIO", nota: "Entrega a Control Previo." },
        { fecha: "2026-10-10T10:30:00", de: 3, a: 5, deArea: 2, aArea: 2, accion: "ASIGNAR_ANALISTA_PRESUPUESTO", nota: "Asignado a Ing. David Paredes para análisis presupuestario." },
      ]
    },
    {
      id: 310,
      quipux: "SENAE-DNVA-2026-1428-M",
      tipo: 2, // Ínfima cuantía
      areaReq: "VIGILANCIA ADUANERA",
      asunto: "Mantenimiento y repuestos para camionetas patrulleras distrito Tulcán",
      beneficiario: "AUTOMOTORES ANDINOS AUTOANDINA S.A.",
      ruc: "0490018273001",
      monto: 5890.00,
      hojas: 36,
      estado: "REVISION",
      subEstado: "ASIGNADO_A_ECON._ANA_BELEN_GOMEZ",
      areaActual: 2,
      custodio: 4,
      fecIngreso: "2026-10-10T09:30:00",
      movs: [
        { fecha: "2026-10-10T09:30:00", de: 2, a: 2, deArea: 1, aArea: 1, accion: "INGRESO_EXPEDIENTE", nota: "Ingreso por Secretaría DFI." },
        { fecha: "2026-10-10T14:00:00", de: 2, a: 3, deArea: 1, aArea: 2, accion: "ENTREGA_CONTROL_PREVIO", nota: "Despachado a Control Previo." },
        { fecha: "2026-10-11T09:00:00", de: 3, a: 4, deArea: 2, aArea: 2, accion: "ASIGNAR_ANALISTA_PRESUPUESTO", nota: "Asignación formal a Econ. Ana Belén Gómez." },
      ]
    },
    {
      id: 311,
      quipux: "SENAE-DIT-2026-1435-M",
      tipo: 3, // Contratación pública
      areaReq: "TECNOLOGÍA DE LA INFORMACIÓN",
      asunto: "Servicio de soporte y mantenimiento de base de datos Oracle E-Business Suite aduanera",
      beneficiario: "ORACLE DEL ECUADOR S.A.",
      ruc: "1791283746001",
      monto: 42000.00,
      hojas: 68,
      estado: "REVISION",
      subEstado: "ASIGNADO_A_ING._DAVID_PAREDES",
      areaActual: 2,
      custodio: 5,
      fecIngreso: "2026-10-10T11:00:00",
      movs: [
        { fecha: "2026-10-10T11:00:00", de: 2, a: 2, deArea: 1, aArea: 1, accion: "INGRESO_EXPEDIENTE", nota: "Ingreso en Secretaría DFI con informe de necesidad institucional." },
        { fecha: "2026-10-10T16:00:00", de: 2, a: 3, deArea: 1, aArea: 2, accion: "ENTREGA_CONTROL_PREVIO", nota: "Despacho a Presupuesto." },
        { fecha: "2026-10-11T10:00:00", de: 3, a: 5, deArea: 2, aArea: 2, accion: "ASIGNAR_ANALISTA_PRESUPUESTO", nota: "Asignado a Ing. David Paredes para control de partida plurianual." },
      ]
    },
    {
      id: 312,
      quipux: "SENAE-DAF-2026-1440-M",
      tipo: 1, // Servicios básicos
      areaReq: "ADMINISTRATIVO CUENCA",
      asunto: "Servicio de agua potable y alcantarillado distrito Cuenca y aeropuerto",
      beneficiario: "EMPRESA PUBLICA MUNICIPAL DE TELECOMUNICACIONES AGUA POTABLE ETAPA EP",
      ruc: "0160000270001",
      monto: 1420.00,
      hojas: 16,
      estado: "REVISION",
      subEstado: "EN_REVISION_PRESUPUESTO",
      areaActual: 2,
      custodio: 3, // Jefe de Presupuesto Carlos Mendoza
      fecIngreso: "2026-10-11T08:30:00",
      movs: [
        { fecha: "2026-10-11T08:30:00", de: 2, a: 2, deArea: 1, aArea: 1, accion: "INGRESO_EXPEDIENTE", nota: "Ingreso secretaría DFI." },
        { fecha: "2026-10-11T12:00:00", de: 2, a: 3, deArea: 1, aArea: 2, accion: "ENTREGA_CONTROL_PREVIO", nota: "Entregado a Ing. Carlos Mendoza. En bandeja para distribución de carga." },
      ]
    },

    // --- GRUPO 3: FACTURA (EN PAUSA SRI) (4 trámites) ---
    {
      id: 313,
      quipux: "SENAE-DAF-2026-1301-M",
      tipo: 2, // Ínfima cuantía
      areaReq: "ADMINISTRATIVO MATRIZ",
      asunto: "Adquisición de cartuchos de tóner y suministros de impresión para distritos aduaneros",
      beneficiario: "SUMINISTROS Y TECNOLOGIA CORPORATIVA SUMITEC S.A.",
      ruc: "0992348571001",
      monto: 6200.00,
      hojas: 30,
      estado: "FACTURA",
      subEstado: "ESPERA_FACTURA_TRIBUTARIA",
      estaPausado: true,
      motivoPausa: "En espera de emisión de factura electrónica autorizada por el SRI correspondiente a la orden de compra Nro. 2026-088.",
      fechaPausa: "2026-10-06T11:00:00",
      areaActual: 2,
      custodio: 4, // Ana Belén Gómez
      fecIngreso: "2026-10-04T09:00:00",
      movs: [
        { fecha: "2026-10-04T09:00:00", de: 2, a: 2, deArea: 1, aArea: 1, accion: "INGRESO_EXPEDIENTE", nota: "Ingreso formal en DFI." },
        { fecha: "2026-10-04T15:00:00", de: 2, a: 3, deArea: 1, aArea: 2, accion: "ENTREGA_CONTROL_PREVIO", nota: "Entregado a Presupuesto." },
        { fecha: "2026-10-05T09:30:00", de: 3, a: 4, deArea: 2, aArea: 2, accion: "ASIGNAR_ANALISTA_PRESUPUESTO", nota: "Asignado a Econ. Ana Belén Gómez." },
        { fecha: "2026-10-06T11:00:00", de: 4, a: 4, deArea: 2, aArea: 2, accion: "PAUSA_FACTURA", nota: "Control previo presupuestario revisado conforme. Trámite pausado por la analista Econ. Ana Belén Gómez en espera de la factura electrónica autorizada por el SRI." },
      ]
    },
    {
      id: 314,
      quipux: "SENAE-DIT-2026-1310-M",
      tipo: 3, // Contratación pública
      areaReq: "TECNOLOGÍA DE LA INFORMACIÓN",
      asunto: "Soporte de infraestructura de nube híbrida y almacenamiento masivo",
      beneficiario: "AMAZON WEB SERVICES ECUADOR CLOUD SERVICES S.A.S.",
      ruc: "1793182746001",
      monto: 31200.00,
      hojas: 40,
      estado: "FACTURA",
      subEstado: "ESPERA_FACTURA_TRIBUTARIA",
      estaPausado: true,
      motivoPausa: "Proveedor extranjero en proceso de emisión de invoice con retención tributaria fiscal nacional.",
      fechaPausa: "2026-10-07T14:30:00",
      areaActual: 2,
      custodio: 5, // David Paredes
      fecIngreso: "2026-10-05T10:00:00",
      movs: [
        { fecha: "2026-10-05T10:00:00", de: 2, a: 2, deArea: 1, aArea: 1, accion: "INGRESO_EXPEDIENTE", nota: "Ingreso en Secretaría DFI." },
        { fecha: "2026-10-05T16:00:00", de: 2, a: 3, deArea: 1, aArea: 2, accion: "ENTREGA_CONTROL_PREVIO", nota: "Despacho a Presupuesto." },
        { fecha: "2026-10-06T10:00:00", de: 3, a: 5, deArea: 2, aArea: 2, accion: "ASIGNAR_ANALISTA_PRESUPUESTO", nota: "Asignado a Ing. David Paredes." },
        { fecha: "2026-10-07T14:30:00", de: 5, a: 5, deArea: 2, aArea: 2, accion: "PAUSA_FACTURA", nota: "Validación presupuestaria completada. El analista Ing. David Paredes coloca el trámite en pausa en espera de la factura con desglose de impuestos." },
      ]
    },
    {
      id: 315,
      quipux: "SENAE-DTH-2026-1318-M",
      tipo: 4, // Talento humano
      areaReq: "TALENTO HUMANO DTH",
      asunto: "Capacitación especializada en técnicas de perfilamiento de riesgo aduanero y control no intrusivo",
      beneficiario: "INSTITUTO SUPERIOR DE CAPACITACION Y DESARROLLO TALENTO GLOBAL",
      ruc: "1792038475001",
      monto: 9800.00,
      hojas: 25,
      estado: "FACTURA",
      subEstado: "ESPERA_FACTURA_TRIBUTARIA",
      estaPausado: true,
      motivoPausa: "Esperando factura electrónica con detalle de asistentes certificados por el ente rector.",
      fechaPausa: "2026-10-08T11:45:00",
      areaActual: 2,
      custodio: 4,
      fecIngreso: "2026-10-06T09:00:00",
      movs: [
        { fecha: "2026-10-06T09:00:00", de: 2, a: 2, deArea: 1, aArea: 1, accion: "INGRESO_EXPEDIENTE", nota: "Recepción documental en secretaría DFI." },
        { fecha: "2026-10-06T15:30:00", de: 2, a: 3, deArea: 1, aArea: 2, accion: "ENTREGA_CONTROL_PREVIO", nota: "Despacho a Presupuesto." },
        { fecha: "2026-10-07T09:00:00", de: 3, a: 4, deArea: 2, aArea: 2, accion: "ASIGNAR_ANALISTA_PRESUPUESTO", nota: "Asignación a Econ. Ana Belén Gómez." },
        { fecha: "2026-10-08T11:45:00", de: 4, a: 4, deArea: 2, aArea: 2, accion: "PAUSA_FACTURA", nota: "Certificación POA conforme. Puesto en espera de factura tributaria por Econ. Ana Belén Gómez." },
      ]
    },
    {
      id: 316,
      quipux: "SENAE-DAF-2026-1325-M",
      tipo: 2, // Ínfima cuantía
      areaReq: "ADMINISTRATIVO MANTA",
      asunto: "Adquisición de pintura y materiales de remodelación oficinas distrito Manta",
      beneficiario: "COMERCIAL FERRETERA DEL PACIFICO FERREPAC S.A.",
      ruc: "1391827364001",
      monto: 4150.00,
      hojas: 19,
      estado: "FACTURA",
      subEstado: "ESPERA_FACTURA_TRIBUTARIA",
      estaPausado: true,
      motivoPausa: "Factura rechazada por SRI por clave de acceso errónea; proveedor emitiendo nota de crédito y nueva factura.",
      fechaPausa: "2026-10-09T16:00:00",
      areaActual: 2,
      custodio: 5,
      fecIngreso: "2026-10-07T08:30:00",
      movs: [
        { fecha: "2026-10-07T08:30:00", de: 2, a: 2, deArea: 1, aArea: 1, accion: "INGRESO_EXPEDIENTE", nota: "Ingreso secretaría DFI." },
        { fecha: "2026-10-07T14:00:00", de: 2, a: 3, deArea: 1, aArea: 2, accion: "ENTREGA_CONTROL_PREVIO", nota: "Entrega a Presupuesto." },
        { fecha: "2026-10-08T09:00:00", de: 3, a: 5, deArea: 2, aArea: 2, accion: "ASIGNAR_ANALISTA_PRESUPUESTO", nota: "Asignado a Ing. David Paredes." },
        { fecha: "2026-10-09T16:00:00", de: 5, a: 5, deArea: 2, aArea: 2, accion: "PAUSA_FACTURA", nota: "Puesto en pausa SLA por Ing. David Paredes por refacturación electrónica del proveedor." },
      ]
    },

    // --- GRUPO 4: CONTABILIDAD (DEVENGADO) (5 trámites) ---
    {
      id: 317,
      quipux: "SENAE-DAF-2026-1201-M",
      tipo: 1, // Servicios básicos
      areaReq: "ADMINISTRATIVO MATRIZ",
      asunto: "Servicio de telecomunicaciones voz y datos enlaces centrales mes de septiembre",
      beneficiario: "CONECEL S.A. (CLARO ECUADOR)",
      ruc: "1791256115001",
      monto: 18900.00,
      hojas: 38,
      estado: "CONTABILIDAD",
      subEstado: "ASIGNADO_A_CPA._MARIANA_TORRES",
      areaActual: 3,
      custodio: 7, // Mariana Torres
      fecIngreso: "2026-09-28T09:00:00",
      numeroCurCompromiso: "3104",
      movs: [
        { fecha: "2026-09-28T09:00:00", de: 2, a: 2, deArea: 1, aArea: 1, accion: "INGRESO_EXPEDIENTE", nota: "Ingreso en Secretaría DFI." },
        { fecha: "2026-09-28T15:00:00", de: 2, a: 3, deArea: 1, aArea: 2, accion: "ENTREGA_CONTROL_PREVIO", nota: "Entrega física a Presupuesto." },
        { fecha: "2026-09-29T09:00:00", de: 3, a: 4, deArea: 2, aArea: 2, accion: "ASIGNAR_ANALISTA_PRESUPUESTO", nota: "Asignado a Econ. Ana Belén Gómez." },
        { fecha: "2026-09-30T16:00:00", de: 4, a: 3, deArea: 2, aArea: 2, accion: "VISTO_BUENO_PRESUPUESTO", nota: "Certificación y compromiso Nro. 3104 validados sin observaciones por Econ. Ana Belén Gómez." },
        { fecha: "2026-10-01T10:00:00", de: 3, a: 6, deArea: 2, aArea: 3, accion: "DERIVAR_A_CONTABILIDAD", nota: "El Jefe de Presupuesto Ing. Carlos Mendoza deriva el trámite formalmente al departamento de Contabilidad." },
        { fecha: "2026-10-01T14:30:00", de: 6, a: 7, deArea: 3, aArea: 3, accion: "ASIGNACION_ANALISTA_CONTABLE", nota: "Asignado por el Contador General CPA. Sergio Lindao a la analista CPA. Mariana Torres para emisión de CUR devengado." },
      ]
    },
    {
      id: 318,
      quipux: "SENAE-DIT-2026-1210-M",
      tipo: 3, // Contratación pública
      areaReq: "TECNOLOGÍA DE LA INFORMACIÓN",
      asunto: "Servicio de mantenimiento preventivo de climatización de precisión para centro de cómputo",
      beneficiario: "CLIMAS Y SERVICIOS TERMICOS DEL ECUADOR CLIMATER S.A.",
      ruc: "0991827465001",
      monto: 8500.00,
      hojas: 42,
      estado: "CONTABILIDAD",
      subEstado: "EN_CONTROL_CONTABLE",
      areaActual: 3,
      custodio: 6, // Sergio Lindao
      fecIngreso: "2026-09-29T10:00:00",
      numeroCurCompromiso: "3118",
      movs: [
        { fecha: "2026-09-29T10:00:00", de: 2, a: 2, deArea: 1, aArea: 1, accion: "INGRESO_EXPEDIENTE", nota: "Recepción en Secretaría DFI." },
        { fecha: "2026-09-29T16:00:00", de: 2, a: 3, deArea: 1, aArea: 2, accion: "ENTREGA_CONTROL_PREVIO", nota: "Despacho a Presupuesto." },
        { fecha: "2026-09-30T10:00:00", de: 3, a: 5, deArea: 2, aArea: 2, accion: "ASIGNAR_ANALISTA_PRESUPUESTO", nota: "Asignado a Ing. David Paredes." },
        { fecha: "2026-10-02T11:00:00", de: 5, a: 3, deArea: 2, aArea: 2, accion: "VISTO_BUENO_PRESUPUESTO", nota: "Aprobación técnica y presupuestaria emitida por Ing. David Paredes." },
        { fecha: "2026-10-02T15:00:00", de: 3, a: 6, deArea: 2, aArea: 3, accion: "DERIVAR_A_CONTABILIDAD", nota: "Derivado a Contabilidad por Ing. Carlos Mendoza." },
      ]
    },
    {
      id: 319,
      quipux: "SENAE-DAF-2026-1215-M",
      tipo: 2, // Ínfima cuantía
      areaReq: "ADMINISTRATIVO ESMM",
      asunto: "Servicio de guardianía y seguridad privada para patio de retención vehicular Esmeraldas",
      beneficiario: "SEGURIDAD Y PROTECCION INTEGRAL SECURECORP CIA. LTDA.",
      ruc: "0891827364001",
      monto: 5600.00,
      hojas: 31,
      estado: "CONTABILIDAD",
      subEstado: "ASIGNADO_A_CPA._MARIANA_TORRES",
      areaActual: 3,
      custodio: 7,
      fecIngreso: "2026-09-30T08:30:00",
      numeroCurCompromiso: "3125",
      movs: [
        { fecha: "2026-09-30T08:30:00", de: 2, a: 2, deArea: 1, aArea: 1, accion: "INGRESO_EXPEDIENTE", nota: "Ingreso DFI." },
        { fecha: "2026-09-30T15:00:00", de: 2, a: 3, deArea: 1, aArea: 2, accion: "ENTREGA_CONTROL_PREVIO", nota: "Entrega a Presupuesto." },
        { fecha: "2026-10-01T09:00:00", de: 3, a: 4, deArea: 2, aArea: 2, accion: "ASIGNAR_ANALISTA_PRESUPUESTO", nota: "Asignado a Econ. Ana Belén Gómez." },
        { fecha: "2026-10-02T16:00:00", de: 4, a: 3, deArea: 2, aArea: 2, accion: "VISTO_BUENO_PRESUPUESTO", nota: "Revisado ok por Econ. Ana Belén Gómez." },
        { fecha: "2026-10-03T10:30:00", de: 3, a: 6, deArea: 2, aArea: 3, accion: "DERIVAR_A_CONTABILIDAD", nota: "Derivado a Contabilidad." },
        { fecha: "2026-10-03T15:00:00", de: 6, a: 7, deArea: 3, aArea: 3, accion: "ASIGNACION_ANALISTA_CONTABLE", nota: "Asignado a CPA. Mariana Torres para liquidación de retenciones en la fuente e IVA." },
      ]
    },
    {
      id: 320,
      quipux: "SENAE-DNVA-2026-1220-M",
      tipo: 8, // Viáticos
      areaReq: "VIGILANCIA ADUANERA",
      asunto: "Viáticos operativos de interdicción y patrullaje costero marítimo provincia de Manabí",
      beneficiario: "TNTE. CARLOS ALBERTO VELEZ MENDOZA",
      ruc: "1312847582001",
      monto: 1120.00,
      hojas: 22,
      estado: "CONTABILIDAD",
      subEstado: "ASIGNADO_A_CPA._MARIANA_TORRES",
      areaActual: 3,
      custodio: 7,
      fecIngreso: "2026-10-01T09:00:00",
      numeroCurCompromiso: "3132",
      movs: [
        { fecha: "2026-10-01T09:00:00", de: 2, a: 2, deArea: 1, aArea: 1, accion: "INGRESO_EXPEDIENTE", nota: "Ingreso DFI." },
        { fecha: "2026-10-01T15:00:00", de: 2, a: 3, deArea: 1, aArea: 2, accion: "ENTREGA_CONTROL_PREVIO", nota: "Despacho a Presupuesto." },
        { fecha: "2026-10-02T09:00:00", de: 3, a: 4, deArea: 2, aArea: 2, accion: "ASIGNAR_ANALISTA_PRESUPUESTO", nota: "Asignado a Econ. Ana Belén Gómez." },
        { fecha: "2026-10-03T14:00:00", de: 4, a: 3, deArea: 2, aArea: 2, accion: "VISTO_BUENO_PRESUPUESTO", nota: "Aprobado por Econ. Ana Belén Gómez." },
        { fecha: "2026-10-04T09:30:00", de: 3, a: 6, deArea: 2, aArea: 3, accion: "DERIVAR_A_CONTABILIDAD", nota: "Derivado a Contabilidad." },
        { fecha: "2026-10-04T12:00:00", de: 6, a: 7, deArea: 3, aArea: 3, accion: "ASIGNACION_ANALISTA_CONTABLE", nota: "Asignado a CPA. Mariana Torres." },
      ]
    },
    {
      id: 321,
      quipux: "SENAE-DTH-2026-1230-M",
      tipo: 12, // Nómina / Beneficios
      areaReq: "TALENTO HUMANO DTH",
      asunto: "Liquidación de haberes y vacaciones no gozadas ex funcionario aduanero",
      beneficiario: "LIC. MAURICIO JAVIER SOLIS ORELLANA",
      ruc: "0919283746001",
      monto: 3890.45,
      hojas: 29,
      estado: "CONTABILIDAD",
      subEstado: "EN_CONTROL_CONTABLE",
      areaActual: 3,
      custodio: 6,
      fecIngreso: "2026-10-02T10:00:00",
      numeroCurCompromiso: "3140",
      movs: [
        { fecha: "2026-10-02T10:00:00", de: 2, a: 2, deArea: 1, aArea: 1, accion: "INGRESO_EXPEDIENTE", nota: "Ingreso DFI." },
        { fecha: "2026-10-02T15:30:00", de: 2, a: 3, deArea: 1, aArea: 2, accion: "ENTREGA_CONTROL_PREVIO", nota: "Despacho a Presupuesto." },
        { fecha: "2026-10-03T09:00:00", de: 3, a: 5, deArea: 2, aArea: 2, accion: "ASIGNAR_ANALISTA_PRESUPUESTO", nota: "Asignado a Ing. David Paredes." },
        { fecha: "2026-10-04T15:00:00", de: 5, a: 3, deArea: 2, aArea: 2, accion: "VISTO_BUENO_PRESUPUESTO", nota: "Aprobado por Ing. David Paredes." },
        { fecha: "2026-10-05T09:00:00", de: 3, a: 6, deArea: 2, aArea: 3, accion: "DERIVAR_A_CONTABILIDAD", nota: "Derivado a Contabilidad para validación de liquidación actuarial y retenciones patronales." },
      ]
    },

    // --- GRUPO 5: PAGADO (5 trámites) ---
    {
      id: 322,
      quipux: "SENAE-DAF-2026-1101-M",
      tipo: 1, // Servicios básicos
      areaReq: "ADMINISTRATIVO GYEM",
      asunto: "Planilla de suministro eléctrico Oficinas Centrales y Almacenes Portuarios Agosto",
      beneficiario: "EMPRESA ELECTRICA PUBLICA GUAYAQUIL CNEL EP",
      ruc: "0968599020001",
      monto: 12450.80,
      hojas: 35,
      estado: "PAGADO",
      subEstado: "PAGO_CONFIRMADO_BCE",
      areaActual: 4, // TESORERIA
      custodio: 8, // Margarita Alarcón
      fecIngreso: "2026-09-01T08:30:00",
      numeroCurCompromiso: "2890",
      numeroCurDevengado: "2945",
      spiBce: "SPI-BCE-2026-88120",
      fecAutorizacion: "2026-09-04T11:00:00",
      fecPago: "2026-09-04T15:30:00",
      movs: [
        { fecha: "2026-09-01T08:30:00", de: 2, a: 2, deArea: 1, aArea: 1, accion: "INGRESO_EXPEDIENTE", nota: "Ingreso formal en Secretaría DFI." },
        { fecha: "2026-09-01T15:00:00", de: 2, a: 3, deArea: 1, aArea: 2, accion: "ENTREGA_CONTROL_PREVIO", nota: "Despacho a Presupuesto." },
        { fecha: "2026-09-02T09:30:00", de: 3, a: 4, deArea: 2, aArea: 2, accion: "ASIGNAR_ANALISTA_PRESUPUESTO", nota: "Asignado a Econ. Ana Belén Gómez." },
        { fecha: "2026-09-02T16:00:00", de: 4, a: 3, deArea: 2, aArea: 2, accion: "VISTO_BUENO_PRESUPUESTO", nota: "Certificación y compromiso Nro. 2890 ok." },
        { fecha: "2026-09-03T10:00:00", de: 3, a: 6, deArea: 2, aArea: 3, accion: "DERIVAR_A_CONTABILIDAD", nota: "Derivado a Contabilidad por Ing. Carlos Mendoza." },
        { fecha: "2026-09-03T17:00:00", de: 6, a: 1, deArea: 3, aArea: 1, accion: "APROBACION_CONTABLE", nota: "Control contable aprobado por CPA. Sergio Lindao. CUR Devengado Nro. 2945 generado." },
        { fecha: "2026-09-04T11:00:00", de: 1, a: 8, deArea: 1, aArea: 4, accion: "AUTORIZAR_PAGO_DFI", nota: "Pago formalmente autorizado por la Directora Financiera Dra. Patricia Morales." },
        { fecha: "2026-09-04T15:30:00", de: 8, a: 8, deArea: 4, aArea: 4, accion: "PROGRAMAR_Y_PAGAR_MEF_BCE", nota: "Transferencia interbancaria efectuada por la Tesorera Econ. Margarita Alarcón vía SPI BCE Nro. 88120." },
      ]
    },
    {
      id: 323,
      quipux: "SENAE-DIT-2026-1115-M",
      tipo: 3, // Contratación pública
      areaReq: "TECNOLOGÍA DE LA INFORMACIÓN",
      asunto: "Servicio de mantenimiento correctivo de servidores blade de producción",
      beneficiario: "HEWLETT PACKARD ENTERPRISE ECUADOR CIA. LTDA.",
      ruc: "1792618293001",
      monto: 19800.00,
      hojas: 52,
      estado: "PAGADO",
      subEstado: "PAGO_CONFIRMADO_BCE",
      areaActual: 4,
      custodio: 8,
      fecIngreso: "2026-09-05T09:00:00",
      numeroCurCompromiso: "2910",
      numeroCurDevengado: "2980",
      spiBce: "SPI-BCE-2026-88195",
      fecAutorizacion: "2026-09-09T10:30:00",
      fecPago: "2026-09-09T16:00:00",
      movs: [
        { fecha: "2026-09-05T09:00:00", de: 2, a: 2, deArea: 1, aArea: 1, accion: "INGRESO_EXPEDIENTE", nota: "Ingreso DFI." },
        { fecha: "2026-09-05T15:00:00", de: 2, a: 3, deArea: 1, aArea: 2, accion: "ENTREGA_CONTROL_PREVIO", nota: "Entrega a Presupuesto." },
        { fecha: "2026-09-06T09:00:00", de: 3, a: 5, deArea: 2, aArea: 2, accion: "ASIGNAR_ANALISTA_PRESUPUESTO", nota: "Asignado a Ing. David Paredes." },
        { fecha: "2026-09-07T15:00:00", de: 5, a: 3, deArea: 2, aArea: 2, accion: "VISTO_BUENO_PRESUPUESTO", nota: "Aprobado por Ing. David Paredes." },
        { fecha: "2026-09-08T09:00:00", de: 3, a: 6, deArea: 2, aArea: 3, accion: "DERIVAR_A_CONTABILIDAD", nota: "Derivado a Contabilidad." },
        { fecha: "2026-09-08T16:00:00", de: 6, a: 1, deArea: 3, aArea: 1, accion: "APROBACION_CONTABLE", nota: "CUR Devengado 2980 aprobado por CPA. Sergio Lindao." },
        { fecha: "2026-09-09T10:30:00", de: 1, a: 8, deArea: 1, aArea: 4, accion: "AUTORIZAR_PAGO_DFI", nota: "Autorizado por Dra. Patricia Morales." },
        { fecha: "2026-09-09T16:00:00", de: 8, a: 8, deArea: 4, aArea: 4, accion: "PROGRAMAR_Y_PAGAR_MEF_BCE", nota: "Transferencia liquidada por Econ. Margarita Alarcón." },
      ]
    },
    {
      id: 324,
      quipux: "SENAE-DAF-2026-1120-M",
      tipo: 2, // Ínfima cuantía
      areaReq: "ADMINISTRATIVO MATRIZ",
      asunto: "Servicio de mantenimiento integral y recarga de extintores contra incendios",
      beneficiario: "EXTINTORES Y SEGURIDAD INDUSTRIAL EXTINGECUADOR S.A.",
      ruc: "0991829304001",
      monto: 3200.00,
      hojas: 21,
      estado: "PAGADO",
      subEstado: "PAGO_CONFIRMADO_BCE",
      areaActual: 4,
      custodio: 8,
      fecIngreso: "2026-09-10T09:00:00",
      numeroCurCompromiso: "2930",
      numeroCurDevengado: "2995",
      spiBce: "SPI-BCE-2026-88240",
      fecAutorizacion: "2026-09-13T11:00:00",
      fecPago: "2026-09-13T14:45:00",
      movs: [
        { fecha: "2026-09-10T09:00:00", de: 2, a: 2, deArea: 1, aArea: 1, accion: "INGRESO_EXPEDIENTE", nota: "Ingreso DFI." },
        { fecha: "2026-09-10T15:00:00", de: 2, a: 3, deArea: 1, aArea: 2, accion: "ENTREGA_CONTROL_PREVIO", nota: "Despacho a Presupuesto." },
        { fecha: "2026-09-11T09:00:00", de: 3, a: 4, deArea: 2, aArea: 2, accion: "ASIGNAR_ANALISTA_PRESUPUESTO", nota: "Asignado a Econ. Ana Belén Gómez." },
        { fecha: "2026-09-11T16:00:00", de: 4, a: 3, deArea: 2, aArea: 2, accion: "VISTO_BUENO_PRESUPUESTO", nota: "Aprobado por Econ. Ana Belén Gómez." },
        { fecha: "2026-09-12T09:30:00", de: 3, a: 6, deArea: 2, aArea: 3, accion: "DERIVAR_A_CONTABILIDAD", nota: "Derivado a Contabilidad." },
        { fecha: "2026-09-12T17:00:00", de: 6, a: 1, deArea: 3, aArea: 1, accion: "APROBACION_CONTABLE", nota: "CUR Devengado 2995 emitido por CPA. Sergio Lindao." },
        { fecha: "2026-09-13T11:00:00", de: 1, a: 8, deArea: 1, aArea: 4, accion: "AUTORIZAR_PAGO_DFI", nota: "Autorizado por Dra. Patricia Morales." },
        { fecha: "2026-09-13T14:45:00", de: 8, a: 8, deArea: 4, aArea: 4, accion: "PROGRAMAR_Y_PAGAR_MEF_BCE", nota: "Pago ejecutado por Econ. Margarita Alarcón." },
      ]
    },
    {
      id: 325,
      quipux: "SENAE-DNVA-2026-1130-M",
      tipo: 8, // Viáticos
      areaReq: "VIGILANCIA ADUANERA",
      asunto: "Viáticos operativos de control aduanero en pasos no habilitados frontera norte",
      beneficiario: "MAYOR LUIS ENRIQUE PAREDES MORA",
      ruc: "1002938475001",
      monto: 740.00,
      hojas: 17,
      estado: "PAGADO",
      subEstado: "PAGO_CONFIRMADO_BCE",
      areaActual: 4,
      custodio: 8,
      fecIngreso: "2026-09-15T09:00:00",
      numeroCurCompromiso: "2950",
      numeroCurDevengado: "3015",
      spiBce: "SPI-BCE-2026-88310",
      fecAutorizacion: "2026-09-18T10:00:00",
      fecPago: "2026-09-18T15:00:00",
      movs: [
        { fecha: "2026-09-15T09:00:00", de: 2, a: 2, deArea: 1, aArea: 1, accion: "INGRESO_EXPEDIENTE", nota: "Ingreso DFI." },
        { fecha: "2026-09-15T14:00:00", de: 2, a: 3, deArea: 1, aArea: 2, accion: "ENTREGA_CONTROL_PREVIO", nota: "Despacho a Presupuesto." },
        { fecha: "2026-09-16T09:00:00", de: 3, a: 4, deArea: 2, aArea: 2, accion: "ASIGNAR_ANALISTA_PRESUPUESTO", nota: "Asignado a Econ. Ana Belén Gómez." },
        { fecha: "2026-09-16T16:00:00", de: 4, a: 3, deArea: 2, aArea: 2, accion: "VISTO_BUENO_PRESUPUESTO", nota: "Aprobado por Econ. Ana Belén Gómez." },
        { fecha: "2026-09-17T09:00:00", de: 3, a: 6, deArea: 2, aArea: 3, accion: "DERIVAR_A_CONTABILIDAD", nota: "Derivado a Contabilidad." },
        { fecha: "2026-09-17T15:30:00", de: 6, a: 1, deArea: 3, aArea: 1, accion: "APROBACION_CONTABLE", nota: "CUR Devengado 3015 emitido." },
        { fecha: "2026-09-18T10:00:00", de: 1, a: 8, deArea: 1, aArea: 4, accion: "AUTORIZAR_PAGO_DFI", nota: "Autorizado por Dra. Patricia Morales." },
        { fecha: "2026-09-18T15:00:00", de: 8, a: 8, deArea: 4, aArea: 4, accion: "PROGRAMAR_Y_PAGAR_MEF_BCE", nota: "Transferencia liquidada por Econ. Margarita Alarcón." },
      ]
    },
    {
      id: 326,
      quipux: "SENAE-DTH-2026-1145-M",
      tipo: 5, // Caja chica
      areaReq: "TALENTO HUMANO DTH",
      asunto: "Reposición mensual del fondo de caja chica distrito Latacunga septiembre",
      beneficiario: "LIC. PATRICIA GUERRERO (CUSTODIA CAJA CHICA)",
      ruc: "0501928374001",
      monto: 1500.00,
      hojas: 25,
      estado: "PAGADO",
      subEstado: "PAGO_CONFIRMADO_BCE",
      areaActual: 4,
      custodio: 8,
      fecIngreso: "2026-09-18T09:00:00",
      numeroCurCompromiso: "2970",
      numeroCurDevengado: "3040",
      spiBce: "SPI-BCE-2026-88390",
      fecAutorizacion: "2026-09-22T10:00:00",
      fecPago: "2026-09-22T15:15:00",
      movs: [
        { fecha: "2026-09-18T09:00:00", de: 2, a: 2, deArea: 1, aArea: 1, accion: "INGRESO_EXPEDIENTE", nota: "Ingreso DFI." },
        { fecha: "2026-09-18T14:30:00", de: 2, a: 3, deArea: 1, aArea: 2, accion: "ENTREGA_CONTROL_PREVIO", nota: "Entrega a Presupuesto." },
        { fecha: "2026-09-19T09:00:00", de: 3, a: 5, deArea: 2, aArea: 2, accion: "ASIGNAR_ANALISTA_PRESUPUESTO", nota: "Asignado a Ing. David Paredes." },
        { fecha: "2026-09-20T11:00:00", de: 5, a: 3, deArea: 2, aArea: 2, accion: "VISTO_BUENO_PRESUPUESTO", nota: "Liquidación de gastos de caja chica conforme por Ing. David Paredes." },
        { fecha: "2026-09-21T09:00:00", de: 3, a: 6, deArea: 2, aArea: 3, accion: "DERIVAR_A_CONTABILIDAD", nota: "Derivado a Contabilidad." },
        { fecha: "2026-09-21T16:00:00", de: 6, a: 1, deArea: 3, aArea: 1, accion: "APROBACION_CONTABLE", nota: "CUR Devengado 3040 emitido por CPA. Sergio Lindao." },
        { fecha: "2026-09-22T10:00:00", de: 1, a: 8, deArea: 1, aArea: 4, accion: "AUTORIZAR_PAGO_DFI", nota: "Autorizado por Dra. Patricia Morales." },
        { fecha: "2026-09-22T15:15:00", de: 8, a: 8, deArea: 4, aArea: 4, accion: "PROGRAMAR_Y_PAGAR_MEF_BCE", nota: "Fondo repuesto a custodia por Econ. Margarita Alarcón." },
      ]
    },

    // --- GRUPO 6: OBSERVADO (2 trámites) ---
    {
      id: 327,
      quipux: "SENAE-DAF-2026-0950-M",
      tipo: 2, // Ínfima cuantía
      areaReq: "ADMINISTRATIVO ESMM",
      asunto: "Servicio de fumigación y desratización en bodegas aduaneras de San Lorenzo",
      beneficiario: "CONTROL AMBIENTAL Y FUMIGACIONES DEL NORTE FUMINOR S.A.",
      ruc: "0891928374001",
      monto: 2100.00,
      hojas: 18,
      estado: "OBSERVADO",
      subEstado: "EN_OBSERVACION_PRESUPUESTO",
      areaActual: 2,
      custodio: 4, // Ana Belén Gómez
      fecIngreso: "2026-10-05T09:00:00",
      observacion: {
        detalle: "Falta informe técnico de conformidad y recepción a satisfacción suscrito por el Administrador de la Orden de Compra.",
        usuario: 4, // Ana Belén Gómez
        area: 2,
      },
      movs: [
        { fecha: "2026-10-05T09:00:00", de: 2, a: 2, deArea: 1, aArea: 1, accion: "INGRESO_EXPEDIENTE", nota: "Ingreso en Secretaría DFI." },
        { fecha: "2026-10-05T15:00:00", de: 2, a: 3, deArea: 1, aArea: 2, accion: "ENTREGA_CONTROL_PREVIO", nota: "Despacho a Presupuesto." },
        { fecha: "2026-10-06T09:00:00", de: 3, a: 4, deArea: 2, aArea: 2, accion: "ASIGNAR_ANALISTA_PRESUPUESTO", nota: "Asignado a Econ. Ana Belén Gómez." },
        { fecha: "2026-10-07T11:00:00", de: 4, a: 4, deArea: 2, aArea: 2, accion: "OBSERVACION_TRAMITE", nota: "La analista Econ. Ana Belén Gómez genera observación formal: Falta informe técnico de conformidad del administrador de la orden de compra." },
      ]
    },
    {
      id: 328,
      quipux: "SENAE-DIT-2026-0960-M",
      tipo: 3, // Contratación pública
      areaReq: "TECNOLOGÍA DE LA INFORMACIÓN",
      asunto: "Adquisición de escáneres portátiles de código de barras para verificación de aforo",
      beneficiario: "SOLUCIONES TECNOLOGICAS DEL ECUADOR SOLTEC S.A.",
      ruc: "1792837465001",
      monto: 11500.00,
      hojas: 40,
      estado: "OBSERVADO",
      subEstado: "EN_OBSERVACION_CONTABILIDAD",
      areaActual: 3,
      custodio: 7, // Mariana Torres
      fecIngreso: "2026-10-02T10:00:00",
      numeroCurCompromiso: "3080",
      observacion: {
        detalle: "La retención de impuesto a la renta calculada en la factura difiere del porcentaje aplicable al código de servicio 344.",
        usuario: 7, // Mariana Torres
        area: 3,
      },
      movs: [
        { fecha: "2026-10-02T10:00:00", de: 2, a: 2, deArea: 1, aArea: 1, accion: "INGRESO_EXPEDIENTE", nota: "Ingreso DFI." },
        { fecha: "2026-10-02T15:00:00", de: 2, a: 3, deArea: 1, aArea: 2, accion: "ENTREGA_CONTROL_PREVIO", nota: "Entrega a Presupuesto." },
        { fecha: "2026-10-03T09:00:00", de: 3, a: 5, deArea: 2, aArea: 2, accion: "ASIGNAR_ANALISTA_PRESUPUESTO", nota: "Asignado a Ing. David Paredes." },
        { fecha: "2026-10-04T14:00:00", de: 5, a: 3, deArea: 2, aArea: 2, accion: "VISTO_BUENO_PRESUPUESTO", nota: "Compromiso Nro. 3080 validado por Ing. David Paredes." },
        { fecha: "2026-10-05T09:00:00", de: 3, a: 6, deArea: 2, aArea: 3, accion: "DERIVAR_A_CONTABILIDAD", nota: "Derivado a Contabilidad." },
        { fecha: "2026-10-05T14:30:00", de: 6, a: 7, deArea: 3, aArea: 3, accion: "ASIGNACION_ANALISTA_CONTABLE", nota: "Asignado a CPA. Mariana Torres." },
        { fecha: "2026-10-06T15:00:00", de: 7, a: 7, deArea: 3, aArea: 3, accion: "OBSERVACION_TRAMITE", nota: "La analista contable CPA. Mariana Torres observa discrepancia en la retención tributaria de la factura." },
      ]
    },

    // --- GRUPO 7: ARCHIVO / EN CAJA (2 trámites) ---
    {
      id: 329,
      quipux: "SENAE-DAF-2026-0810-M",
      tipo: 1, // Servicios básicos
      areaReq: "ADMINISTRATIVO ESMM",
      asunto: "Servicio de recolección de desechos sólidos y saneamiento ambiental puerto Esmeraldas",
      beneficiario: "CONSORCIO DE GESTION AMBIENTAL LIMPIA ESMERALDAS",
      ruc: "0890018274001",
      monto: 4500.00,
      hojas: 28,
      estado: "ARCHIVO",
      subEstado: "ARCHIVADO_DEFINITIVO",
      idCaja: 1, // Asignado a CAJA-2026-001
      codigoTomoCaja: "CAJA-2026-001",
      areaActual: 6, // ARCHIVO
      custodio: 10, // Manuel Ramos
      fecIngreso: "2026-08-15T09:00:00",
      numeroCurCompromiso: "2650",
      numeroCurDevengado: "2710",
      spiBce: "SPI-BCE-2026-77120",
      fecAutorizacion: "2026-08-20T10:00:00",
      fecPago: "2026-08-20T15:00:00",
      movs: [
        { fecha: "2026-08-15T09:00:00", de: 2, a: 2, deArea: 1, aArea: 1, accion: "INGRESO_EXPEDIENTE", nota: "Ingreso en Secretaría DFI." },
        { fecha: "2026-08-15T15:00:00", de: 2, a: 3, deArea: 1, aArea: 2, accion: "ENTREGA_CONTROL_PREVIO", nota: "Despacho a Presupuesto." },
        { fecha: "2026-08-16T09:00:00", de: 3, a: 4, deArea: 2, aArea: 2, accion: "ASIGNAR_ANALISTA_PRESUPUESTO", nota: "Asignado a Econ. Ana Belén Gómez." },
        { fecha: "2026-08-17T15:00:00", de: 4, a: 3, deArea: 2, aArea: 2, accion: "VISTO_BUENO_PRESUPUESTO", nota: "Aprobado por Econ. Ana Belén Gómez." },
        { fecha: "2026-08-18T09:00:00", de: 3, a: 6, deArea: 2, aArea: 3, accion: "DERIVAR_A_CONTABILIDAD", nota: "Derivado a Contabilidad." },
        { fecha: "2026-08-19T16:00:00", de: 6, a: 1, deArea: 3, aArea: 1, accion: "APROBACION_CONTABLE", nota: "CUR Devengado 2710 emitido por CPA. Sergio Lindao." },
        { fecha: "2026-08-20T10:00:00", de: 1, a: 8, deArea: 1, aArea: 4, accion: "AUTORIZAR_PAGO_DFI", nota: "Autorizado por Dra. Patricia Morales." },
        { fecha: "2026-08-20T15:00:00", de: 8, a: 8, deArea: 4, aArea: 4, accion: "PROGRAMAR_Y_PAGAR_MEF_BCE", nota: "Pago cancelado por Econ. Margarita Alarcón." },
        { fecha: "2026-10-05T10:00:00", de: 8, a: 10, deArea: 4, aArea: 6, accion: "EMPAQUETADO_EN_CAJA", nota: "Expediente físico liquidado y empaquetado en CAJA-2026-001 por la Tesorera Econ. Margarita Alarcón." },
        { fecha: "2026-10-06T11:00:00", de: 10, a: 10, deArea: 6, aArea: 6, accion: "CUSTODIA_DEFINITIVA_ARCHIVO", nota: "Recepción y custodia física definitiva en estantería por el custodio Sr. Manuel Ramos." },
      ]
    },
    {
      id: 330,
      quipux: "SENAE-DIT-2026-0825-M",
      tipo: 2, // Ínfima cuantía
      areaReq: "TECNOLOGÍA DE LA INFORMACIÓN",
      asunto: "Suministro de cables de parcheo UTP Cat6 y conectores blindados para rack central",
      beneficiario: "CONECTIVIDAD TOTAL Y REDES CONECTA S.A.",
      ruc: "1792837492001",
      monto: 2800.00,
      hojas: 22,
      estado: "ARCHIVO",
      subEstado: "ARCHIVADO_DEFINITIVO",
      idCaja: 1,
      codigoTomoCaja: "CAJA-2026-001",
      areaActual: 6,
      custodio: 10,
      fecIngreso: "2026-08-20T08:30:00",
      numeroCurCompromiso: "2680",
      numeroCurDevengado: "2735",
      spiBce: "SPI-BCE-2026-77210",
      fecAutorizacion: "2026-08-24T10:00:00",
      fecPago: "2026-08-24T14:30:00",
      movs: [
        { fecha: "2026-08-20T08:30:00", de: 2, a: 2, deArea: 1, aArea: 1, accion: "INGRESO_EXPEDIENTE", nota: "Ingreso DFI." },
        { fecha: "2026-08-20T15:00:00", de: 2, a: 3, deArea: 1, aArea: 2, accion: "ENTREGA_CONTROL_PREVIO", nota: "Despacho a Presupuesto." },
        { fecha: "2026-08-21T09:00:00", de: 3, a: 5, deArea: 2, aArea: 2, accion: "ASIGNAR_ANALISTA_PRESUPUESTO", nota: "Asignado a Ing. David Paredes." },
        { fecha: "2026-08-22T14:00:00", de: 5, a: 3, deArea: 2, aArea: 2, accion: "VISTO_BUENO_PRESUPUESTO", nota: "Aprobado por Ing. David Paredes." },
        { fecha: "2026-08-23T09:00:00", de: 3, a: 6, deArea: 2, aArea: 3, accion: "DERIVAR_A_CONTABILIDAD", nota: "Derivado a Contabilidad." },
        { fecha: "2026-08-23T16:00:00", de: 6, a: 1, deArea: 3, aArea: 1, accion: "APROBACION_CONTABLE", nota: "CUR Devengado 2735 emitido por CPA. Sergio Lindao." },
        { fecha: "2026-08-24T10:00:00", de: 1, a: 8, deArea: 1, aArea: 4, accion: "AUTORIZAR_PAGO_DFI", nota: "Autorizado por Dra. Patricia Morales." },
        { fecha: "2026-08-24T14:30:00", de: 8, a: 8, deArea: 4, aArea: 4, accion: "PROGRAMAR_Y_PAGAR_MEF_BCE", nota: "Cancelado por Econ. Margarita Alarcón." },
        { fecha: "2026-10-05T10:00:00", de: 8, a: 10, deArea: 4, aArea: 6, accion: "EMPAQUETADO_EN_CAJA", nota: "Empaquetado en CAJA-2026-001 por la Tesorera Econ. Margarita Alarcón." },
        { fecha: "2026-10-06T11:00:00", de: 10, a: 10, deArea: 6, aArea: 6, accion: "CUSTODIA_DEFINITIVA_ARCHIVO", nota: "En estantería de archivo por Sr. Manuel Ramos." },
      ]
    },
  ];

  console.log(`Insertando ${tramitesData.length} trámites con auditorías completas...`);

  for (const t of tramitesData) {
    const tramiteCreado = await prisma.tramites.create({
      data: {
        id_tramite: t.id,
        codigo_tramite: `SENAE-CP-2026-${String(t.id).padStart(5, "0")}`,
        numero_quipux: t.quipux,
        fecha_memorando: new Date(t.fecIngreso),
        fecha_recepcion_fisica: new Date(t.fecIngreso),
        fecha_ingreso: new Date(t.fecIngreso),
        id_tipo_tramite: t.tipo,
        tipo_flujo: "PAGO",
        padre_gestion: "PAGO",
        tipo_gestion: "PAGO",
        area_requirente: t.areaReq,
        asunto: t.asunto,
        proveedor_beneficiario: t.beneficiario,
        ruc_proveedor: t.ruc,
        subtotal: t.monto,
        monto_total: t.monto,
        es_alta_cuantia: t.monto >= 10000,
        id_area_actual: t.areaActual,
        id_custodio_actual: t.custodio,
        estado_general: t.estado,
        sub_estado: t.subEstado,
        numero_hojas: t.hojas,
        id_caja: t.idCaja || null,
        codigo_tomo_caja: t.codigoTomoCaja || null,
        esta_pausado: t.estaPausado || false,
        motivo_pausa: t.motivoPausa || null,
        fecha_pausa: t.fechaPausa ? new Date(t.fechaPausa) : null,
        numero_cur_compromiso: t.numeroCurCompromiso || null,
        numero_cur_devengado: t.numeroCurDevengado || null,
        spi_bce_referencia: t.spiBce || null,
        fecha_autorizacion_pago: t.fecAutorizacion ? new Date(t.fecAutorizacion) : null,
        fecha_pago: t.fecPago ? new Date(t.fecPago) : null,
        fecha_ultimo_movimiento: new Date(t.movs[t.movs.length - 1].fecha),
        fecha_ultima_modificacion: new Date(t.movs[t.movs.length - 1].fecha),
      },
    });

    // Insertar observaciones si tiene
    if (t.observacion) {
      await prisma.observaciones.create({
        data: {
          id_tramite: t.id,
          id_area_origen: t.observacion.area,
          id_usuario_origen: t.observacion.usuario,
          id_area_destino: 1,
          id_area_reporta: t.observacion.area,
          id_usuario_reporta: t.observacion.usuario,
          detalle_observacion: t.observacion.detalle,
          fecha_reporte: new Date(t.movs[t.movs.length - 1].fecha),
          estado_observacion: "PENDIENTE",
        },
      });
    }

    // Insertar cada movimiento del historial con los usuarios y áreas reales
    for (const m of t.movs) {
      await prisma.historial_movimientos.create({
        data: {
          id_tramite: t.id,
          id_usuario_entrega: m.de,
          id_usuario_recibe: m.a,
          id_area_origen: m.deArea,
          id_area_destino: m.aArea,
          tipo_accion: m.accion,
          comentarios: m.nota,
          fecha_hora: new Date(m.fecha),
        },
      });
    }
  }

  const count = await prisma.tramites.count();
  const movCount = await prisma.historial_movimientos.count();
  console.log(`Seeding completado con éxito: ${count} trámites y ${movCount} eventos de auditoría registrados.`);
}

seed30Tramites()
  .catch((e) => {
    console.error("Error al poblar trámites:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
