import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { listItems, sellBatch } from "../api/items";
import { ClientPicker } from "../components/client-picker";
import { FreteInclusoDetail, parseFreteInclusoValorForApi, validateFreteInclusoValor } from "../components/frete-incluso-detail";
import { AppShell, Button, Field, Input } from "../components/ui";
import { parseMoneyLike } from "../lib/money";
import { useSessionStore } from "../store/session.store";
const chipStyle = (active) => ({
    padding: "10px 16px",
    borderRadius: 12,
    border: active ? "2px solid #b60e3d" : "1px solid #e2bec0",
    background: active ? "#fff0f0" : "#fff",
    cursor: "pointer",
    fontWeight: 700,
    fontSize: 14
});
export const SellBatchPage = () => {
    const brechoId = useSessionStore((state) => state.brechoId);
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const pecaIds = useMemo(() => searchParams.get("ids")?.split(",").filter(Boolean) ?? [], [searchParams]);
    const [client, setClient] = useState(null);
    const [prices, setPrices] = useState({});
    const [modoEntrega, setModoEntrega] = useState("SACOLA");
    const [freteIncluso, setFreteIncluso] = useState(false);
    const [freteInclusoValor, setFreteInclusoValor] = useState("");
    const [freteValidationError, setFreteValidationError] = useState(null);
    const itemsQuery = useQuery({
        queryKey: ["items", brechoId, "batch", pecaIds.join(",")],
        queryFn: async () => {
            const all = await listItems(brechoId);
            return all.filter((item) => pecaIds.includes(item.id));
        },
        enabled: pecaIds.length > 0
    });
    const items = itemsQuery.data ?? [];
    const singleItem = items.length === 1 ? items[0] : null;
    const singlePreco = singleItem
        ? parseMoneyLike(prices[singleItem.id] || String(singleItem.precoVenda ?? 0))
        : 0;
    const precoLabel = modoEntrega === "IMEDIATA"
        ? "Quanto a cliente pagou por peça?"
        : freteIncluso
            ? "Preço cobrado (com frete incluso)"
            : "Preço da peça (sem frete)";
    const sellMutation = useMutation({
        mutationFn: () => {
            if (!client)
                throw new Error("Selecione a cliente.");
            if (modoEntrega === "SACOLA" && freteIncluso && singleItem) {
                const freteError = validateFreteInclusoValor(singlePreco, freteInclusoValor);
                if (freteError) {
                    throw new Error(freteError);
                }
            }
            return sellBatch(brechoId, {
                cliente: {
                    nome: client.nome.trim(),
                    whatsapp: client.whatsapp.trim() || undefined,
                    instagram: client.instagram.trim() || undefined
                },
                modoEntrega,
                freteIncluso: modoEntrega === "SACOLA" ? freteIncluso : undefined,
                freteInclusoValor: modoEntrega === "SACOLA" && freteIncluso && singleItem
                    ? parseFreteInclusoValorForApi(singlePreco, freteInclusoValor)
                    : undefined,
                itens: items.map((item) => ({
                    pecaId: item.id,
                    precoVenda: Number.parseFloat(prices[item.id] || String(item.precoVenda ?? 0))
                }))
            });
        },
        onSuccess: () => navigate(modoEntrega === "SACOLA" ? "/vendas#aguardando" : "/vendas")
    });
    return (_jsxs(AppShell, { showTopBar: true, topBarTitle: "Venda em lote", children: [_jsx(Link, { to: "/", className: "mb-4 inline-block text-sm font-semibold text-on-surface-variant", children: "\u2190 Voltar" }), !pecaIds.length && (_jsxs("p", { className: "rounded-2xl border border-rose-100 bg-white p-4 text-sm", children: ["Nenhuma pe\u00E7a selecionada. Use ", _jsx("code", { children: "?ids=id1,id2" }), " na URL."] })), itemsQuery.data && (_jsxs("div", { className: "space-y-4", children: [_jsx(ClientPicker, { brechoId: brechoId, selectedContact: client, onSelect: setClient, onCreateNew: setClient, onClear: () => setClient(null) }), _jsx(Field, { label: "Como foi a entrega?", children: _jsxs("div", { style: { display: "flex", flexWrap: "wrap", gap: 8 }, children: [_jsx("button", { type: "button", style: chipStyle(modoEntrega === "IMEDIATA"), onClick: () => setModoEntrega("IMEDIATA"), children: "J\u00E1 entregue" }), _jsx("button", { type: "button", style: chipStyle(modoEntrega === "SACOLA"), onClick: () => setModoEntrega("SACOLA"), children: "Vai enviar depois" })] }) }), modoEntrega === "SACOLA" && (_jsxs(Field, { label: "Esse pre\u00E7o inclui frete?", children: [_jsxs("div", { style: { display: "flex", flexWrap: "wrap", gap: 8 }, children: [_jsx("button", { type: "button", style: chipStyle(freteIncluso), onClick: () => {
                                            setFreteIncluso(true);
                                            setFreteValidationError(null);
                                        }, children: "Sim" }), _jsx("button", { type: "button", style: chipStyle(!freteIncluso), onClick: () => {
                                            setFreteIncluso(false);
                                            setFreteInclusoValor("");
                                            setFreteValidationError(null);
                                        }, children: "N\u00E3o" })] }), !freteIncluso && (_jsx("small", { className: "text-on-surface-variant", children: "O frete ser\u00E1 informado ao enviar a sacola." })), freteIncluso && items.length > 1 && (_jsx("small", { className: "text-on-surface-variant", children: "Para detalhar frete por pe\u00E7a, venda uma de cada vez." }))] })), _jsx("p", { className: "text-sm font-semibold text-gray-700", children: precoLabel }), _jsx("ul", { className: "space-y-3", children: items.map((item) => (_jsxs("li", { className: "rounded-2xl border border-rose-50 bg-white p-3", children: [_jsxs("p", { className: "font-bold", children: [item.codigo ? `${item.codigo} · ` : "", item.nome] }), _jsx(Input, { type: "number", step: "0.01", placeholder: "Pre\u00E7o (R$)", value: prices[item.id] ?? String(item.precoVenda ?? ""), onChange: (e) => setPrices((prev) => ({ ...prev, [item.id]: e.target.value })) })] }, item.id))) }), modoEntrega === "SACOLA" && freteIncluso && singleItem && (_jsx(FreteInclusoDetail, { precoVenda: singlePreco, freteInclusoValor: freteInclusoValor, onFreteInclusoValorChange: (value) => {
                            setFreteInclusoValor(value);
                            setFreteValidationError(validateFreteInclusoValor(singlePreco, value));
                        } })), _jsxs("div", { className: "rounded-2xl bg-rose-50 p-4 text-sm", children: [_jsxs("strong", { children: [items.length, " pe\u00E7a(s)"] }), " nesta venda", modoEntrega === "SACOLA" && " · entram na sacola da cliente"] }), (freteValidationError || sellMutation.isError) && (_jsx("p", { className: "text-sm text-red-600", children: freteValidationError ??
                            (sellMutation.error instanceof Error ? sellMutation.error.message : "Erro ao confirmar venda.") })), _jsx(Button, { type: "button", disabled: !client || sellMutation.isPending || Boolean(freteValidationError), onClick: () => sellMutation.mutate(), children: "Confirmar venda" })] }))] }));
};
