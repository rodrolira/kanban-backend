const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Sembrando base de datos...');

  try {
    await prisma.$connect();
    console.log('✅ Conectado a PostgreSQL correctamente');
  } catch (error) {
    console.error('❌ Error conectando a PostgreSQL:', error.message);
    throw error;
  }

  // Crear usuario admin
  const hashedPassword = await bcrypt.hash('admin123', 10);

  const admin = await prisma.user.upsert({
    where: { email: 'admin@kanban.com' },
    update: {},
    create: {
      email: 'admin@kanban.com',
      password: hashedPassword,
      name: 'Administrador',
      role: 'ADMIN',
    },
  });

  console.log('✅ Usuario admin creado:', admin.email);

  // Verificar si ya existe un tablero
  const existingBoard = await prisma.board.findFirst({
    where: { ownerId: admin.id },
  });

  if (!existingBoard) {
    const demoBoard = await prisma.board.create({
      data: {
        name: 'Mi Primer Tablero',
        ownerId: admin.id,
        columns: {
          create: [
            { title: 'To Do', order: 0 },
            { title: 'In Progress', order: 1 },
            { title: 'Done', order: 2 },
          ],
        },
      },
      include: {
        columns: true,
      },
    });

    console.log('✅ Tablero demo creado:', demoBoard.name);
    console.log('📋 Columnas:', demoBoard.columns.map(c => c.title).join(', '));
    
    // Crear tarea de ejemplo
    const todoColumn = demoBoard.columns.find(c => c.title === 'To Do');
    if (todoColumn) {
      await prisma.task.create({
        data: {
          title: 'Aprender Prisma',
          description: 'Entender cómo funciona el ORM',
          order: 0,
          columnId: todoColumn.id,
        },
      });
      console.log('✅ Tarea de ejemplo creada');
    }
  } else {
    console.log('ℹ️ El tablero demo ya existe');
  }
  
  console.log('\n🎉 Seed completado!');
}

main()
  .catch((e) => {
    console.error('\n❌ Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });