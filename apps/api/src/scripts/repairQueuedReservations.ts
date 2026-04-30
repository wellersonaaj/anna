import { PrismaClient } from "@prisma/client";
import { itemStatus } from "@anna/shared";

const prisma = new PrismaClient();

const main = async () => {
  const items = await prisma.peca.findMany({
    where: {
      status: itemStatus.DISPONIVEL,
      filaInteressados: {
        some: {}
      }
    },
    include: {
      filaInteressados: {
        orderBy: { posicao: "asc" },
        take: 1
      }
    }
  });

  let repaired = 0;

  for (const item of items) {
    const firstEntry = item.filaInteressados[0];
    if (!firstEntry) {
      continue;
    }

    await prisma.$transaction(async (tx) => {
      await tx.peca.update({
        where: { id: item.id },
        data: { status: itemStatus.RESERVADO }
      });

      const existingHistory = await tx.pecaStatusHistorico.findFirst({
        where: {
          pecaId: item.id,
          status: itemStatus.RESERVADO,
          clienteId: firstEntry.clienteId
        }
      });

      if (!existingHistory) {
        await tx.pecaStatusHistorico.create({
          data: {
            pecaId: item.id,
            clienteId: firstEntry.clienteId,
            status: itemStatus.RESERVADO
          }
        });
      }
    });

    repaired += 1;
  }

  console.log(`Repaired queued reservations: ${repaired}`);
};

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
