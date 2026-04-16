import type { FastifyInstance } from "fastify";
import { ZodError } from "zod";
import {
  acervoSuggestionsQuerySchema,
  addPecaFotoSchema,
  createFotoLoteSchema,
  createItemSchema,
  listItemsQuerySchema,
  patchFotoLoteSchema,
  presignFotoLoteSchema,
  reserveItemSchema,
  sellItemSchema
} from "./item.schemas.js";
import { itemService } from "./item.service.js";

const handleError = (error: unknown, app: FastifyInstance) => {
  if (error instanceof ZodError) {
    return { statusCode: 400, body: { message: "Validation failed.", issues: error.issues } };
  }

  const message = error instanceof Error ? error.message : "Unexpected error.";
  app.log.error(error);

  if (message === "Item not found.") {
    return { statusCode: 404, body: { message } };
  }

  if (message === "Photo not found.") {
    return { statusCode: 404, body: { message } };
  }

  if (message === "Photo order conflict.") {
    return { statusCode: 409, body: { message } };
  }

  if (message === "Queue entry not found.") {
    return { statusCode: 404, body: { message } };
  }

  if (message === "Already in queue." || message === "Item not available for queue.") {
    return { statusCode: 409, body: { message } };
  }

  if (message.startsWith("Invalid status transition:")) {
    return { statusCode: 409, body: { message } };
  }

  if (message === "Photo limit reached.") {
    return { statusCode: 409, body: { message } };
  }

  if (message === "Lote not found.") {
    return { statusCode: 404, body: { message } };
  }

  if (message === "Storage is not configured." || message === "OpenAI is not configured.") {
    return { statusCode: 503, body: { message } };
  }

  if (message === "Lote has no audio URL.") {
    return { statusCode: 400, body: { message } };
  }

  if (
    message.startsWith("Failed to download audio") ||
    message.startsWith("Transcription failed:")
  ) {
    return { statusCode: 502, body: { message } };
  }

  if (
    message === "Failed to download image for analysis." ||
    message === "Empty S3 object body." ||
    message.startsWith("Image analysis failed:") ||
    message.startsWith("Invalid AI response:")
  ) {
    return { statusCode: 502, body: { message } };
  }

  return { statusCode: 400, body: { message } };
};

export const itemRoutes = async (app: FastifyInstance): Promise<void> => {
  app.get("/acervos/suggestions", async (request, reply) => {
    try {
      const query = acervoSuggestionsQuerySchema.parse(request.query);
      const suggestions = await itemService.listAcervoSuggestions(app.prisma, request.brechoId, query);
      return reply.send(suggestions);
    } catch (error) {
      const normalized = handleError(error, app);
      return reply.code(normalized.statusCode).send(normalized.body);
    }
  });

  app.post("/items", async (request, reply) => {
    try {
      const payload = createItemSchema.parse(request.body);
      const item = await itemService.create(app.prisma, request.brechoId, payload);
      return reply.code(201).send(item);
    } catch (error) {
      const normalized = handleError(error, app);
      return reply.code(normalized.statusCode).send(normalized.body);
    }
  });

  app.get("/items", async (request, reply) => {
    try {
      const query = listItemsQuerySchema.parse(request.query);
      const items = await itemService.list(app.prisma, request.brechoId, query);
      return reply.send(items);
    } catch (error) {
      const normalized = handleError(error, app);
      return reply.code(normalized.statusCode).send(normalized.body);
    }
  });

  app.get("/items/:id", async (request, reply) => {
    try {
      const params = request.params as { id: string };
      const item = await itemService.findById(app.prisma, request.brechoId, params.id);

      if (!item) {
        return reply.code(404).send({ message: "Item not found." });
      }

      return reply.send(item);
    } catch (error) {
      const normalized = handleError(error, app);
      return reply.code(normalized.statusCode).send(normalized.body);
    }
  });

  app.post("/items/:id/foto-lotes", async (request, reply) => {
    try {
      const params = request.params as { id: string };
      const body = createFotoLoteSchema.parse(request.body);
      const lote = await itemService.createFotoLote(app.prisma, request.brechoId, params.id, body);
      return reply.code(201).send(lote);
    } catch (error) {
      const normalized = handleError(error, app);
      return reply.code(normalized.statusCode).send(normalized.body);
    }
  });

  app.patch("/items/:id/foto-lotes/:loteId", async (request, reply) => {
    try {
      const params = request.params as { id: string; loteId: string };
      const body = patchFotoLoteSchema.parse(request.body);
      const lote = await itemService.patchFotoLote(
        app.prisma,
        request.brechoId,
        params.id,
        params.loteId,
        body
      );
      return reply.send(lote);
    } catch (error) {
      const normalized = handleError(error, app);
      return reply.code(normalized.statusCode).send(normalized.body);
    }
  });

  app.post("/items/:id/foto-lotes/:loteId/presign", async (request, reply) => {
    try {
      const params = request.params as { id: string; loteId: string };
      const body = presignFotoLoteSchema.parse(request.body);
      const signed = await itemService.presignFotoLoteUpload(app.prisma, request.brechoId, params.id, params.loteId, {
        tipo: body.tipo,
        contentType: body.contentType,
        extensao: body.extensao
      });
      return reply.send({
        uploadUrl: signed.uploadUrl,
        publicUrl: signed.publicUrl
      });
    } catch (error) {
      const normalized = handleError(error, app);
      return reply.code(normalized.statusCode).send(normalized.body);
    }
  });

  app.post("/items/:id/foto-lotes/:loteId/transcribe", async (request, reply) => {
    try {
      const params = request.params as { id: string; loteId: string };
      const lote = await itemService.transcribeFotoLoteAudio(
        app.prisma,
        request.brechoId,
        params.id,
        params.loteId
      );
      return reply.send(lote);
    } catch (error) {
      const normalized = handleError(error, app);
      return reply.code(normalized.statusCode).send(normalized.body);
    }
  });

  app.post("/items/:id/fotos", async (request, reply) => {
    try {
      const params = request.params as { id: string };
      const payload = addPecaFotoSchema.parse(request.body);
      const foto = await itemService.addFoto(app.prisma, request.brechoId, params.id, payload);
      return reply.code(201).send(foto);
    } catch (error) {
      const normalized = handleError(error, app);
      return reply.code(normalized.statusCode).send(normalized.body);
    }
  });

  app.post("/items/:id/fotos/:fotoId/analisar", async (request, reply) => {
    try {
      const params = request.params as { id: string; fotoId: string };
      const result = await itemService.analisarFoto(
        app.prisma,
        request.brechoId,
        params.id,
        params.fotoId
      );
      return reply.send(result);
    } catch (error) {
      const normalized = handleError(error, app);
      return reply.code(normalized.statusCode).send(normalized.body);
    }
  });

  app.delete("/items/:id/fotos/:fotoId", async (request, reply) => {
    try {
      const params = request.params as { id: string; fotoId: string };
      await itemService.removeFoto(app.prisma, request.brechoId, params.id, params.fotoId);
      return reply.code(204).send();
    } catch (error) {
      const normalized = handleError(error, app);
      return reply.code(normalized.statusCode).send(normalized.body);
    }
  });

  app.post("/items/:id/fila", async (request, reply) => {
    try {
      const params = request.params as { id: string };
      const payload = reserveItemSchema.parse(request.body);
      const entry = await itemService.joinFila(app.prisma, request.brechoId, params.id, payload.cliente);
      return reply.code(201).send(entry);
    } catch (error) {
      const normalized = handleError(error, app);
      return reply.code(normalized.statusCode).send(normalized.body);
    }
  });

  app.delete("/items/:id/fila/:entradaId", async (request, reply) => {
    try {
      const params = request.params as { id: string; entradaId: string };
      await itemService.removeFilaEntry(app.prisma, request.brechoId, params.id, params.entradaId);
      return reply.code(204).send();
    } catch (error) {
      const normalized = handleError(error, app);
      return reply.code(normalized.statusCode).send(normalized.body);
    }
  });

  app.post("/items/:id/reserve", async (request, reply) => {
    try {
      const params = request.params as { id: string };
      const payload = reserveItemSchema.parse(request.body);
      const item = await itemService.reserve(app.prisma, request.brechoId, params.id, payload.cliente);
      return reply.send(item);
    } catch (error) {
      const normalized = handleError(error, app);
      return reply.code(normalized.statusCode).send(normalized.body);
    }
  });

  app.post("/items/:id/sell", async (request, reply) => {
    try {
      const params = request.params as { id: string };
      const payload = sellItemSchema.parse(request.body);
      const item = await itemService.sell(app.prisma, request.brechoId, params.id, payload);
      return reply.send(item);
    } catch (error) {
      const normalized = handleError(error, app);
      return reply.code(normalized.statusCode).send(normalized.body);
    }
  });
};
