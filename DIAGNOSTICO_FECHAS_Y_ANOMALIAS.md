# DIAGNÓSTICO FORENSE: DESFASE DE ZONA HORARIA (UTC VS UTC-5 ECUADOR) Y ANOMALÍAS DE MAPEO

**Fecha del Dictamen Forense:** 20 de Octubre de 2026  
**Auditoría:** Modo SOLO LECTURA (Inspección estática de código y queries de base de datos SQLite)  
**Ambiente:** Windows (Timezone: `America/Guayaquil` / GMT-0500)  
**Base de Datos Auditada:** `prisma/dev.db` (Copia certificada: `prisma/dev.db.backup_certificado`)  
**Bitácora Excel Fuente:** `Enero-Junio-2026.xlsx` (`APLICATIVO PARA BUSQUEDA EN BASES PRESUPUESTO`)

---

## 1. INSPECCIÓN DEL TRÁMITE `SENAE-DCVA-2026-0125-M` EN BASE DE DATOS

### 1.1. Metadatos Generales del Trámite en SQLite (`tabla: tramites`)
* **ID Trámite (`id_tramite`):** `3265`
* **Código de Trámite (`codigo_tramite`):** `TRM-2026-P-1099` (Fila Excel: 1041 / Ítem Bitácora: 1040)
* **Número Quipux (`numero_quipux`):** `SENAE-DCVA-2026-0125-M`
* **Estado General (`estado_general`):** `PAGADO`
* **Sub-estado (`sub_estado`):** `PAGO_EFECTIVO`
* **Monto Total (`monto_total`):** `$ 3,099.99`
* **Proveedor Beneficiario (`proveedor_beneficiario`):** `Labanjac SA`
* **Nro / Cód Trámite (`nro_tramite`):** `R-018-2024`
* **ID Tipo Trámite / Proceso (`id_tipo_tramite`):** `3`
  * Nombre en catálogo: `Procesos de contratación regulados por el Sistema Nacional de Contratación Pública`
  * Código en catálogo: `CONTRATACION_SNCP`
* **Asunto registrado (`asunto`):**
  > `informe de conformidad del contrato no. r-018-2024 "servicio de arrendamiento de un bien inmueble para el personal del comando del i distrito guayas y del comando general del cuerpo de vigilancia aduanera en la ciudad de guayaquil", correspondiente al periodo del 01 al 30 de junio de 2026.`

---

### 1.2. Valores Exactos Guardados en BD vs Excel Original

| Campo en BD (`tramites`) | Valor en Excel Original | `.toISOString()` en SQLite | `.toString()` (Local Ecuador GMT-5) | Diagnóstico de Desfase |
| :--- | :--- | :--- | :--- | :--- |
| **`fecha_memorando`** | `03/07/2026` | `2026-07-02T12:00:00.000Z` | `Thu Jul 02 2026 07:00:00 GMT-0500` | ❌ **Atrasado 1 día** (Dice 2 de julio) |
| **`fecha_recepcion_fisica`** | `03/07/2026` | `2026-07-02T12:00:00.000Z` | `Thu Jul 02 2026 07:00:00 GMT-0500` | ❌ **Atrasado 1 día** (Dice 2 de julio) |
| **`fecha_entrega_control_previo`** | `03/07/2026` (Col 6) | `2026-07-02T12:00:00.000Z` | `Thu Jul 02 2026 07:00:00 GMT-0500` | ❌ **Atrasado 1 día** (Dice 2 de julio) |
| **`fecha_aprobacion_presupuesto`** | `10/07/2026` (Col 18) | `2026-07-09T12:00:00.000Z` | `Thu Jul 09 2026 07:00:00 GMT-0500` | ❌ **Atrasado 1 día** (Dice 9 de julio) |
| **`fecha_aprobacion_contabilidad`** | `NULL` | `NULL` | `NULL` | N/A |
| **`fecha_autorizacion_pago`** | `13/07/2026` | `2026-07-12T12:00:00.000Z` | `Sun Jul 12 2026 07:00:00 GMT-0500` | ❌ **Atrasado 1 día** (Dice 12 de julio) |
| **`fecha_pago`** | `13/07/2026` (Col 20) | `2026-07-12T12:00:00.000Z` | `Sun Jul 12 2026 07:00:00 GMT-0500` | ❌ **Atrasado 1 día** (Dice 12 de julio) |
| **`fecha_ingreso`** | N/A (Derivado) | `2026-07-02T12:00:00.000Z` | `Thu Jul 02 2026 07:00:00 GMT-0500` | ❌ **Atrasado 1 día** |
| **`fecha_ultimo_movimiento`** | N/A (Derivado) | `2026-07-12T12:00:00.000Z` | `Sun Jul 12 2026 07:00:00 GMT-0500` | ❌ **Atrasado 1 día** |

### 1.3. Conclusión Forense del Punto 1: ¿Dónde ocurre el desfase?
**CONFIRMACIÓN INELUDIBLE: El desfase de -1 día QUEDÓ PERSISTIDO EN LA BASE DE DATOS SQLITE DURANTE LA MIGRACIÓN.**

No es únicamente un error de renderizado visual en el frontend:
1. En el archivo Excel, la celda de pago (Columna 20) contiene el serial de fecha que representa el **13 de julio de 2026**.
2. Sin embargo, en la base de datos SQLite se guardó: `"2026-07-12T12:00:00.000Z"`.
3. Cuando el frontend o la API ejecuta `formatDate(t.fecha_pago)` o `new Date(t.fecha_pago).getUTCDate()`, lee directamente el día **`12`**, confirmando que el dato en disco ya está mutilado con -1 día de atraso.

---

## 2. AUDITORÍA DE `parseFechaEcuador` EN `src/services/migracionExcelService.ts`

### 2.1. Código Fuente Actual de `parseFechaEcuador`
```typescript
/**
 * Parsea fechas con estricto formato ecuatoriano (DD/MM/YYYY) e inmunidad ante huso horario.
 * Incluye blindaje ante seriales corruptos de Excel (< 45292) y corrección automática de errata 2025 -> 2026.
 */
export function parseFechaEcuador(
  val: any,
  fechaReferenciaIngreso?: Date | null,
  contextoTexto?: string | null
): Date | null {
  if (val === null || val === undefined) return null;

  // Si es un número serial de Excel menor a 45292 (01/01/2024), como 16.57 en fila 692, retornar null
  if (typeof val === "number") {
    if (val < 45292) return null;
    const ms = Math.round((val - 25569) * 86400000);
    const d = new Date(ms);
    if (!isNaN(d.getTime())) {
      const candidate = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 12, 0, 0));
      return ajustarErrataAnioNuevo(candidate, fechaReferenciaIngreso, contextoTexto);
    }
    return null;
  }

  // Si ya es un objeto Date
  if (val instanceof Date && !isNaN(val.getTime())) {
    const candidate = new Date(Date.UTC(val.getFullYear(), val.getMonth(), val.getDate(), 12, 0, 0));
    return ajustarErrataAnioNuevo(candidate, fechaReferenciaIngreso, contextoTexto);
  }

  // Si es objeto celda de ExcelJS con formula o resultado
  if (typeof val === "object") {
    if (val.result !== undefined && val.result !== null) {
      return parseFechaEcuador(val.result, fechaReferenciaIngreso, contextoTexto);
    }
    if (val.text) {
      return parseFechaEcuador(val.text, fechaReferenciaIngreso, contextoTexto);
    }
  }

  // Si es texto
  if (typeof val === "string") {
    const trimmed = val.trim();
    if (!trimmed || trimmed === "N/A" || trimmed === "-" || trimmed === ".") return null;

    // Si es un string puramente numérico (ej: "16.57" o serial corrupto menor a 45292)
    const num = Number(trimmed);
    if (!isNaN(num) && !trimmed.includes("/") && !trimmed.includes("-") && !trimmed.includes(".")) {
      if (num < 45292) return null;
      const ms = Math.round((num - 25569) * 86400000);
      const d = new Date(ms);
      if (!isNaN(d.getTime())) {
        const candidate = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 12, 0, 0));
        return ajustarErrataAnioNuevo(candidate, fechaReferenciaIngreso, contextoTexto);
      }
      return null;
    }
    if (!isNaN(num) && trimmed.includes(".") && !trimmed.includes("/") && !trimmed.includes("-")) {
      if (num < 45292) return null;
    }

    // Patrón estricto DD/MM/YYYY o DD-MM-YYYY
    const match = trimmed.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{2,5})$/);
    if (match) {
      const d = parseInt(match[1], 10);
      const m = parseInt(match[2], 10) - 1;
      let y = parseInt(match[3], 10);

      // Corrección de erratas de digitación en Excel
      if (y < 100) y = 2000 + y;
      else if (y === 206) y = 2026;   // Errata '18/2/206'
      else if (y === 22026) y = 2026; // Errata '22/5/22026'

      if (m >= 0 && m <= 11 && d >= 1 && d <= 31) {
        const candidate = new Date(Date.UTC(y, m, d, 12, 0, 0));
        return ajustarErrataAnioNuevo(candidate, fechaReferenciaIngreso, contextoTexto);
      }
    }

    // Fallback ISO o formato parseable estándar
    const parsed = new Date(trimmed);
    if (!isNaN(parsed.getTime())) {
      const candidate = new Date(Date.UTC(parsed.getFullYear(), parsed.getMonth(), parsed.getDate(), 12, 0, 0));
      return ajustarErrataAnioNuevo(candidate, fechaReferenciaIngreso, contextoTexto);
    }
  }

  return null;
}
```

### 2.2. Anatomía del Error: Paso a Paso por Tipo de Entrada

#### (a) Objetos `Date` nativos entregados por ExcelJS (Líneas 154-157)
* **Origen:** ExcelJS lee las celdas formateadas como fecha en `.xlsx` y entrega instancias nativas `Date` de JavaScript con hora medianoche UTC: `2026-07-03T00:00:00.000Z`.
* **Mecanismo del Bug:**
  ```typescript
  if (val instanceof Date && !isNaN(val.getTime())) {
    const candidate = new Date(Date.UTC(val.getFullYear(), val.getMonth(), val.getDate(), 12, 0, 0));
  ```
  * En una máquina o contenedor ejecutándose en Ecuador (`America/Guayaquil`, GMT-0500):
    * `val` representa: `2026-07-03T00:00:00.000Z`.
    * En hora local de Ecuador, las 00:00:00 UTC corresponden a: **`2026-07-02 19:00:00 (7 PM del día anterior)`**.
    * Los métodos locales `.getFullYear()`, `.getMonth()`, y **`.getDate()`** devuelven la fecha según la hora local de la máquina:
      * `val.getFullYear()` = `2026`
      * `val.getMonth()` = `6` (Julio)
      * `val.getDate()` = **`2`** (¡En vez de 3!).
    * Al invocar `Date.UTC(2026, 6, 2, 12, 0, 0)`, se construye: **`2026-07-02T12:00:00.000Z`**.
  * **Conclusión Forense:** El uso de métodos locales (`.getDate()`, `.getMonth()`, `.getFullYear()`) en lugar de los métodos UTC (`.getUTCDate()`, `.getUTCMonth()`, `.getUTCFullYear()`) sobre los objetos `Date` generados por ExcelJS provocó la resta sistemática de 1 día a **todos los trámites cuyas celdas fueron leídas como Date nativo**.

#### (b) Strings en formato `dd/mm/yyyy` (Líneas 191-205)
* Son capturados por la expresión regular `^(\d{1,2})[/.-](\d{1,2})[/.-](\d{2,5})$`.
* Extrae directamente los dígitos con `parseInt(match[1], 10)`. Si la celda es texto `"03/07/2026"`, `d = 3`, y construye `Date.UTC(y, m, 3, 12, 0, 0)`.
* **Comportamiento:** Estas celdas de texto plano no sufren el desfase en la migración. Sin embargo, en el Excel oficial, la inmensa mayoría de celdas de fecha (más del 95%) no son strings sino celdas de fecha nativas que ExcelJS entrega como `Date`.

#### (c) Strings con mes en texto como `"13-jul-26"` o fechas ISO (Líneas 209-213)
* No cumplen la expresión regular numérica y caen en el bloque Fallback:
  ```typescript
  const parsed = new Date(trimmed);
  if (!isNaN(parsed.getTime())) {
    const candidate = new Date(Date.UTC(parsed.getFullYear(), parsed.getMonth(), parsed.getDate(), 12, 0, 0));
  ```
* En V8 / Node.js, `new Date("2026-07-03")` (formato ISO sin hora) se parsea por estándar ECMAScript a medianoche UTC (`2026-07-03T00:00:00.000Z`).
* Al aplicar `parsed.getDate()`, en Ecuador (GMT-5) son las 19:00 del día anterior, por lo que `parsed.getDate()` vuelve a devolver **`2`**, provocando idéntico retroceso de 1 día.

---

## 3. AUDITORÍA DE FERIADOS Y DÍAS DE LA SEMANA EN `src/lib/tiemposCalculator.ts`

### 3.1. Evaluación de Fines de Semana (`esFinDeSemana`)
En `src/lib/tiemposCalculator.ts`:
```typescript
/**
 * Determina si una fecha cae en sábado (6) o domingo (0).
 */
export function esFinDeSemana(d: Date): boolean {
  const day = d.getUTCDay();
  return day === 0 || day === 6;
}
```
* **Diagnóstico:** Usa **`.getUTCDay()`**, lo cual es correcto siempre que la fecha esté anclada a medio día UTC (`12:00:00.000Z`).
* **Riesgo:** Si una fecha está guardada con hora `00:00:00.000Z` (como ocurre con los feriados o fechas de creación), un lunes a las 00:00 UTC es domingo a las 19:00 en Ecuador.

### 3.2. Cotejo contra la Tabla `feriados`
En `src/lib/tiemposCalculator.ts`:
```typescript
export function toIsoDateOnly(d: Date): string {
  const year = d.getUTCFullYear();
  const month = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function normalizarFeriadosSet(feriados: (string | Date | FeriadoInfo)[]): Set<string> {
  const s = new Set<string>();
  for (const f of feriados) {
    if (!f) continue;
    if (typeof f === "string") {
      s.add(f.split("T")[0]);
    } else if (f instanceof Date) {
      s.add(toIsoDateOnly(f));
    } else if (typeof f === "object" && "fecha" in f) {
      const parsed = parseDate(f.fecha);
      if (parsed) s.add(toIsoDateOnly(parsed));
    }
  }
  return s;
}
```

### 3.3. Inspección en Base de Datos de la Tabla `feriados`
Se extrajeron los registros directos de `feriados` en SQLite:

| ID | Descripción | Año | `.toISOString()` en BD | `.toString()` (Local Ecuador GMT-5) |
| :--- | :--- | :--- | :--- | :--- |
| 1 | Año Nuevo | 2026 | `2026-01-01T00:00:00.000Z` | `Wed Dec 31 2025 19:00:00 GMT-0500` |
| 2 | Carnaval Día 1 | 2026 | `2026-02-16T00:00:00.000Z` | `Sun Feb 15 2026 19:00:00 GMT-0500` |
| 3 | Carnaval Día 2 | 2026 | `2026-02-17T00:00:00.000Z` | `Mon Feb 16 2026 19:00:00 GMT-0500` |
| 4 | Viernes Santo | 2026 | `2026-04-03T00:00:00.000Z` | `Thu Apr 02 2026 19:00:00 GMT-0500` |
| 5 | Día del Trabajo | 2026 | `2026-05-01T00:00:00.000Z` | `Thu Apr 30 2026 19:00:00 GMT-0500` |
| 6 | Batalla de Pichincha | 2026 | `2026-05-24T00:00:00.000Z` | `Sat May 23 2026 19:00:00 GMT-0500` |
| 7 | Fundación de Guayaquil| 2026 | `2026-07-25T00:00:00.000Z` | `Fri Jul 24 2026 19:00:00 GMT-0500` |
| 8 | Primer Grito Independencia | 2026 | `2026-08-10T00:00:00.000Z` | `Sun Aug 09 2026 19:00:00 GMT-0500` |

* **Hallazgo Crítico:**
  1. Los feriados fueron sembrados en `prisma/seed.ts` con hora **`00:00:00.000Z`** (medianoche UTC).
  2. En el backend, `toIsoDateOnly(d)` usa `.getUTCFullYear()`, `.getUTCMonth()`, `.getUTCDate()`, por lo que para el ID 1 genera la clave `"2026-01-01"`.
  3. Sin embargo, en el frontend, si un componente React renderiza la fecha del feriado con `new Date(f.fecha).toLocaleDateString()`, el navegador del usuario en Ecuador muestra: **`31/12/2025`** (atrasado 1 día).

---

## 4. AUDITORÍA DE FORMATEO EN FRONTEND Y FILTROS DE FECHA EN REPORTES

### 4.1. Formateo de Fechas en Componentes de Usuario
En `src/lib/utils.ts` (función consumida en tablas y tarjetas de toda la UI):
```typescript
export function formatDate(date: Date | string | null | undefined): string {
  if (!date) return "-";
  const d = new Date(date);
  if (isNaN(d.getTime())) return "-";
  return new Intl.DateTimeFormat("es-EC", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(d);
}
```
* **Comportamiento en Frontend:**
  * Para los trámites migrados, la fecha fue guardada a las `12:00:00.000Z`.
  * En Ecuador (UTC-5), `12:00:00 UTC` son las `07:00:00 AM` del mismo día.
  * Por tanto, `Intl.DateTimeFormat` no agrega un segundo desfase al mostrar trámites, **pero muestra fielmente la fecha ya atrasada que está guardada en la base de datos**.
  * Si en la base de datos se guardó `2026-07-02T12:00:00.000Z`, la UI dibuja `02/07/2026`.

### 4.2. Filtros de Fecha en `src/services/reportesTiemposService.ts` (`construirWherePrisma`)
En líneas 471-499:
```typescript
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
```

* **Impacto Operativo Forense:**
  1. Si un usuario en los reportes filtra trámites recibidos el **`2026-07-03`** (`fecha_desde: 2026-07-03`, `fecha_hasta: 2026-07-03`):
     * `fDesde` = `2026-07-03T00:00:00.000Z`
     * `fHasta` = `2026-07-03T23:59:59.999Z`
  2. El trámite Nº 1040 (`SENAE-DCVA-2026-0125-M`) tiene guardado en `fecha_recepcion_fisica`: **`2026-07-02T12:00:00.000Z`**.
  3. Como `2026-07-02T12:00:00.000Z < 2026-07-03T00:00:00.000Z`, **el trámite es silente e indebidamente excluido del reporte**. El usuario asume que no hubo recepción ese día.

---

## 5. AUDITORÍA DE OTROS DESFASES O MAPEOS SILENCIOSOS

### 5.1. Comparación Forense de 10 Trámites Muestra (Enero a Julio)

| Muestra | Ítem / Fila | Quipux | Fecha Recepción en Excel | Fecha Recepción en BD | Fecha Pago en Excel | Fecha Pago en BD | ¿Desfase -1d? |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Enero** | #50 (Fila 52) | `SENAE-JDAL-2026-0009-M` | `14/01/2026` | `2026-01-13T12:00:00.000Z` | `27/02/2026` | `2026-02-26T12:00:00.000Z` | ❌ **Sí (-1 día)** |
| **Febrero**| #200 (Fila 202)| `SENAE-CZPL-2026-0134-M` | `05/02/2026` | `2026-02-04T12:00:00.000Z` | `NULL` | `NULL` | ❌ **Sí (-1 día)** |
| **Marzo** | #380 (Fila 382)| `SENAE-ADFE-2026-0059-M` | `05/03/2026` | `2026-03-04T12:00:00.000Z` | `06/03/2026` | `2026-03-05T12:00:00.000Z` | ❌ **Sí (-1 día)** |
| **Abril** | #550 (Fila 552)| `SENAE-DAM-2026-0130-M` | `30/03/2026` | `2026-03-29T12:00:00.000Z` | `18/04/2026` | `2026-04-17T12:00:00.000Z` | ❌ **Sí (-1 día)** |
| **Mayo** | #720 (Fila 722)| `SENAE-ADFC-2026-0104-M` | `06/05/2026` | `2026-05-05T12:00:00.000Z` | `12/05/2026` | `2026-05-11T12:00:00.000Z` | ❌ **Sí (-1 día)** |
| **Junio** | #900 (Fila 902)| `SENAE-JDAL-2026-0115-M` | `10/06/2026` | `2026-06-09T12:00:00.000Z` | `27/06/2026` | `2026-06-26T12:00:00.000Z` | ❌ **Sí (-1 día)** |
| **Julio** | #1040 (Fila 1041)| `SENAE-DCVA-2026-0125-M` | `03/07/2026` | `2026-07-02T12:00:00.000Z` | `13/07/2026` | `2026-07-12T12:00:00.000Z` | ❌ **Sí (-1 día)** |
| **Julio final**| #1080 (Fila 1081)| `SENAE-DCP-2026-0253-M` | `29/06/2026` | `2026-06-28T12:00:00.000Z` | `NULL` | `NULL` | ❌ **Sí (-1 día)** |
| **Garantía 1**| #10 (Fila 12) | `SENAE-DDZM-2026-0009-M` | `05/01/2026` | `2026-01-04T12:00:00.000Z` | `NULL` | `NULL` | ❌ **Sí (-1 día)** |
| **Garantía 2**| #400 (Fila 402)| `SENAE-DPP-2026-0306-M` | `20/05/2026` | `2026-05-19T12:00:00.000Z` | `NULL` | `NULL` | ❌ **Sí (-1 día)** |

* **Resultado Estadístico:** **El 100% de las fechas nativas de la bitácora (10 de 10 casos analizados en todas las hojas y meses) sufrieron el desfase de -1 día hacia el pasado.**

---

### 5.2. Auditoría del Mapeo de "Servicio Arrendamiento" y Procesos Fallback

#### ¿Por qué `SENAE-DCVA-2026-0125-M` se mapeó a `CONTRATACION_SNCP`?
En `src/services/migracionExcelService.ts`:
```typescript
export function mapearTipoTramitePago(tipoContratacion: string, descripcion: string = ""): number {
  const s = `${tipoContratacion || ""} ${descripcion || ""}`.toLowerCase();
  if (s.includes("básico") || ... ) return 1; // SERV_BASICOS
  if (s.includes("ínfima") || ... ) return 2; // INFIMA_CUANTIA
  if (s.includes("contrato") || s.includes("sncp") || s.includes("subasta") || s.includes("catálogo") || s.includes("catalogo") || s.includes("menor cuantía") || s.includes("cotización") || s.includes("licitación")) return 3; // CONTRATACION_SNCP
  ...
  return 17; // OTROS_PROCESOS
}
```

1. La función concatena `tipoContratacion` (Columna 7) con `descripcion` (Columna 11):
   * `tipoContratacion` = `"Servicio Arrendamiento"`
   * `descripcion` = `"informe de conformidad del contrato no. r-018-2024 'servicio de arrendamiento de un bien inmueble...'"`
2. Aunque `"Servicio Arrendamiento"` no está contemplado como categoría en `mapearTipoTramitePago`, la descripción contiene la subcadena **`"contrato"`** (`contrato no. r-018-2024`).
3. La línea 363 evalúa `s.includes("contrato")` a `true` y le asigna el **ID 3 (`CONTRATACION_SNCP`)**.

#### ¿Qué ocurre con otros textos de la Columna `TIPO CONTRATACIÓN`?
Se contabilizaron todas las variantes de texto libre en la columna 7 de la hoja PAGO del Excel (1099 filas):
* **Casos que caen en `CONTRATACION_SNCP` (ID 3):**
  * `"Contrato"` (116 filas)
  * `"Catálogo Electrónico"` (39 filas)
  * `"Orden de compra"` / `"orden de compra"` (25 filas en total, cuando la descripción menciona "contrato" o "catálogo"; si no, caen a ID 17).
  * `"Servicio Arrendamiento"` (cuando la descripción incluye la palabra "contrato").
* **Casos huérfanos que caen en el fallback silencioso `OTROS_PROCESOS` (ID 17):**
  * `"Servicio de Limpieza"` (12 ocurrencias)
  * `"Servicio de arrendamiento"` / `"Servicio de arriendo"` (cuando la descripción no incluye la palabra "contrato")
  * `"Servicio de Mantenimiento"` (4 ocurrencias)
  * `"Servicio de Combustible"` / `"servicio de combustible"` (8 ocurrencias)
  * `"Servicio de Comunicación"` (3 ocurrencias)
  * `"Servicio de Abastecimiento"` (11 ocurrencias con distintas erratas ortográficas)
  * `"Parqueos"` (2 ocurrencias)
  * `"Recolección de basura"` (2 ocurrencias)
  * `"Alquiler de radio"` (1 ocurrencia)
  * `"Expediente"` (1 ocurrencia)

---

## 6. SÍNTESIS EJECUTIVA Y RECOMENDACIÓN TÉCNICA (AUDITORÍA FORENSE)

1. **Causa Raíz del Bug de Fechas:**  
   En `src/services/migracionExcelService.ts`, líneas 154-157, `parseFechaEcuador` invoca `val.getDate()` sobre objetos `Date` que vienen a las `00:00:00 UTC` desde ExcelJS. En huso horario ecuatoriano (UTC-5), `00:00:00 UTC` equivale a las `19:00:00` del día anterior. Como consecuencia, `.getDate()` devuelve el día anterior y se grabó permanentemente un retroceso de 24 horas en la base de datos.
2. **Causa Raíz en Feriados:**  
   Los feriados fueron sembrados en `prisma/seed.ts` a las `00:00:00.000Z`, provocando que cualquier formateador en frontend los muestre desfasados en 1 día (e.g. Año Nuevo se muestra como `31/12/2025`).
3. **Causa Raíz de Mapeo de Procesos:**  
   `mapearTipoTramitePago` clasifica basándose en palabras clave de la descripción libre cuando el `tipoContratacion` no tiene coincidencia exacta. "Servicio Arrendamiento" termina en `CONTRATACION_SNCP` solo porque el texto menciona "contrato".

*Fin del dictamen forense. Base de datos y código fuente preservados intactos sin alteraciones.*
