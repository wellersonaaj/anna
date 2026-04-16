import type { FastifyInstance } from "fastify";

export const healthRoutes = async (app: FastifyInstance): Promise<void> => {
  app.get("/health", async () => {
    return { ok: true };
  });
};
