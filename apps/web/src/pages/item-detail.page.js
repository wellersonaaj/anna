import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { Link, useParams } from "react-router-dom";
import { z } from "zod";
import { addItemFoto, analisarItemFoto, deleteItemFoto, getItem, joinItemFila, leaveItemFila } from "../api/items";
import { FotoAiSuggestionsCard } from "../components/foto-ai-suggestions";
import { ApiError } from "../api/client";
import { useSessionStore } from "../store/session.store";
import { AppShell, Button, Field, Input, Section } from "../components/ui";
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
export const ItemDetailPage = () => {
    const { itemId } = useParams();
    const brechoId = useSessionStore((state) => state.brechoId);
    const queryClient = useQueryClient();
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
    const addFotoMutation = useMutation({
        mutationFn: (url) => addItemFoto(brechoId, itemId, { url }),
        onSuccess: async () => {
            await queryClient.invalidateQueries({ queryKey: ["item", brechoId, itemId] });
            fotoForm.reset();
        }
    });
    const deleteFotoMutation = useMutation({
        mutationFn: (fotoId) => deleteItemFoto(brechoId, itemId, fotoId),
        onSuccess: async () => {
            await queryClient.invalidateQueries({ queryKey: ["item", brechoId, itemId] });
        }
    });
    const analyzeFotoMutation = useMutation({
        mutationFn: (fotoId) => analisarItemFoto(brechoId, itemId, fotoId),
        onSuccess: async () => {
            await queryClient.invalidateQueries({ queryKey: ["item", brechoId, itemId] });
        }
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
            await queryClient.invalidateQueries({ queryKey: ["item", brechoId, itemId] });
            await queryClient.invalidateQueries({ queryKey: ["items", brechoId] });
            filaForm.reset();
        }
    });
    const leaveFilaMutation = useMutation({
        mutationFn: (entradaId) => leaveItemFila(brechoId, itemId, entradaId),
        onSuccess: async () => {
            await queryClient.invalidateQueries({ queryKey: ["item", brechoId, itemId] });
            await queryClient.invalidateQueries({ queryKey: ["items", brechoId] });
        }
    });
    if (!itemId) {
        return (_jsxs(AppShell, { children: [_jsx("p", { children: "Pe\u00E7a n\u00E3o encontrada." }), _jsx(Link, { to: "/", children: "Voltar" })] }));
    }
    const item = itemQuery.data;
    return (_jsxs(AppShell, { children: [_jsx(Link, { to: "/", children: "\u2190 Estoque" }), itemQuery.isLoading && _jsx("p", { children: "Carregando..." }), itemQuery.isError && _jsx("p", { children: "N\u00E3o foi poss\u00EDvel carregar a pe\u00E7a." }), item && (_jsxs(_Fragment, { children: [_jsxs("header", { children: [_jsx("h1", { style: { marginBottom: 4 }, children: item.nome }), _jsxs("p", { style: { marginTop: 0, opacity: 0.85 }, children: [item.categoria, " \u00B7 ", item.status] })] }), _jsxs(Section, { title: "Fotos", children: [_jsxs("p", { style: { marginTop: 0, fontSize: 14, opacity: 0.85 }, children: [_jsx(Link, { to: `/items/${item.id}/fotos/upload`, children: "Enviar fotos (c\u00E2mera, galeria, nota em texto ou voz)" }), " · ", "Ou cole uma URL p\u00FAblica abaixo."] }), _jsxs("form", { className: "stack", style: { gap: 12, marginBottom: 16 }, onSubmit: fotoForm.handleSubmit((data) => addFotoMutation.mutate(data.url)), children: [_jsx(Field, { label: "URL da imagem", children: _jsx(Input, { ...fotoForm.register("url"), placeholder: "https://..." }) }), fotoForm.formState.errors.url && (_jsx("small", { style: { color: "#b60e3d" }, children: fotoForm.formState.errors.url.message })), _jsx(Button, { type: "submit", disabled: addFotoMutation.isPending, children: addFotoMutation.isPending ? "Adicionando..." : "Adicionar foto" }), addFotoMutation.isError && (_jsx("small", { style: { color: "#b60e3d" }, children: addFotoMutation.error instanceof ApiError
                                            ? addFotoMutation.error.message
                                            : "Não foi possível adicionar a foto." }))] }), _jsx("div", { className: "stack", style: { gap: 12 }, children: (item.fotos ?? []).length === 0 ? (_jsx("p", { style: { opacity: 0.8 }, children: "Nenhuma foto ainda." })) : ((item.fotos ?? []).map((foto) => {
                                    const latestAi = foto.aiAnalyses?.[0];
                                    return (_jsxs("div", { className: "card", style: { display: "flex", flexDirection: "column", gap: 12 }, children: [_jsxs("div", { style: { display: "flex", gap: 12, alignItems: "center" }, children: [_jsx("a", { href: foto.url, target: "_blank", rel: "noreferrer", "aria-label": "Abrir foto em nova aba", children: _jsx("img", { src: foto.url, alt: `Foto da peça ${item.nome}`, style: { width: 96, height: 96, objectFit: "cover", borderRadius: 8 } }) }), _jsxs("div", { className: "stack", style: { flex: 1, minWidth: 0 }, children: [_jsx("small", { children: _jsx("a", { href: foto.url, target: "_blank", rel: "noreferrer", children: "Abrir original" }) }), _jsxs("small", { children: ["Ordem ", foto.ordem] })] }), _jsxs("div", { className: "stack", style: { gap: 8 }, children: [!latestAi && (_jsx(Button, { type: "button", onClick: () => analyzeFotoMutation.mutate(foto.id), disabled: analyzeFotoMutation.isPending, children: analyzeFotoMutation.isPending && analyzeFotoMutation.variables === foto.id
                                                                    ? "Analisando..."
                                                                    : "Sugerir com IA" })), _jsx(Button, { type: "button", onClick: () => deleteFotoMutation.mutate(foto.id), disabled: deleteFotoMutation.isPending, children: "Remover" })] })] }), analyzeFotoMutation.isError && analyzeFotoMutation.variables === foto.id && (_jsx("small", { style: { color: "#b60e3d" }, children: analyzeFotoMutation.error instanceof ApiError
                                                    ? analyzeFotoMutation.error.message
                                                    : "Não foi possível analisar a foto." })), latestAi && _jsx(FotoAiSuggestionsCard, { analysis: latestAi })] }, foto.id));
                                })) })] }), _jsxs(Section, { title: "Fila de interessados", children: [item.status === "DISPONIVEL" ? (_jsxs("form", { className: "grid cols-2", style: { marginBottom: 16 }, onSubmit: filaForm.handleSubmit((data) => joinFilaMutation.mutate(data)), children: [_jsx(Field, { label: "Nome", children: _jsx(Input, { ...filaForm.register("nome") }) }), _jsx(Field, { label: "WhatsApp", children: _jsx(Input, { ...filaForm.register("whatsapp") }) }), _jsx(Field, { label: "Instagram", children: _jsx(Input, { ...filaForm.register("instagram"), placeholder: "@usuario" }) }), _jsx("div", { className: "stack", style: { justifyContent: "end" }, children: _jsx(Button, { type: "submit", disabled: joinFilaMutation.isPending, children: joinFilaMutation.isPending ? "Entrando..." : "Entrar na fila" }) }), (filaForm.formState.errors.whatsapp || filaForm.formState.errors.root) && (_jsx("small", { style: { color: "#b60e3d", gridColumn: "1 / -1" }, children: filaForm.formState.errors.whatsapp?.message })), joinFilaMutation.isError && (_jsx("small", { style: { color: "#b60e3d", gridColumn: "1 / -1" }, children: joinFilaMutation.error instanceof ApiError
                                            ? joinFilaMutation.error.message
                                            : "Não foi possível entrar na fila." }))] })) : (_jsxs("p", { style: { opacity: 0.85 }, children: ["S\u00F3 \u00E9 poss\u00EDvel adicionar interessados enquanto a pe\u00E7a est\u00E1 ", _jsx("strong", { children: "dispon\u00EDvel" }), "."] })), _jsx("div", { className: "stack", style: { gap: 8 }, children: (item.filaInteressados ?? []).length === 0 ? (_jsx("p", { style: { opacity: 0.8 }, children: "Ningu\u00E9m na fila." })) : ((item.filaInteressados ?? []).map((e) => (_jsxs("div", { className: "card", style: { display: "flex", justifyContent: "space-between", alignItems: "center" }, children: [_jsxs("div", { children: [_jsxs("strong", { children: [e.posicao + 1, "\u00BA \u2014 ", e.cliente.nome] }), _jsx("div", { style: { fontSize: 13, opacity: 0.85 }, children: [e.cliente.whatsapp, e.cliente.instagram].filter(Boolean).join(" · ") ||
                                                        "Sem contato" })] }), _jsx(Button, { type: "button", onClick: () => leaveFilaMutation.mutate(e.id), disabled: leaveFilaMutation.isPending, children: "Remover" })] }, e.id)))) })] })] }))] }));
};
