import { z } from "zod";

export const deliverSaleSchema = z.object({
  codigoRastreio: z.string().optional(),
  entregueEm: z.string().datetime().optional()
});
