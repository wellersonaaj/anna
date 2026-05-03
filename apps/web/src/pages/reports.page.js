import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useQuery } from "@tanstack/react-query";
import { listItems, listSalesDelivered, listSalesPendingDelivery } from "../api/items";
import { AppShell, formatCurrency } from "../components/ui";
import { useSessionStore } from "../store/session.store";
const daysSince = (isoDate) => Math.floor((Date.now() - new Date(isoDate).getTime()) / (1000 * 60 * 60 * 24));
const inStockStatuses = new Set(["DISPONIVEL", "RESERVADO", "INDISPONIVEL"]);
export const ReportsPage = () => {
    const brechoId = useSessionStore((state) => state.brechoId);
    const itemsQuery = useQuery({
        queryKey: ["items", brechoId, "reports"],
        queryFn: () => listItems(brechoId)
    });
    const deliveredQuery = useQuery({
        queryKey: ["delivered-sales", brechoId, "reports"],
        queryFn: () => listSalesDelivered(brechoId, { days: 30, limit: 100, offset: 0 })
    });
    const pendingDeliveryQuery = useQuery({
        queryKey: ["pending-sales", brechoId, "reports"],
        queryFn: () => listSalesPendingDelivery(brechoId)
    });
    const items = itemsQuery.data ?? [];
    const deliveredRows = deliveredQuery.data?.rows ?? [];
    const pendingRows = pendingDeliveryQuery.data ?? [];
    const stockCount = items.filter((item) => inStockStatuses.has(item.status)).length;
    const soldMonthEstimate = deliveredRows.length + pendingRows.length;
    const grossRevenue = deliveredRows.reduce((sum, row) => {
        const asNumber = typeof row.ganhosTotal === "string" ? Number(row.ganhosTotal.replace(",", ".")) : Number(row.ganhosTotal);
        return sum + (Number.isNaN(asNumber) ? 0 : asNumber);
    }, 0);
    const staleItems = items
        .filter((item) => inStockStatuses.has(item.status) && daysSince(item.criadoEm) > 30)
        .sort((a, b) => new Date(a.criadoEm).getTime() - new Date(b.criadoEm).getTime())
        .slice(0, 10);
    return (_jsxs(AppShell, { showTopBar: true, showBottomNav: true, activeTab: "relatorios", topBarTitle: "Agente Brech\u00F3", children: [_jsxs("div", { className: "mb-2", children: [_jsx("h1", { className: "text-3xl font-extrabold tracking-tight", children: "Relat\u00F3rios" }), _jsx("p", { className: "text-sm font-medium text-gray-500", children: "Vis\u00E3o geral do seu desempenho este m\u00EAs" })] }), (itemsQuery.isLoading || deliveredQuery.isLoading || pendingDeliveryQuery.isLoading) && (_jsx("p", { children: "Carregando indicadores..." })), _jsxs("div", { className: "grid grid-cols-1 gap-4", children: [_jsxs("div", { className: "flex items-center justify-between rounded-3xl border border-rose-50 bg-white p-6", children: [_jsxs("div", { children: [_jsx("span", { className: "block text-4xl font-extrabold", children: stockCount }), _jsx("span", { className: "text-sm font-semibold text-gray-500", children: "Pe\u00E7as em estoque" })] }), _jsx("div", { className: "flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-50 text-primary", children: _jsx("span", { className: "material-symbols-outlined", children: "inventory_2" }) })] }), _jsxs("div", { className: "flex items-center justify-between rounded-3xl border border-rose-50 bg-white p-6", children: [_jsxs("div", { children: [_jsx("span", { className: "block text-4xl font-extrabold", children: soldMonthEstimate }), _jsx("span", { className: "text-sm font-semibold text-gray-500", children: "Vendidas este m\u00EAs" })] }), _jsx("div", { className: "flex h-12 w-12 items-center justify-center rounded-2xl bg-green-50 text-green-600", children: _jsx("span", { className: "material-symbols-outlined", children: "shopping_bag" }) })] }), _jsxs("div", { className: "flex items-center justify-between rounded-3xl border border-rose-50 bg-white p-6 shadow-sm", children: [_jsxs("div", { children: [_jsx("span", { className: "block text-4xl font-extrabold text-primary", children: formatCurrency(grossRevenue) }), _jsx("span", { className: "text-sm font-semibold text-gray-500", children: "Faturamento do m\u00EAs" })] }), _jsx("div", { className: "flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-100 text-primary", children: _jsx("span", { className: "material-symbols-outlined", children: "payments" }) })] }), _jsxs("div", { className: "flex items-center justify-between rounded-3xl border border-rose-50 bg-white p-6", children: [_jsxs("div", { children: [_jsx("span", { className: "block text-4xl font-extrabold text-amber-500", children: staleItems.length }), _jsx("span", { className: "text-sm font-semibold text-gray-500", children: "Paradas h\u00E1 +30 dias" })] }), _jsx("div", { className: "flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-50 text-amber-600", children: _jsx("span", { className: "material-symbols-outlined", children: "timer" }) })] })] }), _jsxs("section", { className: "mt-2", children: [_jsxs("div", { className: "mb-4 flex items-center justify-between", children: [_jsx("h2", { className: "text-lg font-bold", children: "Pe\u00E7as sem movimento" }), _jsx("span", { className: "rounded-full bg-rose-50 px-2 py-1 text-xs font-bold text-primary", children: "+30 dias" })] }), _jsxs("div", { className: "space-y-3", children: [staleItems.length === 0 && (_jsx("p", { className: "rounded-2xl border border-rose-100 bg-white p-4 text-sm text-on-surface-variant", children: "N\u00E3o h\u00E1 pe\u00E7as paradas acima de 30 dias." })), staleItems.map((item) => {
                                const staleThumb = item.fotoCapaThumbnailUrl ?? item.fotoCapaUrl;
                                return (_jsxs("article", { className: "flex items-center gap-4 rounded-2xl border border-rose-50 bg-white p-3", children: [staleThumb ? (_jsx("img", { src: staleThumb, alt: `Foto da peça ${item.nome}`, className: "h-16 w-16 rounded-xl object-cover", loading: "lazy" })) : (_jsx("div", { className: "flex h-16 w-16 items-center justify-center rounded-xl bg-surface-container-low text-xs text-outline", children: "Sem foto" })), _jsxs("div", { className: "flex-grow", children: [_jsx("h3", { className: "text-sm font-bold text-gray-800", children: item.nome }), _jsxs("p", { className: "text-xs text-gray-500", children: [item.subcategoria, " \u2022 ", item.status.toLowerCase()] })] }), _jsxs("div", { className: "text-right", children: [_jsxs("span", { className: "block text-sm font-bold text-amber-600", children: [daysSince(item.criadoEm), " dias"] }), _jsx("span", { className: "text-[10px] font-bold uppercase text-gray-400", children: "parada" })] })] }, item.id));
                            })] })] })] }));
};
