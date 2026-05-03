import { PrismaClient } from "@prisma/client";
import { ensureFounderFromEnv } from "../lib/founderBootstrap.js";

const prisma = new PrismaClient();

const main = async () => {
  const result = await ensureFounderFromEnv(prisma);
  if (!result.ran) {
    throw new Error("FOUNDER_BOOTSTRAP_PHONE and FOUNDER_BOOTSTRAP_PASSWORD are required.");
  }
  // eslint-disable-next-line no-console
  console.log(`Founder ready: ${result.telefone} (${result.userId})`);
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
