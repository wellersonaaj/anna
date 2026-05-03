import { PrismaClient } from "@prisma/client";
import { env } from "../config/env.js";
import { hashPassword, normalizeTelefone } from "../modules/auth/auth.service.js";

const prisma = new PrismaClient();

const main = async () => {
  const telefone = normalizeTelefone(env.FOUNDER_BOOTSTRAP_PHONE ?? "");
  const password = env.FOUNDER_BOOTSTRAP_PASSWORD?.trim();

  if (!telefone || !password) {
    throw new Error("FOUNDER_BOOTSTRAP_PHONE and FOUNDER_BOOTSTRAP_PASSWORD are required.");
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

  // eslint-disable-next-line no-console
  console.log(`Founder ready: ${user.telefone} (${user.id})`);
};

main()
  .catch((error) => {
    // eslint-disable-next-line no-console
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
