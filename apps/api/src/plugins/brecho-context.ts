import fp from "fastify-plugin";

export const brechoContextPlugin = fp(async (app) => {
  app.addHook("onRequest", async (request, reply) => {
    // CORS preflight does not send custom headers (e.g. x-brecho-id); @fastify/cors handles OPTIONS.
    if (request.method === "OPTIONS") {
      return;
    }

    const path = request.url.split("?")[0];
    if (path === "/health") {
      return;
    }

    const brechoHeader = request.headers["x-brecho-id"];
    const brechoId = Array.isArray(brechoHeader) ? brechoHeader[0] : brechoHeader;

    if (!brechoId) {
      reply.code(400).send({ message: "x-brecho-id header is required." });
      return;
    }

    request.brechoId = brechoId;
  });
});
