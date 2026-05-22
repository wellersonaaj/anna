import type { Prisma } from "@prisma/client";

type Tx = Prisma.TransactionClient;

export const formatPecaCodigo = (year: number, sequence: number): string => {
  const yy = String(year).slice(-2);
  const padded = sequence < 1000 ? String(sequence).padStart(3, "0") : String(sequence);
  return `${yy}-${padded}`;
};

export const allocateCodigo = async (tx: Tx, brechoId: string, criadoEm = new Date()): Promise<string> => {
  const ano = criadoEm.getFullYear();

  const seq = await tx.pecaCodigoSequencia.upsert({
    where: { brechoId_ano: { brechoId, ano } },
    create: { brechoId, ano, ultimoNum: 1 },
    update: { ultimoNum: { increment: 1 } }
  });

  return formatPecaCodigo(ano, seq.ultimoNum);
};
