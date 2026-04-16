import { PrismaClient } from "@prisma/client";
import { processPendingEmailJobs } from "./emailJobWorker.js";

const prisma = new PrismaClient();
const intervalMs = Number(process.env.EMAIL_JOB_POLL_MS ?? 8000);

const tick = async () => {
  try {
    const n = await processPendingEmailJobs(prisma);
    if (n > 0) {
      console.info(`[email-worker] processed ${n} job(s) (stub -> ERRO).`);
    }
  } catch (err) {
    console.error("[email-worker] tick failed:", err);
  }
};

await tick();
setInterval(tick, intervalMs);
