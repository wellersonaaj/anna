import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { Link, useNavigate, useParams } from "react-router-dom";
import { z } from "zod";
import { getClientById } from "../api/clients";
import { getItem, leaveItemFila, sellItem } from "../api/items";
import { ClientPicker } from "../components/client-picker";
import { FreteInclusoDetail, parseFreteInclusoValorForApi, validateFreteInclusoValor } from "../components/frete-incluso-detail";
import { useSessionStore } from "../store/session.store";
import { AppShell, Button, Field, Input, Section, formatCurrency } from "../components/ui";
import { parseMoneyLike } from "../lib/money";
const sellFormSchema = z
    .object({
    clienteNome: z.string().trim().min(2),
    clienteWhatsapp: z.string().trim().optional(),
    clienteInstagram: z.string().trim().optional(),
    precoVenda: z.coerce.number().positive("Informe o preço.")
})
    .superRefine((data, ctx) => {
    const w = data.clienteWhatsapp?.replace(/\s/g, "") ?? "";
    const i = data.clienteInstagram?.replace(/^@+/, "").trim() ?? "";
    if (!w && !i) {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "Informe WhatsApp ou Instagram do cliente.",
            path: ["clienteWhatsapp"]
        });
    }
});
const needsAdjustFieldsForSell = (data) => {
    const nomeOk = data.nome.trim().length >= 2;
    const w = data.whatsapp?.replace(/\s/g, "") ?? "";
    const i = data.instagram?.replace(/^@+/, "").trim() ?? "";
    return !nomeOk || (!w && !i);
};
const chipStyle = (active) => ({
    padding: "10px 16px",
    borderRadius: 12,
    border: active ? "2px solid #b60e3d" : "1px solid #e2bec0",
    background: active ? "#fff0f0" : "#fff",
    cursor: "pointer",
    fontWeight: 700,
    fontSize: 14
});
export const SellPage = () => {
    const { itemId } = useParams();
    const brechoId = useSessionStore((state) => state.brechoId);
    const queryClient = useQueryClient();
    const navigate = useNavigate();
    const [saleMode, setSaleMode] = useState("manual");
    const [selectedQueueEntryId, setSelectedQueueEntryId] = useState(null);
    const [showAdjustManualCliente, setShowAdjustManualCliente] = useState(false);
    const [manualClientId, setManualClientId] = useState(null);
    const [modoEntrega, setModoEntrega] = useState("SACOLA");
    const [freteIncluso, setFreteIncluso] = useState(false);
    const [freteInclusoValor, setFreteInclusoValor] = useState("");
    const [freteValidationError, setFreteValidationError] = useState(null);
    const [freteCustoLoja, setFreteCustoLoja] = useState("");
    const [embalagemCusto, setEmbalagemCusto] = useState("");
    const itemQuery = useQuery({
        queryKey: ["item", brechoId, itemId],
        queryFn: () => getItem(brechoId, itemId),
        enabled: Boolean(itemId)
    });
    const itemQueryKey = ["item", brechoId, itemId];
    const item = itemQuery.data;
    const queueEntries = item?.filaInteressados ?? [];
    const selectedQueueEntry = queueEntries.find((entry) => entry.id === selectedQueueEntryId) ?? queueEntries[0];
    const selectedCliente = saleMode === "queue" ? selectedQueueEntry?.cliente : undefined;
    const activeClientId = selectedCliente?.id ?? manualClientId;
    const clientSacolaQuery = useQuery({
        queryKey: ["client", brechoId, activeClientId, "sell-sacola"],
        queryFn: () => getClientById(brechoId, activeClientId),
        enabled: Boolean(activeClientId) && modoEntrega === "SACOLA"
    });
    const openSacolaVendas = clientSacolaQuery.data?.sacolas?.[0]?.vendas ?? [];
    const openSacolaTotal = openSacolaVendas.reduce((sum, v) => sum + parseMoneyLike(v.precoVenda ?? 0), 0);
    const listCoverFoto = item?.fotos?.find((f) => f.isCover) ?? item?.fotos?.[0];
    const itemPhoto = listCoverFoto?.thumbnailUrl ??
        listCoverFoto?.url ??
        item?.fotoCapaThumbnailUrl ??
        item?.fotoCapaUrl ??
        null;
    const { register, handleSubmit, reset, control, setValue, watch } = useForm({
        resolver: zodResolver(sellFormSchema),
        defaultValues: {
            clienteNome: "",
            clienteWhatsapp: "",
            clienteInstagram: "",
            precoVenda: 0
        }
    });
    const precoVenda = useWatch({ control, name: "precoVenda" });
    const manualContact = {
        nome: watch("clienteNome") ?? "",
        whatsapp: watch("clienteWhatsapp") ?? "",
        instagram: watch("clienteInstagram") ?? ""
    };
    const fillManualContact = (cliente) => {
        setManualClientId(cliente.id ?? null);
        setValue("clienteNome", cliente.nome, { shouldValidate: true, shouldDirty: true });
        setValue("clienteWhatsapp", cliente.whatsapp, { shouldValidate: true, shouldDirty: true });
        setValue("clienteInstagram", cliente.instagram, { shouldValidate: true, shouldDirty: true });
    };
    const hasManualContact = Boolean(manualContact.nome.trim()) ||
        Boolean(manualContact.whatsapp.trim()) ||
        Boolean(manualContact.instagram.trim());
    const precoLabel = useMemo(() => {
        if (modoEntrega === "IMEDIATA") {
            return "Quanto a cliente pagou? (R$)";
        }
        if (freteIncluso) {
            return "Preço cobrado (com frete incluso) (R$)";
        }
        return "Preço da peça (sem frete) (R$)";
    }, [modoEntrega, freteIncluso]);
    useEffect(() => {
        if (!item) {
            return;
        }
        const preco = parseMoneyLike(item.precoVenda);
        const nextPreco = Number.isNaN(preco) || preco <= 0 ? 0 : preco;
        if (selectedCliente) {
            reset({
                clienteNome: selectedCliente.nome,
                clienteWhatsapp: selectedCliente.whatsapp ?? "",
                clienteInstagram: selectedCliente.instagram ?? "",
                precoVenda: nextPreco
            });
            return;
        }
        reset({
            clienteNome: "",
            clienteWhatsapp: "",
            clienteInstagram: "",
            precoVenda: nextPreco
        });
    }, [item, selectedCliente, reset]);
    useEffect(() => {
        if (!item) {
            return;
        }
        const firstEntry = item.filaInteressados?.[0];
        if (firstEntry) {
            setSaleMode("queue");
            setSelectedQueueEntryId(firstEntry.id);
            return;
        }
        setSaleMode("manual");
        setSelectedQueueEntryId(null);
    }, [item]);
    useEffect(() => {
        if (openSacolaVendas.length > 0) {
            setModoEntrega("SACOLA");
        }
    }, [openSacolaVendas.length, activeClientId]);
    const displayPreco = typeof precoVenda === "number" && !Number.isNaN(precoVenda) ? precoVenda : Number(precoVenda) || 0;
    const sellMutation = useMutation({
        mutationFn: (data) => {
            if (!itemId) {
                throw new Error("Item não informado.");
            }
            if (modoEntrega === "SACOLA" && freteIncluso) {
                const freteError = validateFreteInclusoValor(data.precoVenda, freteInclusoValor);
                if (freteError) {
                    throw new Error(freteError);
                }
            }
            const freteCustoNum = freteCustoLoja.trim() ? parseMoneyLike(freteCustoLoja) : Number.NaN;
            const embalagemCustoNum = embalagemCusto.trim() ? parseMoneyLike(embalagemCusto) : Number.NaN;
            return sellItem(brechoId, itemId, {
                cliente: {
                    nome: data.clienteNome.trim(),
                    whatsapp: data.clienteWhatsapp?.trim() || undefined,
                    instagram: data.clienteInstagram?.trim() || undefined
                },
                precoVenda: data.precoVenda,
                modoEntrega,
                freteIncluso: modoEntrega === "SACOLA" ? freteIncluso : undefined,
                freteInclusoValor: modoEntrega === "SACOLA" && freteIncluso
                    ? parseFreteInclusoValorForApi(data.precoVenda, freteInclusoValor)
                    : undefined,
                freteCustoLoja: modoEntrega === "IMEDIATA" && !Number.isNaN(freteCustoNum) && freteCustoNum > 0
                    ? freteCustoNum
                    : undefined,
                embalagemCusto: modoEntrega === "IMEDIATA" && !Number.isNaN(embalagemCustoNum) && embalagemCustoNum > 0
                    ? embalagemCustoNum
                    : undefined
            });
        },
        onSuccess: async () => {
            await queryClient.invalidateQueries({ queryKey: ["items", brechoId] });
            await queryClient.invalidateQueries({ queryKey: ["item", brechoId, itemId] });
            await queryClient.invalidateQueries({ queryKey: ["sales-period-summary", brechoId] });
            await queryClient.invalidateQueries({ queryKey: ["pending-sacolas", brechoId] });
            navigate(modoEntrega === "SACOLA" ? "/vendas#aguardando" : "/");
        }
    });
    const leaveFilaMutation = useMutation({
        mutationFn: (entradaId) => {
            if (!itemId) {
                throw new Error("Item não informado.");
            }
            return leaveItemFila(brechoId, itemId, entradaId);
        },
        onMutate: async (entradaId) => {
            await queryClient.cancelQueries({ queryKey: itemQueryKey });
            const previousItem = queryClient.getQueryData(itemQueryKey);
            let nextSelectedEntryId = null;
            queryClient.setQueryData(itemQueryKey, (current) => {
                if (!current) {
                    return current;
                }
                const nextQueue = (current.filaInteressados ?? [])
                    .filter((entry) => entry.id !== entradaId)
                    .map((entry, index) => ({ ...entry, posicao: index }));
                if (saleMode === "queue" && selectedQueueEntryId === entradaId) {
                    nextSelectedEntryId = nextQueue[0]?.id ?? null;
                }
                return {
                    ...current,
                    filaInteressados: nextQueue
                };
            });
            if (saleMode === "queue" && selectedQueueEntryId === entradaId) {
                setSelectedQueueEntryId(nextSelectedEntryId);
                if (!nextSelectedEntryId) {
                    setSaleMode("manual");
                    setShowAdjustManualCliente(false);
                }
            }
            return { previousItem };
        },
        onError: (_error, _entradaId, context) => {
            if (context?.previousItem) {
                queryClient.setQueryData(itemQueryKey, context.previousItem);
            }
        },
        onSettled: async () => {
            await queryClient.invalidateQueries({ queryKey: itemQueryKey });
            await queryClient.invalidateQueries({ queryKey: ["items", brechoId] });
        }
    });
    return (_jsxs(AppShell, { children: [_jsxs("header", { style: { display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }, children: [_jsx(Link, { to: "/", style: { color: "#5a4042", textDecoration: "none" }, children: "\u2190 Voltar" }), _jsx("h1", { style: { margin: 0, fontSize: "1.25rem" }, children: "Confirmar venda" })] }), _jsx("span", { style: { fontSize: 10, fontWeight: 800, letterSpacing: "0.1em", color: "#b60e3d" }, children: "RESUMO DA VENDA" }), _jsx("h2", { style: { margin: "4px 0 16px", fontSize: "2rem", fontWeight: 800, letterSpacing: "-0.02em" }, children: "Confirmar venda" }), item && (_jsxs("div", { style: {
                    display: "flex",
                    gap: 20,
                    padding: 20,
                    background: "#fff",
                    borderRadius: "2rem",
                    border: "1px solid #f2d5d7",
                    marginBottom: 24,
                    boxShadow: "0 12px 40px rgba(186, 19, 64, 0.06)"
                }, children: [itemPhoto ? (_jsx("img", { src: itemPhoto, alt: `Foto da peça ${item.nome}`, style: { width: 120, height: 120, borderRadius: 12, objectFit: "cover", flexShrink: 0 } })) : (_jsx("div", { style: {
                            width: 120,
                            height: 120,
                            borderRadius: 12,
                            background: "#fff0f0",
                            flexShrink: 0,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontSize: 12,
                            color: "#5a4042"
                        }, children: "Foto" })), _jsx("div", { style: { display: "flex", flexDirection: "column", justifyContent: "center" }, children: _jsx("h3", { style: { margin: 0, fontSize: "1.35rem" }, children: item.nome }) })] })), _jsx(Section, { title: "Valores", children: _jsxs("form", { className: "stack", style: { gap: 20 }, onSubmit: handleSubmit((data) => sellMutation.mutate(data)), children: [queueEntries.length > 0 && (_jsxs("div", { style: { padding: 12, background: "#fff0f0", borderRadius: 12, fontSize: 14 }, children: [_jsx("strong", { children: "H\u00E1 fila para esta pe\u00E7a." }), _jsx("p", { style: { margin: "4px 0 12px", color: "#5a4042" }, children: "Escolha vender para a primeira pessoa, outra pessoa da fila ou uma venda manual." }), _jsxs("div", { style: { display: "flex", flexDirection: "column", gap: 8 }, children: [queueEntries.map((entry) => (_jsxs("div", { style: { display: "flex", gap: 8, alignItems: "center" }, children: [_jsxs("button", { type: "button", onClick: () => {
                                                        setSaleMode("queue");
                                                        setSelectedQueueEntryId(entry.id);
                                                        setShowAdjustManualCliente(false);
                                                    }, style: {
                                                        flex: 1,
                                                        padding: "10px 12px",
                                                        borderRadius: 12,
                                                        border: selectedQueueEntryId === entry.id && saleMode === "queue"
                                                            ? "2px solid #b60e3d"
                                                            : "1px solid #e2bec0",
                                                        background: "#fff",
                                                        textAlign: "left",
                                                        cursor: "pointer"
                                                    }, children: [_jsxs("strong", { children: [entry.posicao + 1, "\u00BA da fila: ", entry.cliente.nome] }), entry.posicao === 0 ? " · primeira pessoa" : null, _jsx("div", { style: { fontSize: 12, color: "#5a4042" }, children: [entry.cliente.whatsapp, entry.cliente.instagram].filter(Boolean).join(" · ") || "Sem contato" })] }), _jsx(Button, { type: "button", className: "bg-zinc-700", onClick: () => leaveFilaMutation.mutate(entry.id), disabled: leaveFilaMutation.isPending, children: "Remover" })] }, entry.id))), _jsx("button", { type: "button", onClick: () => {
                                                setSaleMode("manual");
                                                setSelectedQueueEntryId(null);
                                                setManualClientId(null);
                                                setShowAdjustManualCliente(false);
                                            }, style: {
                                                padding: "10px 12px",
                                                borderRadius: 12,
                                                border: saleMode === "manual" ? "2px solid #b60e3d" : "1px solid #e2bec0",
                                                background: "#fff",
                                                textAlign: "left",
                                                cursor: "pointer",
                                                fontWeight: 700
                                            }, children: "Vender para outra pessoa" })] })] })), !selectedCliente && (_jsxs(_Fragment, { children: [_jsx(ClientPicker, { brechoId: brechoId, selectedContact: hasManualContact ? manualContact : null, onSelect: (cliente) => {
                                        fillManualContact(cliente);
                                        setShowAdjustManualCliente(needsAdjustFieldsForSell(cliente));
                                    }, onCreateNew: (cliente) => {
                                        fillManualContact(cliente);
                                        setManualClientId(null);
                                        setShowAdjustManualCliente(needsAdjustFieldsForSell(cliente));
                                    }, onClear: () => {
                                        fillManualContact({ nome: "", whatsapp: "", instagram: "" });
                                        setManualClientId(null);
                                        setShowAdjustManualCliente(false);
                                    } }), hasManualContact && !showAdjustManualCliente && (_jsx("button", { type: "button", className: "w-full rounded-xl border border-rose-100 bg-white py-3 text-sm font-bold text-primary", onClick: () => setShowAdjustManualCliente(true), children: "Ajustar nome, WhatsApp ou Instagram" })), hasManualContact && showAdjustManualCliente && (_jsx("button", { type: "button", className: "text-sm font-bold text-on-surface-variant underline", onClick: () => setShowAdjustManualCliente(false), children: "Ocultar campos" })), _jsxs("div", { className: hasManualContact && showAdjustManualCliente ? "stack" : "hidden", style: { gap: 12 }, "aria-hidden": !(hasManualContact && showAdjustManualCliente), children: [_jsx(Field, { label: "Nome completo", children: _jsx(Input, { ...register("clienteNome") }) }), _jsxs("div", { className: "grid cols-2", children: [_jsx(Field, { label: "WhatsApp", children: _jsx(Input, { ...register("clienteWhatsapp"), type: "tel", placeholder: "55 11 99999-9999" }) }), _jsx(Field, { label: "Instagram", children: _jsx(Input, { ...register("clienteInstagram"), placeholder: "@usuario" }) })] })] })] })), selectedCliente && (_jsxs("div", { style: { padding: 12, background: "#fff0f0", borderRadius: 12, fontSize: 14 }, children: [_jsx("strong", { children: "Cliente selecionado:" }), " ", selectedCliente.nome, _jsxs("div", { style: { fontSize: 12, color: "#5a4042", marginTop: 4 }, children: [selectedCliente.whatsapp ? `WhatsApp: ${selectedCliente.whatsapp}` : null, selectedCliente.whatsapp && selectedCliente.instagram ? " · " : null, selectedCliente.instagram ? `Instagram: @${selectedCliente.instagram}` : null] }), _jsx("input", { type: "hidden", ...register("clienteNome") }), _jsx("input", { type: "hidden", ...register("clienteWhatsapp") }), _jsx("input", { type: "hidden", ...register("clienteInstagram") })] })), modoEntrega === "SACOLA" && openSacolaVendas.length > 0 && activeClientId && (_jsxs("div", { style: {
                                padding: 12,
                                background: "#fffbeb",
                                borderRadius: 12,
                                fontSize: 14,
                                border: "1px solid #fde68a"
                            }, children: [_jsx("strong", { children: selectedCliente?.nome ?? manualContact.nome }), " j\u00E1 tem ", openSacolaVendas.length, " pe\u00E7a(s) na sacola (", formatCurrency(openSacolaTotal), "). Esta venda entra na mesma sacola."] })), _jsx(Field, { label: "Como foi a entrega?", children: _jsxs("div", { style: { display: "flex", flexWrap: "wrap", gap: 8 }, children: [_jsx("button", { type: "button", style: chipStyle(modoEntrega === "IMEDIATA"), onClick: () => setModoEntrega("IMEDIATA"), children: "J\u00E1 entregue" }), _jsx("button", { type: "button", style: chipStyle(modoEntrega === "SACOLA"), onClick: () => setModoEntrega("SACOLA"), children: "Vai enviar depois" })] }) }), modoEntrega === "SACOLA" && (_jsxs(Field, { label: "Esse pre\u00E7o inclui frete?", children: [_jsxs("div", { style: { display: "flex", flexWrap: "wrap", gap: 8 }, children: [_jsx("button", { type: "button", style: chipStyle(freteIncluso), onClick: () => {
                                                setFreteIncluso(true);
                                                setFreteValidationError(null);
                                            }, children: "Sim" }), _jsx("button", { type: "button", style: chipStyle(!freteIncluso), onClick: () => {
                                                setFreteIncluso(false);
                                                setFreteInclusoValor("");
                                                setFreteValidationError(null);
                                            }, children: "N\u00E3o" })] }), !freteIncluso && (_jsx("small", { style: { color: "#5a4042" }, children: "O frete ser\u00E1 informado ao enviar a sacola." }))] })), _jsxs(Field, { label: precoLabel, children: [_jsx(Input, { type: "number", step: "0.01", min: 0, ...register("precoVenda", { valueAsNumber: true }) }), _jsx("small", { style: { color: "#5a4042" }, children: "Pr\u00E9-preenchido com o pre\u00E7o de an\u00FAncio. Toque para editar." })] }), modoEntrega === "IMEDIATA" && (_jsxs("div", { className: "grid gap-2", children: [_jsx(Field, { label: "Quanto voc\u00EA pagou de frete? (R$) (opcional)", children: _jsx(Input, { type: "number", step: "0.01", min: 0, value: freteCustoLoja, onChange: (event) => setFreteCustoLoja(event.target.value) }) }), _jsx(Field, { label: "Custo de embalagem (R$) (opcional)", children: _jsx(Input, { type: "number", step: "0.01", min: 0, value: embalagemCusto, onChange: (event) => setEmbalagemCusto(event.target.value) }) })] })), modoEntrega === "SACOLA" && freteIncluso && (_jsx(FreteInclusoDetail, { precoVenda: displayPreco, freteInclusoValor: freteInclusoValor, onFreteInclusoValorChange: (value) => {
                                setFreteInclusoValor(value);
                                setFreteValidationError(validateFreteInclusoValor(displayPreco, value));
                            } })), _jsxs("div", { style: {
                                padding: 24,
                                background: "#fff0f0",
                                borderRadius: "2rem",
                                display: "flex",
                                justifyContent: "space-between",
                                alignItems: "center"
                            }, children: [_jsx("span", { style: { fontSize: "1.1rem", fontWeight: 800 }, children: "Valor da venda" }), _jsx("span", { style: { fontSize: "1.75rem", fontWeight: 800, color: "#b60e3d" }, children: formatCurrency(displayPreco) })] }), (freteValidationError || sellMutation.isError) && (_jsx("p", { className: "text-sm text-red-600", children: freteValidationError ??
                                (sellMutation.error instanceof Error ? sellMutation.error.message : "Erro ao confirmar venda.") })), _jsx(Button, { type: "submit", disabled: sellMutation.isPending || !item || itemQuery.isLoading || Boolean(freteValidationError), children: sellMutation.isPending ? "Confirmando..." : "Confirmar venda" }), _jsx("p", { style: { textAlign: "center", fontSize: 13, color: "#5a4042", margin: 0 }, children: modoEntrega === "IMEDIATA"
                                ? "A peça será marcada como entregue."
                                : "A peça ficará na sacola aguardando envio." })] }) })] }));
};
