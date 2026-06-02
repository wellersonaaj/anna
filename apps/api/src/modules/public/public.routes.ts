import type { FastifyInstance } from "fastify";
import { ZodError } from "zod";
import { z } from "zod";
import { formatZodValidationError } from "../../lib/validation-error.js";
import { clienteContatoSchema } from "../clients/client.schemas.js";
import { publicQueueService } from "./public.service.js";

const joinBodySchema = z.object({
  cliente: clienteContatoSchema
});

const joinRateLimit = new Map<string, { count: number; resetAt: number }>();

const checkRateLimit = (ip: string): boolean => {
  const now = Date.now();
  const entry = joinRateLimit.get(ip);
  if (!entry || now > entry.resetAt) {
    joinRateLimit.set(ip, { count: 1, resetAt: now + 60_000 });
    return true;
  }
  if (entry.count >= 10) {
    return false;
  }
  entry.count += 1;
  return true;
};

export const publicRoutes = async (app: FastifyInstance): Promise<void> => {
  app.get("/public/queue/:token", async (request, reply) => {
    try {
      const params = request.params as { token: string };
      const info = await publicQueueService.getQueueInfo(app.prisma, params.token);
      return reply.send(info);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unexpected error.";
      if (message === "Link not found.") {
        return reply.code(404).send({ message: "Link inválido ou expirado." });
      }
      return reply.code(400).send({ message });
    }
  });

  app.post("/public/queue/:token/join", async (request, reply) => {
    try {
      const ip = request.ip;
      if (!checkRateLimit(ip)) {
        return reply.code(429).send({ message: "Muitas tentativas. Aguarde um minuto." });
      }

      const params = request.params as { token: string };
      const body = joinBodySchema.parse(request.body);
      const result = await publicQueueService.joinQueue(app.prisma, params.token, body.cliente);
      return reply.code(201).send(result);
    } catch (error) {
      if (error instanceof ZodError) {
        return reply.code(400).send(formatZodValidationError(error));
      }
      const message = error instanceof Error ? error.message : "Unexpected error.";
      if (message === "Link not found.") {
        return reply.code(404).send({ message: "Link inválido ou expirado." });
      }
      if (message === "Already in queue." || message === "Item not available for queue.") {
        return reply.code(409).send({ message });
      }
      return reply.code(400).send({ message });
    }
  });
};
