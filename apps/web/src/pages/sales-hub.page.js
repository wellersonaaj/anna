import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { deliverSale, listItems, listSalesDelivered, listSalesPendingDelivery } from "../api/items";
import { AppShell, Button, Input, TopShortcutBar, formatCurrency, relativeAgeLabel } from "../components/ui";
import { useSessionStore } from "../store/session.store";
const sortReservedByOldest = (items) => [...items].sort((a, b) => {
    const aTime = new Date(a.ultimoStatus?.criadoEm ?? a.criadoEm).getTime();
    const bTime = new Date(b.ultimoStatus?.criadoEm ?? b.criadoEm).getTime();
    return aTime - bTime;
});
export const SalesHubPage = () => {
    const brechoId = useSessionStore((state) => state.brechoId);
    const queryClient = useQueryClient();
    const [rastreioPorVenda, setRastreioPorVenda] = useState({});
    const [deliveredOffset, setDeliveredOffset] = useState(0);
    const [deliveredRows, setDeliveredRows] = useState([]);
    const reservedItemsQuery = useQuery({
        queryKey: ["items", brechoId, "reserved-hub"],
        queryFn: () => listItems(brechoId, { status: "RESERVADO" })
    });
    const pendingSalesQuery = useQuery({
        queryKey: ["pending-sales", brechoId],
        queryFn: () => listSalesPendingDelivery(brechoId)
    });
    const deliveredSalesQuery = useQuery({
        queryKey: ["delivered-sales", brechoId, deliveredOffset],
        queryFn: () => listSalesDelivered(brechoId, { days: 30, limit: 20, offset: deliveredOffset })
    });
    useEffect(() => {
        if (!deliveredSalesQuery.data) {
            return;
        }
        if (deliveredOffset === 0) {
            setDeliveredRows(deliveredSalesQuery.data.rows);
            return;
        }
        setDeliveredRows((prev) => {
            const known = new Set(prev.map((row) => row.id));
            const merged = [...prev];
            for (const row of deliveredSalesQuery.data.rows) {
                if (!known.has(row.id)) {
                    merged.push(row);
                }
            }
            return merged;
        });
    }, [deliveredSalesQuery.data, deliveredOffset]);
    const reservedItems = useMemo(() => sortReservedByOldest(reservedItemsQuery.data ?? []), [reservedItemsQuery.data]);
    const deliverMutation = useMutation({
        mutationFn: (vars) => deliverSale(brechoId, vars.saleId, {
            codigoRastreio: vars.codigoRastreio?.trim() || undefined,
            entregueEm: new Date().toISOString()
        }),
        onSuccess: async () => {
            await queryClient.invalidateQueries({ queryKey: ["pending-sales", brechoId] });
            await queryClient.invalidateQueries({ queryKey: ["items", brechoId] });
            setDeliveredOffset(0);
            await queryClient.invalidateQueries({ queryKey: ["delivered-sales", brechoId] });
        }
    });
    return (_jsxs(AppShell, { showTopBar: true, showBottomNav: true, activeTab: "vendas", topBarTitle: "Agente Brech\u00F3", children: [_jsx(TopShortcutBar, { shortcuts: [
                    { id: "reservados", label: "Reservados" },
                    { id: "aguardando", label: "Aguardando" },
                    { id: "entregues", label: "Entregues" }
                ] }), _jsxs("section", { id: "reservados", className: "scroll-mt-40", children: [_jsxs("div", { className: "mb-4 flex items-center justify-between px-1", children: [_jsx("h2", { className: "font-headline text-2xl font-extrabold text-primary", children: "Reservados" }), _jsxs("span", { className: "rounded-full bg-rose-100 px-2 py-1 text-xs font-semibold text-primary", children: [reservedItems.length, " pe\u00E7as"] })] }), _jsxs("div", { className: "space-y-4", children: [reservedItemsQuery.isLoading && _jsx("p", { children: "Carregando reservados..." }), !reservedItemsQuery.isLoading && reservedItems.length === 0 && (_jsx("p", { className: "rounded-2xl border border-rose-100 bg-white p-4 text-sm text-on-surface-variant", children: "Sem pe\u00E7as reservadas no momento." })), reservedItems.map((item) => {
                                const age = relativeAgeLabel(item.ultimoStatus?.criadoEm ?? item.criadoEm);
                                const isUrgent = age.label.includes("h") && Number.parseInt(age.label.replace(/\D/g, ""), 10) >= 24;
                                return (_jsxs("article", { className: "rounded-3xl border border-rose-50 bg-white p-4 shadow-sm", children: [_jsxs("div", { className: "flex gap-4", children: [item.fotoCapaUrl ? (_jsx("img", { src: item.fotoCapaUrl, alt: `Foto da peça ${item.nome}`, className: "h-20 w-20 rounded-2xl object-cover", loading: "lazy" })) : (_jsx("div", { className: "flex h-20 w-20 items-center justify-center rounded-2xl bg-surface-container-low text-xs text-outline", children: "Sem foto" })), _jsxs("div", { className: "flex-1", children: [_jsxs("div", { className: "flex items-start justify-between gap-2", children: [_jsx("h3", { className: "font-bold text-gray-900", children: item.nome }), isUrgent && (_jsx("span", { className: "rounded-full bg-red-500 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white", children: "Urgente" }))] }), _jsxs("p", { className: "text-sm text-gray-500", children: ["Reservado por ", item.ultimoStatus?.cliente?.nome ?? "cliente não identificado"] }), _jsx("p", { className: "mt-1 text-xs font-bold italic", style: { color: age.tone }, children: age.label })] })] }), _jsxs("div", { className: "mt-4 flex items-center justify-between border-t border-gray-50 pt-4", children: [_jsx("div", { className: "flex items-center gap-4", children: _jsx(Link, { to: `/items/${item.id}`, className: "text-xs font-bold uppercase tracking-widest text-gray-400", children: "Gerenciar fila" }) }), _jsx("div", { className: "flex items-center gap-3", children: _jsx(Link, { to: `/sell/${item.id}`, className: "rounded-full bg-primary px-6 py-2 text-sm font-bold text-white shadow-md shadow-rose-100 transition-transform active:scale-95", children: "Vender" }) })] })] }, item.id));
                            })] })] }), _jsxs("section", { id: "aguardando", className: "scroll-mt-40", children: [_jsxs("div", { className: "mb-4 flex items-center justify-between px-1", children: [_jsx("h2", { className: "font-headline text-2xl font-extrabold text-primary", children: "Aguardando Entrega" }), _jsxs("span", { className: "rounded-full bg-rose-100 px-2 py-1 text-xs font-semibold text-primary", children: [pendingSalesQuery.data?.length ?? 0, " pe\u00E7as"] })] }), _jsxs("div", { className: "space-y-4", children: [pendingSalesQuery.isLoading && _jsx("p", { children: "Carregando entregas pendentes..." }), !pendingSalesQuery.isLoading && !pendingSalesQuery.data?.length && (_jsx("p", { className: "rounded-2xl border border-rose-100 bg-white p-4 text-sm text-on-surface-variant", children: "Nenhuma venda aguardando entrega." })), pendingSalesQuery.data?.map((sale) => (_jsxs("article", { className: "rounded-3xl border border-rose-50 bg-white p-4 shadow-sm", children: [_jsxs("div", { className: "flex gap-4", children: [sale.peca.fotoCapaUrl ? (_jsx("img", { src: sale.peca.fotoCapaUrl, alt: `Foto da peça ${sale.peca.nome}`, className: "h-20 w-20 rounded-2xl object-cover", loading: "lazy" })) : (_jsx("div", { className: "flex h-20 w-20 items-center justify-center rounded-2xl bg-surface-container-low text-xs text-outline", children: "Sem foto" })), _jsxs("div", { className: "flex-1", children: [_jsx("h3", { className: "font-bold text-gray-900", children: sale.peca.nome }), _jsxs("p", { className: "text-sm text-gray-500", children: ["Cliente: ", sale.cliente.nome] }), _jsx("div", { className: "mt-3", children: _jsx(Input, { placeholder: "C\u00F3digo de rastreio (opcional)", value: rastreioPorVenda[sale.id] ?? "", onChange: (event) => setRastreioPorVenda((prev) => ({
                                                                ...prev,
                                                                [sale.id]: event.target.value
                                                            })) }) })] })] }), _jsx("div", { className: "mt-4 flex items-center justify-end border-t border-gray-50 pt-4", children: _jsx(Button, { type: "button", disabled: deliverMutation.isPending, onClick: () => deliverMutation.mutate({
                                                saleId: sale.id,
                                                codigoRastreio: rastreioPorVenda[sale.id]
                                            }), children: "Marcar como Entregue" }) })] }, sale.id)))] })] }), _jsxs("section", { id: "entregues", className: "scroll-mt-40", children: [_jsxs("div", { className: "mb-4 flex items-center justify-between px-1", children: [_jsx("h2", { className: "font-headline text-2xl font-extrabold text-primary", children: "Entregues" }), _jsx("span", { className: "rounded-full bg-rose-100 px-2 py-1 text-xs font-semibold text-primary", children: "30 dias" })] }), _jsxs("div", { className: "space-y-3", children: [deliveredSalesQuery.isLoading && deliveredOffset === 0 && _jsx("p", { children: "Carregando hist\u00F3rico..." }), !deliveredSalesQuery.isLoading && deliveredRows.length === 0 && (_jsx("p", { className: "rounded-2xl border border-rose-100 bg-white p-4 text-sm text-on-surface-variant", children: "Nenhuma entrega nos \u00FAltimos 30 dias." })), deliveredRows.map((sale) => (_jsx("article", { className: "rounded-2xl border border-rose-50 bg-white p-3 shadow-sm", children: _jsxs("div", { className: "flex items-center gap-4", children: [sale.peca.fotoCapaUrl ? (_jsx("img", { src: sale.peca.fotoCapaUrl, alt: `Foto da peça ${sale.peca.nome}`, className: "h-14 w-14 rounded-xl object-cover", loading: "lazy" })) : (_jsx("div", { className: "flex h-14 w-14 items-center justify-center rounded-xl bg-surface-container-low text-xs text-outline", children: "Sem foto" })), _jsxs("div", { className: "flex-1", children: [_jsx("h3", { className: "font-bold text-gray-900", children: sale.peca.nome }), _jsxs("p", { className: "text-xs text-gray-500", children: [sale.cliente.nome, " \u2022 ", new Date(sale.entrega?.entregueEm ?? sale.criadoEm).toLocaleDateString("pt-BR")] })] }), _jsx("strong", { className: "text-primary", children: formatCurrency(sale.ganhosTotal) })] }) }, sale.id))), deliveredSalesQuery.data?.hasMore && (_jsx(Button, { type: "button", className: "w-full", disabled: deliveredSalesQuery.isFetching, onClick: () => setDeliveredOffset((prev) => prev + (deliveredSalesQuery.data?.rows.length ?? 20)), children: "Ver mais" }))] })] })] }));
};
