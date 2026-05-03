import { z } from "zod";

export const loginSchema = z.object({
  telefone: z.string().min(8),
  password: z.string().min(6)
});

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Informe a senha atual."),
    newPassword: z.string().min(6, "A nova senha deve ter pelo menos 6 caracteres.")
  })
  .refine((data) => data.newPassword !== data.currentPassword, {
    message: "A nova senha deve ser diferente da atual.",
    path: ["newPassword"]
  });

export type LoginInput = z.infer<typeof loginSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
