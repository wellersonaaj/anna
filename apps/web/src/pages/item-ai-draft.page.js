import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { addItemFoto, analisarFotoRascunho, createFotoLote, createItem, enviarFeedbackRascunho, listAcervoSuggestions, presignFotoLoteUpload, putToPresignedUrl } from "../api/items";
import { ApiError } from "../api/client";
import { AppShell, Button, Field, Input, Section, Select } from "../components/ui";
import { resizeImageToJpeg } from "../lib/imageResize";
import { useSessionStore } from "../store/session.store";
import { useItemAIDraftStore } from "../store/item-ai-draft.store";
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
export const ItemAIDraftPage = () => {
    const brechoId = useSessionStore((state) => state.brechoId);
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const cameraInputRef = useRef(null);
    const galleryInputRef = useRef(null);
    const [actionError, setActionError] = useState(null);
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
    const handleImagePicked = async (fileList) => {
        if (!fileList?.length) {
            return;
        }
        try {
            const availableSlots = Math.max(0, 5 - images.length);
            const files = Array.from(fileList).slice(0, availableSlots);
            for (const file of files) {
                const jpeg = await resizeImageToJpeg(file);
                const dataUrl = await toDataUrl(jpeg);
                addImageDataUrl(dataUrl);
            }
            setActionError(null);
        }
        catch (error) {
            setActionError(error instanceof Error ? error.message : "Não foi possível preparar a imagem.");
        }
    };
    const analyzeMutation = useMutation({
        mutationFn: async () => {
            if (images.length === 0) {
                throw new Error("Selecione ao menos 1 foto para analisar.");
            }
            const parsedImages = images.map((imageDataUrl) => parseDataUrl(imageDataUrl));
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
            resetDraft();
            navigate(`/items/${itemId}`);
        },
        onError: (error) => {
            setActionError(error instanceof ApiError ? error.message : String(error));
        }
    });
    const feedbackMutation = useMutation({
        mutationFn: (helpfulness) => {
            if (!pendingFeedback) {
                throw new Error("Feedback indisponível.");
            }
            return enviarFeedbackRascunho(brechoId, pendingFeedback.analysisId, {
                helpfulness,
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
            resetDraft();
            navigate(`/items/${itemId}`);
        },
        onError: (error) => {
            setActionError(error instanceof ApiError ? error.message : "Não foi possível salvar o feedback.");
        }
    });
    return (_jsxs(AppShell, { children: [_jsx(Link, { to: "/", children: "\u2190 Voltar ao estoque" }), _jsxs("header", { children: [_jsx("h1", { style: { marginBottom: 4 }, children: "Cadastrar com IA" }), _jsx("p", { style: { marginTop: 0, opacity: 0.85 }, children: "Envie uma foto, opcionalmente descreva o contexto, revise os campos e conclua." })] }), actionError && (_jsx("p", { style: { color: "#b60e3d", fontSize: 14 }, role: "alert", children: actionError })), pendingFeedback && (_jsxs(Section, { title: "3. A sugest\u00E3o da IA ajudou?", children: [_jsx("p", { style: { margin: 0, opacity: 0.9 }, children: "Seu toque ajuda o app a aprender com as corre\u00E7\u00F5es reais do cadastro." }), _jsxs("div", { style: { display: "flex", gap: 8, flexWrap: "wrap" }, children: [_jsx(Button, { type: "button", disabled: feedbackMutation.isPending, onClick: () => feedbackMutation.mutate("SIM"), children: "Sim" }), _jsx(Button, { type: "button", disabled: feedbackMutation.isPending, onClick: () => feedbackMutation.mutate("PARCIAL"), children: "Parcial" }), _jsx(Button, { type: "button", disabled: feedbackMutation.isPending, onClick: () => feedbackMutation.mutate("NAO"), children: "N\u00E3o" })] })] })), _jsx(Section, { title: "1. Foto e contexto", children: _jsxs("div", { className: "stack", style: { gap: 10 }, children: [_jsxs("div", { style: { display: "flex", gap: 8, flexWrap: "wrap" }, children: [_jsx(Button, { type: "button", onClick: () => cameraInputRef.current?.click(), disabled: images.length >= 5, children: "Tirar foto" }), _jsx(Button, { type: "button", onClick: () => galleryInputRef.current?.click(), disabled: images.length >= 5, children: "Escolher da galeria" }), images.length > 0 && (_jsx(Button, { type: "button", onClick: clearImages, disabled: analyzeMutation.isPending || submitMutation.isPending, children: "Limpar fotos" }))] }), _jsx("input", { ref: cameraInputRef, type: "file", accept: "image/*", capture: "environment", hidden: true, onChange: (event) => {
                                void handleImagePicked(event.target.files);
                                event.target.value = "";
                            } }), _jsx("input", { ref: galleryInputRef, type: "file", accept: "image/*", multiple: true, hidden: true, onChange: (event) => {
                                void handleImagePicked(event.target.files);
                                event.target.value = "";
                            } }), images.length > 0 ? (_jsxs("div", { className: "stack", style: { gap: 8 }, children: [_jsxs("p", { style: { margin: 0, fontSize: 13, opacity: 0.85 }, children: ["Fotos selecionadas: ", images.length, "/5"] }), _jsx("div", { style: { display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 8 }, children: images.map((imageDataUrl, index) => (_jsxs("div", { style: { position: "relative" }, children: [_jsx("img", { src: imageDataUrl, alt: `Foto ${index + 1}`, style: { width: "100%", height: 150, objectFit: "cover", borderRadius: 10, border: "1px solid #e7d5d6" } }), _jsx("button", { type: "button", onClick: () => removeImageAt(index), style: {
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
                        }, children: [_jsx("strong", { style: { display: "block", marginBottom: 6 }, children: "Sugest\u00F5es da IA aplicadas automaticamente" }), _jsxs("p", { style: { margin: 0 }, children: ["Confian\u00E7a: ", Math.round(analysis.meta.confianca * 100), "% \u00B7 Ambiente: ", analysis.meta.ambienteFoto ?? "—", " \u00B7 Qualidade: ", analysis.meta.qualidadeFoto ?? "—"] }), analysis.warnings.lowConfidence && (_jsx("p", { style: { color: "#7a5a00", margin: "8px 0 0", fontWeight: 600 }, children: "Confian\u00E7a baixa \u2014 revise os campos manualmente." })), analysis.warnings.multiplasPecas && (_jsx("p", { style: { color: "#7a5a00", margin: "8px 0 0", fontWeight: 600 }, children: "V\u00E1rios itens detectados \u2014 resultado pode ser impreciso." }))] })), _jsxs("div", { className: "grid cols-2", children: [_jsx(Field, { label: "Nome", children: _jsx(Input, { value: formValues.nome, onChange: (event) => setFormField("nome", event.target.value) }) }), _jsx(Field, { label: "Categoria", children: _jsxs(Select, { value: formValues.categoria, onChange: (event) => setFormField("categoria", event.target.value), children: [_jsx("option", { value: "ROUPA_FEMININA", children: "Roupa feminina" }), _jsx("option", { value: "ROUPA_MASCULINA", children: "Roupa masculina" }), _jsx("option", { value: "CALCADO", children: "Cal\u00E7ado" }), _jsx("option", { value: "ACESSORIO", children: "Acess\u00F3rio" })] }) }), _jsx(Field, { label: "Subcategoria", children: _jsx(Input, { value: formValues.subcategoria, onChange: (event) => setFormField("subcategoria", event.target.value), placeholder: "Ex.: vestido, saia, t\u00EAnis..." }) }), _jsx(Field, { label: "Cor", children: _jsx(Input, { value: formValues.cor, onChange: (event) => setFormField("cor", event.target.value) }) }), _jsx(Field, { label: "Condi\u00E7\u00E3o", children: _jsxs(Select, { value: formValues.condicao, onChange: (event) => setFormField("condicao", event.target.value), children: [_jsx("option", { value: "OTIMO", children: "\u00D3timo" }), _jsx("option", { value: "BOM", children: "Bom" }), _jsx("option", { value: "REGULAR", children: "Regular" })] }) }), _jsx(Field, { label: "Tamanho", children: _jsx(Input, { value: formValues.tamanho, onChange: (event) => setFormField("tamanho", event.target.value) }) }), _jsx(Field, { label: "Marca", children: _jsx(Input, { value: formValues.marca, onChange: (event) => setFormField("marca", event.target.value) }) }), _jsx(Field, { label: "Pre\u00E7o venda", children: _jsx(Input, { type: "number", step: "0.01", value: formValues.precoVenda, onChange: (event) => setFormField("precoVenda", event.target.value) }) }), _jsx(Field, { label: "Acervo", children: _jsxs(Select, { value: formValues.acervoTipo, onChange: (event) => setFormField("acervoTipo", event.target.value), children: [_jsx("option", { value: "PROPRIO", children: "Pr\u00F3prio" }), _jsx("option", { value: "CONSIGNACAO", children: "Consigna\u00E7\u00E3o" })] }) }), _jsxs(Field, { label: "Nome do acervo", children: [_jsx(Input, { list: "acervo-suggestions-ai-draft", value: formValues.acervoNome, onChange: (event) => setFormField("acervoNome", event.target.value) }), _jsx("datalist", { id: "acervo-suggestions-ai-draft", children: acervoSuggestionsQuery.data?.map((suggestion) => (_jsx("option", { value: suggestion }, suggestion))) })] }), _jsx(Field, { label: "Tem estampa?", children: _jsx("input", { type: "checkbox", checked: formValues.estampa, onChange: (event) => setFormField("estampa", event.target.checked) }) })] }), _jsxs("div", { className: "stack", style: { marginTop: 12, gap: 8 }, children: [_jsx(Button, { type: "button", onClick: () => submitMutation.mutate(), disabled: requiredMissing.length > 0 || submitMutation.isPending, children: submitMutation.isPending ? "Concluindo cadastro..." : "Concluir cadastro" }), requiredMissing.length > 0 && (_jsxs("small", { style: { color: "#8b2f2f" }, children: ["Obrigat\u00F3rios pendentes: ", requiredMissing.join(", "), "."] }))] })] })] }));
};
