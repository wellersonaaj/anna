import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { Link, useNavigate, useParams } from "react-router-dom";
import { z } from "zod";
import { ClientPicker } from "../components/client-picker";
import { getItem, joinItemFila } from "../api/items";
import { useSessionStore } from "../store/session.store";
import { AppShell, Button, Field, Input, Section } from "../components/ui";
const reserveFormSchema = z.object({
    nome: z.string().trim().min(2, "Informe o nome."),
    whatsapp: z.string().trim().optional(),
    instagram: z.string().trim().optional()
}).superRefine((data, ctx) => {
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
const needsAdjustFieldsForReserve = (data) => {
    const nomeOk = data.nome.trim().length >= 2;
    const w = data.whatsapp?.replace(/\s/g, "") ?? "";
    const i = data.instagram?.replace(/^@+/, "").trim() ?? "";
    return !nomeOk || (!w && !i);
};
const formatPreco = (value) => {
    if (value === null || value === undefined || value === "") {
        return "—";
    }
    const num = typeof value === "string" ? Number(value.replace(",", ".")) : Number(value);
    if (Number.isNaN(num)) {
        return String(value);
    }
    return num.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
};
export const ReservePage = () => {
    const { itemId } = useParams();
    const brechoId = useSessionStore((state) => state.brechoId);
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const [showAdjustFields, setShowAdjustFields] = useState(false);
    const itemQuery = useQuery({
        queryKey: ["item", brechoId, itemId],
        queryFn: () => getItem(brechoId, itemId),
        enabled: Boolean(itemId)
    });
    const itemQueryKey = ["item", brechoId, itemId];
    const { register, handleSubmit, setValue, formState, watch, reset } = useForm({
        resolver: zodResolver(reserveFormSchema),
        defaultValues: {
            nome: "",
            whatsapp: "",
            instagram: ""
        }
    });
    const reserveMutation = useMutation({
        mutationFn: (data) => {
            if (!itemId) {
                throw new Error("Peça não informada.");
            }
            return joinItemFila(brechoId, itemId, {
                cliente: {
                    nome: data.nome.trim(),
                    whatsapp: data.whatsapp?.trim() || undefined,
                    instagram: data.instagram?.trim() || undefined
                }
            });
        },
        onMutate: async (data) => {
            if (!itemId) {
                return { previousItem: undefined, optimisticId: undefined };
            }
            await queryClient.cancelQueries({ queryKey: itemQueryKey });
            const previousItem = queryClient.getQueryData(itemQueryKey);
            const optimisticId = `fila-optimistic-${Date.now()}`;
            const optimisticEntry = {
                id: optimisticId,
                pecaId: itemId,
                clienteId: optimisticId,
                posicao: previousItem?.filaInteressados?.length ?? 0,
                criadoEm: new Date().toISOString(),
                cliente: {
                    id: optimisticId,
                    nome: data.nome.trim(),
                    whatsapp: data.whatsapp?.trim() || null,
                    instagram: data.instagram?.trim() || null
                }
            };
            queryClient.setQueryData(itemQueryKey, (current) => {
                if (!current) {
                    return current;
                }
                return {
                    ...current,
                    status: current.status === "DISPONIVEL" ? "RESERVADO" : current.status,
                    filaInteressados: [...(current.filaInteressados ?? []), optimisticEntry]
                };
            });
            return { previousItem, optimisticId };
        },
        onError: (_error, _data, context) => {
            if (!itemId) {
                return;
            }
            if (context?.previousItem) {
                queryClient.setQueryData(itemQueryKey, context.previousItem);
            }
        },
        onSuccess: (createdEntry, _data, context) => {
            if (!itemId) {
                return;
            }
            queryClient.setQueryData(itemQueryKey, (current) => {
                if (!current) {
                    return current;
                }
                const withoutOptimistic = (current.filaInteressados ?? []).filter((entry) => entry.id !== context?.optimisticId);
                const nextQueue = [...withoutOptimistic, createdEntry].map((entry, index) => ({
                    ...entry,
                    posicao: index
                }));
                return {
                    ...current,
                    status: "RESERVADO",
                    filaInteressados: nextQueue
                };
            });
            reset({ nome: "", whatsapp: "", instagram: "" });
            setShowAdjustFields(false);
        },
        onSettled: async () => {
            await queryClient.invalidateQueries({ queryKey: ["items", brechoId] });
        }
    });
    const item = itemQuery.data;
    const listCoverFoto = item?.fotos?.find((f) => f.isCover) ?? item?.fotos?.[0];
    const itemPhoto = listCoverFoto?.thumbnailUrl ??
        listCoverFoto?.url ??
        item?.fotoCapaThumbnailUrl ??
        item?.fotoCapaUrl ??
        null;
    const canQueue = item?.status === "DISPONIVEL" || item?.status === "RESERVADO";
    const selectedContact = {
        nome: watch("nome") ?? "",
        whatsapp: watch("whatsapp") ?? "",
        instagram: watch("instagram") ?? ""
    };
    const fillClient = (cliente) => {
        setValue("nome", cliente.nome, { shouldValidate: true, shouldDirty: true });
        setValue("whatsapp", cliente.whatsapp ?? "", { shouldValidate: true, shouldDirty: true });
        setValue("instagram", cliente.instagram ?? "", { shouldValidate: true, shouldDirty: true });
    };
    const hasContact = Boolean(selectedContact.nome.trim()) ||
        Boolean(selectedContact.whatsapp.trim()) ||
        Boolean(selectedContact.instagram.trim());
    return (_jsxs(AppShell, { children: [_jsxs("header", { style: { display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }, children: [_jsx(Link, { to: "/", style: { color: "#5a4042", textDecoration: "none" }, children: "\u2190 Voltar" }), _jsx("h1", { style: { margin: 0, fontSize: "1.25rem" }, children: item?.status === "RESERVADO" ? "Adicionar à fila" : "Reserva" })] }), _jsx("p", { style: { marginTop: 0, color: "#5a4042", maxWidth: 360 }, children: "Escolha quem reserva: busque quem j\u00E1 est\u00E1 cadastrado ou cadastre algu\u00E9m novo." }), _jsx(Section, { title: "Cliente", children: _jsxs("form", { className: "stack", onSubmit: handleSubmit((data) => reserveMutation.mutate(data)), children: [_jsx(ClientPicker, { brechoId: brechoId, selectedContact: selectedContact, onSelect: (cliente) => {
                                fillClient(cliente);
                                setShowAdjustFields(needsAdjustFieldsForReserve(cliente));
                            }, onCreateNew: (cliente) => {
                                fillClient(cliente);
                                setShowAdjustFields(needsAdjustFieldsForReserve(cliente));
                            }, onClear: () => {
                                fillClient({ nome: "", whatsapp: "", instagram: "" });
                                setShowAdjustFields(false);
                            } }), hasContact && !showAdjustFields && (_jsx("button", { type: "button", className: "w-full rounded-xl border border-rose-100 bg-white py-3 text-sm font-bold text-primary", onClick: () => setShowAdjustFields(true), children: "Ajustar nome, WhatsApp ou Instagram" })), hasContact && showAdjustFields && (_jsx("button", { type: "button", className: "text-sm font-bold text-on-surface-variant underline", onClick: () => setShowAdjustFields(false), children: "Ocultar campos" })), _jsxs("div", { className: hasContact && showAdjustFields ? "grid gap-3" : "hidden", "aria-hidden": !(hasContact && showAdjustFields), children: [_jsx(Field, { label: "Nome completo", children: _jsx(Input, { ...register("nome"), placeholder: "ex: Elena Rossi" }) }), _jsxs("div", { className: "grid cols-2", children: [_jsx(Field, { label: "WhatsApp", children: _jsxs("div", { style: { display: "flex", alignItems: "center", gap: 6 }, children: [_jsx("span", { style: { color: "#8e6f71" }, children: "+" }), _jsx(Input, { ...register("whatsapp"), placeholder: "55 11 99999-9999", type: "tel" })] }) }), _jsx(Field, { label: "Instagram", children: _jsxs("div", { style: { display: "flex", alignItems: "center", gap: 6 }, children: [_jsx("span", { style: { color: "#8e6f71" }, children: "@" }), _jsx(Input, { ...register("instagram"), placeholder: "usuario" })] }) })] })] }), item && (_jsxs("div", { style: {
                                display: "flex",
                                gap: 16,
                                padding: 16,
                                background: "#fee1e3",
                                borderRadius: 16,
                                marginTop: 8
                            }, children: [itemPhoto ? (_jsx("img", { src: itemPhoto, alt: `Foto da peça ${item.nome}`, style: { width: 80, height: 96, borderRadius: 12, objectFit: "cover", flexShrink: 0 } })) : (_jsx("div", { style: {
                                        width: 80,
                                        height: 96,
                                        borderRadius: 12,
                                        background: "#fff",
                                        flexShrink: 0,
                                        display: "flex",
                                        alignItems: "center",
                                        justifyContent: "center",
                                        fontSize: 11,
                                        color: "#5a4042"
                                    }, children: "Foto" })), _jsxs("div", { children: [_jsx("div", { style: { fontSize: 10, fontWeight: 800, letterSpacing: "0.15em", color: "#b60e3d" }, children: item.status === "RESERVADO" ? "ADICIONANDO À FILA" : "RESERVANDO ITEM" }), _jsx("h3", { style: { margin: "4px 0", fontSize: "1.1rem" }, children: item.nome }), _jsx("div", { style: { fontSize: 13, fontWeight: 700 }, children: formatPreco(item.precoVenda) })] })] })), _jsxs("div", { style: { display: "flex", flexDirection: "column", gap: 12, marginTop: 12 }, children: [_jsx(Button, { type: "submit", disabled: reserveMutation.isPending || !item || !canQueue, children: reserveMutation.isPending
                                        ? "Confirmando..."
                                        : item?.status === "RESERVADO"
                                            ? "Adicionar à fila"
                                            : "Confirmar reserva" }), _jsx("button", { type: "button", onClick: () => navigate(-1), style: {
                                        height: 40,
                                        borderRadius: 10,
                                        border: "1px solid #e2bec0",
                                        background: "transparent",
                                        color: "#5a4042",
                                        cursor: "pointer",
                                        fontWeight: 600
                                    }, children: "Descartar rascunho" })] }), formState.errors.root && _jsx("small", { children: formState.errors.root.message })] }) }), _jsx(Section, { title: "Fila de interessados", children: !canQueue ? (_jsx("p", { style: { opacity: 0.85 }, children: "A fila só pode ser gerenciada em peças disponíveis ou reservadas." })) : (_jsx("div", { className: "stack", style: { gap: 8 }, children: (item?.filaInteressados ?? []).length === 0 ? (_jsx("p", { style: { opacity: 0.8 }, children: "Ninguém na fila." })) : ((item?.filaInteressados ?? []).map((entry) => (_jsx("div", { className: "card", style: { display: "flex", justifyContent: "space-between", alignItems: "center" }, children: _jsxs("div", { children: [_jsxs("strong", { children: [entry.posicao + 1, "º — ", entry.cliente.nome] }), entry.posicao === 0 && item?.status === "RESERVADO" && (_jsx("span", { className: "ml-2 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-700", children: "Reserva ativa" })), _jsx("div", { style: { fontSize: 13, opacity: 0.85 }, children: [entry.cliente.whatsapp, entry.cliente.instagram].filter(Boolean).join(" · ") || "Sem contato" })] }) }, entry.id)))) })) })] }));
};
