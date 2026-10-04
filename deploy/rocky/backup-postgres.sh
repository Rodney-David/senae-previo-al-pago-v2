#!/usr/bin/env bash
# ========================================================
# SERVICIO NACIONAL DE ADUANA DEL ECUADOR - SENAE
# Script de Respaldo Automatizado PostgreSQL 16
# Ubicación recomendada en crontab:
# 0 2 * * * /opt/senae-control-previo/deploy/rocky/backup-postgres.sh
# ========================================================

set -euo pipefail

BACKUP_DIR="/var/backups/senae-control-previo"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
DB_NAME="${POSTGRES_DB:-senae_control_previo}"
DB_USER="${POSTGRES_USER:-senae_admin}"
BACKUP_FILE="${BACKUP_DIR}/backup_${DB_NAME}_${TIMESTAMP}.dump"

mkdir -p "${BACKUP_DIR}"
chmod 700 "${BACKUP_DIR}"

echo "[INFO] Iniciando respaldo de base de datos SENAE: ${DB_NAME} a las $(date)..."

# Generar volcado comprimido en formato Custom (óptimo para pg_restore)
pg_dump -U "${DB_USER}" -d "${DB_NAME}" -F c -b -v -f "${BACKUP_FILE}"

# Generar checksum SHA256 para verificación de integridad forense
sha256sum "${BACKUP_FILE}" > "${BACKUP_FILE}.sha256"

echo "[SUCCESS] Respaldo completado exitosamente: ${BACKUP_FILE}"
echo "[INFO] Tamaño del archivo: $(du -h "${BACKUP_FILE}" | cut -f1)"

# Rotación de respaldos: Eliminar archivos más antiguos a 30 días
echo "[INFO] Limpiando respaldos con antigüedad mayor a 30 días..."
find "${BACKUP_DIR}" -type f -name "backup_*.dump*" -mtime +30 -delete

echo "[INFO] Proceso de respaldo culminado."
