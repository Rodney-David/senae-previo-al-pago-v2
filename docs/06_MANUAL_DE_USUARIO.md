# SERVICIO NACIONAL DE ADUANA DEL ECUADOR (SENAE)
## DIRECCIÓN FINANCIERA · CONTROL PREVIO AL PAGO v2.0
### MANUAL DE USUARIO DE LA APLICACIÓN

---

### 1. INTRODUCCIÓN Y PROPÓSITO DEL SISTEMA

El **Sistema de Control Financiero Previo al Pago (SENAE-CFPP)** es la herramienta oficial de la Dirección Financiera para estandarizar, transparentar y fiscalizar el flujo documental y financiero de los expedientes de pago desde su recepción física en ventanilla hasta su custodia definitiva en el Archivo Pasivo.

Garantiza:
* **Cumplimiento estricto de SLAs:** Semáforos visuales basados en días laborables y exclusión de feriados nacionales.
* **Control normativo documental:** Verificación interactiva de los 137 requisitos legales según los 17 tipos de procesos SENAE.
* **Trazabilidad inmutable:** Bitácora forense de auditoría que registra cada cambio, responsable y estampa temporal.

---

### 2. ACCESO AL SISTEMA Y AUTENTICACIÓN INSTITUCIONAL

#### Paso 1: Ingreso de Credenciales y Desafío Captcha
1. Abra su navegador web (Google Chrome o Microsoft Edge) e ingrese a la dirección del sistema: `http://<IP_INSTITUCIONAL>`.
2. En la pantalla de bienvenida institucional:
   - Ingrese su **Correo Institucional** (ej. `secretaria.dfi@aduana.gob.ec` o su nombre de usuario).
   - Ingrese su **Contraseña**.
   - Observe la imagen de seguridad **Captcha** y digite exactamente los 5 caracteres alfanuméricos mostrados en la casilla inferior.
   - Si la imagen es difícil de leer, presione el botón circular de **Refrescar Captcha**.
3. Haga clic en **Continuar a Doble Factor (2FA)**.

#### Paso 2: Validación de Doble Factor (2FA)
1. El sistema generará y enviará un código de verificación de 6 dígitos con validez de 5 minutos.
2. Ingrese el código en las 6 casillas numéricas.
3. El sistema verificará criptográficamente la identidad y lo redirigirá a su **Escritorio Personal**.

---

### 3. PANTALLA PRINCIPAL (ESCRITORIO INSTITUCIONAL)

El escritorio se adapta dinámicamente según el departamento del usuario autenticado:
* **Mis Trámites Asignados (Custodia Activa):** Expedientes físicos que se encuentran actualmente en su despacho y requieren su gestión.
* **Semáforos SLA de Vencimiento:**
  - 🟢 **Verde (Dentro de Plazo):** El expediente tiene más del 50% del tiempo legal disponible.
  - 🟡 **Amarillo (Alerta Preventiva):** Quedan menos de 2 días laborables para el vencimiento de la etapa.
  - 🔴 **Rojo (Vencido):** El expediente ha superado el plazo legal normado y requiere atención prioritaria.
* **Bandeja de Observaciones 72h:** Notificaciones de novedades pendientes de descargo o respuesta.

---

### 4. GUÍA PASO A PASO POR FASES DEL FLUJO INSTITUCIONAL

```text
[Ventanilla DFI] ──> [Presupuesto] ──> [Contabilidad] ──> [Directora (Pago)] ──> [Tesorería/SPI] ──> [Archivo]
        │                    │                 │
        └────────────────────┴─────────────────┴───> (Devolución con Memo Quipux / Alcance)
```

---

#### FASE 1: RECEPCIÓN FÍSICA EN VENTANILLA DFI (SECRETARÍA / DIRECTORA)
1. Al recibir físicamente el expediente en la ventanilla de la Dirección Financiera, ingrese al menú lateral **Recepción**.
2. Complete los **8 Datos Obligatorios:**
   - **Tipo de Gestión:** Seleccione `PAGO` (con control presupuestario) o `EXPEDIENTE` (sin compromiso).
   - **Nro. Memorando Quipux:** Ingrese el código oficial (ej. `SENAE-GAA-2026-0450-M`).
   - **Fecha del Memorando** y **Fecha de Recepción Física**.
   - **Nombre del Proveedor / Beneficiario** y **RUC / Cédula**.
   - **Tipo de Proceso:** Seleccione uno de los 17 procesos normados (ej. *Servicios Básicos, Ínfima Cuantía, Bienes y Servicios*, etc.).
   - **Monto Total ($):** Valor económico total de la obligación.
   - **Fojas Físicas:** Número de hojas que componen el paquete físico foliado.
3. **Condición Automática de Cuantía:**
   - Si el monto es **>= $10,000.00**, el sistema asignará automáticamente la custodia inicial al **Jefe de Presupuesto**.
   - Si el monto es **< $10,000.00**, el sistema asignará el expediente a los analistas presupuestarios por rotación de turno.
4. Haga clic en **Registrar y Derivar Expediente**.

---

#### FASE 2: GESTIÓN EN EL ÁREA DE PRESUPUESTO
El analista o jefe asignado abre el expediente desde su bandeja:
1. **Registro Presupuestario:**
   - Presione el botón **Registrar Datos / CUR Compromiso**.
   - Complete: Certificación Presupuestaria, Ítem/Partida presupuestaria, Nro. de CUR de Compromiso y Anexos.
2. **Evaluación del Checklist Normativo:**
   - En la sección central **Checklist Oficial SENAE**, revise cada documento físico contra la lista de requisitos.
   - Marque cada casilla: `CUMPLE`, `NO CUMPLE` o `NO APLICA`.
   - Puede descargar el reporte oficial en cualquier momento haciendo clic en **Descargar Formato SENAE (.xlsx)**.
3. **Gestión de Factura y Pausa de Semáforo SLA:**
   - Si el expediente no cuenta con la factura física original, presione el botón **Pausar Semáforo / Espera Factura**. Esto detiene el conteo legal de días para no perjudicar el tiempo de los analistas.
   - Una vez recibida la factura física, ingrese el número autorizado por el SRI (ej. `001-002-123456789`) y presione **Reanudar Semáforo SLA**.
4. **Visto Bueno y Despacho:**
   - El **Jefe de Presupuesto** presiona **Emitir Aprobación Jefe Presupuesto**.
   - Una vez aprobado y con factura registrada, se habilita el botón **Derivar a Contabilidad**.

---

#### FASE 3: GESTIÓN EN EL ÁREA DE CONTABILIDAD
1. El **Contador General** recibe el expediente en su bandeja y puede reasignarlo a un analista contable.
2. **Liquidación y Registro Contable:**
   - Presione **Registrar Devengado / Retenciones**.
   - Ingrese el Nro. de **CUR Devengado** (o CUR Contable según el tipo de proceso), Nro. de Liquidación e importes de retenciones y multas.
3. **Verificación de Requisitos de Contabilidad:**
   - Evalúe los requisitos de la fase contable en la **Tarjeta de Checklist**.
4. **Visto Bueno Contable:**
   - El **Contador General** presiona **Emitir Aprobación Contador General**.
   - Se habilita el botón **Derivar a Directora Financiera (Pago)**.

---

#### FASE 4: AUTORIZACIÓN DE PAGO (DIRECTORA FINANCIERA)
1. La Directora Financiera abre el expediente desde su bandeja especial de pagos.
2. Verifica la coherencia de los valores liquidados, la certificación presupuestaria y el cumplimiento del checklist al 100%.
3. Presiona el botón verde **Autorizar Pago y Derivar a Tesorería**.

---

#### FASE 5: TESORERÍA / CAJA Y COBRANZAS
1. El técnico de cobranzas valida que el proveedor no tenga deudas tributarias o aduaneras coactivas pendientes.
2. El personal de Tesorería presiona **Registrar Lote MEF y Transferencia SPI-BCE**.
3. Registra el número de lote transmitido al Ministerio de Economía y Finanzas y la referencia de comprobante bancario del Banco Central del Ecuador (BCE).
4. El trámite pasa automáticamente a la bandeja de Custodia y Archivo.

---

#### FASE 6: CUSTODIA Y ARCHIVO CENTRAL
1. El custodio del archivo recibe físicamente las carpetas foliadas.
2. Presiona **Archivar Definitivo y Asignar Ubicación**.
3. Registra: Código de Tomo / Caja Pasiva, Estantería y Balda física.
4. El trámite cambia a estado **FINALIZADO_ARCHIVADO**, completando el ciclo de vida.

---

### 5. GESTIÓN DE INCIDENCIAS, NOVEDADES Y DEVOLUCIONES

#### 5.1. Observación Preventiva (Plazo de 72 horas)
* Si un documento presenta un error subsanable menor, presione **Observar (72h)**.
* Ingrese el detalle de la observación y el área responsable de contestar.
* El área observada tiene un plazo legal estricto de 72 horas para responder mediante el botón **Responder / Subsanar Observación (72h)**.

#### 5.2. Devolución Formal por Memorando Quipux
* Si el expediente presenta vicios insubsanables o no fue atendido en 72h, presione **Devolver Formalmente**.
* Ingrese el **Número Oficial de Memorando de Devolución Quipux** (ej. `SENAE-DFI-2026-0890-M`) y el fundamento legal.
* **Efecto:** El expediente sale del flujo activo, el semáforo SLA se congela automáticamente y el trámite retorna al área requirente.

#### 5.3. Reingreso por Memorando de Alcance
* Cuando el área requirente subsane los documentos y envíe el oficio de alcance:
* Ingrese al trámite y presione el botón **Reingresar por Alcance**.
* Ingrese el **Número de Memorando de Alcance Quipux** (ej. `SENAE-GAA-2026-0955-M`) y el detalle de subsanaciones.
* **Efecto:** El semáforo se descongela automáticamente y el expediente se reasigna de inmediato al analista que emitió la devolución original para que continúe la revisión sin empezar desde cero.

---

### 6. AUDITORÍA FORENSE E HISTORIAL INMUTABLE
En la parte inferior de cualquier expediente, la pestaña **Bitácora Histórica e Inmutable de Auditoría** muestra la línea de tiempo completa:
- Cada cambio de custodio (quién entregó y quién recibió).
- Cada modificación de valores económicos con el detalle antes/después (`[Monto: $5,000.00 → $7,500.00]`).
- Fecha, hora exacta y departamento responsable.
