/**
 * Script de empaquetado para entrega técnica oficial SENAE
 * Genera senae_control_previo_v2_rocky9.zip excluyendo .next, node_modules y .git
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const rootDir = path.resolve(__dirname, '..');
const zipName = 'senae_control_previo_v2_rocky9.zip';
const zipPath = path.join(rootDir, zipName);

// Temp staging directory
const stageDir = path.join(rootDir, '.delivery_staging');
if (fs.existsSync(stageDir)) {
  fs.rmSync(stageDir, { recursive: true, force: true });
}
fs.mkdirSync(stageDir, { recursive: true });

const itemsToCopy = [
  'src',
  'public',
  'prisma',
  'deploy',
  'scripts',
  'docs',
  'package.json',
  'package-lock.json',
  'tsconfig.json',
  'tailwind.config.ts',
  'postcss.config.js',
  'next.config.js',
  'Dockerfile',
  'compose.yaml',
  '.dockerignore',
  '.env.production.example',
  'README.md'
];

function copyRecursive(src, dest) {
  if (!fs.existsSync(src)) return;
  const stat = fs.statSync(src);
  if (stat.isDirectory()) {
    fs.mkdirSync(dest, { recursive: true });
    for (const child of fs.readdirSync(src)) {
      // Exclude temp files or logs
      if (child.startsWith('.git') || child === 'node_modules' || child === '.next') continue;
      copyRecursive(path.join(src, child), path.join(dest, child));
    }
  } else {
    fs.copyFileSync(src, dest);
  }
}

console.log('--- Preparando paquete de entrega en staging ---');
for (const item of itemsToCopy) {
  const srcPath = path.join(rootDir, item);
  const destPath = path.join(stageDir, item);
  if (fs.existsSync(srcPath)) {
    console.log(`Copiando: ${item}`);
    copyRecursive(srcPath, destPath);
  }
}

// Remove old zip if exists
if (fs.existsSync(zipPath)) {
  fs.unlinkSync(zipPath);
}

// Create zip using PowerShell Compress-Archive
console.log('--- Comprimiendo senae_control_previo_v2_rocky9.zip ---');
const psCmd = `powershell -Command "Compress-Archive -Path '${stageDir}\\*' -DestinationPath '${zipPath}' -Force -CompressionLevel Optimal"`;
execSync(psCmd, { stdio: 'inherit' });

// Clean up staging
fs.rmSync(stageDir, { recursive: true, force: true });

const zipStats = fs.statSync(zipPath);
console.log(`\nPaquete de entrega creado exitosamente:`);
console.log(`Archivo: ${zipName}`);
console.log(`Tamaño: ${(zipStats.size / (1024 * 1024)).toFixed(2)} MB (${zipStats.size} bytes)`);
