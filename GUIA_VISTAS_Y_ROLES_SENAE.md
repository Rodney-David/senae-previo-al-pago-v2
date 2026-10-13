# GUÍA INTEGRAL DE VISTAS, CONTENIDOS Y MATRIZ DE ROLES
## SISTEMA DE CONTROL PREVIO AL PAGO - SENAE (V2)

Este documento detalla de manera exhaustiva y exacta cómo está construida cada pantalla del sistema, la información que despliega, las etiquetas y textos visibles, los elementos interactivos y el comportamiento específico según el rol del usuario conectado.

---

## 1. MATRIZ INSTITUCIONAL DE ROLES Y PERMISOS

| Rol Institucional | Código / Cargo | Recepción Física | CRUD Trámites | Edición Datos Generales | Edición Etapa Propia | Reportería e Indicadores | Administración Sistema |
| :--- | :--- | :---: | :---: | :---: | :---: | :---: | :---: |
| **Administrador del Sistema** | `ADMIN` / `ADMINISTRADOR` | Sí | **Total** (Crear, Editar, Eliminar) | Sí | Sí (Todas las etapas) | Sí (Total) | **Sí (Exclusivo)** |
| **Directora Financiera (DFI)** | `DIRECTORA` / `DIRECTORA_FINANCIERA` | Sí | **Total** (Crear, Editar, Eliminar) | Sí | Sí | Sí | No |
| **Secretaria DFI** | `SECRETARIA` / `SECRETARIA_DFI` | **Sí (Principal)** | **Total** (Crear, Editar, Eliminar) | Sí | Sí | Sí | No |
| **Jefe de Presupuesto** | `JEFE_PRESUPUESTO` | No | Solo Lectura | **Sí (Autorizado)** | Sí (Presupuesto) | Sí | No |
| **Analista de Presupuesto** | `ANALISTA_PRESUPUESTO` | No | Solo Lectura | **Sí (Autorizado)** | Sí (Presupuesto) | Sí | No |
| **Jefe de Contabilidad** | `JEFE_CONTABILIDAD` | No | Solo Lectura | No (Solo Lectura) | Sí (Contabilidad) | Sí | No |
| **Analista de Contabilidad** | `ANALISTA_CONTABILIDAD` | No | Solo Lectura | No (Solo Lectura) | Sí (Contabilidad) | Sí | No |
| **Tesorero / Caja** | `TESORERO` / `ANALISTA_TESORERIA` | No | Solo Lectura | No (Solo Lectura) | Sí (Tesorería / SPI) | Sí | No |
| **Responsable de Archivo** | `RESPONSABLE_ARCHIVO` | No | Solo Lectura | No (Solo Lectura) | Sí (Tomo / Estantería) | Sí | No |

### Reglas Esenciales de Permisos:
1. **DFI y Administrador**: Son los únicos autorizados a radicar expedientes en ventanilla física, crear nuevos trámites, despachar lotes iniciales y eliminar/anular expedientes.
2. **Presupuesto (Jefe y Analistas)**: **No pueden crear ni eliminar trámites**. Sin embargo, tienen **permiso especial de edición sobre la tarjeta de Datos Generales del Trámite**, permitiéndoles rectificar o complementar la información registrada por ventanilla DFI directamente desde la ficha del trámite.
3. **Contabilidad, Caja y Archivo**: Tienen solo lectura sobre los datos generales y solo pueden editar y aprobar los campos que corresponden estrictamente a su sección.

---

## 2. ESTRUCTURA DE NAVEGACIÓN GLOBAL (BARRA LATERAL / SIDEBAR)

La barra lateral (`Sidebar.tsx`) se muestra en un tema institucional azul marino (`slate-900`) con los siguientes elementos:

### Encabezado del Usuario en Sesión:
- **Área Institucional:** Icono de edificio (`Building2`), texto del área en mayúsculas (ej: `DIRECCIÓN FINANCIERA - PRESUPUESTO`).
- **Nombre Completo:** Nombre del funcionario autenticado (ej: `ECON. ANA BELÉN GÓMEZ`).
- **Insignia de Cargo (Badge):** Cargo en azul marino con borde (ej: `ANALISTA DE PRESUPUESTO`).

### Menú de Opciones:
1. **Mi Escritorio** (`/escritorio`)
   - *Icono:* Bandeja de entrada (`Inbox`).
   - *Subtexto:* "Trámites en mi gestión".
   - *Badge:* "Prioridad".
   - *Visibilidad:* Todos los roles.
2. **Recepción DFI** (`/recepcion`)
   - *Icono:* Nuevo expediente (`FilePlus2`).
   - *Subtexto:* "Ingreso de expedientes físicos".
   - *Visibilidad:* Exclusivo para DFI (`DIRECTORA`, `SECRETARIA`) y `ADMIN`.
3. **Trámites** (`/tramites`)
   - *Icono:* Documento (`FileText`).
   - *Subtexto:* "Catálogo institucional completo".
   - *Visibilidad:* Todos los roles.
4. **Indicadores SLA** (`/indicadores`)
   - *Icono:* Gráfico de barras (`BarChart3`).
   - *Subtexto:* "Tiempos de pago (6 días)".
   - *Visibilidad:* Todos los roles.
5. **Reportería** (`/reportes`)
   - *Icono:* Hoja de cálculo (`FileSpreadsheet`).
   - *Subtexto:* "Ingresos, custodia y tardanza".
   - *Visibilidad:* Todos los roles.
6. **Administración** (`/administracion`)
   - *Icono:* Escudo de seguridad (`ShieldCheck`).
   - *Subtexto:* "Campos, feriados y roles".
   - *Visibilidad:* Exclusivo para `ADMIN`.
7. **Cerrar Sesión**
   - *Icono:* Salir (`LogOut`).
   - *Acción:* Limpia la sesión en servidor y redirige a `/login`.

---

## 3. DETALLE EXACTO DE CADA VISTA

---

### VISTA 1: INICIO DE SESIÓN INSTITUCIONAL (`/login`)

#### Propósito:
Autenticación formal de funcionarios con control 2FA institucional y selección rápida de perfiles de prueba para validación de flujos.

#### Contenido Visible:
- **Logo Institucional y Título:**
  - `SERVICIO NACIONAL DE ADUANA DEL ECUADOR - SENAE`
  - `Sistema Integrado de Control Previo al Pago y Gestión de Expedientes`
- **Formulario de Autenticación:**
  - Campo *Correo Institucional / Usuario*: `usuario@aduana.gob.ec`
  - Campo *Contraseña Institucional*
  - Control de Captcha / Verificación Matemática (Seguridad 2FA)
  - Botón: **«Iniciar Sesión Segura»**
- **Panel Inferior de Cambio Rápido de Rol (Entorno de Pruebas):**
  - Botones con los perfiles preconfigurados para alternar sesión con un solo clic:
    - *Directora Financiera* (DFI)
    - *Secretaria DFI* (Ventanilla Recepción)
    - *Jefe de Presupuesto*
    - *Analista de Presupuesto*
    - *Jefe de Contabilidad*
    - *Analista de Contabilidad*
    - *Tesorera / Caja*
    - *Responsable de Archivo*
    - *Administrador General*

---

### VISTA 2: MI ESCRITORIO (`/escritorio`)

#### Propósito:
Bandeja de trabajo personal del funcionario. Muestra **estrictamente los expedientes que se encuentran actualmente bajo la custodia física del usuario conectado o de su área**, eliminando filtros o datos de otras áreas.

#### Encabezado de la Vista:
- Título: **«Mi Escritorio de Gestión»**
- Subtítulo: *"Expedientes físicos bajo su custodia directa y responsabilidad institucional."*
- Botón: **«Actualizar»** (recarga los trámites de la bandeja).

#### Pestañas / Filtros Oficiales:
1. **«En Mi Gestión»** (Visible para todos los roles):
   - Muestra todos los trámites activos que el usuario o su área tienen asignados para procesar.
2. **«Por Entregar (Ingresados)»** (Visible **únicamente para DFI y Admin**):
   - Muestra los trámites en estado `INGRESADO` en custodia de DFI, permitiendo a la secretaría seleccionar expedientes en casillas de verificación (checkboxes) y presionar el botón **«Despachar Lote a Presupuesto»** con generación automática del Acta de Entrega-Recepción en Excel.
   - *Nota:* Ningún rol de Presupuesto, Contabilidad o Caja ve esta pestaña.
3. **«Observados»** (Visible para todos los roles):
   - Muestra los expedientes en custodia del usuario que se encuentran con novedad activa o en espera de respuesta externa (plazo de 72 horas a Administradores de Contrato).

#### Tabla de Expedientes en Mi Escritorio:
- **Columnas:**
  - `N° Trámite / Quipux`: Código institucional en azul (ej: `SENAE-CP-2026-00201`) y número Quipux oficial debajo.
  - `Tipo de Proceso`: Nombre legible de la tipología de compra (ej: *Servicios Básicos*).
  - `Proveedor / Asunto`: Razón social del proveedor y descripción sintética del objeto de contratación.
  - `Monto Total`: Valor formateado en dólares (ej: `$ 12,450.00`).
  - `Días Hábiles (SLA)`: Días transcurridos con semáforo:
    - **Verde**: Menor a 5 días hábiles.
    - **Ámbar**: 5 a 6 días hábiles (En Riesgo).
    - **Rojo**: Mayor a 6 días hábiles (Vencido).
    - Etiqueta adicional de *(Pausado)* si está en espera de factura SRI.
  - `Estado`: Badge con el estado procesal (`INGRESADO`, `EN_PRESUPUESTO`, `CONTABILIDAD`, `EN_TESORERIA`, `OBSERVADO_72H`).
  - `Acciones`: Botón azul **«Gestionar»** (conduce a `/tramites/[id]`).

---

### VISTA 3: RECEPCIÓN DFI (`/recepcion`)

#### Propósito:
Formulario oficial de radicación de expedientes físicos que ingresan por ventanilla de la Dirección Financiera. Solo accesible para DFI y Administradores.

#### Encabezado de la Vista:
- Título: **«Recepción Física de Trámites - DFI»**
- Subtítulo: *"Registro y radicación inicial de memorandos y expedientes físicos para control previo."*

#### Formulario y Secciones de Datos:

##### 1. Clasificación Jerárquica de la Gestión:
- **Categoría Padre (`padre_gestion`):** Selector de dos opciones:
  - `PAGO`: Trámites con afectación económica o presupuestaria.
  - `GARANTIA`: Gestiones de cauciones, garantías, litigios o devoluciones.
- **Tipo de Gestión (`tipo_gestion`):** Selector dependiente dinámico:
  - Si el padre es `PAGO`: Muestra `PAGO`, `EXPEDIENTE`, `JUSTIFICACION`.
  - Si el padre es `GARANTIA`: Muestra `Caución`, `Devolución de caución`, `Devolución de valores`, `Garantia`, `Juicio`, `Pago indebido`, `Proceso coactivo`, `Reparación Económica`, `Sentencia`.

##### 2. Datos del Memorando y Documento Radicado:
- `Número Quipux (*)`: Formato `SENAE-XXX-2026-XXXX-M`.
- `Fecha del Memorando (*)`: Fecha de emisión del documento en Quipux.
- `Fecha de Recepción Física (*)`: Fecha y hora exacta de recepción en ventanilla DFI (inicia el conteo normativo del SLA de 6 días).
- `Área Requirente (*)`: Dirección o coordinación solicitante (ej: *Dirección de Tecnologías*, *Distrito Guayaquil*).
- `Número de Fojas Físicas`: Cantidad de hojas foliadas del expediente físico.

##### 3. Objeto de la Contratación y Clasificación:
- `Tipo de Proceso (*)`: Selector con nombres amigables (ej: *Subasta Inversa Electrónica*, *Ínfima Cuantía*, *Servicios Básicos*, *Menor Cuantía*).
- `Asunto / Descripción (*)`: Detalle conciso del servicio o bien adquirido.

##### 4. Información Económica del Beneficiario:
- `Razón Social / Beneficiario (*)`: Nombre del contratista o proveedor.
- `RUC / Cédula (*)`: Identificación tributaria (13 o 10 dígitos).
- `Monto Total Solicitado (*)`: Valor total a pagar en dólares americanos.

##### 5. Botones de Acción al Final del Formulario:
- **«Cancelar»**: Limpia el formulario y retorna a Mi Escritorio.
- **«Radicar Trámite e Ingresar Expediente»**: Valida campos obligatorios, genera el código único `SENAE-CP-2026-XXXXX`, registra el primer movimiento en la bitácora inmutable y redirige a la ficha del expediente.

---

### VISTA 4: CATÁLOGO INSTITUCIONAL DE TRÁMITES (`/tramites`)

#### Propósito:
Vista panorámica de consulta de **todos los trámites de la institución** (activos, en trámite, observados, pagados y archivados).

#### Barra de Herramientas Superior:
- Título: **«Catálogo General de Trámites»**
- Subtítulo: *"Registro integral de expedientes radicados en la Dirección Financiera."*
- Botones a la derecha:
  - **«Exportar Catálogo Excel»**: Descarga el archivo `.xlsx` de todos los trámites filtrados.
  - **«Nuevo Trámite»** (Icono `+`): **Solo visible para DFI y Administrador**. Los roles de Presupuesto, Contabilidad, Caja y Archivo no ven este botón.

#### Filtros de Búsqueda:
- **Buscador de Texto:** Entrada abierta para filtrar por número de trámite, Quipux, proveedor o asunto.
- **Filtro por Área Actual:** Todas las áreas, DFI, Presupuesto, Contabilidad, Tesorería, Archivo.
- **Filtro por Estado General:** Todos, Ingresado, En Presupuesto, En Contabilidad, En Tesorería, Pagado, Observado, Archivado.

#### Tabla General de Trámites:
- **Columnas:**
  - `N° Trámite`: Código oficial con enlace a la ficha.
  - `N° Quipux`: Número del memorando.
  - `Tipo de Proceso`: Tipología de compra.
  - `Proveedor / Beneficiario`: Razón social.
  - `Fecha Ingreso`: Fecha de radicación DFI.
  - `Custodio Actual`: Nombre y cargo del funcionario que tiene el expediente en sus manos.
  - `Área`: Ubicación física actual.
  - `SLA (Días)`: Contador de días hábiles efectivos con badge de semáforo.
  - `Estado`: Estado actual del expediente.
  - **`Acciones`**:
    - **Para DFI y Administrador:** Muestra la columna con el icono de tacho de basura (`Trash2`) para anular/eliminar trámites no autorizados o duplicados.
    - **Para el resto de roles (Presupuesto, Contabilidad, Caja, Archivo):** **La columna de Acciones no se renderiza** (está completamente ausente, no vacía).

---

### VISTA 5: FICHA DEL EXPEDIENTE (`/tramites/[id]`)

Esta es la vista central de gestión operativa donde se procesa el control previo etapa por etapa.

#### A. Encabezado Limpio del Expediente:
- **Identificación:**
  - Código único del trámite en grande y negrita (ej: `SENAE-CP-2026-00201`).
  - Número Quipux oficial (`SENAE-DAF-2026-0145-M`).
  - *Nota:* Se eliminaron los campos de "Beneficiario" y "Neto a Pagar" de esta franja superior para evitar redundancia y confusión visual.
- **Insignias de Estado:**
  - Badge de Estado Actual (ej: `EN_PRESUPUESTO`, `OBSERVADO_72H`, `PAGADO`).
  - Badge Semáforo de SLA (ej: `Día 3 de 6 - En Plazo` en verde, o `Día 7 de 6 - Plazo Vencido` en rojo).
  - Badge de `Pausado por Factura` si el cómputo de días está congelado.

#### B. Barra de Acciones de Flujo (`BarraAcciones.tsx`):
- Se eliminó el bloque izquierdo redundante (*"Acciones Autorizadas: [Cargo] ESTADO: [Estado]"*).
- Los botones de acción aparecen alineados a la derecha según el rol del usuario conectado y la etapa del expediente:
  - **Derivar / Entregar a Siguiente Área:** Despacho con registro de custodio receptor.
  - **Devolver a Área Anterior:** Retorno del expediente físico por inconsistencias internas.
  - **Observar Expediente (72 Horas):** Notificación formal de subsanación a Administradores de Contrato.
  - **Pausar por Factura SRI / Reanudar Trámite:** Congelamiento normativo del SLA hasta la emisión de la factura.
  - **Aprobar Etapa:** Confirmación formal de Presupuesto, Contabilidad o Pago.

#### C. Tarjeta 1: Datos Generales del Trámite (`TarjetaDatosGenerales.tsx`):
- **Botón «Editar Datos»:**
  - **Visible y habilitado para:**
    - Administrador
    - Directora Financiera y Secretaria DFI
    - **Jefe de Presupuesto y Analistas de Presupuesto (Permiso Especial)**
  - **Resto de roles (Contabilidad, Caja, Archivo):** Solo lectura (no ven el botón de edición).
- **Contenido:**
  - `Tipo de Gestión`: Padre y tipo dependiente (ej: `PAGO - PAGO`).
  - `Tipo de Proceso`: Tipología de contratación.
  - `Área Requirente`: Dirección solicitante.
  - `Fecha Recepción Física`: Fecha y hora de radicación.
  - `Proveedor / Beneficiario`: Razón social y RUC.
  - `Monto Solicitado`: Total en dólares.
  - `Asunto`: Detalle de la contratación.
  - `Fojas Físicas`: Número de fojas foliadas.
  - *Nota:* Se eliminó el recuadro amarillo de `ALTA CUANTÍA`.

#### D. Tarjeta 2: Departamento de Presupuesto (`TarjetaPresupuesto.tsx`):
- **Permisos de Edición:** Exclusivo para Jefatura y Analistas de Presupuesto (y Administrador).
- **Campos:**
  - `Certificación Presupuestaria`: Número de certificación de fondos.
  - `Ítem / Partida Presupuestaria`: Código contable de la partida.
  - `CUR de Compromiso`: Número de Comprobante Único de Registro en eSIGEF.
  - `Fecha de Aprobación Presupuestaria`: Timestamp de la validación.
  - `Analista Responsable`: Nombre del revisor presupuestario.
  - Botón: **«Validar y Comprometer Fondos»**.

#### E. Tarjeta 3: Departamento de Contabilidad (`TarjetaContabilidad.tsx`):
- **Permisos de Edición:** Exclusivo para Jefatura y Analistas de Contabilidad (y Administrador).
- **Campos:**
  - `Subtotal`: Base imponible.
  - `Monto IVA`: Impuesto al valor agregado.
  - `Monto Retenciones`: Retenciones de IVA y Renta calculadas.
  - `Monto Multas`: Descuentos por penalizaciones o retrasos contractuales.
  - `Valor Líquido a Pagar`: Cálculo matemático automático.
  - `Número de Factura Electrónica`: Clave de 15 dígitos o 49 dígitos del comprobante SRI.
  - `CUR de Devengado`: Número de registro eSIGEF del devengado.
  - `CUR Contable`: Asiento de diario contable.
  - Botón: **«Aprobar Control Previo y Registrar Devengado»**.

#### F. Tarjeta 4: Administración de Caja y Pagos (`TarjetaTesoreria.tsx`):
- **Permisos de Edición:** Exclusivo para Tesorero / Caja (y Administrador).
- **Campos Actuales (Estructura Simplificada):**
  1. **`Referencia SPI Banco Central`** (**OPCIONAL**): Código de transferencia SPI/BCE.
  2. **`Fecha Autorización de Pago`**: Fecha en que la dirección autoriza el desembolso.
  3. **`Fecha Pago Efectivo`**: Fecha en que se materializa la acreditación en la cuenta del contratista.
  - *Nota:* Se eliminaron los campos `Lote eSIGEF / MEF:` y `Comprobante de Pago:`.
  - Botón: **«Registrar Pago Efectivo»** (marca el trámite como `PAGADO`).

#### G. Tarjeta 5: Archivo Contable Definitivo (`TarjetaArchivo.tsx`):
- **Permisos de Edición:** Responsable de Archivo (y Administrador).
- **Campos:**
  - `Código de Tomo de Caja`: Identificador de la carpeta o empastado.
  - `Estantería / Ubicación Física`: Módulo, nivel y balda física.
  - Botón: **«Archivar Expediente Definitivamente»**.

#### H. Bitácora Inmutable de Movimientos (`HistorialMovimientos.tsx`):
- Tabla cronológica completa que registra cada transferencia física:
  - *Fecha y Hora*: Timestamp con precisión al segundo.
  - *Funcionario que Entrega*: Nombre y área de origen.
  - *Funcionario que Recibe*: Nombre y área de destino.
  - *Acción Operativa*: Despacho, derivación, observación, pausa, pago, archivo.
  - *Observaciones / Nota*: Justificación del movimiento.

---

### VISTA 6: INDICADORES INSTITUCIONALES SLA (`/indicadores`)

#### Propósito:
Monitoreo ejecutivo en tiempo real del cumplimiento de la norma institucional de **6 días hábiles de pago**.

#### Contenido Visible:
- **Tarjetas Resumen:**
  - *Total en Proceso:* Conteo de expedientes activos.
  - *En Plazo (Menor a 5 días):* Porcentaje y conteo en verde.
  - *En Riesgo Crítico (5 a 6 días):* Trámites que requieren atención inmediata.
  - *Plazo Vencido (Mayor a 6 días):* Trámites con retraso normativo.
  - *Pausados por Factura:* Trámites con cronómetro detenido legalmente.
- **Gráficos de Semáforo Institucional:**
  - Distribución porcentual del volumen de trámites según su color de alerta.
  - Lista de expedientes con mayor riesgo de vencimiento para priorización en escritorio.

---

### VISTA 7: CENTRO DE REPORTERÍA INSTITUCIONAL (`/reportes`)

#### Propósito:
Módulo de auditoría cuantitativa que responde:
1. *¿Cuántos trámites ingresaron en un periodo y quién los tiene físicamente?*
2. *¿Dónde y por qué se demoran los trámites? (Diagnóstico de cuellos de botella).*

#### Barra Superior de la Vista:
- Título: **«Módulo de Reportería Institucional»**
- Subtítulo: *"Ingresos y custodia actual de expedientes físicos, y análisis estadístico de cuellos de botella y tardanza."*
- Botones:
  - **«Descargar Excel Oficial»**: Exporta el libro `.xlsx` con hojas formateadas con estilos SENAE.
  - **«Actualizar»**: Refresca los cálculos.

#### Barra de Filtros de Fecha:
- Selector de `Rango de Ingreso`: Fecha Desde y Fecha Hasta.
- Botones de acceso rápido: `15 días`, `30 días`, `90 días`, `Año 2026`.

#### PESTAÑA 1: «1. Ingresos y Custodia Actual»:
1. **Tarjetas KPI:**
   - *Total Ingresados*: Conteo de trámites radicados en el periodo.
   - *En Gestión Activa*: Trámites fluyendo en áreas operativas.
   - *Pagados Efectivos*: Ciclo cerrado con éxito.
   - *Pausados / Observados*: Trámites con retención temporal.
2. **Tabla: Custodia Actual por Funcionario Responsable (¿Quién los tiene?):**
   - *Columnas:*
     - Funcionario Custodio (Nombre y Cargo).
     - Área / Departamento.
     - Trámites a Cargo (conteo numérico).
     - Estado SLA (desglose de cuántos tiene en OK, en Riesgo y en Vencido).
3. **Tarjeta: Carga por Área Institucional:**
   - Barras de progreso porcentuales por área (DFI, Presupuesto, Contabilidad, Tesorería, Archivo).
   - Conteo por estados actuales.
4. **Listado Detallado de Trámites Ingresados:**
   - Buscador rápido por texto.
   - Tabla con N° Trámite, Quipux, Tipo de Proceso, Proveedor, Fecha Ingreso, Custodio Actual, Área, Días Hábiles Netos (con alerta semafórica), Estado y enlace a la ficha.

#### PESTAÑA 2: «2. Tardanza y Cuellos de Botella»:
1. **Banner Normativo:** Explicación del cálculo a partir de la bitácora inmutable de movimientos sobre la base de 6 días hábiles.
2. **Sección 1: ¿Dónde se demora más? (Comparativo por Fases):**
   - Tarjetas analíticas de las 4 fases:
     - *Recepción DFI*: 0.5 días prom. (Ágil).
     - *Compromiso Presupuestario*: 1.5 días prom. (Moderado).
     - *Control Previo y Devengado Contable*: Mayor carga / Cuello de Botella detectado (más del 40% del tiempo de ciclo).
     - *Autorización y Pago SPI/BCE*: 1.0 días prom. (Dispersión final).
3. **Sección 2: ¿Por qué se demora? (Ranking de Causas de Retraso):**
   - Tarjetas con impacto de cada motivo:
     - *Espera de Factura SRI del Proveedor (Pausa de SLA)* (Causa Externa).
     - *Subsanación de Novedades (Observaciones 72 Horas)* (Causa Interna Administrador).
     - *Complejidad en Retenciones y Asientos Contables* (Causa Interna Contabilidad).
     - *Validación de Fondos y Partidas Presupuestarias* (Causa Interna Presupuesto).
   - Muestra número de trámites afectados, porcentaje del total e impacto promedio en días agregados.
4. **Sección 3: Matriz de Tardanza y SLA por Tipo de Proceso:**
   - Tabla comparativa por tipo de compra (Subasta Inversa, Ínfima Cuantía, Servicios Básicos, etc.):
     - Total de trámites.
     - Promedio de días hábiles.
     - % de cumplimiento de SLA (≤ 6 días).
     - Promedio de días en DFI, Presupuesto, Pausa Factura, Contabilidad y Caja.
     - **Fase con Mayor Demora (Cuello de Botella identificado para esa compra)**.

---

### VISTA 8: MÓDULO DE ADMINISTRACIÓN DEL SISTEMA (`/administracion`)

#### Propósito:
Configuración global del sistema. Solo accesible para el rol `ADMIN`.

#### Pestañas Administrativas:
1. **Catálogos Institucionales:**
   - Gestión de Áreas y Departamentos.
   - Tipos de Gestión y Tipos de Trámite.
2. **Reglas de Campos por Etapa:**
   - Configuración de visibilidad (Visible / Oculto) y obligatoriedad (Obligatorio / Opcional) para cada campo según la etapa procesal.
3. **Calendario de Feriados Institucionales:**
   - Registro y activación de días feriados y asuetos nacionales o locales para excluirlos del cómputo normativo de días hábiles del SLA.
4. **Usuarios y Asignación de Roles:**
   - Creación y edición de cuentas de funcionarios, correo institucional, cargo, área y rol asignado.

---

## 4. RESUMEN DE CAMBIOS Y MEJORAS RECIENTES

1. **Datos Generales en Ficha de Expediente:**
   - Se eliminó el texto y recuadro de `ALTA CUANTÍA`.
   - Se habilitó la edición completa de Datos Generales para el **Jefe y Analistas de Presupuesto**.
2. **Encabezado del Trámite:**
   - Se eliminaron los campos de Beneficiario y Neto a Pagar de la franja superior, dejando únicamente el Código y el Quipux.
3. **Barra de Acciones Superior:**
   - Se eliminó el bloque izquierdo redundantemente titulado *"Acciones Autorizadas: [Cargo] ESTADO: [Estado]"*.
4. **Administración de Caja:**
   - Se eliminaron los campos de `Lote eSIGEF / MEF:` y `Comprobante de Pago:`.
   - Quedó configurada con únicamente 3 datos: `Referencia SPI Banco Central` (**Opcional**), `Fecha Autorización de Pago` y `Fecha Pago Efectivo`.
5. **Catálogo de Trámites:**
   - La columna de Acciones (con el icono de eliminar) está presente **únicamente para DFI y Administrador**; para los demás roles no se renderiza.
6. **Mi Escritorio:**
   - Se eliminaron las pestañas globales (*En Presupuesto*, *Pausados SLA*, *Archivados*).
   - Quedaron únicamente las pestañas acordes al rol: *En Mi Gestión*, *Por Entregar (Ingresados)* (solo DFI) y *Observados*.
7. **Reportería Oficial:**
   - Se implementó la nueva sección `/reportes` con los reportes de *Ingresos y Custodia* y *Tardanza y Cuellos de Botella* con exportación a Excel multioja.
