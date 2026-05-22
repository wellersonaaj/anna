import { randomBytes } from "node:crypto";
import type { PrismaClient } from "@prisma/client";
import { itemStatus } from "@anna/shared";
import { hashToken } from "../auth/auth.service.js";
import { itemService } from "../items/item.service.js";
import { clienteContatoSchema } from "../clients/client.schemas.js";
import { storageEnv } from "../../config/env.js";
import { createPresignedGet, isStorageConfigured, resolveObjectKeyFromPublicUrl } from "../../lib/storage.js";
import { resolveCoverFoto } from "../items/item.service.js";

const resolveDisplayImageUrl = async (url: string | null | undefined): Promise<string | null> => {
  if (!url) return null;
  if (!isStorageConfigured(storageEnv)) return url;
  const key = resolveObjectKeyFromPublicUrl(storageEnv, url);
  if (!key) return url;
  try {
    return await createPresignedGet(storageEnv, { key, expiresSeconds: 3600 });
  } catch {
    return url;
  }
};

const resolvePecaFromToken = async (prisma: PrismaClient, token: string) => {
  const tokenHash = hashToken(token);
  const link = await prisma.pecaFilaLink.findFirst({
    where: { tokenHash, ativo: true, revogadoEm: null },
    include: {
      peca: {
        include: {
          fotos: { orderBy: { ordem: "asc" }, take: 15 },
          filaInteressados: true
        }
      }
    }
  });
  return link;
};

export const publicQueueService = {
  async getQueueInfo(prisma: PrismaClient, token: string) {
    const link = await resolvePecaFromToken(prisma, token);
    if (!link) {
      throw new Error("Link not found.");
    }

    const { peca } = link;
    const canJoin = peca.status === itemStatus.DISPONIVEL || peca.status === itemStatus.RESERVADO;
    const cover = resolveCoverFoto(peca.fotoCapaId, peca.fotos);

    return {
      pecaNome: peca.nome,
      pecaCodigo: peca.codigo,
      status: peca.status,
      canJoin,
      totalNaFila: peca.filaInteressados.length,
      fotoUrl: await resolveDisplayImageUrl(cover?.thumbnailUrl ?? cover?.url ?? null)
    };
  },

  async joinQueue(prisma: PrismaClient, token: string, cliente: { nome: string; whatsapp?: string; instagram?: string }) {
    const parsed = clienteContatoSchema.parse(cliente);
    const link = await resolvePecaFromToken(prisma, token);
    if (!link) {
      throw new Error("Link not found.");
    }

    if (link.peca.status !== itemStatus.DISPONIVEL && link.peca.status !== itemStatus.RESERVADO) {
      throw new Error("Item not available for queue.");
    }

    const entry = await itemService.joinFila(prisma, link.peca.brechoId, link.pecaId, parsed);
    const totalNaFila = await prisma.filaInteressado.count({ where: { pecaId: link.pecaId } });

    return {
      posicao: entry.posicao,
      totalNaFila,
      message: "Você entrou na fila com sucesso."
    };
  }
};

export const filaLinkService = {
  generateToken(): string {
    return randomBytes(24).toString("base64url");
  },

  async createOrRotate(prisma: PrismaClient, brechoId: string, itemId: string, appBaseUrl: string) {
    const item = await prisma.peca.findFirst({ where: { id: itemId, brechoId } });
    if (!item) {
      throw new Error("Item not found.");
    }

    const token = filaLinkService.generateToken();
    const tokenHash = hashToken(token);

    await prisma.pecaFilaLink.upsert({
      where: { pecaId: itemId },
      create: { pecaId: itemId, tokenHash, ativo: true },
      update: { tokenHash, ativo: true, revogadoEm: null }
    });

    const url = `${appBaseUrl.replace(/\/$/, "")}/fila/${token}`;
    return { url, token };
  },

  async revoke(prisma: PrismaClient, brechoId: string, itemId: string) {
    const item = await prisma.peca.findFirst({ where: { id: itemId, brechoId } });
    if (!item) {
      throw new Error("Item not found.");
    }

    await prisma.pecaFilaLink.updateMany({
      where: { pecaId: itemId },
      data: { ativo: false, revogadoEm: new Date() }
    });
  }
};
