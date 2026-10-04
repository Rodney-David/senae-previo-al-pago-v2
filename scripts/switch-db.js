const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const target = process.argv[2]?.toLowerCase();

if (!target || !['postgres', 'mysql'].includes(target)) {
  console.log('Uso: node scripts/switch-db.js [postgres|mysql]');
  process.exit(1);
}

const root = process.cwd();
const currentSchema = path.join(root, 'prisma', 'schema.prisma');
const pgSchema = path.join(root, 'prisma', 'schema.postgresql.prisma');

if (target === 'postgres') {
  console.log('🔄 Cambiando proveedor de base de datos a PostgreSQL 16...');
  if (!fs.existsSync(pgSchema)) {
    console.error('No se encontró prisma/schema.postgresql.prisma');
    process.exit(1);
  }
  fs.copyFileSync(pgSchema, currentSchema);
  console.log('✅ prisma/schema.prisma actualizado para PostgreSQL.');
} else {
  console.log('🔄 Restaurando proveedor de base de datos a MySQL...');
  // Cambiar provider a mysql
  let content = fs.readFileSync(currentSchema, 'utf-8');
  content = content.replace('provider = "postgresql"', 'provider = "mysql"');
  fs.writeFileSync(currentSchema, content, 'utf-8');
  console.log('✅ prisma/schema.prisma actualizado para MySQL.');
}

console.log('⚙️ Ejecutando npx prisma generate...');
try {
  execSync('npx prisma generate', { stdio: 'inherit' });
  console.log('✨ Prisma Client generado correctamente para ' + target.toUpperCase());
} catch (e) {
  console.error('Error generando Prisma Client:', e.message);
}
