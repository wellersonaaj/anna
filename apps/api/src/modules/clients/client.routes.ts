import type { FastifyInstance } from "fastify";
import { ZodError } from "zod";
import { createClientSchema, searchClientsQuerySchema } from "./client.schemas.js";
import { clientService } from "./client.service.js";

const handleError = (error: unknown, app: FastifyInstance) => {
  if (error instanceof ZodError) {
    return { statusCode: 400, body: { message: "Validation failed.", issues: error.issues } };
  }

  const message = error instanceof Error ? error.message : "Unexpected error.";
  app.log.error(error);

  if (message === "Client not found.") {
    return { statusCode: 404, body: { message } };
  }

  return { statusCode: 400, body: { message } };
};

export const clientRoutes = async (app: FastifyInstance): Promise<void> => {
  app.get("/clients", async (request, reply) => {
    try {
      const query = searchClientsQuerySchema.parse(request.query);
      const clients = await clientService.search(
        app.prisma,
        request.brechoId,
        query.search,
        query.limit
      );
      return reply.send(clients);
    } catch (error) {
      const normalized = handleError(error, app);
      return reply.code(normalized.statusCode).send(normalized.body);
    }
  });

  app.post("/clients", async (request, reply) => {
    try {
      const payload = createClientSchema.parse(request.body);
      const client = await clientService.findOrCreateCliente(app.prisma, request.brechoId, payload);
      return reply.code(201).send(client);
    } catch (error) {
      const normalized = handleError(error, app);
      return reply.code(normalized.statusCode).send(normalized.body);
    }
  });

  app.get("/clients/:id", async (request, reply) => {
    try {
      const params = request.params as { id: string };
      const client = await clientService.findByIdWithHistory(app.prisma, request.brechoId, params.id);

      if (!client) {
        return reply.code(404).send({ message: "Client not found." });
      }

      return reply.send(client);
    } catch (error) {
      const normalized = handleError(error, app);
      return reply.code(normalized.statusCode).send(normalized.body);
    }
  });
};
