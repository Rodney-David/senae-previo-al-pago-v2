# SERVICIO NACIONAL DE ADUANA DEL ECUADOR (SENAE)
## DIRECCIÓN FINANCIERA · CONTROL PREVIO AL PAGO v2.0
### MANUAL DE INSTALACIÓN Y CONFIGURACIÓN DE LA SOLUCIÓN

---

### 1. INFORMACIÓN GENERAL DEL SISTEMA

| Parámetro | Detalle |
| :--- | :--- |
| **Nombre del Sistema** | Sistema de Control Financiero Previo al Pago (SENAE-CFPP) |
| **Versión** | 2.0.0 (Producción / Rocky Linux 9) |
| **Arquitectura de Software** | Next.js 14 (App Router / Node.js 20 LTS Standalone) + Prisma ORM + PostgreSQL 16 |
| **Servidor Web / Proxy** | Nginx 1.24+ con terminación TLS y compresión gzip |
| **Gestión de Procesos** | systemd (Nativo) / Docker Engine & Docker Compose |
| **Seguridad de Red** | SELinux (Enforcing / Targeted) y firewalld habilitado |

---

### 2. REQUISITOS PREVIOS DE INFRAESTRUCTURA

#### 2.1. Especificaciones Mínimas de Servidor
* **Sistema Operativo:** Rocky Linux 9 (x86_64) con kernel Linux 5.14+.
* **Procesador:** 2 vCPU o superior.
* **Memoria RAM:** 4 GB de memoria física (2 GB asignados a PostgreSQL, 2 GB a Node.js).
* **Almacenamiento:** 40 GB de espacio libre en disco SSD / NVMe en partición `/opt` y `/var/lib/pgsql`.
* **Conectividad:** 1 interfaz Ethernet Gigabit (VLAN de Servidores / DMZ Institucional).

#### 2.2. Puertos de Red Requeridos
* **Puerto 80/TCP:** Tráfico HTTP institucional (redirigido a HTTPS).
* **Puerto 443/TCP:** Tráfico HTTPS seguro con certificado institucional SENAE.
* **Puerto 22/TCP:** Administración remota mediante SSH (restringido a IPs autorizadas de TICs).
* **Puerto 5432/TCP:** PostgreSQL 16 (únicamente enlace local `127.0.0.1` o red de contenedores).
* **Puerto 3000/TCP:** Servidor de aplicación Next.js Standalone (enlace local `127.0.0.1:3000`).

---

### 3. PROCEDIMIENTO DE INSTALACIÓN Y DESPLIEGUE

Existen dos modalidades oficiales para el despliegue en la infraestructura de SENAE:

#### MODALIDAD A: DESPLIEGUE CON CONTENEDORES (DOCKER / PODMAN) [RECOMENDADA]

Esta modalidad aísla las dependencias, garantiza idempotencia y permite levantar el sistema en menos de 3 minutos.

1. **Instalar Docker y Docker Compose en Rocky Linux 9:**
   ```bash
   sudo dnf install -y yum-utils
   sudo dnf config-manager --add-repo https://download.docker.com/linux/centos/docker-ce.repo
   sudo dnf install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin
   sudo systemctl enable --now docker
   ```

2. **Abrir puertos institucionales en el cortafuegos:**
   ```bash
   sudo firewall-cmd --permanent --add-service=http
   sudo firewall-cmd --permanent --add-service=https
   sudo firewall-cmd --reload
   ```

3. **Copiar y configurar variables de entorno:**
   ```bash
   cd /opt/senae-control-previo
   cp .env.production.example .env.production
   nano .env.production
   ```
   *Verificar que `AUTH_SECRET`, `POSTGRES_PASSWORD` y `DATABASE_URL` contengan contraseñas seguras.*

4. **Construir y levantar los servicios:**
   ```bash
   sudo docker compose --env-file .env.production up -d --build
   ```

5. **Aplicar migraciones y catálogo normativo oficial (Checklist):**
   ```bash
   sudo docker compose exec app npx prisma db push --schema=prisma/schema.postgresql.prisma
   sudo docker compose exec app npx ts-node scripts/seed-checklists.ts
   ```

---

#### MODALIDAD B: INSTALACIÓN NATIVA DIRECTA EN ROCKY LINUX 9

Si la política de TICs exige instalación en el sistema operativo anfitrión:

1. **Ejecutar el instalador automatizado incluido:**
   ```bash
   cd /opt/senae-control-previo
   sudo chmod +x deploy/rocky/install-native-rocky9.sh
   sudo bash deploy/rocky/install-native-rocky9.sh
   ```

   *El script realiza automáticamente:*
   - Registro de repositorios oficiales PGDG para PostgreSQL 16 y NodeSource para Node.js 20.
   - Creación de base de datos `senae_control_previo` y usuario `senae_app`.
   - Compilación standalone de Next.js (`npm run build`).
   - Configuración del servicio de arranque automático `/etc/systemd/system/senae-control-previo.service`.
   - Configuración de Nginx como proxy inverso en `/etc/nginx/conf.d/senae.conf`.
   - Ajuste de políticas de SELinux (`httpd_can_network_connect 1`) y apertura en `firewalld`.

2. **Verificar el estado del servicio:**
   ```bash
   sudo systemctl status senae-control-previo
   sudo systemctl status nginx
   sudo systemctl status postgresql-16
   ```

---

### 4. VARIABLES DE ENTORNO DEL SISTEMA

| Variable | Descripción | Valor Recomendado en Producción |
| :--- | :--- | :--- |
| `NODE_ENV` | Entorno de ejecución | `production` |
| `PORT` | Puerto de escucha interno | `3000` |
| `DATABASE_URL` | Cadena de conexión JDBC/Prisma a PostgreSQL | `postgresql://senae_app:PASSWORD@127.0.0.1:5432/senae_control_previo?schema=public` |
| `AUTH_SECRET` | Clave simétrica para firma HMAC de sesiones y Captchas | Cadena criptográfica aleatoria de 64 caracteres hex |
| `NEXT_PUBLIC_APP_NAME` | Nombre institucional en cabecera | `SENAE · Control Financiero Previo al Pago` |

---

### 5. MONITOREO Y VERIFICACIÓN POST-INSTALACIÓN

Para validar el correcto funcionamiento desde la red institucional:
1. Desde un equipo en la red física, abrir un navegador web: `http://<IP_SERVIDOR_ROCKY>`.
2. Verificar redirección automática al Login Institucional seguro (`/login`).
3. Verificar generación correcta de la imagen Captcha SVG.
4. Inspeccionar los logs del sistema en tiempo real:
   ```bash
   sudo journalctl -u senae-control-previo -f
   ```
