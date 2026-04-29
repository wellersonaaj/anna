import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { addItemFoto, analisarItemFoto, createFotoLote, getItem, patchFotoLote, presignFotoLoteUpload, putToPresignedUrl, transcribeFotoLote } from "../api/items";
import { ApiError } from "../api/client";
import { FotoAiSuggestionsCard } from "../components/foto-ai-suggestions";
import { resizeImageToJpeg } from "../lib/imageResize";
import { useSessionStore } from "../store/session.store";
import { AppShell, Button, Field, Section } from "../components/ui";
const pickAudioMime = () => {
    if (MediaRecorder.isTypeSupported("audio/webm;codecs=opus")) {
        return "audio/webm;codecs=opus";
    }
    if (MediaRecorder.isTypeSupported("audio/webm")) {
        return "audio/webm";
    }
    return "audio/mp4";
};
/** Presign/S3 aceitam MIME sem parametros (ex. audio/webm para gravacao opus). */
const canonicalAudioContentType = (blobType) => blobType.includes("mp4") ? "audio/mp4" : "audio/webm";
export const ItemFotoUploadPage = () => {
    const { itemId } = useParams();
    const brechoId = useSessionStore((s) => s.brechoId);
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const [loteId, setLoteId] = useState(null);
    const [textoNota, setTextoNota] = useState("");
    const [cameraOpen, setCameraOpen] = useState(false);
    const [flashOn, setFlashOn] = useState(false);
    const [flashSupported, setFlashSupported] = useState(true);
    const [recording, setRecording] = useState(false);
    const [recordError, setRecordError] = useState(null);
    const [actionError, setActionError] = useState(null);
    const [textoSalvoHint, setTextoSalvoHint] = useState(false);
    const videoRef = useRef(null);
    const streamRef = useRef(null);
    const recorderRef = useRef(null);
    const chunksRef = useRef([]);
    const galleryInputRef = useRef(null);
    const itemQuery = useQuery({
        queryKey: ["item", brechoId, itemId],
        queryFn: () => getItem(brechoId, itemId),
        enabled: Boolean(itemId)
    });
    const fotoCount = itemQuery.data?.fotos?.length ?? 0;
    const remaining = Math.max(0, 15 - fotoCount);
    const createLoteMutation = useMutation({
        mutationFn: () => createFotoLote(brechoId, itemId, { textoNota: textoNota.trim() || undefined }),
        onSuccess: (lote) => {
            setLoteId(lote.id);
            setActionError(null);
        },
        onError: (e) => {
            setActionError(e instanceof ApiError ? e.message : "Não foi possível iniciar o lote.");
        }
    });
    const saveTextoMutation = useMutation({
        mutationFn: () => patchFotoLote(brechoId, itemId, loteId, { textoNota: textoNota }),
        onSuccess: async () => {
            await queryClient.invalidateQueries({ queryKey: ["item", brechoId, itemId] });
            setActionError(null);
            setTextoSalvoHint(true);
            window.setTimeout(() => setTextoSalvoHint(false), 4000);
        },
        onError: (e) => {
            setActionError(e instanceof ApiError ? e.message : "Não foi possível salvar o texto.");
        }
    });
    const transcribeMutation = useMutation({
        mutationFn: () => transcribeFotoLote(brechoId, itemId, loteId),
        onSuccess: async () => {
            await queryClient.invalidateQueries({ queryKey: ["item", brechoId, itemId] });
            setActionError(null);
        },
        onError: (e) => {
            setActionError(e instanceof ApiError ? e.message : "Transcrição indisponível.");
        }
    });
    const analyzeMutation = useMutation({
        mutationFn: (fotoId) => analisarItemFoto(brechoId, itemId, fotoId),
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
        }
        catch {
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
        }
        catch {
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
    const uploadJpegForLote = async (jpeg) => {
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
        const raw = await new Promise((resolve) => canvas.toBlob((b) => resolve(b), "image/jpeg", 0.92));
        if (!raw) {
            setActionError("Falha ao capturar imagem.");
            return;
        }
        const jpeg = await resizeImageToJpeg(raw);
        try {
            await uploadJpegForLote(jpeg);
            setActionError(null);
        }
        catch (e) {
            setActionError(e instanceof ApiError ? e.message : String(e));
        }
    };
    const onGalleryChange = async (e) => {
        const files = e.target.files;
        if (!files?.length || !itemId || !loteId) {
            return;
        }
        setActionError(null);
        let n = itemQuery.data?.fotos?.length ?? 0;
        try {
            for (const file of Array.from(files)) {
                if (n >= 15) {
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
        }
        catch (err) {
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
            let mr;
            try {
                mr = new MediaRecorder(stream, { mimeType: mime });
            }
            catch {
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
        await new Promise((r) => {
            mr.addEventListener("stop", () => r(), { once: true });
        });
        const blob = new Blob(chunksRef.current, { type: mr.mimeType || "audio/webm" });
        recorderRef.current = null;
        if (blob.size < 10) {
            setRecordError("Gravação muito curta.");
            return;
        }
        const ext = blob.type.includes("mp4") ? "mp4" : "webm";
        const contentType = canonicalAudioContentType(blob.type || mr.mimeType || "");
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
        }
        catch (e) {
            setRecordError(e instanceof ApiError ? e.message : String(e));
        }
    };
    if (!itemId) {
        return (_jsx(AppShell, { children: _jsx(Link, { to: "/", children: "Voltar" }) }));
    }
    const item = itemQuery.data;
    const currentLote = item?.fotoLotes?.find((l) => l.id === loteId);
    return (_jsxs(AppShell, { children: [_jsx(Link, { to: `/items/${itemId}`, children: "\u2190 Voltar \u00E0 pe\u00E7a" }), itemQuery.isLoading && _jsx("p", { children: "Carregando..." }), itemQuery.isError && _jsx("p", { children: "N\u00E3o foi poss\u00EDvel carregar a pe\u00E7a." }), item && (_jsxs(_Fragment, { children: [_jsxs("header", { children: [_jsxs("h1", { style: { marginBottom: 4 }, children: ["Fotos \u2014 ", item.nome] }), _jsxs("p", { style: { marginTop: 0, opacity: 0.85 }, children: ["M\u00E1ximo 15 fotos na pe\u00E7a. Agora: ", fotoCount, "/15. Neste lote voc\u00EA pode enviar at\u00E9 ", remaining, " ", "nova(s)."] })] }), actionError && (_jsx("p", { style: { color: "#b60e3d", fontSize: 14 }, role: "alert", children: actionError })), !loteId ? (_jsxs(Section, { title: "1. Iniciar lote", children: [_jsxs("p", { style: { fontSize: 14, opacity: 0.9 }, children: ["O texto ou \u00E1udio abaixo descrevem ", _jsx("strong", { children: "este conjunto" }), " de fotos (batch), n\u00E3o cada arquivo separado."] }), _jsx(Field, { label: "Nota em texto (opcional)", children: _jsx("textarea", { value: textoNota, onChange: (e) => setTextoNota(e.target.value), rows: 4, style: {
                                        width: "100%",
                                        border: "1px solid #d9b9bc",
                                        borderRadius: 10,
                                        padding: 12,
                                        fontFamily: "inherit",
                                        fontSize: 15
                                    }, placeholder: "Ex.: pe\u00E7a com brilho na frente, costas com mancha leve..." }) }), _jsx(Button, { type: "button", onClick: () => createLoteMutation.mutate(), disabled: createLoteMutation.isPending || remaining === 0, children: createLoteMutation.isPending ? "Criando..." : "Começar envio de fotos" }), remaining === 0 && _jsx("p", { children: "Voc\u00EA j\u00E1 atingiu 15 fotos nesta pe\u00E7a." })] })) : (_jsxs(_Fragment, { children: [_jsxs(Section, { title: "2. Contexto do lote (batch)", children: [_jsx(Field, { label: "Nota em texto", children: _jsx("textarea", { value: textoNota, onChange: (e) => setTextoNota(e.target.value), rows: 3, style: {
                                                width: "100%",
                                                border: "1px solid #d9b9bc",
                                                borderRadius: 10,
                                                padding: 12,
                                                fontFamily: "inherit"
                                            } }) }), _jsx(Button, { type: "button", onClick: () => saveTextoMutation.mutate(), disabled: saveTextoMutation.isPending, children: saveTextoMutation.isPending ? "Salvando..." : "Salvar texto" }), textoSalvoHint && (_jsx("p", { style: { margin: "8px 0 0", fontSize: 14, color: "#0d6b2e", fontWeight: 600 }, children: "Texto salvo." })), _jsxs("div", { className: "stack", style: { marginTop: 16, gap: 8 }, children: [_jsx("span", { style: { fontSize: 12, fontWeight: 600 }, children: "Nota em voz (opcional)" }), !recording ? (_jsx(Button, { type: "button", onClick: startRecording, children: "Gravar \u00E1udio" })) : (_jsx(Button, { type: "button", onClick: () => void stopRecordingAndUpload(), children: "Parar e enviar \u00E1udio" })), recordError && _jsx("small", { style: { color: "#b60e3d" }, children: recordError }), currentLote?.audioUrl && (_jsxs("div", { className: "stack", style: { gap: 8 }, children: [_jsx("audio", { controls: true, src: currentLote.audioUrl, style: { width: "100%" } }), _jsx(Button, { type: "button", onClick: () => transcribeMutation.mutate(), disabled: transcribeMutation.isPending, children: transcribeMutation.isPending ? "Transcrevendo..." : "Transcrever áudio (OpenAI)" }), currentLote.transcricaoAudio && (_jsxs("p", { style: { fontSize: 14, background: "#f8f0f1", padding: 12, borderRadius: 10 }, children: [_jsx("strong", { children: "Transcri\u00E7\u00E3o:" }), " ", currentLote.transcricaoAudio] }))] }))] })] }), _jsxs(Section, { title: "3. Fotos", children: [_jsx("p", { style: { fontSize: 14 }, children: "Voc\u00EA pode usar a galeria ou a c\u00E2mera (com flash, se o aparelho permitir)." }), _jsxs("div", { className: "stack", style: { gap: 12, flexDirection: "row", flexWrap: "wrap" }, children: [_jsx(Button, { type: "button", onClick: () => galleryInputRef.current?.click(), disabled: remaining === 0, children: "Galeria" }), _jsx("input", { ref: galleryInputRef, type: "file", accept: "image/jpeg,image/png,image/webp", multiple: true, hidden: true, onChange: (e) => void onGalleryChange(e) }), _jsx(Button, { type: "button", onClick: () => void startCamera(), disabled: remaining === 0, children: "Abrir c\u00E2mera" })] }), _jsxs("div", { className: "stack", style: { marginTop: 20, gap: 16 }, children: [_jsx("p", { style: { fontSize: 14, fontWeight: 600, margin: 0 }, children: "Fotos j\u00E1 enviadas neste lote" }), (item.fotos ?? []).filter((f) => f.loteId === loteId).length === 0 ? (_jsx("p", { style: { opacity: 0.8, margin: 0 }, children: "Nenhuma foto neste lote ainda." })) : ((item.fotos ?? [])
                                                .filter((f) => f.loteId === loteId)
                                                .map((foto) => {
                                                const latest = foto.aiAnalyses?.[0];
                                                return (_jsxs("div", { className: "card", style: {
                                                        display: "flex",
                                                        flexWrap: "wrap",
                                                        gap: 12,
                                                        alignItems: "flex-start"
                                                    }, children: [_jsx("img", { src: foto.url, alt: "", style: { width: 88, height: 88, objectFit: "cover", borderRadius: 8 } }), _jsxs("div", { className: "stack", style: { flex: 1, minWidth: 0, gap: 8 }, children: [_jsxs("small", { style: { opacity: 0.75 }, children: ["Ordem ", foto.ordem] }), _jsx(Button, { type: "button", onClick: () => analyzeMutation.mutate(foto.id), disabled: analyzeMutation.isPending, children: analyzeMutation.isPending && analyzeMutation.variables === foto.id
                                                                        ? "Analisando..."
                                                                        : "Sugerir com IA" }), latest && _jsx(FotoAiSuggestionsCard, { analysis: latest })] })] }, foto.id));
                                            }))] })] }), _jsx(Button, { type: "button", onClick: () => navigate(`/items/${itemId}`), children: "Concluir" })] }))] })), cameraOpen && (_jsxs("div", { style: {
                    position: "fixed",
                    inset: 0,
                    zIndex: 50,
                    background: "#000",
                    display: "flex",
                    flexDirection: "column"
                }, children: [_jsxs("header", { style: {
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            padding: "12px 16px",
                            color: "#fff"
                        }, children: [_jsx("button", { type: "button", onClick: closeCamera, style: {
                                    background: "rgba(255,255,255,0.15)",
                                    border: 0,
                                    color: "#fff",
                                    borderRadius: 999,
                                    width: 44,
                                    height: 44,
                                    cursor: "pointer"
                                }, children: "\u2715" }), _jsx("span", { style: { fontWeight: 600 }, children: "Capturar foto" }), _jsx("button", { type: "button", disabled: !flashSupported, title: flashSupported ? "Alternar flash" : "Flash não disponível neste aparelho ou navegador.", onClick: () => setFlashOn((v) => !v), style: {
                                    background: flashOn ? "#b60e3d" : "rgba(255,255,255,0.15)",
                                    border: 0,
                                    color: "#fff",
                                    borderRadius: 999,
                                    width: 44,
                                    height: 44,
                                    cursor: flashSupported ? "pointer" : "not-allowed",
                                    opacity: flashSupported ? 1 : 0.4
                                }, children: "\u26A1" })] }), _jsxs("div", { style: { position: "relative", flex: 1, overflow: "hidden" }, children: [_jsx("video", { ref: videoRef, playsInline: true, muted: true, style: { width: "100%", height: "100%", objectFit: "cover" } }), _jsx("div", { style: {
                                    position: "absolute",
                                    inset: 0,
                                    pointerEvents: "none",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center"
                                }, children: _jsx("div", { style: {
                                        width: "72vmin",
                                        height: "72vmin",
                                        maxWidth: 320,
                                        maxHeight: 320,
                                        border: "1px solid rgba(255,255,255,0.25)",
                                        borderRadius: "2rem"
                                    } }) })] }), _jsxs("footer", { style: {
                            padding: "24px 32px 36px",
                            display: "flex",
                            justifyContent: "center",
                            alignItems: "center",
                            gap: 48,
                            background: "linear-gradient(transparent, rgba(0,0,0,0.85))"
                        }, children: [_jsx("button", { type: "button", onClick: () => galleryInputRef.current?.click(), style: {
                                    background: "rgba(255,255,255,0.12)",
                                    border: "1px solid rgba(255,255,255,0.25)",
                                    color: "#fff",
                                    borderRadius: 999,
                                    width: 56,
                                    height: 56,
                                    cursor: "pointer"
                                }, title: "Galeria", children: "\uD83D\uDDBC" }), _jsx("button", { type: "button", onClick: () => void captureFromVideo(), style: {
                                    width: 76,
                                    height: 76,
                                    borderRadius: "50%",
                                    border: "3px solid #fff",
                                    background: "radial-gradient(circle, #b60e3d 62%, transparent 63%)",
                                    cursor: "pointer"
                                }, "aria-label": "Capturar" })] })] }))] }));
};
