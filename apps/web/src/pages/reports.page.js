import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Link } from "react-router-dom";
import { DESPESA_CATEGORIA_LABELS, createDespesa, deleteDespesa, listDespesas } from "../api/despesas";
import { getSalesPeriodSummary, listItems } from "../api/items";
import { AppShell, Button, Field, Input, Section, Select, formatCurrency } from "../components/ui";
import { parseMoneyLike } from "../lib/money";
import { useSessionStore } from "../store/session.store";
const daysSince = (isoDate) => Math.floor((Date.now() - new Date(isoDate).getTime()) / (1000 * 60 * 60 * 24));
const inStockStatuses = new Set(["DISPONIVEL", "RESERVADO", "INDISPONIVEL"]);
const todayInputValue = () => new Date().toISOString().slice(0, 10);
export const ReportsPage = () => {
    const brechoId = useSessionStore((state) => state.brechoId);
    const queryClient = useQueryClient();
    const [showDespesaForm, setShowDespesaForm] = useState(false);
    const [despesaCategoria, setDespesaCategoria] = useState("MARKETING");
    const [despesaValor, setDespesaValor] = useState("");
    const [despesaDescricao, setDespesaDescricao] = useState("");
    const [despesaData, setDespesaData] = useState(todayInputValue());
    const itemsQuery = useQuery({
        queryKey: ["items", brechoId, "reports"],
        queryFn: () => listItems(brechoId)
    });
    const periodSummaryQuery = useQuery({
        queryKey: ["sales-period-summary", brechoId],
        queryFn: () => getSalesPeriodSummary(brechoId, { days: 30 })
    });
    const despesasQuery = useQuery({
        queryKey: ["despesas", brechoId],
        queryFn: () => listDespesas(brechoId, { days: 30 })
    });
    const createDespesaMutation = useMutation({
        mutationFn: () => {
            const valor = parseMoneyLike(despesaValor);
            if (Number.isNaN(valor) || valor <= 0) {
                throw new Error("Informe um valor válido.");
            }
            return createDespesa(brechoId, {
                categoria: despesaCategoria,
                valor,
                descricao: despesaDescricao.trim() || undefined,
                dataCompetencia: new Date(`${despesaData}T12:00:00`).toISOString()
            });
        },
        onSuccess: async () => {
            setShowDespesaForm(false);
            setDespesaValor("");
            setDespesaDescricao("");
            setDespesaData(todayInputValue());
            await queryClient.invalidateQueries({ queryKey: ["despesas", brechoId] });
            await queryClient.invalidateQueries({ queryKey: ["sales-period-summary", brechoId] });
        }
    });
    const deleteDespesaMutation = useMutation({
        mutationFn: (despesaId) => deleteDespesa(brechoId, despesaId),
        onSuccess: async () => {
            await queryClient.invalidateQueries({ queryKey: ["despesas", brechoId] });
            await queryClient.invalidateQueries({ queryKey: ["sales-period-summary", brechoId] });
        }
    });
    const items = itemsQuery.data ?? [];
    const summary = periodSummaryQuery.data;
    const despesas = despesasQuery.data ?? [];
    const stockCount = items.filter((item) => inStockStatuses.has(item.status)).length;
    const staleItems = items
        .filter((item) => inStockStatuses.has(item.status) && daysSince(item.criadoEm) > 30)
        .sort((a, b) => new Date(a.criadoEm).getTime() - new Date(b.criadoEm).getTime())
        .slice(0, 10);
    return (_jsxs(AppShell, { showTopBar: true, showBottomNav: true, activeTab: "relatorios", children: [_jsxs("div", { className: "mb-2", children: [_jsx("h1", { className: "text-3xl font-extrabold tracking-tight", children: "Relat\u00F3rios" }), _jsx("p", { className: "text-sm font-medium text-gray-500", children: "Vis\u00E3o geral do seu desempenho este m\u00EAs" })] }), (itemsQuery.isLoading || periodSummaryQuery.isLoading) && _jsx("p", { children: "Carregando indicadores..." }), _jsxs("div", { className: "grid grid-cols-1 gap-4", children: [_jsxs("div", { className: "flex items-center justify-between rounded-3xl border border-rose-50 bg-white p-6", children: [_jsxs("div", { children: [_jsx("span", { className: "block text-4xl font-extrabold", children: stockCount }), _jsx("span", { className: "text-sm font-semibold text-gray-500", children: "Pe\u00E7as em estoque" })] }), _jsx("div", { className: "flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-50 text-primary", children: _jsx("span", { className: "material-symbols-outlined", children: "inventory_2" }) })] }), _jsxs("div", { className: "flex items-center justify-between rounded-3xl border border-rose-50 bg-white p-6", children: [_jsxs("div", { children: [_jsx("span", { className: "block text-4xl font-extrabold", children: summary?.vendasNoPeriodo ?? 0 }), _jsx("span", { className: "text-sm font-semibold text-gray-500", children: "Vendidas este m\u00EAs" })] }), _jsx("div", { className: "flex h-12 w-12 items-center justify-center rounded-2xl bg-green-50 text-green-600", children: _jsx("span", { className: "material-symbols-outlined", children: "shopping_bag" }) })] }), _jsxs("div", { className: "flex items-center justify-between rounded-3xl border border-rose-50 bg-white p-6 shadow-sm", children: [_jsxs("div", { children: [_jsx("span", { className: "block text-4xl font-extrabold text-primary", children: formatCurrency(summary?.faturamentoPecas ?? 0) }), _jsx("span", { className: "text-sm font-semibold text-gray-500", children: "Faturamento do m\u00EAs" }), summary && summary.freteInclusoInformado > 0 && (_jsxs("p", { className: "mt-1 text-xs text-gray-500", children: ["incl. ", formatCurrency(summary.freteInclusoInformado), " em frete (informado nas vendas)"] })), summary && summary.aguardandoEnvio.count > 0 && (_jsxs("p", { className: "mt-1 text-xs text-amber-700", children: [summary.aguardandoEnvio.count, " aguardando envio \u00B7", " ", formatCurrency(summary.aguardandoEnvio.valorPecas)] }))] }), _jsx("div", { className: "flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-100 text-primary", children: _jsx("span", { className: "material-symbols-outlined", children: "payments" }) })] }), _jsxs("div", { className: "flex items-center justify-between rounded-3xl border border-rose-50 bg-white p-6 shadow-sm", children: [_jsxs("div", { children: [_jsx("span", { className: "block text-4xl font-extrabold text-green-700", children: formatCurrency(summary?.lucroBruto ?? 0) }), _jsx("span", { className: "text-sm font-semibold text-gray-500", children: "Lucro bruto do m\u00EAs" }), summary && summary.margemBrutaPct != null && (_jsxs("p", { className: "mt-1 text-xs text-gray-500", children: ["Margem bruta: ", summary.margemBrutaPct.toFixed(0), "% (vendas com custo cadastrado)"] })), summary && summary.vendasSemCusto > 0 && (_jsxs("p", { className: "mt-1 text-xs text-amber-700", children: [summary.vendasSemCusto, " venda", summary.vendasSemCusto === 1 ? "" : "s", " sem custo cadastrado \u2014 lucro pode estar incompleto"] }))] }), _jsx("div", { className: "flex h-12 w-12 items-center justify-center rounded-2xl bg-green-50 text-green-700", children: _jsx("span", { className: "material-symbols-outlined", children: "trending_up" }) })] }), _jsxs("div", { className: "flex items-center justify-between rounded-3xl border border-rose-50 bg-white p-6 shadow-sm", children: [_jsxs("div", { children: [_jsx("span", { className: "block text-4xl font-extrabold text-emerald-700", children: formatCurrency(summary?.lucroOperacional ?? 0) }), _jsx("span", { className: "text-sm font-semibold text-gray-500", children: "Lucro operacional" }), summary && summary.custosFreteEmbalagem > 0 && (_jsxs("p", { className: "mt-1 text-xs text-gray-500", children: ["ap\u00F3s ", formatCurrency(summary.custosFreteEmbalagem), " em frete/embalagem das vendas"] }))] }), _jsx("div", { className: "flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700", children: _jsx("span", { className: "material-symbols-outlined", children: "local_shipping" }) })] }), _jsxs("div", { className: "flex items-center justify-between rounded-3xl border border-rose-50 bg-white p-6 shadow-sm", children: [_jsxs("div", { children: [_jsx("span", { className: "block text-4xl font-extrabold text-indigo-700", children: formatCurrency(summary?.lucroLiquido ?? 0) }), _jsx("span", { className: "text-sm font-semibold text-gray-500", children: "Lucro l\u00EDquido do m\u00EAs" }), summary && summary.despesasGerais > 0 && (_jsxs("p", { className: "mt-1 text-xs text-gray-500", children: ["ap\u00F3s ", formatCurrency(summary.despesasGerais), " em despesas gerais"] }))] }), _jsx("div", { className: "flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-700", children: _jsx("span", { className: "material-symbols-outlined", children: "account_balance_wallet" }) })] }), _jsxs("div", { className: "flex items-center justify-between rounded-3xl border border-rose-50 bg-white p-6", children: [_jsxs("div", { children: [_jsx("span", { className: "block text-4xl font-extrabold text-amber-500", children: staleItems.length }), _jsx("span", { className: "text-sm font-semibold text-gray-500", children: "Paradas h\u00E1 +30 dias" })] }), _jsx("div", { className: "flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-50 text-amber-600", children: _jsx("span", { className: "material-symbols-outlined", children: "timer" }) })] })] }), _jsxs(Section, { title: "Despesas do m\u00EAs", children: [_jsxs("div", { className: "mb-3 flex items-center justify-between gap-2", children: [_jsx("p", { className: "text-sm text-on-surface-variant", children: "Marketing, plataformas, embalagem em lote e outros custos do brech\u00F3." }), _jsx(Button, { type: "button", onClick: () => setShowDespesaForm((open) => !open), children: showDespesaForm ? "Cancelar" : "Nova despesa" })] }), showDespesaForm && (_jsxs("form", { className: "mb-4 grid gap-3 rounded-2xl border border-rose-100 bg-white p-4", onSubmit: (event) => {
                            event.preventDefault();
                            createDespesaMutation.mutate();
                        }, children: [_jsx(Field, { label: "Categoria", children: _jsx(Select, { value: despesaCategoria, onChange: (event) => setDespesaCategoria(event.target.value), children: Object.entries(DESPESA_CATEGORIA_LABELS).map(([value, label]) => (_jsx("option", { value: value, children: label }, value))) }) }), _jsx(Field, { label: "Valor (R$)", children: _jsx(Input, { type: "number", step: "0.01", min: 0, value: despesaValor, onChange: (event) => setDespesaValor(event.target.value) }) }), _jsx(Field, { label: "Data", children: _jsx(Input, { type: "date", value: despesaData, onChange: (event) => setDespesaData(event.target.value) }) }), _jsx(Field, { label: "Descri\u00E7\u00E3o (opcional)", children: _jsx(Input, { value: despesaDescricao, onChange: (event) => setDespesaDescricao(event.target.value) }) }), createDespesaMutation.isError && (_jsx("p", { className: "text-sm text-red-600", children: createDespesaMutation.error instanceof Error
                                    ? createDespesaMutation.error.message
                                    : "Não foi possível salvar a despesa." })), _jsx(Button, { type: "submit", disabled: createDespesaMutation.isPending, children: createDespesaMutation.isPending ? "Salvando..." : "Salvar despesa" })] })), despesasQuery.isLoading && _jsx("p", { className: "text-sm", children: "Carregando despesas..." }), !despesasQuery.isLoading && despesas.length === 0 && (_jsx("p", { className: "rounded-2xl border border-rose-100 bg-white p-4 text-sm text-on-surface-variant", children: "Nenhuma despesa lan\u00E7ada neste per\u00EDodo." })), _jsx("div", { className: "space-y-2", children: despesas.map((despesa) => (_jsxs("article", { className: "flex items-center justify-between gap-3 rounded-2xl border border-rose-50 bg-white p-3", children: [_jsxs("div", { children: [_jsx("p", { className: "text-sm font-bold text-gray-900", children: DESPESA_CATEGORIA_LABELS[despesa.categoria] }), _jsxs("p", { className: "text-xs text-gray-500", children: [new Date(despesa.dataCompetencia).toLocaleDateString("pt-BR"), despesa.descricao ? ` · ${despesa.descricao}` : ""] })] }), _jsxs("div", { className: "flex items-center gap-3", children: [_jsx("span", { className: "text-sm font-extrabold text-primary", children: formatCurrency(despesa.valor) }), _jsx("button", { type: "button", className: "text-xs font-bold text-red-600 underline", disabled: deleteDespesaMutation.isPending, onClick: () => deleteDespesaMutation.mutate(despesa.id), children: "Excluir" })] })] }, despesa.id))) })] }), _jsxs("section", { className: "mt-2", children: [_jsxs("div", { className: "mb-4 flex items-center justify-between", children: [_jsx("h2", { className: "text-lg font-bold", children: "Pe\u00E7as sem movimento" }), _jsx("span", { className: "rounded-full bg-rose-50 px-2 py-1 text-xs font-bold text-primary", children: "+30 dias" })] }), _jsxs("div", { className: "space-y-3", children: [staleItems.length === 0 && (_jsx("p", { className: "rounded-2xl border border-rose-100 bg-white p-4 text-sm text-on-surface-variant", children: "N\u00E3o h\u00E1 pe\u00E7as paradas acima de 30 dias." })), staleItems.map((item) => {
                                const staleThumb = item.fotoCapaThumbnailUrl ?? item.fotoCapaUrl;
                                return (_jsxs("article", { className: "flex items-center gap-4 rounded-2xl border border-rose-50 bg-white p-3", children: [staleThumb ? (_jsx("img", { src: staleThumb, alt: `Foto da peça ${item.nome}`, className: "h-16 w-16 rounded-xl object-cover", loading: "lazy" })) : (_jsx("div", { className: "flex h-16 w-16 items-center justify-center rounded-xl bg-surface-container-low text-xs text-outline", children: "Sem foto" })), _jsxs("div", { className: "flex-grow", children: [_jsx("h3", { className: "text-sm font-bold text-gray-800", children: item.nome }), _jsxs("p", { className: "text-xs text-gray-500", children: [item.subcategoria, " \u2022 ", item.status.toLowerCase()] })] }), _jsxs("div", { className: "text-right", children: [_jsxs("span", { className: "block text-sm font-bold text-amber-600", children: [daysSince(item.criadoEm), " dias"] }), _jsx("span", { className: "text-[10px] font-bold uppercase text-gray-400", children: "parada" })] })] }, item.id));
                            })] })] }), _jsxs(Section, { title: "Conta", children: [_jsx("p", { className: "mb-3 text-sm text-on-surface-variant", children: "Ajuste prefer\u00EAncias do estoque ou altere a senha do seu acesso ao app." }), _jsxs("div", { className: "flex flex-col gap-2", children: [_jsx(Link, { to: "/conta/preferencias", className: "inline-flex text-sm font-bold text-primary underline", children: "Prefer\u00EAncias do estoque" }), _jsx(Link, { to: "/conta/senha", className: "inline-flex text-sm font-bold text-primary underline", children: "Trocar senha" })] })] })] }));
};
