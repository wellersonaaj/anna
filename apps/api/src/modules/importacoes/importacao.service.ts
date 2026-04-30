import type { Prisma, PrismaClient } from "@prisma/client";
import { ImportacaoGrupoStatus, ImportacaoLoteStatus, ImportacaoRascunhoStatus } from "@prisma/client";
import { env, storageEnv } from "../../config/env.js";
import { groupImportPhotosWithOpenAI } from "../../lib/openaiImportGrouping.js";
import {
  buildImportUploadKey,
  createPresignedGet,
  createPresignedPut,
  downloadImageForAnalysis,
  isStorageConfigured,
  resolveObjectKeyFromPublicUrl
} from "../../lib/storage.js";
import { itemService } from "../items/item.service.js";

const MAX_GROUPING_LLM = 15;
const maxDraftAnalyzePayloadBytes = 32 * 1024 * 1024;

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

const primaryMime = (raw: string): string =>
  raw
    .split(";")[0]
    ?.trim()
    .toLowerCase() ?? raw.trim().toLowerCase();

const assertLote = async (prisma: PrismaClient, brechoId: string, loteId: string) => {
  const lote = await prisma.importacaoLote.findFirst({
    where: { id: loteId, brechoId }
  });
  if (!lote) {
    throw new Error("Import lot not found.");
  }
  return lote;
};

const recalcLoteTotals = async (prisma: PrismaClient, loteId: string) => {
  const [fotoCount, grupoCount] = await Promise.all([
    prisma.importacaoFoto.count({
      where: { loteId, ignorada: false }
    }),
    prisma.importacaoGrupo.count({ where: { loteId } })
  ]);
  await prisma.importacaoLote.update({
    where: { id: loteId },
    data: { totalFotos: fotoCount, totalGrupos: grupoCount }
  });
};

type SuggestionsShape = {
  nomeSugerido: string | null;
  categoria: "ROUPA_FEMININA" | "ROUPA_MASCULINA" | "CALCADO" | "ACESSORIO" | null;
  subcategoria: string | null;
  corPrincipal: string | null;
  estampado: boolean;
  condicao: "OTIMO" | "BOM" | "REGULAR" | null;
  tamanho: string | null;
  marca: string | null;
};

const formValuesFromSuggestions = (s: SuggestionsShape): Prisma.InputJsonValue => {
  return {
    nome: s.nomeSugerido ?? "",
    categoria: s.categoria ?? "ROUPA_FEMININA",
    subcategoria: s.subcategoria ?? "",
    cor: s.corPrincipal ?? "",
    estampa: s.estampado,
    condicao: s.condicao ?? "OTIMO",
    tamanho: s.tamanho ?? "",
    marca: s.marca ?? "",
    precoVenda: undefined,
    acervoTipo: "PROPRIO",
    acervoNome: ""
  } as Prisma.InputJsonValue;
};

export const importacaoService = {
  async metricasResumo(prisma: PrismaClient, brechoId: string) {
    const [lotesTotal, lotesPendentes, rascunhosPublicados] = await Promise.all([
      prisma.importacaoLote.count({ where: { brechoId } }),
      prisma.importacaoLote.count({
        where: {
          brechoId,
          status: {
            notIn: [ImportacaoLoteStatus.CONCLUIDO, ImportacaoLoteStatus.ABANDONADO]
          },
          OR: [{ status: { not: ImportacaoLoteStatus.RECEBENDO_FOTOS } }, { totalFotos: { gt: 0 } }]
        }
      }),
      prisma.importacaoRascunho.count({
        where: {
          status: ImportacaoRascunhoStatus.PUBLICADO,
          grupo: { lote: { brechoId } }
        }
      })
    ]);
    return { lotesTotal, lotesPendentes, rascunhosPublicados };
  },

  async createLote(prisma: PrismaClient, brechoId: string) {
    return prisma.importacaoLote.create({
      data: {
        brechoId,
        status: ImportacaoLoteStatus.RECEBENDO_FOTOS
      }
    });
  },

  async cancelarLote(prisma: PrismaClient, brechoId: string, loteId: string) {
    const lote = await assertLote(prisma, brechoId, loteId);
    if (lote.status === ImportacaoLoteStatus.CONCLUIDO) {
      throw new Error("Lote concluido nao pode ser cancelado.");
    }

    return prisma.importacaoLote.update({
      where: { id: loteId },
      data: { status: ImportacaoLoteStatus.ABANDONADO }
    });
  },

  async listLotes(prisma: PrismaClient, brechoId: string) {
    return prisma.importacaoLote.findMany({
      where: {
        brechoId,
        status: { not: ImportacaoLoteStatus.ABANDONADO },
        OR: [{ status: { not: ImportacaoLoteStatus.RECEBENDO_FOTOS } }, { totalFotos: { gt: 0 } }]
      },
      orderBy: { criadoEm: "desc" },
      take: 50,
      select: {
        id: true,
        status: true,
        totalFotos: true,
        totalGrupos: true,
        criadoEm: true,
        atualizadoEm: true
      }
    });
  },

  async countPendentes(prisma: PrismaClient, brechoId: string): Promise<number> {
    return prisma.importacaoLote.count({
      where: {
        brechoId,
        status: {
          in: [
            ImportacaoLoteStatus.RECEBENDO_FOTOS,
            ImportacaoLoteStatus.REVISAR_GRUPOS,
            ImportacaoLoteStatus.CLASSIFICANDO,
            ImportacaoLoteStatus.REVISAR_DADOS,
            ImportacaoLoteStatus.AGRUPANDO
          ]
        },
        OR: [{ status: { not: ImportacaoLoteStatus.RECEBENDO_FOTOS } }, { totalFotos: { gt: 0 } }]
      }
    });
  },

  async getLoteDetail(prisma: PrismaClient, brechoId: string, loteId: string) {
    await assertLote(prisma, brechoId, loteId);
    const lote = await prisma.importacaoLote.findFirst({
      where: { id: loteId, brechoId },
      include: {
        fotos: {
          where: { ignorada: false },
          orderBy: { ordemOriginal: "asc" }
        },
        grupos: {
          orderBy: { ordem: "asc" },
          include: {
            fotoLinks: {
              orderBy: { ordemNoGrupo: "asc" },
              include: { foto: true }
            },
            rascunho: true
          }
        }
      }
    });
    if (!lote) {
      throw new Error("Import lot not found.");
    }

    const fotosOut = await Promise.all(
      lote.fotos.map(async (f) => ({
        id: f.id,
        ordemOriginal: f.ordemOriginal,
        url: (await resolveDisplayImageUrl(f.url)) ?? f.url,
        thumbnailUrl: f.thumbnailUrl ? ((await resolveDisplayImageUrl(f.thumbnailUrl)) ?? f.thumbnailUrl) : null,
        mime: f.mime,
        statusUpload: f.statusUpload,
        ignorada: f.ignorada,
        nomeArquivo: f.nomeArquivo
      }))
    );

    const gruposOut = await Promise.all(
      lote.grupos.map(async (g) => ({
        id: g.id,
        ordem: g.ordem,
        status: g.status,
        confiancaAgrupamento: g.confiancaAgrupamento,
        motivoRevisao: g.motivoRevisao,
        ordemInicio: g.ordemInicio,
        ordemFim: g.ordemFim,
        temFotosNaoContiguas: g.temFotosNaoContiguas,
        fotos: await Promise.all(
          g.fotoLinks.map(async (link) => ({
            id: link.foto.id,
            ordemNoGrupo: link.ordemNoGrupo,
            ordemOriginal: link.foto.ordemOriginal,
            url: (await resolveDisplayImageUrl(link.foto.url)) ?? link.foto.url,
            thumbnailUrl: link.foto.thumbnailUrl
              ? ((await resolveDisplayImageUrl(link.foto.thumbnailUrl)) ?? link.foto.thumbnailUrl)
              : null,
            mime: link.foto.mime
          }))
        ),
        rascunho: g.rascunho
          ? {
              id: g.rascunho.id,
              status: g.rascunho.status,
              draftAnalysisId: g.rascunho.draftAnalysisId,
              pecaId: g.rascunho.pecaId,
              formValues: g.rascunho.formValuesJson
            }
          : null
      }))
    );

    return {
      lote: {
        id: lote.id,
        status: lote.status,
        totalFotos: lote.totalFotos,
        totalGrupos: lote.totalGrupos,
        criadoEm: lote.criadoEm,
        atualizadoEm: lote.atualizadoEm
      },
      fotos: fotosOut,
      grupos: gruposOut
    };
  },

  async presignFoto(
    prisma: PrismaClient,
    brechoId: string,
    loteId: string,
    input: { contentType: string; extensao: string; ordemOriginal: number; tamanhoBytes?: number }
  ) {
    if (!isStorageConfigured(storageEnv)) {
      throw new Error("Storage is not configured.");
    }
    await assertLote(prisma, brechoId, loteId);

    const contentType = primaryMime(input.contentType);
    const allowed = ["image/jpeg", "image/png", "image/webp"];
    if (!allowed.includes(contentType)) {
      throw new Error("Content-Type invalido para imagem de importacao.");
    }
    const max = 8 * 1024 * 1024;
    if (input.tamanhoBytes != null && input.tamanhoBytes > max) {
      throw new Error(`Arquivo acima do limite (${max} bytes).`);
    }

    const key = buildImportUploadKey({
      brechoId,
      importLoteId: loteId,
      extensao: input.extensao
    });

    return createPresignedPut(storageEnv, {
      key,
      contentType
    });
  },

  async registerFoto(
    prisma: PrismaClient,
    brechoId: string,
    loteId: string,
    input: {
      ordemOriginal: number;
      url: string;
      thumbnailUrl?: string;
      mime: string;
      tamanhoBytes?: number;
      thumbnailTamanhoBytes?: number;
      largura?: number;
      altura?: number;
      nomeArquivo?: string;
      source?: string;
    }
  ) {
    await assertLote(prisma, brechoId, loteId);

    const foto = await prisma.importacaoFoto.upsert({
      where: {
        loteId_ordemOriginal: {
          loteId,
          ordemOriginal: input.ordemOriginal
        }
      },
      create: {
        loteId,
        ordemOriginal: input.ordemOriginal,
        url: input.url.trim(),
        thumbnailUrl: input.thumbnailUrl?.trim() || null,
        mime: primaryMime(input.mime),
        tamanhoBytes: input.tamanhoBytes ?? null,
        thumbnailTamanhoBytes: input.thumbnailTamanhoBytes ?? null,
        largura: input.largura ?? null,
        altura: input.altura ?? null,
        nomeArquivo: input.nomeArquivo?.trim() || null,
        source: input.source?.trim() || null,
        statusUpload: "ENVIADA"
      },
      update: {
        url: input.url.trim(),
        thumbnailUrl: input.thumbnailUrl?.trim() || null,
        mime: primaryMime(input.mime),
        tamanhoBytes: input.tamanhoBytes ?? null,
        thumbnailTamanhoBytes: input.thumbnailTamanhoBytes ?? null,
        largura: input.largura ?? null,
        altura: input.altura ?? null,
        nomeArquivo: input.nomeArquivo?.trim() || null,
        source: input.source?.trim() || null,
        statusUpload: "ENVIADA"
      }
    });

    await recalcLoteTotals(prisma, loteId);
    return foto;
  },

  async agrupar(prisma: PrismaClient, brechoId: string, loteId: string) {
    const startedAt = Date.now();
    await assertLote(prisma, brechoId, loteId);

    const fotos = await prisma.importacaoFoto.findMany({
      where: { loteId, ignorada: false },
      orderBy: { ordemOriginal: "asc" }
    });

    if (fotos.length === 0) {
      throw new Error("Nenhuma foto no lote para agrupar.");
    }

    await prisma.importacaoLote.update({
      where: { id: loteId },
      data: { status: ImportacaoLoteStatus.AGRUPANDO }
    });

    await prisma.importacaoGrupoFoto.deleteMany({
      where: { grupo: { loteId } }
    });
    await prisma.importacaoRascunho.deleteMany({
      where: { grupo: { loteId } }
    });
    await prisma.importacaoGrupo.deleteMany({ where: { loteId } });

    let gruposIndices: number[][];
    let confidences: number[];
    let motivos: (string | null)[];
    let temFlags: boolean[];
    let downloadElapsedMs = 0;
    let openAiElapsedMs = 0;
    let approxBytes = 0;

    if (fotos.length > MAX_GROUPING_LLM) {
      gruposIndices = fotos.map((_, i) => [i]);
      confidences = fotos.map(() => 0.35);
      motivos = fotos.map(
        () =>
          `Mais de ${MAX_GROUPING_LLM} fotos: cada foto virou um grupo separado. Ajuste manualmente os grupos.`
      );
      temFlags = fotos.map(() => false);
    } else {
      const apiKey = env.OPENAI_API_KEY?.trim();
      if (!apiKey) {
        throw new Error("OpenAI is not configured.");
      }
      const model = env.OPENAI_VISION_MODEL?.trim() || "gpt-4o-mini";

      const photosPayload: Array<{ indice: number; imageBase64: string; imageMime: string }> = [];
      const downloadStartedAt = Date.now();
      for (let i = 0; i < fotos.length; i++) {
        const foto = fotos[i]!;
        const { bytes, mime } = await downloadImageForAnalysis(storageEnv, foto.url);
        const b64 = Buffer.from(bytes).toString("base64");
        approxBytes += Math.floor((b64.length * 3) / 4);
        if (approxBytes > maxDraftAnalyzePayloadBytes) {
          throw new Error("Payload de imagens muito grande para agrupamento.");
        }
        const imageMime =
          mime === "image/png" || mime === "image/webp" || mime === "image/jpeg" ? mime : "image/jpeg";
        photosPayload.push({ indice: i, imageBase64: b64, imageMime });
      }
      downloadElapsedMs = Date.now() - downloadStartedAt;

      const openAiStartedAt = Date.now();
      const result = await groupImportPhotosWithOpenAI({
        apiKey,
        model,
        photos: photosPayload
      });
      openAiElapsedMs = Date.now() - openAiStartedAt;

      gruposIndices = result.grupos;
      confidences = gruposIndices.map((_, idx) =>
        result.usedFallback ? 0.4 : Math.max(0.55, 0.92 - idx * 0.02)
      );
      motivos = gruposIndices.map((_, idx) =>
        result.usedFallback
          ? "Agrupamento automatico indisponivel; revise e una grupos se necessario."
          : result.temFotosNaoContiguasPorGrupo[idx]
            ? "Grupo com fotos nao consecutivas na ordem de envio; confira se e a mesma peca."
            : null
      );
      temFlags = gruposIndices.map((_, idx) => result.temFotosNaoContiguasPorGrupo[idx] ?? false);
    }

    for (let gi = 0; gi < gruposIndices.length; gi++) {
      const idxs = gruposIndices[gi]!;
      const fotoRefs = idxs.map((i) => fotos[i]).filter(Boolean) as typeof fotos;
      if (fotoRefs.length === 0) {
        continue;
      }
      const ordens = fotoRefs.map((f) => f.ordemOriginal).sort((a, b) => a - b);
      const ordemInicio = ordens[0]!;
      const ordemFim = ordens[ordens.length - 1]!;

      const grupo = await prisma.importacaoGrupo.create({
        data: {
          loteId,
          ordem: gi,
          status: ImportacaoGrupoStatus.PROPOSTO,
          confiancaAgrupamento: confidences[gi] ?? 0.5,
          motivoRevisao: motivos[gi],
          ordemInicio,
          ordemFim,
          temFotosNaoContiguas: temFlags[gi] ?? false
        }
      });

      let o = 0;
      for (const fi of idxs) {
        const foto = fotos[fi];
        if (!foto) {
          continue;
        }
        await prisma.importacaoGrupoFoto.create({
          data: {
            grupoId: grupo.id,
            fotoId: foto.id,
            ordemNoGrupo: o++
          }
        });
      }
    }

    await recalcLoteTotals(prisma, loteId);
    await prisma.importacaoLote.update({
      where: { id: loteId },
      data: { status: ImportacaoLoteStatus.REVISAR_GRUPOS }
    });

    console.info("[importacao] agrupar", {
      loteId,
      fotos: fotos.length,
      grupos: gruposIndices.length,
      approxBytes,
      downloadElapsedMs,
      openAiElapsedMs,
      totalElapsedMs: Date.now() - startedAt
    });

    return importacaoService.getLoteDetail(prisma, brechoId, loteId);
  },

  async patchGrupos(
    prisma: PrismaClient,
    brechoId: string,
    loteId: string,
    body: { grupos: Array<{ fotoIds: string[] }> }
  ) {
    const lote = await assertLote(prisma, brechoId, loteId);
    if (lote.status !== ImportacaoLoteStatus.REVISAR_GRUPOS) {
      throw new Error("Lote nao esta em revisao de grupos.");
    }

    const fotos = await prisma.importacaoFoto.findMany({
      where: { loteId, ignorada: false }
    });
    const fotoIdSet = new Set(fotos.map((f) => f.id));
    const used = new Set<string>();

    for (const g of body.grupos) {
      if (g.fotoIds.length > 15) {
        throw new Error("No maximo 15 fotos por grupo.");
      }
      for (const id of g.fotoIds) {
        if (!fotoIdSet.has(id)) {
          throw new Error("Foto invalida para este lote.");
        }
        if (used.has(id)) {
          throw new Error("Foto duplicada entre grupos.");
        }
        used.add(id);
      }
    }
    if (used.size !== fotoIdSet.size) {
      throw new Error("Todas as fotos do lote devem aparecer em exatamente um grupo.");
    }

    await prisma.importacaoGrupoFoto.deleteMany({
      where: { grupo: { loteId } }
    });
    await prisma.importacaoRascunho.deleteMany({
      where: { grupo: { loteId } }
    });
    await prisma.importacaoGrupo.deleteMany({ where: { loteId } });

    for (let gi = 0; gi < body.grupos.length; gi++) {
      const g = body.grupos[gi]!;
      const refs = g.fotoIds.map((id) => fotos.find((f) => f.id === id)!).filter(Boolean);
      const ordens = refs.map((f) => f.ordemOriginal).sort((a, b) => a - b);
      const sortedByOrder = [...refs].sort((a, b) => a.ordemOriginal - b.ordemOriginal);
      let temNaoCont = false;
      for (let k = 1; k < sortedByOrder.length; k++) {
        if (sortedByOrder[k]!.ordemOriginal !== sortedByOrder[k - 1]!.ordemOriginal + 1) {
          temNaoCont = true;
          break;
        }
      }

      const grupo = await prisma.importacaoGrupo.create({
        data: {
          loteId,
          ordem: gi,
          status: ImportacaoGrupoStatus.PROPOSTO,
          confiancaAgrupamento: 0.85,
          motivoRevisao: temNaoCont ? "Grupo editado manualmente com fotos nao consecutivas." : null,
          ordemInicio: ordens[0]!,
          ordemFim: ordens[ordens.length - 1]!,
          temFotosNaoContiguas: temNaoCont
        }
      });
      let o = 0;
      for (const foto of sortedByOrder) {
        await prisma.importacaoGrupoFoto.create({
          data: {
            grupoId: grupo.id,
            fotoId: foto.id,
            ordemNoGrupo: o++
          }
        });
      }
    }

    await recalcLoteTotals(prisma, loteId);
    await prisma.importacaoLote.update({
      where: { id: loteId },
      data: { status: ImportacaoLoteStatus.REVISAR_GRUPOS }
    });

    return importacaoService.getLoteDetail(prisma, brechoId, loteId);
  },

  async confirmarGrupos(prisma: PrismaClient, brechoId: string, loteId: string) {
    await assertLote(prisma, brechoId, loteId);
    const grupos = await prisma.importacaoGrupo.findMany({ where: { loteId } });
    if (grupos.length === 0) {
      throw new Error("Nenhum grupo para confirmar.");
    }
    await prisma.importacaoGrupo.updateMany({
      where: { loteId },
      data: { status: ImportacaoGrupoStatus.CONFIRMADO }
    });
    await prisma.importacaoLote.update({
      where: { id: loteId },
      data: { status: ImportacaoLoteStatus.REVISAR_GRUPOS }
    });
    return importacaoService.getLoteDetail(prisma, brechoId, loteId);
  },

  async classificar(prisma: PrismaClient, brechoId: string, loteId: string) {
    await assertLote(prisma, brechoId, loteId);

    const grupos = await prisma.importacaoGrupo.findMany({
      where: { loteId, status: ImportacaoGrupoStatus.CONFIRMADO },
      orderBy: { ordem: "asc" },
      include: {
        fotoLinks: {
          orderBy: { ordemNoGrupo: "asc" },
          include: { foto: true }
        },
        rascunho: true
      }
    });

    if (grupos.length === 0) {
      throw new Error("Confirme os grupos antes de classificar.");
    }

    await prisma.importacaoLote.update({
      where: { id: loteId },
      data: { status: ImportacaoLoteStatus.CLASSIFICANDO }
    });

    let ok = 0;
    let fail = 0;

    for (const grupo of grupos) {
      if (grupo.rascunho?.status === ImportacaoRascunhoStatus.PUBLICADO) {
        ok++;
        continue;
      }
      if (
        grupo.rascunho?.status === ImportacaoRascunhoStatus.RASCUNHO &&
        grupo.rascunho.draftAnalysisId
      ) {
        ok++;
        continue;
      }

      const urls = grupo.fotoLinks.map((l) => l.foto.url);
      if (urls.length === 0) {
        fail++;
        continue;
      }

      const images: Array<{ imageBase64: string; imageMime: string }> = [];
      let approxBytes = 0;
      try {
        for (const url of urls) {
          const { bytes, mime } = await downloadImageForAnalysis(storageEnv, url);
          const b64 = Buffer.from(bytes).toString("base64");
          approxBytes += Math.floor((b64.length * 3) / 4);
          if (approxBytes > maxDraftAnalyzePayloadBytes) {
            throw new Error("Payload muito grande.");
          }
          const primary = mime.split(";")[0]?.trim().toLowerCase() || "image/jpeg";
          const imageMime =
            primary === "image/png" || primary === "image/webp" || primary === "image/gif"
              ? primary
              : "image/jpeg";
          images.push({ imageBase64: b64, imageMime });
        }

        const analysisResult = await itemService.analisarFotoRascunho(
          prisma,
          brechoId,
          { images },
          { importacaoLoteId: loteId, importacaoGrupoId: grupo.id }
        );

        const suggestions = analysisResult.suggestions as unknown as SuggestionsShape;
        const formJson = formValuesFromSuggestions(suggestions);

        await prisma.importacaoRascunho.upsert({
          where: { grupoId: grupo.id },
          create: {
            grupoId: grupo.id,
            draftAnalysisId: analysisResult.draftAnalysisId,
            formValuesJson: formJson,
            status: ImportacaoRascunhoStatus.RASCUNHO
          },
          update: {
            draftAnalysisId: analysisResult.draftAnalysisId,
            formValuesJson: formJson,
            status: ImportacaoRascunhoStatus.RASCUNHO,
            pecaId: null
          }
        });
        ok++;
      } catch {
        await prisma.importacaoRascunho.upsert({
          where: { grupoId: grupo.id },
          create: {
            grupoId: grupo.id,
            status: ImportacaoRascunhoStatus.ERRO_CLASSIFICACAO
          },
          update: {
            status: ImportacaoRascunhoStatus.ERRO_CLASSIFICACAO
          }
        });
        fail++;
      }
    }

    const nextStatus =
      ok > 0 ? ImportacaoLoteStatus.REVISAR_DADOS : ImportacaoLoteStatus.ERRO;
    await prisma.importacaoLote.update({
      where: { id: loteId },
      data: { status: nextStatus }
    });

    return { ok, fail, detail: await importacaoService.getLoteDetail(prisma, brechoId, loteId) };
  },

  async patchRascunho(
    prisma: PrismaClient,
    brechoId: string,
    loteId: string,
    rascunhoId: string,
    body: {
      formValues: {
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
    const rascunho = await prisma.importacaoRascunho.findFirst({
      where: {
        id: rascunhoId,
        grupo: { loteId, lote: { brechoId } }
      }
    });
    if (!rascunho) {
      throw new Error("Rascunho not found.");
    }
    if (rascunho.status === ImportacaoRascunhoStatus.PUBLICADO) {
      throw new Error("Rascunho ja publicado.");
    }

    return prisma.importacaoRascunho.update({
      where: { id: rascunhoId },
      data: {
        formValuesJson: body.formValues as Prisma.InputJsonValue
      }
    });
  },

  async publicarRascunho(
    prisma: PrismaClient,
    brechoId: string,
    loteId: string,
    rascunhoId: string,
    payload: { helpfulness: "SIM" | "PARCIAL" | "NAO"; reasonCodes?: string[] }
  ) {
    const rascunho = await prisma.importacaoRascunho.findFirst({
      where: {
        id: rascunhoId,
        grupo: { loteId, lote: { brechoId } }
      },
      include: {
        grupo: {
          include: {
            fotoLinks: {
              orderBy: { ordemNoGrupo: "asc" },
              include: { foto: true }
            }
          }
        }
      }
    });

    if (!rascunho) {
      throw new Error("Rascunho not found.");
    }
    if (rascunho.status === ImportacaoRascunhoStatus.PUBLICADO) {
      throw new Error("Rascunho ja publicado.");
    }

    const raw = rascunho.formValuesJson as Record<string, unknown> | null;
    if (!raw || typeof raw.nome !== "string") {
      throw new Error("Formulario incompleto.");
    }

    const fv = raw as {
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

    const item = await itemService.create(prisma, brechoId, {
      nome: fv.nome,
      categoria: fv.categoria,
      subcategoria: fv.subcategoria,
      cor: fv.cor,
      estampa: fv.estampa,
      condicao: fv.condicao,
      tamanho: fv.tamanho,
      marca: fv.marca,
      precoVenda: fv.precoVenda,
      acervoTipo: fv.acervoTipo,
      acervoNome: fv.acervoNome
    });

    const loteFotos = await itemService.createFotoLote(prisma, brechoId, item.id, {
      textoNota: `Importacao lote ${loteId}`
    });

    let ordem = 0;
    for (const link of rascunho.grupo.fotoLinks) {
      await itemService.addFoto(prisma, brechoId, item.id, {
        url: link.foto.url,
        ordem,
        loteId: loteFotos.id
      });
      ordem++;
    }

    if (rascunho.draftAnalysisId) {
      await itemService.submitDraftFeedback(prisma, brechoId, rascunho.draftAnalysisId, {
        helpfulness: payload.helpfulness,
        itemId: item.id,
        reasonCodes: payload.reasonCodes as
          | (
              | "COR_ERRADA"
              | "SUBCATEGORIA_ERRADA"
              | "NOME_RUIM"
              | "CATEGORIA_ERRADA"
              | "CONDICAO_ERRADA"
              | "ESTAMPA_ERRADA"
              | "OUTRO"
            )[]
          | undefined,
        finalValues: {
          nome: fv.nome,
          categoria: fv.categoria,
          subcategoria: fv.subcategoria,
          cor: fv.cor,
          estampa: fv.estampa,
          condicao: fv.condicao,
          tamanho: fv.tamanho,
          marca: fv.marca,
          precoVenda: fv.precoVenda,
          acervoTipo: fv.acervoTipo,
          acervoNome: fv.acervoNome
        }
      });
    }

    await prisma.importacaoRascunho.update({
      where: { id: rascunhoId },
      data: {
        status: ImportacaoRascunhoStatus.PUBLICADO,
        pecaId: item.id
      }
    });

    const remaining = await prisma.importacaoRascunho.count({
      where: {
        grupo: { loteId },
        status: { not: ImportacaoRascunhoStatus.PUBLICADO }
      }
    });
    if (remaining === 0) {
      await prisma.importacaoLote.update({
        where: { id: loteId },
        data: { status: ImportacaoLoteStatus.CONCLUIDO }
      });
    }

    return { itemId: item.id };
  }
};
