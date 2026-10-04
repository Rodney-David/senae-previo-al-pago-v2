#!/usr/bin/env bash
# ========================================================
# SERVICIO NACIONAL DE ADUANA DEL ECUADOR - SENAE
# Instalador Automatizado de Producción en Rocky Linux 9
# Compatible con RHEL 9 / AlmaLinux 9 / CentOS Stream 9
# Arquitectura: Node.js 20 LTS + PostgreSQL 16 + Nginx + systemd
# ========================================================

set -euo pipefail

RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}========================================================${NC}"
echo -e "${BLUE}    INSTALACIÓN INSTITUCIONAL - SENAE CONTROL PREVIO v2.0${NC}"
echo -e "${BLUE}    Ambiente Oficial: Rocky Linux 9 / PostgreSQL 16       ${NC}"
echo -e "${BLUE}========================================================${NC}"

# 1. Validar ejecución como root
if [ "$EUID" -ne 0 ]; then
    echo -e "${RED}[ERROR] Este instalador debe ejecutarse como root o con sudo.${NC}"
    exit 1
fi

# 2. Actualización de paquetes
echo -e "${GREEN}[1/8] Actualizando repositorio del sistema operativo...${NC}"
dnf update -y --refresh

# 3. Instalación de utilidades esenciales
echo -e "${GREEN}[2/8] Instalando herramientas básicas y compiladores...${NC}"
dnf install -y curl wget git tar policycoreutils-python-utils firewalld

# 4. Instalación de Node.js 20 LTS
echo -e "${GREEN}[3/8] Instalando Node.js 20 LTS...${NC}"
dnf module reset nodejs -y
dnf module enable nodejs:20 -y
dnf install -y nodejs
echo -e "Node.js versión instalada: $(node -v)"
echo -e "NPM versión instalada: $(npm -v)"

# 5. Instalación de PostgreSQL 16 Oficial
echo -e "${GREEN}[4/8] Configurando e instalando PostgreSQL 16 Oficial (PGDG)...${NC}"
dnf install -y https://download.postgresql.org/pub/repos/yum/reporpms/EL-9-x86_64/pgdg-redhat-repo-latest.noarch.rpm
dnf -qy module disable postgresql
dnf install -y postgresql16-server postgresql16-contrib

# Inicializar e iniciar PostgreSQL
if [ ! -f /var/lib/pgsql/16/data/PG_VERSION ]; then
    echo "[INFO] Inicializando clúster de base de datos PostgreSQL 16..."
    /usr/pgsql-16/bin/postgresql-16-setup initdb
fi

systemctl enable postgresql-16
systemctl start postgresql-16

# Configurar usuario y base de datos SENAE
echo -e "${GREEN}[5/8] Configurando base de datos senae_control_previo...${NC}"
DB_USER="senae_admin"
DB_PASS="senae_segura_2026"
DB_NAME="senae_control_previo"

sudo -u postgres psql -tc "SELECT 1 FROM pg_roles WHERE rolname='${DB_USER}'" | grep -q 1 || \
    sudo -u postgres psql -c "CREATE USER ${DB_USER} WITH PASSWORD '${DB_PASS}' CREATEDB;"

sudo -u postgres psql -tc "SELECT 1 FROM pg_database WHERE datname='${DB_NAME}'" | grep -q 1 || \
    sudo -u postgres psql -c "CREATE DATABASE ${DB_NAME} OWNER ${DB_USER};"

# 6. Crear usuario de sistema para la aplicación
echo -e "${GREEN}[6/8] Creando usuario de servicio sin privilegios (senae)...${NC}"
id -u senae &>/dev/null || useradd --system --shell /sbin/nologin --home-dir /opt/senae-control-previo senae

APP_DIR="/opt/senae-control-previo"
mkdir -p "${APP_DIR}"

# Si el script se ejecuta dentro del repo fuente, copiar archivos
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
if [ -f "${SCRIPT_DIR}/package.json" ] && [ "${SCRIPT_DIR}" != "${APP_DIR}" ]; then
    echo "[INFO] Copiando código fuente a ${APP_DIR}..."
    cp -r "${SCRIPT_DIR}/." "${APP_DIR}/"
fi

cd "${APP_DIR}"

# 7. Construcción de la aplicación
echo -e "${GREEN}[7/8] Instalando dependencias y compilando aplicación...${NC}"
npm ci

# Activar esquema PostgreSQL en Prisma
node scripts/switch-db.js postgres

export DATABASE_URL="postgresql://${DB_USER}:${DB_PASS}@127.0.0.1:5432/${DB_NAME}?schema=public"

# Crear tablas y sembrar datos iniciales (137 checklists normativos y usuarios)
npx prisma db push --skip-generate
npx prisma generate
npx tsx scripts/seed-checklists.ts

# Compilar Next.js en modo standalone
npm run build

chown -R senae:senae "${APP_DIR}"

# 8. Configuración de Nginx, SELinux, Firewalld y systemd
echo -e "${GREEN}[8/8] Configurando seguridad corporativa (SELinux, Firewalld, Nginx, systemd)...${NC}"

# Nginx
dnf install -y nginx
cp "${APP_DIR}/deploy/rocky/nginx-senae.conf" /etc/nginx/conf.d/senae-control-previo.conf
systemctl enable nginx
systemctl start nginx

# SELinux: Permitir que Nginx se conecte al servicio Node local
setsebool -P httpd_can_network_connect 1

# Firewalld: Abrir puertos 80 y 443
systemctl enable firewalld
systemctl start firewalld
firewall-cmd --permanent --add-service=http
firewall-cmd --permanent --add-service=https
firewall-cmd --reload

# Systemd Service
cp "${APP_DIR}/deploy/rocky/senae-control-previo.service" /etc/systemd/system/
systemctl daemon-reload
systemctl enable senae-control-previo
systemctl restart senae-control-previo

echo -e "${BLUE}========================================================${NC}"
echo -e "${GREEN}¡INSTALACIÓN COMPLETADA EXITOSAMENTE EN ROCKY LINUX 9!${NC}"
echo -e "Aplicación activa en systemd: senae-control-previo"
echo -e "Base de datos PostgreSQL 16: senae_control_previo"
echo -e "Acceso web: http://localhost o IP del servidor"
echo -e "${BLUE}========================================================${NC}"
