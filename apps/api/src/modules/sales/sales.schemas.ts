import { z } from "zod";
import { normalizeMoneyInput } from "../../lib/money.js";

const moneyNonNegativeSchema = z.coerce.number().nonnegative();
const moneyNullableNonNegativeSchema = z.preprocess(normalizeMoneyInput, z.number().nonnegative().nullable());

export const deliverSaleSchema = z.object({
  codigoRastreio: z.string().optional(),
  entregueEm: z.string().datetime().optional()
});

export const listDeliveredSalesQuerySchema = z.object({
  days: z.coerce.number().int().min(1).max(180).default(30),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0)
});

export const periodSummaryQuerySchema = z.object({
  days: z.coerce.number().int().min(1).max(180).default(30)
});

export const missingCostSalesQuerySchema = z.object({
  days: z.coerce.number().int().min(1).max(180).default(30),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  offset: z.coerce.number().int().min(0).default(0)
});

export const updateSaleSchema = z.object({
  precoVenda: z.coerce.number().positive().optional(),
  precoCusto: moneyNullableNonNegativeSchema.optional(),
  freteIncluso: z.boolean().optional(),
  freteInclusoValor: z.union([moneyNonNegativeSchema, z.null()]).optional()
});
