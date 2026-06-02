import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { Link, useParams } from "react-router-dom";
import { z } from "zod";
import { addItemFoto, createFotoLote, deleteItemFoto, getItem, presignFotoLoteUpload, putToPresignedUrl, setItemCoverFoto, updateItem, updateItemStatus } from "../api/items";
import { createFilaLink } from "../api/public-queue";
import { FotoAiSuggestionsCard } from "../components/foto-ai-suggestions";
import { ApiError } from "../api/client";
import { applyApiFormErrors, getApiErrorMessage } from "../lib/api-form-errors";
import { useSessionStore } from "../store/session.store";
import { AppShell, Button, Field, Input, ItemStatusTone, PhotoLightbox, Section, Select } from "../components/ui";
import { resizeImageDetailed } from "../lib/imageResize";
import { moneyInputValue, parseMoneyLike } from "../lib/money";
const MAX_PHOTOS = 30;
const editFormSchema = z.object({
    nome: z.string().trim().min(2, "Informe o nome."),
    categoria: z.enum(["ROUPA_FEMININA", "ROUPA_MASCULINA", "CALCADO", "ACESSORIO"]),
    subcategoria: z.string().trim().min(2, "Informe a subcategoria."),
    cor: z.string().trim().min(2, "Informe a cor."),
    estampa: z.boolean(),
    condicao: z.enum(["OTIMO", "BOM", "REGULAR"]),
    tamanho: z.string().trim().optional(),
    marca: z.string().optional(),
    precoVenda: z.string().optional(),
    acervoTipo: z.enum(["PROPRIO", "CONSIGNACAO"]),
    acervoNome: z.string().optional()
});
const editFormFields = [
    "nome",
    "categoria",
    "subcategoria",
    "cor",
    "tamanho",
    "marca",
    "precoVenda",
    "acervoTipo",
    "acervoNome",
    "estampa",
    "condicao"
];
const categoriaLabels = {
    ROUPA_FEMININA: "Roupa feminina",
    ROUPA_MASCULINA: "Roupa masculina",
    CALCADO: "Calçado",
    ACESSORIO: "Acessório"
};
const condicaoLabels = {
    OTIMO: "Ótimo",
    BOM: "Bom",
    REGULAR: "Regular"
};
const parsePreco = (value) => {
    const raw = value?.trim();
    if (!raw) {
        return null;
    }
    const parsed = parseMoneyLike(raw);
    return Number.isNaN(parsed) ? null : parsed;
};
const precoInputValue = (value) => {
    return moneyInputValue(value);
};
export const ItemDetailPage = () => {
    const { itemId } = useParams();
    const brechoId = useSessionStore((state) => state.brechoId);
    const queryClient = useQueryClient();
    const [editing, setEditing] = useState(false);
    const [filaLinkCopied, setFilaLinkCopied] = useState(false);
    const [lightboxIndex, setLightboxIndex] = useState(null);
    const [photoModalOpen, setPhotoModalOpen] = useState(false);
    const [uploadLoteId, setUploadLoteId] = useState(null);
    const [photoActionError, setPhotoActionError] = useState(null);
    const [photoUploadHint, setPhotoUploadHint] = useState(null);
    const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
    const galleryInputRef = useRef(null);
    const cameraInputRef = useRef(null);
    const pasteBoxRef = useRef(null);
    const itemQuery = useQuery({
        queryKey: ["item", brechoId, itemId],
        queryFn: () => getItem(brechoId, itemId),
        enabled: Boolean(itemId)
    });
    const editForm = useForm({
        resolver: zodResolver(editFormSchema),
        defaultValues: {
            nome: "",
            categoria: "ROUPA_FEMININA",
            subcategoria: "",
            cor: "",
            estampa: false,
            condicao: "BOM",
            tamanho: "",
            marca: "",
            precoVenda: "",
            acervoTipo: "PROPRIO",
            acervoNome: ""
        }
    });
    const item = itemQuery.data;
    const photos = useMemo(() => (item?.fotos ?? []).map((foto) => ({
        id: foto.id,
        url: foto.url,
        thumbnailUrl: foto.thumbnailUrl ?? undefined,
        alt: `Foto da peça ${item?.nome ?? ""}`
    })), [item?.fotos, item?.nome]);
    const canQueue = item?.status === "DISPONIVEL" || item?.status === "RESERVADO";
    const canSell = item?.status === "DISPONIVEL" || item?.status === "RESERVADO";
    const coverPhotoId = item?.fotos?.find((foto) => foto.isCover)?.id ?? null;
    useEffect(() => {
        if (!item) {
            return;
        }
        editForm.reset({
            nome: item.nome,
            categoria: item.categoria,
            subcategoria: item.subcategoria,
            cor: item.cor,
            estampa: item.estampa,
            condicao: item.condicao,
            tamanho: item.tamanho && item.tamanho !== "NA" ? item.tamanho : "",
            marca: item.marca ?? "",
            precoVenda: precoInputValue(item.precoVenda),
            acervoTipo: item.acervoTipo,
            acervoNome: item.acervoNome ?? ""
        });
    }, [editForm, item]);
    useEffect(() => {
        setUploadLoteId(null);
    }, [itemId]);
    useEffect(() => {
        if (!photoModalOpen) {
            return;
        }
        const timer = window.setTimeout(() => {
            pasteBoxRef.current?.focus();
        }, 0);
        return () => window.clearTimeout(timer);
    }, [photoModalOpen]);
    const invalidateItem = async () => {
        await queryClient.invalidateQueries({ queryKey: ["item", brechoId, itemId] });
        await queryClient.invalidateQueries({ queryKey: ["items", brechoId] });
    };
    const addFotoMutation = useMutation({
        mutationFn: (payload) => addItemFoto(brechoId, itemId, payload)
    });
    const deleteFotoMutation = useMutation({
        mutationFn: (fotoId) => deleteItemFoto(brechoId, itemId, fotoId),
        onSuccess: invalidateItem
    });
    const setCoverMutation = useMutation({
        mutationFn: (fotoId) => setItemCoverFoto(brechoId, itemId, fotoId),
        onSuccess: invalidateItem
    });
    const updateMutation = useMutation({
        mutationFn: (data) => updateItem(brechoId, itemId, {
            nome: data.nome,
            categoria: data.categoria,
            subcategoria: data.subcategoria,
            cor: data.cor,
            estampa: data.estampa,
            condicao: data.condicao,
            tamanho: data.tamanho?.trim() || "NA",
            marca: data.marca?.trim() || null,
            precoVenda: parsePreco(data.precoVenda),
            acervoTipo: data.acervoTipo,
            acervoNome: data.acervoNome?.trim() || null
        }),
        onSuccess: async () => {
            await invalidateItem();
            setEditing(false);
        },
        onError: (error) => {
            applyApiFormErrors(editForm.setError, error, editFormFields);
        }
    });
    const statusMutation = useMutation({
        mutationFn: (status) => updateItemStatus(brechoId, itemId, status),
        onSuccess: invalidateItem
    });
    const filaLinkMutation = useMutation({
        mutationFn: () => createFilaLink(brechoId, itemId),
        onSuccess: async (result) => {
            await navigator.clipboard.writeText(result.url);
            setFilaLinkCopied(true);
            window.setTimeout(() => setFilaLinkCopied(false), 2500);
        }
    });
    const ensureUploadLoteId = async () => {
        if (uploadLoteId) {
            return uploadLoteId;
        }
        const lote = await createFotoLote(brechoId, itemId, {});
        setUploadLoteId(lote.id);
        return lote.id;
    };
    const uploadResizedPair = async (source, options) => {
        const loteId = await ensureUploadLoteId();
        const [main, thumb] = await Promise.all([
            resizeImageDetailed(source, { maxSide: 1600, quality: 0.78, mime: "image/jpeg" }),
            resizeImageDetailed(source, { maxSide: 360, quality: 0.72, mime: "image/jpeg" })
        ]);
        const signedMain = await presignFotoLoteUpload(brechoId, itemId, loteId, {
            tipo: "imagem",
            contentType: "image/jpeg",
            extensao: "jpeg",
            tamanhoBytes: main.blob.size
        });
        await putToPresignedUrl(signedMain.uploadUrl, main.blob, "image/jpeg");
        const signedThumb = await presignFotoLoteUpload(brechoId, itemId, loteId, {
            tipo: "imagem",
            contentType: "image/jpeg",
            extensao: "jpeg",
            tamanhoBytes: thumb.blob.size
        });
        await putToPresignedUrl(signedThumb.uploadUrl, thumb.blob, "image/jpeg");
        await addFotoMutation.mutateAsync({
            url: signedMain.publicUrl,
            thumbnailUrl: signedThumb.publicUrl,
            thumbnailTamanhoBytes: thumb.blob.size,
            largura: main.width,
            altura: main.height,
            loteId
        });
        if (!options?.skipInvalidate) {
            await invalidateItem();
        }
    };
    const uploadFromFiles = async (files) => {
        if (!files.length) {
            return;
        }
        const currentCount = item?.fotos?.length ?? 0;
        if (currentCount >= MAX_PHOTOS) {
            setPhotoActionError(`Limite de ${MAX_PHOTOS} fotos atingido para esta peça.`);
            return;
        }
        setIsUploadingPhoto(true);
        setPhotoActionError(null);
        setPhotoUploadHint(null);
        let uploaded = 0;
        try {
            for (const file of files) {
                if (currentCount + uploaded >= MAX_PHOTOS) {
                    break;
                }
                await uploadResizedPair(file, { skipInvalidate: true });
                uploaded += 1;
            }
            await invalidateItem();
            if (uploaded > 0) {
                setPhotoUploadHint(uploaded === 1 ? "Foto adicionada." : `${uploaded} fotos adicionadas.`);
            }
            if (uploaded < files.length && currentCount + uploaded >= MAX_PHOTOS) {
                setPhotoActionError(`Limite de ${MAX_PHOTOS} fotos atingido. Algumas fotos não foram enviadas.`);
            }
        }
        catch (error) {
            setPhotoActionError(error instanceof ApiError ? error.message : "Não foi possível enviar a foto.");
        }
        finally {
            setIsUploadingPhoto(false);
        }
    };
    const onGalleryChange = async (event) => {
        const files = event.target.files ? Array.from(event.target.files) : [];
        await uploadFromFiles(files);
        event.target.value = "";
    };
    const onPastePhoto = async (event) => {
        const items = Array.from(event.clipboardData.items ?? []);
        const imageItem = items.find((item) => item.type.startsWith("image/"));
        if (!imageItem) {
            setPhotoActionError("Não encontramos imagem para colar.");
            return;
        }
        event.preventDefault();
        const file = imageItem.getAsFile();
        if (!file) {
            setPhotoActionError("Não foi possível ler a imagem colada.");
            return;
        }
        await uploadFromFiles([file]);
    };
    const openPhotoModal = () => {
        setPhotoModalOpen(true);
        setPhotoActionError(null);
        setPhotoUploadHint(null);
    };
    if (!itemId) {
        return (_jsxs(AppShell, { children: [_jsx("p", { children: "Pe\u00E7a n\u00E3o encontrada." }), _jsx(Link, { to: "/", children: "Voltar" })] }));
    }
    return (_jsxs(AppShell, { children: [_jsx(Link, { to: "/", children: "\u2190 Estoque" }), itemQuery.isLoading && _jsx("p", { children: "Carregando..." }), itemQuery.isError && _jsx("p", { children: "N\u00E3o foi poss\u00EDvel carregar a pe\u00E7a." }), item && (_jsxs(_Fragment, { children: [_jsxs("header", { className: "rounded-3xl border border-rose-100 bg-white p-4 shadow-sm", children: [_jsxs("div", { className: "flex items-start justify-between gap-3", children: [_jsxs("div", { children: [_jsx(ItemStatusTone, { status: item.status }), item.codigo && (_jsx("p", { className: "mt-1 text-xs font-bold uppercase tracking-wider text-primary", children: item.codigo })), _jsx("h1", { className: "mt-2 font-headline text-3xl font-extrabold tracking-tight", children: item.nome }), _jsxs("p", { className: "mt-1 text-sm text-on-surface-variant", children: [categoriaLabels[item.categoria], " \u00B7 ", item.subcategoria] })] }), _jsx("button", { type: "button", onClick: () => setEditing((value) => !value), className: "rounded-full border border-rose-100 bg-white px-3 py-2 text-sm font-bold text-primary", "aria-label": "Editar pe\u00E7a", children: "\u270E" })] }), _jsxs("div", { className: "mt-4 flex flex-wrap gap-2", children: [canSell && (_jsx(Link, { to: `/sell/${item.id}`, className: "inline-flex h-10 items-center rounded-xl bg-primary px-4 text-sm font-bold text-white", children: "Vender" })), canQueue && (_jsx(Link, { to: `/reserve/${item.id}`, className: "inline-flex h-10 items-center rounded-xl border border-primary px-4 text-sm font-bold text-primary", children: item.status === "RESERVADO" ? "Adicionar à fila" : "Reservar" })), canQueue && (_jsx(Button, { type: "button", className: "!h-10 !min-h-0 !bg-white !px-4 !text-primary ring-1 ring-primary", disabled: filaLinkMutation.isPending, onClick: () => filaLinkMutation.mutate(), children: filaLinkCopied ? "Link copiado!" : "Copiar link da fila" })), (item.status === "DISPONIVEL" || item.status === "RESERVADO") && (_jsx(Button, { type: "button", className: "bg-zinc-700", disabled: statusMutation.isPending, onClick: () => statusMutation.mutate("INDISPONIVEL"), children: "Tornar indispon\u00EDvel" })), item.status === "INDISPONIVEL" && (_jsx(Button, { type: "button", disabled: statusMutation.isPending, onClick: () => statusMutation.mutate("DISPONIVEL"), children: "Tornar dispon\u00EDvel" }))] })] }), _jsx(Section, { title: "Cadastro da pe\u00E7a", children: editing ? (_jsxs("form", { className: "grid gap-3 md:grid-cols-2", onSubmit: editForm.handleSubmit((data) => updateMutation.mutate(data)), children: [_jsx(Field, { label: "Nome", error: editForm.formState.errors.nome?.message, children: _jsx(Input, { ...editForm.register("nome") }) }), _jsx(Field, { label: "Pre\u00E7o (R$)", error: editForm.formState.errors.precoVenda?.message, children: _jsx(Input, { type: "number", step: "0.01", min: 0, ...editForm.register("precoVenda") }) }), _jsx(Field, { label: "Categoria", error: editForm.formState.errors.categoria?.message, children: _jsx(Select, { ...editForm.register("categoria"), children: Object.entries(categoriaLabels).map(([value, label]) => (_jsx("option", { value: value, children: label }, value))) }) }), _jsx(Field, { label: "Subcategoria", error: editForm.formState.errors.subcategoria?.message, children: _jsx(Input, { ...editForm.register("subcategoria") }) }), _jsx(Field, { label: "Cor", error: editForm.formState.errors.cor?.message, children: _jsx(Input, { ...editForm.register("cor") }) }), _jsx(Field, { label: "Tamanho", error: editForm.formState.errors.tamanho?.message, children: _jsx(Input, { ...editForm.register("tamanho"), placeholder: "Opcional (vazio = n\u00E3o informado)" }) }), _jsx(Field, { label: "Condi\u00E7\u00E3o", error: editForm.formState.errors.condicao?.message, children: _jsx(Select, { ...editForm.register("condicao"), children: Object.entries(condicaoLabels).map(([value, label]) => (_jsx("option", { value: value, children: label }, value))) }) }), _jsx(Field, { label: "Marca", error: editForm.formState.errors.marca?.message, children: _jsx(Input, { ...editForm.register("marca") }) }), _jsx(Field, { label: "Acervo", error: editForm.formState.errors.acervoTipo?.message, children: _jsxs(Select, { ...editForm.register("acervoTipo"), children: [_jsx("option", { value: "PROPRIO", children: "Pr\u00F3prio" }), _jsx("option", { value: "CONSIGNACAO", children: "Consigna\u00E7\u00E3o" })] }) }), _jsx(Field, { label: "Nome do acervo/consignante", error: editForm.formState.errors.acervoNome?.message, children: _jsx(Input, { ...editForm.register("acervoNome") }) }), _jsxs("label", { className: "flex items-center gap-2 text-sm font-semibold text-on-surface-variant", children: [_jsx("input", { type: "checkbox", ...editForm.register("estampa") }), "Pe\u00E7a estampada"] }), _jsxs("div", { className: "flex gap-2 md:col-span-2", children: [_jsx(Button, { type: "submit", disabled: updateMutation.isPending, children: updateMutation.isPending ? "Salvando..." : "Salvar alterações" }), _jsx("button", { type: "button", className: "rounded-xl border border-rose-100 px-4 text-sm font-bold text-on-surface-variant", onClick: () => setEditing(false), children: "Cancelar" })] }), updateMutation.isError && (_jsx("p", { className: "rounded-2xl bg-red-50 p-3 text-sm font-semibold text-red-700 md:col-span-2", role: "alert", children: getApiErrorMessage(updateMutation.error, "Não foi possível salvar a peça.") }))] })) : (_jsxs("dl", { className: "grid grid-cols-2 gap-3 text-sm", children: [_jsxs("div", { children: [_jsx("dt", { className: "font-bold text-on-surface-variant", children: "Pre\u00E7o" }), _jsx("dd", { children: item.precoVenda ? `R$ ${String(item.precoVenda).replace(".", ",")}` : "Preço a confirmar" })] }), _jsxs("div", { children: [_jsx("dt", { className: "font-bold text-on-surface-variant", children: "Condi\u00E7\u00E3o" }), _jsx("dd", { children: condicaoLabels[item.condicao] })] }), _jsxs("div", { children: [_jsx("dt", { className: "font-bold text-on-surface-variant", children: "Cor" }), _jsx("dd", { children: item.cor })] }), _jsxs("div", { children: [_jsx("dt", { className: "font-bold text-on-surface-variant", children: "Tamanho" }), _jsx("dd", { children: item.tamanho && item.tamanho !== "NA" ? item.tamanho : "—" })] }), _jsxs("div", { children: [_jsx("dt", { className: "font-bold text-on-surface-variant", children: "Marca" }), _jsx("dd", { children: item.marca || "Sem marca" })] }), _jsxs("div", { children: [_jsx("dt", { className: "font-bold text-on-surface-variant", children: "Estampa" }), _jsx("dd", { children: item.estampa ? "Sim" : "Não" })] }), _jsxs("div", { children: [_jsx("dt", { className: "font-bold text-on-surface-variant", children: "Acervo" }), _jsx("dd", { children: item.acervoTipo === "CONSIGNACAO" ? "Consignação" : "Próprio" })] }), _jsxs("div", { children: [_jsx("dt", { className: "font-bold text-on-surface-variant", children: "Nome do acervo" }), _jsx("dd", { children: item.acervoNome || "Não informado" })] })] })) }), _jsxs(Section, { title: "Fotos", children: [_jsx("p", { className: "mt-0 text-sm text-on-surface-variant", children: "Cole uma foto, escolha da galeria ou tire uma nova." }), _jsx("div", { className: "mb-4 flex flex-wrap gap-2", children: _jsx(Button, { type: "button", onClick: openPhotoModal, disabled: isUploadingPhoto, children: isUploadingPhoto ? "Enviando..." : "Adicionar foto" }) }), photoUploadHint && _jsx("small", { style: { color: "#0d6b2e" }, children: photoUploadHint }), photoActionError && _jsx("small", { style: { color: "#b60e3d" }, children: photoActionError }), _jsx("div", { className: "grid gap-3", children: (item.fotos ?? []).length === 0 ? (_jsx("p", { style: { opacity: 0.8 }, children: "Nenhuma foto ainda." })) : ((item.fotos ?? []).map((foto, index) => {
                                    const latestAi = foto.aiAnalyses?.[0];
                                    return (_jsxs("div", { className: "rounded-2xl border border-rose-100 bg-white p-3", children: [_jsxs("div", { className: "flex items-center gap-3", children: [_jsxs("div", { className: "relative", children: [_jsx("button", { type: "button", onClick: () => setLightboxIndex(index), className: "cursor-zoom-in overflow-hidden rounded-xl p-0", "aria-label": "Ampliar foto", children: _jsx("img", { src: foto.thumbnailUrl ?? foto.url, alt: `Foto da peça ${item.nome}`, className: "h-24 w-24 object-cover" }) }), foto.isCover && (_jsx("span", { className: "absolute left-1 top-1 rounded-full bg-white/90 px-2 py-0.5 text-[10px] font-bold text-primary shadow-sm", children: "Capa" }))] }), _jsxs("div", { className: "min-w-0 flex-1 text-sm", children: [_jsx("a", { href: foto.url, target: "_blank", rel: "noreferrer", children: "Abrir original" }), _jsxs("div", { className: "text-on-surface-variant", children: ["Ordem ", foto.ordem] }), !foto.isCover && (_jsx("button", { type: "button", className: "mt-1 text-xs font-bold text-primary underline disabled:opacity-60", disabled: setCoverMutation.isPending, onClick: () => setCoverMutation.mutate(foto.id), children: "Definir como capa" }))] }), _jsx("div", { className: "flex flex-col gap-2", children: _jsx(Button, { type: "button", className: "bg-zinc-700", onClick: () => deleteFotoMutation.mutate(foto.id), disabled: deleteFotoMutation.isPending, children: "Remover" }) })] }), latestAi && _jsx(FotoAiSuggestionsCard, { analysis: latestAi })] }, foto.id));
                                })) })] })] })), photoModalOpen && (_jsxs("div", { className: "fixed inset-0 z-[70] flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-4", children: [_jsx("button", { type: "button", className: "absolute inset-0 cursor-default", "aria-label": "Fechar modal de fotos", onClick: () => setPhotoModalOpen(false) }), _jsxs("div", { className: "relative z-10 w-full rounded-t-3xl border border-rose-100 bg-white p-4 shadow-lg sm:max-w-lg sm:rounded-3xl", children: [_jsxs("div", { className: "mb-3 flex items-center justify-between gap-3", children: [_jsx("h3", { className: "m-0 font-headline text-lg font-extrabold tracking-tight", children: "Adicionar foto" }), _jsx("button", { type: "button", className: "rounded-full border border-rose-100 px-3 py-1 text-xs font-bold text-on-surface-variant", onClick: () => setPhotoModalOpen(false), children: "Fechar" })] }), _jsx("div", { ref: pasteBoxRef, onPaste: (event) => void onPastePhoto(event), tabIndex: 0, role: "button", "aria-label": "\u00C1rea para colar foto", className: "mb-3 rounded-2xl border border-dashed border-rose-200 bg-rose-50/40 p-4 text-sm text-on-surface-variant outline-none focus:border-primary focus:ring-2 focus:ring-primary/20", children: "Cole a foto aqui com Cmd/Ctrl+V." }), _jsxs("div", { className: "grid grid-cols-1 gap-2 sm:grid-cols-2", children: [_jsx(Button, { type: "button", className: "w-full", disabled: isUploadingPhoto, onClick: () => galleryInputRef.current?.click(), children: "Galeria" }), _jsx(Button, { type: "button", className: "w-full bg-zinc-700", disabled: isUploadingPhoto, onClick: () => cameraInputRef.current?.click(), children: "Tirar nova foto" })] }), _jsx("input", { ref: galleryInputRef, type: "file", accept: "image/jpeg,image/png,image/webp", multiple: true, hidden: true, onChange: (event) => void onGalleryChange(event) }), _jsx("input", { ref: cameraInputRef, type: "file", accept: "image/*", capture: "environment", hidden: true, onChange: (event) => void onGalleryChange(event) }), isUploadingPhoto && _jsx("small", { className: "mt-3 block text-on-surface-variant", children: "Enviando foto..." }), photoUploadHint && _jsx("small", { className: "mt-3 block text-[#0d6b2e]", children: photoUploadHint }), photoActionError && _jsx("small", { className: "mt-3 block text-primary", children: photoActionError })] })] })), lightboxIndex !== null && photos.length > 0 && (_jsx(PhotoLightbox, { photos: photos, initialIndex: lightboxIndex, title: item?.nome ?? "Fotos da peça", coverPhotoId: coverPhotoId, onSetCover: (photoId) => setCoverMutation.mutate(photoId), setCoverPending: setCoverMutation.isPending, onClose: () => setLightboxIndex(null) }))] }));
};
