# REGLAS DE NEGOCIO Y MEMORIA OPERATIVA - PROYECTO SENAE CONTROL PREVIO

Este archivo define las directivas y restricciones obligatorias que el asistente de IA debe seguir en todas las sesiones y tareas de este repositorio.

---

## 1. Vocabulario y Estados Oficiales del Trámite
- **El estado oficial para Contabilidad es `CONTABILIDAD`:**
  - **BAJO NINGUNA CIRCUNSTANCIA** se debe renombrar o sustituir por `CONTROL_PREVIO` como estado de trámite.
  - El término "Control Previo" es el nombre del proceso institucional general, no el estado del trámite en la mesa contable.
- **Los 7 estados base de la operativa histórica son estrictamente:**
  1. `PAGADO`: Trámite con transferencia ejecutada o solicitud de pago en Tesorería.
  2. `CONTABILIDAD`: Expediente en el departamento contable (revisión de devengados o justificación de partidas).
  3. `ARCHIVO`: Expediente custodiado en el Archivo Central institucional.
  4. `DEVUELTO`: Expediente devuelto formalmente mediante memorando al área requirente.
  5. `REVISION`: Expediente en control previo activo en Presupuesto.
  6. `OBSERVADO`: Expediente pausado por novedad técnica o a la espera de subsanación/factura.
  7. `DFI`: Expediente en despacho de la Dirección Financiera.

---

## 2. Principio de Fidelidad y Aprobación Previa
- El principio rector es **mantener la máxima fidelidad al flujo real y vocabulario de la bitácora histórica** que el personal del SENAE viene utilizando para no generar fricciones ni re-capacitaciones innecesarias.
- **Se pueden incorporar mejoras, nuevos estados o cambios de terminología**, siempre y cuando se dialoguen previamente, se justifique su necesidad técnica y cuenten con la **aprobación explícita del usuario**.
- Nunca asumir ni aplicar cambios estructurales en estados o flujos sin consultarlo y consensuarlo primero en la conversación.

---

## 3. Registro Dinámico de Campos
- En **Presupuesto**, tanto el **CUR Compromiso** (`numero_cur_compromiso`) como las **Facturas** (`numero_factura`) se registran mediante filas dinámicas individuales con botón `[+ Agregar]` y botón de eliminar (papelera), idéntico al funcionamiento de `CUR DEV` y `CUR CON` en **Contabilidad**.
