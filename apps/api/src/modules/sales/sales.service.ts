import { canTransitionStatus, itemStatus } from "@anna/shared";
import type { PrismaClient, StatusPeca } from "@prisma/client";
import { storageEnv } from "../../config/env.js";
import { createPresignedGet, isStorageConfigured, resolveObjectKeyFromPublicUrl } from "../../lib/storage.js";

const ensureTransition = (from: StatusPeca, to: StatusPeca) => {
  if (!canTransitionStatus(from, to)) {
    throw new Error(`Invalid status transition: ${from} -> ${to}`);
  }
};

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

export const salesService = {
  async listPendingDelivery(prisma: PrismaClient, brechoId: string) {
    const rows = await prisma.venda.findMany({
      where: {
        entrega: null,
        peca: {
          brechoId
        }
      },
      include: {
        peca: {
          include: {
            fotos: {
              select: { url: true },
              orderBy: { ordem: "asc" },
              take: 1
            }
          }
        },
        cliente: true
      },
      orderBy: {
        criadoEm: "asc"
      }
    });

    return Promise.all(
      rows.map(async (row) => ({
        ...row,
        peca: {
          id: row.peca.id,
          nome: row.peca.nome,
          fotoCapaUrl: await resolveDisplayImageUrl(row.peca.fotos[0]?.url ?? null)
        }
      }))
    );
  },

  async listDelivered(
    prisma: PrismaClient,
    brechoId: string,
    query: { days: number; limit: number; offset: number }
  ) {
    const since = new Date(Date.now() - query.days * 24 * 60 * 60 * 1000);
    const where = {
      entrega: {
        entregueEm: {
          gte: since
        }
      },
      peca: {
        brechoId
      }
    };

    const [rows, total] = await prisma.$transaction([
      prisma.venda.findMany({
        where,
        include: {
          peca: {
            include: {
              fotos: {
                select: { url: true },
                orderBy: { ordem: "asc" },
                take: 1
              }
            }
          },
          cliente: true,
          entrega: true
        },
        orderBy: {
          entrega: {
            entregueEm: "desc"
          }
        },
        take: query.limit,
        skip: query.offset
      }),
      prisma.venda.count({ where })
    ]);

    const mappedRows = await Promise.all(
      rows.map(async (row) => ({
        ...row,
        peca: {
          id: row.peca.id,
          nome: row.peca.nome,
          fotoCapaUrl: await resolveDisplayImageUrl(row.peca.fotos[0]?.url ?? null)
        }
      }))
    );

    return {
      rows: mappedRows,
      total,
      hasMore: query.offset + rows.length < total
    };
  },

  async deliver(prisma: PrismaClient, brechoId: string, saleId: string, data: { codigoRastreio?: string; entregueEm?: string }) {
    return prisma.$transaction(async (tx) => {
      const sale = await tx.venda.findFirst({
        where: {
          id: saleId,
          peca: {
            brechoId
          }
        },
        include: {
          peca: true
        }
      });

      if (!sale) {
        throw new Error("Sale not found.");
      }

      ensureTransition(sale.peca.status, itemStatus.ENTREGUE);

      await tx.entrega.create({
        data: {
          vendaId: saleId,
          codigoRastreio: data.codigoRastreio,
          entregueEm: data.entregueEm ? new Date(data.entregueEm) : new Date()
        }
      });

      await tx.peca.update({
        where: {
          id: sale.pecaId
        },
        data: {
          status: itemStatus.ENTREGUE
        }
      });

      await tx.pecaStatusHistorico.create({
        data: {
          pecaId: sale.pecaId,
          clienteId: sale.clienteId,
          status: itemStatus.ENTREGUE
        }
      });
    });
  }
};
