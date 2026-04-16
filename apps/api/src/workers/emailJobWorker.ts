import type { PrismaClient } from "@prisma/client";

/**
 * Stub: marca jobs PENDENTE como ERRO após simular processamento.
 * Quando houver provedor SMTP/SendGrid, substituir por envio real e status ENVIADO.
 */
export const processPendingEmailJobs = async (prisma: PrismaClient, batchSize = 20): Promise<number> => {
  const jobs = await prisma.emailJob.findMany({
    where: { status: "PENDENTE" },
    orderBy: { criadoEm: "asc" },
    take: batchSize
  });

  for (const job of jobs) {
    await prisma.emailJob.update({
      where: { id: job.id },
      data: {
        status: "PROCESSANDO",
        tentativas: { increment: 1 }
      }
    });

    await prisma.emailJob.update({
      where: { id: job.id },
      data: {
        status: "ERRO",
        processadoEm: new Date()
      }
    });
  }

  return jobs.length;
};
