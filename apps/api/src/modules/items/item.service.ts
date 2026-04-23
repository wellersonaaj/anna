import { canTransitionStatus, itemStatus } from "@anna/shared";
import type { Prisma, PrismaClient, StatusPeca } from "@prisma/client";
import { env, storageEnv } from "../../config/env.js";
import { analyzePecaImageWithOpenAI } from "../../lib/openaiVision.js";
import { buildUploadKey, createPresignedPut, downloadImageForAnalysis, isStorageConfigured } from "../../lib/storage.js";
import { clientService } from "../clients/client.service.js";

const ensureTransition = (from: StatusPeca, to: StatusPeca): void => {
  if (!canTransitionStatus(from, to)) {
    throw new Error(`Invalid status transition: ${from} -> ${to}`);
  }
};

const mapCategoriaFromAi = (
  categoria: string | null | undefined
): "ROUPA_FEMININA" | "ROUPA_MASCULINA" | "CALCADO" | "ACESSORIO" | null => {
  if (!categoria) {
    return null;
  }

  const mapping: Record<string, "ROUPA_FEMININA" | "ROUPA_MASCULINA" | "CALCADO" | "ACESSORIO"> = {
    roupa_feminina: "ROUPA_FEMININA",
    roupa_masculina: "ROUPA_MASCULINA",
    calcado: "CALCADO",
    acessorio: "ACESSORIO"
  };

  return mapping[categoria] ?? null;
};

const mapCondicaoFromAi = (condicao: string | null | undefined): "OTIMO" | "BOM" | "REGULAR" | null => {
  if (!condicao) {
    return null;
  }

  const mapping: Record<string, "OTIMO" | "BOM" | "REGULAR"> = {
    otimo: "OTIMO",
    bom: "BOM",
    regular: "REGULAR"
  };

  return mapping[condicao] ?? null;
};

type DraftSuggestionSnapshot = {
  nomeSugerido: string | null;
  categoria: "ROUPA_FEMININA" | "ROUPA_MASCULINA" | "CALCADO" | "ACESSORIO" | null;
  subcategoria: string | null;
  corPrincipal: string | null;
  estampado: boolean;
  descricaoEstampa: string | null;
  condicao: "OTIMO" | "BOM" | "REGULAR" | null;
  tamanho: string | null;
  marca: string | null;
};

type DraftFieldConfidence = {
  nome: number;
  categoria: number;
  subcategoria: number;
  cor: number;
  condicao: number;
};

type DraftFallbacksApplied = {
  nome: "model" | "fallback";
  subcategoria: "model" | "fallback";
  cor: "model" | "fallback";
};

const buildDraftSuggestions = (parsed: {
  nome_sugerido?: string | null;
  categoria?: string | null;
  subcategoria?: string | null;
  cor_principal?: string | null;
  estampado?: boolean;
  descricao_estampa?: string | null;
  condicao?: string | null;
  tamanho?: string | null;
  marca?: string | null;
}): DraftSuggestionSnapshot => ({
  nomeSugerido: parsed.nome_sugerido?.trim() || null,
  categoria: mapCategoriaFromAi(parsed.categoria ?? undefined),
  subcategoria: parsed.subcategoria?.trim() || null,
  corPrincipal: parsed.cor_principal?.trim() || null,
  estampado: parsed.estampado ?? false,
  descricaoEstampa: parsed.descricao_estampa?.trim() || null,
  condicao: mapCondicaoFromAi(parsed.condicao ?? undefined),
  tamanho: parsed.tamanho?.trim() || null,
  marca: parsed.marca?.trim() || null
});

const normalizeText = (value: string | null | undefined) => value?.trim().toLowerCase() ?? "";

const normalizeFieldConfidence = (parsed: { field_confidence?: Record<string, number> }): DraftFieldConfidence => ({
  nome: parsed.field_confidence?.nome_sugerido ?? 0.5,
  categoria: parsed.field_confidence?.categoria ?? 0.5,
  subcategoria: parsed.field_confidence?.subcategoria ?? 0.5,
  cor: parsed.field_confidence?.cor_principal ?? 0.5,
  condicao: parsed.field_confidence?.condicao ?? 0.5
});

const inferColorFromText = (text: string): string | null => {
  const lower = text.toLowerCase();
  const colorMap: Record<string, string> = {
    preto: "preto",
    branca: "branco",
    branco: "branco",
    azul: "azul",
    rosa: "rosa",
    vermelho: "vermelho",
    vermelha: "vermelho",
    verde: "verde",
    amarelo: "amarelo",
    laranja: "laranja",
    roxo: "roxo",
    lilas: "roxo",
    lilás: "roxo",
    marrom: "marrom",
    bege: "bege",
    cinza: "cinza"
  };
  for (const [token, color] of Object.entries(colorMap)) {
    if (lower.includes(token)) {
      return color;
    }
  }
  return null;
};

const fallbackSubcategoriaByCategoria = (
  categoria: DraftSuggestionSnapshot["categoria"]
): string | null => {
  if (categoria === "ROUPA_FEMININA" || categoria === "ROUPA_MASCULINA") {
    return "roupa";
  }
  if (categoria === "CALCADO") {
    return "calcado";
  }
  if (categoria === "ACESSORIO") {
    return "acessorio";
  }
  return null;
};

const fallbackNome = (input: {
  categoria: DraftSuggestionSnapshot["categoria"];
  subcategoria: string | null;
  cor: string | null;
  estampado: boolean;
}): string => {
  const categoriaLabel: Record<NonNullable<DraftSuggestionSnapshot["categoria"]>, string> = {
    ROUPA_FEMININA: "Peça feminina",
    ROUPA_MASCULINA: "Peça masculina",
    CALCADO: "Calçado",
    ACESSORIO: "Acessório"
  };
  const base =
    input.subcategoria?.trim() ||
    (input.categoria ? categoriaLabel[input.categoria] : "Peça");
  const corPart = input.cor?.trim() ? ` ${input.cor.trim()}` : "";
  const estampadoPart = input.estampado ? " estampado" : "";
  return `${base}${corPart}${estampadoPart}`.trim();
};

export const itemService = {
  async create(prisma: PrismaClient, brechoId: string, data: {
    nome: string;
    categoria: "ROUPA_FEMININA" | "ROUPA_MASCULINA" | "CALCADO" | "ACESSORIO";
    subcategoria: string;
    cor: string;
    estampa: boolean;
    condicao: "OTIMO" | "BOM" | "REGULAR";
    tamanho: string;
    marca?: string;
    precoVenda?: number;
    acervoTipo: "PROPRIO" | "CONSIGNACAO";
    acervoNome?: string;
  }) {
    return prisma.$transaction(async (tx) => {
      const item = await tx.peca.create({
        data: {
          ...data,
          brechoId,
          acervoNome: data.acervoNome?.trim() || null,
          precoVenda: data.precoVenda ?? null
        }
      });

      await tx.pecaStatusHistorico.create({
        data: {
          pecaId: item.id,
          status: itemStatus.DISPONIVEL
        }
      });

      return item;
    });
  },

  async list(prisma: PrismaClient, brechoId: string, query: {
    status?: StatusPeca;
    categoria?: "ROUPA_FEMININA" | "ROUPA_MASCULINA" | "CALCADO" | "ACESSORIO";
    search?: string;
  }) {
    return prisma.peca.findMany({
      where: {
        brechoId,
        status: query.status,
        categoria: query.categoria,
        ...(query.search
          ? {
              OR: [
                { nome: { contains: query.search, mode: "insensitive" } },
                { subcategoria: { contains: query.search, mode: "insensitive" } },
                { marca: { contains: query.search, mode: "insensitive" } },
                { acervoNome: { contains: query.search, mode: "insensitive" } }
              ]
            }
          : {})
      },
      orderBy: {
        criadoEm: "desc"
      }
    });
  },

  async listAcervoSuggestions(
    prisma: PrismaClient,
    brechoId: string,
    query: { q?: string; acervoTipo?: "PROPRIO" | "CONSIGNACAO"; limit: number }
  ) {
    const q = query.q?.trim();

    const rows = await prisma.peca.findMany({
      where: {
        brechoId,
        acervoTipo: query.acervoTipo,
        acervoNome: {
          not: null,
          ...(q ? { contains: q, mode: "insensitive" } : {})
        }
      },
      select: {
        acervoNome: true
      },
      distinct: ["acervoNome"],
      orderBy: {
        acervoNome: "asc"
      },
      take: query.limit
    });

    return rows.flatMap((row) => (row.acervoNome ? [row.acervoNome] : []));
  },

  async findById(prisma: PrismaClient, brechoId: string, itemId: string) {
    return prisma.peca.findFirst({
      where: { id: itemId, brechoId },
      include: {
        historicoStatus: {
          orderBy: {
            criadoEm: "desc"
          },
          include: {
            cliente: true
          }
        },
        venda: true,
        fotos: {
          orderBy: { ordem: "asc" },
          include: {
            lote: true,
            aiAnalyses: {
              orderBy: { criadoEm: "desc" },
              take: 1
            }
          }
        },
        filaInteressados: {
          orderBy: { posicao: "asc" },
          include: {
            cliente: true
          }
        },
        fotoLotes: {
          orderBy: { criadoEm: "desc" },
          take: 30
        }
      }
    });
  },

  async addFoto(
    prisma: PrismaClient,
    brechoId: string,
    itemId: string,
    payload: { url: string; ordem?: number; loteId?: string }
  ) {
    const item = await prisma.peca.findFirst({
      where: { id: itemId, brechoId },
      select: { id: true }
    });

    if (!item) {
      throw new Error("Item not found.");
    }

    const existingCount = await prisma.pecaFoto.count({
      where: { pecaId: itemId }
    });

    if (existingCount >= 5) {
      throw new Error("Photo limit reached.");
    }

    if (payload.loteId) {
      const lote = await prisma.pecaFotoLote.findFirst({
        where: {
          id: payload.loteId,
          pecaId: itemId,
          peca: { brechoId }
        }
      });

      if (!lote) {
        throw new Error("Lote not found.");
      }
    }

    let ordem = payload.ordem;

    if (ordem === undefined) {
      const agg = await prisma.pecaFoto.aggregate({
        where: { pecaId: itemId },
        _max: { ordem: true }
      });
      ordem = (agg._max.ordem ?? -1) + 1;
    } else {
      const clash = await prisma.pecaFoto.findFirst({
        where: { pecaId: itemId, ordem }
      });
      if (clash) {
        throw new Error("Photo order conflict.");
      }
    }

    return prisma.pecaFoto.create({
      data: {
        pecaId: itemId,
        loteId: payload.loteId ?? null,
        url: payload.url.trim(),
        ordem
      }
    });
  },

  async createFotoLote(
    prisma: PrismaClient,
    brechoId: string,
    pecaId: string,
    payload: { textoNota?: string }
  ) {
    const item = await prisma.peca.findFirst({
      where: { id: pecaId, brechoId },
      select: { id: true }
    });

    if (!item) {
      throw new Error("Item not found.");
    }

    return prisma.pecaFotoLote.create({
      data: {
        pecaId,
        textoNota: payload.textoNota?.trim() || null
      }
    });
  },

  async patchFotoLote(
    prisma: PrismaClient,
    brechoId: string,
    pecaId: string,
    loteId: string,
    payload: { textoNota?: string; audioUrl?: string }
  ) {
    const lote = await prisma.pecaFotoLote.findFirst({
      where: {
        id: loteId,
        pecaId,
        peca: { brechoId }
      }
    });

    if (!lote) {
      throw new Error("Lote not found.");
    }

    return prisma.pecaFotoLote.update({
      where: { id: loteId },
      data: {
        ...(payload.textoNota !== undefined
          ? { textoNota: payload.textoNota.trim() || null }
          : {}),
        ...(payload.audioUrl !== undefined ? { audioUrl: payload.audioUrl.trim() } : {})
      }
    });
  },

  async presignFotoLoteUpload(
    prisma: PrismaClient,
    brechoId: string,
    pecaId: string,
    loteId: string,
    input: {
      tipo: "imagem" | "audio";
      contentType: string;
      extensao: string;
    }
  ) {
    if (!isStorageConfigured(storageEnv)) {
      throw new Error("Storage is not configured.");
    }

    const lote = await prisma.pecaFotoLote.findFirst({
      where: {
        id: loteId,
        pecaId,
        peca: { brechoId }
      }
    });

    if (!lote) {
      throw new Error("Lote not found.");
    }

    const key = buildUploadKey({
      brechoId,
      pecaId,
      loteId,
      extensao: input.extensao
    });

    return createPresignedPut(storageEnv, {
      key,
      contentType: input.contentType
    });
  },

  async transcribeFotoLoteAudio(prisma: PrismaClient, brechoId: string, pecaId: string, loteId: string) {
    const key = env.OPENAI_API_KEY?.trim();
    if (!key) {
      throw new Error("OpenAI is not configured.");
    }

    const lote = await prisma.pecaFotoLote.findFirst({
      where: {
        id: loteId,
        pecaId,
        peca: { brechoId }
      }
    });

    if (!lote) {
      throw new Error("Lote not found.");
    }

    if (!lote.audioUrl?.trim()) {
      throw new Error("Lote has no audio URL.");
    }

    const audioRes = await fetch(lote.audioUrl);
    if (!audioRes.ok) {
      throw new Error("Failed to download audio for transcription.");
    }

    const arrayBuffer = await audioRes.arrayBuffer();
    const contentType = audioRes.headers.get("content-type") ?? "audio/webm";
    const blob = new Blob([arrayBuffer], { type: contentType });
    const ext = contentType.includes("mp4") ? "mp4" : "webm";
    const formData = new FormData();
    formData.append("file", blob, `nota.${ext}`);
    formData.append("model", "whisper-1");

    const tr = await fetch("https://api.openai.com/v1/audio/transcriptions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`
      },
      body: formData
    });

    if (!tr.ok) {
      const errText = await tr.text();
      throw new Error(`Transcription failed: ${errText.slice(0, 200)}`);
    }

    const rawBody = await tr.text();
    let text = "";
    try {
      const json = JSON.parse(rawBody) as { text?: string };
      text = json.text?.trim() ?? "";
    } catch {
      text = rawBody.trim();
    }

    return prisma.pecaFotoLote.update({
      where: { id: loteId },
      data: { transcricaoAudio: text || null }
    });
  },

  async analisarFotoRascunho(
    prisma: PrismaClient,
    brechoId: string,
    input: {
      images: Array<{ imageBase64: string; imageMime: "image/jpeg" | "image/png" }>;
      textoNota?: string;
    }
  ) {
    const apiKey = env.OPENAI_API_KEY?.trim();
    if (!apiKey) {
      throw new Error("OpenAI is not configured.");
    }

    const model = env.OPENAI_VISION_MODEL?.trim() || "gpt-4o-mini";
    const {
      stage1,
      parsed,
      totalTokens,
      stage1Tokens,
      stage2Tokens,
      stage1LatencyMs,
      stage2LatencyMs,
      model: modelUsed
    } = await analyzePecaImageWithOpenAI({
      apiKey,
      model,
      images: input.images,
      textoNota: input.textoNota?.trim() || null,
      transcricaoAudio: null
    });

    const fieldConfidence = normalizeFieldConfidence(parsed);
    const rawSuggestions = buildDraftSuggestions(parsed);
    const combinedContext = input.textoNota?.trim() || "";
    const fallbackColor = inferColorFromText(combinedContext);
    const suggestions: DraftSuggestionSnapshot = {
      ...rawSuggestions,
      corPrincipal: rawSuggestions.corPrincipal ?? fallbackColor,
      subcategoria:
        rawSuggestions.subcategoria ??
        fallbackSubcategoriaByCategoria(rawSuggestions.categoria),
      nomeSugerido:
        rawSuggestions.nomeSugerido ??
        fallbackNome({
          categoria: rawSuggestions.categoria,
          subcategoria:
            rawSuggestions.subcategoria ??
            fallbackSubcategoriaByCategoria(rawSuggestions.categoria),
          cor: rawSuggestions.corPrincipal ?? fallbackColor,
          estampado: rawSuggestions.estampado
        })
    };
    const fallbacksApplied: DraftFallbacksApplied = {
      nome: rawSuggestions.nomeSugerido ? "model" : "fallback",
      subcategoria: rawSuggestions.subcategoria ? "model" : "fallback",
      cor: rawSuggestions.corPrincipal ? "model" : "fallback"
    };
    const meta = {
      confianca: parsed.confianca,
      ambienteFoto: parsed.ambiente_foto ?? null,
      qualidadeFoto: parsed.qualidade_foto ?? null
    };
    const warnings = {
      lowConfidence: parsed.confianca < 0.6,
      multiplasPecas: parsed.multiplas_pecas === true
    };

    const analysis = await prisma.aIDraftAnalysis.create({
      data: {
        brechoId,
        textoContexto: input.textoNota?.trim() || null,
        imagensJson: input.images as Prisma.InputJsonValue,
        sugestoesJson: suggestions as Prisma.InputJsonValue,
        metaJson: meta as Prisma.InputJsonValue,
        warningsJson: warnings as Prisma.InputJsonValue,
        modeloUsado: modelUsed,
        tokensConsumidos: totalTokens,
        stage1Json: stage1 as Prisma.InputJsonValue,
        stage2Json: parsed as Prisma.InputJsonValue,
        fieldConfidenceJson: fieldConfidence as Prisma.InputJsonValue,
        fallbacksAppliedJson: fallbacksApplied as Prisma.InputJsonValue,
        stage1Tokens,
        stage2Tokens,
        stage1LatencyMs,
        stage2LatencyMs
      }
    });

    return {
      draftAnalysisId: analysis.id,
      suggestions,
      meta,
      warnings,
      fieldConfidence,
      fallbacksApplied
    };
  },

  async submitDraftFeedback(
    prisma: PrismaClient,
    brechoId: string,
    analysisId: string,
    payload: {
      helpfulness: "SIM" | "PARCIAL" | "NAO";
      itemId?: string;
      reasonCodes?: string[];
      finalValues: {
        nome: string;
        categoria: "ROUPA_FEMININA" | "ROUPA_MASCULINA" | "CALCADO" | "ACESSORIO";
        subcategoria: string;
        cor: string;
        estampa: boolean;
        condicao: "OTIMO" | "BOM" | "REGULAR";
        tamanho: string;
        marca?: string;
        precoVenda?: number;
        acervoTipo: "PROPRIO" | "CONSIGNACAO";
        acervoNome?: string;
      };
    }
  ) {
    const analysis = await prisma.aIDraftAnalysis.findFirst({
      where: { id: analysisId, brechoId }
    });

    if (!analysis) {
      throw new Error("Draft analysis not found.");
    }

    if (payload.itemId) {
      const item = await prisma.peca.findFirst({
        where: { id: payload.itemId, brechoId },
        select: { id: true }
      });
      if (!item) {
        throw new Error("Item not found.");
      }
    }

    const suggestions = analysis.sugestoesJson as unknown as DraftSuggestionSnapshot;
    const changedFields: string[] = [];

    if (suggestions.nomeSugerido != null && normalizeText(suggestions.nomeSugerido) !== normalizeText(payload.finalValues.nome)) {
      changedFields.push("nome");
    }
    if (suggestions.categoria != null && suggestions.categoria !== payload.finalValues.categoria) {
      changedFields.push("categoria");
    }
    if (
      suggestions.subcategoria != null &&
      normalizeText(suggestions.subcategoria) !== normalizeText(payload.finalValues.subcategoria)
    ) {
      changedFields.push("subcategoria");
    }
    if (
      suggestions.corPrincipal != null &&
      normalizeText(suggestions.corPrincipal) !== normalizeText(payload.finalValues.cor)
    ) {
      changedFields.push("cor");
    }
    if (suggestions.condicao != null && suggestions.condicao !== payload.finalValues.condicao) {
      changedFields.push("condicao");
    }
    if (suggestions.estampado !== payload.finalValues.estampa) {
      changedFields.push("estampa");
    }

    const feedback = await prisma.aIDraftFeedback.create({
      data: {
        brechoId,
        analysisId,
        itemId: payload.itemId ?? null,
        helpfulness: payload.helpfulness,
        finalValuesJson: payload.finalValues as Prisma.InputJsonValue,
        changedFields,
        reasonCodes: payload.reasonCodes ?? []
      }
    });

    return {
      feedbackId: feedback.id,
      changedFields
    };
  },

  async getAiQualityMetrics(
    prisma: PrismaClient,
    brechoId: string,
    query?: { days?: number }
  ) {
    const days = Math.min(180, Math.max(1, query?.days ?? 30));
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const [analyses, feedbacks] = await Promise.all([
      prisma.aIDraftAnalysis.findMany({
        where: { brechoId, criadoEm: { gte: since } },
        select: { sugestoesJson: true }
      }),
      prisma.aIDraftFeedback.findMany({
        where: { brechoId, criadoEm: { gte: since } },
        select: { changedFields: true, helpfulness: true, reasonCodes: true }
      })
    ]);

    const suggestionKeys = [
      { metric: "nome", key: "nomeSugerido" },
      { metric: "categoria", key: "categoria" },
      { metric: "subcategoria", key: "subcategoria" },
      { metric: "cor", key: "corPrincipal" },
      { metric: "condicao", key: "condicao" }
    ] as const;

    const nullRateByField = Object.fromEntries(
      suggestionKeys.map(({ metric, key }) => {
        const nullCount = analyses.filter((analysis) => {
          const suggestions = analysis.sugestoesJson as Record<string, unknown>;
          const value = suggestions[key];
          return value == null || (typeof value === "string" && value.trim() === "");
        }).length;
        const denominator = analyses.length || 1;
        return [
          metric,
          {
            nullCount,
            total: analyses.length,
            nullRate: nullCount / denominator
          }
        ];
      })
    );

    const changedCountByField = Object.fromEntries(
      suggestionKeys.map(({ metric }) => [
        metric,
        feedbacks.filter((feedback) => feedback.changedFields.includes(metric)).length
      ])
    ) as Record<string, number>;

    const editAndAcceptanceByField = Object.fromEntries(
      suggestionKeys.map(({ metric }) => {
        const edits = changedCountByField[metric] ?? 0;
        const denominator = feedbacks.length || 1;
        return [
          metric,
          {
            editedCount: edits,
            total: feedbacks.length,
            editRate: edits / denominator,
            acceptanceRate: 1 - edits / denominator
          }
        ];
      })
    );

    const helpfulnessDistribution = feedbacks.reduce<Record<string, number>>(
      (acc, feedback) => {
        acc[feedback.helpfulness] = (acc[feedback.helpfulness] ?? 0) + 1;
        return acc;
      },
      { SIM: 0, PARCIAL: 0, NAO: 0 }
    );

    const reasonCodeMap = new Map<string, number>();
    for (const feedback of feedbacks) {
      for (const code of feedback.reasonCodes) {
        reasonCodeMap.set(code, (reasonCodeMap.get(code) ?? 0) + 1);
      }
    }
    const topReasonCodes = Array.from(reasonCodeMap.entries())
      .map(([code, count]) => ({ code, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    return {
      periodDays: days,
      since: since.toISOString(),
      analysesCount: analyses.length,
      feedbackCount: feedbacks.length,
      nullRateByField,
      editAndAcceptanceByField,
      helpfulnessDistribution,
      topReasonCodes
    };
  },

  async analisarFoto(prisma: PrismaClient, brechoId: string, itemId: string, fotoId: string) {
    const apiKey = env.OPENAI_API_KEY?.trim();
    if (!apiKey) {
      throw new Error("OpenAI is not configured.");
    }

    const foto = await prisma.pecaFoto.findFirst({
      where: { id: fotoId, pecaId: itemId, peca: { brechoId } },
      include: {
        lote: true,
        peca: { select: { nome: true, categoria: true } }
      }
    });

    if (!foto) {
      throw new Error("Photo not found.");
    }

    const { bytes, mime } = await downloadImageForAnalysis(storageEnv, foto.url);
    const imageBase64 = Buffer.from(bytes).toString("base64");

    const textoNota = foto.lote?.textoNota ?? null;
    const transcricaoAudio = foto.lote?.transcricaoAudio ?? null;

    const model = env.OPENAI_VISION_MODEL?.trim() || "gpt-4o-mini";

    const { parsed, totalTokens, model: modelUsed } = await analyzePecaImageWithOpenAI({
      apiKey,
      model,
      images: [{ imageBase64, imageMime: mime }],
      textoNota,
      transcricaoAudio,
      pecaNome: foto.peca.nome,
      pecaCategoria: foto.peca.categoria
    });

    const categoriaDb = mapCategoriaFromAi(parsed.categoria ?? undefined);
    const condicaoDb = mapCondicaoFromAi(parsed.condicao ?? undefined);

    const textoContexto =
      [textoNota ? `Texto: ${textoNota}` : null, transcricaoAudio ? `Transcricao: ${transcricaoAudio}` : null]
        .filter(Boolean)
        .join("\n") || null;

    const predicaoJson = JSON.parse(JSON.stringify(parsed)) as Prisma.InputJsonValue;

    const lowConfidence = parsed.confianca < 0.6;
    const multiplasPecas = parsed.multiplas_pecas === true;
    const suggestions = buildDraftSuggestions(parsed);

    return prisma.$transaction(async (tx) => {
      const analysis = await tx.aIAnalysis.create({
        data: {
          pecaFotoId: fotoId,
          nomeSugerido: parsed.nome_sugerido?.trim() || null,
          categoria: categoriaDb,
          subcategoria: parsed.subcategoria?.trim() || null,
          corPrincipal: parsed.cor_principal?.trim() || null,
          estampado: parsed.estampado ?? false,
          descricaoEstampa: parsed.descricao_estampa?.trim() || null,
          condicao: condicaoDb,
          confianca: parsed.confianca,
          ambienteFoto: parsed.ambiente_foto ?? null,
          qualidadeFoto: parsed.qualidade_foto ?? null,
          multiplasPecas: parsed.multiplas_pecas ?? false,
          observacoes: parsed.observacoes?.trim() || null,
          textoContexto,
          transcricaoAudio,
          modeloUsado: modelUsed,
          tokensConsumidos: totalTokens
        }
      });

      await tx.pecaFoto.update({
        where: { id: fotoId },
        data: {
          aiAmbiente: parsed.ambiente_foto ?? null,
          aiQualidade: parsed.qualidade_foto ?? null,
          aiConfianca: parsed.confianca,
          aiPredicaoJson: predicaoJson
        }
      });

      return {
        analysisId: analysis.id,
        suggestions,
        meta: {
          confianca: parsed.confianca,
          ambienteFoto: parsed.ambiente_foto ?? null,
          qualidadeFoto: parsed.qualidade_foto ?? null
        },
        warnings: {
          lowConfidence,
          multiplasPecas
        }
      };
    });
  },

  async removeFoto(prisma: PrismaClient, brechoId: string, itemId: string, fotoId: string) {
    const foto = await prisma.pecaFoto.findFirst({
      where: { id: fotoId, pecaId: itemId, peca: { brechoId } }
    });

    if (!foto) {
      throw new Error("Photo not found.");
    }

    await prisma.pecaFoto.delete({
      where: { id: fotoId }
    });
  },

  async joinFila(
    prisma: PrismaClient,
    brechoId: string,
    itemId: string,
    clienteInput: { nome: string; whatsapp?: string | null; instagram?: string | null }
  ) {
    return prisma.$transaction(async (tx) => {
      const item = await tx.peca.findFirst({
        where: { id: itemId, brechoId }
      });

      if (!item) {
        throw new Error("Item not found.");
      }

      if (item.status !== itemStatus.DISPONIVEL) {
        throw new Error("Item not available for queue.");
      }

      const cliente = await clientService.findOrCreateCliente(tx, brechoId, clienteInput);

      const existing = await tx.filaInteressado.findFirst({
        where: {
          pecaId: itemId,
          clienteId: cliente.id
        }
      });

      if (existing) {
        throw new Error("Already in queue.");
      }

      const agg = await tx.filaInteressado.aggregate({
        where: { pecaId: itemId },
        _max: { posicao: true }
      });
      const posicao = (agg._max.posicao ?? -1) + 1;

      return tx.filaInteressado.create({
        data: {
          pecaId: itemId,
          clienteId: cliente.id,
          posicao
        },
        include: {
          cliente: true
        }
      });
    });
  },

  async removeFilaEntry(prisma: PrismaClient, brechoId: string, itemId: string, entradaId: string) {
    const row = await prisma.filaInteressado.findFirst({
      where: {
        id: entradaId,
        pecaId: itemId,
        peca: { brechoId }
      }
    });

    if (!row) {
      throw new Error("Queue entry not found.");
    }

    await prisma.filaInteressado.delete({
      where: { id: entradaId }
    });
  },

  async reserve(
    prisma: PrismaClient,
    brechoId: string,
    itemId: string,
    clienteInput: { nome: string; whatsapp?: string | null; instagram?: string | null }
  ) {
    return prisma.$transaction(async (tx) => {
      const item = await tx.peca.findFirst({
        where: { id: itemId, brechoId }
      });

      if (!item) {
        throw new Error("Item not found.");
      }

      ensureTransition(item.status, itemStatus.RESERVADO);

      const cliente = await clientService.findOrCreateCliente(tx, brechoId, clienteInput);

      const updatedItem = await tx.peca.update({
        where: { id: itemId },
        data: { status: itemStatus.RESERVADO }
      });

      await tx.pecaStatusHistorico.create({
        data: {
          pecaId: itemId,
          clienteId: cliente.id,
          status: itemStatus.RESERVADO
        }
      });

      return updatedItem;
    });
  },

  async sell(
    prisma: PrismaClient,
    brechoId: string,
    itemId: string,
    payload: {
      cliente: { nome: string; whatsapp?: string | null; instagram?: string | null };
      precoVenda: number;
      freteTexto?: string;
      freteValor?: number;
    }
  ) {
    return prisma.$transaction(async (tx) => {
      const item = await tx.peca.findFirst({
        where: { id: itemId, brechoId }
      });

      if (!item) {
        throw new Error("Item not found.");
      }

      ensureTransition(item.status, itemStatus.VENDIDO);

      const cliente = await clientService.findOrCreateCliente(tx, brechoId, payload.cliente);

      const freteValor = payload.freteValor ?? 0;
      /** Valor total da venda: preço da peça + frete (repasse/custo de envio somado ao valor). */
      const ganhosTotal = payload.precoVenda + freteValor;

      await tx.venda.create({
        data: {
          pecaId: itemId,
          clienteId: cliente.id,
          precoVenda: payload.precoVenda,
          freteTexto: payload.freteTexto,
          freteValor: freteValor > 0 ? freteValor : null,
          ganhosTotal
        }
      });

      const updatedItem = await tx.peca.update({
        where: { id: itemId },
        data: { status: itemStatus.VENDIDO }
      });

      await tx.pecaStatusHistorico.create({
        data: {
          pecaId: itemId,
          clienteId: cliente.id,
          status: itemStatus.VENDIDO
        }
      });

      await tx.filaInteressado.deleteMany({
        where: { pecaId: itemId }
      });

      return updatedItem;
    });
  }
};
