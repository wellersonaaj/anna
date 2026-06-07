import type { DespesaCategoria, PrismaClient } from "@prisma/client";

export const despesaService = {
  async list(prisma: PrismaClient, brechoId: string, days: number) {
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    return prisma.brechoDespesa.findMany({
      where: {
        brechoId,
        dataCompetencia: { gte: since }
      },
      orderBy: [{ dataCompetencia: "desc" }, { criadoEm: "desc" }]
    });
  },

  async create(
    prisma: PrismaClient,
    brechoId: string,
    data: {
      categoria: DespesaCategoria;
      valor: number;
      descricao?: string;
      dataCompetencia: Date;
    }
  ) {
    return prisma.brechoDespesa.create({
      data: {
        brechoId,
        categoria: data.categoria,
        valor: data.valor,
        descricao: data.descricao?.trim() || null,
        dataCompetencia: data.dataCompetencia
      }
    });
  },

  async update(
    prisma: PrismaClient,
    brechoId: string,
    despesaId: string,
    data: {
      categoria?: DespesaCategoria;
      valor?: number;
      descricao?: string | null;
      dataCompetencia?: Date;
    }
  ) {
    const existing = await prisma.brechoDespesa.findFirst({
      where: { id: despesaId, brechoId },
      select: { id: true }
    });

    if (!existing) {
      throw new Error("Despesa not found.");
    }

    return prisma.brechoDespesa.update({
      where: { id: despesaId },
      data: {
        ...(data.categoria !== undefined ? { categoria: data.categoria } : {}),
        ...(data.valor !== undefined ? { valor: data.valor } : {}),
        ...(data.descricao !== undefined ? { descricao: data.descricao?.trim() || null } : {}),
        ...(data.dataCompetencia !== undefined ? { dataCompetencia: data.dataCompetencia } : {})
      }
    });
  },

  async remove(prisma: PrismaClient, brechoId: string, despesaId: string) {
    const existing = await prisma.brechoDespesa.findFirst({
      where: { id: despesaId, brechoId },
      select: { id: true }
    });

    if (!existing) {
      throw new Error("Despesa not found.");
    }

    await prisma.brechoDespesa.delete({ where: { id: despesaId } });
  },

  async sumByPeriod(prisma: PrismaClient, brechoId: string, since: Date) {
    const rows = await prisma.brechoDespesa.findMany({
      where: {
        brechoId,
        dataCompetencia: { gte: since }
      },
      select: { categoria: true, valor: true }
    });

    const despesasPorCategoria: Record<DespesaCategoria, number> = {
      MARKETING: 0,
      PLATAFORMAS: 0,
      EMBALAGEM: 0,
      OUTROS: 0
    };

    let despesasGerais = 0;
    for (const row of rows) {
      const valor = Number(row.valor);
      despesasGerais += valor;
      despesasPorCategoria[row.categoria] += valor;
    }

    return { despesasGerais, despesasPorCategoria };
  }
};
