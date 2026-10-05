# SERVICIO NACIONAL DE ADUANA DEL ECUADOR (SENAE)
## DIRECCIÓN FINANCIERA · CONTROL PREVIO AL PAGO v2.0
### ACTA DE ENTREGA DE CREDENCIALES ADMINISTRATIVAS Y DE BASE DE DATOS

---

> [!CAUTION]
> **DOCUMENTO CONFIDENCIAL / SEGURIDAD DE LA INFORMACIÓN**  
> Este documento contiene credenciales de acceso privilegiado al entorno de producción de Rocky Linux 9 y PostgreSQL 16. Debe ser resguardado exclusivamente por el Administrador de TICs y la Dirección Financiera de SENAE.

---

### 1. CREDENCIALES DEL MOTOR DE BASE DE DATOS (POSTGRESQL 16)

#### 1.1. Superusuario del Motor (Administración de Instancia)
* **Host / Servidor:** `127.0.0.1` (o contenedor `senae-db`)
* **Puerto:** `5432`
* **Base de Datos Inicial:** `postgres`
* **Usuario:** `postgres`
* **Contraseña Inicial Sugerida:** `SenaePostgres2026!Prod`
* **Comando de conexión local:**
  ```bash
  sudo -u postgres psql
  ```

#### 1.2. Usuario de Aplicación (Privilegios Mínimos para la Plataforma)
* **Base de Datos Operativa:** `senae_control_previo`
* **Usuario:** `senae_app`
* **Contraseña:** `SenaeSecureDb2026#Prod`
* **Permisos Asignados:** `ALL PRIVILEGES ON DATABASE senae_control_previo`, `GRANT ALL ON ALL TABLES IN SCHEMA public`.
* **Cadena de Conexión de Producción (`DATABASE_URL`):**
  ```text
  postgresql://senae_app:SenaeSecureDb2026#Prod@127.0.0.1:5432/senae_control_previo?schema=public
  ```

---

### 2. CREDENCIALES DE ADMINISTRACIÓN FUNCIONAL DE LA APLICACIÓN

| Rol | Correo Institucional / Usuario | Contraseña Inicial | Nivel de Privilegios |
| :--- | :--- | :--- | :--- |
| **Administrador del Sistema (TICs)** | `admin.financiero@aduana.gob.ec` | `senae2026` | Acceso total a configuración, feriados, campos dinámicos y usuarios. |
| **Directora Financiera** | `directora.financiera@aduana.gob.ec` | `senae2026` | Autorización final de pagos y derivaciones especiales. |
| **Secretaría DFI (Ventanilla)** | `secretaria.dfi@aduana.gob.ec` | `senae2026` | Creación de trámites y recepción física. |
| **Jefe de Presupuesto** | `jefe.presupuesto@aduana.gob.ec` | `senae2026` | Aprobación presupuestaria y asignación de analistas. |
| **Analista de Presupuesto 1** | `analista.presupuesto1@aduana.gob.ec` | `senae2026` | Control de partidas, compromisos y checklist. |
| **Analista de Presupuesto 2** | `analista.presupuesto2@aduana.gob.ec` | `senae2026` | Control de partidas y compromisos. |
| **Contador General** | `contador.general@aduana.gob.ec` | `senae2026` | Aprobación contable previa al pago. |
| **Analista Contable 1** | `analista.contabilidad1@aduana.gob.ec` | `senae2026` | Devengados, retenciones y checklist contable. |
| **Tesorero / Pagos** | `tesoreria.pagos@aduana.gob.ec` | `senae2026` | Registro de lotes MEF y SPI-BCE. |
| **Técnico de Cobranzas** | `cobranzas.garantias@aduana.gob.ec` | `senae2026` | Validación de coactivas y garantías. |
| **Custodio de Archivo** | `archivo.financiero@aduana.gob.ec` | `senae2026` | Asignación topográfica y custodia pasiva. |

---

### 3. PROTOCOLO DE DOBLE FACTOR DE AUTENTICACIÓN (2FA)

Para cada inicio de sesión:
1. El usuario ingresa su correo institucional y su contraseña.
2. Resuelve el desafío visual **Captcha** (código de 5 caracteres contra ataques automatizados).
3. El sistema emite un código institucional de 6 dígitos con vigencia estricta de 5 minutos.
4. Una vez validado, se genera la cookie criptográfica segura `senae_session` (HMAC-SHA256).

---

### 4. INSTRUCCIONES OBLIGATORIAS DE CAMBIO DE CONTRASEÑA EN PRODUCCIÓN

Por directriz del Esquema Gubernamental de Seguridad de la Información (EGSI):
1. Tras el despliegue inicial en Rocky Linux 9, el Administrador de TICs debe ingresar al módulo `/administracion`.
2. Dirigirse a la pestaña **Gestión de Usuarios**.
3. Cambiar la contraseña por defecto (`senae2026`) de todas las cuentas por contraseñas que cumplan:
   - Mínimo 12 caracteres.
   - Al menos una mayúscula, una minúscula, un número y un carácter especial (`!@#$%^&*`).
4. Generar una nueva clave para `AUTH_SECRET` en el archivo `.env.production`:
   ```bash
   # Generar clave segura en terminal de Rocky Linux
   openssl rand -hex 32
   ```
