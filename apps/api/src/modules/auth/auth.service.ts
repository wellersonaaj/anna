import { createHash, randomUUID } from "node:crypto";
import bcrypt from "bcryptjs";
import { SignJWT, jwtVerify } from "jose";
import type { Brecho, BrechoMembership, PrismaClient, User, UserRole } from "@prisma/client";
import { env } from "../../config/env.js";

const encoder = new TextEncoder();
const TOKEN_TTL_SECONDS = 60 * 60 * 24 * 7;

export type AuthUser = Pick<User, "id" | "telefone" | "nome" | "email" | "isFounder">;

export type AuthMembership = BrechoMembership & {
  brecho: Pick<Brecho, "id" | "nome" | "slug" | "telefone" | "email" | "avatarUrl" | "plano" | "status" | "trialExpiraEm">;
};

export type AuthPayload = {
  user: AuthUser;
  memberships: AuthMembership[];
  activeBrecho: AuthMembership["brecho"] | null;
};

export type TokenPayload = {
  sub: string;
  sessionId: string;
  brechoId?: string;
};

export const normalizeTelefone = (telefone: string): string => telefone.replace(/\D/g, "");

const jwtSecret = () => {
  const secret = env.JWT_SECRET?.trim();
  if (!secret) {
    throw new Error("JWT_SECRET is not configured.");
  }
  return encoder.encode(secret);
};

export const hashPassword = async (password: string): Promise<string> => bcrypt.hash(password, 12);

export const verifyPassword = async (password: string, hash: string | null | undefined): Promise<boolean> => {
  if (!hash) {
    return false;
  }
  return bcrypt.compare(password, hash);
};

export const hashToken = (token: string): string => createHash("sha256").update(token).digest("hex");

const toAuthUser = (user: User): AuthUser => ({
  id: user.id,
  telefone: user.telefone,
  nome: user.nome,
  email: user.email,
  isFounder: user.isFounder
});

const buildAuthPayload = (user: User & { memberships: AuthMembership[] }): AuthPayload => {
  const memberships = user.memberships.filter((membership) => membership.ativo);
  return {
    user: toAuthUser(user),
    memberships,
    activeBrecho: memberships[0]?.brecho ?? null
  };
};

export const authService = {
  async createAccessToken(input: { userId: string; sessionId: string; brechoId?: string }): Promise<string> {
    const jwt = new SignJWT({
      sessionId: input.sessionId,
      ...(input.brechoId ? { brechoId: input.brechoId } : {})
    })
      .setProtectedHeader({ alg: "HS256" })
      .setSubject(input.userId)
      .setIssuedAt()
      .setExpirationTime(`${TOKEN_TTL_SECONDS}s`);

    return jwt.sign(jwtSecret());
  },

  async verifyAccessToken(token: string): Promise<TokenPayload> {
    const { payload } = await jwtVerify(token, jwtSecret());
    if (!payload.sub || typeof payload.sessionId !== "string") {
      throw new Error("Invalid token.");
    }
    return {
      sub: payload.sub,
      sessionId: payload.sessionId,
      brechoId: typeof payload.brechoId === "string" ? payload.brechoId : undefined
    };
  },

  async login(prisma: PrismaClient, telefoneInput: string, password: string): Promise<AuthPayload & { accessToken: string }> {
    const telefone = normalizeTelefone(telefoneInput);
    const user = await prisma.user.findUnique({
      where: { telefone },
      include: {
        memberships: {
          where: { ativo: true },
          include: { brecho: true },
          orderBy: { criadoEm: "asc" }
        }
      }
    });

    if (!user || !user.ativo || !(await verifyPassword(password, user.passwordHash))) {
      throw new Error("Invalid credentials.");
    }

    if (!user.isFounder && user.memberships.length === 0) {
      throw new Error("User has no active brecho access.");
    }

    const sessionId = randomUUID();
    const activeBrecho = user.memberships[0]?.brecho ?? null;
    const accessToken = await authService.createAccessToken({
      userId: user.id,
      sessionId,
      brechoId: activeBrecho?.id
    });

    await prisma.authSession.create({
      data: {
        id: sessionId,
        userId: user.id,
        ultimoBrechoId: activeBrecho?.id,
        expiraEm: new Date(Date.now() + TOKEN_TTL_SECONDS * 1000)
      }
    });

    return {
      ...buildAuthPayload(user),
      accessToken
    };
  },

  async me(prisma: PrismaClient, userId: string): Promise<AuthPayload> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        memberships: {
          where: { ativo: true },
          include: { brecho: true },
          orderBy: { criadoEm: "asc" }
        }
      }
    });

    if (!user || !user.ativo) {
      throw new Error("User not found.");
    }

    return buildAuthPayload(user);
  },

  async logout(prisma: PrismaClient, sessionId: string): Promise<void> {
    await prisma.authSession
      .update({
        where: { id: sessionId },
        data: { revogadoEm: new Date() }
      })
      .catch(() => undefined);
  },

  async assertSession(prisma: PrismaClient, sessionId: string): Promise<void> {
    const session = await prisma.authSession.findUnique({ where: { id: sessionId } });
    if (!session || session.revogadoEm || session.expiraEm.getTime() <= Date.now()) {
      throw new Error("Invalid session.");
    }
  },

  async changePassword(
    prisma: PrismaClient,
    userId: string,
    input: { currentPassword: string; newPassword: string },
    keepSessionId: string
  ): Promise<void> {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user || !user.ativo) {
      throw new Error("User not found.");
    }
    if (!(await verifyPassword(input.currentPassword, user.passwordHash))) {
      throw new Error("Current password is incorrect.");
    }

    const passwordHash = await hashPassword(input.newPassword);

    await prisma.$transaction([
      prisma.user.update({ where: { id: userId }, data: { passwordHash } }),
      prisma.authSession.updateMany({
        where: {
          userId,
          id: { not: keepSessionId },
          revogadoEm: null
        },
        data: { revogadoEm: new Date() }
      })
    ]);
  }
};

export const roleAllowsOperationalAccess = (role: UserRole | undefined): boolean => role === "DONO" || role === "OPERADOR";
