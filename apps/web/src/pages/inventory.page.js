import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useId, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { countImportacoesPendentes } from "../api/importacoes";
import { getItem, listAcervoSuggestions, listItems, setItemCoverFoto } from "../api/items";
import { includesSoldStatuses, readInventoryPrefs, SOLD_ITEM_STATUSES, writeInventoryPrefs } from "../lib/inventory-prefs";
import { useSessionStore } from "../store/session.store";
import { AppShell, Input, PhotoLightbox, PillButton, ProductCard, formatCurrency } from "../components/ui";
const STATUS_FILTER_OPTIONS = [
    { key: "DISPONIVEL", label: "Disponível" },
    { key: "RESERVADO", label: "Reservado" },
    { key: "INDISPONIVEL", label: "Indisponível" },
    { key: "VENDIDO", label: "Vendido" },
    { key: "ENTREGUE", label: "Entregue" }
];
export const InventoryPage = () => {
    const brechoId = useSessionStore((state) => state.brechoId);
    const queryClient = useQueryClient();
    const [filterStatusIn, setFilterStatusIn] = useState(() => brechoId ? readInventoryPrefs(brechoId).statusIn : []);
    const soldWithinDays = brechoId ? readInventoryPrefs(brechoId).soldWithinDays : 30;
    const [filterCategoria, setFilterCategoria] = useState("");
    const [filterAcervoTipo, setFilterAcervoTipo] = useState("");
    const [filterAcervoNome, setFilterAcervoNome] = useState("");
    const [filterSearch, setFilterSearch] = useState("");
    const [expandedItemId, setExpandedItemId] = useState(null);
    const acervoSuggestionsListId = useId();
    useEffect(() => {
        if (!brechoId) {
            return;
        }
        const prefs = readInventoryPrefs(brechoId);
        setFilterStatusIn(prefs.statusIn);
    }, [brechoId]);
    const toggleStatusFilter = (status) => {
        setFilterStatusIn((current) => {
            const next = current.includes(status) ? current.filter((entry) => entry !== status) : [...current, status];
            if (brechoId) {
                writeInventoryPrefs(brechoId, { statusIn: next });
            }
            return next;
        });
    };
    const showSoldStatuses = includesSoldStatuses(filterStatusIn);
    const listFilters = useMemo(() => ({
        statusIn: filterStatusIn,
        ...(showSoldStatuses ? { soldWithinDays } : {}),
        ...(filterCategoria ? { categoria: filterCategoria } : {}),
        ...(filterSearch.trim() ? { search: filterSearch.trim() } : {}),
        ...(filterAcervoTipo ? { acervoTipo: filterAcervoTipo } : {}),
        ...(filterAcervoNome.trim() ? { acervoNome: filterAcervoNome.trim() } : {})
    }), [filterStatusIn, showSoldStatuses, soldWithinDays, filterCategoria, filterSearch, filterAcervoTipo, filterAcervoNome]);
    const acervoSuggestionsQuery = useQuery({
        queryKey: ["acervo-suggestions", brechoId, filterAcervoTipo, filterAcervoNome],
        queryFn: () => listAcervoSuggestions(brechoId, {
            q: filterAcervoNome.trim() || undefined,
            acervoTipo: filterAcervoTipo || undefined,
            limit: 20
        }),
        enabled: Boolean(brechoId)
    });
    const itemsQuery = useQuery({
        queryKey: ["items", brechoId, listFilters],
        queryFn: () => listItems(brechoId, listFilters)
    });
    const importPendentesQuery = useQuery({
        queryKey: ["importacoes-pendentes", brechoId],
        queryFn: () => countImportacoesPendentes(brechoId)
    });
    const expandedItemQuery = useQuery({
        queryKey: ["item", brechoId, expandedItemId],
        queryFn: () => getItem(brechoId, expandedItemId),
        enabled: Boolean(expandedItemId)
    });
    const setCoverMutation = useMutation({
        mutationFn: (vars) => setItemCoverFoto(brechoId, vars.itemId, vars.fotoId),
        onSuccess: async () => {
            await queryClient.invalidateQueries({ queryKey: ["items", brechoId] });
            await queryClient.invalidateQueries({ queryKey: ["item", brechoId, expandedItemId] });
        }
    });
    const categoryFilters = [
        { key: "", label: "Todas" },
        { key: "ROUPA_FEMININA", label: "Roupas femininas" },
        { key: "ROUPA_MASCULINA", label: "Roupas masculinas" },
        { key: "CALCADO", label: "Calçados" },
        { key: "ACESSORIO", label: "Acessórios" }
    ];
    const acervoTipoFilters = [
        { key: "", label: "Todos" },
        { key: "PROPRIO", label: "Próprio" },
        { key: "CONSIGNACAO", label: "Consignação" }
    ];
    return (_jsxs(AppShell, { showTopBar: true, showBottomNav: true, activeTab: "estoque", topBarAction: _jsxs(Link, { to: "/importacoes", className: "text-xs font-bold text-primary underline", children: ["Importa\u00E7\u00F5es", importPendentesQuery.data?.count ? ` (${importPendentesQuery.data.count})` : ""] }), children: [_jsxs("section", { children: [_jsx("h1", { className: "mb-2 font-headline text-5xl font-extrabold tracking-tighter", children: "Estoque" }), importPendentesQuery.data?.count ? (_jsxs("p", { className: "mb-2 rounded-2xl border border-amber-100 bg-amber-50/90 px-3 py-2 text-sm text-on-background", children: ["Voc\u00EA tem", " ", _jsxs("strong", { children: [importPendentesQuery.data.count, " ", importPendentesQuery.data.count === 1 ? "importação pendente" : "importações pendentes"] }), ".", " ", _jsx(Link, { to: "/importacoes", className: "font-bold text-primary underline", children: "Continuar" })] })) : null] }), _jsxs("div", { className: "mb-2", children: [_jsx("label", { className: "mb-2 ml-1 block text-[10px] font-bold uppercase tracking-[0.1em] text-on-surface-variant", children: "Buscar pe\u00E7a" }), _jsx(Input, { value: filterSearch, onChange: (e) => setFilterSearch(e.target.value), placeholder: "Buscar por nome, cor ou categoria...", className: "h-12 rounded-none border-0 border-b-2 border-outline-variant bg-transparent px-0 text-base focus:border-primary" })] }), _jsxs("div", { className: "space-y-5", children: [_jsxs("div", { children: [_jsx("label", { className: "mb-3 block text-[9px] font-bold uppercase tracking-widest text-outline", children: "Status" }), _jsx("div", { className: "flex flex-wrap gap-3", children: STATUS_FILTER_OPTIONS.map((statusFilter) => (_jsxs("label", { className: "inline-flex cursor-pointer items-center gap-2 rounded-full border border-rose-100 bg-white px-3 py-2 text-sm font-semibold text-on-surface-variant", children: [_jsx("input", { type: "checkbox", checked: filterStatusIn.includes(statusFilter.key), onChange: () => toggleStatusFilter(statusFilter.key), className: "h-4 w-4 accent-primary" }), statusFilter.label] }, statusFilter.key))) }), showSoldStatuses ? (_jsxs("p", { className: "mt-2 text-xs text-on-surface-variant", children: ["Mostrando ", SOLD_ITEM_STATUSES.filter((status) => filterStatusIn.includes(status)).map((status) => (status === "VENDIDO" ? "vendidos" : "entregues")).join(" e "), " dos \u00FAltimos ", soldWithinDays, " dias.", " ", _jsx(Link, { to: "/conta/preferencias", className: "font-bold text-primary underline", children: "Ajustar prazo" })] })) : null] }), _jsxs("div", { children: [_jsx("label", { className: "mb-3 block text-[9px] font-bold uppercase tracking-widest text-outline", children: "Categoria" }), _jsx("div", { className: "no-scrollbar flex gap-2 overflow-x-auto", children: categoryFilters.map((categoryFilter) => (_jsx(PillButton, { active: filterCategoria === categoryFilter.key, onClick: () => setFilterCategoria(categoryFilter.key), children: categoryFilter.label }, categoryFilter.label))) })] }), _jsxs("div", { children: [_jsx("label", { className: "mb-3 block text-[9px] font-bold uppercase tracking-widest text-outline", children: "Tipo de acervo" }), _jsx("div", { className: "no-scrollbar flex gap-2 overflow-x-auto", children: acervoTipoFilters.map((acervoTipoFilter) => (_jsx(PillButton, { active: filterAcervoTipo === acervoTipoFilter.key, onClick: () => setFilterAcervoTipo(acervoTipoFilter.key), children: acervoTipoFilter.label }, acervoTipoFilter.label))) })] }), _jsxs("div", { children: [_jsx("label", { className: "mb-2 ml-1 block text-[10px] font-bold uppercase tracking-[0.1em] text-on-surface-variant", children: "Nome do acervo" }), _jsx(Input, { list: acervoSuggestionsListId, value: filterAcervoNome, onChange: (e) => setFilterAcervoNome(e.target.value), placeholder: "Filtrar por nome (opcional)...", className: "h-12 rounded-none border-0 border-b-2 border-outline-variant bg-transparent px-0 text-base focus:border-primary" }), _jsx("datalist", { id: acervoSuggestionsListId, children: (acervoSuggestionsQuery.data ?? []).map((suggestion) => (_jsx("option", { value: suggestion }, suggestion))) })] })] }), itemsQuery.isLoading && _jsx("p", { children: "Carregando..." }), itemsQuery.isError && (_jsx("p", { className: "rounded-2xl border border-rose-100 bg-white p-4 text-sm text-on-surface-variant", children: "N\u00E3o foi poss\u00EDvel carregar. Verifique a conex\u00E3o e tente de novo." })), itemsQuery.isSuccess && !itemsQuery.data?.length && (_jsx("p", { className: "rounded-2xl border border-rose-100 bg-white p-4 text-sm text-on-surface-variant", children: "Nenhuma pe\u00E7a encontrada com os filtros atuais." })), itemsQuery.isSuccess && itemsQuery.data?.length ? (_jsx("div", { className: "grid grid-cols-2 gap-x-4 gap-y-8", children: itemsQuery.data.map((item) => (_jsx("div", { children: _jsx(ProductCard, { item: item, subtitle: `${item.codigo ? `${item.codigo} · ` : ""}${item.categoria.replaceAll("_", " ")} / ${item.subcategoria}`, priceLabel: formatCurrency(item.precoVenda), onImageClick: (item.fotoPreviews?.length || item.fotoCapaThumbnailUrl || item.fotoCapaUrl)
                            ? () => {
                                setExpandedItemId(item.id);
                            }
                            : undefined, children: _jsxs("div", { className: "mt-2 flex flex-wrap gap-2", children: [_jsx(Link, { className: "text-xs font-bold text-on-surface-variant underline", to: `/items/${item.id}`, children: "Ver detalhes" }), (item.status === "DISPONIVEL" || item.status === "RESERVADO") && (_jsx(Link, { className: "text-xs font-bold text-primary underline", to: `/sell/${item.id}`, children: "Vender" })), (item.status === "DISPONIVEL" || item.status === "RESERVADO") && (_jsx(Link, { className: "text-xs font-bold text-primary underline", to: `/reserve/${item.id}`, children: item.status === "RESERVADO" ? "Adicionar à fila" : "Reservar" }))] }) }, item.id) }, item.id))) })) : null, expandedItemId && expandedItemQuery.isLoading && (_jsx("div", { className: "fixed inset-0 z-[80] flex items-center justify-center bg-black/70 p-4 text-white", children: "Carregando fotos..." })), expandedItemId && expandedItemQuery.data && (expandedItemQuery.data.fotos ?? []).length > 0 && (_jsx(PhotoLightbox, { photos: (expandedItemQuery.data.fotos ?? []).map((foto) => ({
                    id: foto.id,
                    url: foto.url,
                    thumbnailUrl: foto.thumbnailUrl ?? undefined,
                    alt: `Foto da peça ${expandedItemQuery.data.nome}`
                })), initialIndex: Math.max(0, (expandedItemQuery.data.fotos ?? []).findIndex((foto) => foto.isCover)), title: expandedItemQuery.data.nome, coverPhotoId: (expandedItemQuery.data.fotos ?? []).find((foto) => foto.isCover)?.id, onSetCover: (fotoId) => setCoverMutation.mutate({ itemId: expandedItemQuery.data.id, fotoId }), setCoverPending: setCoverMutation.isPending, onClose: () => setExpandedItemId(null) }))] }));
};
