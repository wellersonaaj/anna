import { z } from "zod";

export const deliverSaleSchema = z.object({
  codigoRastreio: z.string().optional(),
  entregueEm: z.string().datetime().optional()
});

export const listDeliveredSalesQuerySchema = z.object({
  days: z.coerce.number().int().min(1).max(180).default(30),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0)
});
