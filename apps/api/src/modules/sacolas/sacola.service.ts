import { itemStatus } from "@anna/shared";
import type { Prisma, PrismaClient } from "@prisma/client";
import { storageEnv } from "../../config/env.js";
import { createPresignedGet, isStorageConfigured, resolveObjectKeyFromPublicUrl } from "../../lib/storage.js";
import { resolveCoverFoto } from "../items/item.service.js";

type DbLike = PrismaClient | Prisma.TransactionClient;

const resolveDisplayImageUrl = async (url: string | null | undefined): Promise<string | null> => {
  if (!url) {
    return null;
  }
  if (!isStorageConfigured(storageEnv)) {
    return url;
  }
  const key = resolveObjectKeyFromPublicUrl(storageEnv, url);
  if (!key) {
    return url;
  }
  try {
    return await createPresignedGet(storageEnv, { key, expiresSeconds: 3600 });
  } catch {
    return url;
  }
};

const deliverVendaInTx = async (
  tx: Prisma.TransactionClient,
  sale: { id: string; pecaId: string; clienteId: string; peca: { status: string } },
  data: { codigoRastreio?: string; entregueEm?: Date; remessaId?: string }
) => {
  if (sale.peca.status !== itemStatus.VENDIDO) {
    throw new Error(`Invalid status transition: ${sale.peca.status} -> ${itemStatus.ENTREGUE}`);
  }

  const existingEntrega = await tx.entrega.findUnique({ where: { vendaId: sale.id } });
  if (existingEntrega) {
    throw new Error("Sale already delivered.");
  }

  await tx.entrega.create({
    data: {
      vendaId: sale.id,
      codigoRastreio: data.codigoRastreio,
      entregueEm: data.entregueEm ?? new Date()
    }
  });

  if (data.remessaId) {
    await tx.venda.update({
      where: { id: sale.id },
      data: { remessaId: data.remessaId }
    });
  }

  await tx.peca.update({
    where: { id: sale.pecaId },
    data: { status: itemStatus.ENTREGUE }
  });

  await tx.pecaStatusHistorico.create({
    data: {
      pecaId: sale.pecaId,
      clienteId: sale.clienteId,
      status: itemStatus.ENTREGUE
    }
  });
};

const maybeCloseSacola = async (tx: Prisma.TransactionClient, sacolaClienteId: string) => {
  const pending = await tx.venda.count({
    where: {
      sacolaClienteId,
      entrega: null,
      peca: { status: itemStatus.VENDIDO }
    }
  });

  if (pending === 0) {
    await tx.sacolaCliente.update({
      where: { id: sacolaClienteId },
      data: { status: "FECHADA" }
    });
  }
};

export const sacolaService = {
  deliverVendaInTx,

  async getOrCreateOpenSacola(tx: DbLike, brechoId: string, clienteId: string) {
    const existing = await tx.sacolaCliente.findFirst({
      where: { brechoId, clienteId, status: "ABERTA" }
    });
    if (existing) {
      return existing;
    }

    try {
      return await tx.sacolaCliente.create({
        data: { brechoId, clienteId, status: "ABERTA" }
      });
    } catch {
      const retry = await tx.sacolaCliente.findFirst({
        where: { brechoId, clienteId, status: "ABERTA" }
      });
      if (retry) {
        return retry;
      }
      throw new Error("Could not open client bag.");
    }
  },

  async addVendaToOpenSacola(tx: DbLike, brechoId: string, clienteId: string, vendaId: string) {
    const sacola = await sacolaService.getOrCreateOpenSacola(tx, brechoId, clienteId);
    await tx.venda.update({
      where: { id: vendaId },
      data: { sacolaClienteId: sacola.id }
    });
    return sacola;
  },

  async listPendingGrouped(prisma: PrismaClient, brechoId: string) {
    const sacolas = await prisma.sacolaCliente.findMany({
      where: {
        brechoId,
        status: "ABERTA",
        vendas: {
          some: {
            entrega: null,
            peca: { status: itemStatus.VENDIDO }
          }
        }
      },
      include: {
        cliente: true,
        vendas: {
          where: {
            entrega: null,
            peca: { status: itemStatus.VENDIDO }
          },
          include: {
            peca: {
              select: {
                id: true,
                nome: true,
                codigo: true,
                fotoCapaId: true,
                fotos: {
                  select: {
                    id: true,
                    url: true,
                    thumbnailUrl: true,
                    ordem: true,
                    aiConfianca: true,
                    aiQualidade: true,
                    aiPredicaoJson: true
                  },
                  orderBy: { ordem: "asc" },
                  take: 15
                }
              }
            }
          },
          orderBy: { criadoEm: "asc" }
        }
      },
      orderBy: { atualizadoEm: "asc" }
    });

    return Promise.all(
      sacolas.map(async (sacola) => ({
        id: sacola.id,
        cliente: sacola.cliente,
        totalPecas: sacola.vendas.length,
        vendas: await Promise.all(
          sacola.vendas.map(async (venda) => {
            const cover = resolveCoverFoto(venda.peca.fotoCapaId, venda.peca.fotos);
            const thumbPrefer = cover?.thumbnailUrl ?? cover?.url ?? null;
            return {
              id: venda.id,
              precoVenda: venda.precoVenda,
              freteIncluso: venda.freteIncluso,
              ganhosTotal: venda.ganhosTotal,
              criadoEm: venda.criadoEm,
              peca: {
                id: venda.peca.id,
                nome: venda.peca.nome,
                codigo: venda.peca.codigo,
                fotoCapaUrl: await resolveDisplayImageUrl(cover?.url ?? null),
                fotoCapaThumbnailUrl: await resolveDisplayImageUrl(thumbPrefer)
              }
            };
          })
        )
      }))
    );
  },

  async shipRemessa(
    prisma: PrismaClient,
    brechoId: string,
    sacolaId: string,
    data: { vendaIds?: string[]; codigoRastreio?: string; freteTexto?: string; freteValor?: number }
  ) {
    return prisma.$transaction(async (tx) => {
      const sacola = await tx.sacolaCliente.findFirst({
        where: { id: sacolaId, brechoId, status: "ABERTA" },
        include: {
          vendas: {
            where: {
              entrega: null,
              peca: { status: itemStatus.VENDIDO }
            },
            include: { peca: true }
          }
        }
      });

      if (!sacola) {
        throw new Error("Sacola not found.");
      }

      const pendingIds = new Set(sacola.vendas.map((v) => v.id));
      const targetIds = data.vendaIds?.length ? data.vendaIds : [...pendingIds];

      for (const id of targetIds) {
        if (!pendingIds.has(id)) {
          throw new Error("Invalid sale for this bag.");
        }
      }

      const remessa = await tx.remessa.create({
        data: {
          sacolaClienteId: sacolaId,
          codigoRastreio: data.codigoRastreio,
          freteTexto: data.freteTexto,
          freteValor: data.freteValor && data.freteValor > 0 ? data.freteValor : null
        }
      });

      for (const vendaId of targetIds) {
        const sale = sacola.vendas.find((v) => v.id === vendaId);
        if (!sale) {
          continue;
        }
        await deliverVendaInTx(tx, sale, {
          codigoRastreio: data.codigoRastreio,
          remessaId: remessa.id
        });
      }

      await maybeCloseSacola(tx, sacolaId);

      return remessa;
    });
  },

  async deliverSingleSale(
    prisma: PrismaClient,
    brechoId: string,
    saleId: string,
    data: { codigoRastreio?: string; entregueEm?: string }
  ) {
    return prisma.$transaction(async (tx) => {
      const sale = await tx.venda.findFirst({
        where: { id: saleId, peca: { brechoId } },
        include: { peca: true, entrega: true }
      });

      if (!sale) {
        throw new Error("Sale not found.");
      }

      if (sale.entrega) {
        throw new Error("Sale already delivered.");
      }

      await deliverVendaInTx(tx, sale, {
        codigoRastreio: data.codigoRastreio,
        entregueEm: data.entregueEm ? new Date(data.entregueEm) : new Date()
      });

      if (sale.sacolaClienteId) {
        await maybeCloseSacola(tx, sale.sacolaClienteId);
      }
    });
  }
};
