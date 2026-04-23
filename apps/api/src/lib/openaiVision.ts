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

export const pecaAiJsonSchema = z.object({
  nome_sugerido: z.string().nullable().optional(),
  categoria: categoriaPrd.nullable().optional(),
  subcategoria: z.string().nullable().optional(),
  cor_principal: z.string().nullable().optional(),
  estampado: z.boolean().optional().default(false),
  descricao_estampa: z.string().nullable().optional(),
  condicao: condicaoPrd.nullable().optional(),
  confianca: z.coerce.number().min(0).max(1).optional().default(0.5),
  ambiente_foto: ambientePrd.nullable().optional(),
  qualidade_foto: qualidadePrd.nullable().optional(),
  multiplas_pecas: z.boolean().optional().default(false),
  observacoes: z.string().nullable().optional()
});

export type PecaAiJson = z.infer<typeof pecaAiJsonSchema>;

const SYSTEM_PROMPT = `Voce e um assistente especializado em analise de roupas e acessorios de brecho.
Analise a imagem fornecida e retorne APENAS um objeto JSON valido, sem markdown, sem explicacoes.
Use exatamente os valores permitidos para cada campo enum.
Se nao conseguir identificar um campo com confianca, use null.
Enums: categoria: roupa_feminina | roupa_masculina | calcado | acessorio
condicao: otimo | bom | regular
ambiente_foto: manequim | cama | chao | cabide | corpo | outro | escuro
qualidade_foto: alta | media | baixa
Campos obrigatorios no JSON: confianca (0 a 1), estampado (boolean), multiplas_pecas (boolean).`;

const buildUserPrompt = (ctx: {
  textoNota: string | null;
  transcricaoAudio: string | null;
  pecaNome?: string;
  pecaCategoria?: string;
}): string => {
  const parts = ["Analise esta peca de roupa/acessorio.", "", "[CONTEXTO ADICIONAL DA DONA — se fornecido]:"];
  parts.push(`Texto: "${ctx.textoNota?.trim() || ""}"`);
  parts.push(`Transcricao de audio: "${ctx.transcricaoAudio?.trim() || ""}"`);
  if (ctx.pecaNome || ctx.pecaCategoria) {
    parts.push("", "[CADASTRO ATUAL DA PECA (pode ajudar em re-analise)]:");
    parts.push(`Nome cadastrado: "${ctx.pecaNome ?? ""}"`);
    parts.push(`Categoria cadastrada: "${ctx.pecaCategoria ?? ""}"`);
  }
  parts.push("", "Retorne o JSON com a analise completa.");
  return parts.join("\n");
};

export type VisionAnalyzeResult = {
  parsed: PecaAiJson;
  totalTokens: number;
  model: string;
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

  const imageBlocks = input.images.map((image) => ({
    type: "image_url" as const,
    image_url: {
      url: `data:${image.imageMime};base64,${image.imageBase64}`,
      detail: "low" as const
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
        { role: "system", content: SYSTEM_PROMPT },
        {
          role: "user",
          content: [
            { type: "text", text: userText },
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

  return { parsed: parsed.data, totalTokens, model };
};
