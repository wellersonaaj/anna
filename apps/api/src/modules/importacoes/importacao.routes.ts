import type { FastifyInstance } from "fastify";
import { ZodError } from "zod";
import {
  patchImportGruposSchema,
  patchImportRascunhoSchema,
  presignImportFotoSchema,
  publicarImportRascunhoSchema,
  registerImportFotoSchema
} from "./importacao.schemas.js";
import { importacaoService } from "./importacao.service.js";

const handleError = (error: unknown, app: FastifyInstance) => {
  if (error instanceof ZodError) {
    return { statusCode: 400, body: { message: "Validation failed.", issues: error.issues } };
  }
  const message = error instanceof Error ? error.message : "Unexpected error.";
  app.log.error(error);

  if (message === "Import lot not found." || message === "Rascunho not found.") {
    return { statusCode: 404, body: { message } };
  }

  if (
    message === "Storage is not configured." ||
    message === "OpenAI is not configured." ||
    message.startsWith("Image analysis failed:") ||
    message.startsWith("Invalid AI response:") ||
    message === "Failed to download image for analysis." ||
    message === "Empty S3 object body."
  ) {
    return { statusCode: 503, body: { message } };
  }

  return { statusCode: 400, body: { message } };
};

export const importacaoRoutes = async (app: FastifyInstance): Promise<void> => {
  app.post("/importacoes", async (request, reply) => {
    try {
      const lote = await importacaoService.createLote(app.prisma, request.brechoId);
      return reply.code(201).send(lote);
    } catch (error) {
      const normalized = handleError(error, app);
      return reply.code(normalized.statusCode).send(normalized.body);
    }
  });

  app.get("/importacoes", async (request, reply) => {
    try {
      const list = await importacaoService.listLotes(app.prisma, request.brechoId);
      return reply.send(list);
    } catch (error) {
      const normalized = handleError(error, app);
      return reply.code(normalized.statusCode).send(normalized.body);
    }
  });

  app.get("/importacoes/metricas/resumo", async (request, reply) => {
    try {
      const summary = await importacaoService.metricasResumo(app.prisma, request.brechoId);
      return reply.send(summary);
    } catch (error) {
      const normalized = handleError(error, app);
      return reply.code(normalized.statusCode).send(normalized.body);
    }
  });

  app.get("/importacoes/pendentes/count", async (request, reply) => {
    try {
      const count = await importacaoService.countPendentes(app.prisma, request.brechoId);
      return reply.send({ count });
    } catch (error) {
      const normalized = handleError(error, app);
      return reply.code(normalized.statusCode).send(normalized.body);
    }
  });

  app.get("/importacoes/:loteId", async (request, reply) => {
    try {
      const params = request.params as { loteId: string };
      const detail = await importacaoService.getLoteDetail(app.prisma, request.brechoId, params.loteId);
      return reply.send(detail);
    } catch (error) {
      const normalized = handleError(error, app);
      return reply.code(normalized.statusCode).send(normalized.body);
    }
  });

  app.post("/importacoes/:loteId/fotos/presign", async (request, reply) => {
    try {
      const params = request.params as { loteId: string };
      const body = presignImportFotoSchema.parse(request.body);
      const signed = await importacaoService.presignFoto(app.prisma, request.brechoId, params.loteId, body);
      return reply.send(signed);
    } catch (error) {
      const normalized = handleError(error, app);
      return reply.code(normalized.statusCode).send(normalized.body);
    }
  });

  app.post("/importacoes/:loteId/fotos", async (request, reply) => {
    try {
      const params = request.params as { loteId: string };
      const body = registerImportFotoSchema.parse(request.body);
      const foto = await importacaoService.registerFoto(app.prisma, request.brechoId, params.loteId, body);
      return reply.code(201).send(foto);
    } catch (error) {
      const normalized = handleError(error, app);
      return reply.code(normalized.statusCode).send(normalized.body);
    }
  });

  app.post("/importacoes/:loteId/agrupar", async (request, reply) => {
    try {
      const params = request.params as { loteId: string };
      const detail = await importacaoService.agrupar(app.prisma, request.brechoId, params.loteId);
      return reply.send(detail);
    } catch (error) {
      const normalized = handleError(error, app);
      return reply.code(normalized.statusCode).send(normalized.body);
    }
  });

  app.patch("/importacoes/:loteId/grupos", async (request, reply) => {
    try {
      const params = request.params as { loteId: string };
      const body = patchImportGruposSchema.parse(request.body);
      const detail = await importacaoService.patchGrupos(app.prisma, request.brechoId, params.loteId, body);
      return reply.send(detail);
    } catch (error) {
      const normalized = handleError(error, app);
      return reply.code(normalized.statusCode).send(normalized.body);
    }
  });

  app.post("/importacoes/:loteId/grupos/confirmar", async (request, reply) => {
    try {
      const params = request.params as { loteId: string };
      const detail = await importacaoService.confirmarGrupos(app.prisma, request.brechoId, params.loteId);
      return reply.send(detail);
    } catch (error) {
      const normalized = handleError(error, app);
      return reply.code(normalized.statusCode).send(normalized.body);
    }
  });

  app.post("/importacoes/:loteId/classificar", async (request, reply) => {
    try {
      const params = request.params as { loteId: string };
      const result = await importacaoService.classificar(app.prisma, request.brechoId, params.loteId);
      return reply.send(result);
    } catch (error) {
      const normalized = handleError(error, app);
      return reply.code(normalized.statusCode).send(normalized.body);
    }
  });

  app.patch("/importacoes/:loteId/rascunhos/:rascunhoId", async (request, reply) => {
    try {
      const params = request.params as { loteId: string; rascunhoId: string };
      const body = patchImportRascunhoSchema.parse(request.body);
      const updated = await importacaoService.patchRascunho(
        app.prisma,
        request.brechoId,
        params.loteId,
        params.rascunhoId,
        body
      );
      return reply.send(updated);
    } catch (error) {
      const normalized = handleError(error, app);
      return reply.code(normalized.statusCode).send(normalized.body);
    }
  });

  app.post("/importacoes/:loteId/rascunhos/:rascunhoId/publicar", async (request, reply) => {
    try {
      const params = request.params as { loteId: string; rascunhoId: string };
      const body = publicarImportRascunhoSchema.parse(request.body ?? {});
      const out = await importacaoService.publicarRascunho(
        app.prisma,
        request.brechoId,
        params.loteId,
        params.rascunhoId,
        body
      );
      return reply.send(out);
    } catch (error) {
      const normalized = handleError(error, app);
      return reply.code(normalized.statusCode).send(normalized.body);
    }
  });
};
