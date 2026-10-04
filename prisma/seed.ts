import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("Iniciando sembrado de datos institucionales SENAE...");

  // 1. Asegurar áreas
  const areasData = [
    { id_area: 1, nombre: "Dirección Financiera Aduanera", codigo: "DFI", orden_flujo: 1 },
    { id_area: 2, nombre: "Dirección Financiera - Presupuesto", codigo: "PRESUPUESTO", orden_flujo: 2 },
    { id_area: 3, nombre: "Dirección Financiera - Contabilidad", codigo: "CONTABILIDAD", orden_flujo: 3 },
    { id_area: 4, nombre: "Dirección Financiera - Tesorería / Caja", codigo: "TESORERIA", orden_flujo: 4 },
    { id_area: 5, nombre: "Gestión de Cobranzas y Garantías", codigo: "COBRANZAS", orden_flujo: 5 },
    { id_area: 6, nombre: "Archivo Contable", codigo: "ARCHIVO", orden_flujo: 6 },
    { id_area: 7, nombre: "Área Requirente / Solicitante", codigo: "REQUIRENTE", orden_flujo: 7 },
  ];

  for (const area of areasData) {
    await prisma.areas.upsert({
      where: { id_area: area.id_area },
      update: { nombre: area.nombre, codigo: area.codigo, orden_flujo: area.orden_flujo },
      create: area,
    });
  }
  console.log("Áreas institucionales verificadas.");

  // 2. Usuarios con 10 roles y estados
  const usuariosData = [
    {
      id_usuario: 1,
      id_area: 1,
      nombre_completo: "Dra. Patricia Morales",
      correo_institucional: "directora.dfi@aduana.gob.ec",
      cargo: "Directora Financiera",
      rol: "DIRECTORA" as const,
      activo: true,
      estado_disponibilidad: "DISPONIBLE" as const,
    },
    {
      id_usuario: 2,
      id_area: 1,
      nombre_completo: "Lorena Zambrano",
      correo_institucional: "secretaria.dfi@aduana.gob.ec",
      cargo: "Secretaria DFI",
      rol: "SECRETARIA" as const,
      activo: true,
      estado_disponibilidad: "DISPONIBLE" as const,
    },
    {
      id_usuario: 3,
      id_area: 2,
      nombre_completo: "Ing. Carlos Mendoza",
      correo_institucional: "jefe.presupuesto@aduana.gob.ec",
      cargo: "Jefe de Presupuesto",
      rol: "JEFE" as const,
      activo: true,
      estado_disponibilidad: "DISPONIBLE" as const,
    },
    {
      id_usuario: 4,
      id_area: 2,
      nombre_completo: "Econ. Ana Belén Gómez",
      correo_institucional: "analista.presupuesto1@aduana.gob.ec",
      cargo: "Analista de Presupuesto 1",
      rol: "ANALISTA" as const,
      activo: true,
      estado_disponibilidad: "DISPONIBLE" as const,
    },
    {
      id_usuario: 5,
      id_area: 2,
      nombre_completo: "Ing. David Paredes",
      correo_institucional: "analista.presupuesto2@aduana.gob.ec",
      cargo: "Analista de Presupuesto 2",
      rol: "ANALISTA" as const,
      activo: true,
      estado_disponibilidad: "VACACIONES" as const, // Simulación de analista en vacaciones
    },
    {
      id_usuario: 6,
      id_area: 3,
      nombre_completo: "CPA. Sergio Lindao",
      correo_institucional: "contador.general@aduana.gob.ec",
      cargo: "Contador General",
      rol: "JEFE" as const,
      activo: true,
      estado_disponibilidad: "DISPONIBLE" as const,
    },
    {
      id_usuario: 7,
      id_area: 3,
      nombre_completo: "CPA. Mariana Torres",
      correo_institucional: "analista.contable@aduana.gob.ec",
      cargo: "Analista Contable 1",
      rol: "ANALISTA" as const,
      activo: true,
      estado_disponibilidad: "DISPONIBLE" as const,
    },
    {
      id_usuario: 8,
      id_area: 4,
      nombre_completo: "Econ. Margarita Alarcón",
      correo_institucional: "tesorero.general@aduana.gob.ec",
      cargo: "Tesorero General",
      rol: "JEFE" as const,
      activo: true,
      estado_disponibilidad: "DISPONIBLE" as const,
    },
    {
      id_usuario: 9,
      id_area: 5,
      nombre_completo: "Abg. Roberto Intriago",
      correo_institucional: "tecnico.cobranzas@aduana.gob.ec",
      cargo: "Técnico Cobranzas y Garantías",
      rol: "ANALISTA" as const,
      activo: true,
      estado_disponibilidad: "DISPONIBLE" as const,
    },
    {
      id_usuario: 10,
      id_area: 6,
      nombre_completo: "Sr. Manuel Ramos",
      correo_institucional: "custodio.archivo@aduana.gob.ec",
      cargo: "Custodio Archivo Contable",
      rol: "ANALISTA" as const,
      activo: true,
      estado_disponibilidad: "DISPONIBLE" as const,
    },
    {
      id_usuario: 11,
      id_area: 1,
      nombre_completo: "Ing. Administrador de Sistemas",
      correo_institucional: "admin@aduana.gob.ec",
      cargo: "Administrador General del Sistema",
      rol: "ADMIN" as const,
      activo: true,
      estado_disponibilidad: "DISPONIBLE" as const,
    },
  ];

  for (const u of usuariosData) {
    await prisma.usuarios.upsert({
      where: { id_usuario: u.id_usuario },
      update: {
        nombre_completo: u.nombre_completo,
        correo_institucional: u.correo_institucional,
        cargo: u.cargo,
        rol: u.rol,
        activo: u.activo,
        estado_disponibilidad: u.estado_disponibilidad,
      },
      create: u,
    });
  }
  console.log("Usuarios institucionales verificados.");

  // 3. Feriados
  const feriadosData = [
    { fecha: new Date("2026-01-01"), descripcion: "Año Nuevo", anio: 2026, tipo: "NACIONAL" as const },
    { fecha: new Date("2026-02-16"), descripcion: "Carnaval Día 1", anio: 2026, tipo: "NACIONAL" as const },
    { fecha: new Date("2026-02-17"), descripcion: "Carnaval Día 2", anio: 2026, tipo: "NACIONAL" as const },
    { fecha: new Date("2026-04-03"), descripcion: "Viernes Santo", anio: 2026, tipo: "NACIONAL" as const },
    { fecha: new Date("2026-05-01"), descripcion: "Día del Trabajo", anio: 2026, tipo: "NACIONAL" as const },
    { fecha: new Date("2026-05-24"), descripcion: "Batalla de Pichincha", anio: 2026, tipo: "NACIONAL" as const },
    { fecha: new Date("2026-07-25"), descripcion: "Fundación de Guayaquil", anio: 2026, tipo: "LOCAL" as const },
    { fecha: new Date("2026-08-10"), descripcion: "Primer Grito de Independencia", anio: 2026, tipo: "NACIONAL" as const },
    { fecha: new Date("2026-10-09"), descripcion: "Independencia de Guayaquil", anio: 2026, tipo: "LOCAL" as const },
    { fecha: new Date("2026-11-02"), descripcion: "Día de los Difuntos", anio: 2026, tipo: "NACIONAL" as const },
    { fecha: new Date("2026-11-03"), descripcion: "Independencia de Cuenca", anio: 2026, tipo: "NACIONAL" as const },
    { fecha: new Date("2026-12-25"), descripcion: "Navidad", anio: 2026, tipo: "NACIONAL" as const },
  ];

  for (const f of feriadosData) {
    await prisma.feriados.upsert({
      where: { fecha: f.fecha },
      update: { descripcion: f.descripcion, anio: f.anio, tipo: f.tipo },
      create: f,
    });
  }
  console.log("Calendario de feriados actualizado.");

  // 3.5 Catálogo de los 17 Procesos Normativos del SENAE
  const procesosData = [
    { codigo: "SERV_BASICOS", nombre: "Servicios básicos", tipo_cur_permitido: "DEVENGADO", requiere_item_presupuestario: true, requiere_factura: true },
    { codigo: "INFIMA_CUANTIA", nombre: "Contrataciones a través del mecanismo de ínfima cuantía", tipo_cur_permitido: "DEVENGADO", requiere_item_presupuestario: true, requiere_factura: true },
    { codigo: "CONTRATACION_SNCP", nombre: "Procesos de contratación regulados por el Sistema Nacional de Contratación Pública", tipo_cur_permitido: "DEVENGADO", requiere_item_presupuestario: true, requiere_factura: true },
    { codigo: "CONTRATO_DNTH", nombre: "Contrataciones directas que realiza la Dirección Nacional de Talento Humano", tipo_cur_permitido: "DEVENGADO", requiere_item_presupuestario: true, requiere_factura: true },
    { codigo: "CAJA_CHICA", nombre: "Reposición y/o liquidación del fondo de caja chica", tipo_cur_permitido: "CONTABLE", requiere_item_presupuestario: false, requiere_factura: false },
    { codigo: "GARANTIAS_ADUANA", nombre: "Devolución y/o ejecución de Garantías Aduaneras en efectivo", tipo_cur_permitido: "CONTABLE", requiere_item_presupuestario: false, requiere_factura: false },
    { codigo: "DEV_CAUCIONES", nombre: "Devolución de cauciones", tipo_cur_permitido: "CONTABLE", requiere_item_presupuestario: false, requiere_factura: false },
    { codigo: "VIATICOS_FUNC", nombre: "Viáticos al interior y exterior de los funcionarios del Servicio Nacional de Aduana del Ecuador", tipo_cur_permitido: "DEVENGADO", requiere_item_presupuestario: true, requiere_factura: false },
    { codigo: "TASAS_GENERALES", nombre: "Tasas generales", tipo_cur_permitido: "CONTABLE", requiere_item_presupuestario: false, requiere_factura: false },
    { codigo: "TASAS_MATRICULA", nombre: "Tasas de matriculación vehicular", tipo_cur_permitido: "CONTABLE", requiere_item_presupuestario: false, requiere_factura: false },
    { codigo: "CONVENIOS_PAGO", nombre: "Convenios de pago", tipo_cur_permitido: "DEVENGADO", requiere_item_presupuestario: true, requiere_factura: true },
    { codigo: "REMUNERACIONES", nombre: "Pago de remuneraciones y beneficios sociales", tipo_cur_permitido: "DEVENGADO", requiere_item_presupuestario: true, requiere_factura: false },
    { codigo: "REEMBOLSOS_GASTOS", nombre: "Reembolsos de gastos por excepción", tipo_cur_permitido: "DEVENGADO", requiere_item_presupuestario: true, requiere_factura: true },
    { codigo: "CONV_INTERINST", nombre: "Convenios interinstitucionales", tipo_cur_permitido: "DEVENGADO", requiere_item_presupuestario: true, requiere_factura: false },
    { codigo: "POLIZAS_SEGUROS", nombre: "Pagos de pólizas de seguros", tipo_cur_permitido: "CONTABLE", requiere_item_presupuestario: false, requiere_factura: true },
    { codigo: "IMPUT_CAUCION", nombre: "Imputación de caución a obligaciones pendientes de pago", tipo_cur_permitido: "CONTABLE", requiere_item_presupuestario: false, requiere_factura: false },
    { codigo: "OTROS_PROCESOS", nombre: "Otros no detallados en los términos que abarca el presente Manual", tipo_cur_permitido: "DEVENGADO", requiere_item_presupuestario: true, requiere_factura: true },
  ];

  for (const proc of procesosData) {
    const existing = await prisma.tipos_tramite.findFirst({
      where: {
        OR: [
          { codigo: proc.codigo },
          { nombre: proc.nombre },
        ],
      },
    });
    if (existing) {
      await prisma.tipos_tramite.update({
        where: { id_tipo_tramite: existing.id_tipo_tramite },
        data: {
          codigo: proc.codigo,
          nombre: proc.nombre,
          tipo_cur_permitido: proc.tipo_cur_permitido,
          requiere_item_presupuestario: proc.requiere_item_presupuestario,
          requiere_factura: proc.requiere_factura,
          activo: true,
        },
      });
    } else {
      await prisma.tipos_tramite.create({
        data: proc,
      });
    }
  }
  console.log("Catálogo de 17 Procesos Normativos SENAE verificado.");

  // 4. Seis trámites de demostración representativos
  const demoTramites = [
    {
      id_tramite: 101,
      codigo_tramite: "TRM-2026-0101",
      numero_quipux: "SENAE-DFI-2026-0101-M",
      fecha_memorando: new Date("2026-09-12"),
      fecha_recepcion_fisica: new Date("2026-09-12"),
      id_tipo_tramite: 1, // Ínfima Cuantía
      tipo_flujo: "PAGO",
      proveedor_beneficiario: "IMPORTADORA ECUATORIANA DE SUMINISTROS S.A.",
      ruc_proveedor: "0992384729001",
      subtotal: 4500.0,
      monto_iva: 675.0,
      monto_retenciones: 90.0,
      monto_multas: 0.0,
      monto_total: 5085.0,
      es_alta_cuantia: false,
      id_area_actual: 2, // PRESUPUESTO
      id_custodio_actual: 4, // Analista Belén Gómez (Round Robin)
      estado_general: "EN_PRESUPUESTO",
      sub_estado: "ASIGNADO_ROUND_ROBIN",
      numero_cur_compromiso: "CUR-COM-2026-1041",
      certificacion_presupuestaria: "CERT-2026-088",
      item_presupuestario: "530804 - Materiales de Oficina",
      fecha_ingreso: new Date("2026-09-12"),
      fecha_ultimo_movimiento: new Date("2026-09-12T14:30:00"),
    },
    {
      id_tramite: 102,
      codigo_tramite: "TRM-2026-0102",
      numero_quipux: "SENAE-DTH-2026-0450-M",
      fecha_memorando: new Date("2026-09-11"),
      fecha_recepcion_fisica: new Date("2026-09-11"),
      id_tipo_tramite: 3, // Procesos de Contratación
      tipo_flujo: "PAGO",
      proveedor_beneficiario: "CONSTRUCTORA NACIONAL DEL PACIFICO CIA. LTDA.",
      ruc_proveedor: "1791827364001",
      subtotal: 35000.0,
      monto_iva: 5250.0,
      monto_retenciones: 700.0,
      monto_multas: 0.0,
      monto_total: 39550.0,
      es_alta_cuantia: true,
      id_area_actual: 2, // PRESUPUESTO
      id_custodio_actual: 3, // Jefe de Presupuesto (Alta Cuantía >= $10k)
      estado_general: "EN_PRESUPUESTO",
      sub_estado: "ASIGNADO_ALTA_CUANTIA_JEFE",
      certificacion_presupuestaria: "CERT-2026-042",
      item_presupuestario: "730601 - Consultoría y Construcción",
      fecha_ingreso: new Date("2026-09-11"),
      fecha_ultimo_movimiento: new Date("2026-09-11T09:15:00"),
    },
    {
      id_tramite: 103,
      codigo_tramite: "TRM-2026-0103",
      numero_quipux: "SENAE-DIT-2026-0889-M",
      fecha_memorando: new Date("2026-09-08"),
      fecha_recepcion_fisica: new Date("2026-09-08"),
      id_tipo_tramite: 3,
      tipo_flujo: "PAGO",
      proveedor_beneficiario: "SOLUCIONES TECNOLOGICAS CLOUD ECUADOR",
      ruc_proveedor: "0993019284001",
      subtotal: 18000.0,
      monto_iva: 2700.0,
      monto_retenciones: 360.0,
      monto_multas: 0.0,
      monto_total: 20340.0,
      es_alta_cuantia: true,
      id_area_actual: 2, // PRESUPUESTO
      id_custodio_actual: 3,
      estado_general: "PAUSADO_ESPERA_FACTURA",
      sub_estado: "SEMAFORO_CONGELADO",
      esta_pausado: true,
      motivo_pausa: "En espera de emisión de factura electrónica por parte del contratista",
      fecha_pausa: new Date("2026-09-09T10:00:00"),
      dias_pausa_acumulados: 3,
      numero_cur_compromiso: "CUR-COM-2026-0912",
      certificacion_presupuestaria: "CERT-2026-019",
      item_presupuestario: "530704 - Mantenimiento de Software",
      aprobado_presupuesto: true,
      fecha_aprobacion_presupuesto: new Date("2026-09-09T09:30:00"),
      id_usuario_aprobador_presupuesto: 3,
      fecha_ingreso: new Date("2026-09-08"),
      fecha_ultimo_movimiento: new Date("2026-09-09T10:00:00"),
    },
    {
      id_tramite: 104,
      codigo_tramite: "TRM-2026-0104",
      numero_quipux: "SENAE-DNA-2026-0210-M",
      fecha_memorando: new Date("2026-09-07"),
      fecha_recepcion_fisica: new Date("2026-09-07"),
      id_tipo_tramite: 2, // Servicios Básicos
      tipo_flujo: "PAGO",
      proveedor_beneficiario: "EMPRESA ELECTRICA PUBLICA DE GUAYAQUIL CNEL EP",
      ruc_proveedor: "0968599020001",
      subtotal: 8200.0,
      monto_iva: 0.0,
      monto_retenciones: 0.0,
      monto_multas: 0.0,
      monto_total: 8200.0,
      es_alta_cuantia: false,
      id_area_actual: 3, // CONTABILIDAD
      id_custodio_actual: 6, // Contador General Sergio Lindao
      estado_general: "EN_CONTABILIDAD",
      sub_estado: "REVISION_CONTADOR_GENERAL",
      numero_factura: "001-002-009823412",
      fecha_factura: new Date("2026-09-05"),
      numero_cur_compromiso: "CUR-COM-2026-0811",
      numero_cur_devengado: "CUR-DEV-2026-0612",
      certificacion_presupuestaria: "CERT-2026-005",
      item_presupuestario: "530101 - Energía Eléctrica",
      aprobado_presupuesto: true,
      fecha_aprobacion_presupuesto: new Date("2026-09-07T16:00:00"),
      id_usuario_aprobador_presupuesto: 3,
      fecha_ingreso: new Date("2026-09-07"),
      fecha_ultimo_movimiento: new Date("2026-09-13T11:20:00"),
    },
    {
      id_tramite: 105,
      codigo_tramite: "TRM-2026-0105",
      numero_quipux: "SENAE-DDA-2026-0567-M",
      fecha_memorando: new Date("2026-09-05"),
      fecha_recepcion_fisica: new Date("2026-09-05"),
      id_tipo_tramite: 1,
      tipo_flujo: "PAGO",
      proveedor_beneficiario: "SEGURIDAD Y VIGILANCIA INTEGRAL GUARDIANES S.A.",
      ruc_proveedor: "1790019283001",
      subtotal: 12500.0,
      monto_iva: 1875.0,
      monto_retenciones: 250.0,
      monto_multas: 0.0,
      monto_total: 14125.0,
      es_alta_cuantia: true,
      id_area_actual: 1, // DFI PAGO
      id_custodio_actual: 1, // Directora Financiera Patricia Morales
      estado_general: "EN_AUTORIZACION_DFI",
      sub_estado: "PENDIENTE_AUTORIZACION_PAGO",
      numero_factura: "002-005-000123984",
      fecha_factura: new Date("2026-09-03"),
      numero_cur_compromiso: "CUR-COM-2026-0744",
      numero_cur_devengado: "CUR-DEV-2026-0599",
      certificacion_presupuestaria: "CERT-2026-012",
      item_presupuestario: "530208 - Servicio de Seguridad",
      aprobado_presupuesto: true,
      fecha_aprobacion_presupuesto: new Date("2026-09-06T10:00:00"),
      id_usuario_aprobador_presupuesto: 3,
      aprobado_contabilidad: true,
      fecha_aprobacion_contabilidad: new Date("2026-09-09T15:30:00"),
      id_usuario_aprobador_contabilidad: 6,
      fecha_ingreso: new Date("2026-09-05"),
      fecha_ultimo_movimiento: new Date("2026-09-14T08:30:00"),
    },
    {
      id_tramite: 106,
      codigo_tramite: "TRM-2026-0106",
      numero_quipux: "SENAE-DFI-2026-0034-M",
      fecha_memorando: new Date("2026-08-20"),
      fecha_recepcion_fisica: new Date("2026-08-20"),
      id_tipo_tramite: 4, // Viáticos al Interior
      tipo_flujo: "PAGO",
      proveedor_beneficiario: "ING. MARCELO ANDRADE PAZMIÑO",
      ruc_proveedor: "0918273645001",
      subtotal: 780.0,
      monto_iva: 0.0,
      monto_retenciones: 0.0,
      monto_multas: 0.0,
      monto_total: 780.0,
      es_alta_cuantia: false,
      id_area_actual: 6, // ARCHIVO
      id_custodio_actual: 10, // Custodio Archivo Manuel Ramos
      estado_general: "FINALIZADO_ARCHIVADO",
      sub_estado: "ARCHIVADO_DEFINITIVO",
      numero_cur_compromiso: "CUR-COM-2026-0312",
      numero_cur_devengado: "CUR-DEV-2026-0240",
      certificacion_presupuestaria: "CERT-2026-001",
      item_presupuestario: "530303 - Viáticos y Subsistencias",
      aprobado_presupuesto: true,
      aprobado_contabilidad: true,
      autorizado_pago: true,
      lote_mef: "LOTE-MEF-2026-0089",
      spi_bce_referencia: "SPI-BCE-TRF-9948210",
      comprobante_pago: "COMP-PAG-2026-0112",
      fecha_pago: new Date("2026-08-26"),
      fojas_fisicas: 38,
      codigo_tomo_caja: "TOMO-2026-VIAT-02",
      estanteria: "EST-A3-NIVEL2",
      ubicacion_archivo: "Archivo Central Bloque B - Estante A3",
      fecha_ingreso: new Date("2026-08-20"),
      fecha_ultimo_movimiento: new Date("2026-08-27T16:00:00"),
    },
  ];

  for (const t of demoTramites) {
    await prisma.tramites.upsert({
      where: { id_tramite: t.id_tramite },
      update: t,
      create: t,
    });

    // Crear referencia Quipux institucional de ejemplo
    await prisma.tramite_referencias.upsert({
      where: { id_referencia: t.id_tramite * 10 },
      update: {},
      create: {
        id_referencia: t.id_tramite * 10,
        id_tramite: t.id_tramite,
        tipo_documento: "MEMORANDO_ALCANCE",
        numero_documento: t.numero_quipux,
        fecha_documento: t.fecha_memorando,
        asunto_sumilla: `Memorando oficial remitido para gestión de pago: ${t.proveedor_beneficiario}`,
        id_usuario_registro: 2, // Secretaria Lorena
      },
    });

    // Crear entrada inicial en bitácora
    await prisma.historial_movimientos.create({
      data: {
        id_tramite: t.id_tramite,
        id_usuario_entrega: 2,
        id_usuario_recibe: t.id_custodio_actual,
        id_area_origen: 1,
        id_area_destino: t.id_area_actual,
        tipo_accion: "INGRESO_EXPEDIENTE",
        comentarios: `Trámite registrado y puesto en marcha en ${t.estado_general}. Beneficiario: ${t.proveedor_beneficiario}`,
        fecha_hora: t.fecha_ultimo_movimiento,
      },
    });
  }
  console.log("6 Trámites de demostración sembrados con éxito.");

  console.log("Proceso de inicialización y seeder finalizado con éxito.");
}

main()
  .catch((e) => {
    console.error("Error ejecutando seed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
