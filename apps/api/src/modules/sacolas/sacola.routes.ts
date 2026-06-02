import type { FastifyInstance } from "fastify";
import { ZodError } from "zod";
import { validationErrorResponse } from "../../lib/validation-error.js";
import { shipSacolaSchema } from "./sacola.schemas.js";
import { sacolaService } from "./sacola.service.js";

const handleError = (error: unknown) => {
  if (error instanceof ZodError) {
    return validationErrorResponse(error);
  }
  const message = error instanceof Error ? error.message : "Unexpected error.";
  if (message === "Sacola not found.") {
    return { statusCode: 404, body: { message } };
  }
  if (message.includes("Invalid sale") || message.includes("Invalid status")) {
    return { statusCode: 400, body: { message } };
  }
  return { statusCode: 400, body: { message } };
};

export const sacolaRoutes = async (app: FastifyInstance): Promise<void> => {
  app.get("/sacolas/pending", async (request, reply) => {
    try {
      const rows = await sacolaService.listPendingGrouped(app.prisma, request.brechoId);
      return reply.send(rows);
    } catch (error) {
      const normalized = handleError(error);
      return reply.code(normalized.statusCode).send(normalized.body);
    }
  });

  app.post("/sacolas/:id/ship", async (request, reply) => {
    try {
      const params = request.params as { id: string };
      const payload = shipSacolaSchema.parse(request.body ?? {});
      const remessa = await sacolaService.shipRemessa(app.prisma, request.brechoId, params.id, payload);
      return reply.code(201).send(remessa);
    } catch (error) {
      const normalized = handleError(error);
      return reply.code(normalized.statusCode).send(normalized.body);
    }
  });
};
