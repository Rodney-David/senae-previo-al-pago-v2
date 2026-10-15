import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// Lista rica de proveedores ecuatorianos realistas
const PROVEEDORES = [
  { nombre: "EMPRESA ELECTRICA PUBLICA GUAYAQUIL CNEL EP", ruc: "0968599020001", tipo: 1 },
  { nombre: "EMPRESA PUBLICA METROPOLITANA DE AGUA POTABLE Y SANEAMIENTO EPMAPS", ruc: "1768154260001", tipo: 1 },
  { nombre: "CORPORACION NACIONAL DE TELECOMUNICACIONES CNT EP", ruc: "1768152560001", tipo: 1 },
  { nombre: "EMPRESA PUBLICA DE AGUA POTABLE ESMERALDAS EPMAPSE", ruc: "0860001230001", tipo: 1 },
  { nombre: "INTERAGUA C. LTDA.", ruc: "0992115682001", tipo: 1 },
  { nombre: "CONSORCIO PUERTO LIMPIO", ruc: "0992688825001", tipo: 1 },
  { nombre: "CLARO CONECEL S.A.", ruc: "1791256115001", tipo: 1 },
  { nombre: "OTECEL S.A. MOVISTAR", ruc: "1791251237001", tipo: 1 },

  { nombre: "SERVICIOS DE SEGURIDAD Y VIGILANCIA VIGILANZA S.A.", ruc: "0991448291001", tipo: 2 },
  { nombre: "CONSORCIO DE LIMPIEZA INSTITUCIONAL LIMPIATODO", ruc: "1792345678001", tipo: 2 },
  { nombre: "PROVEEDORA DE COMBUSTIBLES Y LUBRICANTES PETROECUADOR", ruc: "1768153530001", tipo: 2 },
  { nombre: "MANTENIMIENTO INDUSTRIAL INTEGRAL CLIMASYS S.A.", ruc: "0992837465001", tipo: 2 },
  { nombre: "SOLUCIONES TECNOLOGICAS Y COMPUTO TECNOSOFT C.A.", ruc: "1790876543001", tipo: 2 },
  { nombre: "SUMINISTROS DE OFICINA Y PAPELERIA DILIPA S.A.", ruc: "1790012345001", tipo: 2 },
  { nombre: "CONSTRUCTORA E INMOBILIARIA URBANA CONSTRUARTE S.A.", ruc: "0991987654001", tipo: 2 },
  { nombre: "LOGISTICA Y TRANSPORTE PESADO TRANSADUANA S.A.", ruc: "0992345678001", tipo: 2 },

  { nombre: "FORTINET SOLUTIONS ECUADOR S.A.", ruc: "1791829384001", tipo: 3 },
  { nombre: "ORACLE ECUADOR SISTEMAS S.A.", ruc: "1791345678001", tipo: 3 },
  { nombre: "MICROSOFT DEL ECUADOR S.A.", ruc: "1791234567001", tipo: 3 },
  { nombre: "CISCO SYSTEMS SERVICES ECUADOR", ruc: "1791876543001", tipo: 3 },
  { nombre: "LABORATORIOS CLINICOS ESPECIALIZADOS LABMED S.A.", ruc: "0992384729001", tipo: 3 },
  { nombre: "SEGUROS Y REASEGURADOS EQUINOCCIAL S.A.", ruc: "1790045678001", tipo: 3 },
  { nombre: "CORPORACION FAVORITA C.A. SERVICIOS INSTITUCIONALES", ruc: "1790016919001", tipo: 3 },
  { nombre: "PAGINAS WEB Y CENTRO DE DATOS TELCONET S.A.", ruc: "0991327891001", tipo: 3 },

  { nombre: "CONSULTORA DE AUDITORIA Y CONTROL AUDITORES ASOCIADOS CIA. LTDA.", ruc: "1792123456001", tipo: 4 },
  { nombre: "TALLER AUTOMOTRIZ CENTRAL MOTORS S.A.", ruc: "0991765432001", tipo: 4 },
  { nombre: "CAPACITACIONES Y ASESORIA JURIDICA LEXCONSULT S.A.", ruc: "1792987654001", tipo: 4 },
  { nombre: "IMPORTADORA Y DISTRIBUIDORA DE EQUIPOS RAYOS X SCANNER S.A.", ruc: "0992567890001", tipo: 4 },
  { nombre: "EDITORIAL E IMPRENTA NACIONAL EDITOGRAN S.A.", ruc: "0990012345001", tipo: 4 },
  { nombre: "SERVICIOS AEREOS Y ENCOMIENDAS COURIER SPEED S.A.", ruc: "1791654321001", tipo: 4 },
];

const AREAS_REQUIRENTES = [
  "DIRECCIÓN DE TECNOLOGÍAS DE LA INFORMACIÓN (DIT)",
  "DIRECCIÓN DE TALENTO HUMANO (DTH)",
  "DIRECCIÓN ADMINISTRATIVA FINANCIERA (DAF)",
  "DIRECCIÓN DE OPERACIONES ADUANERAS (DOA)",
  "DIRECCIÓN DE CONTROL Y AUDITORÍA ADUANERA (DCA)",
  "DIRECCIÓN DE PLANIFICACIÓN Y ESTUDIOS INSTITUCIONALES",
  "DIRECCIÓN DE ASESORÍA JURÍDICA (DAJ)",
  "DIRECCIÓN DISTRITAL GUAYAQUIL MARÍTIMO",
  "DIRECCIÓN DISTRITAL GUAYAQUIL AÉREO",
  "DIRECCIÓN DISTRITAL QUITO",
  "DIRECCIÓN DISTRITAL TULCÁN",
  "DIRECCIÓN DISTRITAL ESMERALDAS",
  "DIRECCIÓN DISTRITAL HUAQUILLAS",
  "DIRECCIÓN GENERAL DEL SERVICIO NACIONAL DE ADUANA",
];

const ASUNTOS = [
  "Servicio de energía eléctrica y alumbrado de patios de aforo y bodegas",
  "Suministro de agua potable y alcantarillado dependencias administrativas",
  "Servicio de enlaces de datos e internet dedicado fibra óptica distritos aduaneros",
  "Servicio de telefonía fija IP y telefonía móvil corporativa operativo nacional",
  "Mantenimiento preventivo y correctivo de aires acondicionados centrales",
  "Servicio de vigilancia armada y seguridad física perimetral instalaciones aduaneras",
  "Servicio de limpieza y desinfección integral oficinas y ventanillas de atención",
  "Dotación de combustible diésel y gasolina para flota vehicular patrullaje aduanero",
  "Mantenimiento de generadores eléctricos de emergencia y sistemas UPS",
  "Renovación de licencias de cortafuegos perimetrales y seguridad cibernética",
  "Soporte especializado de base de datos Oracle para el sistema Ecuapass",
  "Adquisición de suministros de oficina, papelería y tóner para impresión de DAE",
  "Servicio de exámenes médicos ocupacionales y pruebas de laboratorio personal",
  "Póliza de seguros contra todo riesgo para infraestructura e incautaciones aduaneras",
  "Mantenimiento electromecánico de escáneres de contenedores puerto marítimo",
  "Servicio de recolección y destrucción de desechos peligrosos y custodia",
  "Arrendamiento de servidores cloud y almacenamiento de respaldos electrónicos",
  "Reparación mecánica y cambio de neumáticos vehículos operativos de frontera",
  "Servicio de courier y valija diplomática nacional para expedientes judiciales",
  "Consultoría técnica para optimización de procesos de control previo al pago",
];

function sumarDiasHabiles(fecha: Date, dias: number): Date {
  const resultado = new Date(fecha);
  let cont = 0;
  while (cont < dias) {
    resultado.setDate(resultado.getDate() + 1);
    const day = resultado.getDay();
    if (day !== 0 && day !== 6) {
      cont++;
    }
  }
  return resultado;
}

function sumarHoras(fecha: Date, horas: number): Date {
  const resultado = new Date(fecha);
  resultado.setTime(resultado.getTime() + horas * 60 * 60 * 1000);
  return resultado;
}

async function main() {
  console.log("=== INICIANDO VACIADO DE TABLAS TRANSACCIONALES ===");

  await prisma.historial_movimientos.deleteMany({});
  await prisma.observaciones.deleteMany({});
  await prisma.tramite_referencias.deleteMany({});
  await prisma.documentos_tramite.deleteMany({});
  await prisma.solicitudes_devolucion.deleteMany({});
  await prisma.tramites.deleteMany({});
  await prisma.cajas.deleteMany({});

  console.log("Tablas transaccionales vaciadas con éxito.");

  console.log("=== CREANDO 6 CAJAS DE ARCHIVO FISICO ===");
  const cajasData = [
    {
      id_caja: 1,
      codigo_caja: "CAJA-2026-001",
      nombre: "CAJA HISTÓRICA DAF - SERVICIOS BÁSICOS MAYO 2026",
      estado: "CERRADA",
      fecha_creacion: new Date("2026-05-30T09:00:00"),
      fecha_cierre: new Date("2026-06-15T16:00:00"),
      id_usuario_creacion: 8,
      observaciones: "Expedientes liquidados y cancelados mediante SPI-BCE del mes de Mayo 2026. Auditoría cerrada.",
    },
    {
      id_caja: 2,
      codigo_caja: "CAJA-2026-002",
      nombre: "CAJA GENERAL - CONTRATACIONES Y SERVICIOS JUNIO 2026",
      estado: "CERRADA",
      fecha_creacion: new Date("2026-06-30T10:00:00"),
      fecha_cierre: new Date("2026-07-20T17:00:00"),
      id_usuario_creacion: 8,
      observaciones: "Expedientes de contrataciones directas y servicios institucionales Junio 2026. Custodia en archivo central.",
    },
    {
      id_caja: 3,
      codigo_caja: "CAJA-2026-003",
      nombre: "CAJA CENTRAL - INFRAESTRUCTURA Y TIC JULIO 2026",
      estado: "CERRADA",
      fecha_creacion: new Date("2026-07-31T09:30:00"),
      fecha_cierre: new Date("2026-08-18T15:30:00"),
      id_usuario_creacion: 8,
      observaciones: "Licenciamiento Ecuapass y enlaces satelitales Julio 2026. Sellado definitivo.",
    },
    {
      id_caja: 4,
      codigo_caja: "CAJA-2026-004",
      nombre: "CAJA ARCHIVO - SERVICIOS GENERALES AGOSTO 2026",
      estado: "ABIERTA",
      fecha_creacion: new Date("2026-08-31T11:00:00"),
      id_usuario_creacion: 8,
      observaciones: "Trámites correspondientes a devengados y pagos bancarios Agosto 2026.",
    },
    {
      id_caja: 5,
      codigo_caja: "CAJA-2026-005",
      nombre: "CAJA ACTIVA - ADQUISICIONES SEPTIEMBRE 2026",
      estado: "ABIERTA",
      fecha_creacion: new Date("2026-09-30T14:00:00"),
      id_usuario_creacion: 8,
      observaciones: "Expedientes físicos liquidados de Septiembre 2026 en proceso de foliatura y archivo.",
    },
    {
      id_caja: 6,
      codigo_caja: "CAJA-2026-006",
      nombre: "CAJA DE PAGO - OPERATIVOS OCTUBRE 2026",
      estado: "ABIERTA",
      fecha_creacion: new Date("2026-10-10T10:00:00"),
      id_usuario_creacion: 8,
      observaciones: "Caja abierta para recepción de expedientes liquidados en la quincena de Octubre 2026.",
    },
  ];

  for (const c of cajasData) {
    await prisma.cajas.create({ data: c });
  }
  console.log("6 Cajas creadas con éxito.");

  console.log("=== GENERANDO 200 TRÁMITES CON AUDITORÍA COMPLETA (MAYO A OCTUBRE 2026) ===");

  // Fecha base inicial: 02 de Mayo de 2026
  // Fecha fin: 13 de Octubre de 2026 (aprox 165 días)
  const fechaInicioGlobal = new Date("2026-05-02T08:30:00");
  const totalDias = 164; // hasta 13 Octubre 2026

  let countPagados = 0;
  let countEnRevision = 0;
  let countContabilidad = 0;
  let countPresupuesto = 0;
  let countIngresados = 0;
  let countObservados = 0;
  let countPausados = 0;
  let countDevueltos = 0;

  for (let i = 1; i <= 200; i++) {
    const id = i;
    const secStr = String(i).padStart(5, "0");
    const codTramite = `SENAE-CP-2026-${secStr}`;
    const nroTramite = `${String(i).padStart(3, "0")}-2026`;

    // Distribuir fecha de ingreso progresivamente a lo largo de los 6 meses:
    // Trámites 1 al 130: Mayo a 24 de Septiembre 2026 (todos liquidados/pagados en su respectivo mes)
    // Trámites 131 al 200: 25 de Septiembre al 13 de Octubre 2026 (trámites vivos en mesas en este momento)
    let fechaIngreso: Date;
    if (i <= 130) {
      const factorDia = Math.floor(((i - 1) / 130) * 145);
      fechaIngreso = new Date(fechaInicioGlobal);
      fechaIngreso.setDate(fechaIngreso.getDate() + factorDia);
    } else {
      // 25 de Septiembre a 13 de Octubre (18 días recientes)
      const factorDiaReciente = Math.floor(((i - 131) / 69) * 18);
      fechaIngreso = new Date("2026-09-25T08:30:00");
      fechaIngreso.setDate(fechaIngreso.getDate() + factorDiaReciente);
    }
    fechaIngreso.setHours(8 + (i % 8), (i * 7) % 60, 0, 0);

    const fechaMemorando = new Date(fechaIngreso);
    fechaMemorando.setDate(fechaMemorando.getDate() - 1);

    const prov = PROVEEDORES[(i - 1) % PROVEEDORES.length];
    const areaReq = AREAS_REQUIRENTES[(i - 1) % AREAS_REQUIRENTES.length];
    const asunto = `${ASUNTOS[(i - 1) % ASUNTOS.length]} - Período ${fechaIngreso.toLocaleDateString("es-EC", { month: "long", year: "numeric" })}`;

    const areaCodeQuipux = areaReq.includes("TECNOLOG")
      ? "DIT"
      : areaReq.includes("HUMANO")
      ? "DTH"
      : areaReq.includes("ADMIN")
      ? "DAF"
      : areaReq.includes("JURID")
      ? "DAJ"
      : areaReq.includes("OPERAC")
      ? "DOA"
      : "DCA";
    const nroQuipux = `SENAE-${areaCodeQuipux}-2026-${String(1000 + i)}-M`;

    // Monto realista
    const baseMonto = 450 + ((i * 137) % 48000) + ((i % 5 === 0) ? 25000 : 0);
    const subtotal = Number(baseMonto.toFixed(2));
    const montoIva = Number((subtotal * 0.15).toFixed(2));
    const montoRet = Number((subtotal * 0.0275).toFixed(2));
    const montoTotal = Number((subtotal + montoIva).toFixed(2));
    const esAltaCuantia = montoTotal >= 15000;
    const fojas = 15 + ((i * 3) % 95);

    let estadoGeneral = "PAGADO";
    let subEstado = "PAGO_CONFIRMADO_BCE";
    let idAreaActual = 4; // Tesorería
    let idCustodioActual = 8; // Margarita Alarcón
    let idCajaAsignada: number | null = null;
    let fechaPago: Date | null = null;
    let estaPausado = false;
    let motivoPausa: string | null = null;
    let diasPausa = 0;
    let esDevuelto = false;
    let motivoDevolucion: string | null = null;

    if (i <= 130) {
      // Mayo - Septiembre: Todos PAGADOS y archivados en Cajas 1 a 5
      estadoGeneral = "PAGADO";
      subEstado = "ALMACENADO_EN_CAJA";
      idAreaActual = 4;
      idCustodioActual = 8;
      idCajaAsignada = (i <= 25) ? 1 : (i <= 50) ? 2 : (i <= 75) ? 3 : (i <= 100) ? 4 : 5;
      countPagados++;
    } else {
      // Trámites 131 al 200: Fines de Septiembre y Octubre (Operación activa actual)
      const slot = (i - 131) % 10;
      if (slot === 0 || slot === 1) {
        // En Contabilidad: Sergio Lindao o Mariana Torres
        estadoGeneral = "CONTABILIDAD";
        subEstado = "EN_CONTROL_PREVIO_DEVENGADO";
        idAreaActual = 3;
        idCustodioActual = (i % 2 === 0) ? 6 : 7;
        countContabilidad++;
      } else if (slot === 2) {
        // En Presupuesto: Ana Belén Gómez o David Paredes
        estadoGeneral = "PRESUPUESTO";
        subEstado = "EN_CERTIFICACION_COMPROMISO";
        idAreaActual = 2;
        idCustodioActual = (i % 2 === 0) ? 4 : 5;
        countPresupuesto++;
      } else if (slot === 3 || slot === 4) {
        // En Recepción DFI: Lorena Zambrano
        estadoGeneral = "INGRESADO";
        subEstado = (slot === 3) ? "RECEPCIONADO_DFI" : "EN_LOTE_ENTREGA_PRESUPUESTO";
        idAreaActual = 1;
        idCustodioActual = 2;
        countIngresados++;
      } else if (slot === 5) {
        // En Revisión de Directora DFI para pago: Patricia Morales
        estadoGeneral = "EN_REVISION_DFI";
        subEstado = "PENDIENTE_AUTORIZACION_DFI";
        idAreaActual = 1;
        idCustodioActual = 1;
        countEnRevision++;
      } else if (slot === 6) {
        // Observado 72h
        estadoGeneral = "OBSERVADO";
        subEstado = (i % 2 === 0) ? "OBSERVACION_72H_ACTIVA" : "OBSERVACION_SUBSANADA";
        idAreaActual = 3;
        idCustodioActual = 7;
        countObservados++;
      } else if (slot === 7) {
        // Pausado por factura SRI
        estadoGeneral = "PAUSADO";
        subEstado = "EN_ESPERA_FACTURA_SRI";
        idAreaActual = 2;
        idCustodioActual = 4;
        estaPausado = true;
        motivoPausa = "Expediente ingresado sin comprobante fiscal electrónico validado en el portal del SRI.";
        diasPausa = 3;
        countPausados++;
      } else if (slot === 8) {
        // Devuelto
        estadoGeneral = "DEVUELTO";
        subEstado = "DEVUELTO_A_ADMINISTRADOR";
        idAreaActual = 1;
        idCustodioActual = 2;
        esDevuelto = true;
        motivoDevolucion = "Falta de informe de satisfacción suscrito por el administrador de contrato.";
        countDevueltos++;
      } else {
        // Pagado recientemente
        estadoGeneral = "PAGADO";
        subEstado = "PAGO_CONFIRMADO_BCE";
        idAreaActual = 4;
        idCustodioActual = 8;
        idCajaAsignada = 6;
        countPagados++;
      }
    }

    // Cronología de movimientos paso a paso
    const movimientos: Array<{
      fecha: Date;
      deUser: number;
      aUser: number;
      deArea: number;
      aArea: number;
      accion: string;
      comentarios: string;
    }> = [];

    // Paso 1: Ingreso en ventanilla DFI
    let fActual = new Date(fechaIngreso);
    movimientos.push({
      fecha: new Date(fActual),
      deUser: 2,
      aUser: 2,
      deArea: 1,
      aArea: 1,
      accion: "INGRESO_EXPEDIENTE",
      comentarios: `Expediente físico recibido en Secretaría General DFI mediante memorando ${nroQuipux} con ${fojas} fojas útiles y factura ${prov.ruc.slice(0, 3)}-001-${String(i).padStart(9, "0")}.`,
    });

    // Paso 2: Despacho a Presupuesto
    if (estadoGeneral !== "INGRESADO" || subEstado === "EN_LOTE_ENTREGA_PRESUPUESTO") {
      fActual = sumarHoras(fActual, 4);
      movimientos.push({
        fecha: new Date(fActual),
        deUser: 2,
        aUser: 3,
        deArea: 1,
        aArea: 2,
        accion: "ENTREGA_CONTROL_PREVIO_LOTE",
        comentarios: "Expediente físico derivado y entregado formalmente a Control Previo (Presupuesto) con firma de recepción institucional.",
      });
    }

    // Paso 3: Asignación a Analista de Presupuesto
    if (["PRESUPUESTO", "CONTABILIDAD", "EN_REVISION_DFI", "PAGADO", "OBSERVADO", "PAUSADO"].includes(estadoGeneral)) {
      fActual = sumarDiasHabiles(fActual, 1);
      const analistaPresupuesto = (i % 2 === 0) ? 4 : 5;
      const analistaNombre = analistaPresupuesto === 4 ? "Econ. Ana Belén Gómez" : "Ing. David Paredes";
      movimientos.push({
        fecha: new Date(fActual),
        deUser: 3,
        aUser: analistaPresupuesto,
        deArea: 2,
        aArea: 2,
        accion: "ASIGNAR_ANALISTA_PRESUPUESTO",
        comentarios: `Jefe de Presupuesto asigna expediente a ${analistaNombre} para verificación de certificación y compromiso de partidas.`,
      });

      // Si está pausado por factura aquí
      if (estaPausado) {
        fActual = sumarHoras(fActual, 3);
        movimientos.push({
          fecha: new Date(fActual),
          deUser: analistaPresupuesto,
          aUser: analistaPresupuesto,
          deArea: 2,
          aArea: 2,
          accion: "PAUSAR_SLA_FACTURA",
          comentarios: "Expediente colocado en pausa institucional por falta de factura electrónica emitida por el proveedor en el portal SRI.",
        });
      }

      // Paso 4: Visto bueno de Presupuesto y emisión de compromiso
      if (["CONTABILIDAD", "EN_REVISION_DFI", "PAGADO", "OBSERVADO"].includes(estadoGeneral)) {
        fActual = sumarDiasHabiles(fActual, 1);
        movimientos.push({
          fecha: new Date(fActual),
          deUser: analistaPresupuesto,
          aUser: 3,
          deArea: 2,
          aArea: 2,
          accion: "VISTO_BUENO_PRESUPUESTO",
          comentarios: `Revisión presupuestaria completada satisfactoriamente. CUR de Compromiso emitido bajo partida institucional 530204.`,
        });

        // Paso 5: Derivación a Contabilidad
        fActual = sumarHoras(fActual, 2);
        movimientos.push({
          fecha: new Date(fActual),
          deUser: 3,
          aUser: 6,
          deArea: 2,
          aArea: 3,
          accion: "DERIVAR_A_CONTABILIDAD",
          comentarios: "Expediente trasladado formalmente a Contabilidad para verificación de retenciones eSIGEF y devengado contable.",
        });

        // Paso 6: Asignación a Analista Contable si aplica
        if (idCustodioActual === 7 || ["EN_REVISION_DFI", "PAGADO"].includes(estadoGeneral)) {
          fActual = sumarHoras(fActual, 3);
          movimientos.push({
            fecha: new Date(fActual),
            deUser: 6,
            aUser: 7,
            deArea: 3,
            aArea: 3,
            accion: "ASIGNAR_ANALISTA_CONTABLE",
            comentarios: "Contador General asigna el trámite a CPA. Mariana Torres para control previo documental y liquidación de retenciones.",
          });
        }

        // Si fue observado
        if (estadoGeneral === "OBSERVADO") {
          fActual = sumarDiasHabiles(fActual, 1);
          movimientos.push({
            fecha: new Date(fActual),
            deUser: 7,
            aUser: 2,
            deArea: 3,
            aArea: 1,
            accion: "REGISTRAR_OBSERVACION_72H",
            comentarios: "Notificación de novedad documental: Requiere alcance por informe de satisfacción emitido por administrador de contrato.",
          });
          if (subEstado === "OBSERVACION_SUBSANADA") {
            fActual = sumarDiasHabiles(fActual, 2);
            movimientos.push({
              fecha: new Date(fActual),
              deUser: 2,
              aUser: 7,
              deArea: 1,
              aArea: 3,
              accion: "SUBSANACION_RECIBIDA",
              comentarios: "Documentación complementaria y alcance recibidos formalmente. Se levanta la observación y se reanuda el control contable.",
            });
          }
        }

        // Paso 7: Aprobación Contable y Emisión de Devengado
        if (["EN_REVISION_DFI", "PAGADO"].includes(estadoGeneral)) {
          fActual = sumarDiasHabiles(fActual, 2);
          movimientos.push({
            fecha: new Date(fActual),
            deUser: 7,
            aUser: 6,
            deArea: 3,
            aArea: 3,
            accion: "APROBACION_CONTABILIDAD",
            comentarios: `Control previo contable superado con éxito. CUR Devengado N° ${2000 + i} generado y contabilizado en eSIGEF.`,
          });

          // Paso 8: Entrega a Directora DFI para autorización de pago
          fActual = sumarHoras(fActual, 3);
          movimientos.push({
            fecha: new Date(fActual),
            deUser: 6,
            aUser: 1,
            deArea: 3,
            aArea: 1,
            accion: "REMITIR_A_DFI_PAGO",
            comentarios: "Expediente con devengado remitido al despacho de la Directora Financiera para suscripción de autorización de transferencia.",
          });

          // Paso 9: Autorización y Pase a Tesorería
          if (estadoGeneral === "PAGADO") {
            fActual = sumarDiasHabiles(fActual, 1);
            movimientos.push({
              fecha: new Date(fActual),
              deUser: 1,
              aUser: 8,
              deArea: 1,
              aArea: 4,
              accion: "AUTORIZAR_PAGO_DFI",
              comentarios: "Directora Financiera Dra. Patricia Morales suscribe autorización de desembolso para dispersión bancaria en Tesorería.",
            });

            // Paso 10: Ejecución de pago SPI / Banco Central
            fActual = sumarDiasHabiles(fActual, 1);
            fechaPago = new Date(fActual);
            movimientos.push({
              fecha: new Date(fActual),
              deUser: 8,
              aUser: 8,
              deArea: 4,
              aArea: 4,
              accion: "PAGO_CONFIRMADO_BCE",
              comentarios: `Transferencia interbancaria SPI Banco Central ejecutada exitosamente. Lote MEF N° 84920, Ref SPI-BCE-${String(90000 + i)}.`,
            });

            // Paso 11: Archivado en caja si aplica
            if (idCajaAsignada) {
              fActual = sumarHoras(fActual, 4);
              movimientos.push({
                fecha: new Date(fActual),
                deUser: 8,
                aUser: 8,
                deArea: 4,
                aArea: 4,
                accion: "ALMACENADO_EN_CAJA",
                comentarios: `Expediente archivado físicamente en la caja institucional N° CAJA-2026-00${idCajaAsignada}. Semáforo de SLA completado.`,
              });
            }
          }
        }
      }
    }

    // Si fue devuelto
    if (esDevuelto) {
      fActual = sumarDiasHabiles(fActual, 1);
      movimientos.push({
        fecha: new Date(fActual),
        deUser: 2,
        aUser: 2,
        deArea: 1,
        aArea: 1,
        accion: "DEVOLUCION_EXPEDIENTE",
        comentarios: `Expediente devuelto al área requirente ${areaReq}. Motivo: ${motivoDevolucion}`,
      });
    }

    // Datos del trámite
    const tieneCurCompromiso = ["CONTABILIDAD", "EN_REVISION_DFI", "PAGADO", "OBSERVADO"].includes(estadoGeneral);
    const tieneCurDevengado = ["EN_REVISION_DFI", "PAGADO"].includes(estadoGeneral);

    const tramiteCreado = await prisma.tramites.create({
      data: {
        id_tramite: id,
        codigo_tramite: codTramite,
        numero_quipux: nroQuipux,
        fecha_memorando: fechaMemorando,
        fecha_recepcion_fisica: fechaIngreso,
        id_tipo_tramite: prov.tipo,
        tipo_flujo: "PAGO",
        padre_gestion: "PAGO",
        tipo_gestion: "PAGO",
        area_requirente: areaReq,
        asunto: asunto,
        nro_tramite: nroTramite,
        periodo_pago: fechaIngreso.toLocaleDateString("es-EC", { month: "long", year: "numeric" }),
        proveedor_beneficiario: prov.nombre,
        ruc_proveedor: prov.ruc,
        subtotal: subtotal,
        monto_iva: montoIva,
        monto_retenciones: montoRet,
        monto_total: montoTotal,
        es_alta_cuantia: esAltaCuantia,
        numero_factura: `001-001-${String(100000 + i).padStart(9, "0")}`,
        fecha_factura: fechaMemorando,
        numero_cur_compromiso: tieneCurCompromiso ? String(1000 + i) : null,
        numero_cur_devengado: tieneCurDevengado ? String(2000 + i) : null,
        numero_cur_contable: tieneCurDevengado ? String(3000 + i) : null,
        certificacion_presupuestaria: tieneCurCompromiso ? `CP-SENAE-2026-${String(400 + i)}` : null,
        item_presupuestario: tieneCurCompromiso ? "530204 - SERVICIOS GENERALES" : null,
        aprobado_presupuesto: tieneCurCompromiso,
        fecha_aprobacion_presupuesto: tieneCurCompromiso ? movimientos.find(m => m.accion === "VISTO_BUENO_PRESUPUESTO")?.fecha || null : null,
        id_usuario_aprobador_presupuesto: tieneCurCompromiso ? 3 : null,
        aprobado_contabilidad: tieneCurDevengado,
        fecha_aprobacion_contabilidad: tieneCurDevengado ? movimientos.find(m => m.accion === "APROBACION_CONTABILIDAD")?.fecha || null : null,
        id_usuario_aprobador_contabilidad: tieneCurDevengado ? 6 : null,
        autorizado_pago: estadoGeneral === "PAGADO",
        fecha_autorizacion_pago: estadoGeneral === "PAGADO" ? movimientos.find(m => m.accion === "AUTORIZAR_PAGO_DFI")?.fecha || null : null,
        id_usuario_autoriza_pago: estadoGeneral === "PAGADO" ? 1 : null,
        fecha_pago: fechaPago,
        comprobante_pago: fechaPago ? `COMP-SPI-2026-${String(5000 + i)}` : null,
        spi_bce_referencia: fechaPago ? `SPI-BCE-2026-${String(90000 + i)}` : null,
        lote_mef: fechaPago ? "LOTE-MEF-2026-084" : null,
        fojas_fisicas: fojas,
        numero_hojas: fojas,
        id_area_actual: idAreaActual,
        id_custodio_actual: idCustodioActual,
        estado_general: estadoGeneral,
        sub_estado: subEstado,
        esta_pausado: estaPausado,
        motivo_pausa: motivoPausa,
        fecha_pausa: estaPausado ? fActual : null,
        dias_pausa_acumulados: diasPausa,
        es_devuelto: esDevuelto,
        motivo_devolucion: motivoDevolucion,
        fecha_ingreso: fechaIngreso,
        fecha_ultimo_movimiento: fActual,
        fecha_ultima_modificacion: fActual,
        id_caja: idCajaAsignada,
        codigo_tomo_caja: idCajaAsignada ? `TOMO-0${(i % 3) + 1}` : null,
        estanteria: idCajaAsignada ? `EST-0${idCajaAsignada}-BOD` : null,
      },
    });

    // Guardar movimientos
    for (const mov of movimientos) {
      await prisma.historial_movimientos.create({
        data: {
          id_tramite: tramiteCreado.id_tramite,
          id_usuario_entrega: mov.deUser,
          id_usuario_recibe: mov.aUser,
          id_area_origen: mov.deArea,
          id_area_destino: mov.aArea,
          tipo_accion: mov.accion,
          comentarios: mov.comentarios,
          fecha_hora: mov.fecha,
        },
      });
    }

    // Agregar Referencias y Alcances (Quipux adicionales) a 50 trámites
    if (i % 4 === 0) {
      const fRef = new Date(fechaIngreso);
      fRef.setDate(fRef.getDate() + 1);
      await prisma.tramite_referencias.create({
        data: {
          id_tramite: tramiteCreado.id_tramite,
          tipo_documento: "MEMORANDO",
          tipo_personalizado: "ALCANCE",
          numero_documento: `SENAE-${areaCodeQuipux}-2026-${String(2000 + i)}-M`,
          fecha_documento: fRef,
          asunto_sumilla: `Alcance al trámite: Se adjunta informe técnico ampliatorio de conformidad del servicio emitido por la comisión receptora.`,
          id_usuario_registro: 2, // Lorena Zambrano
        },
      });

      if (i % 8 === 0) {
        await prisma.tramite_referencias.create({
          data: {
            id_tramite: tramiteCreado.id_tramite,
            tipo_documento: "OFICIO",
            tipo_personalizado: "CERTIFICADO_BANCARIO",
            numero_documento: `CERT-BANC-${prov.ruc.slice(0, 6)}-2026`,
            fecha_documento: fRef,
            asunto_sumilla: `Actualización de cuenta bancaria corporativa certificada para acreditación de pagos SPI BCE.`,
            id_usuario_registro: 2,
          },
        });
      }
    }

    // Agregar Observaciones a ~40 trámites
    if (i % 5 === 0) {
      const fObs = new Date(fechaIngreso);
      fObs.setDate(fObs.getDate() + 2);
      const resuelta = (i <= 140);
      await prisma.observaciones.create({
        data: {
          id_tramite: tramiteCreado.id_tramite,
          id_area_origen: 3, // Contabilidad
          id_usuario_origen: 7, // Mariana Torres
          id_area_destino: 1, // DFI
          id_area_reporta: 3,
          id_usuario_reporta: 7,
          detalle_observacion: `Se observa que en el acta entrega recepción falta la firma electrónica del delegado de bodega aduanera y el desglose de retención 1.75% del impuesto a la renta.`,
          fecha_reporte: fObs,
          estado_observacion: resuelta ? "RESUELTA" : "PENDIENTE",
          respuesta_observacion: resuelta
            ? `Se subsana observación adjuntando adenda aclaratoria N° 01 con las firmas electrónicas certificadas requeridas.`
            : null,
          id_usuario_responde: resuelta ? 2 : null,
          fecha_respuesta: resuelta ? sumarDiasHabiles(fObs, 2) : null,
          fecha_resolucion: resuelta ? sumarDiasHabiles(fObs, 2) : null,
        },
      });
    }

    // Agregar Documentos Digitales adjuntos a ~60 trámites
    if (i % 3 === 0) {
      await prisma.documentos_tramite.create({
        data: {
          id_tramite: tramiteCreado.id_tramite,
          tipo_documento: "FACTURA_ELECTRONICA",
          nombre_original: `Factura_${prov.ruc}_${String(1000 + i)}.pdf`,
          nombre_guardado: `FAC_${prov.ruc}_${i}.pdf`,
          ruta_archivo: `/uploads/tramites/${i}/factura.pdf`,
          mimetype: "application/pdf",
          tamano_bytes: BigInt(245800 + (i * 1234)),
          id_usuario_sube: 2,
          fecha_subida: fechaIngreso,
          activo: true,
        },
      });

      await prisma.documentos_tramite.create({
        data: {
          id_tramite: tramiteCreado.id_tramite,
          tipo_documento: "ACTA_ENTREGA_RECEPCION",
          nombre_original: `Acta_Definitiva_Servicio_${i}.pdf`,
          nombre_guardado: `ACTA_${i}.pdf`,
          ruta_archivo: `/uploads/tramites/${i}/acta.pdf`,
          mimetype: "application/pdf",
          tamano_bytes: BigInt(512400 + (i * 850)),
          id_usuario_sube: 2,
          fecha_subida: fechaIngreso,
          activo: true,
        },
      });
    }

    if (i % 40 === 0) {
      console.log(`Progreso: ${i}/200 trámites procesados y guardados con su auditoría...`);
    }
  }

  console.log("=== POBLADO DE 200 TRÁMITES COMPLETADO ===");
  console.log(`- Trámites Pagados (archivados/liquidados): ${countPagados}`);
  console.log(`- Trámites en Revisión DFI: ${countEnRevision}`);
  console.log(`- Trámites en Contabilidad: ${countContabilidad}`);
  console.log(`- Trámites en Presupuesto: ${countPresupuesto}`);
  console.log(`- Trámites Ingresados (recepción DFI): ${countIngresados}`);
  console.log(`- Trámites Observados (72 Horas): ${countObservados}`);
  console.log(`- Trámites Pausados (Espera Factura SRI): ${countPausados}`);
  console.log(`- Trámites Devueltos: ${countDevueltos}`);
  console.log(`Total Trámites Creados: 200`);
}

main()
  .catch((e) => {
    console.error("Error al poblar la base de datos:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
