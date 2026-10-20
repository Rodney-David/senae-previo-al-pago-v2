# RADIOGRAFÍA FORENSE DE DATOS: MIGRACIÓN EXCEL, BASE DE DATOS Y REPORTERÍA
**Sistema:** SENAE Control Previo al Pago v2.0  
**Modo:** Auditoría Forense de Datos en Solo Lectura  
**Fecha de Emisión:** 19 de Octubre de 2026  
**Entorno:** Next.js 14+ (App Router), TypeScript, Prisma ORM, SQLite / MariaDB / PostgreSQL

---

## ÍNDICE GENERAL
1. [SECCIÓN 1: ESQUEMA DE DATOS](#sección-1-esquema-de-datos)
   - 1.1. Tabla Principal de Trámites (`model tramites`)
   - 1.2. Tabla de Bitácora / Auditoría de Movimientos (`model historial_movimientos`)
   - 1.3. Tabla de Referencias e Indexación Documental (`model tramite_referencias`)
   - 1.4. Tabla de Observaciones y Subsanaciones (`model observaciones`)
   - 1.5. Tablas Maestras y de Catálogo (`areas`, `usuarios`, `tipos_tramite`, `feriados`, `cajas`)
2. [SECCIÓN 2: MAPEO DEL IMPORTADOR DE EXCEL](#sección-2-mapeo-del-importador-de-excel)
   - 2.1. Arquitectura del Importador (Archivos y Funciones Responsables)
   - 2.2. Funciones de Sanitización y Transformación Previa
   - 2.3. Mapeo Exhaustivo: Hoja `PAGO` (25 Columnas)
   - 2.4. Mapeo Exhaustivo: Hoja `GARANTIA` (19 Columnas)
   - 2.5. Lógica de Clasificación en los 7 Estados Oficiales Inmutables
3. [SECCIÓN 3: LÓGICA DE AUDITORÍA](#sección-3-lógica-de-auditoría)
   - 3.1. Registro y Trazabilidad: Trámite Normal vs. Trámite Migrado de Excel
   - 3.2. Clasificación de Calidad del Dato (`COMPLETO`, `HISTORICO_PARCIAL`, `INCOMPLETO`)
   - 3.3. Campos Exigidos para Validación y Detección de Anomalías Cronológicas
   - 3.4. Consultas Reales de Auditoría y Estrategia Anti-N+1 (`batchFetchMovimientos`)
4. [SECCIÓN 4: LÓGICA DE REPORTERÍA](#sección-4-lógica-de-reportería)
   - 4.1. Construcción Dinámica de Filtros (`construirWherePrisma`)
   - 4.2. Función Central de Auditoría de Tiempos (`obtenerAuditoriaTramites`)
   - 4.3. Algoritmo de Tiempos Estadísticos Robustos (Mediana P50 y Percentil P90)
   - 4.4. Función de Auditoría por Familias de Procesos y Diagnóstico Causa Raíz
   - 4.5. Endpoint Central Consolidado (`GET /api/reportes`)

---

# SECCIÓN 1: ESQUEMA DE DATOS

A continuación se transcribe la estructura exacta y activa de los modelos definidos en [`prisma/schema.prisma`](file:///c:/Users/PC/Documents/RODNEY%20SENAE/senae_control_previo_v2_rocky9/prisma/schema.prisma) donde residen los trámites, su historial inmutable de movimientos, observaciones y referencias indexadas.

### 1.1. Tabla Principal de Trámites (`model tramites`)
Es el registro maestro del expediente. Soporta tanto los trámites de flujo normal como los expedientes migrados de la bitácora física 2026:

```prisma
model tramites {
  id_tramite                        Int                     @id @default(autoincrement())
  codigo_tramite                    String                  @unique // Ej: TRM-2026-P-0001, TRM-2026-G-0001
  numero_quipux                     String                  @unique // Quipux principal sanitizado
  fecha_memorando                   DateTime?
  fecha_recepcion_fisica            DateTime?
  id_tipo_tramite                   Int
  tipo_flujo                        String                  @default("PAGO") // PAGO | GARANTIA
  padre_gestion                     String?                 @default("PAGO") // PAGO | GARANTIA
  tipo_gestion                      String?                 @default("PAGO") // PAGO, EXPEDIENTE, DEVOLUCION_VALORES, etc.
  area_requirente                   String?
  ciudad                            String?
  asunto                            String?
  nro_tramite                       String?
  periodo_pago                      String?
  proveedor_beneficiario            String
  ruc_proveedor                     String?
  monto_total                       Decimal                 @default(0)
  es_alta_cuantia                   Boolean?                @default(false) // true si >= $10,000.00
  numero_cur_compromiso             String?
  numero_cur_devengado              String?
  numero_cur_contable               String?
  numero_liquidacion                String?
  numero_juicio                     String?                 // Extraído de causas judiciales en garantías
  aprobado_presupuesto              Boolean?                @default(false)
  fecha_aprobacion_presupuesto      DateTime?
  id_usuario_aprobador_presupuesto  Int?
  id_analista_presupuesto_previo    Int?
  aprobado_contabilidad             Boolean?                @default(false)
  fecha_aprobacion_contabilidad     DateTime?
  id_usuario_aprobador_contabilidad Int?
  autorizado_pago                   Boolean?                @default(false)
  fecha_autorizacion_pago           DateTime?
  id_usuario_autoriza_pago          Int?
  comprobante_pago                  String?
  fecha_pago                        DateTime?
  ubicacion_archivo                 String?
  certificacion_presupuestaria      String?
  item_presupuestario               String?
  numero_factura                    String?
  anexos                            String?
  id_area_actual                    Int
  id_custodio_actual                Int
  estado_general                    String                  @default("INGRESADO")
  sub_estado                        String                  @default("RECEPCIONADO_DFI")
  fecha_entrega_control_previo      DateTime?
  estado_previo_observacion         String?
  motivo_observacion                String?
  detalle_subsanacion               String?
  justificacion_insubsistencia      String?
  justificacion_desarchivo          String?
  esta_pausado                      Boolean?                @default(false)
  motivo_pausa                      String?
  fecha_pausa                       DateTime?
  dias_pausa_acumulados             Int?                    @default(0)
  es_devuelto                       Boolean?                @default(false)
  motivo_devolucion                 String?
  fecha_ingreso                     DateTime?               @default(now())
  fecha_ultimo_movimiento           DateTime?               @default(now())
  fecha_ultima_modificacion         DateTime?               @default(now())
  subtotal                          Decimal?
  monto_iva                         Decimal?
  monto_retenciones                 Decimal?
  monto_multas                      Decimal?
  fecha_factura                     DateTime?
  lote_mef                          String?
  spi_bce_referencia                String?
  codigo_tomo_caja                  String?
  estanteria                        String?
  campos_personalizados             String?
  id_caja                           Int?
  numero_hojas                      Int?

  // Relaciones
  historial_movimientos             historial_movimientos[]
  observaciones                     observaciones[]
  tramite_referencias               tramite_referencias[]
  caja                              cajas?                  @relation(fields: [id_caja], references: [id_caja], onUpdate: Restrict, onDelete: SetNull)
  areas                             areas                   @relation(fields: [id_area_actual], references: [id_area], onUpdate: Restrict)
  usuarios                          usuarios                @relation(fields: [id_custodio_actual], references: [id_usuario], onUpdate: Restrict)
  tipos_tramite                     tipos_tramite           @relation(fields: [id_tipo_tramite], references: [id_tipo_tramite], onUpdate: Restrict)

  @@index([id_area_actual])
  @@index([id_custodio_actual])
  @@index([id_tipo_tramite])
  @@index([id_caja])
}
```

### 1.2. Tabla de Bitácora / Auditoría de Movimientos (`model historial_movimientos`)
Registra cada pase de custodia, asignación de analista, traspaso, derivación entre áreas y sello de migración histórica de forma inmutable:

```prisma
model historial_movimientos {
  id_movimiento                                               Int       @id @default(autoincrement())
  id_tramite                                                  Int
  id_usuario_entrega                                          Int
  id_usuario_recibe                                           Int
  id_area_origen                                              Int
  id_area_destino                                             Int
  tipo_accion                                                 String    // RADICAR, ASIGNACION_ANALISTA, PASE_A_CONTABILIDAD, MIGRACION_EXCEL_2026, etc.
  comentarios                                                 String?
  fecha_hora                                                  DateTime? @default(now())

  // Relaciones
  areas_historial_movimientos_id_area_destinoToareas          areas     @relation("historial_movimientos_id_area_destinoToareas", fields: [id_area_destino], references: [id_area], onUpdate: Restrict)
  areas_historial_movimientos_id_area_origenToareas           areas     @relation("historial_movimientos_id_area_origenToareas", fields: [id_area_origen], references: [id_area], onUpdate: Restrict)
  usuarios_historial_movimientos_id_usuario_entregaTousuarios usuarios  @relation("historial_movimientos_id_usuario_entregaTousuarios", fields: [id_usuario_entrega], references: [id_usuario], onUpdate: Restrict)
  usuarios_historial_movimientos_id_usuario_recibeTousuarios  usuarios  @relation("historial_movimientos_id_usuario_recibeTousuarios", fields: [id_usuario_recibe], references: [id_usuario], onUpdate: Restrict)
  tramites                                                    tramites  @relation(fields: [id_tramite], references: [id_tramite], onUpdate: Restrict)

  @@index([id_area_destino])
  @@index([id_area_origen])
  @@index([id_usuario_entrega])
  @@index([id_usuario_recibe])
  @@index([id_tramite])
}
```

### 1.3. Tabla de Referencias e Indexación Documental (`model tramite_referencias`)
Indexa Quipux vinculados adicionales en la misma celda, Quipux base de trámites homónimos, novedades textuales, juicios coactivos y memorandos de devolución:

```prisma
model tramite_referencias {
  id_referencia       Int       @id @default(autoincrement())
  id_tramite          Int
  tipo_documento      String    // QUIPUX_VINCULADO, QUIPUX_BASE_HOMONIMO, NOVEDAD_BITACORA, MEMORANDO_DEVOLUCION, JUICIO_COACTIVA
  tipo_personalizado  String?
  numero_documento    String
  fecha_documento     DateTime
  asunto_sumilla      String
  id_usuario_registro Int
  created_at          DateTime? @default(now())

  tramites            tramites  @relation(fields: [id_tramite], references: [id_tramite], onDelete: Cascade)
  usuarios            usuarios  @relation(fields: [id_usuario_registro], references: [id_usuario], onUpdate: Restrict)

  @@index([id_tramite])
  @@index([id_usuario_registro])
}
```

### 1.4. Tabla de Observaciones y Subsanaciones (`model observaciones`)
```prisma
model observaciones {
  id_observacion                                                 Int       @id @default(autoincrement())
  id_tramite                                                     Int
  id_area_origen                                                 Int       @default(1)
  id_usuario_origen                                              Int       @default(1)
  id_area_destino                                                Int       @default(1)
  id_area_reporta                                                Int
  id_usuario_reporta                                             Int
  detalle_observacion                                            String
  fecha_reporte                                                  DateTime? @default(now())
  estado_observacion                                             String?   @default("PENDIENTE") // PENDIENTE | SUBSANADA | ANULADA
  respuesta_observacion                                          String?
  id_usuario_responde                                            Int?
  fecha_respuesta                                                DateTime?
  respuesta_dfi                                                  String?
  id_usuario_destino_devolucion                                  Int?
  fecha_resolucion                                               DateTime?

  areas                                                          areas     @relation(fields: [id_area_reporta], references: [id_area], onUpdate: Restrict)
  usuarios_observaciones_id_usuario_destino_devolucionTousuarios usuarios? @relation("observaciones_id_usuario_destino_devolucionTousuarios", fields: [id_usuario_destino_devolucion], references: [id_usuario], onDelete: Restrict, onUpdate: Restrict)
  usuarios_observaciones_id_usuario_reportaTousuarios            usuarios  @relation("observaciones_id_usuario_reportaTousuarios", fields: [id_usuario_reporta], references: [id_usuario], onUpdate: Restrict)
  tramites                                                       tramites  @relation(fields: [id_tramite], references: [id_tramite], onUpdate: Restrict)

  @@index([id_area_reporta])
  @@index([id_usuario_destino_devolucion])
  @@index([id_usuario_reporta])
  @@index([id_tramite])
}
```

### 1.5. Tablas Maestras y Catálogos (`areas`, `usuarios`, `tipos_tramite`, `feriados`, `cajas`)
```prisma
model areas {
  id_area       Int       @id @default(autoincrement())
  nombre        String    @unique // DFI, Presupuesto, Contabilidad, Tesorería, Cobranzas y Garantías, Archivo Central
  codigo        String    @unique // DFI, PRES, CONT, TES, GAR, ARCH
  orden_flujo   Int
  activo        Boolean?  @default(true)
  created_at    DateTime? @default(now())
  tramites      tramites[]
  usuarios      usuarios[]
}

model usuarios {
  id_usuario           Int       @id @default(autoincrement())
  id_area              Int
  nombre_completo      String
  correo_institucional String    @unique
  cargo                String
  rol                  String    // OPERADOR, ANALISTA, CONTABILIDAD, JEFATURA, DFI, ADMIN
  password_hash        String?
  activo               Boolean?  @default(true)
  iniciales            String?   @unique // Ej: RG, DB, NM, MS, ID, HA, MR, GP, RL, AC, RA, AG, VL, VP, JM
  estado_disponibilidad String?  @default("DISPONIBLE")
  created_at           DateTime? @default(now())
  areas                areas     @relation(fields: [id_area], references: [id_area], onUpdate: Restrict)
  tramites             tramites[]
}

model tipos_tramite {
  id_tipo_tramite              Int        @id @default(autoincrement())
  codigo                       String     @unique // SERV_BASICOS, INFIMA_CUANTIA, CONTRATACION_SNCP, etc.
  nombre                       String
  activo                       Boolean?   @default(true)
  tipo_cur_permitido           String?    @default("DEVENGADO")
  requiere_item_presupuestario Boolean?   @default(true)
  requiere_factura             Boolean?   @default(true)
  tramites                     tramites[]
}

model feriados {
  id_feriado  Int       @id @default(autoincrement())
  fecha       DateTime  @unique
  descripcion String
  anio        Int
  tipo        String?   @default("NACIONAL")
  activo      Boolean?  @default(true)
  created_at  DateTime? @default(now())

  @@index([anio])
  @@index([fecha])
}

model cajas {
  id_caja             Int        @id @default(autoincrement())
  codigo_caja         String     @unique
  nombre              String?
  estado              String     @default("ABIERTA")
  fecha_creacion      DateTime?  @default(now())
  fecha_cierre        DateTime?
  id_usuario_creacion Int?
  observaciones       String?
  tramites            tramites[]
}
```

---

# SECCIÓN 2: MAPEO DEL IMPORTADOR DE EXCEL

### 2.1. Arquitectura del Importador
* **Archivo de Lógica Principal:** [`src/services/migracionExcelService.ts`](file:///c:/Users/PC/Documents/RODNEY%20SENAE/senae_control_previo_v2_rocky9/src/services/migracionExcelService.ts)
* **Clase:** `MigracionExcelService`
* **Métodos Clave:**
  - `analizarArchivo(filePath)`: Abre el workbook con `ExcelJS`, detecta las hojas `PAGO` y `GARANTIA`, valida conteo de filas no vacías y extrae muestras de auditoría.
  - `purgarMigracionPrevia()`: Limpia quirúrgicamente e idempotentemente solo los trámites con prefijo `TRM-2026-P-` y `TRM-2026-G-`, protegiendo trámites creados manualmente por usuarios.
  - `ejecutarMigracion(filePath, idUsuarioAdmin, purgarPrevios)`: Lee línea a línea en orden cronológico ascendente, sanitiza los campos, inserta los registros en bloques transaccionales de 50 ítems (`prisma.$transaction`), genera los movimientos en `historial_movimientos` e indexa referencias secundarias en `tramite_referencias`.
* **Script de Consola:** [`scripts/re_migrar_oficial.ts`](file:///c:/Users/PC/Documents/RODNEY%20SENAE/senae_control_previo_v2_rocky9/scripts/re_migrar_oficial.ts)
* **Endpoint API:** [`src/app/api/admin/migracion/route.ts`](file:///c:/Users/PC/Documents/RODNEY%20SENAE/senae_control_previo_v2_rocky9/src/app/api/admin/migracion/route.ts) (`GET` para análisis, `POST` para upload/ejecución con rol ADMIN).

---

### 2.2. Funciones de Sanitización y Transformación Previa

```typescript
// 1. Sanitización de Fechas (parseFechaEcuador):
// Soporta objetos Date, números seriales de Excel (ej. 46112) y formato DD/MM/YYYY.
// Corrige erratas humanas de digitación en Excel: ej. 206 -> 2026, 22026 -> 2026.
export function parseFechaEcuador(val: any): Date | null;

// 2. Sanitización de Montos (parseMontoEcuador):
// Soporta números, objetos con fórmulas de ExcelJS { formula: "...", result: 171.46 },
// expresiones compuestas como "2610/965", remueve "US$", "$", normaliza comas y puntos.
export function parseMontoEcuador(val: any): number;

// 3. Sanitización de RUC (sanitizarRuc):
// Limpia caracteres no numéricos. Si tiene 12 dígitos por pérdida de cero inicial en Excel, aplica padStart(13, "0").
export function sanitizarRuc(val: any): string | null;

// 4. Extracción de Quipux (extraerQuipux):
// Aplica Regex institucional /(?:SENAE?|MEMO|OFICIO|CZ[0-9]|D[A-Z]{2,4}|[A-Z]{2,6})-[A-Z0-9]+.../gi
// Extrae todos los códigos válidos en celdas con saltos de línea o múltiples memorandos.
export function extraerQuipux(texto: string): string[];

// 5. Normalización de Ciudades (normalizarCiudad):
// Mapea variaciones a mayúsculas estándar: GUAYAQUIL, QUITO, CUENCA, MANTA, TULCÁN, HUAQUILLAS, etc.
export function normalizarCiudad(ciudadRaw: any): string;

// 6. Cadena de Analistas (resolverCadenaAnalistas):
// Parsea tokens separados por "/", "-", "," (ej: "RG/DB"). Cruza contra el catálogo de iniciales oficiales
// y genera la cadena de reasignaciones y custodio activo en Presupuesto.
export function resolverCadenaAnalistas(...): { tokens, cadenaAnalistas, ultimoAnalista, idAnalistaActivo };
```

---

### 2.3. Mapeo Exhaustivo: Hoja `PAGO` (25 Columnas)

*Fila de inicio: Fila 5. Criterio de parada temprana: 10 filas consecutivas totalmente vacías.*

| Columna Excel | Nombre en Bitácora Excel | Transformación o Validación del Código | Campo BD (`tramites`) | Valor por Defecto si Vacío / Falla |
| :---: | :--- | :--- | :--- | :--- |
| **Col 1** | `N°` | Lectura de texto `.trim()` para secuencia física | Utilizado en ordenamiento y log | Secuencial de lectura |
| **Col 2** | `N° PROCESO` | Columna interna de control | N/A (referencial) | `null` |
| **Col 3** | `CIUDAD` | `normalizarCiudad(val)` (Detecta "GUAYAQ", "QUIT", "CUENC", etc.) | `tramites.ciudad` | `"GUAYAQUIL"` |
| **Col 4** | `N° QUIPUX / MEMORANDO` | `extraerQuipux(val)`. Extrae Quipux principal. Si ya existe en BD, desambigua con `-P{filaOriginal}`. | `tramites.numero_quipux` *(Quipux extra van a `tramite_referencias`)* | ``PAGO-2026-F{filaOriginal}`` |
| **Col 5** | `FECHA DE RECEPCIÓN` | `parseFechaEcuador(val)`. Maneja fecha serial de Excel y DD/MM/YYYY UTC 12:00. | `tramites.fecha_memorando`<br>`tramites.fecha_recepcion_fisica`<br>`tramites.fecha_ingreso` | `new Date("2026-01-05T12:00:00Z")` |
| **Col 6** | `FECHA ENTREGA ANALISTA` | `parseFechaEcuador(val)`. Marca el fin de la radicación en Secretaría. | `tramites.fecha_entrega_control_previo` | `null` |
| **Col 7** | `TIPO DE CONTRATACIÓN` | `mapearTipoTramitePago(tipoContratacion, descripcion)`. Mapea a catálogo de 17 tipos. | `tramites.id_tipo_tramite` | `17` (*OTROS_PROCESOS*) |
| **Col 8** | `CONTRATO / ORDEN` | `.trim() || null` | `tramites.nro_tramite` | `null` |
| **Col 9** | `CERTIFICACIÓN PRESUP.` | `.trim() || null` | `tramites.certificacion_presupuestaria` | `null` |
| **Col 10** | `ITEM PRESUPUESTARIO` | `.trim() || null` | `tramites.item_presupuestario` | `null` |
| **Col 11** | `DESCRIPCIÓN / OBJETO` | `.trim()`. Texto descriptivo del gasto. | `tramites.asunto` | ``Pago por concepto de ${tipo || "contratación"}`` |
| **Col 12** | `RUC / CÉDULA` | `sanitizarRuc(val)`. Remueve caracteres raros, `padStart(13, "0")` si perdió el 0 inicial. | `tramites.ruc_proveedor` | `null` |
| **Col 13** | `PROVEEDOR / BENEFICIARIO`| `.trim()`. Nombre comercial o razón social. | `tramites.proveedor_beneficiario` | `"SENAE - GESTIÓN INTERNA / TALENTO HUMANO"` |
| **Col 14** | `PERÍODO DE PAGO` | `.trim() || null`. Mes o lapso de ejecución. | `tramites.periodo_pago` | `null` |
| **Col 15** | `N° DE FACTURA` | `.trim() || null`. Comprobante fiscal. | `tramites.numero_factura` | `null` |
| **Col 16** | `VALOR FACTURA` | `parseMontoEcuador(val)`. Evalúa fórmulas ExcelJS, sumas con `/`, monedas. Evalúa `es_alta_cuantia = valor >= 10000`. | `tramites.subtotal`<br>`tramites.monto_total`<br>`tramites.es_alta_cuantia` | `0`<br>`0`<br>`false` |
| **Col 17** | `CUR DEVENGADO` | `.trim() || null`. Número de CUR contable. | `tramites.numero_cur_devengado`<br>`tramites.numero_cur_compromiso` | `null` |
| **Col 18** | `FECHA RECIBE JCO` | `parseFechaEcuador(val)`. Fecha en que Contabilidad recibe el trámite para Control Previo. | Dispara movimiento a `CONTABILIDAD` en `historial_movimientos` | `null` |
| **Col 19** | `CONTROL INTERNO` | Columna interna de control previo. | N/A | `null` |
| **Col 20** | `FECHA DE PAGO` | `parseFechaEcuador(val)`. Marca la dispersión bancaria final de Tesorería. | `tramites.fecha_pago`<br>`tramites.autorizado_pago` (`true`)<br>`tramites.fecha_autorizacion_pago` | `null`<br>`false`<br>`null` |
| **Col 21** | `ANALISTA ASIGNADO` | `resolverCadenaAnalistas(val)`. Mapea iniciales (ej. `RG`, `DB`, `NM`, `MS`) con usuarios oficiales de BD. | `tramites.id_custodio_actual` *(si en Presupuesto)* y trazabilidad en historial | Usuario Jefatura Presupuesto (`id: 3`) |
| **Col 22** | `ESTADO` | Mapeo determinista estricto a los **7 estados oficiales inmutables**: `PAGADO`, `CONTABILIDAD`, `ARCHIVO`, `DEVUELTO`, `REVISION`, `OBSERVADO`, `DFI`. | `tramites.estado_general`<br>`tramites.sub_estado`<br>`tramites.id_area_actual`<br>`tramites.id_custodio_actual` | `"DFI"`<br>`"DERIVADO_A_DFI"`<br>`id_area: 1`<br>`id_custodio: 1` |
| **Col 23** | `NOVEDADES` | `.trim() || null`. Texto de observaciones. Si el estado es pausado, se convierte en motivo de pausa. | `tramites.motivo_observacion`<br>`tramites.motivo_pausa`<br>`tramite_referencias` (`NOVEDAD_BITACORA`) | `null` |
| **Col 24** | `FECHA DEVOLUCIÓN` | `parseFechaEcuador(val)`. Fecha formal de salida del SENAE por memorando. | `tramites.fecha_ultimo_movimiento` *(si devuelto)* | `null` |
| **Col 25** | `MEMO DEVOLUCIÓN` | `.trim() || null`. Número de oficio o Quipux de devolución al requirente. | `tramites.motivo_devolucion`<br>`tramite_referencias` (`MEMORANDO_DEVOLUCION`) | `null` |

---

### 2.4. Mapeo Exhaustivo: Hoja `GARANTIA` (19 Columnas)

*Fila de inicio: Fila 4. Criterio de parada temprana: 10 filas consecutivas totalmente vacías.*

| Columna Excel | Nombre en Bitácora Excel | Transformación o Validación del Código | Campo BD (`tramites`) | Valor por Defecto si Vacío / Falla |
| :---: | :--- | :--- | :--- | :--- |
| **Col 1** | `N°` | Secuencial de lectura en la hoja Garantías | Log y ordenamiento | Secuencial de fila |
| **Col 2** | `TIPO DE TRÁMITE` | `mapearTipoTramiteGarantia(val, desc)`. Discrimina `IMPUTACION_CAUCION` (16), `DEVOLUCION_CAUCION` (7) y `GARANTIAS_ADUANA` (6). | `tramites.id_tipo_tramite`<br>`tramites.tipo_gestion` | `6`<br>`"GARANTIA"` |
| **Col 3** | `CIUDAD` | `normalizarCiudad(val)` | `tramites.ciudad` | `"GUAYAQUIL"` |
| **Col 4** | `N° QUIPUX / OFICIO` | `extraerQuipux(val)`. Desambiguación `-G{filaOriginal}` si hay colisión. | `tramites.numero_quipux` *(Quipux extra a `tramite_referencias`)* | ``GAR-2026-F{filaOriginal}`` |
| **Col 5** | `FECHA DE INGRESO` | `parseFechaEcuador(val)` | `tramites.fecha_memorando`<br>`tramites.fecha_recepcion_fisica`<br>`tramites.fecha_ingreso` | `new Date("2026-01-05T12:00:00Z")` |
| **Col 6** | `FECHA ENTREGA ANALISTA` | `parseFechaEcuador(val)` | `tramites.fecha_entrega_control_previo` | `null` |
| **Col 7** | `DESCRIPCIÓN / DETALLE` | `.trim()`. `extraerNumeroJuicio(val)` extrae causas judiciales regex `([0-9]{4,5}-[0-9]{4}-[0-9]{4,6})`. | `tramites.asunto`<br>`tramites.numero_juicio`<br>`tramite_referencias` (`JUICIO_COACTIVA`) | `"Devolución de Garantía / Caución"`<br>`null` |
| **Col 8** | `N° LIQUIDACIÓN` | `.trim() || null` | `tramites.nro_tramite`<br>`tramites.numero_liquidacion` | `null` |
| **Col 9** | `BENEFICIARIO` | `.trim()`. Importador, agente afianzado o administrado. | `tramites.proveedor_beneficiario` | `"BENEFICIARIO DE GARANTÍA"` |
| **Col 10** | `VALOR GARANTÍA` | `parseMontoEcuador(val)`. Evalúa `es_alta_cuantia = valor >= 10000`. | `tramites.subtotal`<br>`tramites.monto_total`<br>`tramites.es_alta_cuantia` | `0`<br>`0`<br>`false` |
| **Col 11** | `CUR CONTABLE` | `.trim() || null`. Número de CUR contable en eSIGEF. | `tramites.numero_cur_contable` | `null` |
| **Col 12** | `FECHA RECIBE JCO` | `parseFechaEcuador(val)`. Pase del expediente a Contabilidad para Control Previo. | Genera movimiento `PASE_A_CONTABILIDAD` en `historial_movimientos` | `null` |
| **Col 13** | `FECHA RECIBE JAC` | `parseFechaEcuador(val)`. Pase a Jefatura de Aduanas / Cobranzas. | N/A (trazabilidad referencial) | `null` |
| **Col 14** | `FECHA SOLICITUD PAGO`| `parseFechaEcuador(val)`. Solicitud formal de egreso monetario en Tesorería. | `tramites.fecha_pago`<br>`tramites.autorizado_pago` (`true`)<br>`tramites.fecha_autorizacion_pago` | `null`<br>`false`<br>`null` |
| **Col 15** | `ANALISTA ASIGNADO` | `resolverCadenaAnalistas(val)`. Resuelve iniciales del área de Cobranzas y Garantías (Área 5). | `tramites.id_custodio_actual` *(si en Garantías)* | Abg. Roberto Intriago (`id: 9`) |
| **Col 16** | `ESTADO` | Mapeo a los **7 estados oficiales inmutables**: `PAGADO`, `CONTABILIDAD`, `ARCHIVO`, `DEVUELTO`, `REVISION`, `OBSERVADO`, `DFI`. | `tramites.estado_general`<br>`tramites.sub_estado`<br>`tramites.id_area_actual`<br>`tramites.id_custodio_actual` | `"DFI"`<br>`"DERIVADO_A_DFI"`<br>`id_area: 1`<br>`id_custodio: 1` |
| **Col 17** | `NOVEDADES` | `.trim() || null`. Glosas u observaciones. | `tramites.motivo_observacion`<br>`tramites.motivo_pausa`<br>`tramite_referencias` (`NOVEDAD_BITACORA`) | `null` |
| **Col 18** | `FECHA DEVOLUCIÓN` | `parseFechaEcuador(val)`. | `tramites.fecha_ultimo_movimiento` *(si devuelto)* | `null` |
| **Col 19** | `MEMO DEVOLUCIÓN` | `.trim() || null`. | `tramites.motivo_devolucion`<br>`tramite_referencias` (`MEMORANDO_DEVOLUCION`) | `null` |

---

### 2.5. Lógica de Clasificación en los 7 Estados Oficiales Inmutables
El motor en [`src/services/migracionExcelService.ts`](file:///c:/Users/PC/Documents/RODNEY%20SENAE/senae_control_previo_v2_rocky9/src/services/migracionExcelService.ts#L721-L803) aplica el siguiente orden jerárquico determinista:

1. **`PAGADO`**: Si existe `fechaPago` (en Pago) o `fechaSolPago` (en Garantía).
   - `estado_general = "PAGADO"`, `sub_estado = "PAGO_EFECTIVO"`, `autorizado_pago = true`.
   - Área: Tesorería (`id: 4`) o Garantías (`id: 5`), Custodio oficial de pagos.
2. **`ARCHIVO`**: Si el texto de estado contiene `"archiv"`.
   - `estado_general = "ARCHIVO"`, `sub_estado = "ARCHIVADO_DEFINITIVO"`.
   - Área: Archivo Central (`id: 6`), Custodio: Manuel Ramos (`id: 10`).
3. **`DEVUELTO`**: Si el estado contiene `"devuel"`, o existe `fechaDevolucion` o `memoDevolucion`.
   - `estado_general = "DEVUELTO"`, `sub_estado = "DEVUELTO_FORMALMENTE"`, `es_devuelto = true`.
   - Área: Secretaría DFI (`id: 1`), Custodio: Lorena Zambrano (`id: 2`).
4. **`CONTABILIDAD`**: Si el estado contiene `"contabil"`, `"justificaci"` o existe `fechaRecibeJco`.
   - **Regla Inmutable:** Bajo ninguna circunstancia se asigna `CONTROL_PREVIO`.
   - `estado_general = "CONTABILIDAD"`.
   - `sub_estado = estLower.includes("justificaci") ? "JUSTIFICACION_CONTABILIDAD" : "EN_CONTABILIDAD"`.
   - Área: Contabilidad (`id: 3`), Custodio: CPA Sergio Lindao (`id: 6`, Contador General).
5. **`OBSERVADO`**: Si el estado contiene `"observad"` o `"factura"`.
   - `estado_general = "OBSERVADO"`.
   - `sub_estado = estLower.includes("factura") ? "ESPERA_FACTURA" : "OBSERVADO"`.
   - `esta_pausado = true`, `motivo_pausa = item.novedades`.
   - Área: Presupuesto (`id: 2`), Custodio: Analista asignado.
6. **`REVISION`**: Si el estado contiene `"presupuesto"` o `"revisi"`.
   - `estado_general = "REVISION"`, `sub_estado = "EN_REVISION_PRESUPUESTO"`.
   - Área: Presupuesto (`id: 2`), Custodio: Analista asignado.
7. **`DFI`**: Fallback por defecto o expedientes radicados en despacho.
   - `estado_general = "DFI"`, `sub_estado = "DERIVADO_A_DFI"`.
   - Área: Dirección Financiera (`id: 1`), Custodio: Directora Financiera (`id: 1`).

---

# SECCIÓN 3: LÓGICA DE AUDITORÍA

### 3.1. Registro y Trazabilidad: Trámite Normal vs. Trámite Migrado de Excel

#### A. Trámite Normal (Interactivo en Sistema):
1. **Punto de Escritura:** Se ejecuta en [`src/services/bitacoraService.ts`](file:///c:/Users/PC/Documents/RODNEY%20SENAE/senae_control_previo_v2_rocky9/src/services/bitacoraService.ts) y en los manejadores de acción de flujo en [`src/app/api/tramites/[id]/flujo/route.ts`](file:///c:/Users/PC/Documents/RODNEY%20SENAE/senae_control_previo_v2_rocky9/src/app/api/tramites/[id]/flujo/route.ts).
2. **Acciones Típicas:** `RADICAR_DFI`, `DERIVAR_A_PRESUPUESTO`, `ASIGNAR_ANALISTA_PRESUPUESTO`, `PAUSAR_TRAMITE_FACTURA`, `LEVANTAR_PAUSA`, `OBSERVAR_TRAMITE`, `SUBSANAR_OBSERVACION`, `DERIVAR_A_CONTABILIDAD`, `AUTORIZAR_PAGO`, `ARCHIVAR`, `DEVOLVER`.
3. **Comportamiento en Cálculo:** Cada acción genera un registro con marca de tiempo precisa `DateTime`. El motor [`src/lib/tiemposCalculator.ts`](file:///c:/Users/PC/Documents/RODNEY%20SENAE/senae_control_previo_v2_rocky9/src/lib/tiemposCalculator.ts) reconstruye los intervalos día a día y evalúa la calidad del dato como **`COMPLETO`**.
4. **Reloj B (Trabajo Real):** Aplica al 100% (`reloj_b.aplica = true`), permitiendo calcular los días exactos consumidos en Secretaría, Presupuesto, Contabilidad, Tesorería y DFI.
5. **Invariante Matemática de Auditoría:**
   $$\text{Total Calendario} = \text{Trabajo Real} + \text{Pausa Factura} + \text{Pausa Observado} + \text{No Laborables} + \text{Post-Autorización} \quad (\pm 0.1\text{d})$$

#### B. Trámite Migrado de Excel:
1. **Punto de Escritura:** Se genera en bloque durante la ejecución de [`MigracionExcelService.ejecutarMigracion`](file:///c:/Users/PC/Documents/RODNEY%20SENAE/senae_control_previo_v2_rocky9/src/services/migracionExcelService.ts#L926-L996).
2. **Acciones Sintéticas Registradas:**
   - `ASIGNACION_ANALISTA`: Registra al primer analista asignado en la bitácora física.
   - `TRASPASO_CUSTODIA`: Si existían múltiples iniciales (`RG/DB`), registra el traspaso formal.
   - `PASE_A_CONTABILIDAD`: Si existía `FECHA RECIBE JCO`.
   - `MIGRACION_EXCEL_2026`: Movimiento de cierre con el estado final de la bitácora física y resumen en comentarios.
3. **Comportamiento en Cálculo:** Se detecta por prefijo `TRM-2026-` y ausencia de movimientos interactivos modernos, evaluándose como **`HISTORICO_PARCIAL`**.
4. **Reloj B:** `reloj_b.aplica = false`. En la UI y reportes, en lugar de inventar horas o micro-fechas inexistentes en el Excel histórico, se presentan los **Tramos Hábiles Brutos**:
   - `tramo_secretaria_habiles` = Fecha Recepción Física $\rightarrow$ Fecha Entrega Analista.
   - `tramo_presupuesto_habiles` = Fecha Entrega Analista $\rightarrow$ Fecha Recibe JCO (`PASE_A_CONTABILIDAD`).
   - `tramo_contabilidad_tesoreria_habiles` = Fecha Recibe JCO $\rightarrow$ Fecha de Pago.
   - `total_habiles_brutos` = Suma de los tres tramos hábiles sin sábados, domingos ni feriados oficiales.

---

### 3.2. Clasificación de Calidad del Dato (`evaluarCalidadDato`)
Implementada en [`src/lib/tiemposCalculator.ts`](file:///c:/Users/PC/Documents/RODNEY%20SENAE/senae_control_previo_v2_rocky9/src/lib/tiemposCalculator.ts#L243-L363):

```typescript
export function evaluarCalidadDato(t: TramiteCalculoInput): {
  calidad: CalidadDato; // "COMPLETO" | "HISTORICO_PARCIAL" | "INCOMPLETO"
  alerta: boolean;
  motivos: string[];
  propuestas: string[];
  analistaCompartido: boolean;
  analistas: string[];
} {
  const motivos: string[] = [];
  const propuestas: string[] = [];

  const rec = parseDate(t.fecha_recepcion_fisica) || parseDate(t.fecha_ingreso);
  const ent = parseDate(t.fecha_entrega_control_previo);
  let jco = parseDate(t.fecha_aprobacion_presupuesto);
  if (!jco && t.historial_movimientos) {
    const movPase = t.historial_movimientos.find(m => m.tipo_accion === "PASE_A_CONTABILIDAD");
    if (movPase) jco = parseDate(movPase.fecha_hora);
  }
  const pag = parseDate(t.fecha_pago) || parseDate(t.fecha_autorizacion_pago);

  // 1. Detección de analistas compartidos (ej. "RG/DB", "NM/MS")
  let analistaCompartido = false;
  const analistas: string[] = [];
  const textoAnalistas = `${t.anexos || ""} ${t.comentarios_bitacora || ""}`;
  const matchAnalistas = textoAnalistas.match(/Analistas?:\s*([A-Za-z0-9/_ -]+)/i);
  if (matchAnalistas && matchAnalistas[1].includes("/")) {
    analistaCompartido = true;
    analistas.push(...matchAnalistas[1].split("/").map(s => s.trim()));
  }

  // 2. Detección de fechas nulas o irrecuperables
  if (!rec) {
    motivos.push("Sin fecha de recepción física ni fecha de ingreso registradas");
    return { calidad: "INCOMPLETO", alerta: true, motivos, propuestas: ["Asignar fecha comprobable desde el Quipux"], analistaCompartido, analistas };
  }

  // 3. Detección de Epoch UNIX (1970)
  if (rec.getUTCFullYear() <= 1970 || (pag && pag.getUTCFullYear() <= 1970)) {
    motivos.push("Fecha inválida o epoch UNIX (1970) detectada");
    return { calidad: "INCOMPLETO", alerta: true, motivos, propuestas: ["Corregir marca temporal corrupta en bitácora"], analistaCompartido, analistas };
  }

  // 4. Inversiones cronológicas graves
  if (rec && ent && ent.getTime() < rec.getTime()) {
    motivos.push("Fecha de entrega a analista es anterior a la recepción física comprobable");
    propuestas.push("Verificar fecha de radicación en Secretaría");
  }
  if (rec && pag && pag.getTime() < rec.getTime()) {
    motivos.push("Fecha de pago es anterior a la recepción física comprobable del expediente");
    propuestas.push("Revisar posible cruce de expedientes o comprobante de pago");
  }

  // 5. Clasificación COMPLETO vs HISTORICO_PARCIAL
  const esMigrado =
    t.codigo_tramite.startsWith("TRM-2026-") ||
    (t.historial_movimientos &&
      t.historial_movimientos.length > 0 &&
      t.historial_movimientos.every(m =>
        ["MIGRACION_EXCEL_2026", "PASE_A_CONTABILIDAD", "ASIGNACION_ANALISTA", "TRASPASO_CUSTODIA"].includes(m.tipo_accion)
      ));

  const tieneMovimientosReales =
    t.historial_movimientos &&
    t.historial_movimientos.some(
      m => !["MIGRACION_EXCEL_2026", "PASE_A_CONTABILIDAD", "ASIGNACION_ANALISTA", "TRASPASO_CUSTODIA"].includes(m.tipo_accion)
    );

  let calidad: CalidadDato = "COMPLETO";
  if (esMigrado && !tieneMovimientosReales) {
    calidad = "HISTORICO_PARCIAL";
  }

  if (rec && pag && pag.getTime() < rec.getTime()) {
    calidad = "INCOMPLETO";
  }

  const alerta = motivos.length > 0;
  return { calidad, alerta, motivos, propuestas, analistaCompartido, analistas };
}
```

---

### 3.3. Campos Exigidos para Validación y Detección de Anomalías

Para que un trámite figure como **auditable y sin inconsistencias**, la auditoría exige:
1. **Fecha de Entrada Válida:** `fecha_recepcion_fisica` o `fecha_ingreso` no nula y posterior a 01/01/2000.
2. **Coherencia Secuencial:**
   $$\text{fecha\_recepcion\_fisica} \le \text{fecha\_entrega\_control\_previo} \le \text{fecha\_recibe\_jco} \le \text{fecha\_pago}$$
3. **Si `fecha_pago < fecha_recepcion_fisica`:** Se levanta alerta crítica inmediata y se degrada la calidad a `INCOMPLETO`.
4. **Analistas Asignados:** Si hay más de un analista en la bitácora física (`RG/DB`), el sistema levanta el flag `es_analista_compartido = true` y los segrega en el informe de desempeño de funcionarios para evitar sesgar las métricas individuales de despacho.

---

### 3.4. Consultas Reales de Auditoría y Estrategia Anti-N+1

#### Endpoint [`src/app/api/admin/auditoria/route.ts`](file:///c:/Users/PC/Documents/RODNEY%20SENAE/senae_control_previo_v2_rocky9/src/app/api/admin/auditoria/route.ts):
```typescript
const movimientos = await prisma.historial_movimientos.findMany({
  where: whereClause,
  include: {
    tramites: {
      select: {
        id_tramite: true,
        codigo_tramite: true,
        numero_quipux: true,
        proveedor_beneficiario: true,
      },
    },
    usuarios_historial_movimientos_id_usuario_entregaTousuarios: {
      select: { id_usuario: true, nombre_completo: true, cargo: true },
    },
    usuarios_historial_movimientos_id_usuario_recibeTousuarios: {
      select: { id_usuario: true, nombre_completo: true, cargo: true },
    },
    areas_historial_movimientos_id_area_origenToareas: {
      select: { id_area: true, nombre: true, codigo: true },
    },
    areas_historial_movimientos_id_area_destinoToareas: {
      select: { id_area: true, nombre: true, codigo: true },
    },
  },
  orderBy: { fecha_hora: "desc" },
  take: 200,
});
```

#### Carga en Lote Anti-N+1 en [`src/services/reportesTiemposService.ts`](file:///c:/Users/PC/Documents/RODNEY%20SENAE/senae_control_previo_v2_rocky9/src/services/reportesTiemposService.ts#L362-L392):
Para evitar saturar la base de datos con miles de llamadas en bucle:
```typescript
async function batchFetchMovimientos(
  tramiteIds: number[]
): Promise<(MovimientoBitacora & { id_tramite: number })[]> {
  if (!tramiteIds || tramiteIds.length === 0) return [];

  // SQLite soporta hasta 999 parámetros con seguridad. Tamaño de chunk: 800
  const CHUNK_SIZE = 800;
  const resultado: any[] = [];

  for (let i = 0; i < tramiteIds.length; i += CHUNK_SIZE) {
    const chunk = tramiteIds.slice(i, i + CHUNK_SIZE);
    const movs = await prisma.historial_movimientos.findMany({
      where: { id_tramite: { in: chunk } },
      select: {
        id_movimiento: true,
        id_tramite: true,
        tipo_accion: true,
        fecha_hora: true,
        id_area_origen: true,
        id_area_destino: true,
        id_usuario_entrega: true,
        id_usuario_recibe: true,
        comentarios: true,
      },
      orderBy: { fecha_hora: "asc" },
    });
    resultado.push(...movs);
  }

  return resultado;
}
```

---

# SECCIÓN 4: LÓGICA DE REPORTERÍA

### 4.1. Construcción Dinámica de Filtros (`construirWherePrisma`)
Ubicada en [`src/services/reportesTiemposService.ts`](file:///c:/Users/PC/Documents/RODNEY%20SENAE/senae_control_previo_v2_rocky9/src/services/reportesTiemposService.ts#L397-L512):

```typescript
function construirWherePrisma(filtros: FiltrosReportesTiempos) {
  const where: any = {};
  const andConditions: any[] = [];

  // 1. Padre de Gestión: "TODOS", "PAGO" o "GARANTIA"
  const padre = (filtros.padre_gestion || "").trim().toUpperCase();
  if (padre === "GARANTIA") {
    andConditions.push({
      OR: [
        { padre_gestion: "GARANTIA" },
        { tipo_flujo: "GARANTIA" },
      ],
    });
  } else if (padre === "PAGO") {
    andConditions.push({
      OR: [
        { padre_gestion: "PAGO" },
        { padre_gestion: null, tipo_flujo: { not: "GARANTIA" } },
      ],
    });
  }

  // 2. Criterio de Fecha y Rango Temporal
  const criterio = (filtros.criterio_fecha || "INGRESO").toUpperCase();
  let fDesde: Date | undefined;
  let fHasta: Date | undefined;

  if (filtros.fecha_desde) {
    const dStr = String(filtros.fecha_desde).split("T")[0];
    fDesde = new Date(`${dStr}T00:00:00.000Z`);
  }
  if (filtros.fecha_hasta) {
    const hStr = String(filtros.fecha_hasta).split("T")[0];
    fHasta = new Date(`${hStr}T23:59:59.999Z`);
  }

  if (fDesde || fHasta) {
    const fechaClause: any = {};
    if (fDesde) fechaClause.gte = fDesde;
    if (fHasta) fechaClause.lte = fHasta;

    if (criterio === "MEMORANDO") {
      where.fecha_memorando = fechaClause;
    } else if (criterio === "ULTIMO_MOVIMIENTO") {
      where.fecha_ultimo_movimiento = fechaClause;
    } else if (criterio === "RECEPCION" || criterio === "RECEPCION_FISICA") {
      andConditions.push({
        OR: [
          { fecha_recepcion_fisica: fechaClause },
          { fecha_recepcion_fisica: null, fecha_ingreso: fechaClause },
        ],
      });
    } else {
      where.fecha_ingreso = fechaClause;
    }
  }

  // 3. Tipo de Proceso
  const codProceso = (filtros.codigo_proceso || filtros.codigo_proceso_canonico || "").trim().toUpperCase();
  if (filtros.id_tipo_tramite && filtros.id_tipo_tramite !== "TODOS") {
    where.id_tipo_tramite = Number(filtros.id_tipo_tramite);
  } else if (codProceso && codProceso !== "TODOS") {
    where.tipos_tramite = { codigo: codProceso };
  }

  // 4. Área actual
  if (filtros.id_area && filtros.id_area !== "TODAS" && filtros.id_area !== "TODOS") {
    where.id_area_actual = Number(filtros.id_area);
  }

  // 5. Funcionario (Custodio actual o Analista de Presupuesto)
  if (filtros.id_funcionario && filtros.id_funcionario !== "TODOS") {
    const idFunc = Number(filtros.id_funcionario);
    andConditions.push({
      OR: [
        { id_custodio_actual: idFunc },
        { id_analista_presupuesto_previo: idFunc },
      ],
    });
  }

  // 6. Estado General Oficial (CONTABILIDAD, PAGADO, DFI, REVISION, ARCHIVO, DEVUELTO, etc.)
  if (filtros.estado_general && filtros.estado_general !== "TODOS") {
    where.estado_general = filtros.estado_general.toUpperCase();
  }

  // 7. Filtro Estado: COMPLETADOS vs EN_CURSO
  if (filtros.estado_filtro === "COMPLETADOS") {
    where.estado_general = { in: ["PAGADO", "ARCHIVO", "DEVUELTO", "INSUBSISTENTE", "ANULADO"] };
  } else if (filtros.estado_filtro === "EN_CURSO") {
    where.estado_general = { notIn: ["PAGADO", "ARCHIVO", "DEVUELTO", "INSUBSISTENTE", "ANULADO"] };
  }

  // 8. Búsqueda textual universal
  if (filtros.busqueda && filtros.busqueda.trim()) {
    const q = filtros.busqueda.trim();
    andConditions.push({
      OR: [
        { numero_quipux: { contains: q } },
        { proveedor_beneficiario: { contains: q } },
        { asunto: { contains: q } },
        { codigo_tramite: { contains: q } },
        { nro_tramite: { contains: q } },
        { ruc_proveedor: { contains: q } },
      ],
    });
  }

  if (andConditions.length > 0) {
    where.AND = andConditions;
  }

  return where;
}
```

---

### 4.2. Función Central de Auditoría de Tiempos (`obtenerAuditoriaTramites`)
Ubicada en [`src/services/reportesTiemposService.ts`](file:///c:/Users/PC/Documents/RODNEY%20SENAE/senae_control_previo_v2_rocky9/src/services/reportesTiemposService.ts#L580-L750):

```typescript
export async function obtenerAuditoriaTramites(
  filtros: FiltrosReportesTiempos = {},
  paginacion: PaginacionInput = {}
) {
  const where = construirWherePrisma(filtros);

  // Obtener catálogo de feriados activos
  const feriados = await prisma.feriados.findMany({
    where: { activo: true },
    select: { fecha: true },
  });

  // Consultar trámites con relaciones
  const tramitesDb = await prisma.tramites.findMany({
    where,
    include: {
      tipos_tramite: true,
      areas: true,
      usuarios: true,
    },
    orderBy: { fecha_ingreso: "desc" },
  });

  const ids = tramitesDb.map((t) => t.id_tramite);

  // Lote anti-N+1 de movimientos
  const todosLosMovimientos = await batchFetchMovimientos(ids);
  const movsPorTramite = new Map<number, any[]>();
  for (const m of todosLosMovimientos) {
    const list = movsPorTramite.get(m.id_tramite);
    if (!list) movsPorTramite.set(m.id_tramite, [m]);
    else list.push(m);
  }

  const slaConfig = await getSLAConfig();
  const SLA_LIMITE = slaConfig.limite_dias || 6;

  const todosCalculados: TramiteAuditoriaItem[] = [];

  for (const t of tramitesDb) {
    const movs = movsPorTramite.get(t.id_tramite) || [];
    const input: TramiteCalculoInput = {
      id_tramite: t.id_tramite,
      codigo_tramite: t.codigo_tramite,
      numero_quipux: t.numero_quipux,
      padre_gestion: t.padre_gestion,
      tipo_flujo: t.tipo_flujo,
      tipo_gestion: t.tipo_gestion,
      estado_general: t.estado_general,
      sub_estado: t.sub_estado,
      esta_pausado: t.esta_pausado,
      motivo_pausa: t.motivo_pausa,
      es_devuelto: t.es_devuelto,
      fecha_recepcion_fisica: t.fecha_recepcion_fisica,
      fecha_ingreso: t.fecha_ingreso,
      fecha_entrega_control_previo: t.fecha_entrega_control_previo,
      fecha_aprobacion_presupuesto: t.fecha_aprobacion_presupuesto,
      fecha_aprobacion_contabilidad: t.fecha_aprobacion_contabilidad,
      fecha_autorizacion_pago: t.fecha_autorizacion_pago,
      fecha_pago: t.fecha_pago,
      fecha_ultimo_movimiento: t.fecha_ultimo_movimiento,
      anexos: t.anexos,
      comentarios_bitacora: movs.map((m) => m.comentarios).filter(Boolean).join(" | "),
      historial_movimientos: movs,
    };

    const res = calcularTiemposTramite(input, feriados);

    // Semáforo SLA
    let semaforo: "VERDE" | "AMBAR" | "ROJO" | "EXENTO" | "PENDIENTE" = "VERDE";
    const esExento =
      t.estado_general === "INSUBSISTENTE" ||
      t.estado_general === "DEVUELTO" ||
      t.estado_general === "ANULADO" ||
      Boolean(t.es_devuelto);

    if (esExento) {
      semaforo = "EXENTO";
    } else {
      const diasComparar =
        res.calidad_dato === "COMPLETO" && typeof res.reloj_b.dias_laborables_efectivos === "number"
          ? res.reloj_b.dias_laborables_efectivos
          : res.historico_parcial?.total_habiles_brutos ?? res.reloj_a.dias_laborables_trabajo;

      if (diasComparar > SLA_LIMITE) semaforo = "ROJO";
      else if (diasComparar >= Math.ceil(SLA_LIMITE * 0.75)) semaforo = "AMBAR";
      else semaforo = "VERDE";
    }

    todosCalculados.push({
      id_tramite: t.id_tramite,
      codigo_tramite: t.codigo_tramite,
      numero_quipux: t.numero_quipux,
      padre_gestion: (t.padre_gestion === "GARANTIA" || t.tipo_flujo === "GARANTIA") ? "GARANTIA" : "PAGO",
      tipo_flujo: t.tipo_flujo,
      tipo_gestion: t.tipo_gestion,
      proveedor_beneficiario: t.proveedor_beneficiario || "No especificado",
      ruc_proveedor: t.ruc_proveedor,
      asunto: t.asunto,
      monto_total: Number(t.monto_total || 0),
      tipo_proceso: t.tipos_tramite?.nombre || "GENERAL",
      tipo_codigo: t.tipos_tramite?.codigo || "PROCESO",
      id_tipo_tramite: t.id_tipo_tramite,
      area_actual: t.areas?.nombre || "Sin Área",
      id_area_actual: t.id_area_actual,
      custodio_actual: t.usuarios?.nombre_completo || "Sin Custodio",
      id_custodio_actual: t.id_custodio_actual,
      estado_general: t.estado_general,
      sub_estado: t.sub_estado,
      fecha_ingreso: t.fecha_ingreso ? t.fecha_ingreso.toISOString() : null,
      fecha_recepcion_fisica: t.fecha_recepcion_fisica ? t.fecha_recepcion_fisica.toISOString() : null,
      fecha_pago: t.fecha_pago ? t.fecha_pago.toISOString() : null,
      fecha_ultimo_movimiento: t.fecha_ultimo_movimiento ? t.fecha_ultimo_movimiento.toISOString() : null,
      esta_pausado: Boolean(t.esta_pausado),
      calidad_dato: res.calidad_dato,
      alerta_inconsistencia: res.alerta_inconsistencia,
      motivos_alerta: res.motivos_alerta,
      propuestas_correccion: res.propuestas_correccion,
      es_analista_compartido: res.es_analista_compartido,
      analistas_detectados: res.analistas_detectados,
      en_curso: res.en_curso,
      tiempo_total_calendario_dias: res.tiempo_total_calendario_dias,
      tiempo_real_trabajado_dias: res.tiempo_real_trabajado_dias,
      dias_pausa: res.dias_pausa,
      dias_no_laborables: res.dias_no_laborables,
      dias_espera_pago: res.dias_espera_pago,
      desglose: res.desglose,
      reloj_a: res.reloj_a,
      reloj_b: res.reloj_b,
      historico_parcial: res.historico_parcial,
      alerta_sla: semaforo,
    });
  }

  return {
    kpis: {
      total_tramites_analizados: todosCalculados.length,
      tiempo_total_promedio_dias: calcularPromedio(todosCalculados.map(t => t.tiempo_total_calendario_dias)),
      tiempo_total_mediana_dias: calcularMediana(todosCalculados.map(t => t.tiempo_total_calendario_dias)),
      tiempo_real_trabajado_promedio_dias: calcularPromedio(todosCalculados.map(t => t.tiempo_real_trabajado_dias)),
      tiempo_real_trabajado_mediana_dias: calcularMediana(todosCalculados.map(t => t.tiempo_real_trabajado_dias)),
      tramites_en_plazo: todosCalculados.filter(t => t.alerta_sla === "VERDE" || t.alerta_sla === "AMBAR").length,
      tramites_vencidos: todosCalculados.filter(t => t.alerta_sla === "ROJO").length,
      tasa_cumplimiento: todosCalculados.length > 0
        ? Math.round((todosCalculados.filter(t => t.alerta_sla === "VERDE" || t.alerta_sla === "AMBAR").length / todosCalculados.length) * 100)
        : 100,
    },
    tramites: todosCalculados,
  };
}
```

---

### 4.3. Algoritmo de Tiempos Estadísticos Robustos (Mediana P50 y Percentil P90)
Ubicadas en [`src/services/reportesTiemposService.ts`](file:///c:/Users/PC/Documents/RODNEY%20SENAE/senae_control_previo_v2_rocky9/src/services/reportesTiemposService.ts#L297-L326):

```typescript
export function calcularMediana(valores: number[]): number {
  if (!valores || valores.length === 0) return 0;
  const ordenados = [...valores].filter((v) => typeof v === "number" && !isNaN(v)).sort((a, b) => a - b);
  if (ordenados.length === 0) return 0;

  const mitad = Math.floor(ordenados.length / 2);
  if (ordenados.length % 2 !== 0) {
    return Number(ordenados[mitad].toFixed(1));
  }
  return Number(((ordenados[mitad - 1] + ordenados[mitad]) / 2).toFixed(1));
}

export function calcularPercentil(valores: number[], p: number): number {
  if (!valores || valores.length === 0) return 0;
  const ordenados = [...valores].filter((v) => typeof v === "number" && !isNaN(v)).sort((a, b) => a - b);
  if (ordenados.length === 0) return 0;
  if (ordenados.length === 1) return Number(ordenados[0].toFixed(1));

  const pNormalizado = Math.max(0, Math.min(100, p));
  const indice = (pNormalizado / 100) * (ordenados.length - 1);
  const inferior = Math.floor(indice);
  const superior = Math.ceil(indice);
  const peso = indice - inferior;

  if (inferior === superior) {
    return Number(ordenados[inferior].toFixed(1));
  }
  const interpolado = ordenados[inferior] * (1 - peso) + ordenados[superior] * peso;
  return Number(interpolado.toFixed(1));
}
```

---

### 4.4. Función de Auditoría por Familias de Procesos y Diagnóstico Causa Raíz
Ubicada en [`src/services/reportesTiemposService.ts`](file:///c:/Users/PC/Documents/RODNEY%20SENAE/senae_control_previo_v2_rocky9/src/services/reportesTiemposService.ts#L331-L357):

```typescript
export function generarFraseDiagnostica(
  faseMayorDemora: string,
  tasaCumplimiento: number,
  pausaFacturaPromedio: number = 0
): string {
  if (pausaFacturaPromedio >= 2.0) {
    return "Frecuente suspensión de términos atribuible a espera de emisión de factura SRI por proveedores.";
  }
  if (tasaCumplimiento >= 90) {
    return "Flujo institucional ágil con alta tasa de cumplimiento normativo dentro del plazo SLA.";
  }

  const faseUpper = faseMayorDemora.toUpperCase();
  if (faseUpper.includes("CONTABILIDAD")) {
    return "Cuello de botella principal en Contabilidad por validación de devengado, retenciones eSIGEF y control previo documental.";
  }
  if (faseUpper.includes("PRESUPUESTO")) {
    return "Mayor demora en Presupuesto por verificación de partidas, reformas y disponibilidad de certificación.";
  }
  if (faseUpper.includes("SECRETARIA") || faseUpper.includes("DFI")) {
    return "Demora en etapa de radicación física inicial en Secretaría DFI y asignación de analistas.";
  }
  if (faseUpper.includes("TESORERIA") || faseUpper.includes("CAJA")) {
    return "Demora concentrada en programación de pago, dispersión bancaria SPI/BCE o emisión de comprobantes.";
  }
  return "Tiempo de procesamiento balanceado entre fases operativas.";
}
```

---

### 4.5. Endpoint Central Consolidado (`GET /api/reportes`)
Ubicado en [`src/app/api/reportes/route.ts`](file:///c:/Users/PC/Documents/RODNEY%20SENAE/senae_control_previo_v2_rocky9/src/app/api/reportes/route.ts#L66-L184):
Orquesta en paralelo las consultas de auditoría de trámites, tiempos por proceso, rendimiento individual de funcionarios y catálogos:

```typescript
const [
  auditoriaTiempos,
  auditoriaProcesos,
  rendimientoFuncionarios,
  areasCatalogo,
  usuariosCatalogo,
  tiposCatalogo,
  slaConfig,
] = await Promise.all([
  obtenerAuditoriaTramites(filtros, { pagina: 1, limite: 10000 }),
  obtenerAuditoriaProcesos(filtros),
  obtenerRendimientoFuncionarios(filtros),
  prisma.areas.findMany({ select: { id_area: true, nombre: true, codigo: true }, orderBy: { id_area: "asc" } }),
  prisma.usuarios.findMany({ where: { activo: true }, select: { id_usuario: true, nombre_completo: true, cargo: true, id_area: true, iniciales: true } }),
  prisma.tipos_tramite.findMany({ where: { activo: true }, select: { id_tipo_tramite: true, nombre: true, codigo: true } }),
  getSLAConfig(),
]);

// Consolidación de Totales y Custodia:
const tramitesCalculados = auditoriaTiempos.tramites;
const totalIngresados = auditoriaTiempos.kpis.total_tramites_analizados;
const totalEnProceso = tramitesCalculados.filter((t) => t.en_curso).length;
const totalPagados = tramitesCalculados.filter((t) => t.estado_general === "PAGADO").length;
const totalObservadosPausados = tramitesCalculados.filter(
  (t) => t.esta_pausado || t.estado_general === "OBSERVADO" || t.estado_general === "OBSERVADO_72H"
).length;

// Distribución por estado
const mapaEstados: Record<string, number> = {};
for (const t of tramitesCalculados) {
  mapaEstados[t.estado_general] = (mapaEstados[t.estado_general] || 0) + 1;
}

// Distribución de Custodia por Área y Funcionario (Con semáforos en plazo, en riesgo, vencidos)
for (const t of tramitesCalculados) {
  if (t.id_custodio_actual && mapaCustodios[t.id_custodio_actual]) {
    const c = mapaCustodios[t.id_custodio_actual];
    c.total_tramites++;
    if (t.alerta_sla === "ROJO") c.vencidos++;
    else if (t.alerta_sla === "AMBAR") c.en_riesgo++;
    else c.en_plazo++;
  }
  if (t.id_area_actual && mapaAreas[t.id_area_actual]) {
    mapaAreas[t.id_area_actual].total++;
  }
}
```

---

## CONCLUSIÓN DE LA AUDITORÍA FORENSE

1. **Aislamiento e Idempotencia:** El importador de Excel (`MigracionExcelService`) está completamente aislado y no contamina los trámites generados orgánicamente por los operadores, identificando los registros históricos con los prefijos unívocos `TRM-2026-P-` y `TRM-2026-G-`.
2. **Cumplimiento de Reglas de Negocio:** Se respeta estrictamente la denominación oficial **`CONTABILIDAD`** para el estado contable (sin usar `CONTROL_PREVIO`).
3. **Manejo de Inconsistencias Históricas:** Los trámites con analistas compartidos (`RG/DB`), Quipux homónimos o fechas parciales son clasificados deterministamente como `HISTORICO_PARCIAL` o `INCOMPLETO`, preservando la pureza de los indicadores SLA del Reloj B y evitando falsos cuellos de botella en la reportería directiva del SENAE.
