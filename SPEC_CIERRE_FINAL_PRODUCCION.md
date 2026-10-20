# ESPECIFICACIÓN DE CIERRE FINAL: CORRECCIÓN DE AUDITORÍA, EXPORTACIÓN EXCEL Y LIMPIEZA DE SEEDS
**Regla Estricta:** Prohibido tocar `src/services/migracionExcelService.ts`, `src/lib/tiemposCalculator.ts` ni `src/services/reportesTiemposService.ts` (ya están certificados al 100%).

---

## TAREA A (SUBAGENTE FRONTEND/REPORTES): Corregir Exportación a Excel
**Archivos permitidos:** `src/app/reportes/page.tsx` y `src/app/api/reportes/exportar/route.ts`

1. En `src/app/reportes/page.tsx` dentro de `handleExportarExcel`:
   - Incluir obligatoriamente `padre_gestion: padreGestion` (o el estado activo de pestaña `"TODOS" | "PAGO" | "GARANTIA"`).
   - Incluir también los filtros activos en pantalla (`criterio_fecha`, `estado_general`, `estado_filtro`, `busqueda`) si están seleccionados.
   - Si `area === "TODAS"` o `area === "TODOS"`, no enviar `id_area` (o enviar vacío).
   - Si `funcionario === "TODOS"`, no enviar `id_usuario` / `id_funcionario`.
2. En `src/app/api/reportes/exportar/route.ts`:
   - Si `padre_gestion` es `"TODOS"` (o no se especifica), exportar tanto PAGO como GARANTÍA en lugar de forzar `"PAGO"` por defecto.
   - Sanitizar cualquier parámetro que llegue con valor `"TODOS"` o `"TODAS"` convirtiéndolo en `undefined` antes de pasarlo al servicio de consulta.

---

## TAREA B (SUBAGENTE AUDITORÍA): Paginación y Búsqueda Remota en Bitácora de Auditoría
**Archivos permitidos:** `src/app/api/admin/auditoria/route.ts` y `src/app/administracion/page.tsx`

1. En `src/app/api/admin/auditoria/route.ts`:
   - Leer query params: `page` (default `1`), `limit` (default `100`, máx `500`), `search` (texto libre), `tipo_accion`, `id_area`, `fecha_desde`, `fecha_hasta`.
   - Si `search` tiene texto, construir un `OR` en Prisma que busque (`contains`) tanto en `comentarios` como en la relación `tramites`: `tramites.codigo_tramite`, `tramites.numero_quipux`, `tramites.proveedor_beneficiario`, y en los nombres de usuario de entrega/recepción (`usuarios_...nombre_completo`).
   - Ejecutar `prisma.historial_movimientos.count({ where: whereClause })` junto con `findMany({ where: whereClause, skip: (page - 1) * limit, take: limit, orderBy: { fecha_hora: "desc" }, include: ... })`.
   - Mantener compatibilidad con la respuesta actual o devolver `{ data: movimientos, meta: { total, page, limit, totalPages } }` adaptando `src/app/administracion/page.tsx`.
2. En `src/app/administracion/page.tsx`:
   - Conectar el buscador `auditSearch` (con un pequeño debounce de 300ms o botón de buscar) y los controles de página (`Anterior` / `Siguiente` mostrando `Página X de Y — Total: 3,248 movimientos`) directamente a `/api/admin/auditoria?page=...&limit=100&search=...` para que el auditor pueda encontrar cualquier movimiento de enero a junio de 2026 al instante.

---

## TAREA C (SUBAGENTE DE LIMPIEZA DE SEEDS): Purga Quirúrgica de los 29 Trámites Ficticios de Prueba
**Entregable:** Ejecutar un script seguro con `npx tsx` contra la BD.

1. Identificar los `29` trámites de prueba local cuyo `codigo_tramite` NO empieza con `TRM-2026-P-` ni `TRM-2026-G-` (es decir, `TRM-2026-0001` hasta `TRM-2026-0029`).
2. En una transacción de Prisma (`prisma.$transaction`), eliminar primero sus registros hijos en `historial_movimientos`, `observaciones` y `tramite_referencias`, y luego eliminar esos `29` registros de `tramites`.
3. Verificar al finalizar que `SELECT COUNT(*) FROM tramites` sea exactamente **`1,636`** (`1,099` de PAGO + `537` de GARANTÍA).