import type { FastifyInstance } from "fastify";
import { ZodError } from "zod";
import { deliverSaleSchema } from "./sales.schemas.js";
import { salesService } from "./sales.service.js";

export const salesRoutes = async (app: FastifyInstance): Promise<void> => {
  app.get("/sales/pending-delivery", async (request, reply) => {
    const sales = await salesService.listPendingDelivery(app.prisma, request.brechoId);
    return reply.send(sales);
  });

  app.post("/sales/:id/deliver", async (request, reply) => {
    try {
      const params = request.params as { id: string };
      const payload = deliverSaleSchema.parse(request.body);
      await salesService.deliver(app.prisma, request.brechoId, params.id, payload);
      return reply.code(204).send();
    } catch (error) {
      if (error instanceof ZodError) {
        return reply.code(400).send({ message: "Validation failed.", issues: error.issues });
      }

      const message = error instanceof Error ? error.message : "Unexpected error.";
      app.log.error(error);

      if (message === "Sale not found.") {
        return reply.code(404).send({ message });
      }

      if (message.startsWith("Invalid status transition:")) {
        return reply.code(409).send({ message });
      }

      return reply.code(400).send({ message });
    }
  });
};
