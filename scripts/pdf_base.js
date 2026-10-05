/**
 * Generador Oficial de Documentación Técnica en PDF para SENAE
 * Sistema de Control Financiero Previo al Pago v2.0
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const CHROME_PATH = '"C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe"';
const USER_DATA_DIR = 'C:\\Users\\PC\\AppData\\Local\\Temp\\chrome_temp_pdf';

const DOCS_DIR = path.resolve(__dirname, '../docs');
const IMG_DIR = path.join(DOCS_DIR, 'img');
const HTML_DIR = path.join(DOCS_DIR, 'html');
const PDF_DIR = path.join(DOCS_DIR, 'pdf');

[HTML_DIR, PDF_DIR].forEach(dir => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

// Helper: Convert image to base64
function getBase64Image(filePath) {
  if (!fs.existsSync(filePath)) return '';
  const ext = path.extname(filePath).replace('.', '');
  const mime = ext === 'svg' ? 'image/svg+xml' : `image/${ext}`;
  const data = fs.readFileSync(filePath).toString('base64');
  return `data:${mime};base64,${data}`;
}

const logoBase64 = getBase64Image(path.resolve(__dirname, '../public/logo-senae.png'));

// Load screenshots
const imgLogin = getBase64Image(path.join(IMG_DIR, 'figura_01_acceso_login.png'));
const imgEscritorio = getBase64Image(path.join(IMG_DIR, 'figura_02_bandeja_escritorio.png'));
const imgEscritorioTramites = getBase64Image(path.join(IMG_DIR, 'figura_02b_bandeja_con_tramites.png'));
const imgDetalleEstados = getBase64Image(path.join(IMG_DIR, 'figura_02c_detalle_estados_y_acciones.png'));
const imgRevision = getBase64Image(path.join(IMG_DIR, 'figura_02d_revision_documental.png'));
const imgRecepcion = getBase64Image(path.join(IMG_DIR, 'figura_03_recepcion_radicacion.png'));
const imgIndicadores = getBase64Image(path.join(IMG_DIR, 'figura_04_indicadores_sla.png'));
const imgAdmin = getBase64Image(path.join(IMG_DIR, 'figura_05_modulo_administracion.png'));
const imgTramites = getBase64Image(path.join(IMG_DIR, 'figura_06_consulta_tramites.png'));

// Base CSS Styles for Institutional SENAE documents
const baseStyles = `
  @page {
    size: A4;
    margin: 18mm 16mm 20mm 16mm;
    @bottom-right {
      content: "Página " counter(page);
      font-size: 8pt;
      font-family: 'Segoe UI', Arial, sans-serif;
      color: #64748b;
    }
    @bottom-left {
      content: "SENAE · Control Financiero Previo al Pago v2.0 - Confidencial";
      font-size: 8pt;
      font-family: 'Segoe UI', Arial, sans-serif;
      color: #64748b;
    }
  }

  * {
    box-sizing: border-box;
    -webkit-print-color-adjust: exact !important;
    print-color-adjust: exact !important;
  }

  body {
    font-family: 'Segoe UI', -apple-system, BlinkMacSystemFont, Roboto, Helvetica, Arial, sans-serif;
    color: #1e293b;
    line-height: 1.5;
    font-size: 10pt;
    margin: 0;
    padding: 0;
    background-color: #ffffff;
  }

  /* Header banner */
  .doc-header {
    border-bottom: 2.5px solid #002855;
    padding-bottom: 12px;
    margin-bottom: 24px;
    display: flex;
    align-items: center;
    justify-content: space-between;
  }

  .header-left {
    display: flex;
    align-items: center;
    gap: 16px;
  }

  .header-logo {
    height: 48px;
    width: auto;
    object-fit: contain;
  }

  .header-text {
    border-left: 2px solid #cbd5e1;
    padding-left: 14px;
  }

  .institution-name {
    font-size: 11pt;
    font-weight: 800;
    color: #002855;
    letter-spacing: 0.5px;
    text-transform: uppercase;
  }

  .sub-institution {
    font-size: 8.5pt;
    font-weight: 600;
    color: #64748b;
    letter-spacing: 0.3px;
  }

  .header-right {
    text-align: right;
  }

  .badge-system {
    display: inline-block;
    background-color: #f1f5f9;
    border: 1px solid #cbd5e1;
    color: #002855;
    font-size: 7.5pt;
    font-weight: 700;
    padding: 3px 8px;
    border-radius: 4px;
    text-transform: uppercase;
  }

  .doc-title-box {
    background: linear-gradient(135deg, #002855 0%, #0d3b66 100%);
    color: #ffffff;
    padding: 22px 24px;
    border-radius: 8px;
    margin-bottom: 24px;
    box-shadow: 0 4px 6px -1px rgba(0, 40, 85, 0.1);
  }

  .doc-title-box h1 {
    margin: 0 0 6px 0;
    font-size: 18pt;
    font-weight: 800;
    letter-spacing: -0.3px;
    color: #ffffff;
  }

  .doc-title-box .subtitle {
    margin: 0;
    font-size: 10pt;
    color: #cbd5e1;
    font-weight: 400;
  }

  /* Metadata Card */
  .meta-table {
    width: 100%;
    border-collapse: collapse;
    margin-bottom: 24px;
    font-size: 8.5pt;
    background-color: #f8fafc;
    border: 1px solid #e2e8f0;
    border-radius: 6px;
    overflow: hidden;
  }

  .meta-table td {
    padding: 7px 12px;
    border-bottom: 1px solid #e2e8f0;
  }

  .meta-table tr:last-child td {
    border-bottom: none;
  }

  .meta-table .label {
    font-weight: 700;
    color: #475569;
    width: 25%;
    background-color: #f1f5f9;
  }

  .meta-table .val {
    color: #0f172a;
    font-weight: 500;
  }

  /* Typography */
  h2 {
    color: #002855;
    font-size: 13pt;
    font-weight: 800;
    margin-top: 26px;
    margin-bottom: 10px;
    padding-bottom: 4px;
    border-bottom: 1.5px solid #e2e8f0;
    page-break-after: avoid;
  }

  h3 {
    color: #1e3a8a;
    font-size: 10.5pt;
    font-weight: 700;
    margin-top: 18px;
    margin-bottom: 8px;
    page-break-after: avoid;
  }

  h4 {
    color: #334155;
    font-size: 9.5pt;
    font-weight: 700;
    margin-top: 14px;
    margin-bottom: 6px;
    page-break-after: avoid;
  }

  p {
    margin: 0 0 10px 0;
    text-align: justify;
  }

  ul, ol {
    margin: 0 0 12px 0;
    padding-left: 20px;
  }

  li {
    margin-bottom: 4px;
  }

  /* Standard Tables */
  table.content-table {
    width: 100%;
    border-collapse: collapse;
    margin: 14px 0 20px 0;
    font-size: 8.5pt;
    page-break-inside: auto;
  }

  table.content-table thead {
    background-color: #002855;
    color: #ffffff;
  }

  table.content-table th {
    padding: 8px 10px;
    text-align: left;
    font-weight: 700;
    font-size: 8pt;
    text-transform: uppercase;
    letter-spacing: 0.3px;
    border: 1px solid #002855;
  }

  table.content-table td {
    padding: 7px 10px;
    border: 1px solid #cbd5e1;
    vertical-align: top;
  }

  table.content-table tbody tr:nth-child(even) {
    background-color: #f8fafc;
  }

  table.content-table tbody tr:hover {
    background-color: #f1f5f9;
  }

  /* Badges & Tags */
  .badge {
    display: inline-block;
    padding: 2px 6px;
    border-radius: 4px;
    font-size: 7.5pt;
    font-weight: 700;
    text-transform: uppercase;
  }

  .badge-primary { background-color: #dbeafe; color: #1e40af; border: 1px solid #bfdbfe; }
  .badge-success { background-color: #dcfce7; color: #166534; border: 1px solid #bbf7d0; }
  .badge-warning { background-color: #fef9c3; color: #854d0e; border: 1px solid #fef08a; }
  .badge-danger  { background-color: #fee2e2; color: #991b1b; border: 1px solid #fecaca; }
  .badge-neutral { background-color: #f1f5f9; color: #475569; border: 1px solid #e2e8f0; }

  /* Callout boxes */
  .callout {
    padding: 12px 16px;
    border-radius: 6px;
    margin: 14px 0;
    font-size: 9pt;
    page-break-inside: avoid;
  }

  .callout-info {
    background-color: #eff6ff;
    border-left: 4px solid #2563eb;
    color: #1e3a8a;
  }

  .callout-warning {
    background-color: #fffbeb;
    border-left: 4px solid #f59e0b;
    color: #92400e;
  }

  .callout-danger {
    background-color: #fef2f2;
    border-left: 4px solid #ef4444;
    color: #991b1b;
  }

  .callout-title {
    font-weight: 800;
    font-size: 9.5pt;
    margin-bottom: 4px;
    display: flex;
    align-items: center;
    gap: 6px;
  }

  /* Code & Terminal Blocks */
  pre {
    background-color: #0f172a;
    color: #f8fafc;
    padding: 12px 14px;
    border-radius: 6px;
    font-family: 'Consolas', 'Courier New', monospace;
    font-size: 8pt;
    line-height: 1.45;
    overflow-x: auto;
    margin: 10px 0 16px 0;
    border: 1px solid #1e293b;
    page-break-inside: avoid;
  }

  code {
    font-family: 'Consolas', 'Courier New', monospace;
    font-size: 8.5pt;
    background-color: #f1f5f9;
    color: #0f172a;
    padding: 2px 5px;
    border-radius: 4px;
    border: 1px solid #e2e8f0;
  }

  pre code {
    background: none;
    color: inherit;
    padding: 0;
    border: none;
  }

  /* Figure and screenshots */
  .figure-container {
    margin: 20px 0 24px 0;
    border: 1px solid #cbd5e1;
    border-radius: 8px;
    padding: 10px;
    background-color: #ffffff;
    box-shadow: 0 2px 5px rgba(0,0,0,0.06);
    page-break-inside: avoid;
    text-align: center;
  }

  .figure-img {
    max-width: 100%;
    height: auto;
    border-radius: 6px;
    border: 1px solid #e2e8f0;
    display: block;
    margin: 0 auto;
  }

  .figure-caption {
    margin-top: 10px;
    font-size: 8.5pt;
    font-weight: 600;
    color: #475569;
    text-align: center;
  }

  .figure-caption strong {
    color: #002855;
  }

  /* Signatures section */
  .signature-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 24px;
    margin-top: 36px;
    page-break-inside: avoid;
  }

  .signature-box {
    border: 1px dashed #94a3b8;
    border-radius: 6px;
    padding: 18px 14px;
    text-align: center;
    background-color: #fafaf9;
  }

  .signature-line {
    width: 80%;
    margin: 40px auto 8px auto;
    border-top: 1.5px solid #475569;
  }

  .signature-name {
    font-weight: 700;
    font-size: 9pt;
    color: #0f172a;
  }

  .signature-role {
    font-size: 8pt;
    color: #64748b;
  }

  .page-break {
    page-break-before: always;
  }
`;

function wrapHtml(title, subtitle, meta, contentHtml) {
  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>${title} - SENAE</title>
  <style>
    ${baseStyles}
  </style>
</head>
<body>
  <!-- Header -->
  <div class="doc-header">
    <div class="header-left">
      ${logoBase64 ? `<img src="${logoBase64}" alt="SENAE Logo" class="header-logo" />` : ''}
      <div class="header-text">
        <div class="institution-name">Servicio Nacional de Aduana del Ecuador</div>
        <div class="sub-institution">Dirección Financiera · Departamento de Control Previo</div>
      </div>
    </div>
    <div class="header-right">
      <div class="badge-system">SISTEMA CFPP v2.0</div>
    </div>
  </div>

  <!-- Title Card -->
  <div class="doc-title-box">
    <h1>${title}</h1>
    <div class="subtitle">${subtitle}</div>
  </div>

  <!-- Metadata Table -->
  <table class="meta-table">
    <tr>
      <td class="label">SISTEMA:</td>
      <td class="val">Control Financiero Previo al Pago (SENAE-CFPP)</td>
      <td class="label">VERSIÓN:</td>
      <td class="val">${meta.version || '2.0.0 (Producción)'}</td>
    </tr>
    <tr>
      <td class="label">AMBIENTE OBJETIVO:</td>
      <td class="val">Rocky Linux 9 (x86_64) + PostgreSQL 16</td>
      <td class="label">FECHA DE EMISIÓN:</td>
      <td class="val">${meta.date || 'Octubre de 2026'}</td>
    </tr>
    <tr>
      <td class="label">ELABORADO POR:</td>
      <td class="val">${meta.author || 'Equipo Técnico de Desarrollo y Arquitectura'}</td>
      <td class="label">DESTINATARIO:</td>
      <td class="val">Dirección de TICs y Dirección Financiera SENAE</td>
    </tr>
  </table>

  <!-- Body Content -->
  <div class="doc-body">
    ${contentHtml}
  </div>
</body>
</html>`;
}

console.log('Inicializando generador de documentos técnicos SENAE...');

module.exports = {
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
};
