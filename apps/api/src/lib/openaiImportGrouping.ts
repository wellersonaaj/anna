import { z } from "zod";

const groupingResponseSchema = z.object({
  grupos: z.array(z.array(z.number().int().min(0)))
});

export type GroupingPhotoInput = {
  /** 0-based index in upload order (must match array position). */
  indice: number;
  imageBase64: string;
  imageMime: string;
};

const SYSTEM = `Voce agrupa fotos de um lote de brecho (roupas/acessorios) em conjuntos, cada conjunto = uma peca para catalogo.

Retorne APENAS JSON valido no formato:
{"grupos":[[0,1,2],[3,4]]}

Regras obrigatorias:
- Cada numero e o indice 0-based da foto na ordem de envio (a primeira foto enviada e indice 0).
- Todos os indices de 0 ate N-1 devem aparecer exatamente uma vez (particao completa).
- Prefira grupos CONTIGUOS na ordem: fotos com indices consecutivos tendem a ser a mesma peca.
- Fotos de etiqueta, detalhe ou fundo semelhante: associe ao grupo da peca principal mais provavel (geralmente o grupo vizinho imediatamente anterior na ordem, se a etiqueta veio depois das fotos da peca).
- Nao misture indices distantes na mesma peca salvo evidencia visual forte de ser a mesma roupa.
- Minimize o numero de grupos sem fundir pecas diferentes.
- Sem markdown, sem texto fora do JSON.`;

const buildUserText = (n: number): string => {
  return [
    `Ha ${n} fotos numeradas na ordem de envio: indices 0 a ${n - 1}.`,
    "As imagens seguem nessa mesma ordem apos este texto.",
    "Agrupe-as em pecas distintas e retorne o JSON."
  ].join("\n");
};

const validatePartition = (grupos: number[][], n: number): boolean => {
  const seen = new Set<number>();
  for (const g of grupos) {
    for (const i of g) {
      if (i < 0 || i >= n || seen.has(i)) {
        return false;
      }
      seen.add(i);
    }
  }
  return seen.size === n;
};

const eachGroupContiguous = (grupos: number[][]): boolean => {
  for (const g of grupos) {
    if (g.length <= 1) {
      continue;
    }
    const sorted = [...g].sort((a, b) => a - b);
    for (let k = 1; k < sorted.length; k++) {
      if (sorted[k]! !== sorted[k - 1]! + 1) {
        return false;
      }
    }
  }
  return true;
};

const fallbackSingletons = (n: number): number[][] => Array.from({ length: n }, (_, i) => [i]);

export type GroupingOpenAiResult = {
  grupos: number[][];
  model: string;
  tokens: number;
  usedFallback: boolean;
  temFotosNaoContiguasPorGrupo: boolean[];
};

export const groupImportPhotosWithOpenAI = async (input: {
  apiKey: string;
  model: string;
  photos: GroupingPhotoInput[];
}): Promise<GroupingOpenAiResult> => {
  const n = input.photos.length;
  if (n === 0) {
    return {
      grupos: [],
      model: input.model,
      tokens: 0,
      usedFallback: true,
      temFotosNaoContiguasPorGrupo: []
    };
  }

  const imageBlocks = input.photos.map((p) => ({
    type: "image_url" as const,
    image_url: {
      url: `data:${p.imageMime};base64,${p.imageBase64}`,
      detail: "low" as const
    }
  }));

  const startedAt = Date.now();
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
        { role: "system", content: SYSTEM },
        {
          role: "user",
          content: [{ type: "text", text: buildUserText(n) }, ...imageBlocks]
        }
      ],
      max_tokens: 1200
    })
  });

  const rawText = await res.text();
  if (!res.ok) {
    return {
      grupos: fallbackSingletons(n),
      model: input.model,
      tokens: 0,
      usedFallback: true,
      temFotosNaoContiguasPorGrupo: Array.from({ length: n }, () => false)
    };
  }

  let completion: {
    choices?: Array<{ message?: { content?: string | null } }>;
    usage?: { total_tokens?: number };
    model?: string;
  };
  try {
    completion = JSON.parse(rawText) as typeof completion;
  } catch {
    return {
      grupos: fallbackSingletons(n),
      model: input.model,
      tokens: 0,
      usedFallback: true,
      temFotosNaoContiguasPorGrupo: Array.from({ length: n }, () => false)
    };
  }

  const content = completion.choices?.[0]?.message?.content?.trim();
  if (!content) {
    return {
      grupos: fallbackSingletons(n),
      model: input.model,
      tokens: 0,
      usedFallback: true,
      temFotosNaoContiguasPorGrupo: Array.from({ length: n }, () => false)
    };
  }

  let obj: unknown;
  try {
    obj = JSON.parse(content);
  } catch {
    return {
      grupos: fallbackSingletons(n),
      model: input.model,
      tokens: 0,
      usedFallback: true,
      temFotosNaoContiguasPorGrupo: Array.from({ length: n }, () => false)
    };
  }

  const parsed = groupingResponseSchema.safeParse(obj);
  if (!parsed.success || !validatePartition(parsed.data.grupos, n)) {
    return {
      grupos: fallbackSingletons(n),
      model: completion.model ?? input.model,
      tokens: completion.usage?.total_tokens ?? 0,
      usedFallback: true,
      temFotosNaoContiguasPorGrupo: Array.from({ length: parsed.success ? parsed.data.grupos.length : n }, () => false)
    };
  }

  const grupos = parsed.data.grupos.map((g) => [...new Set(g)].sort((a, b) => a - b));
  const temFotosNaoContiguasPorGrupo = grupos.map((g) => !eachGroupContiguous([g]));
  void startedAt;

  return {
    grupos,
    model: completion.model ?? input.model,
    tokens: completion.usage?.total_tokens ?? 0,
    usedFallback: false,
    temFotosNaoContiguasPorGrupo
  };
};
