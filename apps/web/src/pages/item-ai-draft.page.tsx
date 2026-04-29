import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  addItemFoto,
  analisarFotoRascunho,
  createFotoLote,
  createItem,
  enviarFeedbackRascunho,
  listAcervoSuggestions,
  presignFotoLoteUpload,
  putToPresignedUrl
} from "../api/items";
import { ApiError } from "../api/client";
import { AppShell, Button, Field, Input, Section, Select } from "../components/ui";
import { resizeImageToJpeg } from "../lib/imageResize";
import { useSessionStore } from "../store/session.store";
import { useItemAIDraftStore } from "../store/item-ai-draft.store";

const reasonCodeOptions = [
  { code: "COR_ERRADA", label: "Cor errada" },
  { code: "SUBCATEGORIA_ERRADA", label: "Subcategoria errada" },
  { code: "NOME_RUIM", label: "Nome ruim" },
  { code: "CATEGORIA_ERRADA", label: "Categoria errada" },
  { code: "CONDICAO_ERRADA", label: "Condição errada" },
  { code: "ESTAMPA_ERRADA", label: "Estampa errada" },
  { code: "OUTRO", label: "Outro" }
] as const;

type ReasonCode = (typeof reasonCodeOptions)[number]["code"];

const toDataUrl = async (blob: Blob): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const value = reader.result;
      if (typeof value !== "string") {
        reject(new Error("Falha ao ler a imagem."));
        return;
      }
      resolve(value);
    };
    reader.onerror = () => reject(new Error("Falha ao ler a imagem."));
    reader.readAsDataURL(blob);
  });
};

const parseDataUrl = (
  dataUrl: string
): {
  mime: "image/jpeg" | "image/png";
  base64: string;
} => {
  const match = dataUrl.match(/^data:(image\/(?:jpeg|png));base64,(.+)$/);
  if (!match) {
    throw new Error("Formato de imagem inválido para análise.");
  }
  const mime = match[1];
  const base64 = match[2];
  if (!mime || !base64) {
    throw new Error("Formato de imagem inválido para análise.");
  }
  return {
    mime: mime as "image/jpeg" | "image/png",
    base64
  };
};

const MAX_DRAFT_ANALYZE_BYTES = 32 * 1024 * 1024;

export const ItemAIDraftPage = () => {
  const brechoId = useSessionStore((state) => state.brechoId);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const initializedRef = useRef(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [completedItemId, setCompletedItemId] = useState<string | null>(null);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [flashOn, setFlashOn] = useState(false);
  const [flashSupported, setFlashSupported] = useState(true);
  const [needsVideoActivation, setNeedsVideoActivation] = useState(false);
  const [previewUnavailable, setPreviewUnavailable] = useState(false);
  const [feedbackChoice, setFeedbackChoice] = useState<"SIM" | "PARCIAL" | "NAO" | null>(null);
  const [feedbackReasons, setFeedbackReasons] = useState<ReasonCode[]>([]);
  const [pendingFeedback, setPendingFeedback] = useState<{
    analysisId: string;
    itemId: string;
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
  } | null>(null);

  const {
    images,
    textoContexto,
    analysis,
    draftAnalysisId,
    formValues,
    addImageDataUrl,
    removeImageAt,
    clearImages,
    setTextoContexto,
    setFormField,
    applyAnalysis,
    resetDraft
  } = useItemAIDraftStore();

  const acervoSuggestionsQuery = useQuery({
    queryKey: ["acervo-suggestions", brechoId, formValues.acervoTipo, formValues.acervoNome],
    queryFn: () =>
      listAcervoSuggestions(brechoId, {
        q: formValues.acervoNome.trim() || undefined,
        acervoTipo: formValues.acervoTipo,
        limit: 8
      })
  });

  const stopStream = useCallback(() => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }, []);

  const playVideoElement = useCallback(async () => {
    const video = videoRef.current;
    if (!video) {
      return;
    }
    try {
      await video.play();
      setNeedsVideoActivation(false);
      setActionError(null);
      return;
    } catch {
      // Alguns navegadores (especialmente iOS/PWA) exigem gesto do usuário.
    }
    await new Promise<void>((resolve) => {
      const onReady = () => {
        video.removeEventListener("loadedmetadata", onReady);
        video.removeEventListener("canplay", onReady);
        resolve();
      };
      video.addEventListener("loadedmetadata", onReady);
      video.addEventListener("canplay", onReady);
      window.setTimeout(onReady, 900);
    });
    try {
      await video.play();
      setNeedsVideoActivation(false);
      setActionError(null);
    } catch {
      setNeedsVideoActivation(true);
    }
  }, []);

  const getCameraStream = useCallback(async (): Promise<MediaStream> => {
    const attempts: MediaStreamConstraints[] = [
      { video: { facingMode: { ideal: "environment" } }, audio: false },
      { video: { facingMode: "environment" }, audio: false },
      { video: true, audio: false }
    ];
    let lastError: unknown = null;
    for (const constraints of attempts) {
      try {
        return await navigator.mediaDevices.getUserMedia(constraints);
      } catch (error) {
        lastError = error;
      }
    }
    throw lastError ?? new Error("Falha ao acessar câmera.");
  }, []);

  const startCamera = useCallback(async () => {
    setActionError(null);
    setPreviewUnavailable(false);
    setNeedsVideoActivation(false);
    stopStream();
    if (!navigator.mediaDevices?.getUserMedia) {
      setActionError("Câmera indisponível neste navegador. Use a galeria.");
      return;
    }
    try {
      const stream = await getCameraStream();
      streamRef.current = stream;
      setCameraOpen(true);
      if (videoRef.current) {
        const video = videoRef.current;
        video.srcObject = stream;
        video.muted = true;
        video.autoplay = true;
        video.playsInline = true;
        video.setAttribute("playsinline", "true");
        video.setAttribute("webkit-playsinline", "true");
        await playVideoElement();
        window.setTimeout(() => {
          const activeVideo = videoRef.current;
          if (!activeVideo || !streamRef.current) {
            return;
          }
          if (activeVideo.videoWidth === 0 || activeVideo.readyState < 2) {
            setPreviewUnavailable(true);
            setNeedsVideoActivation(false);
            setActionError("Preview indisponível neste navegador. Use a câmera nativa.");
          }
        }, 1400);
      }
      const track = stream.getVideoTracks()[0];
      const caps = (track?.getCapabilities?.() ?? {}) as { torch?: boolean };
      setFlashSupported(Boolean(caps.torch));
      setFlashOn(false);
    } catch {
      setActionError("Não foi possível acessar a câmera. Verifique permissões ou use a galeria.");
      setPreviewUnavailable(true);
    }
  }, [getCameraStream, playVideoElement, stopStream]);

  useEffect(() => {
    if (initializedRef.current) {
      return;
    }
    initializedRef.current = true;
    resetDraft();
    void startCamera();
  }, [resetDraft, startCamera]);

  useEffect(() => {
    return () => {
      stopStream();
    };
  }, [stopStream]);

  useEffect(() => {
    if (!cameraOpen || !streamRef.current) {
      return;
    }
    const track = streamRef.current.getVideoTracks()[0];
    if (!track) {
      return;
    }
    const caps = (track.getCapabilities?.() ?? {}) as { torch?: boolean };
    if (!caps.torch) {
      setFlashSupported(false);
      return;
    }
    track
      .applyConstraints({
        // @ts-expect-error torch não está em todos os typings
        advanced: [{ torch: flashOn }]
      })
      .catch(() => {
        setFlashSupported(false);
      });
  }, [cameraOpen, flashOn]);

  const closeCamera = () => {
    stopStream();
    setCameraOpen(false);
    setNeedsVideoActivation(false);
    setPreviewUnavailable(false);
  };

  const activateVideoPreview = async () => {
    try {
      await playVideoElement();
    } catch {
      setActionError("Não foi possível iniciar o preview da câmera. Tente fechar e abrir novamente.");
    }
  };

  const openNativeCameraCapture = () => {
    cameraInputRef.current?.click();
  };

  const handleImagePicked = async (fileList: FileList | null) => {
    if (!fileList?.length) {
      return;
    }
    try {
      const files = Array.from(fileList);
      for (const file of files) {
        const jpeg = await resizeImageToJpeg(file);
        const dataUrl = await toDataUrl(jpeg);
        addImageDataUrl(dataUrl);
      }
      setActionError(null);
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "Não foi possível preparar a imagem.");
    }
  };

  const captureFromVideo = async () => {
    const video = videoRef.current;
    if (!video) {
      return;
    }
    const width = video.videoWidth;
    const height = video.videoHeight;
    if (!width || !height) {
      setActionError("Aguarde a câmera carregar para capturar.");
      return;
    }
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      setActionError("Falha ao preparar captura.");
      return;
    }
    ctx.drawImage(video, 0, 0, width, height);
    const raw = await new Promise<Blob | null>((resolve) => canvas.toBlob((blob) => resolve(blob), "image/jpeg", 0.92));
    if (!raw) {
      setActionError("Falha ao capturar imagem.");
      return;
    }
    try {
      const jpeg = await resizeImageToJpeg(raw);
      const dataUrl = await toDataUrl(jpeg);
      addImageDataUrl(dataUrl);
      setActionError(null);
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "Não foi possível preparar a imagem capturada.");
    }
  };

  const analyzeMutation = useMutation({
    mutationFn: async () => {
      if (images.length === 0) {
        throw new Error("Selecione ao menos 1 foto para analisar.");
      }
      const parsedImages = images.map((imageDataUrl) => parseDataUrl(imageDataUrl));
      const totalBytes = parsedImages.reduce(
        (sum, image) => sum + Math.floor((image.base64.length * 3) / 4),
        0
      );
      if (totalBytes > MAX_DRAFT_ANALYZE_BYTES) {
        throw new Error(
          "As fotos selecionadas estão muito pesadas para análise em lote. Remova algumas ou use imagens menores."
        );
      }
      return analisarFotoRascunho(brechoId, {
        images: parsedImages.map((image) => ({
          imageBase64: image.base64,
          imageMime: image.mime
        })),
        textoNota: textoContexto.trim() || undefined
      });
    },
    onSuccess: (result) => {
      applyAnalysis(result);
      setActionError(null);
    },
    onError: (error) => {
      setActionError(error instanceof ApiError ? error.message : "Não foi possível analisar a foto.");
    }
  });

  const requiredMissing = [
    images.length === 0 ? "foto" : null,
    !formValues.nome.trim() ? "nome" : null,
    !formValues.categoria ? "categoria" : null,
    !formValues.cor.trim() ? "cor" : null,
    !formValues.condicao ? "condição" : null,
    !formValues.tamanho.trim() ? "tamanho" : null
  ].filter(Boolean);

  const submitMutation = useMutation({
    mutationFn: async () => {
      if (requiredMissing.length > 0 || images.length === 0) {
        throw new Error(`Complete os campos obrigatórios: ${requiredMissing.join(", ")}.`);
      }

      const finalValues = {
        nome: formValues.nome.trim(),
        categoria: formValues.categoria,
        subcategoria: formValues.subcategoria.trim() || "sem_subcategoria",
        cor: formValues.cor.trim(),
        estampa: formValues.estampa,
        condicao: formValues.condicao,
        tamanho: formValues.tamanho.trim(),
        marca: formValues.marca.trim() || undefined,
        precoVenda: formValues.precoVenda.trim()
          ? Number(formValues.precoVenda.replace(",", "."))
          : undefined,
        acervoTipo: formValues.acervoTipo,
        acervoNome: formValues.acervoNome.trim() || undefined
      };

      const created = await createItem(brechoId, {
        ...finalValues
      });

      const lote = await createFotoLote(brechoId, created.id, {
        textoNota: textoContexto.trim() || undefined
      });
      let index = 0;
      for (const imageDataUrl of images) {
        const imageBlob = await (await fetch(imageDataUrl)).blob();
        const signed = await presignFotoLoteUpload(brechoId, created.id, lote.id, {
          tipo: "imagem",
          contentType: "image/jpeg",
          extensao: "jpeg",
          tamanhoBytes: imageBlob.size
        });
        await putToPresignedUrl(signed.uploadUrl, imageBlob, "image/jpeg");
        await addItemFoto(brechoId, created.id, { url: signed.publicUrl, loteId: lote.id, ordem: index });
        index += 1;
      }

      await queryClient.invalidateQueries({ queryKey: ["items", brechoId] });
      await queryClient.invalidateQueries({ queryKey: ["item", brechoId, created.id] });

      return {
        itemId: created.id,
        finalValues
      };
    },
    onSuccess: ({ itemId, finalValues }) => {
      setActionError(null);
      if (draftAnalysisId) {
        setPendingFeedback({
          analysisId: draftAnalysisId,
          itemId,
          finalValues
        });
        return;
      }
      setPendingFeedback(null);
      setFeedbackChoice(null);
      setFeedbackReasons([]);
      resetDraft();
      void queryClient.removeQueries({ queryKey: ["item", brechoId, itemId] });
      setCompletedItemId(itemId);
    },
    onError: (error) => {
      setActionError(error instanceof ApiError ? error.message : String(error));
    }
  });

  const feedbackMutation = useMutation({
    mutationFn: (input: { helpfulness: "SIM" | "PARCIAL" | "NAO"; reasonCodes?: ReasonCode[] }) => {
      if (!pendingFeedback) {
        throw new Error("Feedback indisponível.");
      }
      return enviarFeedbackRascunho(brechoId, pendingFeedback.analysisId, {
        helpfulness: input.helpfulness,
        reasonCodes: input.reasonCodes,
        itemId: pendingFeedback.itemId,
        finalValues: pendingFeedback.finalValues
      });
    },
    onSuccess: () => {
      if (!pendingFeedback) {
        return;
      }
      const itemId = pendingFeedback.itemId;
      setPendingFeedback(null);
      setFeedbackChoice(null);
      setFeedbackReasons([]);
      resetDraft();
      void queryClient.removeQueries({ queryKey: ["item", brechoId, itemId] });
      setCompletedItemId(itemId);
    },
    onError: (error) => {
      setActionError(error instanceof ApiError ? error.message : "Não foi possível salvar o feedback.");
    }
  });

  const confidenceLabel = (value: number) => {
    if (value >= 0.8) {
      return "alta";
    }
    if (value >= 0.6) {
      return "média";
    }
    return "baixa";
  };

  const toggleReason = (reason: ReasonCode) => {
    setFeedbackReasons((current) =>
      current.includes(reason) ? current.filter((code) => code !== reason) : [...current, reason]
    );
  };

  const submitStructuredFeedback = (helpfulness: "PARCIAL" | "NAO") => {
    feedbackMutation.mutate({
      helpfulness,
      reasonCodes: feedbackReasons
    });
  };

  const goToItemDetail = () => {
    if (!completedItemId) {
      return;
    }
    navigate(`/items/${completedItemId}`);
  };

  const startAnother = () => {
    setCompletedItemId(null);
    setActionError(null);
    setFeedbackChoice(null);
    setFeedbackReasons([]);
    setPendingFeedback(null);
    resetDraft();
  };

  if (completedItemId) {
    return (
      <AppShell>
        <Link to="/">← Voltar ao estoque</Link>
        <Link to="/items/new/manual">Usar cadastro manual</Link>
        <Section title="Cadastro concluído">
          <p style={{ margin: 0, opacity: 0.9 }}>
            Peça cadastrada com sucesso. O rascunho foi limpo para o próximo cadastro.
          </p>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <Button type="button" onClick={startAnother}>
              Cadastrar outra
            </Button>
            <Button type="button" onClick={goToItemDetail}>
              Ver peça
            </Button>
          </div>
        </Section>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <Link to="/">← Voltar ao estoque</Link>
      <Link to="/items/new/manual">Prefere sem IA? Ir para cadastro manual</Link>

      <header>
        <h1 style={{ marginBottom: 4 }}>Cadastrar com IA</h1>
        <p style={{ marginTop: 0, opacity: 0.85 }}>
          Envie uma foto, opcionalmente descreva o contexto, revise os campos e conclua.
        </p>
      </header>

      {actionError && (
        <p style={{ color: "#b60e3d", fontSize: 14 }} role="alert">
          {actionError}
        </p>
      )}

      {pendingFeedback && (
        <Section title="3. A sugestão da IA ajudou?">
          <p style={{ margin: 0, opacity: 0.9 }}>
            Seu toque ajuda o app a aprender com as correções reais do cadastro.
          </p>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <Button
              type="button"
              disabled={feedbackMutation.isPending}
              onClick={() => feedbackMutation.mutate({ helpfulness: "SIM" })}
            >
              Sim
            </Button>
            <Button
              type="button"
              disabled={feedbackMutation.isPending}
              onClick={() => setFeedbackChoice("PARCIAL")}
            >
              Parcial
            </Button>
            <Button type="button" disabled={feedbackMutation.isPending} onClick={() => setFeedbackChoice("NAO")}>
              Não
            </Button>
          </div>
          {(feedbackChoice === "PARCIAL" || feedbackChoice === "NAO") && (
            <div className="stack" style={{ gap: 8 }}>
              <p style={{ margin: "4px 0 0", fontSize: 14, opacity: 0.9 }}>
                O que ficou ruim? (opcional)
              </p>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {reasonCodeOptions.map((option) => (
                  <button
                    key={option.code}
                    type="button"
                    onClick={() => toggleReason(option.code)}
                    style={{
                      border: `1px solid ${feedbackReasons.includes(option.code) ? "#b60e3d" : "#d9b9bc"}`,
                      background: feedbackReasons.includes(option.code) ? "#fdf1f4" : "#fff",
                      color: "#3d2228",
                      borderRadius: 999,
                      padding: "6px 12px",
                      cursor: "pointer"
                    }}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <Button
                  type="button"
                  disabled={feedbackMutation.isPending}
                  onClick={() => submitStructuredFeedback(feedbackChoice)}
                >
                  Enviar feedback
                </Button>
                <Button
                  type="button"
                  disabled={feedbackMutation.isPending}
                  onClick={() => {
                    setFeedbackChoice(null);
                    setFeedbackReasons([]);
                  }}
                >
                  Cancelar
                </Button>
              </div>
            </div>
          )}
        </Section>
      )}

      <Section title="1. Foto e contexto">
        <div className="stack" style={{ gap: 10 }}>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <Button type="button" onClick={() => void startCamera()}>
              Abrir câmera
            </Button>
            <Button type="button" onClick={() => galleryInputRef.current?.click()}>
              Escolher da galeria
            </Button>
            {images.length > 0 && (
              <Button type="button" onClick={clearImages} disabled={analyzeMutation.isPending || submitMutation.isPending}>
                Limpar fotos
              </Button>
            )}
          </div>
          <input
            ref={cameraInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            hidden
            onChange={(event) => {
              void handleImagePicked(event.target.files);
              event.target.value = "";
            }}
          />
          <input
            ref={galleryInputRef}
            type="file"
            accept="image/*"
            multiple
            hidden
            onChange={(event) => {
              void handleImagePicked(event.target.files);
              event.target.value = "";
            }}
          />
          {images.length > 0 ? (
            <div className="stack" style={{ gap: 8 }}>
              <p style={{ margin: 0, fontSize: 13, opacity: 0.85 }}>Fotos selecionadas: {images.length}</p>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 8 }}>
                {images.map((imageDataUrl, index) => (
                  <div key={imageDataUrl + index} style={{ position: "relative" }}>
                    <img
                      src={imageDataUrl}
                      alt={`Foto ${index + 1}`}
                      style={{ width: "100%", height: 150, objectFit: "cover", borderRadius: 10, border: "1px solid #e7d5d6" }}
                    />
                    <button
                      type="button"
                      onClick={() => removeImageAt(index)}
                      style={{
                        position: "absolute",
                        top: 6,
                        right: 6,
                        border: 0,
                        borderRadius: 999,
                        width: 30,
                        height: 30,
                        cursor: "pointer",
                        background: "rgba(0,0,0,0.65)",
                        color: "#fff"
                      }}
                      aria-label={`Remover foto ${index + 1}`}
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <p style={{ opacity: 0.8, margin: 0 }}>Nenhuma foto selecionada ainda.</p>
          )}
          <Field label="Contexto em texto (opcional)">
            <textarea
              value={textoContexto}
              onChange={(event) => setTextoContexto(event.target.value)}
              rows={3}
              style={{
                width: "100%",
                border: "1px solid #d9b9bc",
                borderRadius: 10,
                padding: 12,
                fontFamily: "inherit",
                fontSize: 15
              }}
              placeholder="Ex.: vestido com brilho, costas com zíper e caimento reto..."
            />
          </Field>
          <Button type="button" onClick={() => analyzeMutation.mutate()} disabled={images.length === 0 || analyzeMutation.isPending}>
            {analyzeMutation.isPending ? "Analisando..." : "Sugerir com IA"}
          </Button>
        </div>
      </Section>

      <Section title="2. Revisão rápida dos dados">
        {analysis && (
          <div
            style={{
              fontSize: 13,
              padding: 12,
              background: "#f0f7f2",
              borderRadius: 10,
              border: "1px solid #c5e0cc",
              marginBottom: 10
            }}
          >
            <strong style={{ display: "block", marginBottom: 6 }}>Sugestões da IA aplicadas automaticamente</strong>
            <p style={{ margin: 0 }}>
              Confiança: {Math.round(analysis.meta.confianca * 100)}% · Ambiente: {analysis.meta.ambienteFoto ?? "—"} ·
              Qualidade: {analysis.meta.qualidadeFoto ?? "—"}
            </p>
            <p style={{ margin: "6px 0 0", fontSize: 12, opacity: 0.85 }}>
              Campos (confiança): nome {confidenceLabel(analysis.fieldConfidence.nome)} · categoria{" "}
              {confidenceLabel(analysis.fieldConfidence.categoria)} · subcategoria{" "}
              {confidenceLabel(analysis.fieldConfidence.subcategoria)} · cor{" "}
              {confidenceLabel(analysis.fieldConfidence.cor)} · condição{" "}
              {confidenceLabel(analysis.fieldConfidence.condicao)}
            </p>
            {analysis.warnings.lowConfidence && (
              <p style={{ color: "#7a5a00", margin: "8px 0 0", fontWeight: 600 }}>
                Confiança baixa — revise os campos manualmente.
              </p>
            )}
            {analysis.warnings.multiplasPecas && (
              <p style={{ color: "#7a5a00", margin: "8px 0 0", fontWeight: 600 }}>
                Vários itens detectados — resultado pode ser impreciso.
              </p>
            )}
          </div>
        )}

        <div className="grid cols-2">
          <Field label="Nome">
            <Input value={formValues.nome} onChange={(event) => setFormField("nome", event.target.value)} />
            {analysis && (
              <small style={{ opacity: 0.75 }}>
                Origem: {analysis.fallbacksApplied.nome === "fallback" ? "fallback" : "modelo"} · confiança{" "}
                {Math.round(analysis.fieldConfidence.nome * 100)}%
              </small>
            )}
          </Field>
          <Field label="Categoria">
            <Select
              value={formValues.categoria}
              onChange={(event) => setFormField("categoria", event.target.value as typeof formValues.categoria)}
            >
              <option value="ROUPA_FEMININA">Roupa feminina</option>
              <option value="ROUPA_MASCULINA">Roupa masculina</option>
              <option value="CALCADO">Calçado</option>
              <option value="ACESSORIO">Acessório</option>
            </Select>
          </Field>
          <Field label="Subcategoria">
            <Input
              value={formValues.subcategoria}
              onChange={(event) => setFormField("subcategoria", event.target.value)}
              placeholder="Ex.: vestido, saia, tênis..."
            />
            {analysis && (
              <small style={{ opacity: 0.75 }}>
                Origem: {analysis.fallbacksApplied.subcategoria === "fallback" ? "fallback" : "modelo"} · confiança{" "}
                {Math.round(analysis.fieldConfidence.subcategoria * 100)}%
              </small>
            )}
          </Field>
          <Field label="Cor">
            <Input value={formValues.cor} onChange={(event) => setFormField("cor", event.target.value)} />
            {analysis && (
              <small style={{ opacity: 0.75 }}>
                Origem: {analysis.fallbacksApplied.cor === "fallback" ? "fallback" : "modelo"} · confiança{" "}
                {Math.round(analysis.fieldConfidence.cor * 100)}%
              </small>
            )}
          </Field>
          <Field label="Condição">
            <Select
              value={formValues.condicao}
              onChange={(event) => setFormField("condicao", event.target.value as typeof formValues.condicao)}
            >
              <option value="OTIMO">Ótimo</option>
              <option value="BOM">Bom</option>
              <option value="REGULAR">Regular</option>
            </Select>
          </Field>
          <Field label="Tamanho">
            <Input value={formValues.tamanho} onChange={(event) => setFormField("tamanho", event.target.value)} />
          </Field>
          <Field label="Marca">
            <Input value={formValues.marca} onChange={(event) => setFormField("marca", event.target.value)} />
          </Field>
          <Field label="Preço venda">
            <Input
              type="number"
              step="0.01"
              value={formValues.precoVenda}
              onChange={(event) => setFormField("precoVenda", event.target.value)}
            />
          </Field>
          <Field label="Acervo">
            <Select
              value={formValues.acervoTipo}
              onChange={(event) => setFormField("acervoTipo", event.target.value as typeof formValues.acervoTipo)}
            >
              <option value="PROPRIO">Próprio</option>
              <option value="CONSIGNACAO">Consignação</option>
            </Select>
          </Field>
          <Field label="Nome do acervo">
            <Input
              list="acervo-suggestions-ai-draft"
              value={formValues.acervoNome}
              onChange={(event) => setFormField("acervoNome", event.target.value)}
            />
            <datalist id="acervo-suggestions-ai-draft">
              {acervoSuggestionsQuery.data?.map((suggestion) => (
                <option key={suggestion} value={suggestion} />
              ))}
            </datalist>
          </Field>
          <Field label="Tem estampa?">
            <input
              type="checkbox"
              checked={formValues.estampa}
              onChange={(event) => setFormField("estampa", event.target.checked)}
            />
          </Field>
        </div>

        <div className="stack" style={{ marginTop: 12, gap: 8 }}>
          <Button
            type="button"
            onClick={() => submitMutation.mutate()}
            disabled={requiredMissing.length > 0 || submitMutation.isPending}
          >
            {submitMutation.isPending ? "Concluindo cadastro..." : "Concluir cadastro"}
          </Button>
          {requiredMissing.length > 0 && (
            <small style={{ color: "#8b2f2f" }}>
              Obrigatórios pendentes: {requiredMissing.join(", ")}.
            </small>
          )}
        </div>
      </Section>

      {cameraOpen && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 50,
            background: "#000",
            display: "flex",
            flexDirection: "column"
          }}
        >
          <header
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              padding: "12px 16px",
              color: "#fff",
              gap: 12
            }}
          >
            <button
              type="button"
              onClick={closeCamera}
              style={{
                background: "rgba(255,255,255,0.15)",
                border: 0,
                color: "#fff",
                borderRadius: 999,
                width: 44,
                height: 44,
                cursor: "pointer"
              }}
              aria-label="Fechar câmera"
            >
              ✕
            </button>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
              <span style={{ fontWeight: 600 }}>Capturar fotos com IA</span>
              <small style={{ opacity: 0.85 }}>{images.length} fotos selecionadas</small>
            </div>
            <button
              type="button"
              disabled={!flashSupported}
              title={flashSupported ? "Alternar flash" : "Flash não disponível neste aparelho ou navegador."}
              onClick={() => setFlashOn((value) => !value)}
              style={{
                background: flashOn ? "#b60e3d" : "rgba(255,255,255,0.15)",
                border: 0,
                color: "#fff",
                borderRadius: 999,
                width: 44,
                height: 44,
                cursor: flashSupported ? "pointer" : "not-allowed",
                opacity: flashSupported ? 1 : 0.4
              }}
              aria-label="Alternar flash"
            >
              ⚡
            </button>
          </header>
          <div style={{ padding: "0 16px 12px" }}>
            <Link to="/items/new/manual" style={{ color: "#fff", textDecoration: "underline", fontSize: 14 }}>
              Prefere sem IA? Ir para cadastro manual
            </Link>
            {needsVideoActivation && (
              <div style={{ marginTop: 10 }}>
                <Button type="button" onClick={() => void activateVideoPreview()}>
                  Toque para ativar câmera
                </Button>
              </div>
            )}
            {previewUnavailable && (
              <div style={{ marginTop: 10 }}>
                <Button type="button" onClick={openNativeCameraCapture}>
                  Usar câmera nativa
                </Button>
              </div>
            )}
          </div>
          <div style={{ position: "relative", flex: 1, overflow: "hidden" }}>
            <video ref={videoRef} playsInline muted style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            <div
              style={{
                position: "absolute",
                inset: 0,
                pointerEvents: "none",
                display: "flex",
                alignItems: "center",
                justifyContent: "center"
              }}
            >
              <div
                style={{
                  width: "72vmin",
                  height: "72vmin",
                  maxWidth: 320,
                  maxHeight: 320,
                  border: "1px solid rgba(255,255,255,0.25)",
                  borderRadius: "2rem"
                }}
              />
            </div>
          </div>
          <footer
            style={{
              padding: "24px 32px 36px",
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              gap: 48,
              background: "linear-gradient(transparent, rgba(0,0,0,0.85))"
            }}
          >
            <button
              type="button"
              onClick={() => galleryInputRef.current?.click()}
              style={{
                background: "rgba(255,255,255,0.12)",
                border: "1px solid rgba(255,255,255,0.25)",
                color: "#fff",
                borderRadius: 999,
                width: 56,
                height: 56,
                cursor: "pointer"
              }}
              title="Galeria"
              aria-label="Escolher foto da galeria"
            >
              🖼
            </button>
            <button
              type="button"
              onClick={() => (previewUnavailable ? openNativeCameraCapture() : void captureFromVideo())}
              style={{
                width: 76,
                height: 76,
                borderRadius: "50%",
                border: "3px solid #fff",
                background: "radial-gradient(circle, #b60e3d 62%, transparent 63%)",
                cursor: "pointer"
              }}
              aria-label={previewUnavailable ? "Abrir câmera nativa" : "Capturar foto"}
            />
          </footer>
        </div>
      )}
    </AppShell>
  );
};
