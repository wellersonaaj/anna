import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo } from "react";
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
const getReservedCliente = (item) => {
    if (!item?.historicoStatus?.length) {
        return undefined;
    }
    const entry = item.historicoStatus.find((h) => h.status === "RESERVADO" && h.cliente);
    return entry?.cliente ?? undefined;
};
const formatMoney = (value) => value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
export const SellPage = () => {
    const { itemId } = useParams();
    const brechoId = useSessionStore((state) => state.brechoId);
    const queryClient = useQueryClient();
    const navigate = useNavigate();
    const itemQuery = useQuery({
        queryKey: ["item", brechoId, itemId],
        queryFn: () => getItem(brechoId, itemId),
        enabled: Boolean(itemId)
    });
    const item = itemQuery.data;
    const reservedCliente = useMemo(() => getReservedCliente(item), [item]);
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
        if (reservedCliente) {
            reset({
                clienteNome: reservedCliente.nome,
                clienteWhatsapp: reservedCliente.whatsapp ?? "",
                clienteInstagram: reservedCliente.instagram ?? "",
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
    }, [item, reservedCliente, reset]);
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
                }, children: [_jsx("div", { style: {
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
                        }, children: "Foto" }), _jsx("div", { style: { display: "flex", flexDirection: "column", justifyContent: "center" }, children: _jsx("h3", { style: { margin: 0, fontSize: "1.35rem" }, children: item.nome }) })] })), _jsx(Section, { title: "Valores", children: _jsxs("form", { className: "stack", style: { gap: 20 }, onSubmit: handleSubmit((data) => sellMutation.mutate(data)), children: [!reservedCliente && (_jsxs(_Fragment, { children: [_jsx(Field, { label: "Nome completo", children: _jsx(Input, { ...register("clienteNome") }) }), _jsxs("div", { className: "grid cols-2", children: [_jsx(Field, { label: "WhatsApp", children: _jsx(Input, { ...register("clienteWhatsapp"), type: "tel", placeholder: "55 11 99999-9999" }) }), _jsx(Field, { label: "Instagram", children: _jsx(Input, { ...register("clienteInstagram"), placeholder: "@usuario" }) })] })] })), reservedCliente && (_jsxs("div", { style: { padding: 12, background: "#fff0f0", borderRadius: 12, fontSize: 14 }, children: [_jsx("strong", { children: "Cliente da reserva:" }), " ", reservedCliente.nome, _jsxs("div", { style: { fontSize: 12, color: "#5a4042", marginTop: 4 }, children: [reservedCliente.whatsapp ? `WhatsApp: ${reservedCliente.whatsapp}` : null, reservedCliente.whatsapp && reservedCliente.instagram ? " · " : null, reservedCliente.instagram ? `Instagram: @${reservedCliente.instagram}` : null] }), _jsx("input", { type: "hidden", ...register("clienteNome") }), _jsx("input", { type: "hidden", ...register("clienteWhatsapp") }), _jsx("input", { type: "hidden", ...register("clienteInstagram") })] })), _jsxs(Field, { label: "Pre\u00E7o da pe\u00E7a (R$)", children: [_jsx(Input, { type: "number", step: "0.01", min: 0, ...register("precoVenda", { valueAsNumber: true }) }), _jsx("small", { style: { color: "#5a4042" }, children: "Pr\u00E9-preenchido com o pre\u00E7o de an\u00FAncio. Toque para editar." })] }), _jsxs(Field, { label: "Informa\u00E7\u00F5es de envio", children: [_jsx(Input, { ...register("freteTexto"), placeholder: "ex: Correios R$15 ou Correios 15,50" }), _jsx("small", { style: { color: "#5a4042" }, children: "O valor num\u00E9rico do frete \u00E9 somado ao pre\u00E7o da pe\u00E7a." })] }), _jsxs("div", { style: {
                                padding: 24,
                                background: "#fff0f0",
                                borderRadius: "2rem",
                                display: "flex",
                                flexDirection: "column",
                                gap: 12
                            }, children: [_jsxs("div", { style: { display: "flex", justifyContent: "space-between" }, children: [_jsx("span", { style: { color: "#5a4042" }, children: "Pre\u00E7o da pe\u00E7a" }), _jsx("strong", { children: formatMoney(typeof precoVenda === "number" ? precoVenda : Number(precoVenda) || 0) })] }), _jsxs("div", { style: { display: "flex", justifyContent: "space-between" }, children: [_jsx("span", { style: { color: "#5a4042" }, children: "Frete" }), _jsxs("strong", { style: { color: "#006a39" }, children: ["+ ", formatMoney(freteValor)] })] }), _jsx("div", { style: { borderTop: "1px solid #e2bec0", paddingTop: 12, marginTop: 4 } }), _jsxs("div", { style: { display: "flex", justifyContent: "space-between", alignItems: "center" }, children: [_jsx("span", { style: { fontSize: "1.1rem", fontWeight: 800 }, children: "Total da venda" }), _jsx("span", { style: { fontSize: "1.75rem", fontWeight: 800, color: "#b60e3d" }, children: formatMoney(totalVenda) })] })] }), _jsx(Button, { type: "submit", disabled: sellMutation.isPending || !item || itemQuery.isLoading, children: sellMutation.isPending ? "Confirmando..." : "Confirmar venda" }), _jsxs("p", { style: { textAlign: "center", fontSize: 13, color: "#5a4042", margin: 0 }, children: ["Ao confirmar, o status do item ser\u00E1 movido para ", _jsx("strong", { style: { color: "#b60e3d" }, children: "Vendido" }), " no seu estoque."] })] }) })] }));
};
