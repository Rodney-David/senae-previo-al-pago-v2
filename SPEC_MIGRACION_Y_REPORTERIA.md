# ESPECIFICACIÓN TÉCNICA MAESTRA: SANEAMIENTO DE MIGRACIÓN, SLA Y REPORTERÍA
**Objetivo:** Corregir de extremo a extremo la importación de `Enero-Junio-2026.xlsx`, el cálculo de tiempos/SLA y la reportería de productividad y pendientes sin alterar el esquema de Prisma (`schema.prisma`).

## REGLAS GLOBALES INMUTABLES PARA TODOS LOS SUBAGENTES
1. **NO modificar `prisma/schema.prisma`** ni crear migraciones destructivas. Usar los campos existentes en `model tramites` (`id_analista_presupuesto_previo`, `id_custodio_actual`, `tipo_gestion`, `estado_general`, `sub_estado`, `esta_pausado`, `fecha_entrega_control_previo`, `fecha_aprobacion_presupuesto`, `fecha_autorizacion_pago`, `fecha_pago`).
2. **NO instalar dependencias nuevas.**
3. **Respetar estrictamente los nombres de `estado_general` y `sub_estado` definidos en este documento.**

---

## TAREA 1 (SUBAGENTE 1): `src/services/migracionExcelService.ts`
**Alcance exclusivo:** Editar únicamente `src/services/migracionExcelService.ts`.

### 1.1. Blindaje de `parseFechaEcuador(val: any, fechaReferenciaIngreso?: Date | null)`
- Si `val` es un número serial de Excel menor a `45292` (01/01/2024), como el valor `16.57` en la fila 692 de PAGO, retornar `null` inmediatamente.
- **Corrección automática de errata de año Nuevo (`2025` -> `2026`):**
  - Para `FECHA RECIBE JCO`, `FECHA DE PAGO` / `SOL. PAGO` o `FECHA ENTREGA AL ANALISTA`: si la fecha parseada cae en enero o febrero de `2025` (`year === 2025 && month <= 2`), pero la fecha de recepción/ingreso o el código del memorando contiene `-2026-`, corregir automáticamente el año a `2026` manteniendo el mismo mes y día.
  - Para `FECHA RECEPCIÓN` en la hoja `PAGO`: si `year === 2025` y el mes es enero o febrero (`month === 1 || month === 2`) y `FECHA ENTREGA AL ANALISTA` es de enero/febrero `2026` (filas Nº 16 y Nº 232), corregir el año de recepción a `2026`. (Conservar intactas las fechas de noviembre y diciembre de 2025, que son trámites reales de fin de año 2025).

### 1.2. Protección de lectura en Columna 14 (`PERIODO`) y Columna 2 (`TIPO`) de la Hoja `PAGO`
- Al leer la Columna 14 (`PERIODO`), capturar errores de fecha corrupta de ExcelJS (como la celda `N765` que contiene `1712908746` con formato de fecha) leyendo siempre `cell.text` o convirtiendo el valor bruto a `String(cell.value ?? "").trim()` dentro de un bloque `try/catch`.
- Leer la **Columna 2 (`TIPO`)** en la hoja `PAGO` y normalizarla para guardarla en `tramites.tipo_gestion`:
  - `"PAGO"` o `"Pago"` -> `"PAGO"`
  - `"Archivo"` -> `"ARCHIVO"`
  - `"Expediente"` -> `"EXPEDIENTE"`
  - `"Justificación"` -> `"JUSTIFICACION"`

### 1.3. Nuevo Orden Jerárquico de Clasificación de Estados (Sección de mapeo de `ESTADO`)
Reemplazar la lógica actual de clasificación de los 7 estados por este orden exacto tanto en `PAGO` como en `GARANTÍA`:
1. **`ARCHIVO`**: Si el texto de la columna `ESTADO` contiene `"archiv"`.
   - `estado_general = "ARCHIVO"`, `sub_estado = "ARCHIVADO_DEFINITIVO"`.
2. **`DEVUELTO`**: Si el texto de la columna `ESTADO` contiene `"devuel"` **O** si existe una fecha válida en `FECHA DE DEVOLUCIÓN`.
   - **PROHIBIDO** usar `memoDevolucion` (Columna 25 en Pago / Columna 19 en Garantía) para forzar el estado `DEVUELTO` cuando la columna `ESTADO` dice `Observado`, `Presupuesto`, `Archivo` o `DFI` (ya que ahí se anotan memos temporales `JPR-...-TEMP` o entregas físicas).
   - `estado_general = "DEVUELTO"`, `sub_estado = "DEVUELTO_FORMALMENTE"`, `es_devuelto = true`.
3. **`PAGADO`**: Si existe fecha válida en `FECHA DE PAGO` (Pago) o `FECHA DE SOL. PAGO` (Garantía) y no cayó en Archivo ni Devuelto.
   - `estado_general = "PAGADO"`, `sub_estado = "PAGO_EFECTIVO"`, `autorizado_pago = true`, `fecha_autorizacion_pago = fechaPago`.
4. **`OBSERVADO`**: Si el texto de la columna `ESTADO` contiene `"observad"` o `"factura"`.
   - `estado_general = "OBSERVADO"`, `sub_estado = estLower.includes("factura") ? "ESPERA_FACTURA" : "OBSERVADO"`, `esta_pausado = true`.
5. **`REVISION`**: Si el texto de la columna `ESTADO` contiene `"presupuesto"` o `"revisi"`.
   - `estado_general = "REVISION"`, `sub_estado = estLower.includes("presupuesto") ? "EN_REVISION_PRESUPUESTO" : "EN_REVISION"`.
6. **`CONTABILIDAD`**: Si el texto de la columna `ESTADO` contiene `"justificaci"`, `"contabil"` **O** si existe `fechaRecibeJco` (y aún no tiene fecha de pago).
   - `estado_general = "CONTABILIDAD"`.
   - `sub_estado = estLower.includes("justificaci") ? "JUSTIFICACION_CONTABILIDAD" : "EN_CONTABILIDAD"`.
7. **`DFI`**: Fallback cuando la columna `ESTADO` dice `"DFI"` y no tiene `fechaPago` ni `fechaRecibeJco`.
   - `estado_general = "DFI"`, `sub_estado = "DERIVADO_A_DFI"`.
   - Si en este caso existe un analista asignado en la fila y `NOVEDADES` no dice `"sin efecto"`, mantener como `id_custodio_actual` al analista asignado para que figure en su bandeja de seguimiento.

### 1.4. Preservación Obligatoria del Analista de Presupuesto en el 100% de los Trámites
- En **todos** los trámites migrados (tanto `PAGO` como `GARANTÍA`), sin importar si su `estado_general` final es `PAGADO`, `CONTABILIDAD`, `ARCHIVO`, `DEVUELTO`, `OBSERVADO`, `REVISION` o `DFI`:
  - Siempre que `resolverCadenaAnalistas(val)` resuelva un `idAnalistaActivo` válido (incluyendo iniciales con espacios como `"RG "` o `"NM "` y cadenas compartidas como `"RG/DB"` o `"MS/HA"`), guardar ese ID obligatoriamente en **`tramites.id_analista_presupuesto_previo = idAnalistaActivo`**.
  - Además, guardar `fecha_aprobacion_presupuesto = fechaRecibeJco` cuando exista `fechaRecibeJco`, para que quede registrado en la tabla maestra cuándo salió de Presupuesto hacia Contabilidad.

---

## TAREA 2 (SUBAGENTE 2): `src/lib/tiemposCalculator.ts`
**Alcance exclusivo:** Editar únicamente `src/lib/tiemposCalculator.ts`.

### 2.1. Separación de las 3 Métricas Oficiales de Tiempo en `calcularTiemposTramite`
Asegurar que el cálculo para trámites migrados (`HISTORICO_PARCIAL`) y normales (`COMPLETO`) calcule y exponga con total exactitud:
1. **`tiempo_total_calendario_dias` (Recepción -> Fin/Actualidad):**
   - Desde `fecha_recepcion_fisica` (o `fecha_ingreso`) hasta la fecha de cierre (`fecha_pago`, `fecha_devolucion` en `fecha_ultimo_movimiento`, o fecha actual si sigue `en_curso`).
2. **`tramo_presupuesto_habiles` (Desempeño del Funcionario de Presupuesto):**
   - Desde `fecha_entrega_control_previo` hasta `fecha_recibe_jco` (`fecha_aprobacion_presupuesto` o movimiento `PASE_A_CONTABILIDAD`).
   - **Regla anti-distorsión por regularización posterior:** Si un trámite tiene `fecha_pago` y `fecha_recibe_jco`, pero `fecha_pago < fecha_recibe_jco` (como los 26 casos de regularización de junio en el Excel), el fin del tramo de Presupuesto para efectos de SLA es `fecha_pago` (no la fecha de regularización posterior en junio), evitando sumarle meses falsos al analista.
   - Si el trámite sigue en `REVISION` (sin `fecha_recibe_jco` ni `fecha_pago`), calcular los días hábiles transcurridos hasta hoy.
   - Si el trámite está en `OBSERVADO` (`esta_pausado = true`), congelar el conteo en los días hábiles previos a la observación (o `0` si no hay fecha de observación separada en el Excel histórico).
3. **`tiempo_real_trabajado_dias` / SLA hasta Autorización de Pago (`Entrega a Presupuesto` -> `Autorización/Fecha de Pago`):**
   - Desde `fecha_entrega_control_previo` hasta `fecha_autorizacion_pago` (o `fecha_pago`), descontando sábados, domingos, feriados de la tabla `feriados` y días en estado `OBSERVADO` / `PAUSADO`.
   - **No sumar** `tramo_secretaria_habiles` (`Recepción -> Entrega Analista`) dentro del tiempo evaluado contra el SLA de Presupuesto/Pago; mantener `tramo_secretaria_habiles` desglosado por separado.

---

## TAREA 3 (SUBAGENTE 3): `src/services/reportesTiemposService.ts` y `src/app/api/reportes/route.ts`
**Alcance exclusivo:** Editar únicamente `src/services/reportesTiemposService.ts` y `src/app/api/reportes/route.ts`.

### 3.1. Semáforo SLA diferenciado y Estado `PAUSADO`
En `obtenerAuditoriaTramites`:
- Si `t.estado_general === "OBSERVADO"` o `t.esta_pausado === true`, el semáforo debe ser `"PENDIENTE"` (mostrado en UI como **PAUSADO / OBSERVADO**), nunca `"ROJO"`, para no castigar el porcentaje de cumplimiento SLA con trámites detenidos por causa externa o falta de factura.
- Si `t.estado_general === "ARCHIVO"` y `t.tipo_gestion === "ARCHIVO"` (trámites que entraron solo para archivo sin pago), marcar semáforo como `"EXENTO"`.
- Evaluar el cumplimiento SLA general comparando el tiempo hábil desde `fecha_entrega_control_previo` hasta `fecha_autorizacion_pago` (sin incluir los días previos de Secretaría DFI).

### 3.2. Desempeño y Productividad de Funcionarios (`obtenerRendimientoFuncionarios` y `/api/reportes`)
Separar las métricas de cada funcionario en dos dimensiones claras dentro del objeto devuelto por `/api/reportes`:
1. **Productividad Histórica del Analista (`id_analista_presupuesto_previo`):**
   - `total_asignados_historico`: Total de trámites donde el usuario figura como `id_analista_presupuesto_previo` (o analista en historial).
   - `total_despachados`: Trámites que ya salieron de las manos del analista (`PAGADO`, `CONTABILIDAD`, `ARCHIVO`, `DEVUELTO`).
   - `mediana_dias_presupuesto`: Mediana (P50) de `tramo_presupuesto_habiles` de ese analista.
   - `promedio_dias_presupuesto`: Promedio de `tramo_presupuesto_habiles`.
   - `porcentaje_productividad`: `(total_despachados / Math.max(1, total_asignados_historico - en_observacion_pausados)) * 100` (y porcentaje despachado dentro del umbral SLA de Presupuesto).
2. **Carga Activa Hoy / Pendientes (`id_custodio_actual` en estados `REVISION`, `OBSERVADO`, `DFI`):**
   - `pendientes_en_revision`: Conteo exacto de trámites vivos en `REVISION`.
   - `pendientes_observados`: Conteo exacto de trámites en `OBSERVADO` / `ESPERA_FACTURA`.

### 3.3. Filtros Avanzados en `construirWherePrisma`
- Permitir filtrar por `sub_estado` (para poder separar `"JUSTIFICACION_CONTABILIDAD"` de `"EN_CONTABILIDAD"`, o `"ESPERA_FACTURA"` de `"OBSERVADO"`).
- Permitir filtrar por `tipo_gestion` (`"PAGO"`, `"ARCHIVO"`, `"EXPEDIENTE"`, `"JUSTIFICACION"`).
- En el filtro de `id_funcionario`, permitir un parámetro opcional `modo_funcionario: "TODOS" | "CUSTODIO_ACTUAL" | "ANALISTA_HISTORICO"` (por defecto `"TODOS"`, que busca en `OR: [{ id_custodio_actual: idFunc }, { id_analista_presupuesto_previo: idFunc }]`).