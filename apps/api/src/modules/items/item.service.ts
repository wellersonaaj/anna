import { canTransitionStatus, itemStatus } from "@anna/shared";
import type { Prisma, PrismaClient, StatusPeca } from "@prisma/client";
import { env, storageEnv } from "../../config/env.js";
import { analyzePecaImageWithOpenAI } from "../../lib/openaiVision.js";
import {
  buildUploadKey,
  createPresignedGet,
  createPresignedPut,
  downloadImageForAnalysis,
  isStorageConfigured,
  resolveObjectKeyFromPublicUrl
} from "../../lib/storage.js";
import { clientService } from "../clients/client.service.js";

const ensureTransition = (from: StatusPeca, to: StatusPeca): void => {
  if (!canTransitionStatus(from, to)) {
    throw new Error(`Invalid status transition: ${from} -> ${to}`);
  }
};

type DbClient = PrismaClient | Prisma.TransactionClient;

export type CoverFotoCandidate = {
  id: string;
  url: string;
  thumbnailUrl?: string | null;
  ordem: number;
  aiConfianca: number | null;
  aiQualidade: string | null;
  aiPredicaoJson: Prisma.JsonValue | null;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const getNumericAiValue = (prediction: Prisma.JsonValue | null, key: string): number | null => {
  if (!isRecord(prediction)) {
    return null;
  }
  const value = prediction[key];
  if (typeof value !== "number" || Number.isNaN(value)) {
    return null;
  }
  return Math.min(1, Math.max(0, value));
};

const getBooleanAiValue = (prediction: Prisma.JsonValue | null, key: string): boolean | null => {
  if (!isRecord(prediction)) {
    return null;
  }
  const value = prediction[key];
  return typeof value === "boolean" ? value : null;
};

const coverCandidateScore = (foto: CoverFotoCandidate): number => {
  const aiCoverScore = getNumericAiValue(foto.aiPredicaoJson, "cover_score");
  const qualityScore = foto.aiQualidade === "alta" ? 0.18 : foto.aiQualidade === "media" ? 0.08 : 0;
  const confidenceScore = (foto.aiConfianca ?? 0) * 0.12;
  const multiplePenalty = getBooleanAiValue(foto.aiPredicaoJson, "multiplas_pecas") ? 0.3 : 0;
  const orderTieBreaker = Math.max(0, 0.05 - foto.ordem * 0.001);
  return (aiCoverScore ?? 0) + qualityScore + confidenceScore + orderTieBreaker - multiplePenalty;
};

const chooseBestCoverFoto = <T extends CoverFotoCandidate>(fotos: T[]): T | null => {
  if (fotos.length === 0) {
    return null;
  }
  return [...fotos].sort((a, b) => {
    const scoreDiff = coverCandidateScore(b) - coverCandidateScore(a);
    if (Math.abs(scoreDiff) > 0.0001) {
      return scoreDiff;
    }
    return a.ordem - b.ordem;
  })[0] ?? null;
};

export const resolveCoverFoto = <T extends CoverFotoCandidate>(fotoCapaId: string | null | undefined, fotos: T[]): T | null => {
  if (fotoCapaId) {
    const manualCover = fotos.find((foto) => foto.id === fotoCapaId);
    if (manualCover) {
      return manualCover;
    }
  }
  return chooseBestCoverFoto(fotos);
};

const refreshAutoCoverFoto = async (db: DbClient, itemId: string): Promise<CoverFotoCandidate | null> => {
  const item = await db.peca.findUnique({
    where: { id: itemId },
    select: {
      fotoCapaId: true,
      fotoCapaManual: true,
      fotos: {
        orderBy: { ordem: "asc" },
        select: {
          id: true,
          url: true,
          ordem: true,
          aiConfianca: true,
          aiQualidade: true,
          aiPredicaoJson: true
        }
      }
    }
  });

  if (!item || item.fotoCapaManual) {
    return null;
  }

  const cover = chooseBestCoverFoto(item.fotos);
  const nextCoverId = cover?.id ?? null;
  if (item.fotoCapaId !== nextCoverId) {
    await db.peca.update({
      where: { id: itemId },
      data: {
        fotoCapaId: nextCoverId,
        fotoCapaManual: false
      }
    });
  }

  return cover;
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

const normalizeSubcategoria = (value: string | null | undefined): string | null => {
  const raw = value?.trim();
  if (!raw) {
    return null;
  }
  return raw
    .replace(/_/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
};

const normalizeMarca = (value: string | null | undefined): string | null => {
  const raw = value?.trim();
  if (!raw) {
    return null;
  }
  return raw;
};

const normalizeTamanho = (value: string | null | undefined): string | null => {
  const raw = value?.trim();
  if (!raw) {
    return null;
  }
  return raw;
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
  subcategoria: normalizeSubcategoria(parsed.subcategoria),
  corPrincipal: parsed.cor_principal?.trim() || null,
  estampado: parsed.estampado ?? false,
  descricaoEstampa: parsed.descricao_estampa?.trim() || null,
  condicao: mapCondicaoFromAi(parsed.condicao ?? undefined),
  tamanho: normalizeTamanho(parsed.tamanho),
  marca: normalizeMarca(parsed.marca)
});

const normalizeText = (value: string | null | undefined) => value?.trim().toLowerCase() ?? "";

const resolveDisplayImageUrl = async (url: string | null | undefined): Promise<string | null> => {
  if (!url) {
    return null;
  }
  if (!isStorageConfigured(storageEnv)) {
    return url;
  }
  const key = resolveObjectKeyFromPublicUrl(storageEnv, url);
  if (!key) {
    return url;
  }
  try {
    return await createPresignedGet(storageEnv, { key, expiresSeconds: 3600 });
  } catch {
    return url;
  }
};

/** Max photos per item returned in list payload (thumbnails / grid carousel); caps presign work. */
const LIST_FOTO_PREVIEW_CAP = 8;

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
    acervoNome?: string;
    acervoTipo?: "PROPRIO" | "CONSIGNACAO";
  }) {
    const acervoNomeFilter = query.acervoNome?.trim();
    const rows = await prisma.peca.findMany({
      where: {
        brechoId,
        status: query.status,
        categoria: query.categoria,
        acervoTipo: query.acervoTipo,
        ...(acervoNomeFilter
          ? { acervoNome: { equals: acervoNomeFilter, mode: "insensitive" as const } }
          : {}),
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
      include: {
        fotos: {
          select: {
            id: true,
            url: true,
            thumbnailUrl: true,
            ordem: true,
            aiConfianca: true,
            aiQualidade: true,
            aiPredicaoJson: true
          },
          orderBy: { ordem: "asc" },
          take: 15
        },
        historicoStatus: {
          orderBy: { criadoEm: "desc" },
          take: 1,
          include: {
            cliente: true
          }
        }
      },
      orderBy: {
        criadoEm: "desc"
      }
    });

    return Promise.all(
      rows.map(async (row) => {
        const coverFoto = resolveCoverFoto(row.fotoCapaId, row.fotos);
        const previewFotos = row.fotos.slice(0, LIST_FOTO_PREVIEW_CAP);
        const fotoPreviews = (
          await Promise.all(
            previewFotos.map(async (f) => {
              const raw = f.thumbnailUrl ?? f.url;
              if (!raw) {
                return null;
              }
              const displayUrl = (await resolveDisplayImageUrl(raw)) ?? raw;
              return { id: f.id, displayUrl };
            })
          )
        ).filter((p): p is { id: string; displayUrl: string } => p !== null);
        return {
          id: row.id,
          nome: row.nome,
          categoria: row.categoria,
          subcategoria: row.subcategoria,
          status: row.status,
          criadoEm: row.criadoEm,
          cor: row.cor,
          tamanho: row.tamanho,
          estampa: row.estampa,
          condicao: row.condicao,
          acervoTipo: row.acervoTipo,
          acervoNome: row.acervoNome,
          precoVenda: row.precoVenda,
          marca: row.marca,
          fotoCapaId: row.fotoCapaId,
          fotoPreviews,
          fotoCapaUrl: await resolveDisplayImageUrl(coverFoto?.url ?? null),
          fotoCapaThumbnailUrl: await resolveDisplayImageUrl((coverFoto?.thumbnailUrl ?? coverFoto?.url) ?? null),
          ultimoStatus: row.historicoStatus[0]
            ? {
                status: row.historicoStatus[0].status,
                criadoEm: row.historicoStatus[0].criadoEm,
                cliente: row.historicoStatus[0].cliente
                  ? {
                      id: row.historicoStatus[0].cliente.id,
                      nome: row.historicoStatus[0].cliente.nome,
                      whatsapp: row.historicoStatus[0].cliente.whatsapp,
                      instagram: row.historicoStatus[0].cliente.instagram
                    }
                  : null
              }
            : null
        };
      })
    );
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
    const item = await prisma.peca.findFirst({
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
    if (!item) {
      return item;
    }
    const coverFotoRaw = resolveCoverFoto(item.fotoCapaId, item.fotos);
    const coverId = coverFotoRaw?.id ?? null;
    const signedFotos = await Promise.all(
      (item.fotos ?? []).map(async (foto) => ({
        ...foto,
        url: (await resolveDisplayImageUrl(foto.url)) ?? foto.url,
        thumbnailUrl: foto.thumbnailUrl
          ? ((await resolveDisplayImageUrl(foto.thumbnailUrl)) ?? foto.thumbnailUrl)
          : null
      }))
    );
    return {
      ...item,
      fotoCapaUrl: await resolveDisplayImageUrl(coverFotoRaw?.url ?? null),
      fotoCapaThumbnailUrl: await resolveDisplayImageUrl((coverFotoRaw?.thumbnailUrl ?? coverFotoRaw?.url) ?? null),
      fotos: signedFotos.map((foto) => ({
        ...foto,
        isCover: foto.id === coverId
      }))
    };
  },

  async update(
    prisma: PrismaClient,
    brechoId: string,
    itemId: string,
    payload: {
      nome?: string;
      categoria?: "ROUPA_FEMININA" | "ROUPA_MASCULINA" | "CALCADO" | "ACESSORIO";
      subcategoria?: string;
      cor?: string;
      estampa?: boolean;
      condicao?: "OTIMO" | "BOM" | "REGULAR";
      tamanho?: string;
      marca?: string;
      precoVenda?: number | null;
      acervoTipo?: "PROPRIO" | "CONSIGNACAO";
      acervoNome?: string | null;
    }
  ) {
    const item = await prisma.peca.findFirst({
      where: { id: itemId, brechoId },
      select: { id: true }
    });

    if (!item) {
      throw new Error("Item not found.");
    }

    return prisma.peca.update({
      where: { id: itemId },
      data: {
        ...(payload.nome !== undefined ? { nome: payload.nome.trim() } : {}),
        ...(payload.categoria !== undefined ? { categoria: payload.categoria } : {}),
        ...(payload.subcategoria !== undefined ? { subcategoria: payload.subcategoria.trim() } : {}),
        ...(payload.cor !== undefined ? { cor: payload.cor.trim() } : {}),
        ...(payload.estampa !== undefined ? { estampa: payload.estampa } : {}),
        ...(payload.condicao !== undefined ? { condicao: payload.condicao } : {}),
        ...(payload.tamanho !== undefined ? { tamanho: payload.tamanho.trim() } : {}),
        ...(payload.marca !== undefined ? { marca: payload.marca.trim() || null } : {}),
        ...(payload.precoVenda !== undefined ? { precoVenda: payload.precoVenda } : {}),
        ...(payload.acervoTipo !== undefined ? { acervoTipo: payload.acervoTipo } : {}),
        ...(payload.acervoNome !== undefined ? { acervoNome: payload.acervoNome?.trim() || null } : {})
      }
    });
  },

  async updateStatus(prisma: PrismaClient, brechoId: string, itemId: string, status: StatusPeca) {
    return prisma.$transaction(async (tx) => {
      const item = await tx.peca.findFirst({
        where: { id: itemId, brechoId }
      });

      if (!item) {
        throw new Error("Item not found.");
      }

      if (item.status === status) {
        return item;
      }

      ensureTransition(item.status, status);

      const updatedItem = await tx.peca.update({
        where: { id: itemId },
        data: { status }
      });

      if (status === itemStatus.DISPONIVEL || status === itemStatus.INDISPONIVEL) {
        await tx.filaInteressado.deleteMany({
          where: { pecaId: itemId }
        });
      }

      await tx.pecaStatusHistorico.create({
        data: {
          pecaId: itemId,
          status
        }
      });

      return updatedItem;
    });
  },

  async addFoto(
    prisma: PrismaClient,
    brechoId: string,
    itemId: string,
    payload: {
      url: string;
      ordem?: number;
      loteId?: string;
      thumbnailUrl?: string;
      thumbnailTamanhoBytes?: number;
      largura?: number;
      altura?: number;
    }
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

    if (existingCount >= 15) {
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

    const foto = await prisma.pecaFoto.create({
      data: {
        pecaId: itemId,
        loteId: payload.loteId ?? null,
        url: payload.url.trim(),
        thumbnailUrl: payload.thumbnailUrl?.trim() || null,
        thumbnailTamanhoBytes: payload.thumbnailTamanhoBytes ?? null,
        largura: payload.largura ?? null,
        altura: payload.altura ?? null,
        ordem
      }
    });

    await refreshAutoCoverFoto(prisma, itemId);

    return foto;
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
      images: Array<{ imageBase64: string; imageMime: string }>;
      textoNota?: string;
    },
    importLink?: { importacaoLoteId?: string | null; importacaoGrupoId?: string | null }
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
    const photoMeta = {
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
        importacaoLoteId: importLink?.importacaoLoteId ?? undefined,
        importacaoGrupoId: importLink?.importacaoGrupoId ?? undefined,
        textoContexto: input.textoNota?.trim() || null,
        imagensJson: input.images as Prisma.InputJsonValue,
        sugestoesJson: suggestions as Prisma.InputJsonValue,
        metaJson: photoMeta as Prisma.InputJsonValue,
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
      meta: photoMeta,
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

      await refreshAutoCoverFoto(tx, itemId);

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

    await prisma.peca.updateMany({
      where: { id: itemId, fotoCapaId: null },
      data: { fotoCapaManual: false }
    });
    await refreshAutoCoverFoto(prisma, itemId);
  },

  async setCoverFoto(prisma: PrismaClient, brechoId: string, itemId: string, fotoId: string) {
    const foto = await prisma.pecaFoto.findFirst({
      where: { id: fotoId, pecaId: itemId, peca: { brechoId } }
    });

    if (!foto) {
      throw new Error("Photo not found.");
    }

    await prisma.peca.update({
      where: { id: itemId },
      data: {
        fotoCapaId: fotoId,
        fotoCapaManual: true
      }
    });

    return foto;
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

      if (item.status !== itemStatus.DISPONIVEL && item.status !== itemStatus.RESERVADO) {
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

      const entry = await tx.filaInteressado.create({
        data: {
          pecaId: itemId,
          clienteId: cliente.id,
          posicao
        },
        include: {
          cliente: true
        }
      });

      if (posicao === 0 && item.status === itemStatus.DISPONIVEL) {
        await tx.peca.update({
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
      }

      return entry;
    });
  },

  async removeFilaEntry(prisma: PrismaClient, brechoId: string, itemId: string, entradaId: string) {
    await prisma.$transaction(async (tx) => {
      const row = await tx.filaInteressado.findFirst({
        where: {
          id: entradaId,
          pecaId: itemId,
          peca: { brechoId }
        },
        include: {
          peca: true
        }
      });

      if (!row) {
        throw new Error("Queue entry not found.");
      }

      await tx.filaInteressado.delete({
        where: { id: entradaId }
      });

      const remaining = await tx.filaInteressado.findMany({
        where: { pecaId: itemId },
        orderBy: { posicao: "asc" },
        include: { cliente: true }
      });

      for (const [index, entry] of remaining.entries()) {
        if (entry.posicao !== index) {
          await tx.filaInteressado.update({
            where: { id: entry.id },
            data: { posicao: index }
          });
        }
      }

      if (row.peca.status !== itemStatus.RESERVADO) {
        return;
      }

      const nextReserved = remaining[0];
      if (nextReserved) {
        if (row.posicao === 0) {
          await tx.pecaStatusHistorico.create({
            data: {
              pecaId: itemId,
              clienteId: nextReserved.clienteId,
              status: itemStatus.RESERVADO
            }
          });
        }
        return;
      }

      await tx.peca.update({
        where: { id: itemId },
        data: { status: itemStatus.DISPONIVEL }
      });
      await tx.pecaStatusHistorico.create({
        data: {
          pecaId: itemId,
          status: itemStatus.DISPONIVEL
        }
      });
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

      if (item.status !== itemStatus.DISPONIVEL && item.status !== itemStatus.RESERVADO) {
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

      await tx.filaInteressado.create({
        data: {
          pecaId: itemId,
          clienteId: cliente.id,
          posicao
        }
      });

      if (posicao !== 0) {
        return item;
      }

      const updatedItem =
        item.status === itemStatus.DISPONIVEL
          ? await tx.peca.update({
              where: { id: itemId },
              data: { status: itemStatus.RESERVADO }
            })
          : item;

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
