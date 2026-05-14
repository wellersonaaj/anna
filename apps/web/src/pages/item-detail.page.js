import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { Link, useParams } from "react-router-dom";
import { z } from "zod";
import { addItemFoto, analisarItemFoto, deleteItemFoto, getItem, joinItemFila, leaveItemFila, setItemCoverFoto, updateItem, updateItemStatus } from "../api/items";
import { ClientPicker } from "../components/client-picker";
import { FotoAiSuggestionsCard } from "../components/foto-ai-suggestions";
import { ApiError } from "../api/client";
import { useSessionStore } from "../store/session.store";
import { AppShell, Button, Field, Input, ItemStatusTone, PhotoLightbox, Section, Select } from "../components/ui";
const fotoFormSchema = z.object({
    url: z.string().trim().url("Informe uma URL válida (http ou https).")
});
const filaFormSchema = z
    .object({
    nome: z.string().trim().min(2),
    whatsapp: z.string().optional(),
    instagram: z.string().optional()
})
    .superRefine((data, ctx) => {
    const w = data.whatsapp?.replace(/\s/g, "") ?? "";
    const i = data.instagram?.replace(/^@+/, "").trim() ?? "";
    if (!w && !i) {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "Informe WhatsApp ou Instagram.",
            path: ["whatsapp"]
        });
    }
});
const editFormSchema = z.object({
    nome: z.string().trim().min(2, "Informe o nome."),
    categoria: z.enum(["ROUPA_FEMININA", "ROUPA_MASCULINA", "CALCADO", "ACESSORIO"]),
    subcategoria: z.string().trim().min(2, "Informe a subcategoria."),
    cor: z.string().trim().min(2, "Informe a cor."),
    estampa: z.boolean(),
    condicao: z.enum(["OTIMO", "BOM", "REGULAR"]),
    tamanho: z.string().trim().min(1, "Informe o tamanho."),
    marca: z.string().optional(),
    precoVenda: z.string().optional(),
    acervoTipo: z.enum(["PROPRIO", "CONSIGNACAO"]),
    acervoNome: z.string().optional()
});
const needsAdjustFieldsForFila = (data) => {
    const nomeOk = data.nome.trim().length >= 2;
    const w = data.whatsapp?.replace(/\s/g, "") ?? "";
    const i = data.instagram?.replace(/^@+/, "").trim() ?? "";
    return !nomeOk || (!w && !i);
};
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
    const parsed = Number(raw.replace(",", "."));
    return Number.isNaN(parsed) ? null : parsed;
};
const precoInputValue = (value) => {
    if (value === null || value === undefined || value === "") {
        return "";
    }
    return String(value).replace(",", ".");
};
export const ItemDetailPage = () => {
    const { itemId } = useParams();
    const brechoId = useSessionStore((state) => state.brechoId);
    const queryClient = useQueryClient();
    const [editing, setEditing] = useState(false);
    const [lightboxIndex, setLightboxIndex] = useState(null);
    const [showAdjustFilaFields, setShowAdjustFilaFields] = useState(false);
    const itemQuery = useQuery({
        queryKey: ["item", brechoId, itemId],
        queryFn: () => getItem(brechoId, itemId),
        enabled: Boolean(itemId)
    });
    const fotoForm = useForm({
        resolver: zodResolver(fotoFormSchema),
        defaultValues: { url: "" }
    });
    const filaForm = useForm({
        resolver: zodResolver(filaFormSchema),
        defaultValues: { nome: "", whatsapp: "", instagram: "" }
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
    const filaContact = {
        nome: filaForm.watch("nome") ?? "",
        whatsapp: filaForm.watch("whatsapp") ?? "",
        instagram: filaForm.watch("instagram") ?? ""
    };
    const fillFilaContact = (cliente) => {
        filaForm.setValue("nome", cliente.nome, { shouldValidate: true, shouldDirty: true });
        filaForm.setValue("whatsapp", cliente.whatsapp ?? "", { shouldValidate: true, shouldDirty: true });
        filaForm.setValue("instagram", cliente.instagram ?? "", { shouldValidate: true, shouldDirty: true });
    };
    const hasFilaContact = Boolean(filaContact.nome.trim()) ||
        Boolean(filaContact.whatsapp.trim()) ||
        Boolean(filaContact.instagram.trim());
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
            tamanho: item.tamanho,
            marca: item.marca ?? "",
            precoVenda: precoInputValue(item.precoVenda),
            acervoTipo: item.acervoTipo,
            acervoNome: item.acervoNome ?? ""
        });
    }, [editForm, item]);
    const invalidateItem = async () => {
        await queryClient.invalidateQueries({ queryKey: ["item", brechoId, itemId] });
        await queryClient.invalidateQueries({ queryKey: ["items", brechoId] });
    };
    const addFotoMutation = useMutation({
        mutationFn: (url) => addItemFoto(brechoId, itemId, { url }),
        onSuccess: async () => {
            await invalidateItem();
            fotoForm.reset();
        }
    });
    const deleteFotoMutation = useMutation({
        mutationFn: (fotoId) => deleteItemFoto(brechoId, itemId, fotoId),
        onSuccess: invalidateItem
    });
    const setCoverMutation = useMutation({
        mutationFn: (fotoId) => setItemCoverFoto(brechoId, itemId, fotoId),
        onSuccess: invalidateItem
    });
    const analyzeFotoMutation = useMutation({
        mutationFn: (fotoId) => analisarItemFoto(brechoId, itemId, fotoId),
        onSuccess: invalidateItem
    });
    const joinFilaMutation = useMutation({
        mutationFn: (data) => joinItemFila(brechoId, itemId, {
            cliente: {
                nome: data.nome,
                whatsapp: data.whatsapp?.trim() || undefined,
                instagram: data.instagram?.trim() || undefined
            }
        }),
        onSuccess: async () => {
            await invalidateItem();
            filaForm.reset();
            setShowAdjustFilaFields(false);
        }
    });
    const leaveFilaMutation = useMutation({
        mutationFn: (entradaId) => leaveItemFila(brechoId, itemId, entradaId),
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
            tamanho: data.tamanho,
            marca: data.marca ?? "",
            precoVenda: parsePreco(data.precoVenda),
            acervoTipo: data.acervoTipo,
            acervoNome: data.acervoNome?.trim() || null
        }),
        onSuccess: async () => {
            await invalidateItem();
            setEditing(false);
        }
    });
    const statusMutation = useMutation({
        mutationFn: (status) => updateItemStatus(brechoId, itemId, status),
        onSuccess: invalidateItem
    });
    if (!itemId) {
        return (_jsxs(AppShell, { children: [_jsx("p", { children: "Pe\u00E7a n\u00E3o encontrada." }), _jsx(Link, { to: "/", children: "Voltar" })] }));
    }
    return (_jsxs(AppShell, { children: [_jsx(Link, { to: "/", children: "\u2190 Estoque" }), itemQuery.isLoading && _jsx("p", { children: "Carregando..." }), itemQuery.isError && _jsx("p", { children: "N\u00E3o foi poss\u00EDvel carregar a pe\u00E7a." }), item && (_jsxs(_Fragment, { children: [_jsxs("header", { className: "rounded-3xl border border-rose-100 bg-white p-4 shadow-sm", children: [_jsxs("div", { className: "flex items-start justify-between gap-3", children: [_jsxs("div", { children: [_jsx(ItemStatusTone, { status: item.status }), _jsx("h1", { className: "mt-2 font-headline text-3xl font-extrabold tracking-tight", children: item.nome }), _jsxs("p", { className: "mt-1 text-sm text-on-surface-variant", children: [categoriaLabels[item.categoria], " \u00B7 ", item.subcategoria] })] }), _jsx("button", { type: "button", onClick: () => setEditing((value) => !value), className: "rounded-full border border-rose-100 bg-white px-3 py-2 text-sm font-bold text-primary", "aria-label": "Editar pe\u00E7a", children: "\u270E" })] }), _jsxs("div", { className: "mt-4 flex flex-wrap gap-2", children: [canSell && (_jsx(Link, { to: `/sell/${item.id}`, className: "inline-flex h-10 items-center rounded-xl bg-primary px-4 text-sm font-bold text-white", children: "Vender" })), canQueue && (_jsx(Link, { to: `/reserve/${item.id}`, className: "inline-flex h-10 items-center rounded-xl border border-primary px-4 text-sm font-bold text-primary", children: item.status === "RESERVADO" ? "Adicionar à fila" : "Reservar" })), (item.status === "DISPONIVEL" || item.status === "RESERVADO") && (_jsx(Button, { type: "button", className: "bg-zinc-700", disabled: statusMutation.isPending, onClick: () => statusMutation.mutate("INDISPONIVEL"), children: "Tornar indispon\u00EDvel" })), item.status === "INDISPONIVEL" && (_jsx(Button, { type: "button", disabled: statusMutation.isPending, onClick: () => statusMutation.mutate("DISPONIVEL"), children: "Tornar dispon\u00EDvel" }))] })] }), _jsx(Section, { title: "Cadastro da pe\u00E7a", children: editing ? (_jsxs("form", { className: "grid gap-3 md:grid-cols-2", onSubmit: editForm.handleSubmit((data) => updateMutation.mutate(data)), children: [_jsx(Field, { label: "Nome", children: _jsx(Input, { ...editForm.register("nome") }) }), _jsx(Field, { label: "Pre\u00E7o (R$)", children: _jsx(Input, { type: "number", step: "0.01", min: 0, ...editForm.register("precoVenda") }) }), _jsx(Field, { label: "Categoria", children: _jsx(Select, { ...editForm.register("categoria"), children: Object.entries(categoriaLabels).map(([value, label]) => (_jsx("option", { value: value, children: label }, value))) }) }), _jsx(Field, { label: "Subcategoria", children: _jsx(Input, { ...editForm.register("subcategoria") }) }), _jsx(Field, { label: "Cor", children: _jsx(Input, { ...editForm.register("cor") }) }), _jsx(Field, { label: "Tamanho", children: _jsx(Input, { ...editForm.register("tamanho") }) }), _jsx(Field, { label: "Condi\u00E7\u00E3o", children: _jsx(Select, { ...editForm.register("condicao"), children: Object.entries(condicaoLabels).map(([value, label]) => (_jsx("option", { value: value, children: label }, value))) }) }), _jsx(Field, { label: "Marca", children: _jsx(Input, { ...editForm.register("marca") }) }), _jsx(Field, { label: "Acervo", children: _jsxs(Select, { ...editForm.register("acervoTipo"), children: [_jsx("option", { value: "PROPRIO", children: "Pr\u00F3prio" }), _jsx("option", { value: "CONSIGNACAO", children: "Consigna\u00E7\u00E3o" })] }) }), _jsx(Field, { label: "Nome do acervo/consignante", children: _jsx(Input, { ...editForm.register("acervoNome") }) }), _jsxs("label", { className: "flex items-center gap-2 text-sm font-semibold text-on-surface-variant", children: [_jsx("input", { type: "checkbox", ...editForm.register("estampa") }), "Pe\u00E7a estampada"] }), _jsxs("div", { className: "flex gap-2 md:col-span-2", children: [_jsx(Button, { type: "submit", disabled: updateMutation.isPending, children: updateMutation.isPending ? "Salvando..." : "Salvar alterações" }), _jsx("button", { type: "button", className: "rounded-xl border border-rose-100 px-4 text-sm font-bold text-on-surface-variant", onClick: () => setEditing(false), children: "Cancelar" })] }), updateMutation.isError && (_jsx("small", { className: "text-primary md:col-span-2", children: updateMutation.error instanceof ApiError
                                        ? updateMutation.error.message
                                        : "Não foi possível salvar a peça." }))] })) : (_jsxs("dl", { className: "grid grid-cols-2 gap-3 text-sm", children: [_jsxs("div", { children: [_jsx("dt", { className: "font-bold text-on-surface-variant", children: "Pre\u00E7o" }), _jsx("dd", { children: item.precoVenda ? `R$ ${String(item.precoVenda).replace(".", ",")}` : "Preço a confirmar" })] }), _jsxs("div", { children: [_jsx("dt", { className: "font-bold text-on-surface-variant", children: "Condi\u00E7\u00E3o" }), _jsx("dd", { children: condicaoLabels[item.condicao] })] }), _jsxs("div", { children: [_jsx("dt", { className: "font-bold text-on-surface-variant", children: "Cor" }), _jsx("dd", { children: item.cor })] }), _jsxs("div", { children: [_jsx("dt", { className: "font-bold text-on-surface-variant", children: "Tamanho" }), _jsx("dd", { children: item.tamanho })] }), _jsxs("div", { children: [_jsx("dt", { className: "font-bold text-on-surface-variant", children: "Marca" }), _jsx("dd", { children: item.marca || "Sem marca" })] }), _jsxs("div", { children: [_jsx("dt", { className: "font-bold text-on-surface-variant", children: "Estampa" }), _jsx("dd", { children: item.estampa ? "Sim" : "Não" })] }), _jsxs("div", { children: [_jsx("dt", { className: "font-bold text-on-surface-variant", children: "Acervo" }), _jsx("dd", { children: item.acervoTipo === "CONSIGNACAO" ? "Consignação" : "Próprio" })] }), _jsxs("div", { children: [_jsx("dt", { className: "font-bold text-on-surface-variant", children: "Nome do acervo" }), _jsx("dd", { children: item.acervoNome || "Não informado" })] })] })) }), _jsxs(Section, { title: "Fotos", children: [_jsxs("p", { className: "mt-0 text-sm text-on-surface-variant", children: [_jsx(Link, { to: `/items/${item.id}/fotos/upload`, children: "Enviar fotos (c\u00E2mera, galeria, nota em texto ou voz)" }), " · ", "Ou cole uma URL p\u00FAblica abaixo."] }), _jsxs("form", { className: "stack", style: { gap: 12, marginBottom: 16 }, onSubmit: fotoForm.handleSubmit((data) => addFotoMutation.mutate(data.url)), children: [_jsx(Field, { label: "URL da imagem", children: _jsx(Input, { ...fotoForm.register("url"), placeholder: "https://..." }) }), fotoForm.formState.errors.url && (_jsx("small", { style: { color: "#b60e3d" }, children: fotoForm.formState.errors.url.message })), _jsx(Button, { type: "submit", disabled: addFotoMutation.isPending, children: addFotoMutation.isPending ? "Adicionando..." : "Adicionar foto" }), addFotoMutation.isError && (_jsx("small", { style: { color: "#b60e3d" }, children: addFotoMutation.error instanceof ApiError
                                            ? addFotoMutation.error.message
                                            : "Não foi possível adicionar a foto." }))] }), _jsx("div", { className: "grid gap-3", children: (item.fotos ?? []).length === 0 ? (_jsx("p", { style: { opacity: 0.8 }, children: "Nenhuma foto ainda." })) : ((item.fotos ?? []).map((foto, index) => {
                                    const latestAi = foto.aiAnalyses?.[0];
                                    return (_jsxs("div", { className: "rounded-2xl border border-rose-100 bg-white p-3", children: [_jsxs("div", { className: "flex items-center gap-3", children: [_jsxs("div", { className: "relative", children: [_jsx("button", { type: "button", onClick: () => setLightboxIndex(index), className: "cursor-zoom-in overflow-hidden rounded-xl p-0", "aria-label": "Ampliar foto", children: _jsx("img", { src: foto.thumbnailUrl ?? foto.url, alt: `Foto da peça ${item.nome}`, className: "h-24 w-24 object-cover" }) }), foto.isCover && (_jsx("span", { className: "absolute left-1 top-1 rounded-full bg-white/90 px-2 py-0.5 text-[10px] font-bold text-primary shadow-sm", children: "Capa" }))] }), _jsxs("div", { className: "min-w-0 flex-1 text-sm", children: [_jsx("a", { href: foto.url, target: "_blank", rel: "noreferrer", children: "Abrir original" }), _jsxs("div", { className: "text-on-surface-variant", children: ["Ordem ", foto.ordem] }), !foto.isCover && (_jsx("button", { type: "button", className: "mt-1 text-xs font-bold text-primary underline disabled:opacity-60", disabled: setCoverMutation.isPending, onClick: () => setCoverMutation.mutate(foto.id), children: "Definir como capa" }))] }), _jsxs("div", { className: "flex flex-col gap-2", children: [!latestAi && (_jsx(Button, { type: "button", onClick: () => analyzeFotoMutation.mutate(foto.id), disabled: analyzeFotoMutation.isPending, children: analyzeFotoMutation.isPending && analyzeFotoMutation.variables === foto.id
                                                                    ? "Analisando..."
                                                                    : "Sugerir com IA" })), _jsx(Button, { type: "button", className: "bg-zinc-700", onClick: () => deleteFotoMutation.mutate(foto.id), disabled: deleteFotoMutation.isPending, children: "Remover" })] })] }), analyzeFotoMutation.isError && analyzeFotoMutation.variables === foto.id && (_jsx("small", { style: { color: "#b60e3d" }, children: analyzeFotoMutation.error instanceof ApiError
                                                    ? analyzeFotoMutation.error.message
                                                    : "Não foi possível analisar a foto." })), latestAi && _jsx(FotoAiSuggestionsCard, { analysis: latestAi })] }, foto.id));
                                })) })] }), _jsxs(Section, { title: "Fila de interessados", children: [canQueue ? (_jsxs("form", { className: "grid grid-cols-1 gap-3", style: { marginBottom: 16 }, onSubmit: filaForm.handleSubmit((data) => joinFilaMutation.mutate(data)), children: [_jsx(ClientPicker, { brechoId: brechoId, selectedContact: filaContact, onSelect: (cliente) => {
                                            fillFilaContact(cliente);
                                            setShowAdjustFilaFields(needsAdjustFieldsForFila(cliente));
                                        }, onCreateNew: (cliente) => {
                                            fillFilaContact(cliente);
                                            setShowAdjustFilaFields(needsAdjustFieldsForFila(cliente));
                                        }, onClear: () => {
                                            fillFilaContact({ nome: "", whatsapp: "", instagram: "" });
                                            setShowAdjustFilaFields(false);
                                        }, title: "Interessado" }), hasFilaContact && !showAdjustFilaFields && (_jsx("button", { type: "button", className: "w-full rounded-xl border border-rose-100 bg-white py-3 text-sm font-bold text-primary", onClick: () => setShowAdjustFilaFields(true), children: "Ajustar nome, WhatsApp ou Instagram" })), hasFilaContact && showAdjustFilaFields && (_jsx("button", { type: "button", className: "text-sm font-bold text-on-surface-variant underline", onClick: () => setShowAdjustFilaFields(false), children: "Ocultar campos" })), _jsxs("div", { className: hasFilaContact && showAdjustFilaFields ? "grid gap-3" : "hidden", children: [_jsx(Field, { label: "Nome", children: _jsx(Input, { ...filaForm.register("nome") }) }), _jsxs("div", { className: "grid grid-cols-1 gap-3 md:grid-cols-2", children: [_jsx(Field, { label: "WhatsApp", children: _jsx(Input, { ...filaForm.register("whatsapp") }) }), _jsx(Field, { label: "Instagram", children: _jsx(Input, { ...filaForm.register("instagram"), placeholder: "@usuario" }) })] })] }), _jsx(Button, { type: "submit", disabled: joinFilaMutation.isPending, children: joinFilaMutation.isPending
                                            ? "Entrando..."
                                            : item.status === "RESERVADO"
                                                ? "Adicionar à fila"
                                                : "Reservar" }), (filaForm.formState.errors.whatsapp || filaForm.formState.errors.root) && (_jsx("small", { style: { color: "#b60e3d" }, children: filaForm.formState.errors.whatsapp?.message })), joinFilaMutation.isError && (_jsx("small", { style: { color: "#b60e3d" }, children: joinFilaMutation.error instanceof ApiError
                                            ? joinFilaMutation.error.message
                                            : "Não foi possível entrar na fila." }))] })) : (_jsx("p", { style: { opacity: 0.85 }, children: "A fila s\u00F3 pode ser gerenciada em pe\u00E7as dispon\u00EDveis ou reservadas." })), _jsx("div", { className: "stack", style: { gap: 8 }, children: (item.filaInteressados ?? []).length === 0 ? (_jsx("p", { style: { opacity: 0.8 }, children: "Ningu\u00E9m na fila." })) : ((item.filaInteressados ?? []).map((e) => (_jsxs("div", { className: "card", style: { display: "flex", justifyContent: "space-between", alignItems: "center" }, children: [_jsxs("div", { children: [_jsxs("strong", { children: [e.posicao + 1, "\u00BA \u2014 ", e.cliente.nome] }), e.posicao === 0 && item.status === "RESERVADO" && (_jsx("span", { className: "ml-2 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-700", children: "Reserva ativa" })), _jsx("div", { style: { fontSize: 13, opacity: 0.85 }, children: [e.cliente.whatsapp, e.cliente.instagram].filter(Boolean).join(" · ") || "Sem contato" })] }), _jsx(Button, { type: "button", onClick: () => leaveFilaMutation.mutate(e.id), disabled: leaveFilaMutation.isPending, children: "Remover" })] }, e.id)))) })] })] })), lightboxIndex !== null && photos.length > 0 && (_jsx(PhotoLightbox, { photos: photos, initialIndex: lightboxIndex, title: item?.nome ?? "Fotos da peça", coverPhotoId: coverPhotoId, onSetCover: (photoId) => setCoverMutation.mutate(photoId), setCoverPending: setCoverMutation.isPending, onClose: () => setLightboxIndex(null) }))] }));
};
