const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

let target = process.argv[2]?.toLowerCase();
if (target === 'postgresql') target = 'postgres';

if (!target || !['postgres', 'mysql', 'sqlite'].includes(target)) {
  console.log('Uso: node scripts/switch-db.js [postgres|postgresql|mysql|sqlite]');
  process.exit(1);
}

const root = path.resolve(__dirname, '..');
const currentSchema = path.join(root, 'prisma', 'schema.prisma');
const pgSchema = fs.existsSync(path.join(root, 'prisma', 'deploy_schemas', 'schema.postgresql.prisma'))
  ? path.join(root, 'prisma', 'deploy_schemas', 'schema.postgresql.prisma')
  : path.join(root, 'prisma', 'schema.postgresql.prisma');
const mysqlSchema = fs.existsSync(path.join(root, 'prisma', 'deploy_schemas', 'schema.mysql.prisma'))
  ? path.join(root, 'prisma', 'deploy_schemas', 'schema.mysql.prisma')
  : path.join(root, 'prisma', 'schema.mysql.prisma');
const sqliteSchema = fs.existsSync(path.join(root, 'prisma', 'deploy_schemas', 'schema.sqlite.prisma'))
  ? path.join(root, 'prisma', 'deploy_schemas', 'schema.sqlite.prisma')
  : path.join(root, 'prisma', 'schema.sqlite.prisma');

if (target === 'postgres') {
  console.log('🔄 Cambiando proveedor de base de datos a PostgreSQL 16...');
  if (!fs.existsSync(pgSchema)) {
    console.error('❌ No se encontró prisma/deploy_schemas/schema.postgresql.prisma');
    process.exit(1);
  }
  fs.copyFileSync(pgSchema, currentSchema);
  console.log('✅ prisma/schema.prisma actualizado correctamente para PostgreSQL 16.');
} else if (target === 'sqlite') {
  console.log('🔄 Cambiando proveedor de base de datos a SQLite (Desarrollo local autónomo)...');
  if (!fs.existsSync(sqliteSchema)) {
    console.error('❌ No se encontró prisma/deploy_schemas/schema.sqlite.prisma');
    process.exit(1);
  }
  fs.copyFileSync(sqliteSchema, currentSchema);
  console.log('✅ prisma/schema.prisma actualizado correctamente para SQLite.');
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
  execSync('npx prisma generate', { stdio: 'inherit', cwd: root });
  console.log('✨ Prisma Client generado correctamente para ' + target.toUpperCase());
} catch (e) {
  console.error('❌ Error generando Prisma Client:', e.message);
  process.exit(1);
}
