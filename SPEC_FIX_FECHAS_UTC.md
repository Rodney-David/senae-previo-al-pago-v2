# ESPECIFICACIÓN QUIRÚRGICA: CORRECCIÓN DE DESFASE DE FECHAS (-1 DÍA) Y FERIADOS UTC

**Regla de Seguridad:** Aplicar únicamente los 4 cambios puntuales descritos abajo. PROHIBIDO alterar cualquier otra regla de estados, montos, analistas o cálculos de SLA que ya están certificados.

---

## 1. Corregir `parseFechaEcuador` en `src/services/migracionExcelService.ts`
En `parseFechaEcuador`:

1. **En el bloque `if (val instanceof Date && !isNaN(val.getTime()))` (aprox. línea 154):**
   - Cambiar `val.getFullYear(), val.getMonth(), val.getDate()` por los métodos **UTC** (`val.getUTCFullYear(), val.getUTCMonth(), val.getUTCDate()`) para que quede exactamente así:
     `const candidate = new Date(Date.UTC(val.getUTCFullYear(), val.getUTCMonth(), val.getUTCDate(), 12, 0, 0));`

2. **En el bloque de meses en español / abreviados (ej. `"13-jul-26"`, `"03-ene-2026"`) y Fallback (aprox. línea 208):**
   - Antes del fallback `new Date(trimmed)`, agregar un matcher explícito para fechas con mes en texto en español/inglés (`ene, feb, mar, abr, may, jun, jul, ago, sep, oct, nov, dic` / `jan, apr, aug, dec`) con formato `DD-MMM-YY` o `DD-MMM-YYYY` para construirlas directamente con `Date.UTC(y, mesIndex, d, 12, 0, 0)`.
   - En el fallback final `const parsed = new Date(trimmed)`: usar `parsed.getUTCFullYear(), parsed.getUTCMonth(), parsed.getUTCDate()` al construir `new Date(Date.UTC(parsed.getUTCFullYear(), parsed.getUTCMonth(), parsed.getUTCDate(), 12, 0, 0))`.

---

## 2. Incluir contrataciones de servicios en `mapearTipoTramitePago` (`src/services/migracionExcelService.ts`)
En `mapearTipoTramitePago(tipoContratacion, descripcion)`:
- Si `tipoContratacion` (en minúsculas) incluye `"recolección de basura"` o `"servicio de comunicación"`, retornar `1` (`SERV_BASICOS`).
- Si `tipoContratacion` (en minúsculas) incluye `"orden de compra"`, `"arrendamiento"`, `"arriendo"`, `"limpieza"`, `"mantenimiento"`, `"combustible"`, `"abastecimiento"`, `"parqueo"` o `"alquiler"`, retornar `3` (`CONTRATACION_SNCP`) en lugar de caer silenciosamente en `17` (`OTROS_PROCESOS`).

---

## 3. Blindar `formatDate` en `src/lib/utils.ts` y la tabla `feriados`
1. En `src/lib/utils.ts`, dentro de `formatDate`:
   - Agregar `timeZone: "UTC"` dentro de las opciones de `Intl.DateTimeFormat("es-EC", { day: "2-digit", month: "2-digit", year: "numeric", timeZone: "UTC" })` para que jamás retroceda al día anterior en navegadores con huso `America/Guayaquil` (GMT-5).
2. Actualizar en la base de datos SQLite los registros existentes de la tabla `feriados` para que su hora pase de `T00:00:00.000Z` a `T12:00:00.000Z` mantendo el mismo año, mes y día UTC (y ajustar `prisma/seed.ts` si ahí se definen con `T00:00:00.000Z`).

---

## 4. Re-ejecutar la Migración Limpia y Verificar Exactitud
1. Ejecutar el script oficial de re-migración (`npx tsx scripts/re_migrar_oficial.ts`) asegurándose de que la base de datos conserve exactamente los **`1,636` trámites** (`1,099` PAGO + `537` GARANTÍA), sin los 29 seeds ficticios.
2. Ejecutar una consulta de verificación en consola e imprimir:
   - El trámite `SENAE-DCVA-2026-0125-M` (Ítem 1040): confirmar que `fecha_memorando = 2026-07-03T12:00:00.000Z`, `fecha_recepcion_fisica = 2026-07-03T12:00:00.000Z`, `fecha_aprobacion_presupuesto = 2026-07-10T12:00:00.000Z` y `fecha_pago = 2026-07-13T12:00:00.000Z`.
   - Los 10 trámites muestra de Enero a Julio del diagnóstico previo: confirmar que los 10 coincidan exactamente día por día con el Excel.
   - El conteo total en `tramites` (`1,636`) y la tabla `feriados` (todos a las `12:00:00.000Z`).
3. Ejecutar `npx tsc --noEmit` para confirmar 0 errores de compilación.