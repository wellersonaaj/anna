import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { listItems, sellBatch } from "../api/items";
import { ClientPicker } from "../components/client-picker";
import { AppShell, Button, Input } from "../components/ui";
import { useSessionStore } from "../store/session.store";
export const SellBatchPage = () => {
    const brechoId = useSessionStore((state) => state.brechoId);
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const pecaIds = useMemo(() => searchParams.get("ids")?.split(",").filter(Boolean) ?? [], [searchParams]);
    const [client, setClient] = useState(null);
    const [prices, setPrices] = useState({});
    const itemsQuery = useQuery({
        queryKey: ["items", brechoId, "batch", pecaIds.join(",")],
        queryFn: async () => {
            const all = await listItems(brechoId);
            return all.filter((item) => pecaIds.includes(item.id));
        },
        enabled: pecaIds.length > 0
    });
    const sellMutation = useMutation({
        mutationFn: () => {
            if (!client)
                throw new Error("Selecione a cliente.");
            return sellBatch(brechoId, {
                cliente: {
                    nome: client.nome.trim(),
                    whatsapp: client.whatsapp.trim() || undefined,
                    instagram: client.instagram.trim() || undefined
                },
                itens: (itemsQuery.data ?? []).map((item) => ({
                    pecaId: item.id,
                    precoVenda: Number.parseFloat(prices[item.id] || String(item.precoVenda ?? 0))
                }))
            });
        },
        onSuccess: () => navigate("/vendas")
    });
    return (_jsxs(AppShell, { showTopBar: true, topBarTitle: "Venda em lote", children: [_jsx(Link, { to: "/", className: "mb-4 inline-block text-sm font-semibold text-on-surface-variant", children: "\u2190 Voltar" }), !pecaIds.length && (_jsxs("p", { className: "rounded-2xl border border-rose-100 bg-white p-4 text-sm", children: ["Nenhuma pe\u00E7a selecionada. Use ", _jsx("code", { children: "?ids=id1,id2" }), " na URL."] })), itemsQuery.data && (_jsxs("div", { className: "space-y-4", children: [_jsx(ClientPicker, { brechoId: brechoId, selectedContact: client, onSelect: setClient, onCreateNew: setClient, onClear: () => setClient(null) }), _jsx("ul", { className: "space-y-3", children: itemsQuery.data.map((item) => (_jsxs("li", { className: "rounded-2xl border border-rose-50 bg-white p-3", children: [_jsxs("p", { className: "font-bold", children: [item.codigo ? `${item.codigo} · ` : "", item.nome] }), _jsx(Input, { type: "number", step: "0.01", placeholder: "Pre\u00E7o", value: prices[item.id] ?? String(item.precoVenda ?? ""), onChange: (e) => setPrices((prev) => ({ ...prev, [item.id]: e.target.value })) })] }, item.id))) }), _jsx(Button, { type: "button", disabled: !client || sellMutation.isPending, onClick: () => sellMutation.mutate(), children: "Confirmar venda" })] }))] }));
};
