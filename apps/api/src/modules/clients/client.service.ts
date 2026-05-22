import type { Prisma, PrismaClient } from "@prisma/client";
import { isClientContactComplete, normalizeInstagram, normalizeWhatsapp } from "@anna/shared";

type DbLike = PrismaClient | Prisma.TransactionClient;

const digitsOnly = (value: string): string => value.replace(/\D/g, "");

const normalizeSearchText = (value?: string | null): string =>
  value
    ?.normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase() ?? "";

const scoreTextMatch = (candidate: string, term: string): number => {
  if (!candidate || !term) {
    return 0;
  }

  if (candidate === term) {
    return 100;
  }

  if (candidate.startsWith(term)) {
    return 82;
  }

  if (candidate.includes(term)) {
    return 68;
  }

  const candidateTokens = candidate.split(/\s+/).filter(Boolean);
  if (candidateTokens.some((token) => token.startsWith(term))) {
    return 58;
  }

  let matched = 0;
  let termIndex = 0;
  for (const char of candidate) {
    if (char === term[termIndex]) {
      matched += 1;
      termIndex += 1;
    }
    if (termIndex >= term.length) {
      break;
    }
  }

  const coverage = matched / term.length;
  return coverage >= 0.75 ? Math.round(coverage * 45) : 0;
};

const scoreClientMatch = (
  client: { nome: string; whatsapp: string | null; instagram: string | null; criadoEm: Date },
  rawTerm: string
): number => {
  const term = normalizeSearchText(rawTerm);
  const phoneTerm = digitsOnly(rawTerm);
  const instagramTerm = normalizeInstagram(rawTerm);

  const nameScore = scoreTextMatch(normalizeSearchText(client.nome), term);
  const whatsappScore =
    phoneTerm && client.whatsapp
      ? client.whatsapp === phoneTerm
        ? 110
        : client.whatsapp.startsWith(phoneTerm)
          ? 90
          : client.whatsapp.includes(phoneTerm)
            ? 74
            : 0
      : 0;
  const instagramScore =
    instagramTerm && client.instagram
      ? client.instagram === instagramTerm
        ? 108
        : client.instagram.startsWith(instagramTerm)
          ? 88
          : client.instagram.includes(instagramTerm)
            ? 72
            : scoreTextMatch(client.instagram, instagramTerm)
      : 0;

  return Math.max(nameScore, whatsappScore, instagramScore);
};

export const clientService = {
  async findOrCreateCliente(
    db: DbLike,
    brechoId: string,
    input: { nome: string; whatsapp?: string | null; instagram?: string | null }
  ) {
    const nome = input.nome.trim();
    const whatsapp = normalizeWhatsapp(input.whatsapp);
    const instagram = normalizeInstagram(input.instagram);

    const existing = await db.cliente.findFirst({
      where: {
        brechoId,
        OR: [
          ...(whatsapp ? [{ whatsapp }] : []),
          ...(instagram ? [{ instagram }] : [])
        ]
      },
      orderBy: {
        criadoEm: "desc"
      }
    });

    if (existing) {
      const needsUpdate =
        existing.nome !== nome ||
        (whatsapp && existing.whatsapp !== whatsapp) ||
        (instagram && existing.instagram !== instagram);

      if (needsUpdate) {
        return db.cliente.update({
          where: { id: existing.id },
          data: {
            nome,
            ...(whatsapp ? { whatsapp } : {}),
            ...(instagram ? { instagram } : {})
          }
        });
      }

      return existing;
    }

    return db.cliente.create({
      data: {
        brechoId,
        nome,
        whatsapp: whatsapp ?? null,
        instagram: instagram ?? null
      }
    });
  },

  async search(db: DbLike, brechoId: string, search: string | undefined, limit: number) {
    if (!search?.trim()) {
      return db.cliente.findMany({
        where: { brechoId },
        orderBy: { criadoEm: "desc" },
        take: limit
      });
    }

    const term = search.trim();
    const candidates = await db.cliente.findMany({
      where: { brechoId },
      orderBy: { criadoEm: "desc" },
      take: Math.max(250, limit * 40)
    });

    return candidates
      .map((client) => ({
        client,
        score: scoreClientMatch(client, term)
      }))
      .filter((entry) => entry.score > 0)
      .sort((a, b) => b.score - a.score || a.client.nome.localeCompare(b.client.nome, "pt-BR"))
      .slice(0, limit)
      .map((entry) => entry.client);
  },

  async findByIdWithHistory(db: DbLike, brechoId: string, id: string) {
    return db.cliente.findFirst({
      where: { id, brechoId },
      include: {
        vendas: {
          orderBy: { criadoEm: "desc" },
          include: {
            peca: {
              select: {
                id: true,
                nome: true,
                codigo: true
              }
            },
            entrega: true
          }
        },
        sacolas: {
          where: { status: "ABERTA" },
          include: {
            vendas: {
              where: { entrega: null },
              include: {
                peca: { select: { id: true, nome: true, codigo: true } }
              }
            }
          },
          take: 1
        }
      }
    });
  },

  async updateCliente(
    db: DbLike,
    brechoId: string,
    id: string,
    input: { nome?: string; whatsapp?: string; instagram?: string }
  ) {
    const existing = await db.cliente.findFirst({ where: { id, brechoId } });
    if (!existing) {
      throw new Error("Client not found.");
    }

    const nome = input.nome?.trim() ?? existing.nome;
    const whatsapp = input.whatsapp !== undefined ? normalizeWhatsapp(input.whatsapp) : existing.whatsapp;
    const instagram = input.instagram !== undefined ? normalizeInstagram(input.instagram) : existing.instagram;

    if (!isClientContactComplete({ nome, whatsapp, instagram })) {
      throw new Error("Informe o nome e pelo menos WhatsApp ou Instagram.");
    }

    if (whatsapp) {
      const conflict = await db.cliente.findFirst({
        where: { brechoId, whatsapp, NOT: { id } }
      });
      if (conflict) {
        throw new Error("WhatsApp já cadastrado para outra cliente.");
      }
    }

    if (instagram) {
      const conflict = await db.cliente.findFirst({
        where: { brechoId, instagram, NOT: { id } }
      });
      if (conflict) {
        throw new Error("Instagram já cadastrado para outra cliente.");
      }
    }

    return db.cliente.update({
      where: { id },
      data: { nome, whatsapp, instagram }
    });
  }
};
