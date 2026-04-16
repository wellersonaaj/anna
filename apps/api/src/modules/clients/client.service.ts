import type { Prisma, PrismaClient } from "@prisma/client";

type DbLike = PrismaClient | Prisma.TransactionClient;

const digitsOnly = (value: string): string => value.replace(/\D/g, "");

const normalizeWhatsapp = (raw?: string | null): string | null => {
  if (!raw?.trim()) {
    return null;
  }

  const digits = digitsOnly(raw);
  return digits.length > 0 ? digits : null;
};

const normalizeInstagram = (raw?: string | null): string | null => {
  if (!raw?.trim()) {
    return null;
  }

  return raw.replace(/^@+/, "").trim().toLowerCase() || null;
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

    return db.cliente.findMany({
      where: {
        brechoId,
        OR: [
          { nome: { contains: term, mode: "insensitive" } },
          { whatsapp: { contains: digitsOnly(term), mode: "insensitive" } },
          { instagram: { contains: term.replace(/^@+/, ""), mode: "insensitive" } }
        ]
      },
      orderBy: { nome: "asc" },
      take: limit
    });
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
                nome: true
              }
            }
          }
        }
      }
    });
  }
};
