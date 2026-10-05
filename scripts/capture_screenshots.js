const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const chromePath = '"C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe"';
const userData = 'C:\\Users\\PC\\AppData\\Local\\Temp\\chrome_temp';
const baseDir = path.resolve(__dirname, '../docs/img');

if (!fs.existsSync(baseDir)) {
  fs.mkdirSync(baseDir, { recursive: true });
}

const pages = [
  { url: 'http://localhost:3000/login', name: 'figura_01_acceso_login.png' },
  { url: 'http://localhost:3000/escritorio?doc_preview=1', name: 'figura_02_bandeja_escritorio.png' },
  { url: 'http://localhost:3000/recepcion?doc_preview=1', name: 'figura_03_recepcion_radicacion.png' },
  { url: 'http://localhost:3000/indicadores?doc_preview=1', name: 'figura_04_indicadores_sla.png' },
  { url: 'http://localhost:3000/administracion?doc_preview=1', name: 'figura_05_modulo_administracion.png' },
  { url: 'http://localhost:3000/tramites?doc_preview=1', name: 'figura_06_consulta_tramites.png' },
];

for (const p of pages) {
  const outPath = path.join(baseDir, p.name);
  console.log(`Capturing: ${p.url} -> ${p.name}`);
  try {
    const cmd = `${chromePath} --headless=new --disable-gpu --user-data-dir="${userData}" --screenshot="${outPath}" --window-size=1440,900 "${p.url}"`;
    execSync(cmd, { stdio: 'inherit' });
  } catch (err) {
    console.error(`Error capturing ${p.url}:`, err.message);
  }
}

// Copy user uploaded real-data screenshots as well for rich presentation
const uploadsDir = 'C:\\Users\\PC\\.gemini\\antigravity\\brain\\d516f5ce-b42e-4b4a-a01d-6ca05ff4e6ce\\.user_uploaded';
if (fs.existsSync(uploadsDir)) {
  const uploadFiles = [
    { src: 'media_1791177977862.png', dest: 'figura_02b_bandeja_con_tramites.png' },
    { src: 'media_1791176610113.png', dest: 'figura_02c_detalle_estados_y_acciones.png' },
    { src: 'media_1791177578290.png', dest: 'figura_02d_revision_documental.png' },
  ];
  for (const f of uploadFiles) {
    const srcPath = path.join(uploadsDir, f.src);
    const destPath = path.join(baseDir, f.dest);
    if (fs.existsSync(srcPath)) {
      fs.copyFileSync(srcPath, destPath);
      console.log(`Copied ${f.src} -> ${f.dest}`);
    }
  }
}

console.log('Capture complete! Files in docs/img:');
console.log(fs.readdirSync(baseDir));
