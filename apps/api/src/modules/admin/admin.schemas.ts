import { z } from "zod";

const nonEmptyOptional = z.string().trim().min(1).optional();

export const listBrechosQuerySchema = z.object({
  search: z.string().trim().optional(),
  status: z.enum(["ATIVO", "TRIAL", "SUSPENSO"]).optional()
});

export const createBrechoSchema = z.object({
  nome: z.string().trim().min(2),
  slug: nonEmptyOptional,
  telefone: z.string().trim().min(8),
  email: z.string().trim().email().optional().or(z.literal("")),
  avatarUrl: z.string().trim().url().optional().or(z.literal("")),
  plano: z.enum(["BASICO", "MEDIO", "PRO", "TRIAL"]).default("TRIAL"),
  status: z.enum(["ATIVO", "TRIAL", "SUSPENSO"]).default("TRIAL"),
  trialExpiraEm: z.string().datetime().optional()
});

export const updateBrechoSchema = createBrechoSchema.partial();

export const createBrechoUserSchema = z.object({
  nome: z.string().trim().min(2).optional(),
  telefone: z.string().trim().min(8),
  email: z.string().trim().email().optional().or(z.literal("")),
  password: z.string().min(6).optional()
});

export const updateUserSchema = z.object({
  nome: z.string().trim().min(2).optional(),
  telefone: z.string().trim().min(8).optional(),
  email: z.string().trim().email().optional().or(z.literal("")),
  ativo: z.boolean().optional(),
  membershipAtivo: z.boolean().optional(),
  brechoId: z.string().optional()
});

export const resetPasswordSchema = z.object({
  password: z.string().min(6).optional()
});

export type CreateBrechoInput = z.infer<typeof createBrechoSchema>;
export type UpdateBrechoInput = z.infer<typeof updateBrechoSchema>;
export type CreateBrechoUserInput = z.infer<typeof createBrechoUserSchema>;
export type UpdateUserInput = z.infer<typeof updateUserSchema>;
