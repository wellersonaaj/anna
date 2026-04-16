import { randomUUID } from "node:crypto";
import Fastify from "fastify";
import cors from "@fastify/cors";
import { env } from "./config/env.js";
import { brechoContextPlugin } from "./plugins/brecho-context.js";
import { prismaPlugin } from "./plugins/prisma.js";
import { healthRoutes } from "./modules/health/health.routes.js";
import { clientRoutes } from "./modules/clients/client.routes.js";
import { itemRoutes } from "./modules/items/item.routes.js";
import { salesRoutes } from "./modules/sales/sales.routes.js";

export const buildServer = () => {
  const app = Fastify({
    logger: true,
    genReqId: (req) => {
      const h = req.headers["x-request-id"];
      if (typeof h === "string" && h.length > 0) {
        return h;
      }
      if (Array.isArray(h) && h[0]) {
        return h[0];
      }
      return randomUUID();
    }
  });

  app.register(cors, {
    origin: true
  });

  app.register(prismaPlugin);
  app.register(healthRoutes);
  app.register(brechoContextPlugin);

  app.addHook("onResponse", async (request, reply) => {
    const brechoId = (request as { brechoId?: string }).brechoId;
    request.log.info(
      {
        reqId: request.id,
        brechoId,
        method: request.method,
        url: request.url,
        statusCode: reply.statusCode
      },
      "request_completed"
    );
  });

  app.register(clientRoutes);
  app.register(itemRoutes);
  app.register(salesRoutes);

  return app;
};

export const startServer = async () => {
  const app = buildServer();
  await app.listen({
    host: env.API_HOST,
    port: env.PORT ?? env.API_PORT
  });
};
