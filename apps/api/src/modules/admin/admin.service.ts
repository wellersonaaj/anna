import { randomBytes } from "node:crypto";
import type { Prisma, PrismaClient } from "@prisma/client";
import { hashPassword, normalizeTelefone } from "../auth/auth.service.js";
import type { CreateBrechoInput, CreateBrechoUserInput, UpdateBrechoInput, UpdateUserInput } from "./admin.schemas.js";

const cleanString = (value: string | undefined): string | null | undefined => {
  if (value === undefined) {
    return undefined;
  }
  const trimmed = value.trim();
  return trimmed || null;
};

const toSlug = (value: string): string =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60);

const generatePassword = (): string => randomBytes(6).toString("base64url");

const brechoPayload = (data: CreateBrechoInput | UpdateBrechoInput) => ({
  ...(data.nome !== undefined ? { nome: data.nome } : {}),
  ...(data.slug !== undefined || data.nome !== undefined ? { slug: data.slug?.trim() || (data.nome ? toSlug(data.nome) : undefined) } : {}),
  ...(data.telefone !== undefined ? { telefone: normalizeTelefone(data.telefone) } : {}),
  ...(data.email !== undefined ? { email: cleanString(data.email) } : {}),
  ...(data.avatarUrl !== undefined ? { avatarUrl: cleanString(data.avatarUrl) } : {}),
  ...(data.plano !== undefined ? { plano: data.plano } : {}),
  ...(data.status !== undefined ? { status: data.status } : {}),
  ...(data.trialExpiraEm !== undefined ? { trialExpiraEm: data.trialExpiraEm ? new Date(data.trialExpiraEm) : null } : {})
});

const includeBrechoDetail = {
  memberships: {
    include: {
      user: {
        select: {
          id: true,
          telefone: true,
          nome: true,
          email: true,
          isFounder: true,
          ativo: true,
          criadoEm: true
        }
      }
    },
    orderBy: { criadoEm: "asc" as const }
  }
};

export const adminService = {
  async listBrechos(prisma: PrismaClient, query: { search?: string; status?: "ATIVO" | "TRIAL" | "SUSPENSO" }) {
    const search = query.search?.trim();
    const where: Prisma.BrechoWhereInput = {
      ...(query.status ? { status: query.status } : {}),
      ...(search
        ? {
            OR: [
              { nome: { contains: search, mode: "insensitive" } },
              { telefone: { contains: normalizeTelefone(search) || search } },
              { email: { contains: search, mode: "insensitive" } }
            ]
          }
        : {})
    };

    const brechos = await prisma.brecho.findMany({
      where,
      orderBy: { criadoEm: "desc" },
      take: 100,
      include: {
        _count: {
          select: {
            pecas: true,
            clientes: true,
            memberships: true
          }
        },
        pecas: {
          orderBy: { criadoEm: "desc" },
          take: 1,
          select: { criadoEm: true }
        }
      }
    });

    return Promise.all(
      brechos.map(async (brecho) => {
        const vendasPendentes = await prisma.venda.count({
          where: {
            peca: { brechoId: brecho.id },
            entrega: null
          }
        });

        return {
          ...brecho,
          resumo: {
            pecas: brecho._count.pecas,
            clientes: brecho._count.clientes,
            usuarios: brecho._count.memberships,
            vendasPendentes,
            ultimoCadastroEm: brecho.pecas[0]?.criadoEm ?? null
          }
        };
      })
    );
  },

  async createBrecho(prisma: PrismaClient, data: CreateBrechoInput) {
    return prisma.brecho.create({
      data: brechoPayload(data) as Prisma.BrechoCreateInput,
      include: includeBrechoDetail
    });
  },

  async getBrecho(prisma: PrismaClient, brechoId: string) {
    const brecho = await prisma.brecho.findUnique({
      where: { id: brechoId },
      include: includeBrechoDetail
    });

    if (!brecho) {
      throw new Error("Brecho not found.");
    }

    const [pecas, clientes, vendasPendentes] = await Promise.all([
      prisma.peca.count({ where: { brechoId } }),
      prisma.cliente.count({ where: { brechoId } }),
      prisma.venda.count({ where: { peca: { brechoId }, entrega: null } })
    ]);

    return {
      ...brecho,
      resumo: { pecas, clientes, vendasPendentes }
    };
  },

  async updateBrecho(prisma: PrismaClient, brechoId: string, data: UpdateBrechoInput) {
    await adminService.getBrecho(prisma, brechoId);
    return prisma.brecho.update({
      where: { id: brechoId },
      data: brechoPayload(data) as Prisma.BrechoUpdateInput,
      include: includeBrechoDetail
    });
  },

  async createBrechoUser(prisma: PrismaClient, brechoId: string, data: CreateBrechoUserInput) {
    await adminService.getBrecho(prisma, brechoId);
    const telefone = normalizeTelefone(data.telefone);
    const password = data.password?.trim() || generatePassword();
    const passwordHash = await hashPassword(password);

    const user = await prisma.user.upsert({
      where: { telefone },
      create: {
        telefone,
        nome: data.nome,
        email: cleanString(data.email) ?? undefined,
        passwordHash,
        ativo: true
      },
      update: {
        nome: data.nome,
        email: cleanString(data.email),
        passwordHash,
        ativo: true
      }
    });

    const membership = await prisma.brechoMembership.upsert({
      where: { userId_brechoId: { userId: user.id, brechoId } },
      create: {
        userId: user.id,
        brechoId,
        role: "DONO",
        ativo: true
      },
      update: {
        role: "DONO",
        ativo: true
      }
    });

    return {
      user: {
        id: user.id,
        telefone: user.telefone,
        nome: user.nome,
        email: user.email,
        ativo: user.ativo
      },
      membership,
      temporaryPassword: password
    };
  },

  async updateUser(prisma: PrismaClient, userId: string, data: UpdateUserInput) {
    const user = await prisma.user.update({
      where: { id: userId },
      data: {
        ...(data.telefone !== undefined ? { telefone: normalizeTelefone(data.telefone) } : {}),
        ...(data.nome !== undefined ? { nome: data.nome } : {}),
        ...(data.email !== undefined ? { email: cleanString(data.email) } : {}),
        ...(data.ativo !== undefined ? { ativo: data.ativo } : {})
      }
    });

    if (data.membershipAtivo !== undefined && data.brechoId) {
      await prisma.brechoMembership.update({
        where: { userId_brechoId: { userId, brechoId: data.brechoId } },
        data: { ativo: data.membershipAtivo }
      });
    }

    return user;
  },

  async resetPassword(prisma: PrismaClient, userId: string, passwordInput?: string) {
    const password = passwordInput?.trim() || generatePassword();
    const passwordHash = await hashPassword(password);
    const user = await prisma.user.update({
      where: { id: userId },
      data: { passwordHash, ativo: true }
    });

    return {
      user: {
        id: user.id,
        telefone: user.telefone,
        nome: user.nome,
        email: user.email,
        ativo: user.ativo
      },
      temporaryPassword: password
    };
  }
};
