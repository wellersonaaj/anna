import type { FastifyInstance } from "fastify";
import { ZodError } from "zod";
import { formatZodValidationError } from "../../lib/validation-error.js";
import {
  createDespesaSchema,
  listDespesasQuerySchema,
  updateDespesaSchema
} from "./despesa.schemas.js";
import { despesaService } from "./despesa.service.js";

export const despesaRoutes = async (app: FastifyInstance): Promise<void> => {
  app.get("/despesas", async (request, reply) => {
    try {
      const query = listDespesasQuerySchema.parse(request.query);
      const rows = await despesaService.list(app.prisma, request.brechoId, query.days);
      return reply.send(rows);
    } catch (error) {
      if (error instanceof ZodError) {
        return reply.code(400).send(formatZodValidationError(error));
      }

      const message = error instanceof Error ? error.message : "Unexpected error.";
      app.log.error(error);
      return reply.code(400).send({ message });
    }
  });

  app.post("/despesas", async (request, reply) => {
    try {
      const payload = createDespesaSchema.parse(request.body);
      const created = await despesaService.create(app.prisma, request.brechoId, payload);
      return reply.code(201).send(created);
    } catch (error) {
      if (error instanceof ZodError) {
        return reply.code(400).send(formatZodValidationError(error));
      }

      const message = error instanceof Error ? error.message : "Unexpected error.";
      app.log.error(error);
      return reply.code(400).send({ message });
    }
  });

  app.patch("/despesas/:id", async (request, reply) => {
    try {
      const params = request.params as { id: string };
      const payload = updateDespesaSchema.parse(request.body);
      const updated = await despesaService.update(app.prisma, request.brechoId, params.id, payload);
      return reply.send(updated);
    } catch (error) {
      if (error instanceof ZodError) {
        return reply.code(400).send(formatZodValidationError(error));
      }

      const message = error instanceof Error ? error.message : "Unexpected error.";
      app.log.error(error);

      if (message === "Despesa not found.") {
        return reply.code(404).send({ message });
      }

      return reply.code(400).send({ message });
    }
  });

  app.delete("/despesas/:id", async (request, reply) => {
    try {
      const params = request.params as { id: string };
      await despesaService.remove(app.prisma, request.brechoId, params.id);
      return reply.code(204).send();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unexpected error.";
      app.log.error(error);

      if (message === "Despesa not found.") {
        return reply.code(404).send({ message });
      }

      return reply.code(400).send({ message });
    }
  });
};
