const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const target = process.argv[2]?.toLowerCase();

if (!target || !['postgres', 'mysql', 'sqlite'].includes(target)) {
  console.log('Uso: node scripts/switch-db.js [postgres|mysql|sqlite]');
  process.exit(1);
}

const root = process.cwd();
const currentSchema = path.join(root, 'prisma', 'schema.prisma');
const pgSchema = path.join(root, 'prisma', 'schema.postgresql.prisma');
const mysqlSchema = path.join(root, 'prisma', 'schema.mysql.prisma');
const sqliteSchema = path.join(root, 'prisma', 'schema.sqlite.prisma');

if (target === 'postgres') {
  console.log('🔄 Cambiando proveedor de base de datos a PostgreSQL 16...');
  if (!fs.existsSync(pgSchema)) {
    console.error('No se encontró prisma/schema.postgresql.prisma');
    process.exit(1);
  }
  fs.copyFileSync(pgSchema, currentSchema);
  console.log('✅ prisma/schema.prisma actualizado para PostgreSQL.');
} else if (target === 'sqlite') {
  console.log('🔄 Cambiando proveedor de base de datos a SQLite (Desarrollo local autónomo)...');
  if (!fs.existsSync(sqliteSchema)) {
    console.error('No se encontró prisma/schema.sqlite.prisma');
    process.exit(1);
  }
  fs.copyFileSync(sqliteSchema, currentSchema);
  console.log('✅ prisma/schema.prisma actualizado para SQLite.');
} else {
  console.log('🔄 Cambiando proveedor de base de datos a MySQL...');
  if (fs.existsSync(mysqlSchema)) {
    fs.copyFileSync(mysqlSchema, currentSchema);
  } else {
    let content = fs.readFileSync(currentSchema, 'utf-8');
    content = content.replace(/provider\s*=\s*"(postgresql|sqlite)"/, 'provider = "mysql"');
    fs.writeFileSync(currentSchema, content, 'utf-8');
  }
  console.log('✅ prisma/schema.prisma actualizado para MySQL.');
}

console.log('⚙️ Ejecutando npx prisma generate...');
try {
  execSync('npx prisma generate', { stdio: 'inherit' });
  console.log('✨ Prisma Client generado correctamente para ' + target.toUpperCase());
} catch (e) {
  console.error('Error generando Prisma Client:', e.message);
}
