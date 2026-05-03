import type { FastifyInstance } from "fastify";
import { ZodError } from "zod";
import { changePasswordSchema, loginSchema } from "./auth.schemas.js";
import { authService } from "./auth.service.js";

const handleError = (error: unknown, app: FastifyInstance) => {
  if (error instanceof ZodError) {
    return { statusCode: 400, body: { message: "Validation failed.", issues: error.issues } };
  }

  const message = error instanceof Error ? error.message : "Unexpected error.";
  if (message === "Invalid credentials.") {
    return { statusCode: 401, body: { message: "Telefone ou senha inválidos." } };
  }
  if (message === "Current password is incorrect.") {
    return { statusCode: 401, body: { message: "Senha atual incorreta." } };
  }
  if (message === "User has no active brecho access.") {
    return { statusCode: 403, body: { message: "Usuário sem acesso ativo a um brechó." } };
  }
  if (message === "User not found." || message === "Invalid session.") {
    return { statusCode: 401, body: { message: "Sessão inválida." } };
  }
  if (message === "JWT_SECRET is not configured.") {
    return { statusCode: 503, body: { message } };
  }

  app.log.error(error);
  return { statusCode: 400, body: { message } };
};

export const authRoutes = async (app: FastifyInstance): Promise<void> => {
  app.post("/auth/login", async (request, reply) => {
    try {
      const payload = loginSchema.parse(request.body);
      const result = await authService.login(app.prisma, payload.telefone, payload.password);
      return reply.send(result);
    } catch (error) {
      const normalized = handleError(error, app);
      return reply.code(normalized.statusCode).send(normalized.body);
    }
  });

  app.get("/me", async (request, reply) => {
    try {
      if (!request.user) {
        return reply.code(401).send({ message: "Sessão inválida." });
      }
      const result = await authService.me(app.prisma, request.user.id);
      return reply.send(result);
    } catch (error) {
      const normalized = handleError(error, app);
      return reply.code(normalized.statusCode).send(normalized.body);
    }
  });

  app.post("/auth/change-password", async (request, reply) => {
    try {
      if (!request.user) {
        return reply.code(401).send({ message: "Sessão inválida." });
      }
      const auth = request.headers.authorization;
      const token = auth?.startsWith("Bearer ") ? auth.slice("Bearer ".length).trim() : "";
      if (!token) {
        return reply.code(401).send({ message: "Sessão inválida." });
      }
      const payload = await authService.verifyAccessToken(token);
      const body = changePasswordSchema.parse(request.body);
      await authService.changePassword(app.prisma, request.user.id, body, payload.sessionId);
      return reply.code(204).send();
    } catch (error) {
      const normalized = handleError(error, app);
      return reply.code(normalized.statusCode).send(normalized.body);
    }
  });

  app.post("/auth/logout", async (request, reply) => {
    try {
      const auth = request.headers.authorization;
      const token = auth?.startsWith("Bearer ") ? auth.slice("Bearer ".length).trim() : "";
      if (token) {
        const payload = await authService.verifyAccessToken(token);
        await authService.logout(app.prisma, payload.sessionId);
      }
      return reply.code(204).send();
    } catch (error) {
      const normalized = handleError(error, app);
      return reply.code(normalized.statusCode).send(normalized.body);
    }
  });
};
