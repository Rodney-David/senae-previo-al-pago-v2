#!/usr/bin/env bash
# ========================================================
# SERVICIO NACIONAL DE ADUANA DEL ECUADOR - SENAE
# Script de Restauración Autorizada PostgreSQL 16
# Uso: ./restore-postgres.sh /ruta/al/archivo.dump
# ========================================================

set -euo pipefail

if [ "$#" -ne 1 ]; then
    echo "Uso: $0 <archivo_respaldo.dump>"
    exit 1
fi

BACKUP_FILE="$1"
DB_NAME="${POSTGRES_DB:-senae_control_previo}"
DB_USER="${POSTGRES_USER:-senae_admin}"

if [ ! -f "${BACKUP_FILE}" ]; then
    echo "[ERROR] El archivo de respaldo no existe: ${BACKUP_FILE}"
    exit 1
fi

# Validar checksum si existe el archivo .sha256
if [ -f "${BACKUP_FILE}.sha256" ]; then
    echo "[INFO] Validando integridad SHA256 del archivo de respaldo..."
    sha256sum -c "${BACKUP_FILE}.sha256"
fi

echo "[ADVERTENCIA] ¡Este proceso sobreescribirá la base de datos ${DB_NAME}!"
read -p "¿Está seguro de continuar con la restauración? (escriba 'CONFIRMAR'): " CONFIRMACION

if [ "${CONFIRMACION}" != "CONFIRMAR" ]; then
    echo "[INFO] Operación cancelada por el operador."
    exit 0
fi

echo "[INFO] Restaurando datos en ${DB_NAME}..."
pg_restore -U "${DB_USER}" -d "${DB_NAME}" --clean --if-exists -v "${BACKUP_FILE}"

echo "[SUCCESS] Base de datos restaurada correctamente a las $(date)."
