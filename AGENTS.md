# Reglas de Proyecto - SENAE Control Previo

- **Estado de Contabilidad**: El estado en base de datos e interfaz para los trámites en el área contable es **`CONTABILIDAD`**. Nunca usar `CONTROL_PREVIO` como estado.
- **Fidelidad al Flujo Original**: Apegarse estrictamente a la terminología y flujo de la bitácora histórica del SENAE (`PAGADO`, `CONTABILIDAD`, `ARCHIVO`, `DEVUELTO`, `REVISION`, `OBSERVADO`, `DFI`).
- **Consulta y Aprobación Previa**: Apegarse al flujo y terminología original, pero se pueden incorporar mejoras, nuevos estados o cambios de nombres siempre que se conversen previamente y cuenten con la aprobación explícita del usuario.
- **Presupuesto - Registro Dinámico**: `CUR Compromiso` y `Factura` se agregan por filas individuales con botón `[+ Agregar]` y papelera para eliminar, idéntico a Contabilidad.
