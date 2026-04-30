import { z } from "zod";

const categoriaPrd = z.enum(["roupa_feminina", "roupa_masculina", "calcado", "acessorio"]);
const condicaoPrd = z.enum(["otimo", "bom", "regular"]);
const ambientePrd = z.enum([
  "manequim",
  "cama",
  "chao",
  "cabide",
  "corpo",
  "outro",
  "escuro"
]);
const qualidadePrd = z.enum(["alta", "media", "baixa"]);
const fieldConfidenceSchema = z.object({
  nome_sugerido: z.coerce.number().min(0).max(1).optional().default(0.5),
  categoria: z.coerce.number().min(0).max(1).optional().default(0.5),
  subcategoria: z.coerce.number().min(0).max(1).optional().default(0.5),
  cor_principal: z.coerce.number().min(0).max(1).optional().default(0.5),
  condicao: z.coerce.number().min(0).max(1).optional().default(0.5),
  tamanho: z.coerce.number().min(0).max(1).optional().default(0.5),
  marca: z.coerce.number().min(0).max(1).optional().default(0.5)
});

export const pecaAiJsonSchema = z.object({
  nome_sugerido: z.string().nullable().optional(),
  categoria: categoriaPrd.nullable().optional(),
  subcategoria: z.string().nullable().optional(),
  cor_principal: z.string().nullable().optional(),
  estampado: z.boolean().optional().default(false),
  descricao_estampa: z.string().nullable().optional(),
  condicao: condicaoPrd.nullable().optional(),
  tamanho: z.string().nullable().optional(),
  marca: z.string().nullable().optional(),
  confianca: z.coerce.number().min(0).max(1).optional().default(0.5),
  ambiente_foto: ambientePrd.nullable().optional(),
  qualidade_foto: qualidadePrd.nullable().optional(),
  cover_score: z.coerce.number().min(0).max(1).optional().default(0.5),
  multiplas_pecas: z.boolean().optional().default(false),
  observacoes: z.string().nullable().optional(),
  field_confidence: fieldConfidenceSchema.optional().default({
    nome_sugerido: 0.5,
    categoria: 0.5,
    subcategoria: 0.5,
    cor_principal: 0.5,
    condicao: 0.5,
    tamanho: 0.5,
    marca: 0.5
  })
});

export type PecaAiJson = z.infer<typeof pecaAiJsonSchema>;

const SYSTEM_PROMPT_EXTRACTOR = `Voce e um assistente especialista em catalogacao de roupas/acessorios para brecho no Brasil.
Analise as fotos da mesma peca principal e retorne APENAS JSON valido.

Regras:
- sem markdown, sem comentarios.
- use exatamente os enums permitidos.
- priorize a peca principal (mais central/visivel) caso haja ruido.
- use o contexto textual da dona como evidencia forte para nome/subcategoria/cor.
- se houver etiqueta legivel, extraia tamanho e marca da peca principal.
- use informacao de composicao/material para enriquecer nome_sugerido quando fizer sentido comercial.
- NAO crie campo "material" no JSON.
- evite null para nome_sugerido, subcategoria, cor_principal, tamanho e marca quando houver qualquer evidencia visual/contextual razoavel.
- use null somente quando realmente impossivel inferir.
- subcategoria deve ser texto simples para busca (sem underscore).
- nome_sugerido deve ser objetivo e comercial; evite adjetivos vagos como "elegante", "casual", "decorado" sem evidencia forte.

Obrigatorio:
- confianca (0..1)
- cover_score (0..1) para qualidade como foto de capa: nota alta quando a peca principal aparece inteira ou bem representada, nitida, bem iluminada, centralizada e sem muita obstrucao.
- estampado (boolean)
- multiplas_pecas (boolean)
- field_confidence com valores 0..1 para:
  nome_sugerido, categoria, subcategoria, cor_principal, condicao, tamanho, marca.

Enums:
categoria: roupa_feminina | roupa_masculina | calcado | acessorio
condicao: otimo | bom | regular
ambiente_foto: manequim | cama | chao | cabide | corpo | outro | escuro
qualidade_foto: alta | media | baixa`;

const SYSTEM_PROMPT_REVIEWER = `Voce e um revisor de qualidade de catalogo para brecho.
Recebera:
1) mesmas imagens e contexto
2) um JSON preliminar de outro modelo

Sua tarefa:
- corrigir inconsistencias e normalizar saida final.
- reduzir null desnecessario em nome_sugerido, subcategoria, cor_principal, tamanho e marca.
- manter conformidade com enums e schema.
- ajustar field_confidence por campo com realismo.
- subcategoria sem underscore (ex.: "blusa cropped", nunca "blusa_cropped").
- nome_sugerido curto, especifico e sem adjetivo promocional sem evidencia.
- retornar APENAS JSON final valido, sem markdown.
`;

const buildUserPrompt = (ctx: {
  textoNota: string | null;
  transcricaoAudio: string | null;
  pecaNome?: string;
  pecaCategoria?: string;
}): string => {
  const parts = [
    "Analise esta peca de roupa/acessorio para cadastro de brecho.",
    "",
    "[CONTEXTO ADICIONAL DA DONA — use como evidencia forte]:"
  ];
  parts.push(`Texto: "${ctx.textoNota?.trim() || ""}"`);
  parts.push(`Transcricao de audio: "${ctx.transcricaoAudio?.trim() || ""}"`);
  if (ctx.pecaNome || ctx.pecaCategoria) {
    parts.push("", "[CADASTRO ATUAL DA PECA (pode ajudar em re-analise)]:");
    parts.push(`Nome cadastrado: "${ctx.pecaNome ?? ""}"`);
    parts.push(`Categoria cadastrada: "${ctx.pecaCategoria ?? ""}"`);
  }
  parts.push("", "[INSTRUCOES DE CATALOGO]:");
  parts.push("- nome_sugerido: curto e vendavel (2 a 6 palavras).");
  parts.push("- subcategoria: especifica e util para busca.");
  parts.push("- cor_principal: cor de catalogo pratica.");
  parts.push("- se houver estampa, detalhe em descricao_estampa.");
  parts.push("- use etiqueta/composicao para inferir tamanho e marca quando legivel.");
  parts.push("- use material/composicao para enriquecer nome_sugerido quando util.");
  parts.push("- cover_score: avalie somente se esta imagem funciona bem como capa do anuncio.");
  parts.push("- capa boa: peca principal clara, centralizada, com bom enquadramento, boa luz, nitidez e pouca distracao.");
  parts.push("- reduza cover_score se houver multiplas pecas, corte importante, baixa nitidez, pouca luz, peca dobrada de forma confusa ou fundo muito poluido.");
  parts.push('- nao retorne campo "material"; mantenha apenas os campos do schema.');
  parts.push("", "Retorne o JSON com a analise completa.");
  return parts.join("\n");
};

export type VisionAnalyzeResult = {
  stage1: PecaAiJson;
  parsed: PecaAiJson;
  stage1Tokens: number;
  stage2Tokens: number;
  stage1LatencyMs: number;
  stage2LatencyMs: number;
  totalTokens: number;
  model: string;
};

const hasBlank = (value: string | null | undefined): boolean => !value || value.trim() === "";

const shouldRunReviewer = (stage1: PecaAiJson): boolean => {
  const fc = stage1.field_confidence;
  const avgFieldConfidence =
    (fc.nome_sugerido + fc.categoria + fc.subcategoria + fc.cor_principal + fc.condicao + fc.tamanho + fc.marca) /
    7;
  const criticalMissing =
    hasBlank(stage1.nome_sugerido) ||
    hasBlank(stage1.subcategoria) ||
    hasBlank(stage1.cor_principal) ||
    hasBlank(stage1.tamanho) ||
    hasBlank(stage1.marca);

  return (
    stage1.multiplas_pecas === true ||
    (stage1.confianca ?? 0) < 0.72 ||
    avgFieldConfidence < 0.72 ||
    criticalMissing
  );
};

const callVisionModel = async (input: {
  apiKey: string;
  model: string;
  images: Array<{ imageBase64: string; imageMime: string }>;
  systemPrompt: string;
  userText: string;
  imageDetail?: "high" | "auto" | "low";
}): Promise<{ parsed: PecaAiJson; totalTokens: number; model: string; latencyMs: number }> => {
  const startedAt = Date.now();

  const imageBlocks = input.images.map((image) => ({
    type: "image_url" as const,
    image_url: {
      url: `data:${image.imageMime};base64,${image.imageBase64}`,
      detail: input.imageDetail ?? "high"
    }
  }));

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${input.apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: input.model,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: input.systemPrompt },
        {
          role: "user",
          content: [
            { type: "text", text: input.userText },
            ...imageBlocks
          ]
        }
      ],
      max_tokens: 800
    })
  });

  const rawText = await res.text();
  if (!res.ok) {
    throw new Error(`Image analysis failed: ${rawText.slice(0, 280)}`);
  }

  let completion: {
    choices?: Array<{ message?: { content?: string | null } }>;
    usage?: { total_tokens?: number };
    model?: string;
  };
  try {
    completion = JSON.parse(rawText) as typeof completion;
  } catch {
    throw new Error("Image analysis failed: invalid JSON from OpenAI.");
  }

  const content = completion.choices?.[0]?.message?.content?.trim();
  if (!content) {
    throw new Error("Image analysis failed: empty model response.");
  }

  let obj: unknown;
  try {
    obj = JSON.parse(content);
  } catch {
    throw new Error("Image analysis failed: model did not return valid JSON.");
  }

  const parsed = pecaAiJsonSchema.safeParse(obj);
  if (!parsed.success) {
    throw new Error(`Invalid AI response: ${parsed.error.message.slice(0, 200)}`);
  }

  const totalTokens = completion.usage?.total_tokens ?? 0;
  const model = completion.model ?? input.model;
  const latencyMs = Date.now() - startedAt;

  return { parsed: parsed.data, totalTokens, model, latencyMs };
};

export const analyzePecaImageWithOpenAI = async (input: {
  apiKey: string;
  model: string;
  images: Array<{ imageBase64: string; imageMime: string }>;
  textoNota: string | null;
  transcricaoAudio: string | null;
  pecaNome?: string;
  pecaCategoria?: string;
}): Promise<VisionAnalyzeResult> => {
  const userText = buildUserPrompt({
    textoNota: input.textoNota,
    transcricaoAudio: input.transcricaoAudio,
    pecaNome: input.pecaNome,
    pecaCategoria: input.pecaCategoria
  });

  const stage1 = await callVisionModel({
    apiKey: input.apiKey,
    model: input.model,
    images: input.images,
    systemPrompt: SYSTEM_PROMPT_EXTRACTOR,
    userText,
    imageDetail: "high"
  });

  if (!shouldRunReviewer(stage1.parsed)) {
    return {
      stage1: stage1.parsed,
      parsed: stage1.parsed,
      stage1Tokens: stage1.totalTokens,
      stage2Tokens: 0,
      stage1LatencyMs: stage1.latencyMs,
      stage2LatencyMs: 0,
      totalTokens: stage1.totalTokens,
      model: stage1.model
    };
  }

  const reviewerText = [
    userText,
    "",
    "[JSON PRELIMINAR DO EXTRACTOR]",
    JSON.stringify(stage1.parsed),
    "",
    "Revise e retorne o JSON FINAL mais assertivo."
  ].join("\n");

  const stage2 = await callVisionModel({
    apiKey: input.apiKey,
    model: input.model,
    images: input.images,
    systemPrompt: SYSTEM_PROMPT_REVIEWER,
    userText: reviewerText,
    imageDetail: "auto"
  });

  return {
    stage1: stage1.parsed,
    parsed: stage2.parsed,
    stage1Tokens: stage1.totalTokens,
    stage2Tokens: stage2.totalTokens,
    stage1LatencyMs: stage1.latencyMs,
    stage2LatencyMs: stage2.latencyMs,
    totalTokens: stage1.totalTokens + stage2.totalTokens,
    model: stage2.model
  };
};
