const fs = require("fs");
const path = require("path");

const ROOT_DIR = path.resolve(__dirname, "..");
const OUTPUT_FILE = path.join(ROOT_DIR, "PROYECTO_COMPLETO_SENAE.txt");

// Directorios y archivos a excluir
const EXCLUDE_DIRS = new Set([
  "node_modules",
  ".next",
  ".git",
  ".gemini",
  "dist",
  "build",
  "coverage",
]);

const EXCLUDE_FILES = new Set([
  "package-lock.json",
  "yarn.lock",
  "pnpm-lock.yaml",
  ".env",
  ".env.local",
  ".env.production",
  "PROYECTO_COMPLETO_SENAE.txt",
  "PROYECTO_COMPLETO_SENAE.md",
  "empaquetar_proyecto.js",
]);

// Extensiones permitidas (código y especificaciones de texto)
const ALLOWED_EXTENSIONS = new Set([
  ".ts",
  ".tsx",
  ".js",
  ".jsx",
  ".json",
  ".prisma",
  ".sql",
  ".css",
  ".md",
]);

let totalFiles = 0;
let totalLines = 0;

function getAllFiles(dirPath, arrayOfFiles = []) {
  const entries = fs.readdirSync(dirPath, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dirPath, entry.name);
    const relPath = path.relative(ROOT_DIR, fullPath).replace(/\\/g, "/");

    if (entry.isDirectory()) {
      if (!EXCLUDE_DIRS.has(entry.name)) {
        getAllFiles(fullPath, arrayOfFiles);
      }
    } else {
      if (!EXCLUDE_FILES.has(entry.name)) {
        const ext = path.extname(entry.name).toLowerCase();
        if (ALLOWED_EXTENSIONS.has(ext)) {
          arrayOfFiles.push(fullPath);
        }
      }
    }
  }

  return arrayOfFiles;
}

console.log("Recopilando archivos del proyecto...");
const files = getAllFiles(ROOT_DIR);

// Ordenar archivos alfabéticamente para orden lógico
files.sort((a, b) => {
  const relA = path.relative(ROOT_DIR, a);
  const relB = path.relative(ROOT_DIR, b);
  return relA.localeCompare(relB);
});

const writeStream = fs.createWriteStream(OUTPUT_FILE, { encoding: "utf8" });

writeStream.write(`================================================================================\n`);
writeStream.write(`PROYECTO SENAE CONTROL PREVIO AL PAGO v2.0 - CÓDIGO FUENTE UNIFICADO\n`);
writeStream.write(`Fecha de generación: ${new Date().toISOString()}\n`);
writeStream.write(`Total de archivos empaquetados: ${files.length}\n`);
writeStream.write(`================================================================================\n\n`);

for (const filePath of files) {
  const relPath = path.relative(ROOT_DIR, filePath).replace(/\\/g, "/");
  try {
    const content = fs.readFileSync(filePath, "utf8");
    const lines = content.split("\n").length;
    totalFiles++;
    totalLines += lines;

    writeStream.write(`\n--------------------------------------------------------------------------------\n`);
    writeStream.write(`--- FILE: ${relPath} (${lines} líneas) ---\n`);
    writeStream.write(`--------------------------------------------------------------------------------\n\n`);
    writeStream.write(content);
    writeStream.write(`\n`);
  } catch (err) {
    console.error(`Error leyendo ${relPath}:`, err.message);
  }
}

writeStream.end(() => {
  const stats = fs.statSync(OUTPUT_FILE);
  const sizeMb = (stats.size / (1024 * 1024)).toFixed(2);
  console.log(`\n¡Empaquetado exitoso!`);
  console.log(`- Archivo destino: ${OUTPUT_FILE}`);
  console.log(`- Total archivos: ${totalFiles}`);
  console.log(`- Total líneas: ${totalLines.toLocaleString()}`);
  console.log(`- Tamaño archivo: ${sizeMb} MB`);
});
