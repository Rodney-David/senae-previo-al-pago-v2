# PROTOCOLO MAESTRO DE AUDITORÍA Y PRUEBAS EXHAUSTIVAS (QA E2E)
**Regla de Oro para todos los Agentes:** 
- Estás en modo **AUDITORÍA Y VERIFICACIÓN CIENTÍFICA**. 
- **PROHIBIDO asumir que algo funciona solo leyendo el código.** Debes ejecutar scripts de verificación (con `npx tsx -e "..."` o `curl` / pruebas reales) contra la base de datos y los endpoints.
- **PROHIBIDO modificar código de la aplicación durante el diagnóstico.** Tu único entregable permitido es tu archivo de reporte `DIAGNOSTICO_QA_[NUMERO].md`.

---

## MISIÓN AGENTE QA-1: INTEGRIDAD DE MIGRACIÓN EXCEL Y BASE DE DATOS
**Entregable exclusivo:** Crear `DIAGNOSTICO_QA_1_MIGRACION.md`

Ejecuta un script de consulta directa con Prisma Client y verifica punto por punto:
1. **Conteo Exacto de Filas:**
   - Total migrados: `1,636` (`1,099` con `padre_gestion = "PAGO"` / `TRM-2026-P-` y `537` con `padre_gestion = "GARANTIA"` / `TRM-2026-G-`).
2. **Cuadre Financiero y Alta Cuantía:**
   - Suma de `monto_total` en PAGO = `$11,109,966.86` (73 trámites con `es_alta_cuantia = true`).
   - Suma de `monto_total` en GARANTÍA = `$1,695,118.85` (38 trámites con `es_alta_cuantia = true`).
3. **Cuadre Exacto de los 7 Estados Oficiales (`estado_general` y `sub_estado`):**
   - Hoja PAGO: `PAGADO` (864), `CONTABILIDAD` (88: 52 en `JUSTIFICACION_CONTABILIDAD` y 36 en `EN_CONTABILIDAD`), `ARCHIVO` (57), `DEVUELTO` (46), `OBSERVADO` (17: 16 en `OBSERVADO` y 1 en `ESPERA_FACTURA`), `REVISION` (16: 13 en `EN_REVISION_PRESUPUESTO` y 3 en `EN_REVISION`), `DFI` (11).
   - Hoja GARANTÍA: `PAGADO` (342), `CONTABILIDAD` (64), `ARCHIVO` (62), `DEVUELTO` (28), `REVISION` (22: 17 en `EN_REVISION` y 5 en `EN_REVISION_PRESUPUESTO`), `OBSERVADO` (18), `DFI` (1).
   - Si existe cualquier diferencia, lista exactamente qué `codigo_tramite` y `numero_quipux` se clasificó distinto y por qué.
4. **Verificación de `tipo_gestion` (Columna 2 de PAGO):**
   - Comprobar si existen los `1,060` PAGO, `19` ARCHIVO, `10` EXPEDIENTE y `10` JUSTIFICACION.
5. **Atribución Histórica de Analistas (`id_analista_presupuesto_previo`):**
   - Verificar cuántos trámites tienen `id_analista_presupuesto_previo` nulo. (En PAGO debe ser `0` nulos; en GARANTÍA solo `1` nulo).
   - Verificar que el analista siga guardado en `id_analista_presupuesto_previo` incluso cuando el trámite hoy está en `PAGADO`, `ARCHIVO` o `CONTABILIDAD`.
6. **Indexación Documental (`tramite_referencias`):**
   - Verificar que los Quipux múltiples en una misma celda, números de juicio coactivo y memorandos temporales (`JPR-...-TEMP`) estén creados en `tramite_referencias`.

---

## MISIÓN AGENTE QA-2: MOTOR DE TIEMPOS, SLA Y AUDITORÍA DE MOVIMIENTOS
**Entregable exclusivo:** Crear `DIAGNOSTICO_QA_2_TIEMPOS_SLA.md`

Ejecuta pruebas llamando directamente a `calcularTiemposTramite`, `evaluarCalidadDato` (`src/lib/tiemposCalculator.ts`) y al endpoint `/api/admin/auditoria`:
1. **Invariante Matemática y Casos Extremos del Excel:**
   - **Erratas de año 2025:** Inspeccionar en BD los trámites correspondientes a las filas de PAGO Nº 16, 79, 80, 82, 93, 126, 130, 131, 136, 232 y 305. Verificar si sus fechas de recepción, JCO o pago quedaron en `2025` provocando `calidad_dato = "INCOMPLETO"` o tiempos negativos.
   - **Celda con decimal en fecha:** Inspeccionar el trámite `SENAE-JIT-2026-0039-M` (Fila Nº 692 de PAGO, que tenía `16.57` en `FECHA RECIBE JCO`) y la fila 544 (`SENAE-AIGU-2026-0064-M`, serial `46112` en `FECHA DE PAGO`). Verificar qué fecha exacta guardó la BD.
   - **26 Casos de Regularización Posterior (`fecha_pago < fecha_recibe_jco`):** Probar `calcularTiemposTramite` con los trámites Nº 4, 21, 27, 48, 113, 134 de PAGO. Diagnosticar si el tramo de Presupuesto le está sumando meses falsos al analista por usar la fecha de junio de JCO en lugar de la fecha de pago de enero/febrero.
2. **Separación de Relojes y Exclusiones del SLA:**
   - Verificar que sábados, domingos y registros activos de la tabla `feriados` se descuenten correctamente.
   - Verificar si `tramo_secretaria_habiles` (`Recepción -> Entrega Analista`) se está sumando indebidamente al indicador que evalúa el cumplimiento del SLA de Presupuesto/Pago.
   - Verificar que los 35 trámites en estado `OBSERVADO` (`17` en PAGO + `18` en GARANTÍA) tengan `esta_pausado = true` y qué `alerta_sla` reciben (`VERDE`, `ROJO` o `PENDIENTE/PAUSADO`).
3. **Trazabilidad en `historial_movimientos`:**
   - Comprobar que los trámites con cadena de analistas (ej. `RG/DB`, `MS/HA`, `RG/NM/RG`) hayan generado tanto `ASIGNACION_ANALISTA` como `TRASPASO_CUSTODIA` y que `es_analista_compartido` sea `true`.

---

## MISIÓN AGENTE QA-3: MATRIZ COMBINATORIA DE FILTROS Y REPORTERÍA API
**Entregable exclusivo:** Crear `DIAGNOSTICO_QA_3_FILTROS_REPORTES.md`

Ejecuta pruebas programáticas invocando `obtenerAuditoriaTramites`, `obtenerAuditoriaProcesos`, `obtenerRendimientoFuncionarios` (`src/services/reportesTiemposService.ts`) y la lógica de `GET /api/reportes`:
1. **Prueba de Consistencia Aditiva (La suma de las partes = el todo):**
   - `padre_gestion = "TODOS"` debe ser exactamente igual a la suma de `padre_gestion = "PAGO"` + `padre_gestion = "GARANTIA"`.
   - `estado_filtro = "COMPLETADOS"` + `estado_filtro = "EN_CURSO"` debe sumar exactamente el total de trámites (`1,636`). Verificar si algún estado (como `OBSERVADO`, `CONTABILIDAD`, `REVISION` o `DFI`) se queda huérfano o mal clasificado.
2. **Tortura de los 8 Filtros de `construirWherePrisma` (individuales y combinados):**
   - Probar filtro por `criterio_fecha` en sus 4 modos: `INGRESO`, `RECEPCION_FISICA`, `MEMORANDO`, `ULTIMO_MOVIMIENTO` con rango `2026-01-01` a `2026-06-30`. (Detectar cuántos trámites de diciembre 2025 o julio/agosto 2026 quedan fuera al activar ese filtro).
   - Probar filtro por `id_area` para cada una de las 6 áreas (`DFI`, `Presupuesto`, `Contabilidad`, `Tesorería`, `Cobranzas y Garantías`, `Archivo Central`).
   - Probar filtro por `id_funcionario` para cada analista (`RG`, `DB`, `NM`, `MS`, `ID`, `HA`, `MR`, `JM`). Verificar cuántos trámites devuelve para cada uno y si coincide con la Matriz de Verdad (`DB: 365`, `NM: 342`, `RG: 333`, `MS: 286`, `HA: 198`, `ID: 59`, `MR: 51`, `JM: 1`).
   - Probar combinación crítica pedida por el cliente: `id_area = Presupuesto` + `estado_general = REVISION`, y `id_funcionario = [ID de DB]` + `estado_general = OBSERVADO`.
   - Probar `busqueda` textual por RUC (`0968599020001`), por proveedor (`CNEL`), por Quipux (`SENAE-CDGU-2026-0007-M`) y por código (`TRM-2026-P-0001`).
3. **Auditoría de Productividad de Funcionarios (`obtenerRendimientoFuncionarios`):**
   - Verificar cómo calcula actualmente el sistema el rendimiento de cada funcionario. Diagnosticar si está agrupando erróneamente solo por `id_custodio_actual` (dejando a los analistas de Presupuesto sin sus trámites ya pagados/archivados) o si ya mide su historial completo.

---

## MISIÓN AGENTE QA-4: INTERFAZ DE USUARIO (UI), COMPONENTES Y FLUJO INTERACTIVO
**Entregable exclusivo:** Crear `DIAGNOSTICO_QA_4_UI_Y_FLUJO.md`

Inspecciona y prueba (mediante navegador integrado de Antigravity y revisión de componentes React/Next.js en `src/app/`) todas las pantallas del usuario:
1. **Pantalla de Reportes y Dashboard (`/reportes` o ruta equivalente):**
   - Verificar que todos los selectores de filtros en el frontend envíen los parámetros con el nombre exacto que espera `GET /api/reportes` (revisar si algún `select` en React manda un nombre de query param distinto al que lee `route.ts`).
   - Verificar cómo se renderizan en las tablas y tarjetas los trámites con `calidad_dato = "HISTORICO_PARCIAL"` vs `"COMPLETO"`. Comprobar si hay campos en pantalla que muestren `NaN`, `undefined`, `Invalid Date` o `0 días` engañosos.
2. **Pantalla de Auditoría (`/admin/auditoria` o equivalente):**
   - Verificar que el límite de `take: 200` en `src/app/api/admin/auditoria/route.ts` no impida buscar movimientos históricos de enero o febrero si no hay paginación o filtros conectados en el frontend.
3. **Pantalla de Bandeja de Trámites y Detalle de Expediente:**
   - Verificar que al abrir el detalle de un trámite migrado (ej. `TRM-2026-P-0001`), se visualicen sus referencias secundarias (`tramite_referencias`), su línea de tiempo (`historial_movimientos`) y sus observaciones/novedades.
4. **Flujo Interactivo de un Trámite Pendiente (`/api/tramites/[id]/flujo`):**
   - Verificar qué ocurre cuando un operador toma uno de los trámites migrados que quedaron pendientes hoy (ej. en `REVISION`, `OBSERVADO` o `CONTABILIDAD`) e intenta avanzar su estado en el nuevo aplicativo (levantar observación, pasar a contabilidad, autorizar pago o archivar). Comprobar si el cambio de estado funciona sin errores de claves foráneas ni bloqueos de validación.