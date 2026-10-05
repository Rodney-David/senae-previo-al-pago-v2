# SERVICIO NACIONAL DE ADUANA DEL ECUADOR (SENAE)
## DIRECCIÓN FINANCIERA · CONTROL PREVIO AL PAGO v2.0
### ESQUEMA DE ROLES Y PERMISOS DE USUARIOS (RBAC)

---

### 1. MAPA ORGANIZACIONAL Y PERFILES INSTITUCIONALES

El sistema implementa un modelo estricto de **Control de Acceso Basado en Roles (RBAC)** en cumplimiento de las directrices del Manual de Procesos de Control Previo de la Dirección Financiera.

| ID Rol | Denominación Institucional | Departamento | Misión Funcional en el Flujo |
| :---: | :--- | :--- | :--- |
| **R1** | **Directora Financiera** | Dirección Financiera (DFI) | Máxima autoridad del control previo. Aprueba pagos institucionales, autoriza derivaciones especiales y devuelve a cualquier etapa. |
| **R2** | **Secretaría DFI** | Dirección Financiera (DFI) | Ventanilla de ingreso físico. Registra los 8 campos iniciales de Quipux, folios y realiza la derivación inicial. |
| **R3** | **Jefe de Presupuesto** | DFI - Presupuesto | Reasigna trámites según turno o cuantía (>= $10k), emite el Visto Bueno Presupuestario obligatorio para pasar a Contabilidad. |
| **R4** | **Analista de Presupuesto** | DFI - Presupuesto | Diligencia el CUR de Compromiso, ítems presupuestarios, evalúa el Checklist de Presupuesto y pausa por factura faltante. |
| **R5** | **Contador General** | DFI - Contabilidad | Asigna expedientes a analistas contables y emite la Aprobación Contable obligatoria antes del pago. |
| **R6** | **Analista Contable** | DFI - Contabilidad | Liquida retenciones, multas, genera el CUR Devengado / Contable y evalúa el Checklist de Contabilidad. |
| **R7** | **Tesorero / Encargado de Caja**| DFI - Tesorería | Registra el lote del MEF y la transferencia SPI del Banco Central del Ecuador (BCE). |
| **R8** | **Técnico Cobranzas y Garantías** | DFI - Tesorería | Valida coactivas, garantías aduaneras y deudas pendientes del contratista previo al desembolso. |
| **R9** | **Custodio de Archivo** | Archivo Financiero | Recepciona el expediente físico foliado y registra la ubicación topográfica definitiva (estante, balda, tomo). |
| **R10**| **Administrador de Sistema (TICs)** | Dirección de TICs | Gestión de usuarios, feriados, reglas de campos dinámicos y catálogo de procesos. |

---

### 2. MATRIZ DE PERMISOS POR FUNCIÓN OPERATIVA

| Funcionalidad Operativa | R1 (Directora) | R2 (Secretaría) | R3 (Jefe Pres.) | R4 (Analista Pres.) | R5 (Contador) | R6 (Analista Cont.) | R7 (Tesorería) | R8 (Cobranzas) | R9 (Archivo) | R10 (Admin) |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| **Recepción y Creación de Trámite** | SÍ | **SÍ** | NO | NO | NO | NO | NO | NO | NO | SÍ |
| **Edición Datos Generales (Quipux, Monto)**| SÍ | SÍ | SÍ | SÍ | NO | NO | NO | NO | NO | **SÍ** |
| **Asignación / Reasignación Interna** | SÍ | NO | **SÍ** | NO | **SÍ** | NO | NO | NO | NO | SÍ |
| **Registro CUR Compromiso / Partida** | NO | NO | SÍ | **SÍ** | NO | NO | NO | NO | NO | SÍ |
| **Aprobación Jefe de Presupuesto** | SÍ | NO | **SÍ** | NO | NO | NO | NO | NO | NO | SÍ |
| **Pausar / Reanudar Semáforo por Factura**| SÍ | NO | SÍ | **SÍ** | NO | NO | NO | NO | NO | SÍ |
| **Evaluación Checklist de Presupuesto** | SÍ | NO | SÍ | **SÍ** | NO | NO | NO | NO | NO | SÍ |
| **Registro CUR Devengado / Retenciones**| NO | NO | NO | NO | SÍ | **SÍ** | NO | NO | NO | SÍ |
| **Aprobación Contador General** | SÍ | NO | NO | NO | **SÍ** | NO | NO | NO | NO | SÍ |
| **Evaluación Checklist de Contabilidad** | SÍ | NO | NO | NO | SÍ | **SÍ** | NO | NO | NO | SÍ |
| **Autorización Legal de Pago** | **SÍ** | NO | NO | NO | NO | NO | NO | NO | NO | SÍ |
| **Registro Transferencia SPI (BCE)** | NO | NO | NO | NO | NO | NO | **SÍ** | NO | NO | SÍ |
| **Validación de Coactivas** | NO | NO | NO | NO | NO | NO | SÍ | **SÍ** | NO | SÍ |
| **Asignación Topográfica y Archivo** | NO | NO | NO | NO | NO | NO | NO | NO | **SÍ** | SÍ |
| **Observación Preventiva (Plazo 72h)** | SÍ | SÍ | SÍ | SÍ | SÍ | SÍ | SÍ | SÍ | SÍ | SÍ |
| **Subsanar Observación 72h** | SÍ | SÍ | SÍ | SÍ | SÍ | SÍ | SÍ | SÍ | SÍ | SÍ |
| **Devolución Formal (Memorando Quipux)** | SÍ | SÍ | SÍ | SÍ | SÍ | SÍ | SÍ | SÍ | NO | SÍ |
| **Reingreso por Memorando de Alcance** | SÍ | **SÍ** | SÍ | SÍ | SÍ | SÍ | NO | NO | NO | SÍ |
| **Descarga Excel Formato SENAE (.xlsx)** | SÍ | SÍ | SÍ | SÍ | SÍ | SÍ | SÍ | SÍ | SÍ | SÍ |
| **CRUD Usuarios y Catálogo de Feriados** | NO | NO | NO | NO | NO | NO | NO | NO | NO | **SÍ** |
| **Configuración de Campos Dinámicos** | NO | NO | NO | NO | NO | NO | NO | NO | NO | **SÍ** |

---

### 3. REGLAS DE SEGURIDAD Y PREVENCIÓN DE VULNERABILIDADES

1. **Principio de Mínimo Privilegio:** Cada analista únicamente puede alterar datos de su propia competencia disciplinaria (Presupuesto no puede registrar CURs Devengados; Contabilidad no puede modificar las partidas presupuestarias).
2. **Restricción de Edición Directa a Directora:** La Directora Financiera puede autorizar, devolver o derivar a cualquier departamento, pero por transparencia y principio de control interno no puede alterar directamente los montos liquidados por los analistas. Si detecta error, debe ordenar la devolución mediante observación.
3. **Firmas de Custodia en Movimientos:** Todo cambio de custodio físico genera un evento inmutable en `historial_movimientos` registrando:
   - ID y nombres del funcionario que entrega.
   - ID y nombres del funcionario que recibe.
   - Departamento de origen y departamento de destino.
   - Estampa temporal irrevocable.
4. **Validación de Sesión Obligatoria:** Las rutas están protegidas a nivel del motor Edge Middleware (`src/middleware.ts`). Ninguna solicitud API o navegación web es procesada si la cabecera HTTP no incluye una cookie de sesión criptográfica válida y no expirada.
