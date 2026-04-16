import { canTransitionStatus, itemStatus } from "@anna/shared";
import type { PrismaClient, StatusPeca } from "@prisma/client";

const ensureTransition = (from: StatusPeca, to: StatusPeca) => {
  if (!canTransitionStatus(from, to)) {
    throw new Error(`Invalid status transition: ${from} -> ${to}`);
  }
};

export const salesService = {
  async listPendingDelivery(prisma: PrismaClient, brechoId: string) {
    return prisma.venda.findMany({
      where: {
        entrega: null,
        peca: {
          brechoId
        }
      },
      include: {
        peca: true,
        cliente: true
      },
      orderBy: {
        criadoEm: "asc"
      }
    });
  },

  async deliver(prisma: PrismaClient, brechoId: string, saleId: string, data: { codigoRastreio?: string; entregueEm?: string }) {
    return prisma.$transaction(async (tx) => {
      const sale = await tx.venda.findFirst({
        where: {
          id: saleId,
          peca: {
            brechoId
          }
        },
        include: {
          peca: true
        }
      });

      if (!sale) {
        throw new Error("Sale not found.");
      }

      ensureTransition(sale.peca.status, itemStatus.ENTREGUE);

      await tx.entrega.create({
        data: {
          vendaId: saleId,
          codigoRastreio: data.codigoRastreio,
          entregueEm: data.entregueEm ? new Date(data.entregueEm) : new Date()
        }
      });

      await tx.peca.update({
        where: {
          id: sale.pecaId
        },
        data: {
          status: itemStatus.ENTREGUE
        }
      });

      await tx.pecaStatusHistorico.create({
        data: {
          pecaId: sale.pecaId,
          clienteId: sale.clienteId,
          status: itemStatus.ENTREGUE
        }
      });
    });
  }
};
