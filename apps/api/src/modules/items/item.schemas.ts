import { z } from "zod";
import { clienteContatoSchema } from "../clients/client.schemas.js";

export const createItemSchema = z.object({
  nome: z.string().min(2),
  categoria: z.enum(["ROUPA_FEMININA", "ROUPA_MASCULINA", "CALCADO", "ACESSORIO"]),
  subcategoria: z.string().min(2),
  cor: z.string().min(2),
  estampa: z.boolean().default(false),
  condicao: z.enum(["OTIMO", "BOM", "REGULAR"]),
  tamanho: z.string().min(1),
  marca: z.string().optional(),
  precoVenda: z.coerce.number().nonnegative().optional(),
  acervoTipo: z.enum(["PROPRIO", "CONSIGNACAO"]).default("PROPRIO"),
  acervoNome: z.string().trim().min(2).max(80).optional()
});

export const reserveItemSchema = z.object({
  cliente: clienteContatoSchema
});

export const sellItemSchema = z.object({
  cliente: clienteContatoSchema,
  precoVenda: z.coerce.number().positive(),
  freteTexto: z.string().optional(),
  freteValor: z.coerce.number().nonnegative().optional()
});

export const listItemsQuerySchema = z.object({
  status: z.enum(["DISPONIVEL", "RESERVADO", "VENDIDO", "ENTREGUE", "INDISPONIVEL"]).optional(),
  categoria: z.enum(["ROUPA_FEMININA", "ROUPA_MASCULINA", "CALCADO", "ACESSORIO"]).optional(),
  search: z.string().optional()
});

export const acervoSuggestionsQuerySchema = z.object({
  q: z.string().trim().max(80).optional(),
  acervoTipo: z.enum(["PROPRIO", "CONSIGNACAO"]).optional(),
  limit: z.coerce.number().int().min(1).max(20).default(8)
});

export const addPecaFotoSchema = z.object({
  url: z.string().trim().url("Informe uma URL válida (http ou https)."),
  ordem: z.coerce.number().int().min(0).optional(),
  loteId: z.string().cuid().optional()
});

export const createFotoLoteSchema = z.object({
  textoNota: z.string().trim().max(8000).optional()
});

const draftImageSchema = z.object({
  imageBase64: z.string().trim().min(1).max(12_000_000),
  imageMime: z.enum(["image/jpeg", "image/png"])
});

export const analyzeItemDraftSchema = z.object({
  images: z.array(draftImageSchema).min(1).max(5),
  textoNota: z.string().trim().max(8000).optional()
});

export const submitDraftFeedbackSchema = z.object({
  helpfulness: z.enum(["SIM", "PARCIAL", "NAO"]),
  itemId: z.string().cuid().optional(),
  finalValues: z.object({
    nome: z.string().trim().min(2),
    categoria: z.enum(["ROUPA_FEMININA", "ROUPA_MASCULINA", "CALCADO", "ACESSORIO"]),
    subcategoria: z.string().trim().min(2),
    cor: z.string().trim().min(2),
    estampa: z.boolean(),
    condicao: z.enum(["OTIMO", "BOM", "REGULAR"]),
    tamanho: z.string().trim().min(1),
    marca: z.string().trim().optional(),
    precoVenda: z.coerce.number().nonnegative().optional(),
    acervoTipo: z.enum(["PROPRIO", "CONSIGNACAO"]),
    acervoNome: z.string().trim().max(80).optional()
  })
});

export const patchFotoLoteSchema = z
  .object({
    textoNota: z.string().trim().max(8000).optional(),
    audioUrl: z.string().trim().url().optional()
  })
  .superRefine((data, ctx) => {
    if (data.textoNota === undefined && data.audioUrl === undefined) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Informe textoNota e/ou audioUrl.",
        path: ["textoNota"]
      });
    }
  });

const imageContentTypes = ["image/jpeg", "image/png"] as const;
const audioContentTypes = ["audio/webm", "audio/mp4"] as const;

/** MIME principal sem parametros (ex.: audio/webm;codecs=opus -> audio/webm). */
const primaryMime = (raw: string): string =>
  raw
    .split(";")[0]
    ?.trim()
    .toLowerCase() ?? raw.trim().toLowerCase();

export const presignFotoLoteSchema = z
  .object({
    tipo: z.enum(["imagem", "audio"]),
    contentType: z.string().min(1),
    extensao: z.enum(["jpg", "jpeg", "png", "webm", "mp4"]),
    tamanhoBytes: z.coerce.number().int().positive().optional()
  })
  .transform((data) => ({
    ...data,
    contentType: primaryMime(data.contentType)
  }))
  .superRefine((data, ctx) => {
    const allowed =
      data.tipo === "imagem"
        ? imageContentTypes
        : audioContentTypes;
    if (!(allowed as readonly string[]).includes(data.contentType)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Content-Type invalido para ${data.tipo}.`,
        path: ["contentType"]
      });
    }
    const max =
      data.tipo === "imagem" ? 5 * 1024 * 1024 : 2 * 1024 * 1024;
    if (data.tamanhoBytes != null && data.tamanhoBytes > max) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Arquivo acima do limite (${max} bytes).`,
        path: ["tamanhoBytes"]
      });
    }
  });
