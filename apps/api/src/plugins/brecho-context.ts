import fp from "fastify-plugin";
import { env } from "../config/env.js";
import { authService } from "../modules/auth/auth.service.js";

export const brechoContextPlugin = fp(async (app) => {
  app.addHook("onRequest", async (request, reply) => {
    if (request.method === "OPTIONS") {
      return;
    }

    const path = request.url.split("?")[0] ?? "";
    if (path === "/health" || path === "/auth/login") {
      return;
    }

    const auth = request.headers.authorization;
    const token = auth?.startsWith("Bearer ") ? auth.slice("Bearer ".length).trim() : "";

    if (!token) {
      const brechoHeader = request.headers["x-brecho-id"];
      const brechoId = Array.isArray(brechoHeader) ? brechoHeader[0] : brechoHeader;
      if (env.NODE_ENV !== "production" && brechoId && !path.startsWith("/admin") && path !== "/me") {
        request.brechoId = brechoId;
        return;
      }

      reply.code(401).send({ message: "Authorization bearer token is required." });
      return;
    }

    try {
      const tokenPayload = await authService.verifyAccessToken(token);
      await authService.assertSession(app.prisma, tokenPayload.sessionId);

      const user = await app.prisma.user.findUnique({
        where: { id: tokenPayload.sub }
      });

      if (!user || !user.ativo) {
        reply.code(401).send({ message: "Invalid session." });
        return;
      }

      request.user = {
        id: user.id,
        telefone: user.telefone,
        nome: user.nome,
        email: user.email,
        isFounder: user.isFounder
      };

      if (path.startsWith("/admin")) {
        if (!user.isFounder) {
          reply.code(403).send({ message: "Founder access is required." });
          return;
        }
        return;
      }

      if (path === "/me" || path === "/auth/logout") {
        return;
      }

      const membership = await app.prisma.brechoMembership.findFirst({
        where: {
          userId: user.id,
          ativo: true,
          ...(tokenPayload.brechoId ? { brechoId: tokenPayload.brechoId } : {})
        },
        orderBy: { criadoEm: "asc" }
      });

      if (!membership) {
        reply.code(403).send({ message: "No active brecho access." });
        return;
      }

      request.brechoId = membership.brechoId;
      request.role = membership.role;
    } catch (error) {
      request.log.warn({ error }, "auth_context_failed");
      reply.code(401).send({ message: "Invalid session." });
    }
  });
});
