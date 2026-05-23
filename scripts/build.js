const { execSync } = require('child_process');
const fs = require('fs');

console.log('🔨 Iniciando build de producción...');

// 1. Limpiar build anterior
if (fs.existsSync('./dist')) {
  console.log('🧹 Limpiando build anterior...');
  execSync('rm -rf dist');
}

// 2. Generar Prisma Client
console.log('📦 Generando Prisma Client...');
execSync('npx prisma generate', { stdio: 'inherit' });

// 3. Compilar TypeScript
console.log('🔧 Compilando TypeScript...');
execSync('tsc --project tsconfig.build.json', { stdio: 'inherit' });

// 4. Validar que los archivos se crearon
if (!fs.existsSync('./dist/server.js')) {
  console.error('❌ Error: No se encontró server.js en dist/');
  process.exit(1);
}

console.log('✅ Build completado exitosamente!');
console.log('🚀 Para iniciar el servidor: npm start');