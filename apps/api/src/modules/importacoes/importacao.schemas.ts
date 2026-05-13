import { z } from "zod";
import { normalizeMoneyInput } from "../../lib/money.js";

const moneyNonNegativeSchema = z.preprocess(normalizeMoneyInput, z.number().nonnegative());

export const presignImportFotoSchema = z.object({
  contentType: z.string().trim().min(1),
  extensao: z.string().trim().min(1).max(12),
  ordemOriginal: z.coerce.number().int().min(0),
  tamanhoBytes: z.coerce.number().int().min(1).optional()
});

export const registerImportFotoSchema = z.object({
  ordemOriginal: z.coerce.number().int().min(0),
  url: z.string().trim().url(),
  thumbnailUrl: z.string().trim().url().optional(),
  mime: z.string().trim().min(3).max(120),
  tamanhoBytes: z.coerce.number().int().min(1).optional(),
  thumbnailTamanhoBytes: z.coerce.number().int().min(1).optional(),
  largura: z.coerce.number().int().min(1).optional(),
  altura: z.coerce.number().int().min(1).optional(),
  nomeArquivo: z.string().trim().max(500).optional(),
  source: z.string().trim().max(40).optional()
});

export const patchImportGruposSchema = z.object({
  grupos: z.array(z.object({ fotoIds: z.array(z.string().cuid()).min(1) })).min(1)
});

const itemFormValuesSchema = z.object({
  nome: z.string().min(2),
  categoria: z.enum(["ROUPA_FEMININA", "ROUPA_MASCULINA", "CALCADO", "ACESSORIO"]),
  subcategoria: z.string().min(2),
  cor: z.string().min(2),
  estampa: z.boolean(),
  condicao: z.enum(["OTIMO", "BOM", "REGULAR"]),
  tamanho: z.string().min(1),
  marca: z.string().optional(),
  precoVenda: moneyNonNegativeSchema.optional(),
  acervoTipo: z.enum(["PROPRIO", "CONSIGNACAO"]),
  acervoNome: z.string().trim().min(2).max(80).optional()
});

export const patchImportRascunhoSchema = z.object({
  formValues: itemFormValuesSchema
});

export const publicarImportRascunhoSchema = z.object({
  helpfulness: z.enum(["SIM", "PARCIAL", "NAO"]).default("SIM"),
  reasonCodes: z
    .array(
      z.enum([
        "COR_ERRADA",
        "SUBCATEGORIA_ERRADA",
        "NOME_RUIM",
        "CATEGORIA_ERRADA",
        "CONDICAO_ERRADA",
        "ESTAMPA_ERRADA",
        "OUTRO"
      ])
    )
    .max(5)
    .optional(),
  formValues: itemFormValuesSchema.optional()
});
