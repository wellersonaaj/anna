import { itemStatus } from "@anna/shared";
import type { PrismaClient } from "@prisma/client";
import { storageEnv } from "../../config/env.js";
import { createPresignedGet, isStorageConfigured, resolveObjectKeyFromPublicUrl } from "../../lib/storage.js";
import { resolveCoverFoto } from "../items/item.service.js";
import { sacolaService } from "../sacolas/sacola.service.js";

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
          brechoId,
          status: itemStatus.VENDIDO
        }
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
        },
        cliente: true
      },
      orderBy: {
        criadoEm: "asc"
      }
    });

    return Promise.all(
      rows.map(async (row) => {
        const cover = resolveCoverFoto(row.peca.fotoCapaId, row.peca.fotos);
        const thumbPrefer = cover?.thumbnailUrl ?? cover?.url ?? null;
        return {
          ...row,
          peca: {
            id: row.peca.id,
            nome: row.peca.nome,
            codigo: row.peca.codigo,
            fotoCapaUrl: await resolveDisplayImageUrl(cover?.url ?? null),
            fotoCapaThumbnailUrl: await resolveDisplayImageUrl(thumbPrefer)
          }
        };
      })
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
      rows.map(async (row) => {
        const cover = resolveCoverFoto(row.peca.fotoCapaId, row.peca.fotos);
        const thumbPrefer = cover?.thumbnailUrl ?? cover?.url ?? null;
        return {
          ...row,
          peca: {
            id: row.peca.id,
            nome: row.peca.nome,
            codigo: row.peca.codigo,
            fotoCapaUrl: await resolveDisplayImageUrl(cover?.url ?? null),
            fotoCapaThumbnailUrl: await resolveDisplayImageUrl(thumbPrefer)
          }
        };
      })
    );

    return {
      rows: mappedRows,
      total,
      hasMore: query.offset + rows.length < total
    };
  },

  async deliver(prisma: PrismaClient, brechoId: string, saleId: string, data: { codigoRastreio?: string; entregueEm?: string }) {
    await sacolaService.deliverSingleSale(prisma, brechoId, saleId, data);
  }
};
