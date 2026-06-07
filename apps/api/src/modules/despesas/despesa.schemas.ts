import { z } from "zod";
import { normalizeMoneyInput } from "../../lib/money.js";

const moneyPositiveSchema = z.preprocess(normalizeMoneyInput, z.number().positive());

export const despesaCategoriaSchema = z.enum(["MARKETING", "PLATAFORMAS", "EMBALAGEM", "OUTROS"]);

export const listDespesasQuerySchema = z.object({
  days: z.coerce.number().int().min(1).max(180).default(30)
});

export const createDespesaSchema = z.object({
  categoria: despesaCategoriaSchema,
  valor: moneyPositiveSchema,
  descricao: z.string().trim().max(200).optional(),
  dataCompetencia: z.coerce.date()
});

export const updateDespesaSchema = z
  .object({
    categoria: despesaCategoriaSchema.optional(),
    valor: moneyPositiveSchema.optional(),
    descricao: z.string().trim().max(200).nullable().optional(),
    dataCompetencia: z.coerce.date().optional()
  })
  .superRefine((data, ctx) => {
    if (Object.keys(data).length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Informe ao menos um campo para atualizar."
      });
    }
  });
