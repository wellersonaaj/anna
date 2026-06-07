import { z } from "zod";

export const shipSacolaSchema = z.object({
  vendaIds: z.array(z.string().cuid()).optional(),
  codigoRastreio: z.string().trim().optional(),
  freteTexto: z.string().trim().optional(),
  freteValor: z.coerce.number().nonnegative().optional(),
  freteCustoLoja: z.coerce.number().nonnegative().optional(),
  embalagemCusto: z.coerce.number().nonnegative().optional()
});
