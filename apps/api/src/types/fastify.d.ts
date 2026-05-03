import type { PrismaClient, UserRole } from "@prisma/client";

declare module "fastify" {
  interface FastifyInstance {
    prisma: PrismaClient;
  }

  interface FastifyRequest {
    brechoId: string;
    user?: {
      id: string;
      telefone: string;
      nome: string | null;
      email: string | null;
      isFounder: boolean;
    };
    role?: UserRole;
  }
}
