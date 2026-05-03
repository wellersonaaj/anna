import { z } from "zod";

export const loginSchema = z.object({
  telefone: z.string().min(8),
  password: z.string().min(6)
});

export type LoginInput = z.infer<typeof loginSchema>;
