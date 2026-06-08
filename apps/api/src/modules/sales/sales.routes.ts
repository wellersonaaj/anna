import type { FastifyInstance } from "fastify";
import { ZodError } from "zod";
import { formatZodValidationError } from "../../lib/validation-error.js";
import {
  deliverSaleSchema,
  listDeliveredSalesQuerySchema,
  missingCostSalesQuerySchema,
  periodSummaryQuerySchema,
  updateSaleSchema
} from "./sales.schemas.js";
import { salesService } from "./sales.service.js";

export const salesRoutes = async (app: FastifyInstance): Promise<void> => {
  app.get("/sales/pending-delivery", async (request, reply) => {
    const sales = await salesService.listPendingDelivery(app.prisma, request.brechoId);
    return reply.send(sales);
  });

  app.get("/sales/period-summary", async (request, reply) => {
    try {
      const query = periodSummaryQuerySchema.parse(request.query);
      const summary = await salesService.getPeriodSummary(app.prisma, request.brechoId, query.days);
      return reply.send(summary);
    } catch (error) {
      if (error instanceof ZodError) {
        return reply.code(400).send(formatZodValidationError(error));
      }

      const message = error instanceof Error ? error.message : "Unexpected error.";
      app.log.error(error);
      return reply.code(400).send({ message });
    }
  });

  app.get("/sales/missing-cost", async (request, reply) => {
    try {
      const query = missingCostSalesQuerySchema.parse(request.query);
      const result = await salesService.listMissingCost(app.prisma, request.brechoId, query);
      return reply.send(result);
    } catch (error) {
      if (error instanceof ZodError) {
        return reply.code(400).send(formatZodValidationError(error));
      }

      const message = error instanceof Error ? error.message : "Unexpected error.";
      app.log.error(error);
      return reply.code(400).send({ message });
    }
  });

  app.get("/sales/delivered", async (request, reply) => {
    try {
      const query = listDeliveredSalesQuerySchema.parse(request.query);
      const delivered = await salesService.listDelivered(app.prisma, request.brechoId, query);
      return reply.send(delivered);
    } catch (error) {
      if (error instanceof ZodError) {
        return reply.code(400).send(formatZodValidationError(error));
      }

      const message = error instanceof Error ? error.message : "Unexpected error.";
      app.log.error(error);
      return reply.code(400).send({ message });
    }
  });

  app.patch("/sales/:id", async (request, reply) => {
    try {
      const params = request.params as { id: string };
      const payload = updateSaleSchema.parse(request.body);
      const updated = await salesService.update(app.prisma, request.brechoId, params.id, payload);
      return reply.send(updated);
    } catch (error) {
      if (error instanceof ZodError) {
        return reply.code(400).send(formatZodValidationError(error));
      }

      const message = error instanceof Error ? error.message : "Unexpected error.";
      app.log.error(error);

      if (message === "Sale not found.") {
        return reply.code(404).send({ message });
      }

      if (message === "Cannot change freight flag on delivered sale." || message === "No fields to update.") {
        return reply.code(409).send({ message });
      }

      return reply.code(400).send({ message });
    }
  });

  app.post("/sales/:id/deliver", async (request, reply) => {
    try {
      const params = request.params as { id: string };
      const payload = deliverSaleSchema.parse(request.body);
      await salesService.deliver(app.prisma, request.brechoId, params.id, payload);
      return reply.code(204).send();
    } catch (error) {
      if (error instanceof ZodError) {
        return reply.code(400).send(formatZodValidationError(error));
      }

      const message = error instanceof Error ? error.message : "Unexpected error.";
      app.log.error(error);

      if (message === "Sale not found.") {
        return reply.code(404).send({ message });
      }

      if (message === "Sale already delivered.") {
        return reply.code(409).send({ message });
      }

      if (message.startsWith("Invalid status transition:")) {
        return reply.code(409).send({ message });
      }

      return reply.code(400).send({ message });
    }
  });
};
