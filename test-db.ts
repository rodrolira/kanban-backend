import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function test() {
  // Obtener todos los usuarios
  const users = await prisma.user.findMany();
  console.log('Usuarios:', users);

  // Obtener tableros con sus columnas
  const boards = await prisma.board.findMany({
    include: {
      columns: {
        include: {
          tasks: true,
        },
      },
    },
  });
  console.log('Tableros:', JSON.stringify(boards, null, 2));
}

test()
  .catch(console.error)
  .finally(() => prisma.$disconnect());