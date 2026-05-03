import { PrismaClient, StatusPeca } from "@prisma/client";

const prisma = new PrismaClient();

const startOfDay = (date: Date): Date => new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
const nextDay = (date: Date): Date => new Date(date.getTime() + 24 * 60 * 60 * 1000);

const runForDate = async (date = startOfDay(new Date())) => {
  const from = startOfDay(date);
  const to = nextDay(from);
  const staleBefore = new Date(from.getTime() - 30 * 24 * 60 * 60 * 1000);
  const brechos = await prisma.brecho.findMany({ select: { id: true } });

  for (const brecho of brechos) {
    const [
      pecasCadastradas,
      vendas,
      estoqueDisponivel,
      estoqueReservado,
      estoqueIndisponivel,
      pecasParadas30d,
      categoriasCadastradas
    ] = await Promise.all([
      prisma.peca.count({ where: { brechoId: brecho.id, criadoEm: { gte: from, lt: to } } }),
      prisma.venda.findMany({
        where: { criadoEm: { gte: from, lt: to }, peca: { brechoId: brecho.id } },
        include: { peca: { select: { categoria: true, subcategoria: true } } }
      }),
      prisma.peca.count({ where: { brechoId: brecho.id, status: StatusPeca.DISPONIVEL } }),
      prisma.peca.count({ where: { brechoId: brecho.id, status: StatusPeca.RESERVADO } }),
      prisma.peca.count({ where: { brechoId: brecho.id, status: StatusPeca.INDISPONIVEL } }),
      prisma.peca.count({
        where: {
          brechoId: brecho.id,
          status: { in: [StatusPeca.DISPONIVEL, StatusPeca.RESERVADO, StatusPeca.INDISPONIVEL] },
          criadoEm: { lt: staleBefore }
        }
      }),
      prisma.peca.groupBy({
        by: ["categoria", "subcategoria"],
        where: { brechoId: brecho.id, criadoEm: { gte: from, lt: to } },
        _count: { _all: true }
      })
    ]);

    const faturamentoBruto = vendas.reduce((sum, venda) => sum + Number(venda.ganhosTotal), 0);

    await prisma.analyticsBrechoDia.upsert({
      where: { brechoId_data: { brechoId: brecho.id, data: from } },
      create: {
        brechoId: brecho.id,
        data: from,
        pecasCadastradas,
        pecasVendidas: vendas.length,
        faturamentoBruto,
        estoqueDisponivel,
        estoqueReservado,
        estoqueIndisponivel,
        pecasParadas30d
      },
      update: {
        pecasCadastradas,
        pecasVendidas: vendas.length,
        faturamentoBruto,
        estoqueDisponivel,
        estoqueReservado,
        estoqueIndisponivel,
        pecasParadas30d
      }
    });

    const categoryMap = new Map<string, { categoria: (typeof categoriasCadastradas)[number]["categoria"]; subcategoria: string; pecasCadastradas: number; pecasVendidas: number; faturamentoBruto: number }>();
    for (const row of categoriasCadastradas) {
      const key = `${row.categoria}:${row.subcategoria}`;
      categoryMap.set(key, {
        categoria: row.categoria,
        subcategoria: row.subcategoria,
        pecasCadastradas: row._count._all,
        pecasVendidas: 0,
        faturamentoBruto: 0
      });
    }

    for (const venda of vendas) {
      const key = `${venda.peca.categoria}:${venda.peca.subcategoria}`;
      const current =
        categoryMap.get(key) ??
        {
          categoria: venda.peca.categoria,
          subcategoria: venda.peca.subcategoria,
          pecasCadastradas: 0,
          pecasVendidas: 0,
          faturamentoBruto: 0
        };
      current.pecasVendidas += 1;
      current.faturamentoBruto += Number(venda.ganhosTotal);
      categoryMap.set(key, current);
    }

    for (const row of categoryMap.values()) {
      await prisma.analyticsCategoriaDia.upsert({
        where: {
          brechoId_data_categoria_subcategoria: {
            brechoId: brecho.id,
            data: from,
            categoria: row.categoria,
            subcategoria: row.subcategoria
          }
        },
        create: {
          brechoId: brecho.id,
          data: from,
          categoria: row.categoria,
          subcategoria: row.subcategoria,
          pecasCadastradas: row.pecasCadastradas,
          pecasVendidas: row.pecasVendidas,
          faturamentoBruto: row.faturamentoBruto
        },
        update: {
          pecasCadastradas: row.pecasCadastradas,
          pecasVendidas: row.pecasVendidas,
          faturamentoBruto: row.faturamentoBruto
        }
      });
    }
  }
};

runForDate()
  .catch((error) => {
    // eslint-disable-next-line no-console
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
