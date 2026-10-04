# SERVICIO NACIONAL DE ADUANA DEL ECUADOR (SENAE)
## DIRECCIÓN FINANCIERA · CONTROL PREVIO AL PAGO v2.0
### MANUAL DE INSTALACIÓN, DESPLIEGUE Y MANTENIMIENTO EN ROCKY LINUX 9 & POSTGRESQL 16

---

### 1. Resumen de Arquitectura y Tecnologías de Producción

| Componente | Especificación Técnica | Responsabilidad Institucional |
| :--- | :--- | :--- |
| **Sistema Operativo** | **Rocky Linux 9 (x86_64) / EL 9** | Plataforma base corporativa (SELinux y firewalld habilitados) |
| **Motor de Base de Datos** | **PostgreSQL 16.x** | Persistencia transaccional, auditoría forense y control previo |
| **Plataforma de Aplicación** | **Node.js 20 LTS (Next.js 14 Standalone)** | Motor reactivo GovTech, lógica de negocio y APIs REST |
| **Servidor Web / Proxy** | **Nginx 1.24+** | Terminación TLS, compresión HTTP y proxy inverso |
| **Gestor de Procesos** | **systemd / Docker Compose** | Arranque automático, recuperación ante fallos y supervisión |
| **ORM / Migraciones** | **Prisma ORM 5.x** | Abstracción de tipos, migraciones estructuradas y seeding |

---

### 2. Preparación del Servidor Rocky Linux 9

#### Requisitos Mínimos Recomendados
* **Procesador:** 2 vCPU o superior.
* **Memoria RAM:** 4 GB de RAM (2 GB dedicados a PostgreSQL y 2 GB a la aplicación).
* **Almacenamiento:** 30 GB libres en almacenamiento SSD/NVMe.
* **Puertos de Red:** 80 (HTTP), 443 (HTTPS) para acceso de usuarios; 22 (SSH) para administración.

---

### 3. Modalidad A: Despliegue con Contenedores (Docker / Podman)

Esta es la modalidad más rápida, limpia e independiente para producción.

#### Paso 1: Instalar Docker y Docker Compose en Rocky Linux 9
```bash
# Agregar repositorio oficial de Docker CE para Rocky/RHEL
sudo dnf config-manager --add-repo https://download.docker.com/linux/centos/docker-ce.repo
sudo dnf install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin

# Iniciar y habilitar servicio
sudo systemctl enable --now docker

# Habilitar permisos de cortafuegos
sudo firewall-cmd --permanent --add-service=http
sudo firewall-cmd --permanent --add-service=https
sudo firewall-cmd --reload
```

#### Paso 2: Configurar Variables de Producción
Copie el archivo de ejemplo y defina contraseñas seguras:
```bash
cd /opt/senae-control-previo
cp .env.production.example .env.production
nano .env.production
```

#### Paso 3: Iniciar la Plataforma
```bash
# Construir imagen standalone y levantar base de datos PostgreSQL 16
docker compose up -d --build

# Verificar que ambos contenedores estén saludables (healthy)
docker compose ps
docker compose logs -f app
```

La aplicación quedará disponible en el puerto local `3000` con PostgreSQL 16 persistente en el volumen `senae_control_previo_data`.

---

### 4. Modalidad B: Despliegue Nativo (systemd + PostgreSQL 16 + Nginx)

Para servidores físicos o máquinas virtuales donde no se utilicen contenedores:

#### Paso 1: Ejecutar el Instalador Automatizado
Dentro del directorio del proyecto, ejecute como `root`:
```bash
cd /opt/senae-control-previo
chmod +x deploy/rocky/*.sh
sudo ./deploy/rocky/install-native-rocky9.sh
```

El script realiza automáticamente:
1. Actualización de repositorios e instalación de herramientas base.
2. Instalación oficial de **Node.js 20 LTS** y **PostgreSQL 16**.
3. Creación de la base de datos `senae_control_previo` y usuario `senae_admin`.
4. Creación del usuario de sistema `senae` con sandboxing de seguridad.
5. Sincronización del esquema Prisma para PostgreSQL y siembra de los 137 checklists y usuarios institucionales.
6. Compilación de Next.js en modo standalone.
7. Configuración de **Nginx** como proxy inverso en `/etc/nginx/conf.d/senae-control-previo.conf`.
8. Configuración de reglas de **Firewall (`firewalld`)** y permisos de **SELinux (`httpd_can_network_connect`)**.
9. Creación y activación del servicio **`senae-control-previo.service`** en systemd.

---

### 5. Comandos Operativos de Supervisión y Mantenimiento

#### Control del Servicio en Rocky Linux
```bash
# Ver estado del servicio
sudo systemctl status senae-control-previo

# Ver registros de auditoría en tiempo real
sudo journalctl -u senae-control-previo -f

# Reiniciar servicio
sudo systemctl restart senae-control-previo
```

#### Control de PostgreSQL 16
```bash
# Estado del motor de base de datos
sudo systemctl status postgresql-16

# Conectar a consola administrativa
sudo -u postgres psql -d senae_control_previo
```

---

### 6. Política de Respaldos y Recuperación ante Desastres

#### Respaldo Automatizado Diario (Crontab)
El script `deploy/rocky/backup-postgres.sh` genera un volcado binario comprimido con verificación de integridad `SHA256` y depuración automática de copias mayores a 30 días.

Para programarlo todos los días a las 02:00 AM:
```bash
sudo crontab -e
```
Agregar la siguiente línea:
```cron
0 2 * * * /opt/senae-control-previo/deploy/rocky/backup-postgres.sh >> /var/log/senae_backup.log 2>&1
```

#### Ejecución Manual de Respaldo
```bash
sudo /opt/senae-control-previo/deploy/rocky/backup-postgres.sh
```
Los archivos se almacenan en: `/var/backups/senae-control-previo/backup_senae_control_previo_YYYYMMDD_HHMMSS.dump`.

#### Restauración de una Copia Autorizada
```bash
sudo /opt/senae-control-previo/deploy/rocky/restore-postgres.sh /var/backups/senae-control-previo/backup_archivo.dump
```
El script verificará el checksum de seguridad `SHA256` y solicitará confirmación explícita antes de aplicar la restauración.

---

### 7. Verificación de Seguridad y Puntos de Control

* **SELinux Activo:** `getenforce` debe responder `Enforcing`. La directiva `setsebool -P httpd_can_network_connect 1` permite el proxy a Node.js sin desactivar la seguridad del kernel.
* **Firewall Oficial:** `firewall-cmd --list-all` debe mostrar únicamente los servicios `http`, `https` y `ssh`.
* **Login Doble Factor:** El acceso institucional en `/login` cuenta con desafío Captcha antispam y validación de código 2FA.
* **Checklist Oficial:** Cada expediente cuenta con su hoja de verificación interactiva y exportación formal a Excel (`.xlsx`).
