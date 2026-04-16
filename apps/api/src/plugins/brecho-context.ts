import fp from "fastify-plugin";

export const brechoContextPlugin = fp(async (app) => {
  app.addHook("onRequest", async (request, reply) => {
    const brechoHeader = request.headers["x-brecho-id"];
    const brechoId = Array.isArray(brechoHeader) ? brechoHeader[0] : brechoHeader;

    if (!brechoId) {
      reply.code(400).send({ message: "x-brecho-id header is required." });
      return;
    }

    request.brechoId = brechoId;
  });
});
