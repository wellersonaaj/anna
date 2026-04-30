import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { countImportacoesPendentes } from "../api/importacoes";
import { listItems } from "../api/items";
import { useSessionStore } from "../store/session.store";
import { AppShell, Input, PhotoLightbox, PillButton, ProductCard, formatCurrency } from "../components/ui";
export const InventoryPage = () => {
    const brechoId = useSessionStore((state) => state.brechoId);
    const [filterStatus, setFilterStatus] = useState("");
    const [filterCategoria, setFilterCategoria] = useState("");
    const [filterSearch, setFilterSearch] = useState("");
    const [expandedItem, setExpandedItem] = useState(null);
    const listFilters = useMemo(() => ({
        ...(filterStatus ? { status: filterStatus } : {}),
        ...(filterCategoria ? { categoria: filterCategoria } : {}),
        ...(filterSearch.trim() ? { search: filterSearch.trim() } : {})
    }), [filterStatus, filterCategoria, filterSearch]);
    const itemsQuery = useQuery({
        queryKey: ["items", brechoId, listFilters],
        queryFn: () => listItems(brechoId, listFilters)
    });
    const importPendentesQuery = useQuery({
        queryKey: ["importacoes-pendentes", brechoId],
        queryFn: () => countImportacoesPendentes(brechoId)
    });
    const statusFilters = [
        { key: "", label: "Todos" },
        { key: "DISPONIVEL", label: "Disponível" },
        { key: "RESERVADO", label: "Reservado" },
        { key: "INDISPONIVEL", label: "Indisponível" }
    ];
    const categoryFilters = [
        { key: "", label: "Todas" },
        { key: "ROUPA_FEMININA", label: "Roupas femininas" },
        { key: "ROUPA_MASCULINA", label: "Roupas masculinas" },
        { key: "CALCADO", label: "Calçados" },
        { key: "ACESSORIO", label: "Acessórios" }
    ];
    return (_jsxs(AppShell, { showTopBar: true, showBottomNav: true, activeTab: "estoque", topBarTitle: "Agente Brech\u00F3", topBarAction: _jsxs(Link, { to: "/importacoes", className: "text-xs font-bold text-primary underline", children: ["Importa\u00E7\u00F5es", importPendentesQuery.data?.count ? ` (${importPendentesQuery.data.count})` : ""] }), children: [_jsxs("section", { children: [_jsx("h1", { className: "mb-2 font-headline text-5xl font-extrabold tracking-tighter", children: "Estoque" }), importPendentesQuery.data?.count ? (_jsxs("p", { className: "mb-2 rounded-2xl border border-amber-100 bg-amber-50/90 px-3 py-2 text-sm text-on-background", children: ["Voc\u00EA tem", " ", _jsxs("strong", { children: [importPendentesQuery.data.count, " ", importPendentesQuery.data.count === 1 ? "importação pendente" : "importações pendentes"] }), ".", " ", _jsx(Link, { to: "/importacoes", className: "font-bold text-primary underline", children: "Continuar" })] })) : null] }), _jsxs("div", { className: "mb-2", children: [_jsx("label", { className: "mb-2 ml-1 block text-[10px] font-bold uppercase tracking-[0.1em] text-on-surface-variant", children: "Buscar pe\u00E7a" }), _jsx(Input, { value: filterSearch, onChange: (e) => setFilterSearch(e.target.value), placeholder: "Buscar por nome, cor ou categoria...", className: "h-12 rounded-none border-0 border-b-2 border-outline-variant bg-transparent px-0 text-base focus:border-primary" })] }), _jsxs("div", { className: "space-y-5", children: [_jsxs("div", { children: [_jsx("label", { className: "mb-3 block text-[9px] font-bold uppercase tracking-widest text-outline", children: "Status" }), _jsx("div", { className: "no-scrollbar flex gap-2 overflow-x-auto", children: statusFilters.map((statusFilter) => (_jsx(PillButton, { active: filterStatus === statusFilter.key, onClick: () => setFilterStatus(statusFilter.key), children: statusFilter.label }, statusFilter.label))) })] }), _jsxs("div", { children: [_jsx("label", { className: "mb-3 block text-[9px] font-bold uppercase tracking-widest text-outline", children: "Categoria" }), _jsx("div", { className: "no-scrollbar flex gap-2 overflow-x-auto", children: categoryFilters.map((categoryFilter) => (_jsx(PillButton, { active: filterCategoria === categoryFilter.key, onClick: () => setFilterCategoria(categoryFilter.key), children: categoryFilter.label }, categoryFilter.label))) })] })] }), itemsQuery.isLoading ? (_jsx("p", { children: "Carregando..." })) : itemsQuery.data?.length ? (_jsx("div", { className: "grid grid-cols-2 gap-x-4 gap-y-8", children: itemsQuery.data.map((item) => (_jsx("div", { children: _jsx(ProductCard, { item: item, subtitle: `${item.categoria.replaceAll("_", " ")} / ${item.subcategoria}`, priceLabel: formatCurrency(item.precoVenda), onImageClick: item.fotoCapaUrl
                            ? () => {
                                setExpandedItem(item);
                            }
                            : undefined, children: _jsxs("div", { className: "mt-2 flex flex-wrap gap-2", children: [_jsx(Link, { className: "text-xs font-bold text-on-surface-variant underline", to: `/items/${item.id}`, children: "Ver detalhes" }), (item.status === "DISPONIVEL" || item.status === "RESERVADO") && (_jsx(Link, { className: "text-xs font-bold text-primary underline", to: `/sell/${item.id}`, children: "Vender" })), (item.status === "DISPONIVEL" || item.status === "RESERVADO") && (_jsx(Link, { className: "text-xs font-bold text-primary underline", to: `/reserve/${item.id}`, children: item.status === "RESERVADO" ? "Adicionar à fila" : "Reservar" }))] }) }) }, item.id))) })) : (_jsx("p", { className: "rounded-2xl border border-rose-100 bg-white p-4 text-sm text-on-surface-variant", children: "Nenhuma pe\u00E7a encontrada com os filtros atuais." })), expandedItem?.fotoCapaUrl && (_jsx(PhotoLightbox, { photos: [{ id: expandedItem.id, url: expandedItem.fotoCapaUrl, alt: `Foto da peça ${expandedItem.nome}` }], initialIndex: 0, title: expandedItem.nome, onClose: () => setExpandedItem(null) }))] }));
};
