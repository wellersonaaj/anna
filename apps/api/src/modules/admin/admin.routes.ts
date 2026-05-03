import type { FastifyInstance } from "fastify";
import { ZodError } from "zod";
import {
  createBrechoSchema,
  createBrechoUserSchema,
  listBrechosQuerySchema,
  resetPasswordSchema,
  updateBrechoSchema,
  updateUserSchema
} from "./admin.schemas.js";
import { adminService } from "./admin.service.js";

const handleError = (error: unknown, app: FastifyInstance) => {
  if (error instanceof ZodError) {
    return { statusCode: 400, body: { message: "Validation failed.", issues: error.issues } };
  }

  const message = error instanceof Error ? error.message : "Unexpected error.";
  app.log.error(error);

  if (message === "Brecho not found.") {
    return { statusCode: 404, body: { message } };
  }

  if (message.includes("Unique constraint failed")) {
    return { statusCode: 409, body: { message: "Registro já existe com dados únicos informados." } };
  }

  return { statusCode: 400, body: { message } };
};

export const adminRoutes = async (app: FastifyInstance): Promise<void> => {
  app.get("/admin/brechos", async (request, reply) => {
    try {
      const query = listBrechosQuerySchema.parse(request.query);
      const result = await adminService.listBrechos(app.prisma, query);
      return reply.send(result);
    } catch (error) {
      const normalized = handleError(error, app);
      return reply.code(normalized.statusCode).send(normalized.body);
    }
  });

  app.post("/admin/brechos", async (request, reply) => {
    try {
      const payload = createBrechoSchema.parse(request.body);
      const result = await adminService.createBrecho(app.prisma, payload);
      return reply.code(201).send(result);
    } catch (error) {
      const normalized = handleError(error, app);
      return reply.code(normalized.statusCode).send(normalized.body);
    }
  });

  app.get("/admin/brechos/:brechoId", async (request, reply) => {
    try {
      const params = request.params as { brechoId: string };
      const result = await adminService.getBrecho(app.prisma, params.brechoId);
      return reply.send(result);
    } catch (error) {
      const normalized = handleError(error, app);
      return reply.code(normalized.statusCode).send(normalized.body);
    }
  });

  app.patch("/admin/brechos/:brechoId", async (request, reply) => {
    try {
      const params = request.params as { brechoId: string };
      const payload = updateBrechoSchema.parse(request.body);
      const result = await adminService.updateBrecho(app.prisma, params.brechoId, payload);
      return reply.send(result);
    } catch (error) {
      const normalized = handleError(error, app);
      return reply.code(normalized.statusCode).send(normalized.body);
    }
  });

  app.post("/admin/brechos/:brechoId/users", async (request, reply) => {
    try {
      const params = request.params as { brechoId: string };
      const payload = createBrechoUserSchema.parse(request.body);
      const result = await adminService.createBrechoUser(app.prisma, params.brechoId, payload);
      return reply.code(201).send(result);
    } catch (error) {
      const normalized = handleError(error, app);
      return reply.code(normalized.statusCode).send(normalized.body);
    }
  });

  app.patch("/admin/users/:userId", async (request, reply) => {
    try {
      const params = request.params as { userId: string };
      const payload = updateUserSchema.parse(request.body);
      const result = await adminService.updateUser(app.prisma, params.userId, payload);
      return reply.send(result);
    } catch (error) {
      const normalized = handleError(error, app);
      return reply.code(normalized.statusCode).send(normalized.body);
    }
  });

  app.post("/admin/users/:userId/reset-password", async (request, reply) => {
    try {
      const params = request.params as { userId: string };
      const payload = resetPasswordSchema.parse(request.body ?? {});
      const result = await adminService.resetPassword(app.prisma, params.userId, payload.password);
      return reply.send(result);
    } catch (error) {
      const normalized = handleError(error, app);
      return reply.code(normalized.statusCode).send(normalized.body);
    }
  });
};
