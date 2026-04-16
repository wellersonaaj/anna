import { z } from "zod";

export const clienteContatoSchema = z
  .object({
    nome: z.string().trim().min(2).max(120),
    whatsapp: z.string().trim().max(40).optional(),
    instagram: z.string().trim().max(80).optional()
  })
  .superRefine((data, ctx) => {
    const w = data.whatsapp?.replace(/\s/g, "") ?? "";
    const i = data.instagram?.replace(/^@+/, "").trim() ?? "";
    if (!w && !i) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Informe WhatsApp ou Instagram.",
        path: ["whatsapp"]
      });
    }
  });

/** Alias: criacao direta usa o mesmo shape de contato da reserva/venda. */
export const createClientSchema = clienteContatoSchema;

export const searchClientsQuerySchema = z.object({
  search: z
    .string()
    .trim()
    .optional()
    .transform((value) => (value && value.length > 0 ? value : undefined)),
  limit: z.coerce.number().int().min(1).max(50).default(20)
});
