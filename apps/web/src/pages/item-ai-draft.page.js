import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { addItemFoto, analisarFotoRascunho, createFotoLote, createItem, enviarFeedbackRascunho, listAcervoSuggestions, presignFotoLoteUpload, putToPresignedUrl } from "../api/items";
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
];
const toDataUrl = async (blob) => {
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
const parseDataUrl = (dataUrl) => {
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
        mime: mime,
        base64
    };
};
const MAX_DRAFT_ANALYZE_BYTES = 32 * 1024 * 1024;
const formatPhotoCountLabel = (count) => {
    if (count === 0) {
        return "Nenhuma foto";
    }
    if (count === 1) {
        return "1 foto";
    }
    return `${count} fotos`;
};
export const ItemAIDraftPage = () => {
    const brechoId = useSessionStore((state) => state.brechoId);
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const galleryInputRef = useRef(null);
    const videoRef = useRef(null);
    const streamRef = useRef(null);
    const initializedRef = useRef(false);
    const fotoSectionRef = useRef(null);
    const flashTimeoutRef = useRef(null);
    const shutterAnimTimeoutRef = useRef(null);
    const [actionError, setActionError] = useState(null);
    const [completedItemId, setCompletedItemId] = useState(null);
    const [cameraOpen, setCameraOpen] = useState(false);
    const [flashOn, setFlashOn] = useState(false);
    const [flashSupported, setFlashSupported] = useState(true);
    const [needsVideoActivation, setNeedsVideoActivation] = useState(false);
    const [captureFlashVisible, setCaptureFlashVisible] = useState(false);
    const [shutterPressed, setShutterPressed] = useState(false);
    const [feedbackChoice, setFeedbackChoice] = useState(null);
    const [feedbackReasons, setFeedbackReasons] = useState([]);
    const [pendingFeedback, setPendingFeedback] = useState(null);
    const { images, textoContexto, analysis, draftAnalysisId, formValues, addImageDataUrl, removeImageAt, clearImages, setTextoContexto, setFormField, applyAnalysis, resetDraft } = useItemAIDraftStore();
    const acervoSuggestionsQuery = useQuery({
        queryKey: ["acervo-suggestions", brechoId, formValues.acervoTipo, formValues.acervoNome],
        queryFn: () => listAcervoSuggestions(brechoId, {
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
        }
        catch {
            // Alguns navegadores (especialmente iOS/PWA) exigem gesto do usuário.
        }
        await new Promise((resolve) => {
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
        }
        catch {
            setNeedsVideoActivation(true);
        }
    }, []);
    const getCameraStream = useCallback(async () => {
        const attempts = [
            { video: { facingMode: { ideal: "environment" } }, audio: false },
            { video: { facingMode: "environment" }, audio: false },
            { video: true, audio: false }
        ];
        let lastError = null;
        for (const constraints of attempts) {
            try {
                return await navigator.mediaDevices.getUserMedia(constraints);
            }
            catch (error) {
                lastError = error;
            }
        }
        throw lastError ?? new Error("Falha ao acessar câmera.");
    }, []);
    const attachStreamToVideo = useCallback(async () => {
        const video = videoRef.current;
        const stream = streamRef.current;
        if (!video || !stream) {
            return;
        }
        video.srcObject = stream;
        video.muted = true;
        video.autoplay = true;
        video.playsInline = true;
        video.setAttribute("playsinline", "true");
        video.setAttribute("webkit-playsinline", "true");
        await playVideoElement();
    }, [playVideoElement]);
    const startCamera = useCallback(async () => {
        setActionError(null);
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
            const track = stream.getVideoTracks()[0];
            const caps = (track?.getCapabilities?.() ?? {});
            setFlashSupported(Boolean(caps.torch));
            setFlashOn(false);
        }
        catch {
            setActionError("Não foi possível acessar a câmera. Verifique permissões ou use a galeria.");
        }
    }, [getCameraStream, stopStream]);
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
            if (flashTimeoutRef.current) {
                clearTimeout(flashTimeoutRef.current);
                flashTimeoutRef.current = null;
            }
            if (shutterAnimTimeoutRef.current) {
                clearTimeout(shutterAnimTimeoutRef.current);
                shutterAnimTimeoutRef.current = null;
            }
        };
    }, [stopStream]);
    const triggerCaptureFeedback = useCallback(() => {
        if (flashTimeoutRef.current) {
            clearTimeout(flashTimeoutRef.current);
        }
        setCaptureFlashVisible(true);
        if (typeof navigator !== "undefined" && typeof navigator.vibrate === "function") {
            try {
                navigator.vibrate(15);
            }
            catch {
                // ignore unsupported vibrate
            }
        }
        flashTimeoutRef.current = window.setTimeout(() => {
            setCaptureFlashVisible(false);
            flashTimeoutRef.current = null;
        }, 160);
    }, []);
    useEffect(() => {
        if (!cameraOpen) {
            return;
        }
        void attachStreamToVideo();
    }, [attachStreamToVideo, cameraOpen]);
    useEffect(() => {
        if (!cameraOpen || !streamRef.current) {
            return;
        }
        const track = streamRef.current.getVideoTracks()[0];
        if (!track) {
            return;
        }
        const caps = (track.getCapabilities?.() ?? {});
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
    };
    const continueFromCameraToReview = () => {
        closeCamera();
        window.requestAnimationFrame(() => {
            fotoSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
        });
    };
    const activateVideoPreview = async () => {
        try {
            await playVideoElement();
        }
        catch {
            setActionError("Não foi possível iniciar o preview da câmera. Tente fechar e abrir novamente.");
        }
    };
    const handleImagePicked = async (fileList) => {
        if (!fileList?.length) {
            return;
        }
        try {
            const files = Array.from(fileList);
            let added = 0;
            for (const file of files) {
                const jpeg = await resizeImageToJpeg(file);
                const dataUrl = await toDataUrl(jpeg);
                addImageDataUrl(dataUrl);
                added += 1;
            }
            if (added > 0 && cameraOpen) {
                triggerCaptureFeedback();
            }
            setActionError(null);
        }
        catch (error) {
            setActionError(error instanceof Error ? error.message : "Não foi possível preparar a imagem.");
        }
    };
    const captureFromVideo = async () => {
        if (shutterAnimTimeoutRef.current) {
            clearTimeout(shutterAnimTimeoutRef.current);
        }
        setShutterPressed(true);
        shutterAnimTimeoutRef.current = window.setTimeout(() => {
            setShutterPressed(false);
            shutterAnimTimeoutRef.current = null;
        }, 150);
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
        const raw = await new Promise((resolve) => canvas.toBlob((blob) => resolve(blob), "image/jpeg", 0.92));
        if (!raw) {
            setActionError("Falha ao capturar imagem.");
            return;
        }
        try {
            const jpeg = await resizeImageToJpeg(raw);
            const dataUrl = await toDataUrl(jpeg);
            addImageDataUrl(dataUrl);
            triggerCaptureFeedback();
            setActionError(null);
        }
        catch (error) {
            setActionError(error instanceof Error ? error.message : "Não foi possível preparar a imagem capturada.");
        }
    };
    const analyzeMutation = useMutation({
        mutationFn: async () => {
            if (images.length === 0) {
                throw new Error("Selecione ao menos 1 foto para analisar.");
            }
            const parsedImages = images.map((imageDataUrl) => parseDataUrl(imageDataUrl));
            const totalBytes = parsedImages.reduce((sum, image) => sum + Math.floor((image.base64.length * 3) / 4), 0);
            if (totalBytes > MAX_DRAFT_ANALYZE_BYTES) {
                throw new Error("As fotos selecionadas estão muito pesadas para análise em lote. Remova algumas ou use imagens menores.");
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
        mutationFn: (input) => {
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
    const confidenceLabel = (value) => {
        if (value >= 0.8) {
            return "alta";
        }
        if (value >= 0.6) {
            return "média";
        }
        return "baixa";
    };
    const toggleReason = (reason) => {
        setFeedbackReasons((current) => current.includes(reason) ? current.filter((code) => code !== reason) : [...current, reason]);
    };
    const submitStructuredFeedback = (helpfulness) => {
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
        return (_jsxs(AppShell, { children: [_jsx(Link, { to: "/", children: "\u2190 Voltar ao estoque" }), _jsx(Link, { to: "/items/new/manual", children: "Usar cadastro manual" }), _jsxs(Section, { title: "Cadastro conclu\u00EDdo", children: [_jsx("p", { style: { margin: 0, opacity: 0.9 }, children: "Pe\u00E7a cadastrada com sucesso. O rascunho foi limpo para o pr\u00F3ximo cadastro." }), _jsxs("div", { style: { display: "flex", gap: 8, flexWrap: "wrap" }, children: [_jsx(Button, { type: "button", onClick: startAnother, children: "Cadastrar outra" }), _jsx(Button, { type: "button", onClick: goToItemDetail, children: "Ver pe\u00E7a" })] })] })] }));
    }
    return (_jsxs(AppShell, { children: [_jsx(Link, { to: "/", children: "\u2190 Voltar ao estoque" }), _jsx(Link, { to: "/items/new/manual", children: "Prefere sem IA? Ir para cadastro manual" }), _jsxs("header", { children: [_jsx("h1", { style: { marginBottom: 4 }, children: "Cadastrar com IA" }), _jsx("p", { style: { marginTop: 0, opacity: 0.85 }, children: "Envie uma foto, opcionalmente descreva o contexto, revise os campos e conclua." })] }), actionError && (_jsx("p", { style: { color: "#b60e3d", fontSize: 14 }, role: "alert", children: actionError })), pendingFeedback && (_jsxs(Section, { title: "3. A sugest\u00E3o da IA ajudou?", children: [_jsx("p", { style: { margin: 0, opacity: 0.9 }, children: "Seu toque ajuda o app a aprender com as corre\u00E7\u00F5es reais do cadastro." }), _jsxs("div", { style: { display: "flex", gap: 8, flexWrap: "wrap" }, children: [_jsx(Button, { type: "button", disabled: feedbackMutation.isPending, onClick: () => feedbackMutation.mutate({ helpfulness: "SIM" }), children: "Sim" }), _jsx(Button, { type: "button", disabled: feedbackMutation.isPending, onClick: () => setFeedbackChoice("PARCIAL"), children: "Parcial" }), _jsx(Button, { type: "button", disabled: feedbackMutation.isPending, onClick: () => setFeedbackChoice("NAO"), children: "N\u00E3o" })] }), (feedbackChoice === "PARCIAL" || feedbackChoice === "NAO") && (_jsxs("div", { className: "stack", style: { gap: 8 }, children: [_jsx("p", { style: { margin: "4px 0 0", fontSize: 14, opacity: 0.9 }, children: "O que ficou ruim? (opcional)" }), _jsx("div", { style: { display: "flex", gap: 8, flexWrap: "wrap" }, children: reasonCodeOptions.map((option) => (_jsx("button", { type: "button", onClick: () => toggleReason(option.code), style: {
                                        border: `1px solid ${feedbackReasons.includes(option.code) ? "#b60e3d" : "#d9b9bc"}`,
                                        background: feedbackReasons.includes(option.code) ? "#fdf1f4" : "#fff",
                                        color: "#3d2228",
                                        borderRadius: 999,
                                        padding: "6px 12px",
                                        cursor: "pointer"
                                    }, children: option.label }, option.code))) }), _jsxs("div", { style: { display: "flex", gap: 8, flexWrap: "wrap" }, children: [_jsx(Button, { type: "button", disabled: feedbackMutation.isPending, onClick: () => submitStructuredFeedback(feedbackChoice), children: "Enviar feedback" }), _jsx(Button, { type: "button", disabled: feedbackMutation.isPending, onClick: () => {
                                            setFeedbackChoice(null);
                                            setFeedbackReasons([]);
                                        }, children: "Cancelar" })] })] }))] })), _jsx(Section, { title: "1. Foto e contexto", children: _jsxs("div", { id: "ai-draft-fotos-section", ref: fotoSectionRef, className: "stack", style: { gap: 10 }, children: [_jsxs("div", { style: { display: "flex", gap: 8, flexWrap: "wrap" }, children: [_jsx(Button, { type: "button", onClick: () => void startCamera(), children: "Abrir c\u00E2mera" }), _jsx(Button, { type: "button", onClick: () => galleryInputRef.current?.click(), children: "Escolher da galeria" }), images.length > 0 && (_jsx(Button, { type: "button", onClick: clearImages, disabled: analyzeMutation.isPending || submitMutation.isPending, children: "Limpar fotos" }))] }), _jsx("input", { ref: galleryInputRef, type: "file", accept: "image/*", multiple: true, hidden: true, onChange: (event) => {
                                void handleImagePicked(event.target.files);
                                event.target.value = "";
                            } }), images.length > 0 ? (_jsxs("div", { className: "stack", style: { gap: 8 }, children: [_jsxs("p", { style: { margin: 0, fontSize: 13, opacity: 0.85 }, children: ["Fotos selecionadas: ", images.length] }), _jsx("div", { style: { display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 8 }, children: images.map((imageDataUrl, index) => (_jsxs("div", { style: { position: "relative" }, children: [_jsx("img", { src: imageDataUrl, alt: `Foto ${index + 1}`, style: { width: "100%", height: 150, objectFit: "cover", borderRadius: 10, border: "1px solid #e7d5d6" } }), _jsx("button", { type: "button", onClick: () => removeImageAt(index), style: {
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
                                                }, "aria-label": `Remover foto ${index + 1}`, children: "\u2715" })] }, imageDataUrl + index))) })] })) : (_jsx("p", { style: { opacity: 0.8, margin: 0 }, children: "Nenhuma foto selecionada ainda." })), _jsx(Field, { label: "Contexto em texto (opcional)", children: _jsx("textarea", { value: textoContexto, onChange: (event) => setTextoContexto(event.target.value), rows: 3, style: {
                                    width: "100%",
                                    border: "1px solid #d9b9bc",
                                    borderRadius: 10,
                                    padding: 12,
                                    fontFamily: "inherit",
                                    fontSize: 15
                                }, placeholder: "Ex.: vestido com brilho, costas com z\u00EDper e caimento reto..." }) }), _jsx(Button, { type: "button", onClick: () => analyzeMutation.mutate(), disabled: images.length === 0 || analyzeMutation.isPending, children: analyzeMutation.isPending ? "Analisando..." : "Sugerir com IA" })] }) }), _jsxs(Section, { title: "2. Revis\u00E3o r\u00E1pida dos dados", children: [analysis && (_jsxs("div", { style: {
                            fontSize: 13,
                            padding: 12,
                            background: "#f0f7f2",
                            borderRadius: 10,
                            border: "1px solid #c5e0cc",
                            marginBottom: 10
                        }, children: [_jsx("strong", { style: { display: "block", marginBottom: 6 }, children: "Sugest\u00F5es da IA aplicadas automaticamente" }), _jsxs("p", { style: { margin: 0 }, children: ["Confian\u00E7a: ", Math.round(analysis.meta.confianca * 100), "% \u00B7 Ambiente: ", analysis.meta.ambienteFoto ?? "—", " \u00B7 Qualidade: ", analysis.meta.qualidadeFoto ?? "—"] }), _jsxs("p", { style: { margin: "6px 0 0", fontSize: 12, opacity: 0.85 }, children: ["Campos (confian\u00E7a): nome ", confidenceLabel(analysis.fieldConfidence.nome), " \u00B7 categoria", " ", confidenceLabel(analysis.fieldConfidence.categoria), " \u00B7 subcategoria", " ", confidenceLabel(analysis.fieldConfidence.subcategoria), " \u00B7 cor", " ", confidenceLabel(analysis.fieldConfidence.cor), " \u00B7 condi\u00E7\u00E3o", " ", confidenceLabel(analysis.fieldConfidence.condicao)] }), analysis.warnings.lowConfidence && (_jsx("p", { style: { color: "#7a5a00", margin: "8px 0 0", fontWeight: 600 }, children: "Confian\u00E7a baixa \u2014 revise os campos manualmente." })), analysis.warnings.multiplasPecas && (_jsx("p", { style: { color: "#7a5a00", margin: "8px 0 0", fontWeight: 600 }, children: "V\u00E1rios itens detectados \u2014 resultado pode ser impreciso." }))] })), _jsxs("div", { className: "grid cols-2", children: [_jsxs(Field, { label: "Nome", children: [_jsx(Input, { value: formValues.nome, onChange: (event) => setFormField("nome", event.target.value) }), analysis && (_jsxs("small", { style: { opacity: 0.75 }, children: ["Origem: ", analysis.fallbacksApplied.nome === "fallback" ? "fallback" : "modelo", " \u00B7 confian\u00E7a", " ", Math.round(analysis.fieldConfidence.nome * 100), "%"] }))] }), _jsx(Field, { label: "Categoria", children: _jsxs(Select, { value: formValues.categoria, onChange: (event) => setFormField("categoria", event.target.value), children: [_jsx("option", { value: "ROUPA_FEMININA", children: "Roupa feminina" }), _jsx("option", { value: "ROUPA_MASCULINA", children: "Roupa masculina" }), _jsx("option", { value: "CALCADO", children: "Cal\u00E7ado" }), _jsx("option", { value: "ACESSORIO", children: "Acess\u00F3rio" })] }) }), _jsxs(Field, { label: "Subcategoria", children: [_jsx(Input, { value: formValues.subcategoria, onChange: (event) => setFormField("subcategoria", event.target.value), placeholder: "Ex.: vestido, saia, t\u00EAnis..." }), analysis && (_jsxs("small", { style: { opacity: 0.75 }, children: ["Origem: ", analysis.fallbacksApplied.subcategoria === "fallback" ? "fallback" : "modelo", " \u00B7 confian\u00E7a", " ", Math.round(analysis.fieldConfidence.subcategoria * 100), "%"] }))] }), _jsxs(Field, { label: "Cor", children: [_jsx(Input, { value: formValues.cor, onChange: (event) => setFormField("cor", event.target.value) }), analysis && (_jsxs("small", { style: { opacity: 0.75 }, children: ["Origem: ", analysis.fallbacksApplied.cor === "fallback" ? "fallback" : "modelo", " \u00B7 confian\u00E7a", " ", Math.round(analysis.fieldConfidence.cor * 100), "%"] }))] }), _jsx(Field, { label: "Condi\u00E7\u00E3o", children: _jsxs(Select, { value: formValues.condicao, onChange: (event) => setFormField("condicao", event.target.value), children: [_jsx("option", { value: "OTIMO", children: "\u00D3timo" }), _jsx("option", { value: "BOM", children: "Bom" }), _jsx("option", { value: "REGULAR", children: "Regular" })] }) }), _jsx(Field, { label: "Tamanho", children: _jsx(Input, { value: formValues.tamanho, onChange: (event) => setFormField("tamanho", event.target.value) }) }), _jsx(Field, { label: "Marca", children: _jsx(Input, { value: formValues.marca, onChange: (event) => setFormField("marca", event.target.value) }) }), _jsx(Field, { label: "Pre\u00E7o venda", children: _jsx(Input, { type: "number", step: "0.01", value: formValues.precoVenda, onChange: (event) => setFormField("precoVenda", event.target.value) }) }), _jsx(Field, { label: "Acervo", children: _jsxs(Select, { value: formValues.acervoTipo, onChange: (event) => setFormField("acervoTipo", event.target.value), children: [_jsx("option", { value: "PROPRIO", children: "Pr\u00F3prio" }), _jsx("option", { value: "CONSIGNACAO", children: "Consigna\u00E7\u00E3o" })] }) }), _jsxs(Field, { label: "Nome do acervo", children: [_jsx(Input, { list: "acervo-suggestions-ai-draft", value: formValues.acervoNome, onChange: (event) => setFormField("acervoNome", event.target.value) }), _jsx("datalist", { id: "acervo-suggestions-ai-draft", children: acervoSuggestionsQuery.data?.map((suggestion) => (_jsx("option", { value: suggestion }, suggestion))) })] }), _jsx(Field, { label: "Tem estampa?", children: _jsx("input", { type: "checkbox", checked: formValues.estampa, onChange: (event) => setFormField("estampa", event.target.checked) }) })] }), _jsxs("div", { className: "stack", style: { marginTop: 12, gap: 8 }, children: [_jsx(Button, { type: "button", onClick: () => submitMutation.mutate(), disabled: requiredMissing.length > 0 || submitMutation.isPending, children: submitMutation.isPending ? "Concluindo cadastro..." : "Concluir cadastro" }), requiredMissing.length > 0 && (_jsxs("small", { style: { color: "#8b2f2f" }, children: ["Obrigat\u00F3rios pendentes: ", requiredMissing.join(", "), "."] }))] })] }), cameraOpen && (_jsxs("div", { style: {
                    position: "fixed",
                    inset: 0,
                    zIndex: 50,
                    background: "#000",
                    display: "flex",
                    flexDirection: "column"
                }, children: [_jsx("div", { "aria-hidden": !captureFlashVisible, style: {
                            position: "absolute",
                            inset: 0,
                            zIndex: 60,
                            pointerEvents: "none",
                            background: "rgba(255,255,255,0.92)",
                            opacity: captureFlashVisible ? 1 : 0,
                            transition: "opacity 70ms ease-out"
                        } }), _jsx("span", { "aria-live": "polite", "aria-atomic": "true", style: {
                            position: "absolute",
                            width: 1,
                            height: 1,
                            padding: 0,
                            margin: -1,
                            overflow: "hidden",
                            clip: "rect(0,0,0,0)",
                            whiteSpace: "nowrap",
                            border: 0
                        }, children: formatPhotoCountLabel(images.length) }), _jsxs("header", { style: {
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            padding: "12px 16px",
                            color: "#fff",
                            gap: 12
                        }, children: [_jsx("button", { type: "button", onClick: closeCamera, style: {
                                    background: "rgba(255,255,255,0.15)",
                                    border: 0,
                                    color: "#fff",
                                    borderRadius: 999,
                                    width: 44,
                                    height: 44,
                                    cursor: "pointer"
                                }, "aria-label": "Fechar c\u00E2mera", children: "\u2715" }), _jsxs("div", { style: { display: "flex", flexDirection: "column", alignItems: "center", gap: 4, flex: 1, minWidth: 0 }, children: [_jsx("span", { style: { fontWeight: 600, textAlign: "center" }, children: "Capturar fotos com IA" }), _jsx("span", { style: {
                                            display: "inline-block",
                                            fontSize: 13,
                                            fontWeight: 700,
                                            letterSpacing: 0.02,
                                            padding: "6px 14px",
                                            borderRadius: 999,
                                            background: "rgba(255,255,255,0.18)",
                                            color: "#fff",
                                            border: "1px solid rgba(255,255,255,0.35)"
                                        }, children: formatPhotoCountLabel(images.length) })] }), _jsx("button", { type: "button", disabled: !flashSupported, title: flashSupported ? "Alternar flash" : "Flash não disponível neste aparelho ou navegador.", onClick: () => setFlashOn((value) => !value), style: {
                                    background: flashOn ? "#b60e3d" : "rgba(255,255,255,0.15)",
                                    border: 0,
                                    color: "#fff",
                                    borderRadius: 999,
                                    width: 44,
                                    height: 44,
                                    cursor: flashSupported ? "pointer" : "not-allowed",
                                    opacity: flashSupported ? 1 : 0.4
                                }, "aria-label": "Alternar flash", children: "\u26A1" })] }), _jsxs("div", { style: { padding: "0 16px 12px", display: "flex", flexDirection: "column", gap: 10 }, children: [_jsxs("div", { style: { display: "flex", flexWrap: "wrap", alignItems: "center", gap: 12 }, children: [_jsx(Link, { to: "/items/new/manual", style: { color: "#fff", textDecoration: "underline", fontSize: 14 }, children: "Prefere sem IA? Ir para cadastro manual" }), images.length > 0 && (_jsx("button", { type: "button", onClick: continueFromCameraToReview, style: {
                                            background: "rgba(255,255,255,0.2)",
                                            border: "1px solid rgba(255,255,255,0.45)",
                                            color: "#fff",
                                            borderRadius: 999,
                                            padding: "8px 16px",
                                            fontSize: 14,
                                            fontWeight: 700,
                                            cursor: "pointer"
                                        }, children: "Revisar fotos" }))] }), needsVideoActivation && (_jsx("div", { children: _jsx(Button, { type: "button", onClick: () => void activateVideoPreview(), children: "Toque para ativar c\u00E2mera" }) }))] }), _jsxs("div", { style: { position: "relative", flex: 1, overflow: "hidden" }, children: [_jsx("div", { style: {
                                    position: "absolute",
                                    top: 12,
                                    right: 12,
                                    zIndex: 55,
                                    fontSize: 15,
                                    fontWeight: 800,
                                    padding: "8px 14px",
                                    borderRadius: 12,
                                    background: "rgba(0,0,0,0.55)",
                                    color: "#fff",
                                    border: "1px solid rgba(255,255,255,0.25)",
                                    pointerEvents: "none"
                                }, children: formatPhotoCountLabel(images.length) }), _jsx("video", { ref: videoRef, playsInline: true, muted: true, style: { width: "100%", height: "100%", objectFit: "cover" } }), _jsx("div", { style: {
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
                        }, children: [_jsxs("div", { style: { display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }, children: [images.length > 0 ? (_jsx("img", { src: images[images.length - 1], alt: "\u00DAltima foto capturada", style: {
                                            width: 56,
                                            height: 56,
                                            borderRadius: 12,
                                            objectFit: "cover",
                                            border: "2px solid rgba(255,255,255,0.45)",
                                            boxShadow: "0 4px 12px rgba(0,0,0,0.35)"
                                        } })) : (_jsx("span", { style: { width: 56, height: 56 }, "aria-hidden": true })), _jsx("button", { type: "button", onClick: () => galleryInputRef.current?.click(), style: {
                                            background: "rgba(255,255,255,0.12)",
                                            border: "1px solid rgba(255,255,255,0.25)",
                                            color: "#fff",
                                            borderRadius: 999,
                                            width: 56,
                                            height: 56,
                                            cursor: "pointer"
                                        }, title: "Galeria", "aria-label": "Escolher foto da galeria", children: "\uD83D\uDDBC" })] }), _jsx("button", { type: "button", onClick: () => void captureFromVideo(), style: {
                                    width: 76,
                                    height: 76,
                                    borderRadius: "50%",
                                    border: "3px solid #fff",
                                    background: "radial-gradient(circle, #b60e3d 62%, transparent 63%)",
                                    cursor: "pointer",
                                    transform: shutterPressed ? "scale(0.94)" : "scale(1)",
                                    transition: "transform 120ms ease-out"
                                }, "aria-label": "Capturar foto" }), images.length > 0 ? (_jsx("button", { type: "button", onClick: continueFromCameraToReview, style: {
                                    background: "rgba(255,255,255,0.12)",
                                    border: "1px solid rgba(255,255,255,0.25)",
                                    color: "#fff",
                                    borderRadius: 999,
                                    padding: "10px 16px",
                                    fontSize: 13,
                                    fontWeight: 700,
                                    cursor: "pointer",
                                    maxWidth: 120,
                                    lineHeight: 1.2
                                }, children: "Revisar fotos" })) : (_jsx("span", { style: { width: 120 }, "aria-hidden": true }))] })] }))] }));
};
