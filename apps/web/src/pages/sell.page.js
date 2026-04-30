import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { Link, useNavigate, useParams } from "react-router-dom";
import { z } from "zod";
import { getItem, sellItem } from "../api/items";
import { useSessionStore } from "../store/session.store";
import { AppShell, Button, Field, Input, Section } from "../components/ui";
const parseDecimalBr = (value) => {
    if (value === null || value === undefined || value === "") {
        return Number.NaN;
    }
    if (typeof value === "number") {
        return value;
    }
    const cleaned = String(value).trim().replace(/\./g, "").replace(",", ".");
    return Number.parseFloat(cleaned);
};
const parseFreteFromText = (text) => {
    if (!text?.trim()) {
        return 0;
    }
    const match = text.match(/R\$\s*([\d.,]+)/i);
    if (match?.[1]) {
        const n = parseDecimalBr(match[1]);
        return Number.isNaN(n) ? 0 : n;
    }
    const numbers = [...text.matchAll(/(\d+[.,]\d+|\d+)/g)].map((m) => parseDecimalBr(m[1]));
    if (!numbers.length) {
        return 0;
    }
    const last = numbers.at(-1);
    if (last === undefined) {
        return 0;
    }
    return Number.isNaN(last) ? 0 : last;
};
const sellFormSchema = z
    .object({
    clienteNome: z.string().trim().min(2),
    clienteWhatsapp: z.string().trim().optional(),
    clienteInstagram: z.string().trim().optional(),
    precoVenda: z.coerce.number().positive("Informe o preço da peça."),
    freteTexto: z.string().optional()
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
const formatMoney = (value) => value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
export const SellPage = () => {
    const { itemId } = useParams();
    const brechoId = useSessionStore((state) => state.brechoId);
    const queryClient = useQueryClient();
    const navigate = useNavigate();
    const [saleMode, setSaleMode] = useState("manual");
    const [selectedQueueEntryId, setSelectedQueueEntryId] = useState(null);
    const itemQuery = useQuery({
        queryKey: ["item", brechoId, itemId],
        queryFn: () => getItem(brechoId, itemId),
        enabled: Boolean(itemId)
    });
    const item = itemQuery.data;
    const queueEntries = item?.filaInteressados ?? [];
    const selectedQueueEntry = queueEntries.find((entry) => entry.id === selectedQueueEntryId) ?? queueEntries[0];
    const selectedCliente = saleMode === "queue" ? selectedQueueEntry?.cliente : undefined;
    const itemPhoto = item?.fotos?.[0]?.url ?? item?.fotoCapaUrl ?? null;
    const { register, handleSubmit, reset, control } = useForm({
        resolver: zodResolver(sellFormSchema),
        defaultValues: {
            clienteNome: "",
            clienteWhatsapp: "",
            clienteInstagram: "",
            precoVenda: 0,
            freteTexto: ""
        }
    });
    const precoVenda = useWatch({ control, name: "precoVenda" });
    const freteTexto = useWatch({ control, name: "freteTexto" });
    useEffect(() => {
        if (!item) {
            return;
        }
        const preco = parseDecimalBr(item.precoVenda);
        const nextPreco = Number.isNaN(preco) || preco <= 0 ? 0 : preco;
        if (selectedCliente) {
            reset({
                clienteNome: selectedCliente.nome,
                clienteWhatsapp: selectedCliente.whatsapp ?? "",
                clienteInstagram: selectedCliente.instagram ?? "",
                precoVenda: nextPreco,
                freteTexto: ""
            });
            return;
        }
        reset({
            clienteNome: "",
            clienteWhatsapp: "",
            clienteInstagram: "",
            precoVenda: nextPreco,
            freteTexto: ""
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
    const freteValor = useMemo(() => parseFreteFromText(freteTexto), [freteTexto]);
    const totalVenda = useMemo(() => {
        const p = typeof precoVenda === "number" ? precoVenda : Number(precoVenda);
        if (Number.isNaN(p)) {
            return 0;
        }
        return p + freteValor;
    }, [precoVenda, freteValor]);
    const sellMutation = useMutation({
        mutationFn: (data) => {
            if (!itemId) {
                throw new Error("Item não informado.");
            }
            return sellItem(brechoId, itemId, {
                cliente: {
                    nome: data.clienteNome.trim(),
                    whatsapp: data.clienteWhatsapp?.trim() || undefined,
                    instagram: data.clienteInstagram?.trim() || undefined
                },
                precoVenda: data.precoVenda,
                freteTexto: data.freteTexto?.trim() || undefined,
                freteValor: freteValor > 0 ? freteValor : undefined
            });
        },
        onSuccess: async () => {
            await queryClient.invalidateQueries({ queryKey: ["items", brechoId] });
            await queryClient.invalidateQueries({ queryKey: ["item", brechoId, itemId] });
            navigate("/");
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
                        }, children: "Foto" })), _jsx("div", { style: { display: "flex", flexDirection: "column", justifyContent: "center" }, children: _jsx("h3", { style: { margin: 0, fontSize: "1.35rem" }, children: item.nome }) })] })), _jsx(Section, { title: "Valores", children: _jsxs("form", { className: "stack", style: { gap: 20 }, onSubmit: handleSubmit((data) => sellMutation.mutate(data)), children: [queueEntries.length > 0 && (_jsxs("div", { style: { padding: 12, background: "#fff0f0", borderRadius: 12, fontSize: 14 }, children: [_jsx("strong", { children: "H\u00E1 fila para esta pe\u00E7a." }), _jsx("p", { style: { margin: "4px 0 12px", color: "#5a4042" }, children: "Escolha vender para a primeira pessoa, outra pessoa da fila ou uma venda manual." }), _jsxs("div", { style: { display: "flex", flexDirection: "column", gap: 8 }, children: [queueEntries.map((entry) => (_jsxs("button", { type: "button", onClick: () => {
                                                setSaleMode("queue");
                                                setSelectedQueueEntryId(entry.id);
                                            }, style: {
                                                padding: "10px 12px",
                                                borderRadius: 12,
                                                border: selectedQueueEntryId === entry.id && saleMode === "queue" ? "2px solid #b60e3d" : "1px solid #e2bec0",
                                                background: "#fff",
                                                textAlign: "left",
                                                cursor: "pointer"
                                            }, children: [_jsxs("strong", { children: [entry.posicao + 1, "\u00BA da fila: ", entry.cliente.nome] }), entry.posicao === 0 ? " · primeira pessoa" : null, _jsx("div", { style: { fontSize: 12, color: "#5a4042" }, children: [entry.cliente.whatsapp, entry.cliente.instagram].filter(Boolean).join(" · ") || "Sem contato" })] }, entry.id))), _jsx("button", { type: "button", onClick: () => {
                                                setSaleMode("manual");
                                                setSelectedQueueEntryId(null);
                                            }, style: {
                                                padding: "10px 12px",
                                                borderRadius: 12,
                                                border: saleMode === "manual" ? "2px solid #b60e3d" : "1px solid #e2bec0",
                                                background: "#fff",
                                                textAlign: "left",
                                                cursor: "pointer",
                                                fontWeight: 700
                                            }, children: "Vender para outra pessoa" })] })] })), !selectedCliente && (_jsxs(_Fragment, { children: [_jsx(Field, { label: "Nome completo", children: _jsx(Input, { ...register("clienteNome") }) }), _jsxs("div", { className: "grid cols-2", children: [_jsx(Field, { label: "WhatsApp", children: _jsx(Input, { ...register("clienteWhatsapp"), type: "tel", placeholder: "55 11 99999-9999" }) }), _jsx(Field, { label: "Instagram", children: _jsx(Input, { ...register("clienteInstagram"), placeholder: "@usuario" }) })] })] })), selectedCliente && (_jsxs("div", { style: { padding: 12, background: "#fff0f0", borderRadius: 12, fontSize: 14 }, children: [_jsx("strong", { children: "Cliente selecionado:" }), " ", selectedCliente.nome, _jsxs("div", { style: { fontSize: 12, color: "#5a4042", marginTop: 4 }, children: [selectedCliente.whatsapp ? `WhatsApp: ${selectedCliente.whatsapp}` : null, selectedCliente.whatsapp && selectedCliente.instagram ? " · " : null, selectedCliente.instagram ? `Instagram: @${selectedCliente.instagram}` : null] }), _jsx("input", { type: "hidden", ...register("clienteNome") }), _jsx("input", { type: "hidden", ...register("clienteWhatsapp") }), _jsx("input", { type: "hidden", ...register("clienteInstagram") })] })), _jsxs(Field, { label: "Pre\u00E7o da pe\u00E7a (R$)", children: [_jsx(Input, { type: "number", step: "0.01", min: 0, ...register("precoVenda", { valueAsNumber: true }) }), _jsx("small", { style: { color: "#5a4042" }, children: "Pr\u00E9-preenchido com o pre\u00E7o de an\u00FAncio. Toque para editar." })] }), _jsxs(Field, { label: "Informa\u00E7\u00F5es de envio", children: [_jsx(Input, { ...register("freteTexto"), placeholder: "ex: Correios R$15 ou Correios 15,50" }), _jsx("small", { style: { color: "#5a4042" }, children: "O valor num\u00E9rico do frete \u00E9 somado ao pre\u00E7o da pe\u00E7a." })] }), _jsxs("div", { style: {
                                padding: 24,
                                background: "#fff0f0",
                                borderRadius: "2rem",
                                display: "flex",
                                flexDirection: "column",
                                gap: 12
                            }, children: [_jsxs("div", { style: { display: "flex", justifyContent: "space-between" }, children: [_jsx("span", { style: { color: "#5a4042" }, children: "Pre\u00E7o da pe\u00E7a" }), _jsx("strong", { children: formatMoney(typeof precoVenda === "number" ? precoVenda : Number(precoVenda) || 0) })] }), _jsxs("div", { style: { display: "flex", justifyContent: "space-between" }, children: [_jsx("span", { style: { color: "#5a4042" }, children: "Frete" }), _jsxs("strong", { style: { color: "#006a39" }, children: ["+ ", formatMoney(freteValor)] })] }), _jsx("div", { style: { borderTop: "1px solid #e2bec0", paddingTop: 12, marginTop: 4 } }), _jsxs("div", { style: { display: "flex", justifyContent: "space-between", alignItems: "center" }, children: [_jsx("span", { style: { fontSize: "1.1rem", fontWeight: 800 }, children: "Total da venda" }), _jsx("span", { style: { fontSize: "1.75rem", fontWeight: 800, color: "#b60e3d" }, children: formatMoney(totalVenda) })] })] }), _jsx(Button, { type: "submit", disabled: sellMutation.isPending || !item || itemQuery.isLoading, children: sellMutation.isPending ? "Confirmando..." : "Confirmar venda" }), _jsxs("p", { style: { textAlign: "center", fontSize: 13, color: "#5a4042", margin: 0 }, children: ["Ao confirmar, o status do item ser\u00E1 movido para ", _jsx("strong", { style: { color: "#b60e3d" }, children: "Vendido" }), " no seu estoque."] })] }) })] }));
};
