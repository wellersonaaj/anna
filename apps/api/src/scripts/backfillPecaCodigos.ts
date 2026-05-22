import { PrismaClient } from "@prisma/client";
import { formatPecaCodigo } from "../lib/peca-code.js";

const prisma = new PrismaClient();

const main = async () => {
  const brechos = await prisma.brecho.findMany({ select: { id: true } });

  for (const brecho of brechos) {
    const pecas = await prisma.peca.findMany({
      where: { brechoId: brecho.id, codigo: null },
      orderBy: { criadoEm: "asc" }
    });

    const counters = new Map<number, number>();

    for (const peca of pecas) {
      const ano = peca.criadoEm.getFullYear();
      const next = (counters.get(ano) ?? 0) + 1;
      counters.set(ano, next);
      const codigo = formatPecaCodigo(ano, next);

      await prisma.peca.update({
        where: { id: peca.id },
        data: { codigo }
      });
    }

    for (const [ano, ultimoNum] of counters) {
      await prisma.pecaCodigoSequencia.upsert({
        where: { brechoId_ano: { brechoId: brecho.id, ano } },
        create: { brechoId: brecho.id, ano, ultimoNum },
        update: { ultimoNum }
      });
    }

    console.log(`Brecho ${brecho.id}: ${pecas.length} códigos atribuídos.`);
  }
};

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
