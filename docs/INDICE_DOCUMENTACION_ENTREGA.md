# SERVICIO NACIONAL DE ADUANA DEL ECUADOR (SENAE)
## DIRECCIÓN FINANCIERA · CONTROL PREVIO AL PAGO v2.0
### PAQUETE TÉCNICO Y DOCUMENTACIÓN OFICIAL DE ENTREGA

---

Este paquete consolida la entrega formal del **Sistema de Control Financiero Previo al Pago (v2.0)** para su despliegue y puesta en marcha en la infraestructura institucional de SENAE (Rocky Linux 9 y PostgreSQL 16).

### ÍNDICE DE DOCUMENTOS ENTREGABLES

| Nro. | Documento Oficial | Descripción y Destinatarios | Archivo |
| :---: | :--- | :--- | :--- |
| **01** | **Manual de Instalación y Configuración** | Procedimiento de despliegue nativo y en contenedores Docker/Podman, variables de entorno, Nginx, systemd, SELinux y firewalld. *(Dirigido a TICs / Infraestructura)* | [`docs/01_MANUAL_INSTALACION_Y_CONFIGURACION.md`](file:///C:/Users/PC/Documents/RODNEY%20SENAE/senae-previo-al-pago-v2/docs/01_MANUAL_INSTALACION_Y_CONFIGURACION.md) |
| **02** | **Diccionario de Datos y Esquema BD** | Diagrama Entidad-Relación (ERD), catálogo detallado de tablas, columnas, tipos de datos, restricciones y reglas de integridad en PostgreSQL 16. *(Dirigido a TICs / Base de Datos)* | [`docs/02_DICCIONARIO_DE_DATOS_Y_ESQUEMA_BD.md`](file:///C:/Users/PC/Documents/RODNEY%20SENAE/senae-previo-al-pago-v2/docs/02_DICCIONARIO_DE_DATOS_Y_ESQUEMA_BD.md) |
| **03** | **Esquema de Roles y Permisos (RBAC)** | Mapeo organizacional de los 10 perfiles institucionales, matriz de permisos operativos por departamento y reglas de seguridad. *(Dirigido a Dirección Financiera y TICs)* | [`docs/03_ESQUEMA_DE_ROLES_Y_PERMISOS.md`](file:///C:/Users/PC/Documents/RODNEY%20SENAE/senae-previo-al-pago-v2/docs/03_ESQUEMA_DE_ROLES_Y_PERMISOS.md) |
| **04** | **Acta de Entrega de Credenciales** | Credenciales de superusuario PostgreSQL, usuario de aplicación, cuentas administrativas y protocolo de Doble Factor (2FA). *(Confidencial / Administradores)* | [`docs/04_ENTREGA_CREDENCIALES_ADMINISTRADOR.md`](file:///C:/Users/PC/Documents/RODNEY%20SENAE/senae-previo-al-pago-v2/docs/04_ENTREGA_CREDENCIALES_ADMINISTRADOR.md) |
| **05** | **Manual de Respaldo y Recuperación** | Políticas de copias de seguridad diarias con `pg_dump`, verificación SHA-256, rotación de 30 días y recuperación ante desastres. *(Dirigido a TICs / Operaciones)* | [`docs/05_MANUAL_RESPALDO_Y_RECUPERACION.md`](file:///C:/Users/PC/Documents/RODNEY%20SENAE/senae-previo-al-pago-v2/docs/05_MANUAL_RESPALDO_Y_RECUPERACION.md) |
| **06** | **Manual de Usuario de la Aplicación** | Guía operativa para funcionarios de Ventanilla, Presupuesto, Contabilidad, Dirección, Tesorería y Archivo. Flujos paso a paso y exportación Excel. *(Dirigido a Usuarios Finales)* | [`docs/06_MANUAL_DE_USUARIO.md`](file:///C:/Users/PC/Documents/RODNEY%20SENAE/senae-previo-al-pago-v2/docs/06_MANUAL_DE_USUARIO.md) |

---

### SCRIPTS Y RECURSOS DE INFRAESTRUCTURA INCLUIDOS

* [**`deploy/rocky/install-native-rocky9.sh`**](file:///C:/Users/PC/Documents/RODNEY%20SENAE/senae-previo-al-pago-v2/deploy/rocky/install-native-rocky9.sh): Script de aprovisionamiento desatendido en Rocky Linux 9.
* [**`deploy/rocky/backup-postgres.sh`**](file:///C:/Users/PC/Documents/RODNEY%20SENAE/senae-previo-al-pago-v2/deploy/rocky/backup-postgres.sh): Script de respaldo automatizado diario con hash SHA-256.
* [**`deploy/rocky/restore-postgres.sh`**](file:///C:/Users/PC/Documents/RODNEY%20SENAE/senae-previo-al-pago-v2/deploy/rocky/restore-postgres.sh): Script de restauración íntegra de base de datos.
* [**`compose.yaml`**](file:///C:/Users/PC/Documents/RODNEY%20SENAE/senae-previo-al-pago-v2/compose.yaml) y [**`Dockerfile`**](file:///C:/Users/PC/Documents/RODNEY%20SENAE/senae-previo-al-pago-v2/Dockerfile): Manifiesto para despliegue en contenedores Docker/Podman.
* [**`scripts/switch-db.js`**](file:///C:/Users/PC/Documents/RODNEY%20SENAE/senae-previo-al-pago-v2/scripts/switch-db.js): Conmutador de esquemas entre PostgreSQL y MySQL.
* [**`scripts/seed-checklists.ts`**](file:///C:/Users/PC/Documents/RODNEY%20SENAE/senae-previo-al-pago-v2/scripts/seed-checklists.ts): Sembrador de los 137 requisitos normativos oficiales del SENAE.
