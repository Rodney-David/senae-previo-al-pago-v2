# SERVICIO NACIONAL DE ADUANA DEL ECUADOR (SENAE)
## DIRECCIÓN FINANCIERA · CONTROL PREVIO AL PAGO v2.0
### MANUAL DE POLÍTICA DE RESPALDO (BACKUP) Y RECUPERACIÓN ANTE DESASTRES

---

### 1. POLÍTICA DE RESPALDO INSTITUCIONAL

Para salvaguardar la integridad de la bitácora financiera y los expedientes de pago, se establece una estrategia de copias de seguridad basada en:

* **Tipo de Respaldo:** Volcado binario comprimido con metadatos completos (`pg_dump` formato custom `-Fc`).
* **Frecuencia:** Diaria de forma automatizada (todos los días a las 02:00 AM).
* **Retención:** 30 días calendario en el servidor local de Rocky Linux 9, antes de depuración automática.
* **Integridad Criptográfica:** Generación automática de archivo de suma de verificación SHA-256 (`.sha256`) por cada respaldo generado.
* **Ubicación en Servidor:** `/var/backups/senae-postgres/`.

---

### 2. EJECUCIÓN DE RESPALDOS AUTOMATIZADOS

El proyecto incluye el script oficial [`deploy/rocky/backup-postgres.sh`](file:///C:/Users/PC/Documents/RODNEY%20SENAE/senae-previo-al-pago-v2/deploy/rocky/backup-postgres.sh).

#### 2.1. Ejecución Manual Inmediata
Si requiere generar un respaldo previo a una actualización o cambio de estructura:
```bash
sudo chmod +x /opt/senae-control-previo/deploy/rocky/backup-postgres.sh
sudo /opt/senae-control-previo/deploy/rocky/backup-postgres.sh
```

El script producirá una salida similar a:
```text
[2026-10-05 02:00:01] Iniciando respaldo de PostgreSQL 16: senae_control_previo...
[2026-10-05 02:00:04] Respaldo generado: /var/backups/senae-postgres/senae_backup_20261005_020001.dump
[2026-10-05 02:00:04] Suma SHA-256: 7f83b1657ff1fc53b92dc18148a1d65dfc2d4b1fa3d677284addd200126d9069
[2026-10-05 02:00:04] Depuracion de respaldos antiguos (30 dias) completada exitosamente.
```

#### 2.2. Configuración del Cronjob (Respaldo Nocturno)
Para programar la ejecución desatendida en Rocky Linux 9:
```bash
sudo crontab -e
```
Agregue la siguiente línea:
```cron
0 2 * * * /opt/senae-control-previo/deploy/rocky/backup-postgres.sh >> /var/log/senae-backup.log 2>&1
```

#### 2.3. Respaldo en Entorno de Contenedores (Docker)
Si utiliza Docker Compose:
```bash
sudo docker compose exec -T db pg_dump -U senae_app -d senae_control_previo -Fc > /var/backups/senae_docker_$(date +\%Y\%m\%d).dump
```

---

### 3. PROCEDIMIENTO DE RECUPERACIÓN (RESTORE) ANTE DESASTRES

En caso de fallo de hardware, corrupción de datos o necesidad de restauración en un ambiente de contingencia:

#### 3.1. Validación de Integridad Previa
Antes de restaurar, se debe comprobar que el archivo `.dump` no esté truncado ni corrupto:
```bash
cd /var/backups/senae-postgres/
sha256sum -c senae_backup_20261005_020001.dump.sha256
```
*Debe responder `senae_backup_20261005_020001.dump: La suma coincide` (OK).*

#### 3.2. Ejecución de la Restauración Automatizada
El script [`deploy/rocky/restore-postgres.sh`](file:///C:/Users/PC/Documents/RODNEY%20SENAE/senae-previo-al-pago-v2/deploy/rocky/restore-postgres.sh) detiene temporalmente la aplicación, recrea el esquema y restaura los datos de forma consistente:

```bash
sudo chmod +x /opt/senae-control-previo/deploy/rocky/restore-postgres.sh
sudo /opt/senae-control-previo/deploy/rocky/restore-postgres.sh /var/backups/senae-postgres/senae_backup_20261005_020001.dump
```

#### 3.3. Pasos Internos que Realiza la Restauración
1. Detención del servicio web (`systemctl stop senae-control-previo`).
2. Cierre de conexiones activas a PostgreSQL.
3. Ejecución de `pg_restore --clean --if-exists --no-owner --schema=public`.
4. Verificación de conteo de tablas y registros.
5. Reinicio de los servicios de la aplicación (`systemctl start senae-control-previo`).

#### 3.4. Restauración en Entorno Docker
```bash
sudo docker compose exec -T db pg_restore -U senae_app -d senae_control_previo --clean --if-exists < /var/backups/senae_backup_archivo.dump
```

---

### 4. CONSULTA DE VERIFICACIÓN POST-RESTAURACIÓN

Ejecute la siguiente consulta en PostgreSQL para corroborar que los trámites y la bitácora histórica se encuentren intactos:

```sql
SELECT 
    (SELECT COUNT(*) FROM tramites) AS total_tramites,
    (SELECT COUNT(*) FROM historial_movimientos) AS total_movimientos_bitacora,
    (SELECT COUNT(*) FROM respuestas_checklist) AS total_evaluaciones_checklist;
```
