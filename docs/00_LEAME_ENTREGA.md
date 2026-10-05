# Entrega Técnica y Paquete de Despliegue · Control Previo al Pago SENAE v2.0

Este paquete contiene el código fuente de producción, configuraciones de entorno, scripts operativos para Rocky Linux 9 y la documentación técnica oficial en formato PDF y Markdown.

## Documentos Oficiales en PDF (Directorio `docs/pdf/` y `docs/`)

1. **`01_Manual_instalacion_configuracion.pdf`**: Despliegue en Rocky Linux 9 con Node.js 20, PostgreSQL 16, Nginx, systemd, Docker Compose, SELinux y firewalld.
2. **`02_Diccionario_datos_esquema.pdf`**: Diagrama Entidad-Relación (ERD), catálogo de tablas, tipos de datos, restricciones y reglas de negocio en PostgreSQL 16.
3. **`03_Roles_permisos_credenciales.pdf`**: Matriz de autorización para los 10 roles institucionales, segregación de funciones y seguridad de sesiones.
4. **`04_Entrega_credenciales_administrador.pdf`**: Acta de entrega de cuentas de base de datos, cuentas de usuarios y formato de custodia de contraseñas.
5. **`05_Manual_respaldo_recuperacion.pdf`**: Procedimiento operativo de respaldos diarios con `pg_dump`, verificación SHA-256 y restauración ante desastres.
6. **`06_Manual_usuario.pdf`**: **Manual de usuario con capturas de pantalla** paso a paso: Acceso con Captcha, Bandejas, Recepción física, Checklist normativo, Semáforos SLA, Indicadores y Administración.

## Modalidades de Instalación Admitidas

- **Contenedores:** Docker Engine 26+ y Docker Compose v2 (mediante `compose.yaml` y `.env.production`).
- **Instalación Nativa:** Rocky Linux 9 (x86_64) con script automatizado `deploy/rocky/install-native-rocky9.sh`.

## Seguridad del Paquete de Entrega

El paquete no incluye contraseñas activas en texto plano ni volcados de datos privados de producción. La cuenta de administrador y la base de datos se inicializan durante la instalación y sus contraseñas definitivas deben cambiarse en el primer inicio de sesión por un canal institucional seguro.
