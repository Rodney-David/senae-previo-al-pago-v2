/**
 * Compilador de Documentación Oficial SENAE a PDF
 * Ejecuta renderizado HTML con Chrome Headless
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const {
  wrapHtml,
  CHROME_PATH,
  USER_DATA_DIR,
  HTML_DIR,
  PDF_DIR,
  imgLogin,
  imgEscritorio,
  imgEscritorioTramites,
  imgDetalleEstados,
  imgRevision,
  imgRecepcion,
  imgIndicadores,
  imgAdmin,
  imgTramites
} = require('./pdf_base');

const DOCS_DIR = path.resolve(__dirname, '../docs');
const documents = [];

// ============================================================================
// DOCUMENTO 1: MANUAL DE INSTALACIÓN Y CONFIGURACIÓN
// ============================================================================
const doc1Html = `
  <h2>1. PROPÓSITO Y ALCANCE TÉCNICO</h2>
  <p>
    El presente manual técnico detalla el procedimiento oficial y reproducible para la instalación, configuración, puesta en marcha y mantenimiento del <strong>Sistema de Control Financiero Previo al Pago (SENAE-CFPP v2.0)</strong> en los servidores institucionales del <strong>Servicio Nacional de Aduana del Ecuador (SENAE)</strong>.
  </p>
  <p>
    El alcance abarca la configuración sobre el sistema operativo oficial <strong>Rocky Linux 9 (x86_64)</strong>, el motor de base de datos relacional <strong>PostgreSQL 16</strong>, la plataforma de ejecución <strong>Node.js 20 LTS</strong> en modalidad Standalone de Next.js 14, y el servidor web / proxy inverso <strong>Nginx 1.24+</strong> con terminación criptográfica TLS/HTTPS y compresión optimizada.
  </p>

  <div class="callout callout-info">
    <div class="callout-title">📌 Directriz de Despliegue en Red Institucional</div>
    El sistema está diseñado para operar en la red interna del SENAE (VLAN de Servidores / DMZ Institucional), requiriendo conexión física o VPN segura autorizada por la Dirección de Tecnologías de la Información y Comunicación (TICs).
  </div>

  <h2>2. ARQUITECTURA DE LA SOLUCIÓN</h2>
  <table class="content-table">
    <thead>
      <tr>
        <th>Capa de Arquitectura</th>
        <th>Tecnología / Componente</th>
        <th>Versión</th>
        <th>Rol en la Plataforma</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td><strong>Capa de Presentación</strong></td>
        <td>Next.js 14 App Router + Tailwind CSS</td>
        <td>14.2+</td>
        <td>Interfaz reactiva institucional, renderizado optimizado por servidor (SSR) y componentes seguros.</td>
      </tr>
      <tr>
        <td><strong>Capa de Lógica y Negocio</strong></td>
        <td>Node.js LTS (Standalone) + TypeScript</td>
        <td>20.x LTS</td>
        <td>Control de transacciones, semáforos SLA, validación de feriados y auditoría inmutable.</td>
      </tr>
      <tr>
        <td><strong>Capa de Persistencia (ORM)</strong></td>
        <td>Prisma ORM</td>
        <td>5.x</td>
        <td>Mapeo relacional de base de datos y migraciones esquemáticas fuertemente tipadas.</td>
      </tr>
      <tr>
        <td><strong>Motor de Base de Datos</strong></td>
        <td>PostgreSQL 16 Enterprise RDBMS</td>
        <td>16.x</td>
        <td>Almacenamiento ACID de expedientes, bitácoras de auditoría, fojas y catálogos normativos.</td>
      </tr>
      <tr>
        <td><strong>Proxy Inverso / Gateway</strong></td>
        <td>Nginx Web Server</td>
        <td>1.24+</td>
        <td>Terminación TLS/SSL, cortafuegos de encabezados HTTP, compresión gzip y balanceo local.</td>
      </tr>
      <tr>
        <td><strong>Sistema Operativo Base</strong></td>
        <td>Rocky Linux 9 (Red Hat Enterprise compatible)</td>
        <td>9.4+</td>
        <td>Kernel Linux 5.14+, SELinux activo (Targeted/Enforcing) y cortafuegos firewalld estricto.</td>
      </tr>
    </tbody>
  </table>

  <h2>3. REQUISITOS DE HARDWARE Y RED</h2>
  <table class="content-table">
    <thead>
      <tr>
        <th>Recurso de Servidor</th>
        <th>Especificación Mínima (Pruebas)</th>
        <th>Especificación Recomendada (Producción)</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td><strong>Procesador (CPU)</strong></td>
        <td>2 vCPU (x86_64 @ 2.4 GHz)</td>
        <td>4 vCPU o superior</td>
      </tr>
      <tr>
        <td><strong>Memoria RAM</strong></td>
        <td>4 GB (2 GB PostgreSQL / 2 GB Node.js)</td>
        <td>8 GB a 16 GB física ECC</td>
      </tr>
      <tr>
        <td><strong>Almacenamiento (Disco)</strong></td>
        <td>40 GB SSD / NVMe en partición /opt</td>
        <td>100 GB SSD NVMe con arreglo RAID 1 / RAID 10</td>
      </tr>
      <tr>
        <td><strong>Interfaces de Red</strong></td>
        <td>1 x Ethernet Gigabit (1 Gbps)</td>
        <td>2 x Ethernet Gigabit en Bonding / Redundante</td>
      </tr>
      <tr>
        <td><strong>Puertos de Red Requeridos</strong></td>
        <td colspan="2">80/TCP (HTTP redirige a HTTPS), 443/TCP (HTTPS seguro institucional), 22/TCP (SSH administrativo interno).</td>
      </tr>
    </tbody>
  </table>

  <h2>4. PROCEDIMIENTO DE INSTALACIÓN PASO A PASO</h2>

  <h3>MODALIDAD A: DESPLIEGUE EN CONTENEDORES (DOCKER / PODMAN) [RECOMENDADA]</h3>
  <p>Esta modalidad aísla totalmente las dependencias y garantiza un levantamiento estandarizado y reproducible en menos de 3 minutos:</p>

  <h4>Paso 1: Instalar Docker y Compose en Rocky Linux 9</h4>
  <pre><code>sudo dnf install -y yum-utils
sudo dnf config-manager --add-repo https://download.docker.com/linux/centos/docker-ce.repo
sudo dnf install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin
sudo systemctl enable --now docker</code></pre>

  <h4>Paso 2: Apertura de Puertos en Cortafuegos firewalld</h4>
  <pre><code>sudo firewall-cmd --permanent --add-service=http
sudo firewall-cmd --permanent --add-service=https
sudo firewall-cmd --reload</code></pre>

  <h4>Paso 3: Configurar Variables de Entorno de Producción</h4>
  <pre><code>cd /opt/senae-control-previo
cp .env.production.example .env.production
nano .env.production</code></pre>

  <h4>Paso 4: Construcción y Puesta en Marcha</h4>
  <pre><code>sudo docker compose --env-file .env.production up -d --build</code></pre>

  <h4>Paso 5: Inicialización de Esquema y Catálogo Normativo</h4>
  <pre><code>sudo docker compose exec app npx prisma db push --schema=prisma/schema.postgresql.prisma
sudo docker compose exec app npx ts-node scripts/seed-checklists.ts</code></pre>

  <div class="page-break"></div>

  <h3>MODALIDAD B: INSTALACIÓN NATIVA DIRECTA EN ROCKY LINUX 9</h3>
  <p>Si la política de infraestructura de TICs exige instalación en el sistema operativo anfitrión sin capas de virtualización de contenedores:</p>

  <h4>Paso 1: Ejecutar el Instalador Oficial Automatizado</h4>
  <pre><code>cd /opt/senae-control-previo
sudo chmod +x deploy/rocky/install-native-rocky9.sh
sudo bash deploy/rocky/install-native-rocky9.sh</code></pre>

  <p>El script automatizado realiza:</p>
  <ul>
    <li>Configuración de repositorios oficiales PGDG (PostgreSQL 16) y NodeSource (Node.js 20 LTS).</li>
    <li>Creación de la base de datos <code>senae_control_previo</code> y usuario <code>senae_app</code> con privilegios estrictos.</li>
    <li>Compilación optimizada de producción (<code>npm run build</code>).</li>
    <li>Creación y registro del servicio de arranque automático en <code>/etc/systemd/system/senae-control-previo.service</code>.</li>
    <li>Ajuste de SELinux permitiendo el enlace de red de Nginx (<code>setsebool -P httpd_can_network_connect 1</code>).</li>
  </ul>

  <h4>Paso 2: Verificación de Estado de los Servicios del Sistema</h4>
  <pre><code>sudo systemctl status senae-control-previo
sudo systemctl status nginx
sudo systemctl status postgresql-16</code></pre>

  <h2>5. VARIABLES DE ENTORNO DEL SISTEMA (.env.production)</h2>
  <table class="content-table">
    <thead>
      <tr>
        <th>Variable</th>
        <th>Descripción y Propósito</th>
        <th>Valor Configurado / Ejemplo</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td><code>NODE_ENV</code></td>
        <td>Modo de ejecución del runtime Node.js.</td>
        <td><code>production</code></td>
      </tr>
      <tr>
        <td><code>PORT</code></td>
        <td>Puerto TCP de enlace interno de la aplicación.</td>
        <td><code>3000</code></td>
      </tr>
      <tr>
        <td><code>DATABASE_URL</code></td>
        <td>Cadena de conexión segura JDBC/Prisma a PostgreSQL 16.</td>
        <td><code>postgresql://senae_app:PASSWORD@127.0.0.1:5432/senae_control_previo?schema=public</code></td>
      </tr>
      <tr>
        <td><code>AUTH_SECRET</code></td>
        <td>Clave criptográfica para firmas HMAC-SHA256 de sesiones y Captchas.</td>
        <td>Cadena aleatoria generada con <code>openssl rand -hex 32</code></td>
      </tr>
      <tr>
        <td><code>NEXT_PUBLIC_APP_NAME</code></td>
        <td>Nombre institucional en cabecera y reportes.</td>
        <td><code>SENAE · Control Financiero Previo al Pago</code></td>
      </tr>
    </tbody>
  </table>

  <h2>6. MONITOREO Y VERIFICACIÓN POST-INSTALACIÓN (HEALTHCHECK)</h2>
  <ol>
    <li>Abrir el navegador web institucional en <code>http://&lt;IP_SERVIDOR_ROCKY&gt;</code>.</li>
    <li>Verificar redirección automática y segura al Login Institucional (<code>/login</code>).</li>
    <li>Verificar renderizado correcto del Captcha de seguridad y campos de acceso.</li>
    <li>Inspeccionar el registro de eventos en tiempo real:</li>
  </ol>
  <pre><code>sudo journalctl -u senae-control-previo -f</code></pre>

`;

documents.push({
  id: '01_Manual_instalacion_configuracion',
  title: 'MANUAL DE INSTALACIÓN Y CONFIGURACIÓN DE LA SOLUCIÓN',
  subtitle: 'Guía Técnica de Despliegue en Rocky Linux 9 y PostgreSQL 16',
  meta: { version: '2.0.0 (Producción)', date: 'Octubre de 2026', author: 'Equipo de Arquitectura e Infraestructura TICs' },
  html: doc1Html
});

// ============================================================================
// DOCUMENTO 2: DICCIONARIO DE DATOS Y ESQUEMA DE BASE DE DATOS
// ============================================================================
const doc2Html = `
  <h2>1. ALCANCE Y CONVENCIONES DEL MODELO DE DATOS</h2>
  <p>
    El modelo relacional del sistema <strong>SENAE-CFPP v2.0</strong> está implementado sobre el motor <strong>PostgreSQL 16</strong>. Garantiza integridad referencial estricta, restricciones de comprobación (CHECK constraints), tipos de datos fuertemente definidos y una bitácora inmutable de auditoría forense para cumplir con las Normas de Control Interno de la Contraloría General del Estado (CGE).
  </p>

  <h2>2. ESQUEMA DE TABLAS Y RELACIONES PRINCIPALES</h2>
  <table class="content-table">
    <thead>
      <tr>
        <th>Nombre de Tabla</th>
        <th>Tipo</th>
        <th>Entidad que Representa</th>
        <th>Reglas de Negocio Asociadas</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td><code>tramites</code></td>
        <td>Principal</td>
        <td>Expediente de pago y ciclo de vida</td>
        <td>Almacena montos, estado, proveedor, Quipux, semáforo SLA, fojas y fechas clave.</td>
      </tr>
      <tr>
        <td><code>historial_movimientos</code></td>
        <td>Auditoría</td>
        <td>Bitácora inmutable de custodia</td>
        <td>Registra cada cambio de custodio, derivación, departamento y fecha exacta del servidor.</td>
      </tr>
      <tr>
        <td><code>usuarios</code></td>
        <td>Seguridad</td>
        <td>Cuentas individuales de funcionarios</td>
        <td>Contiene credenciales, correo institucional, rol RBAC, estado y departamento.</td>
      </tr>
      <tr>
        <td><code>areas</code></td>
        <td>Catálogo</td>
        <td>Departamentos del flujo institucional</td>
        <td>Ventanilla DFI, Presupuesto, Contabilidad, Dirección Financiera, Tesorería y Archivo.</td>
      </tr>
      <tr>
        <td><code>requisitos_checklist</code></td>
        <td>Normativa</td>
        <td>Catálogo de los 137 requisitos</td>
        <td>Agrupados por los 17 tipos de procesos SENAE y fases (Presupuesto / Contabilidad).</td>
      </tr>
      <tr>
        <td><code>respuestas_checklist</code></td>
        <td>Operativa</td>
        <td>Evaluación documental del expediente</td>
        <td>Registra si cada requisito CUMPLE, NO CUMPLE o NO APLICA, con fojas y notas técnicas.</td>
      </tr>
      <tr>
        <td><code>observaciones</code></td>
        <td>Control</td>
        <td>Novedades preventivas (Ciclo 72h)</td>
        <td>Registra discrepancias detectadas, plazo de descargo y subsanación motivada.</td>
      </tr>
      <tr>
        <td><code>solicitudes_devolucion</code></td>
        <td>Formal</td>
        <td>Devolución externa con memorando</td>
        <td>Devolución formal del expediente a la unidad requirente con número de Quipux.</td>
      </tr>
      <tr>
        <td><code>feriados_nacionales</code></td>
        <td>Parámetro</td>
        <td>Calendario fiscal de feriados</td>
        <td>Excluye días no laborables del cálculo exacto del semáforo SLA de vencimiento.</td>
      </tr>
    </tbody>
  </table>

  <h2>3. DICCIONARIO DETALLADO DE TABLAS</h2>

  <h3>3.1. TABLA: tramites</h3>
  <p>Entidad central que registra los expedientes de pago desde su radicación en ventanilla.</p>
  <table class="content-table">
    <thead>
      <tr>
        <th>Columna</th>
        <th>Tipo de Dato</th>
        <th>Nulo</th>
        <th>Descripción y Reglas de Negocio</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td><code>id_tramite</code></td>
        <td>SERIAL PRIMARY KEY</td>
        <td>NO</td>
        <td>Identificador único del expediente.</td>
      </tr>
      <tr>
        <td><code>codigo_tramite</code></td>
        <td>VARCHAR(30) UNIQUE</td>
        <td>NO</td>
        <td>Código institucional generado (ej. <code>TRM-2026-0001</code>).</td>
      </tr>
      <tr>
        <td><code>numero_quipux</code></td>
        <td>VARCHAR(50) UNIQUE</td>
        <td>NO</td>
        <td>Número de memorando Quipux oficial (ej. <code>SENAE-DFI-2026-0045-M</code>).</td>
      </tr>
      <tr>
        <td><code>fecha_memorando</code></td>
        <td>DATE</td>
        <td>SÍ</td>
        <td>Fecha consignada en el memorando Quipux.</td>
      </tr>
      <tr>
        <td><code>fecha_recepcion_fisica</code></td>
        <td>DATE</td>
        <td>SÍ</td>
        <td>Fecha exacta de ingreso físico de las fojas en ventanilla DFI.</td>
      </tr>
      <tr>
        <td><code>id_tipo_tramite</code></td>
        <td>INTEGER FK</td>
        <td>NO</td>
        <td>Enlace con el catálogo de los 17 tipos de procesos SENAE.</td>
      </tr>
      <tr>
        <td><code>proveedor_beneficiario</code></td>
        <td>VARCHAR(200)</td>
        <td>NO</td>
        <td>Razón social del contratista o funcionario beneficiario.</td>
      </tr>
      <tr>
        <td><code>ruc_proveedor</code></td>
        <td>VARCHAR(13)</td>
        <td>SÍ</td>
        <td>RUC o cédula validada contra algoritmo módulo 10/11.</td>
      </tr>
      <tr>
        <td><code>monto_total</code></td>
        <td>DECIMAL(14,2)</td>
        <td>NO</td>
        <td>Monto total legal de la obligación económica.</td>
      </tr>
      <tr>
        <td><code>es_alta_cuantia</code></td>
        <td>BOOLEAN</td>
        <td>SÍ</td>
        <td><code>TRUE</code> si monto >= $10.000. Asignación obligatoria a Jefatura de Presupuesto.</td>
      </tr>
      <tr>
        <td><code>numero_cur_compromiso</code></td>
        <td>VARCHAR(30)</td>
        <td>SÍ</td>
        <td>Número del CUR de Compromiso emitido en Presupuesto.</td>
      </tr>
      <tr>
        <td><code>numero_cur_devengado</code></td>
        <td>VARCHAR(30)</td>
        <td>SÍ</td>
        <td>Número del CUR Devengado emitido en Contabilidad.</td>
      </tr>
      <tr>
        <td><code>numero_factura</code></td>
        <td>VARCHAR(60)</td>
        <td>SÍ</td>
        <td>Factura física autorizada por el SRI (formato <code>001-002-123456789</code>).</td>
      </tr>
      <tr>
        <td><code>estado_general</code></td>
        <td>VARCHAR(60)</td>
        <td>NO</td>
        <td>Estado macro: EN_RECEPCION, EN_PRESUPUESTO, EN_CONTABILIDAD, EN_AUTORIZACION_DFI, EN_TESORERIA, ARCHIVADO.</td>
      </tr>
      <tr>
        <td><code>esta_pausado</code></td>
        <td>BOOLEAN</td>
        <td>SÍ</td>
        <td><code>TRUE</code> cuando el semáforo SLA se congela por falta de factura original o devolución.</td>
      </tr>
      <tr>
        <td><code>motivo_pausa</code></td>
        <td>VARCHAR(255)</td>
        <td>SÍ</td>
        <td>Fundamento normativo que justifica el congelamiento legal del plazo.</td>
      </tr>
    </tbody>
  </table>

  <div class="page-break"></div>

  <h3>3.2. TABLA: historial_movimientos (Bitácora Forense de Auditoría)</h3>
  <table class="content-table">
    <thead>
      <tr>
        <th>Columna</th>
        <th>Tipo de Dato</th>
        <th>Nulo</th>
        <th>Descripción y Control</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td><code>id_movimiento</code></td>
        <td>SERIAL PRIMARY KEY</td>
        <td>NO</td>
        <td>Identificador inmutable de la traza de auditoría.</td>
      </tr>
      <tr>
        <td><code>id_tramite</code></td>
        <td>INTEGER FK</td>
        <td>NO</td>
        <td>Expediente al que pertenece la traza.</td>
      </tr>
      <tr>
        <td><code>id_usuario_entrega</code></td>
        <td>INTEGER FK</td>
        <td>NO</td>
        <td>Funcionario institucional que entrega físicamente el expediente.</td>
      </tr>
      <tr>
        <td><code>id_usuario_recibe</code></td>
        <td>INTEGER FK</td>
        <td>NO</td>
        <td>Funcionario institucional que recibe la custodia formal.</td>
      </tr>
      <tr>
        <td><code>id_area_origen</code></td>
        <td>INTEGER FK</td>
        <td>NO</td>
        <td>Departamento remitente.</td>
      </tr>
      <tr>
        <td><code>id_area_destino</code></td>
        <td>INTEGER FK</td>
        <td>NO</td>
        <td>Departamento receptor.</td>
      </tr>
      <tr>
        <td><code>tipo_accion</code></td>
        <td>VARCHAR(60)</td>
        <td>NO</td>
        <td>Acción ejecutada (RECEPCION, DERIVACION_PRESUPUESTO, APROBACION_JEFE, PAUSA_FACTURA, etc.).</td>
      </tr>
      <tr>
        <td><code>comentarios</code></td>
        <td>TEXT</td>
        <td>SÍ</td>
        <td>Detalle forense con justificación o cambios de campos.</td>
      </tr>
      <tr>
        <td><code>fecha_hora</code></td>
        <td>TIMESTAMP(3)</td>
        <td>NO</td>
        <td>Marca de tiempo irrevocable del servidor de base de datos.</td>
      </tr>
    </tbody>
  </table>

  <h3>3.3. TABLA: requisitos_checklist</h3>
  <table class="content-table">
    <thead>
      <tr>
        <th>Columna</th>
        <th>Tipo de Dato</th>
        <th>Nulo</th>
        <th>Descripción</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td><code>id_requisito</code></td>
        <td>SERIAL PRIMARY KEY</td>
        <td>NO</td>
        <td>Identificador único del requisito normativo.</td>
      </tr>
      <tr>
        <td><code>id_tipo_tramite</code></td>
        <td>INTEGER FK</td>
        <td>NO</td>
        <td>Proceso normativo aplicable (1 a 17).</td>
      </tr>
      <tr>
        <td><code>fase</code></td>
        <td>VARCHAR(30)</td>
        <td>NO</td>
        <td>Fase de revisión: <code>PRESUPUESTO</code> o <code>CONTABILIDAD</code>.</td>
      </tr>
      <tr>
        <td><code>descripcion</code></td>
        <td>TEXT</td>
        <td>NO</td>
        <td>Requisito legal específico (ej. <em>"Acta entrega-recepción debidamente suscrita"</em>).</td>
      </tr>
      <tr>
        <td><code>orden</code></td>
        <td>INTEGER</td>
        <td>SÍ</td>
        <td>Secuencia de presentación en la lista de chequeo oficial.</td>
      </tr>
    </tbody>
  </table>

`;

documents.push({
  id: '02_Diccionario_datos_esquema',
  title: 'DICCIONARIO DE DATOS Y ESQUEMA DE BASE DE DATOS',
  subtitle: 'Modelo Relacional Físico y Reglas de Negocio en PostgreSQL 16',
  meta: { version: '2.0.0 (Producción)', date: 'Octubre de 2026', author: 'Equipo de Datos y Arquitectura de Software' },
  html: doc2Html
});

// ============================================================================
// DOCUMENTO 3: ESQUEMA DE ROLES Y PERMISOS DE USUARIOS
// ============================================================================
const doc3Html = `
  <h2>1. PRINCIPIO INSTITUCIONAL DE CONTROL DE ACCESO (RBAC)</h2>
  <p>
    El sistema implementa un modelo estricto de <strong>Control de Acceso Basado en Roles (RBAC)</strong>. En cumplimiento de las directrices de control interno de la Contraloría General del Estado (CGE), <strong>se prohíben taxativamente las cuentas genéricas o compartidas</strong>; cada funcionario opera con su credencial personal nominativa y únicamente puede ejecutar acciones permitidas para su perfil y departamento.
  </p>

  <h2>2. CATÁLOGO OFICIAL DE LOS 10 ROLES INSTITUCIONALES</h2>
  <table class="content-table">
    <thead>
      <tr>
        <th>ID</th>
        <th>Rol Institucional</th>
        <th>Departamento / Unidad</th>
        <th>Misión Funcional en el Flujo de Control Previo</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td><strong>R1</strong></td>
        <td><strong>Directora Financiera</strong></td>
        <td>Dirección Financiera (DFI)</td>
        <td>Máxima autoridad del control previo. Emite la Autorización Legal de Pago, autoriza derivaciones especiales y aprueba excepciones.</td>
      </tr>
      <tr>
        <td><strong>R2</strong></td>
        <td><strong>Secretaría DFI</strong></td>
        <td>Dirección Financiera (DFI)</td>
        <td>Ventanilla única de ingreso físico. Radica los 8 datos obligatorios de Quipux, folios y realiza la derivación inicial.</td>
      </tr>
      <tr>
        <td><strong>R3</strong></td>
        <td><strong>Jefe de Presupuesto</strong></td>
        <td>DFI - Presupuesto</td>
        <td>Reasigna expedientes por turno o cuantía (>= $10k), emite el Visto Bueno Presupuestario obligatorio para continuar a Contabilidad.</td>
      </tr>
      <tr>
        <td><strong>R4</strong></td>
        <td><strong>Analista de Presupuesto</strong></td>
        <td>DFI - Presupuesto</td>
        <td>Registra el CUR de Compromiso, ítems presupuestarios, evalúa el Checklist de Presupuesto y activa la pausa por falta de factura.</td>
      </tr>
      <tr>
        <td><strong>R5</strong></td>
        <td><strong>Contador General</strong></td>
        <td>DFI - Contabilidad</td>
        <td>Asigna expedientes a analistas contables y emite la Aprobación Contable obligatoria previa a la autorización de pago.</td>
      </tr>
      <tr>
        <td><strong>R6</strong></td>
        <td><strong>Analista Contable</strong></td>
        <td>DFI - Contabilidad</td>
        <td>Liquida retenciones, multas, genera el CUR Devengado / Contable y evalúa el Checklist de la fase contable.</td>
      </tr>
      <tr>
        <td><strong>R7</strong></td>
        <td><strong>Tesorero / Pagos</strong></td>
        <td>DFI - Tesorería</td>
        <td>Registra el lote enviado al Ministerio de Economía y Finanzas (MEF) y el comprobante de transferencia SPI del Banco Central (BCE).</td>
      </tr>
      <tr>
        <td><strong>R8</strong></td>
        <td><strong>Técnico Cobranzas y Garantías</strong></td>
        <td>DFI - Tesorería</td>
        <td>Verifica coactivas, garantías aduaneras y retenciones especiales antes del desembolso efectivo.</td>
      </tr>
      <tr>
        <td><strong>R9</strong></td>
        <td><strong>Custodio de Archivo</strong></td>
        <td>Archivo Pasivo DFI</td>
        <td>Recibe el expediente físico finiquitado y registra la ubicación topográfica permanente (estante, balda, tomo).</td>
      </tr>
      <tr>
        <td><strong>R10</strong></td>
        <td><strong>Administrador de Sistema (TICs)</strong></td>
        <td>Dirección de TICs</td>
        <td>Gestión integral de usuarios, asignación de roles, calendario de feriados nacionales y reglas de campos dinámicos.</td>
      </tr>
    </tbody>
  </table>

  <div class="page-break"></div>

  <h2>3. MATRIZ DE AUTORIZACIÓN Y PERMISOS FUNCIONALES</h2>
  <table class="content-table">
    <thead>
      <tr>
        <th>Operación en el Sistema</th>
        <th>R1 Dir</th>
        <th>R2 Sec</th>
        <th>R3 J.Pres</th>
        <th>R4 A.Pres</th>
        <th>R5 Cont</th>
        <th>R6 A.Cont</th>
        <th>R7 Teso</th>
        <th>R8 Cobr</th>
        <th>R9 Arch</th>
        <th>R10 Adm</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td><strong>Radicación y Creación de Expediente</strong></td>
        <td>SÍ</td>
        <td><span class="badge badge-success">SÍ</span></td>
        <td>NO</td>
        <td>NO</td>
        <td>NO</td>
        <td>NO</td>
        <td>NO</td>
        <td>NO</td>
        <td>NO</td>
        <td>SÍ</td>
      </tr>
      <tr>
        <td><strong>Edición de Datos Generales (Quipux, Monto)</strong></td>
        <td>SÍ</td>
        <td>SÍ</td>
        <td>SÍ</td>
        <td>SÍ</td>
        <td>NO</td>
        <td>NO</td>
        <td>NO</td>
        <td>NO</td>
        <td>NO</td>
        <td><span class="badge badge-primary">SÍ</span></td>
      </tr>
      <tr>
        <td><strong>Reasignación Interna de Expediente</strong></td>
        <td>SÍ</td>
        <td>NO</td>
        <td><span class="badge badge-success">SÍ</span></td>
        <td>NO</td>
        <td><span class="badge badge-success">SÍ</span></td>
        <td>NO</td>
        <td>NO</td>
        <td>NO</td>
        <td>NO</td>
        <td>SÍ</td>
      </tr>
      <tr>
        <td><strong>Registro CUR Compromiso / Partida</strong></td>
        <td>NO</td>
        <td>NO</td>
        <td>SÍ</td>
        <td><span class="badge badge-success">SÍ</span></td>
        <td>NO</td>
        <td>NO</td>
        <td>NO</td>
        <td>NO</td>
        <td>NO</td>
        <td>SÍ</td>
      </tr>
      <tr>
        <td><strong>Visto Bueno Jefe de Presupuesto</strong></td>
        <td>SÍ</td>
        <td>NO</td>
        <td><span class="badge badge-success">SÍ</span></td>
        <td>NO</td>
        <td>NO</td>
        <td>NO</td>
        <td>NO</td>
        <td>NO</td>
        <td>NO</td>
        <td>SÍ</td>
      </tr>
      <tr>
        <td><strong>Pausa / Reanudación de Semáforo SLA</strong></td>
        <td>SÍ</td>
        <td>NO</td>
        <td>SÍ</td>
        <td><span class="badge badge-success">SÍ</span></td>
        <td>NO</td>
        <td>NO</td>
        <td>NO</td>
        <td>NO</td>
        <td>NO</td>
        <td>SÍ</td>
      </tr>
      <tr>
        <td><strong>Evaluación Checklist de Presupuesto</strong></td>
        <td>SÍ</td>
        <td>NO</td>
        <td>SÍ</td>
        <td><span class="badge badge-success">SÍ</span></td>
        <td>NO</td>
        <td>NO</td>
        <td>NO</td>
        <td>NO</td>
        <td>NO</td>
        <td>SÍ</td>
      </tr>
      <tr>
        <td><strong>Registro CUR Devengado / Retenciones</strong></td>
        <td>NO</td>
        <td>NO</td>
        <td>NO</td>
        <td>NO</td>
        <td>SÍ</td>
        <td><span class="badge badge-success">SÍ</span></td>
        <td>NO</td>
        <td>NO</td>
        <td>NO</td>
        <td>SÍ</td>
      </tr>
      <tr>
        <td><strong>Visto Bueno Contador General</strong></td>
        <td>SÍ</td>
        <td>NO</td>
        <td>NO</td>
        <td>NO</td>
        <td><span class="badge badge-success">SÍ</span></td>
        <td>NO</td>
        <td>NO</td>
        <td>NO</td>
        <td>NO</td>
        <td>SÍ</td>
      </tr>
      <tr>
        <td><strong>Evaluación Checklist de Contabilidad</strong></td>
        <td>SÍ</td>
        <td>NO</td>
        <td>NO</td>
        <td>NO</td>
        <td>SÍ</td>
        <td><span class="badge badge-success">SÍ</span></td>
        <td>NO</td>
        <td>NO</td>
        <td>NO</td>
        <td>SÍ</td>
      </tr>
      <tr>
        <td><strong>Autorización Legal de Pago Institucional</strong></td>
        <td><span class="badge badge-danger">SÍ</span></td>
        <td>NO</td>
        <td>NO</td>
        <td>NO</td>
        <td>NO</td>
        <td>NO</td>
        <td>NO</td>
        <td>NO</td>
        <td>NO</td>
        <td>SÍ</td>
      </tr>
      <tr>
        <td><strong>Registro SPI-BCE y Lote MEF</strong></td>
        <td>NO</td>
        <td>NO</td>
        <td>NO</td>
        <td>NO</td>
        <td>NO</td>
        <td>NO</td>
        <td><span class="badge badge-success">SÍ</span></td>
        <td>NO</td>
        <td>NO</td>
        <td>SÍ</td>
      </tr>
      <tr>
        <td><strong>Custodia Pasiva y Ubicación Topográfica</strong></td>
        <td>NO</td>
        <td>NO</td>
        <td>NO</td>
        <td>NO</td>
        <td>NO</td>
        <td>NO</td>
        <td>NO</td>
        <td>NO</td>
        <td><span class="badge badge-success">SÍ</span></td>
        <td>SÍ</td>
      </tr>
      <tr>
        <td><strong>Gestión de Usuarios y Feriados</strong></td>
        <td>NO</td>
        <td>NO</td>
        <td>NO</td>
        <td>NO</td>
        <td>NO</td>
        <td>NO</td>
        <td>NO</td>
        <td>NO</td>
        <td>NO</td>
        <td><span class="badge badge-primary">SÍ</span></td>
      </tr>
    </tbody>
  </table>

  <h2>4. SEGURIDAD DE SESIONES Y PROTECCIÓN DE VULNERABILIDADES</h2>
  <ul>
    <li><strong>Firma Criptográfica HMAC-SHA256:</strong> Cada sesión institucional genera un token criptográfico firmado con la clave maestra <code>AUTH_SECRET</code>.</li>
    <li><strong>Cookies de Sesión Seguras:</strong> El token se almacena en la cookie <code>senae_session</code> con atributos <code>HttpOnly</code>, <code>SameSite=Lax</code> y expiración automática de 7 días.</li>
    <li><strong>Desafío Captcha Anti-Fuerza Bruta:</strong> El acceso exige resolver un desafío visual SVG generado dinámicamente en memoria, impidiendo ataques automatizados por diccionario o bots.</li>
    <li><strong>Interceptación en Edge Middleware:</strong> Ninguna pantalla protegida ni endpoint de la API puede ser consultado sin una sesión institucional válida; las peticiones no autorizadas son redirigidas de inmediato al login.</li>
  </ul>

`;

documents.push({
  id: '03_Roles_permisos_credenciales',
  title: 'ESQUEMA DE ROLES Y PERMISOS DE USUARIOS (RBAC)',
  subtitle: 'Matriz de Autorización, Segregación de Funciones y Seguridad de Sesiones',
  meta: { version: '2.0.0 (Producción)', date: 'Octubre de 2026', author: 'Equipo de Seguridad y Control Interno' },
  html: doc3Html
});

// ============================================================================
// DOCUMENTO 4: ENTREGA DE CREDENCIALES DE ADMINISTRADOR Y BASE DE DATOS
// ============================================================================
const doc4Html = `
  <div class="callout callout-danger">
    <div class="callout-title">🔒 DOCUMENTO CONFIDENCIAL / SEGURIDAD DE LA INFORMACIÓN</div>
    Este documento formal contiene las credenciales de acceso inicial y privilegiado al entorno de producción en Rocky Linux 9 y PostgreSQL 16. Su custodia corresponde exclusivamente al Administrador de TICs y a la Dirección Financiera del SENAE.
  </div>

  <h2>1. ACTA DE ENTREGA - RECEPCIÓN DE CREDENCIALES</h2>
  <table class="content-table">
    <tbody>
      <tr>
        <td style="width: 30%; font-weight: 700; background-color: #f1f5f9;">SISTEMA INSTITUCIONAL</td>
        <td>Sistema de Control Financiero Previo al Pago (SENAE-CFPP v2.0)</td>
      </tr>
      <tr>
        <td style="font-weight: 700; background-color: #f1f5f9;">AMBIENTE OPERATIVO</td>
        <td>Producción Institucional · Servidor Rocky Linux 9 (x86_64)</td>
      </tr>
      <tr>
        <td style="font-weight: 700; background-color: #f1f5f9;">DIRECCIÓN DE ACCESO</td>
        <td>Definida por Infraestructura de TICs (ej. <code>http://&lt;IP_SERVIDOR_ROCKY&gt;</code>)</td>
      </tr>
      <tr>
        <td style="font-weight: 700; background-color: #f1f5f9;">UNIDAD CUSTODIA</td>
        <td>Dirección Financiera (DFI) / Dirección de TICs</td>
      </tr>
      <tr>
        <td style="font-weight: 700; background-color: #f1f5f9;">FECHA DE ENTREGA</td>
        <td>Octubre de 2026</td>
      </tr>
      <tr>
        <td style="font-weight: 700; background-color: #f1f5f9;">CANAL DE ENTREGA DE CLAVES</td>
        <td>Canal institucional cifrado independiente (Sobre cerrado / Gestor de claves)</td>
      </tr>
      <tr>
        <td style="font-weight: 700; background-color: #f1f5f9;">CAMBIO INICIAL OBLIGATORIO</td>
        <td><span class="badge badge-danger">SÍ - OBLIGATORIO EN PRIMER INICIO</span></td>
      </tr>
    </tbody>
  </table>

  <h2>2. CREDENCIALES DEL MOTOR DE BASE DE DATOS (POSTGRESQL 16)</h2>
  
  <h3>2.1. Superusuario del Motor (Administración de Instancia)</h3>
  <ul>
    <li><strong>Host / Servidor:</strong> <code>127.0.0.1</code> (o contenedor <code>senae-db</code>)</li>
    <li><strong>Puerto de escucha:</strong> <code>5432 / TCP</code></li>
    <li><strong>Base de Datos Inicial:</strong> <code>postgres</code></li>
    <li><strong>Usuario Superadministrador:</strong> <code>postgres</code></li>
    <li><strong>Contraseña Inicial Sugerida:</strong> <code>SenaePostgres2026!Prod</code></li>
    <li><strong>Comando de acceso local por consola:</strong> <code>sudo -u postgres psql</code></li>
  </ul>

  <h3>2.2. Usuario de Servicio de Aplicación (Mínimos Privilegios)</h3>
  <ul>
    <li><strong>Base de Datos Operativa:</strong> <code>senae_control_previo</code></li>
    <li><strong>Usuario de Aplicación:</strong> <code>senae_app</code></li>
    <li><strong>Contraseña Inicial de Servicio:</strong> <code>SenaeSecureDb2026#Prod</code></li>
    <li><strong>Cadena de Conexión (DATABASE_URL):</strong><br>
      <code>postgresql://senae_app:SenaeSecureDb2026#Prod@127.0.0.1:5432/senae_control_previo?schema=public</code>
    </li>
  </ul>

  <div class="page-break"></div>

  <h2>3. CREDENCIALES DE ADMINISTRACIÓN FUNCIONAL DE LA APLICACIÓN</h2>
  <p>Cuentas operativas iniciales creadas para la operación institucional:</p>

  <table class="content-table">
    <thead>
      <tr>
        <th>Rol Institucional</th>
        <th>Correo Institucional / Usuario</th>
        <th>Contraseña Inicial</th>
        <th>Nivel de Privilegios</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td><strong>Administrador de Sistemas</strong></td>
        <td><code>admin.financiero@aduana.gob.ec</code></td>
        <td><code>senae2026</code></td>
        <td>Acceso total a usuarios, feriados, campos dinámicos y configuración técnica.</td>
      </tr>
      <tr>
        <td><strong>Directora Financiera</strong></td>
        <td><code>directora.financiera@aduana.gob.ec</code></td>
        <td><code>senae2026</code></td>
        <td>Autorización legal de pagos, devoluciones y derivaciones especiales.</td>
      </tr>
      <tr>
        <td><strong>Secretaría DFI (Ventanilla)</strong></td>
        <td><code>secretaria.dfi@aduana.gob.ec</code></td>
        <td><code>senae2026</code></td>
        <td>Radicación de expedientes, registro de fojas y derivación inicial.</td>
      </tr>
      <tr>
        <td><strong>Jefe de Presupuesto</strong></td>
        <td><code>jefe.presupuesto@aduana.gob.ec</code></td>
        <td><code>senae2026</code></td>
        <td>Reasignación de analistas, visto bueno presupuestario y pausas de semáforo.</td>
      </tr>
      <tr>
        <td><strong>Analista de Presupuesto 1</strong></td>
        <td><code>analista.presupuesto1@aduana.gob.ec</code></td>
        <td><code>senae2026</code></td>
        <td>Registro de CUR Compromiso, partidas y checklist presupuestario.</td>
      </tr>
      <tr>
        <td><strong>Analista de Presupuesto 2</strong></td>
        <td><code>analista.presupuesto2@aduana.gob.ec</code></td>
        <td><code>senae2026</code></td>
        <td>Registro de CUR Compromiso, partidas y checklist presupuestario.</td>
      </tr>
      <tr>
        <td><strong>Contador General</strong></td>
        <td><code>contador.general@aduana.gob.ec</code></td>
        <td><code>senae2026</code></td>
        <td>Aprobación contable previa y asignación de analistas contables.</td>
      </tr>
      <tr>
        <td><strong>Analista Contable 1</strong></td>
        <td><code>analista.contabilidad1@aduana.gob.ec</code></td>
        <td><code>senae2026</code></td>
        <td>Registro de CUR Devengado, retenciones, multas y checklist contable.</td>
      </tr>
      <tr>
        <td><strong>Tesorero / Pagos</strong></td>
        <td><code>tesoreria.pagos@aduana.gob.ec</code></td>
        <td><code>senae2026</code></td>
        <td>Registro de lote MEF y comprobante de transferencia SPI del Banco Central.</td>
      </tr>
      <tr>
        <td><strong>Técnico de Cobranzas</strong></td>
        <td><code>cobranzas.garantias@aduana.gob.ec</code></td>
        <td><code>senae2026</code></td>
        <td>Validación de coactivas y garantías aduaneras.</td>
      </tr>
      <tr>
        <td><strong>Custodio de Archivo</strong></td>
        <td><code>archivo.financiero@aduana.gob.ec</code></td>
        <td><code>senae2026</code></td>
        <td>Recepción definitiva y asignación de estantería, balda y tomo.</td>
      </tr>
    </tbody>
  </table>

  <h2>4. INSTRUCCIONES OBLIGATORIAS DE CAMBIO DE CONTRASEÑA</h2>
  <ol>
    <li>Tras el despliegue en Rocky Linux 9, ingresar a la plataforma con la cuenta de <strong>Administrador de Sistemas</strong>.</li>
    <li>Dirigirse a la opción <strong>Administración</strong> en la barra lateral izquierda y seleccionar <strong>Gestión de Usuarios</strong>.</li>
    <li>Cambiar la contraseña inicial (<code>senae2026</code>) por una contraseña robusta que cumpla con las políticas del EGSI:
      <ul>
        <li>Mínimo 12 caracteres de longitud.</li>
        <li>Combinación obligatoria de mayúsculas, minúsculas, números y caracteres especiales.</li>
      </ul>
    </li>
    <li>Regenerar la clave simétrica <code>AUTH_SECRET</code> en el archivo <code>.env.production</code>:</li>
  </ol>
  <pre><code>openssl rand -hex 32</code></pre>

`;

documents.push({
  id: '04_Entrega_credenciales_administrador',
  title: 'ENTREGA DE CREDENCIALES ADMINISTRATIVAS Y DE BASE DE DATOS',
  subtitle: 'Acta de Entrega de Cuentas Privilegiadas, Parámetros de Conexión y Protocolo de Custodia',
  meta: { version: '2.0.0 (Producción)', date: 'Octubre de 2026', author: 'Dirección de TICs y Seguridad de la Información' },
  html: doc4Html
});

// ============================================================================
// DOCUMENTO 5: MANUAL DE RESPALDO Y RECUPERACIÓN ANTE DESASTRES
// ============================================================================
const doc5Html = `
  <h2>1. POLÍTICA INSTITUCIONAL DE RESPALDO Y CONTINUIDAD</h2>
  <p>
    Para asegurar la continuidad operativa del control previo y salvaguardar la bitácora histórica de pagos ante cualquier contingencia tecnológica, se establece la siguiente política de respaldos:
  </p>
  <ul>
    <li><strong>RPO (Recovery Point Objective):</strong> Máximo 24 horas (pérdida máxima tolerable de datos).</li>
    <li><strong>RTO (Recovery Time Objective):</strong> Máximo 2 horas (tiempo máximo de restablecimiento total del servicio).</li>
    <li><strong>Tipo de Respaldo:</strong> Volcado binario con metadatos completos y compresión (<code>pg_dump -Fc</code>).</li>
    <li><strong>Frecuencia de Ejecución:</strong> Diaria automatizada a las 02:00 AM (horario de baja carga transaccional).</li>
    <li><strong>Periodo de Retención Local:</strong> 30 días calendario en el servidor Rocky Linux 9.</li>
    <li><strong>Verificación Criptográfica:</strong> Generación automática de archivo de suma SHA-256 por cada respaldo.</li>
    <li><strong>Directorio Oficial de Almacenamiento:</strong> <code>/var/backups/senae-postgres/</code></li>
  </ul>

  <h2>2. EJECUCIÓN DE RESPALDOS AUTOMATIZADOS</h2>
  <p>El sistema incluye el script oficial automatizado <code>deploy/rocky/backup-postgres.sh</code>.</p>

  <h3>2.1. Ejecución Manual Inmediata</h3>
  <pre><code>sudo chmod +x /opt/senae-control-previo/deploy/rocky/backup-postgres.sh
sudo /opt/senae-control-previo/deploy/rocky/backup-postgres.sh</code></pre>

  <p>Salida esperada en terminal:</p>
  <pre><code>[2026-10-05 02:00:01] Iniciando respaldo de PostgreSQL 16: senae_control_previo...
[2026-10-05 02:00:04] Respaldo generado: /var/backups/senae-postgres/senae_backup_20261005_020001.dump
[2026-10-05 02:00:04] Suma SHA-256: 7f83b1657ff1fc53b92dc18148a1d65dfc2d4b1fa3d677284addd200126d9069
[2026-10-05 02:00:04] Depuracion de respaldos antiguos (>30 dias) completada exitosamente.</code></pre>

  <h3>2.2. Programación del Respaldo Nocturno en Crontab</h3>
  <pre><code>sudo crontab -e</code></pre>
  <p>Agregar la siguiente directiva:</p>
  <pre><code>0 2 * * * /opt/senae-control-previo/deploy/rocky/backup-postgres.sh >> /var/log/senae-backup.log 2>&1</code></pre>

  <div class="page-break"></div>

  <h2>3. PROCEDIMIENTO DE RECUPERACIÓN (RESTORE) ANTE DESASTRES</h2>
  <p>En caso de fallo de hardware, corrupción de datos o restablecimiento en un servidor de contingencia:</p>

  <h3>Paso 1: Validación Previa de Integridad del Archivo .dump</h3>
  <pre><code>cd /var/backups/senae-postgres/
sha256sum -c senae_backup_20261005_020001.dump.sha256</code></pre>
  <p>La consola debe responder: <code>senae_backup_20261005_020001.dump: La suma coincide (OK)</code>.</p>

  <h3>Paso 2: Ejecución del Script de Restauración Asistida</h3>
  <pre><code>sudo chmod +x /opt/senae-control-previo/deploy/rocky/restore-postgres.sh
sudo /opt/senae-control-previo/deploy/rocky/restore-postgres.sh /var/backups/senae-postgres/senae_backup_20261005_020001.dump</code></pre>

  <p>El script ejecuta automáticamente los siguientes controles de seguridad:</p>
  <ol>
    <li>Detiene el servicio web de la aplicación (<code>systemctl stop senae-control-previo</code>) para evitar escrituras concurrentes.</li>
    <li>Termina todas las sesiones activas conectadas a la base de datos PostgreSQL.</li>
    <li>Aplica el restablecimiento limpio de las tablas (<code>pg_restore --clean --if-exists --no-owner</code>).</li>
    <li>Verifica el conteo de registros e integridad referencial de las tablas principales.</li>
    <li>Reactiva el servicio web institucional (<code>systemctl start senae-control-previo</code>).</li>
  </ol>

  <h2>4. CONSULTAS SQL DE VERIFICACIÓN POST-RESTAURACIÓN</h2>
  <p>Para certificar formalmente que todos los expedientes y trazas históricas fueron recuperados con éxito:</p>
  <pre><code>sudo -u postgres psql -d senae_control_previo -c "
SELECT 
    (SELECT COUNT(*) FROM tramites) AS total_tramites,
    (SELECT COUNT(*) FROM historial_movimientos) AS total_movimientos_bitacora,
    (SELECT COUNT(*) FROM respuestas_checklist) AS total_evaluaciones_checklist,
    (SELECT COUNT(*) FROM usuarios) AS total_usuarios_activos;
"</code></pre>

`;

documents.push({
  id: '05_Manual_respaldo_recuperacion',
  title: 'MANUAL DE POLÍTICA DE RESPALDO Y RECUPERACIÓN ANTE DESASTRES',
  subtitle: 'Procedimiento Operativo de Copias de Seguridad, Integridad Criptográfica y Restauración en PostgreSQL 16',
  meta: { version: '2.0.0 (Producción)', date: 'Octubre de 2026', author: 'Equipo de Operaciones de Base de Datos e Infraestructura' },
  html: doc5Html
});

// ============================================================================
// DOCUMENTO 6: MANUAL DE USUARIO (CON CAPTURAS VISUALES)
// ============================================================================
const doc6Html = `
  <h2>1. INTRODUCCIÓN Y OBJETIVO DE LA APLICACIÓN</h2>
  <p>
    El <strong>Sistema de Control Financiero Previo al Pago (SENAE-CFPP v2.0)</strong> es la solución web institucional desarrollada para digitalizar, transparentar y fiscalizar el ciclo de vida documental y económico de los expedientes de pago del Servicio Nacional de Aduana del Ecuador, desde su recepción física en ventanilla hasta su custodia definitiva en el Archivo Pasivo.
  </p>
  <p>
    El sistema sustituye las bitácoras físicas en papel y garantiza:
  </p>
  <ul>
    <li><strong>Control estricto de tiempos (Semáforo SLA):</strong> Cálculo automático de días laborables descontando fines de semana y feriados nacionales normados.</li>
    <li><strong>Verificación normativa interactiva:</strong> Lista de chequeo digital de los 137 requisitos oficiales clasificados en los 17 tipos de procesos SENAE.</li>
    <li><strong>Trazabilidad inmutable:</strong> Cada movimiento, firma de custodia física, derivación y observación queda registrado con estampa temporal irrevocable.</li>
  </ul>

  <h2>2. ACCESO AL SISTEMA Y AUTENTICACIÓN INSTITUCIONAL</h2>
  <p>
    Para ingresar a la plataforma, abra su navegador web institucional (Google Chrome o Microsoft Edge) e ingrese a la dirección proporcionada por la Dirección de TICs:
  </p>
  <ol>
    <li>En la pantalla de acceso, ingrese su <strong>Correo Electrónico Institucional</strong> o nombre de usuario registrado.</li>
    <li>Digite su <strong>Contraseña</strong> personal.</li>
    <li>Observe el recuadro del <strong>Desafío de Seguridad (Captcha)</strong> y digite en la casilla contigua el código alfanumérico mostrado. Si la imagen resulta ilegible, presione el botón <em>Recargar imagen</em>.</li>
    <li>Haga clic en el botón <strong>Ingresar al Sistema</strong>.</li>
  </ol>

  <div class="figure-container">
    ${imgLogin ? `<img src="${imgLogin}" class="figure-img" alt="Pantalla de Acceso con Captcha" />` : '<p>[Captura Login]</p>'}
    <div class="figure-caption"><strong>Figura 1.</strong> Pantalla de Acceso Institucional y Desafío de Seguridad (Captcha Anti-Automatizado).</div>
  </div>

  <div class="page-break"></div>

  <h2>3. ESCRITORIO INSTITUCIONAL Y BANDEJA DE TRÁMITES</h2>
  <p>
    Al iniciar sesión, el sistema presenta el <strong>Escritorio Institucional</strong>. La barra lateral izquierda fija proporciona acceso directo a los módulos autorizados según el rol del usuario, mostrando en la parte inferior su perfil y el botón de <em>Cerrar Sesión</em>.
  </p>
  <p>
    El área principal exhibe los <strong>Indicadores Clave de Desempeño (KPIs)</strong> y la tabla transaccional de expedientes en custodia activa con su semáforo de vencimiento SLA:
  </p>
  <ul>
    <li>🟢 <strong>Verde (A Tiempo):</strong> El expediente cuenta con margen suficiente dentro de los días laborables reglamentarios.</li>
    <li>🟡 <strong>Amarillo (Alerta Preventiva):</strong> El expediente se encuentra a menos de 2 días de vencer su plazo de fase.</li>
    <li>🔴 <strong>Rojo (Vencido):</strong> El plazo normado ha sido superado y requiere gestión inmediata prioritaria.</li>
  </ul>

  <div class="figure-container">
    ${imgEscritorioTramites ? `<img src="${imgEscritorioTramites}" class="figure-img" alt="Bandeja de Entrada con Trámites" />` : '<p>[Captura Escritorio]</p>'}
    <div class="figure-caption"><strong>Figura 2.</strong> Bandeja General de Trámites en el Escritorio con Semáforos SLA y Filtros por Estado.</div>
  </div>

  <div class="figure-container">
    ${imgDetalleEstados ? `<img src="${imgDetalleEstados}" class="figure-img" alt="Detalle de Estados y Acciones" />` : '<p>[Captura Detalle]</p>'}
    <div class="figure-caption"><strong>Figura 3.</strong> Detalle de Columnas Transaccionales, Insignias de Estado, Montos y Botón de Acción "Revisar".</div>
  </div>

  <div class="page-break"></div>

  <h2>4. MÓDULO DE RECEPCIÓN Y RADICACIÓN FÍSICA</h2>
  <p>
    El personal de <strong>Secretaría DFI</strong> o ventanilla radica el ingreso físico de los expedientes diligenciando los 8 campos reglamentarios:
  </p>
  <ul>
    <li><strong>Tipo de Gestión:</strong> Seleccionar <code>PAGO</code> (con afectación presupuestaria) o <code>EXPEDIENTE</code> (documental).</li>
    <li><strong>Número Quipux:</strong> Código oficial del memorando emitido por el sistema documental gubernamental.</li>
    <li><strong>Proveedor / Beneficiario y RUC:</strong> Razón social y número de identificación del contratista.</li>
    <li><strong>Tipo de Proceso:</strong> Selección de uno de los 17 procesos normativos SENAE.</li>
    <li><strong>Monto Total ($):</strong> Si el valor es mayor o igual a $10.000,00, el sistema activa automáticamente la regla de <strong>Alta Cuantía</strong> y asigna la custodia inicial a la Jefatura de Presupuesto.</li>
    <li><strong>Fojas Físicas:</strong> Conteo foliado de documentos que integran el expediente físico.</li>
  </ul>

  <div class="figure-container">
    ${imgRecepcion ? `<img src="${imgRecepcion}" class="figure-img" alt="Módulo de Recepción" />` : '<p>[Captura Recepción]</p>'}
    <div class="figure-caption"><strong>Figura 4.</strong> Formulario Oficial de Recepción y Radicación Física de Expedientes en Ventanilla DFI.</div>
  </div>

  <div class="page-break"></div>

  <h2>5. REVISIÓN TÉCNICA, CHECKLIST NORMATIVO Y PAUSA DE FACTURA</h2>
  <p>
    Al pulsar el botón <strong>Revisar</strong> en cualquier trámite, el analista asignado accede a la mesa de trabajo del expediente:
  </p>
  <ol>
    <li><strong>Registro de Datos Presupuestarios / Contables:</strong> Diligenciamiento de la Certificación Presupuestaria, Partida, CUR de Compromiso o CUR Devengado.</li>
    <li><strong>Evaluación de Requisitos Normativos:</strong> Cada requisito legal de la lista de chequeo se califica interactivamente con <code>CUMPLE</code>, <code>NO CUMPLE</code> o <code>NO APLICA</code>, indicando el número de foja física donde consta el respaldo.</li>
    <li><strong>Pausa de Semáforo SLA por Factura Faltante:</strong> Si el proveedor aún no entrega la factura física autorizada por el SRI, el analista presiona <em>Pausar por Factura</em>. Esto congela legítimamente el conteo del semáforo legal hasta que la factura sea ingresada.</li>
    <li><strong>Observación Preventiva (Ciclo 72h):</strong> Si existen inconsistencias menores, se emite una observación con plazo perentorio de 72 horas para subsanación interna.</li>
    <li><strong>Devolución Formal Quipux:</strong> Si el expediente presenta incumplimientos insubsanables, se emite memorando formal de devolución a la unidad requirente.</li>
  </ol>

  <div class="figure-container">
    ${imgRevision ? `<img src="${imgRevision}" class="figure-img" alt="Checklist Oficial de Control Previo al Pago" />` : '<p>[Captura Checklist]</p>'}
    <div class="figure-caption"><strong>Figura 5.</strong> Checklist Oficial de Control Previo al Pago (Manual SENAE-ME-3-6-001): Verificación Interactiva de Requisitos (Cumple, No Cumple, No Aplica), Barra de Progreso y Descarga Excel Oficial.</div>
  </div>

  <div class="page-break"></div>

  <h2>6. CONSULTA GENERAL Y SEGUIMIENTO DE EXPEDIENTES</h2>
  <p>
    El módulo <strong>Trámites</strong> permite a todos los funcionarios autorizados buscar y rastrear cualquier expediente histórico o en curso mediante filtros multicriterio por Quipux, beneficiario, estado general, rango de fechas y número de CUR:
  </p>

  <div class="figure-container">
    ${imgTramites ? `<img src="${imgTramites}" class="figure-img" alt="Consulta General de Trámites" />` : '<p>[Captura Consulta]</p>'}
    <div class="figure-caption"><strong>Figura 6.</strong> Módulo de Consulta General, Búsqueda Avanzada y Auditoría Histórica de Expedientes.</div>
  </div>

  <h2>7. TABLERO DE CONTROL EJECUTIVO E INDICADORES SLA</h2>
  <p>
    El módulo <strong>Indicadores</strong> proporciona a la Dirección Financiera y a las Jefaturas métricas en tiempo real sobre el rendimiento operativo de los equipos de trabajo:
  </p>
  <ul>
    <li>Tiempos promedio de despacho por departamento (Presupuesto, Contabilidad, Tesorería).</li>
    <li>Conteo de expedientes al día, en riesgo preventivo y con SLA vencido.</li>
    <li>Carga de trabajo y expedientes asignados por cada analista institucional.</li>
  </ul>

  <div class="figure-container">
    ${imgIndicadores ? `<img src="${imgIndicadores}" class="figure-img" alt="Indicadores SLA" />` : '<p>[Captura Indicadores]</p>'}
    <div class="figure-caption"><strong>Figura 7.</strong> Tablero de Control Ejecutivo con Semáforos de Vencimiento y Tiempos de Respuesta SLA.</div>
  </div>

  <div class="page-break"></div>

  <h2>8. MÓDULO DE ADMINISTRACIÓN DEL SISTEMA</h2>
  <p>
    Exclusivo para el perfil <strong>Administrador de Sistemas (TICs)</strong>:
  </p>
  <ul>
    <li><strong>Gestión de Usuarios y Roles:</strong> Creación, modificación de contraseñas y asignación departamental de los funcionarios.</li>
    <li><strong>Catálogo de Feriados Nacionales:</strong> Registro de los días festivos oficiales del Ecuador para asegurar la exactitud del cálculo de días laborables en el SLA.</li>
    <li><strong>Catálogo de Procesos y Campos Dinámicos:</strong> Mantenimiento de los 17 tipos de procesos y los 137 requisitos documentales.</li>
  </ul>

  <div class="figure-container">
    ${imgAdmin ? `<img src="${imgAdmin}" class="figure-img" alt="Módulo de Administración" />` : '<p>[Captura Administración]</p>'}
    <div class="figure-caption"><strong>Figura 8.</strong> Módulo de Administración: Gestión de Cuentas, Catálogo de Feriados Nacionales y Reglas del Sistema.</div>
  </div>
`;

documents.push({
  id: '06_Manual_usuario',
  title: 'MANUAL DE USUARIO DE LA APLICACIÓN',
  subtitle: 'Guía Operativa Visual para el Control Previo al Pago con Capturas de Pantalla',
  meta: { version: '2.0.0 (Producción)', date: 'Octubre de 2026', author: 'Equipo de Capacitación y Soporte Funcional' },
  html: doc6Html
});

// ============================================================================
// COMPILACIÓN Y GENERACIÓN CON CHROME HEADLESS
// ============================================================================
console.log('--- Generando archivos HTML y PDFs ---');

for (const doc of documents) {
  const htmlContent = wrapHtml(doc.title, doc.subtitle, doc.meta, doc.html);
  const htmlPath = path.join(HTML_DIR, `${doc.id}.html`);
  const pdfPath = path.join(PDF_DIR, `${doc.id}.pdf`);
  const rootPdfPath = path.join(DOCS_DIR, `${doc.id}.pdf`);

  fs.writeFileSync(htmlPath, htmlContent, 'utf-8');
  console.log(`[HTML] Escrito: ${doc.id}.html (${htmlContent.length} bytes)`);

  const fileUrl = `file:///${htmlPath.replace(/\\\\/g, '/')}`;
  const chromeCmd = `${CHROME_PATH} --headless=new --disable-gpu --user-data-dir="${USER_DATA_DIR}" --print-to-pdf="${pdfPath}" "${fileUrl}"`;

  try {
    console.log(`[PDF] Compilando con Chrome: ${doc.id}.pdf ...`);
    execSync(chromeCmd, { stdio: 'inherit' });
    if (fs.existsSync(pdfPath)) {
      const stats = fs.statSync(pdfPath);
      console.log(`[PDF] Éxito: ${doc.id}.pdf (${stats.size} bytes)`);
      // Also copy to root docs/ for immediate access
      fs.copyFileSync(pdfPath, rootPdfPath);
    }
  } catch (err) {
    console.error(`Error generando PDF para ${doc.id}:`, err.message);
  }
}

console.log('\\n=== Resumen de Archivos PDF Generados ===');
fs.readdirSync(PDF_DIR).filter(f => f.endsWith('.pdf')).forEach(f => {
  const p = path.join(PDF_DIR, f);
  console.log(`- ${f}: ${(fs.statSync(p).size / 1024).toFixed(1)} KB`);
});
