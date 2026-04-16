import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  addItemFoto,
  analisarItemFoto,
  createFotoLote,
  getItem,
  patchFotoLote,
  presignFotoLoteUpload,
  putToPresignedUrl,
  transcribeFotoLote
} from "../api/items";
import { ApiError } from "../api/client";
import { FotoAiSuggestionsCard } from "../components/foto-ai-suggestions";
import { resizeImageToJpeg } from "../lib/imageResize";
import { useSessionStore } from "../store/session.store";
import { AppShell, Button, Field, Input, Section } from "../components/ui";

const pickAudioMime = (): string => {
  if (MediaRecorder.isTypeSupported("audio/webm;codecs=opus")) {
    return "audio/webm;codecs=opus";
  }
  if (MediaRecorder.isTypeSupported("audio/webm")) {
    return "audio/webm";
  }
  return "audio/mp4";
};

export const ItemFotoUploadPage = () => {
  const { itemId } = useParams<{ itemId: string }>();
  const brechoId = useSessionStore((s) => s.brechoId);
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [loteId, setLoteId] = useState<string | null>(null);
  const [textoNota, setTextoNota] = useState("");
  const [cameraOpen, setCameraOpen] = useState(false);
  const [flashOn, setFlashOn] = useState(false);
  const [flashSupported, setFlashSupported] = useState(true);
  const [recording, setRecording] = useState(false);
  const [recordError, setRecordError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const galleryInputRef = useRef<HTMLInputElement>(null);

  const itemQuery = useQuery({
    queryKey: ["item", brechoId, itemId],
    queryFn: () => getItem(brechoId, itemId!),
    enabled: Boolean(itemId)
  });

  const fotoCount = itemQuery.data?.fotos?.length ?? 0;
  const remaining = Math.max(0, 5 - fotoCount);

  const createLoteMutation = useMutation({
    mutationFn: () => createFotoLote(brechoId, itemId!, { textoNota: textoNota.trim() || undefined }),
    onSuccess: (lote) => {
      setLoteId(lote.id);
      setActionError(null);
    },
    onError: (e) => {
      setActionError(e instanceof ApiError ? e.message : "Não foi possível iniciar o lote.");
    }
  });

  const saveTextoMutation = useMutation({
    mutationFn: () => patchFotoLote(brechoId, itemId!, loteId!, { textoNota: textoNota }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["item", brechoId, itemId] });
      setActionError(null);
    },
    onError: (e) => {
      setActionError(e instanceof ApiError ? e.message : "Não foi possível salvar o texto.");
    }
  });

  const transcribeMutation = useMutation({
    mutationFn: () => transcribeFotoLote(brechoId, itemId!, loteId!),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["item", brechoId, itemId] });
      setActionError(null);
    },
    onError: (e) => {
      setActionError(e instanceof ApiError ? e.message : "Transcrição indisponível.");
    }
  });

  const analyzeMutation = useMutation({
    mutationFn: (fotoId: string) => analisarItemFoto(brechoId, itemId!, fotoId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["item", brechoId, itemId] });
      setActionError(null);
    },
    onError: (e) => {
      setActionError(e instanceof ApiError ? e.message : "Análise de foto indisponível.");
    }
  });

  const stopStream = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }, []);

  const startCamera = useCallback(async () => {
    setActionError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: "environment" } },
        audio: false
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setCameraOpen(true);
    } catch {
      setActionError("Não foi possível acessar a câmera. Verifique permissões.");
    }
  }, []);

  useEffect(() => {
    if (!cameraOpen || !streamRef.current) {
      return;
    }
    const track = streamRef.current.getVideoTracks()[0];
    if (!track) {
      return;
    }
    try {
      void track.applyConstraints({
        // @ts-expect-error torch não está em todos os typings
        advanced: [{ torch: flashOn }]
      });
    } catch {
      setFlashSupported(false);
    }
  }, [flashOn, cameraOpen]);

  useEffect(() => {
    return () => {
      stopStream();
    };
  }, [stopStream]);

  const closeCamera = () => {
    stopStream();
    setCameraOpen(false);
  };

  const uploadJpegForLote = async (jpeg: Blob) => {
    if (!itemId || !loteId) {
      return;
    }
    const signed = await presignFotoLoteUpload(brechoId, itemId, loteId, {
      tipo: "imagem",
      contentType: "image/jpeg",
      extensao: "jpeg",
      tamanhoBytes: jpeg.size
    });
    await putToPresignedUrl(signed.uploadUrl, jpeg, "image/jpeg");
    await addItemFoto(brechoId, itemId, { url: signed.publicUrl, loteId });
    await queryClient.invalidateQueries({ queryKey: ["item", brechoId, itemId] });
  };

  const captureFromVideo = async () => {
    const video = videoRef.current;
    if (!video || !itemId || !loteId) {
      return;
    }
    const w = video.videoWidth;
    const h = video.videoHeight;
    if (!w || !h) {
      setActionError("Aguarde o vídeo carregar.");
      return;
    }
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      return;
    }
    ctx.drawImage(video, 0, 0, w, h);
    const raw = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob((b) => resolve(b), "image/jpeg", 0.92)
    );
    if (!raw) {
      setActionError("Falha ao capturar imagem.");
      return;
    }
    const jpeg = await resizeImageToJpeg(raw);
    try {
      await uploadJpegForLote(jpeg);
      setActionError(null);
    } catch (e) {
      setActionError(e instanceof ApiError ? e.message : String(e));
    }
  };

  const onGalleryChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files?.length || !itemId || !loteId) {
      return;
    }
    setActionError(null);
    let n = itemQuery.data?.fotos?.length ?? 0;
    try {
      for (const file of Array.from(files)) {
        if (n >= 5) {
          break;
        }
        const jpeg = await resizeImageToJpeg(file);
        const signed = await presignFotoLoteUpload(brechoId, itemId, loteId, {
          tipo: "imagem",
          contentType: "image/jpeg",
          extensao: "jpeg",
          tamanhoBytes: jpeg.size
        });
        await putToPresignedUrl(signed.uploadUrl, jpeg, "image/jpeg");
        await addItemFoto(brechoId, itemId, { url: signed.publicUrl, loteId });
        n += 1;
      }
      await queryClient.invalidateQueries({ queryKey: ["item", brechoId, itemId] });
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : String(err));
    }
    e.target.value = "";
  };

  const startRecording = () => {
    if (!loteId || !itemId) {
      return;
    }
    setRecordError(null);
    chunksRef.current = [];
    const mime = pickAudioMime();
    navigator.mediaDevices
      .getUserMedia({ audio: true })
      .then((stream) => {
        let mr: MediaRecorder;
        try {
          mr = new MediaRecorder(stream, { mimeType: mime });
        } catch {
          mr = new MediaRecorder(stream);
        }
        recorderRef.current = mr;
        mr.ondataavailable = (ev) => {
          if (ev.data.size > 0) {
            chunksRef.current.push(ev.data);
          }
        };
        mr.onstop = () => {
          stream.getTracks().forEach((t) => t.stop());
        };
        mr.start();
        setRecording(true);
      })
      .catch(() => setRecordError("Permissão de microfone negada ou indisponível."));
  };

  const stopRecordingAndUpload = async () => {
    const mr = recorderRef.current;
    if (!mr || !loteId || !itemId) {
      return;
    }
    setRecording(false);
    mr.stop();
    await new Promise<void>((r) => {
      mr.addEventListener("stop", () => r(), { once: true });
    });
    const blob = new Blob(chunksRef.current, { type: mr.mimeType || "audio/webm" });
    recorderRef.current = null;
    if (blob.size < 10) {
      setRecordError("Gravação muito curta.");
      return;
    }
    const ext = blob.type.includes("mp4") ? "mp4" : "webm";
    const contentType = blob.type || (ext === "mp4" ? "audio/mp4" : "audio/webm");
    try {
      const signed = await presignFotoLoteUpload(brechoId, itemId, loteId, {
        tipo: "audio",
        contentType,
        extensao: ext === "mp4" ? "mp4" : "webm",
        tamanhoBytes: blob.size
      });
      await putToPresignedUrl(signed.uploadUrl, blob, contentType);
      await patchFotoLote(brechoId, itemId, loteId, { audioUrl: signed.publicUrl });
      await queryClient.invalidateQueries({ queryKey: ["item", brechoId, itemId] });
      setRecordError(null);
    } catch (e) {
      setRecordError(e instanceof ApiError ? e.message : String(e));
    }
  };

  if (!itemId) {
    return (
      <AppShell>
        <Link to="/">Voltar</Link>
      </AppShell>
    );
  }

  const item = itemQuery.data;
  const currentLote = item?.fotoLotes?.find((l) => l.id === loteId);

  return (
    <AppShell>
      <Link to={`/items/${itemId}`}>← Voltar à peça</Link>

      {itemQuery.isLoading && <p>Carregando...</p>}
      {itemQuery.isError && <p>Não foi possível carregar a peça.</p>}

      {item && (
        <>
          <header>
            <h1 style={{ marginBottom: 4 }}>Fotos — {item.nome}</h1>
            <p style={{ marginTop: 0, opacity: 0.85 }}>
              Máximo 5 fotos na peça. Agora: {fotoCount}/5. Neste lote você pode enviar até {remaining}{" "}
              nova(s).
            </p>
          </header>

          {actionError && (
            <p style={{ color: "#b60e3d", fontSize: 14 }} role="alert">
              {actionError}
            </p>
          )}

          {!loteId ? (
            <Section title="1. Iniciar lote">
              <p style={{ fontSize: 14, opacity: 0.9 }}>
                O texto ou áudio abaixo descrevem <strong>este conjunto</strong> de fotos (batch), não cada
                arquivo separado.
              </p>
              <Field label="Nota em texto (opcional)">
                <textarea
                  value={textoNota}
                  onChange={(e) => setTextoNota(e.target.value)}
                  rows={4}
                  style={{
                    width: "100%",
                    border: "1px solid #d9b9bc",
                    borderRadius: 10,
                    padding: 12,
                    fontFamily: "inherit",
                    fontSize: 15
                  }}
                  placeholder="Ex.: peça com brilho na frente, costas com mancha leve..."
                />
              </Field>
              <Button
                type="button"
                onClick={() => createLoteMutation.mutate()}
                disabled={createLoteMutation.isPending || remaining === 0}
              >
                {createLoteMutation.isPending ? "Criando..." : "Começar envio de fotos"}
              </Button>
              {remaining === 0 && <p>Você já atingiu 5 fotos nesta peça.</p>}
            </Section>
          ) : (
            <>
              <Section title="2. Contexto do lote (batch)">
                <Field label="Nota em texto">
                  <textarea
                    value={textoNota}
                    onChange={(e) => setTextoNota(e.target.value)}
                    rows={3}
                    style={{
                      width: "100%",
                      border: "1px solid #d9b9bc",
                      borderRadius: 10,
                      padding: 12,
                      fontFamily: "inherit"
                    }}
                  />
                </Field>
                <Button
                  type="button"
                  onClick={() => saveTextoMutation.mutate()}
                  disabled={saveTextoMutation.isPending}
                >
                  {saveTextoMutation.isPending ? "Salvando..." : "Salvar texto"}
                </Button>
                <div className="stack" style={{ marginTop: 16, gap: 8 }}>
                  <span style={{ fontSize: 12, fontWeight: 600 }}>Nota em voz (opcional)</span>
                  {!recording ? (
                    <Button type="button" onClick={startRecording}>
                      Gravar áudio
                    </Button>
                  ) : (
                    <Button type="button" onClick={() => void stopRecordingAndUpload()}>
                      Parar e enviar áudio
                    </Button>
                  )}
                  {recordError && <small style={{ color: "#b60e3d" }}>{recordError}</small>}
                  {currentLote?.audioUrl && (
                    <div className="stack" style={{ gap: 8 }}>
                      <audio controls src={currentLote.audioUrl} style={{ width: "100%" }} />
                      <Button
                        type="button"
                        onClick={() => transcribeMutation.mutate()}
                        disabled={transcribeMutation.isPending}
                      >
                        {transcribeMutation.isPending ? "Transcrevendo..." : "Transcrever áudio (OpenAI)"}
                      </Button>
                      {currentLote.transcricaoAudio && (
                        <p style={{ fontSize: 14, background: "#f8f0f1", padding: 12, borderRadius: 10 }}>
                          <strong>Transcrição:</strong> {currentLote.transcricaoAudio}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </Section>

              <Section title="3. Fotos">
                <p style={{ fontSize: 14 }}>Você pode usar a galeria ou a câmera (com flash, se o aparelho permitir).</p>
                <div className="stack" style={{ gap: 12, flexDirection: "row", flexWrap: "wrap" }}>
                  <Button
                    type="button"
                    onClick={() => galleryInputRef.current?.click()}
                    disabled={remaining === 0}
                  >
                    Galeria
                  </Button>
                  <input
                    ref={galleryInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    multiple
                    hidden
                    onChange={(e) => void onGalleryChange(e)}
                  />
                  <Button type="button" onClick={() => void startCamera()} disabled={remaining === 0}>
                    Abrir câmera
                  </Button>
                </div>
                <div className="stack" style={{ marginTop: 20, gap: 16 }}>
                  <p style={{ fontSize: 14, fontWeight: 600, margin: 0 }}>Fotos já enviadas neste lote</p>
                  {(item.fotos ?? []).filter((f) => f.loteId === loteId).length === 0 ? (
                    <p style={{ opacity: 0.8, margin: 0 }}>Nenhuma foto neste lote ainda.</p>
                  ) : (
                    (item.fotos ?? [])
                      .filter((f) => f.loteId === loteId)
                      .map((foto) => {
                        const latest = foto.aiAnalyses?.[0];
                        return (
                          <div
                            key={foto.id}
                            className="card"
                            style={{
                              display: "flex",
                              flexWrap: "wrap",
                              gap: 12,
                              alignItems: "flex-start"
                            }}
                          >
                            <img
                              src={foto.url}
                              alt=""
                              style={{ width: 88, height: 88, objectFit: "cover", borderRadius: 8 }}
                            />
                            <div className="stack" style={{ flex: 1, minWidth: 0, gap: 8 }}>
                              <small style={{ opacity: 0.75 }}>Ordem {foto.ordem}</small>
                              <Button
                                type="button"
                                onClick={() => analyzeMutation.mutate(foto.id)}
                                disabled={analyzeMutation.isPending}
                              >
                                {analyzeMutation.isPending && analyzeMutation.variables === foto.id
                                  ? "Analisando..."
                                  : "Sugerir com IA"}
                              </Button>
                              {latest && <FotoAiSuggestionsCard analysis={latest} />}
                            </div>
                          </div>
                        );
                      })
                  )}
                </div>
              </Section>

              <Button type="button" onClick={() => navigate(`/items/${itemId}`)}>
                Concluir
              </Button>
            </>
          )}
        </>
      )}

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
              color: "#fff"
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
            >
              ✕
            </button>
            <span style={{ fontWeight: 600 }}>Capturar foto</span>
            <button
              type="button"
              disabled={!flashSupported}
              title={
                flashSupported ? "Alternar flash" : "Flash não disponível neste aparelho ou navegador."
              }
              onClick={() => setFlashOn((v) => !v)}
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
            >
              ⚡
            </button>
          </header>
          <div style={{ position: "relative", flex: 1, overflow: "hidden" }}>
            <video
              ref={videoRef}
              playsInline
              muted
              style={{ width: "100%", height: "100%", objectFit: "cover" }}
            />
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
            >
              🖼
            </button>
            <button
              type="button"
              onClick={() => void captureFromVideo()}
              style={{
                width: 76,
                height: 76,
                borderRadius: "50%",
                border: "3px solid #fff",
                background: "radial-gradient(circle, #b60e3d 62%, transparent 63%)",
                cursor: "pointer"
              }}
              aria-label="Capturar"
            />
          </footer>
        </div>
      )}
    </AppShell>
  );
};
