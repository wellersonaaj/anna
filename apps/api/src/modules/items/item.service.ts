import { canTransitionStatus, itemStatus } from "@anna/shared";
import type { Prisma, PrismaClient, StatusPeca } from "@prisma/client";
import { env } from "../../config/env.js";
import { analyzePecaImageWithOpenAI } from "../../lib/openaiVision.js";
import { buildUploadKey, createPresignedPut, downloadImageForAnalysis, isStorageConfigured } from "../../lib/storage.js";
import { clientService } from "../clients/client.service.js";

const ensureTransition = (from: StatusPeca, to: StatusPeca): void => {
  if (!canTransitionStatus(from, to)) {
    throw new Error(`Invalid status transition: ${from} -> ${to}`);
  }
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
    if (!isStorageConfigured(env)) {
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

    return createPresignedPut(env, {
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

    const { bytes, mime } = await downloadImageForAnalysis(env, foto.url);
    const imageBase64 = Buffer.from(bytes).toString("base64");

    const textoNota = foto.lote?.textoNota ?? null;
    const transcricaoAudio = foto.lote?.transcricaoAudio ?? null;

    const model = env.OPENAI_VISION_MODEL?.trim() || "gpt-4o-mini";

    const { parsed, totalTokens, model: modelUsed } = await analyzePecaImageWithOpenAI({
      apiKey,
      model,
      imageBase64,
      imageMime: mime,
      textoNota,
      transcricaoAudio,
      pecaNome: foto.peca.nome,
      pecaCategoria: foto.peca.categoria
    });

    const mapCategoria = (
      c: string | null | undefined
    ): "ROUPA_FEMININA" | "ROUPA_MASCULINA" | "CALCADO" | "ACESSORIO" | null => {
      if (!c) {
        return null;
      }
      const m: Record<string, "ROUPA_FEMININA" | "ROUPA_MASCULINA" | "CALCADO" | "ACESSORIO"> = {
        roupa_feminina: "ROUPA_FEMININA",
        roupa_masculina: "ROUPA_MASCULINA",
        calcado: "CALCADO",
        acessorio: "ACESSORIO"
      };
      return m[c] ?? null;
    };

    const mapCondicao = (c: string | null | undefined): "OTIMO" | "BOM" | "REGULAR" | null => {
      if (!c) {
        return null;
      }
      const m: Record<string, "OTIMO" | "BOM" | "REGULAR"> = {
        otimo: "OTIMO",
        bom: "BOM",
        regular: "REGULAR"
      };
      return m[c] ?? null;
    };

    const categoriaDb = mapCategoria(parsed.categoria ?? undefined);
    const condicaoDb = mapCondicao(parsed.condicao ?? undefined);

    const textoContexto =
      [textoNota ? `Texto: ${textoNota}` : null, transcricaoAudio ? `Transcricao: ${transcricaoAudio}` : null]
        .filter(Boolean)
        .join("\n") || null;

    const predicaoJson = JSON.parse(JSON.stringify(parsed)) as Prisma.InputJsonValue;

    const lowConfidence = parsed.confianca < 0.6;
    const multiplasPecas = parsed.multiplas_pecas === true;

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
        suggestions: {
          nomeSugerido: analysis.nomeSugerido,
          categoria: analysis.categoria as
            | "ROUPA_FEMININA"
            | "ROUPA_MASCULINA"
            | "CALCADO"
            | "ACESSORIO"
            | null,
          subcategoria: analysis.subcategoria,
          corPrincipal: analysis.corPrincipal,
          estampado: analysis.estampado,
          descricaoEstampa: analysis.descricaoEstampa,
          condicao: analysis.condicao as "OTIMO" | "BOM" | "REGULAR" | null
        },
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
