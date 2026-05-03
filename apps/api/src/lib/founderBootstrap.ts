import type { PrismaClient } from "@prisma/client";
import { env } from "../config/env.js";
import { hashPassword, normalizeTelefone } from "../modules/auth/auth.service.js";

export type FounderBootstrapResult =
  | { ran: false }
  | { ran: true; userId: string; telefone: string };

const disableBootstrapOnStart = (): boolean => {
  const v = env.FOUNDER_BOOTSTRAP_DISABLE_ON_START?.trim().toLowerCase();
  return v === "1" || v === "true" || v === "yes";
};

/**
 * Cria ou atualiza o usuário fundador a partir das variáveis de ambiente.
 * Usado pelo script `seed:founder` e, em produção, no arranque da API (quando não desabilitado).
 */
export async function ensureFounderFromEnv(prisma: PrismaClient): Promise<FounderBootstrapResult> {
  const telefone = normalizeTelefone(env.FOUNDER_BOOTSTRAP_PHONE ?? "");
  const password = env.FOUNDER_BOOTSTRAP_PASSWORD?.trim();

  if (!telefone || !password) {
    return { ran: false };
  }

  const passwordHash = await hashPassword(password);
  const user = await prisma.user.upsert({
    where: { telefone },
    create: {
      telefone,
      passwordHash,
      isFounder: true,
      ativo: true
    },
    update: {
      passwordHash,
      isFounder: true,
      ativo: true
    }
  });

  return { ran: true, userId: user.id, telefone: user.telefone };
}

export function shouldRunFounderBootstrapOnStart(): boolean {
  if (disableBootstrapOnStart()) {
    return false;
  }
  const telefone = normalizeTelefone(env.FOUNDER_BOOTSTRAP_PHONE ?? "");
  const password = env.FOUNDER_BOOTSTRAP_PASSWORD?.trim();
  return Boolean(telefone && password);
}
