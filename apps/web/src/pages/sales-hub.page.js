import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { listItems, listSalesDelivered } from "../api/items";
import { listPendingSacolas, shipSacola } from "../api/sacolas";
import { EditSaleForm } from "../components/edit-sale-form";
import { formatFreteInclusoLabel } from "../components/frete-incluso-detail";
import { AppShell, Button, Input, TopShortcutBar, formatCurrency, relativeAgeLabel } from "../components/ui";
import { parseMoneyLike } from "../lib/money";
import { computeLucroOperacional } from "../lib/peca-lucro";
import { useSessionStore } from "../store/session.store";
const sortReservedByOldest = (items) => [...items].sort((a, b) => {
    const aTime = new Date(a.ultimoStatus?.criadoEm ?? a.criadoEm).getTime();
    const bTime = new Date(b.ultimoStatus?.criadoEm ?? b.criadoEm).getTime();
    return aTime - bTime;
});
export const SalesHubPage = () => {
    const brechoId = useSessionStore((state) => state.brechoId);
    const queryClient = useQueryClient();
    const [rastreioPorSacola, setRastreioPorSacola] = useState({});
    const [fretePorSacola, setFretePorSacola] = useState({});
    const [freteCustoPorSacola, setFreteCustoPorSacola] = useState({});
    const [embalagemCustoPorSacola, setEmbalagemCustoPorSacola] = useState({});
    const [selectedVendas, setSelectedVendas] = useState({});
    const [deliveredOffset, setDeliveredOffset] = useState(0);
    const [deliveredRows, setDeliveredRows] = useState([]);
    const [editingSale, setEditingSale] = useState(null);
    const reservedItemsQuery = useQuery({
        queryKey: ["items", brechoId, "reserved-hub"],
        queryFn: () => listItems(brechoId, { status: "RESERVADO" })
    });
    const pendingSacolasQuery = useQuery({
        queryKey: ["pending-sacolas", brechoId],
        queryFn: () => listPendingSacolas(brechoId)
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
    const shipSacolaMutation = useMutation({
        mutationFn: (vars) => shipSacola(brechoId, vars.sacolaId, {
            vendaIds: vars.vendaIds,
            codigoRastreio: vars.codigoRastreio?.trim() || undefined,
            freteValor: vars.freteValor,
            freteCustoLoja: vars.freteCustoLoja,
            embalagemCusto: vars.embalagemCusto
        }),
        onSuccess: async () => {
            await queryClient.invalidateQueries({ queryKey: ["pending-sacolas", brechoId] });
            await queryClient.invalidateQueries({ queryKey: ["pending-sales", brechoId] });
            await queryClient.invalidateQueries({ queryKey: ["items", brechoId] });
            await queryClient.invalidateQueries({ queryKey: ["sales-period-summary", brechoId] });
            setDeliveredOffset(0);
            await queryClient.invalidateQueries({ queryKey: ["delivered-sales", brechoId] });
        }
    });
    const pendingSacolas = pendingSacolasQuery.data ?? [];
    const totalPecasPendentes = pendingSacolas.reduce((sum, s) => sum + s.totalPecas, 0);
    return (_jsxs(AppShell, { showTopBar: true, showBottomNav: true, activeTab: "vendas", children: [_jsx(TopShortcutBar, { shortcuts: [
                    { id: "reservados", label: "Reservados" },
                    { id: "aguardando", label: "Aguardando" },
                    { id: "entregues", label: "Entregues" }
                ] }), editingSale && (_jsx("div", { className: "fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center", children: _jsx("div", { className: "w-full max-w-md", children: _jsx(EditSaleForm, { brechoId: brechoId, saleId: editingSale.id, pecaNome: editingSale.pecaNome, initialPreco: editingSale.preco, initialPrecoCusto: editingSale.precoCusto, initialFreteIncluso: editingSale.freteIncluso, initialFreteInclusoValor: editingSale.freteInclusoValor, canEditFreteIncluso: true, onClose: () => setEditingSale(null) }) }) })), _jsxs("section", { id: "reservados", className: "scroll-mt-40", children: [_jsxs("div", { className: "mb-4 flex items-center justify-between px-1", children: [_jsx("h2", { className: "font-headline text-2xl font-extrabold text-primary", children: "Reservados" }), _jsxs("span", { className: "rounded-full bg-rose-100 px-2 py-1 text-xs font-semibold text-primary", children: [reservedItems.length, " pe\u00E7as"] })] }), _jsxs("div", { className: "space-y-4", children: [reservedItemsQuery.isLoading && _jsx("p", { children: "Carregando reservados..." }), !reservedItemsQuery.isLoading && reservedItems.length === 0 && (_jsx("p", { className: "rounded-2xl border border-rose-100 bg-white p-4 text-sm text-on-surface-variant", children: "Sem pe\u00E7as reservadas no momento." })), reservedItems.map((item) => {
                                const age = relativeAgeLabel(item.ultimoStatus?.criadoEm ?? item.criadoEm);
                                const isUrgent = age.label.includes("h") && Number.parseInt(age.label.replace(/\D/g, ""), 10) >= 24;
                                const itemImg = item.fotoCapaThumbnailUrl ?? item.fotoCapaUrl;
                                return (_jsxs("article", { className: "rounded-3xl border border-rose-50 bg-white p-4 shadow-sm", children: [_jsxs("div", { className: "flex gap-4", children: [itemImg ? (_jsx("img", { src: itemImg, alt: `Foto da peça ${item.nome}`, className: "h-20 w-20 rounded-2xl object-cover", loading: "lazy" })) : (_jsx("div", { className: "flex h-20 w-20 items-center justify-center rounded-2xl bg-surface-container-low text-xs text-outline", children: "Sem foto" })), _jsxs("div", { className: "flex-1", children: [_jsxs("div", { className: "flex items-start justify-between gap-2", children: [_jsx("h3", { className: "font-bold text-gray-900", children: item.nome }), isUrgent && (_jsx("span", { className: "rounded-full bg-red-500 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white", children: "Urgente" }))] }), _jsxs("p", { className: "text-sm text-gray-500", children: ["Reservado por ", item.ultimoStatus?.cliente?.nome ?? "cliente não identificado"] }), _jsx("p", { className: "mt-1 text-xs font-bold italic", style: { color: age.tone }, children: age.label })] })] }), _jsxs("div", { className: "mt-4 flex items-center justify-between border-t border-gray-50 pt-4", children: [_jsx("div", { className: "flex items-center gap-4", children: _jsx(Link, { to: `/items/${item.id}`, className: "text-xs font-bold uppercase tracking-widest text-gray-400", children: "Gerenciar fila" }) }), _jsx("div", { className: "flex items-center gap-3", children: _jsx(Link, { to: `/sell/${item.id}`, className: "rounded-full bg-primary px-6 py-2 text-sm font-bold text-white shadow-md shadow-rose-100 transition-transform active:scale-95", children: "Vender" }) })] })] }, item.id));
                            })] })] }), _jsxs("section", { id: "aguardando", className: "scroll-mt-40", children: [_jsxs("div", { className: "mb-4 flex items-center justify-between px-1", children: [_jsx("h2", { className: "font-headline text-2xl font-extrabold text-primary", children: "Aguardando Entrega" }), _jsxs("span", { className: "rounded-full bg-rose-100 px-2 py-1 text-xs font-semibold text-primary", children: [totalPecasPendentes, " pe\u00E7as \u00B7 ", pendingSacolas.length, " sacolas"] })] }), _jsxs("div", { className: "space-y-4", children: [pendingSacolasQuery.isLoading && _jsx("p", { children: "Carregando sacolas..." }), !pendingSacolasQuery.isLoading && pendingSacolas.length === 0 && (_jsx("p", { className: "rounded-2xl border border-rose-100 bg-white p-4 text-sm text-on-surface-variant", children: "Nenhuma venda aguardando entrega." })), pendingSacolas.map((sacola) => {
                                const selected = selectedVendas[sacola.id] ?? sacola.vendas.map((v) => v.id);
                                const selectedVendaRows = sacola.vendas.filter((v) => selected.includes(v.id));
                                const allSelectedFreteIncluso = selectedVendaRows.length > 0 && selectedVendaRows.every((v) => v.freteIncluso);
                                const subtotalPecas = selectedVendaRows.reduce((sum, v) => sum + parseMoneyLike(v.precoVenda), 0);
                                const freteInput = fretePorSacola[sacola.id] ?? "";
                                const freteValor = parseMoneyLike(freteInput);
                                const freteNumerico = Number.isNaN(freteValor) ? 0 : freteValor;
                                const freteCustoInput = freteCustoPorSacola[sacola.id] ?? "";
                                const freteCustoValor = parseMoneyLike(freteCustoInput);
                                const freteCustoNumerico = Number.isNaN(freteCustoValor) ? 0 : freteCustoValor;
                                const embalagemCustoInput = embalagemCustoPorSacola[sacola.id] ?? "";
                                const embalagemCustoValor = parseMoneyLike(embalagemCustoInput);
                                const embalagemCustoNumerico = Number.isNaN(embalagemCustoValor) ? 0 : embalagemCustoValor;
                                return (_jsxs("article", { className: "rounded-3xl border border-rose-50 bg-white p-4 shadow-sm", children: [_jsxs("div", { className: "mb-3 flex items-start justify-between gap-2", children: [_jsxs("div", { children: [_jsx("h3", { className: "font-bold text-gray-900", children: sacola.cliente.nome }), _jsxs("p", { className: "text-sm text-gray-500", children: [sacola.totalPecas, " pe\u00E7a(s) na sacola"] })] }), _jsx(Link, { to: `/clientes/${sacola.cliente.id}`, className: "text-xs font-bold text-primary", children: "Ver cliente" })] }), _jsx("ul", { className: "mb-3 space-y-2", children: sacola.vendas.map((venda) => (_jsxs("li", { className: "flex items-start gap-2 text-sm", children: [_jsx("input", { type: "checkbox", className: "mt-1", checked: selected.includes(venda.id), onChange: (e) => {
                                                            setSelectedVendas((prev) => {
                                                                const current = prev[sacola.id] ?? sacola.vendas.map((v) => v.id);
                                                                const next = e.target.checked
                                                                    ? [...current, venda.id]
                                                                    : current.filter((id) => id !== venda.id);
                                                                return { ...prev, [sacola.id]: next };
                                                            });
                                                        } }), _jsxs("div", { className: "flex-1", children: [_jsxs("span", { children: [venda.peca.codigo ? `${venda.peca.codigo} · ` : "", venda.peca.nome] }), _jsxs("div", { className: "mt-0.5 flex flex-wrap items-center gap-2", children: [_jsx("span", { className: "text-xs font-semibold text-primary", children: formatCurrency(venda.precoVenda) }), computeLucroOperacional(parseMoneyLike(venda.precoVenda), venda.precoCusto != null ? parseMoneyLike(venda.precoCusto) : null, venda.freteCustoLoja != null ? parseMoneyLike(venda.freteCustoLoja) : null, venda.embalagemCusto != null ? parseMoneyLike(venda.embalagemCusto) : null) != null && (_jsxs("span", { className: "text-xs font-semibold text-green-700", children: ["Lucro ", formatCurrency(computeLucroOperacional(parseMoneyLike(venda.precoVenda), venda.precoCusto != null ? parseMoneyLike(venda.precoCusto) : null, venda.freteCustoLoja != null ? parseMoneyLike(venda.freteCustoLoja) : null, venda.embalagemCusto != null ? parseMoneyLike(venda.embalagemCusto) : null))] })), _jsx("span", { className: `rounded px-1.5 py-0.5 text-[10px] font-bold ${venda.freteIncluso ? "bg-green-50 text-green-700" : "bg-gray-100 text-gray-600"}`, children: formatFreteInclusoLabel(venda.freteIncluso, venda.freteInclusoValor) }), _jsx("button", { type: "button", className: "text-[10px] font-bold uppercase text-primary underline", onClick: () => setEditingSale({
                                                                            id: venda.id,
                                                                            pecaNome: venda.peca.nome,
                                                                            preco: parseMoneyLike(venda.precoVenda),
                                                                            precoCusto: venda.precoCusto != null ? parseMoneyLike(venda.precoCusto) : null,
                                                                            freteIncluso: venda.freteIncluso,
                                                                            freteInclusoValor: venda.freteInclusoValor
                                                                                ? parseMoneyLike(venda.freteInclusoValor)
                                                                                : null
                                                                        }), children: "Editar" })] })] })] }, venda.id))) }), selectedVendaRows.length > 0 && (_jsxs("div", { className: "mb-3 rounded-xl bg-rose-50/50 p-3 text-sm", children: [_jsxs("div", { className: "flex justify-between", children: [_jsx("span", { className: "text-gray-600", children: "Pe\u00E7as selecionadas" }), _jsx("strong", { children: formatCurrency(subtotalPecas) })] }), !allSelectedFreteIncluso && freteNumerico > 0 && (_jsxs("div", { className: "mt-1 flex justify-between", children: [_jsx("span", { className: "text-gray-600", children: "Frete deste envio" }), _jsx("strong", { children: formatCurrency(freteNumerico) })] }))] })), !allSelectedFreteIncluso ? (_jsx(Input, { type: "number", step: "0.01", min: 0, placeholder: "Frete deste envio (opcional)", value: freteInput, onChange: (event) => setFretePorSacola((prev) => ({ ...prev, [sacola.id]: event.target.value })), className: "mb-2" })) : (_jsx("p", { className: "mb-2 text-xs text-green-700", children: "Frete j\u00E1 incluso nos pre\u00E7os das pe\u00E7as selecionadas." })), _jsx(Input, { type: "number", step: "0.01", min: 0, placeholder: "Quanto voc\u00EA pagou de frete? (R$) (opcional)", value: freteCustoInput, onChange: (event) => setFreteCustoPorSacola((prev) => ({ ...prev, [sacola.id]: event.target.value })), className: "mb-2" }), _jsx(Input, { type: "number", step: "0.01", min: 0, placeholder: "Custo de embalagem deste envio (R$) (opcional)", value: embalagemCustoInput, onChange: (event) => setEmbalagemCustoPorSacola((prev) => ({ ...prev, [sacola.id]: event.target.value })), className: "mb-2" }), _jsx(Input, { placeholder: "C\u00F3digo de rastreio (opcional)", value: rastreioPorSacola[sacola.id] ?? "", onChange: (event) => setRastreioPorSacola((prev) => ({ ...prev, [sacola.id]: event.target.value })) }), _jsx("div", { className: "mt-4 flex flex-wrap gap-2", children: _jsxs(Button, { type: "button", disabled: shipSacolaMutation.isPending || selected.length === 0, onClick: () => shipSacolaMutation.mutate({
                                                    sacolaId: sacola.id,
                                                    vendaIds: selected.length === sacola.vendas.length ? undefined : selected,
                                                    codigoRastreio: rastreioPorSacola[sacola.id],
                                                    freteValor: allSelectedFreteIncluso ? undefined : freteNumerico > 0 ? freteNumerico : undefined,
                                                    freteCustoLoja: freteCustoNumerico > 0 ? freteCustoNumerico : undefined,
                                                    embalagemCusto: embalagemCustoNumerico > 0 ? embalagemCustoNumerico : undefined
                                                }), children: ["Enviar ", selected.length === sacola.vendas.length ? "sacola" : `${selected.length} peça(s)`] }) })] }, sacola.id));
                            })] })] }), _jsxs("section", { id: "entregues", className: "scroll-mt-40", children: [_jsxs("div", { className: "mb-4 flex items-center justify-between px-1", children: [_jsx("h2", { className: "font-headline text-2xl font-extrabold text-primary", children: "Entregues" }), _jsx("span", { className: "rounded-full bg-rose-100 px-2 py-1 text-xs font-semibold text-primary", children: "30 dias" })] }), _jsxs("div", { className: "space-y-3", children: [deliveredSalesQuery.isLoading && deliveredOffset === 0 && _jsx("p", { children: "Carregando hist\u00F3rico..." }), !deliveredSalesQuery.isLoading && deliveredRows.length === 0 && (_jsx("p", { className: "rounded-2xl border border-rose-100 bg-white p-4 text-sm text-on-surface-variant", children: "Nenhuma entrega nos \u00FAltimos 30 dias." })), deliveredRows.map((sale) => {
                                const pecaImg = sale.peca.fotoCapaThumbnailUrl ?? sale.peca.fotoCapaUrl;
                                const lucroOperacional = computeLucroOperacional(parseMoneyLike(sale.precoVenda), sale.precoCusto != null ? parseMoneyLike(sale.precoCusto) : null, sale.freteCustoLoja != null ? parseMoneyLike(sale.freteCustoLoja) : null, sale.embalagemCusto != null ? parseMoneyLike(sale.embalagemCusto) : null);
                                return (_jsx("article", { className: "rounded-2xl border border-rose-50 bg-white p-3 shadow-sm", children: _jsxs("div", { className: "flex items-center gap-4", children: [pecaImg ? (_jsx("img", { src: pecaImg, alt: `Foto da peça ${sale.peca.nome}`, className: "h-14 w-14 rounded-xl object-cover", loading: "lazy" })) : (_jsx("div", { className: "flex h-14 w-14 items-center justify-center rounded-xl bg-surface-container-low text-xs text-outline", children: "Sem foto" })), _jsxs("div", { className: "flex-1", children: [_jsx("h3", { className: "font-bold text-gray-900", children: sale.peca.nome }), _jsxs("p", { className: "text-xs text-gray-500", children: [sale.cliente.nome, " \u2022", " ", new Date(sale.entrega?.entregueEm ?? sale.criadoEm).toLocaleDateString("pt-BR")] }), lucroOperacional != null && (_jsxs("p", { className: "text-xs font-semibold text-green-700", children: ["Lucro ", formatCurrency(lucroOperacional)] }))] }), _jsx("strong", { className: "text-primary", children: formatCurrency(sale.ganhosTotal) })] }) }, sale.id));
                            }), deliveredSalesQuery.data?.hasMore && (_jsx(Button, { type: "button", className: "w-full", disabled: deliveredSalesQuery.isFetching, onClick: () => setDeliveredOffset((prev) => prev + (deliveredSalesQuery.data?.rows.length ?? 20)), children: "Ver mais" }))] })] })] }));
};
