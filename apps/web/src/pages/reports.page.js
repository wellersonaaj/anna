import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Link } from "react-router-dom";
import { DESPESA_CATEGORIA_LABELS, createDespesa, deleteDespesa, listDespesas } from "../api/despesas";
import { getSalesPeriodSummary, listItems, listMissingCostSales } from "../api/items";
import { ReportMetricCard } from "../components/report-metric-card";
import { SaleCostEditor } from "../components/sale-cost-editor";
import { AppShell, Button, Field, Input, Section, Select, formatCurrency } from "../components/ui";
import { buildFaturamentoFootnotes, buildLucroFootnotes, formatLucroDisplay, getLucroCompleteness } from "../lib/report-metrics";
import { parseMoneyLike } from "../lib/money";
import { useSessionStore } from "../store/session.store";
const daysSince = (isoDate) => Math.floor((Date.now() - new Date(isoDate).getTime()) / (1000 * 60 * 60 * 24));
const inStockStatuses = new Set(["DISPONIVEL", "RESERVADO", "INDISPONIVEL"]);
const todayInputValue = () => new Date().toISOString().slice(0, 10);
const MISSING_COST_PAGE_SIZE = 10;
const scrollToCompletarCustos = () => {
    document.getElementById("completar-custos")?.scrollIntoView({ behavior: "smooth", block: "start" });
};
export const ReportsPage = () => {
    const brechoId = useSessionStore((state) => state.brechoId);
    const queryClient = useQueryClient();
    const [showDespesaForm, setShowDespesaForm] = useState(false);
    const [showFinanceGuide, setShowFinanceGuide] = useState(false);
    const [missingCostOffset, setMissingCostOffset] = useState(0);
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
    const summary = periodSummaryQuery.data;
    const vendasSemCusto = summary?.vendasSemCusto ?? 0;
    const missingCostQuery = useQuery({
        queryKey: ["sales-missing-cost", brechoId, missingCostOffset],
        queryFn: () => listMissingCostSales(brechoId, {
            days: 30,
            limit: MISSING_COST_PAGE_SIZE,
            offset: missingCostOffset
        }),
        enabled: vendasSemCusto > 0
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
    const despesas = despesasQuery.data ?? [];
    const missingCostRows = missingCostQuery.data?.rows ?? [];
    const stockCount = items.filter((item) => inStockStatuses.has(item.status)).length;
    const staleItems = items
        .filter((item) => inStockStatuses.has(item.status) && daysSince(item.criadoEm) > 30)
        .sort((a, b) => new Date(a.criadoEm).getTime() - new Date(b.criadoEm).getTime())
        .slice(0, 10);
    const lucroCompleteness = summary
        ? getLucroCompleteness(summary.vendasSemCusto, summary.vendasNoPeriodo)
        : "empty";
    const faturamentoBarPct = summary && summary.faturamentoPecas > 0 && summary.aguardandoEnvio.valorNoPeriodo > 0
        ? Math.min(100, (summary.aguardandoEnvio.valorNoPeriodo / summary.faturamentoPecas) * 100)
        : 0;
    return (_jsxs(AppShell, { showTopBar: true, showBottomNav: true, activeTab: "relatorios", children: [_jsxs("div", { className: "mb-2", children: [_jsx("h1", { className: "text-3xl font-extrabold tracking-tight", children: "Relat\u00F3rios" }), _jsx("p", { className: "text-sm font-medium text-gray-500", children: "Vis\u00E3o geral do seu desempenho este m\u00EAs" })] }), (itemsQuery.isLoading || periodSummaryQuery.isLoading) && _jsx("p", { children: "Carregando indicadores..." }), _jsxs("div", { className: "grid grid-cols-1 gap-4", children: [_jsx(ReportMetricCard, { value: stockCount, label: "Pe\u00E7as em estoque", helpText: "Dispon\u00EDveis, reservadas e indispon\u00EDveis no estoque", icon: "inventory_2" }), _jsx(ReportMetricCard, { value: summary?.vendasNoPeriodo ?? 0, label: "Vendidas este m\u00EAs", helpText: "Quantidade de vendas registradas nos \u00FAltimos 30 dias", icon: "shopping_bag", iconClassName: "bg-green-50 text-green-600" }), _jsxs("button", { type: "button", className: "rounded-2xl border border-rose-100 bg-white px-4 py-3 text-left", onClick: () => setShowFinanceGuide((open) => !open), children: [_jsxs("div", { className: "flex items-center justify-between gap-2", children: [_jsx("span", { className: "text-sm font-bold text-gray-800", children: "Como ler seus n\u00FAmeros" }), _jsx("span", { className: "material-symbols-outlined text-gray-400", children: showFinanceGuide ? "expand_less" : "expand_more" })] }), showFinanceGuide && (_jsxs("ol", { className: "mt-2 list-decimal space-y-1 pl-4 text-xs text-gray-600", children: [_jsxs("li", { children: [_jsx("strong", { children: "Faturamento" }), " \u2014 soma dos pre\u00E7os vendidos (\u00FAltimos 30 dias)"] }), _jsxs("li", { children: [_jsx("strong", { children: "Lucro bruto" }), " \u2014 pre\u00E7o vendido menos o que voc\u00EA pagou pela pe\u00E7a"] }), _jsxs("li", { children: [_jsx("strong", { children: "Lucro operacional" }), " \u2014 lucro bruto menos frete e embalagem pagos por voc\u00EA"] }), _jsxs("li", { children: [_jsx("strong", { children: "Lucro l\u00EDquido" }), " \u2014 lucro operacional menos despesas gerais do brech\u00F3"] })] }))] }), _jsx(ReportMetricCard, { value: formatCurrency(summary?.faturamentoPecas ?? 0), label: "Faturamento do m\u00EAs", helpText: "Soma dos pre\u00E7os das pe\u00E7as vendidas nos \u00FAltimos 30 dias", icon: "payments", iconClassName: "bg-rose-100 text-primary", valueClassName: "text-primary", shadow: true, footnotes: summary ? buildFaturamentoFootnotes(summary, formatCurrency) : [], extra: faturamentoBarPct > 0 ? (_jsxs("div", { className: "mt-2 max-w-xs", children: [_jsx("div", { className: "h-1.5 overflow-hidden rounded-full bg-rose-100", children: _jsx("div", { className: "h-full rounded-full bg-amber-400", style: { width: `${faturamentoBarPct}%` } }) }), _jsxs("p", { className: "mt-1 text-[10px] text-gray-500", children: [faturamentoBarPct.toFixed(0), "% do faturamento aguarda envio"] })] })) : undefined }), _jsx(ReportMetricCard, { value: formatLucroDisplay(summary?.lucroBruto ?? 0, lucroCompleteness, formatCurrency), label: "Lucro bruto do m\u00EAs", helpText: "Pre\u00E7o vendido menos o que voc\u00EA pagou pela pe\u00E7a", icon: "trending_up", iconClassName: "bg-green-50 text-green-700", valueClassName: "text-green-700", shadow: true, footnotes: summary
                            ? buildLucroFootnotes({
                                vendasNoPeriodo: summary.vendasNoPeriodo,
                                vendasComCusto: summary.vendasComCusto,
                                vendasSemCusto: summary.vendasSemCusto,
                                margemBrutaPct: summary.margemBrutaPct
                            }, lucroCompleteness, "bruto")
                            : [], action: summary && summary.vendasSemCusto > 0 ? (_jsx("button", { type: "button", className: "text-xs font-bold text-primary underline", onClick: scrollToCompletarCustos, children: "Completar custos \u2193" })) : undefined }), _jsx(ReportMetricCard, { value: formatLucroDisplay(summary?.lucroOperacional ?? 0, lucroCompleteness, formatCurrency), label: "Lucro operacional", helpText: "Lucro bruto menos frete e embalagem pagos por voc\u00EA", icon: "local_shipping", iconClassName: "bg-emerald-50 text-emerald-700", valueClassName: "text-emerald-700", shadow: true, footnotes: summary
                            ? buildLucroFootnotes({
                                vendasNoPeriodo: summary.vendasNoPeriodo,
                                vendasComCusto: summary.vendasComCusto,
                                vendasSemCusto: summary.vendasSemCusto,
                                margemBrutaPct: summary.margemBrutaPct,
                                custosFreteEmbalagem: summary.custosFreteEmbalagem
                            }, lucroCompleteness, "operacional")
                            : [] }), _jsx(ReportMetricCard, { value: formatLucroDisplay(summary?.lucroLiquido ?? 0, lucroCompleteness, formatCurrency), label: "Lucro l\u00EDquido do m\u00EAs", helpText: "Lucro operacional menos despesas gerais do brech\u00F3", icon: "account_balance_wallet", iconClassName: "bg-indigo-50 text-indigo-700", valueClassName: "text-indigo-700", shadow: true, footnotes: summary
                            ? [
                                ...buildLucroFootnotes({
                                    vendasNoPeriodo: summary.vendasNoPeriodo,
                                    vendasComCusto: summary.vendasComCusto,
                                    vendasSemCusto: summary.vendasSemCusto,
                                    margemBrutaPct: summary.margemBrutaPct,
                                    despesasGerais: summary.despesasGerais
                                }, lucroCompleteness, "liquido"),
                                ...(summary.despesasGerais > 0 && lucroCompleteness !== "empty"
                                    ? [
                                        {
                                            tone: "neutral",
                                            text: `Descontadas ${formatCurrency(summary.despesasGerais)} em despesas gerais`
                                        }
                                    ]
                                    : [])
                            ]
                            : [] }), _jsx(ReportMetricCard, { value: staleItems.length, label: "Paradas h\u00E1 +30 dias", helpText: "Pe\u00E7as em estoque h\u00E1 mais de 30 dias sem venda", icon: "timer", iconClassName: "bg-amber-50 text-amber-600", valueClassName: "text-amber-500" })] }), vendasSemCusto > 0 && (_jsx("div", { id: "completar-custos", className: "mt-4 scroll-mt-24", children: _jsxs(Section, { title: "Completar custos do m\u00EAs", children: [_jsxs("p", { className: "mb-3 text-sm text-on-surface-variant", children: [vendasSemCusto, " venda", vendasSemCusto === 1 ? "" : "s", " sem custo \u2014 o lucro acima n\u00E3o inclui essas vendas. Informe quanto voc\u00EA pagou por cada pe\u00E7a."] }), missingCostQuery.isLoading && _jsx("p", { className: "text-sm", children: "Carregando vendas..." }), _jsx("div", { className: "space-y-2", children: missingCostRows.map((sale) => (_jsx(SaleCostEditor, { brechoId: brechoId, saleId: sale.id, pecaId: sale.peca.id, pecaNome: sale.peca.nome, pecaCodigo: sale.peca.codigo, precoVenda: sale.precoVenda, criadoEm: sale.criadoEm, clienteNome: sale.cliente.nome, pecaPrecoCusto: sale.peca.precoCusto, pecaThumbnailUrl: sale.peca.fotoCapaThumbnailUrl }, sale.id))) }), !missingCostQuery.isLoading && missingCostRows.length === 0 && (_jsx("p", { className: "rounded-2xl border border-rose-100 bg-white p-4 text-sm text-on-surface-variant", children: "Nenhuma venda pendente de custo neste per\u00EDodo." })), missingCostQuery.data?.hasMore && (_jsx(Button, { type: "button", className: "mt-3 w-full", disabled: missingCostQuery.isFetching, onClick: () => setMissingCostOffset((prev) => prev + MISSING_COST_PAGE_SIZE), children: "Ver mais" }))] }) })), _jsxs(Section, { title: "Despesas do m\u00EAs", children: [_jsxs("div", { className: "mb-3 flex items-center justify-between gap-2", children: [_jsx("p", { className: "text-sm text-on-surface-variant", children: "Marketing, plataformas, embalagem em lote e outros custos do brech\u00F3." }), _jsx(Button, { type: "button", onClick: () => setShowDespesaForm((open) => !open), children: showDespesaForm ? "Cancelar" : "Nova despesa" })] }), showDespesaForm && (_jsxs("form", { className: "mb-4 grid gap-3 rounded-2xl border border-rose-100 bg-white p-4", onSubmit: (event) => {
                            event.preventDefault();
                            createDespesaMutation.mutate();
                        }, children: [_jsx(Field, { label: "Categoria", children: _jsx(Select, { value: despesaCategoria, onChange: (event) => setDespesaCategoria(event.target.value), children: Object.entries(DESPESA_CATEGORIA_LABELS).map(([value, label]) => (_jsx("option", { value: value, children: label }, value))) }) }), _jsx(Field, { label: "Valor (R$)", children: _jsx(Input, { type: "number", step: "0.01", min: 0, value: despesaValor, onChange: (event) => setDespesaValor(event.target.value) }) }), _jsx(Field, { label: "Data", children: _jsx(Input, { type: "date", value: despesaData, onChange: (event) => setDespesaData(event.target.value) }) }), _jsx(Field, { label: "Descri\u00E7\u00E3o (opcional)", children: _jsx(Input, { value: despesaDescricao, onChange: (event) => setDespesaDescricao(event.target.value) }) }), createDespesaMutation.isError && (_jsx("p", { className: "text-sm text-red-600", children: createDespesaMutation.error instanceof Error
                                    ? createDespesaMutation.error.message
                                    : "Não foi possível salvar a despesa." })), _jsx(Button, { type: "submit", disabled: createDespesaMutation.isPending, children: createDespesaMutation.isPending ? "Salvando..." : "Salvar despesa" })] })), despesasQuery.isLoading && _jsx("p", { className: "text-sm", children: "Carregando despesas..." }), !despesasQuery.isLoading && despesas.length === 0 && (_jsx("p", { className: "rounded-2xl border border-rose-100 bg-white p-4 text-sm text-on-surface-variant", children: "Nenhuma despesa lan\u00E7ada neste per\u00EDodo." })), _jsx("div", { className: "space-y-2", children: despesas.map((despesa) => (_jsxs("article", { className: "flex items-center justify-between gap-3 rounded-2xl border border-rose-50 bg-white p-3", children: [_jsxs("div", { children: [_jsx("p", { className: "text-sm font-bold text-gray-900", children: DESPESA_CATEGORIA_LABELS[despesa.categoria] }), _jsxs("p", { className: "text-xs text-gray-500", children: [new Date(despesa.dataCompetencia).toLocaleDateString("pt-BR"), despesa.descricao ? ` · ${despesa.descricao}` : ""] })] }), _jsxs("div", { className: "flex items-center gap-3", children: [_jsx("span", { className: "text-sm font-extrabold text-primary", children: formatCurrency(despesa.valor) }), _jsx("button", { type: "button", className: "text-xs font-bold text-red-600 underline", disabled: deleteDespesaMutation.isPending, onClick: () => deleteDespesaMutation.mutate(despesa.id), children: "Excluir" })] })] }, despesa.id))) })] }), _jsxs("section", { className: "mt-2", children: [_jsxs("div", { className: "mb-4 flex items-center justify-between", children: [_jsx("h2", { className: "text-lg font-bold", children: "Pe\u00E7as sem movimento" }), _jsx("span", { className: "rounded-full bg-rose-50 px-2 py-1 text-xs font-bold text-primary", children: "+30 dias" })] }), _jsxs("div", { className: "space-y-3", children: [staleItems.length === 0 && (_jsx("p", { className: "rounded-2xl border border-rose-100 bg-white p-4 text-sm text-on-surface-variant", children: "N\u00E3o h\u00E1 pe\u00E7as paradas acima de 30 dias." })), staleItems.map((item) => {
                                const staleThumb = item.fotoCapaThumbnailUrl ?? item.fotoCapaUrl;
                                return (_jsxs("article", { className: "flex items-center gap-4 rounded-2xl border border-rose-50 bg-white p-3", children: [staleThumb ? (_jsx("img", { src: staleThumb, alt: `Foto da peça ${item.nome}`, className: "h-16 w-16 rounded-xl object-cover", loading: "lazy" })) : (_jsx("div", { className: "flex h-16 w-16 items-center justify-center rounded-xl bg-surface-container-low text-xs text-outline", children: "Sem foto" })), _jsxs("div", { className: "flex-grow", children: [_jsx("h3", { className: "text-sm font-bold text-gray-800", children: item.nome }), _jsxs("p", { className: "text-xs text-gray-500", children: [item.subcategoria, " \u2022 ", item.status.toLowerCase()] })] }), _jsxs("div", { className: "text-right", children: [_jsxs("span", { className: "block text-sm font-bold text-amber-600", children: [daysSince(item.criadoEm), " dias"] }), _jsx("span", { className: "text-[10px] font-bold uppercase text-gray-400", children: "parada" })] })] }, item.id));
                            })] })] }), _jsxs(Section, { title: "Conta", children: [_jsx("p", { className: "mb-3 text-sm text-on-surface-variant", children: "Ajuste prefer\u00EAncias do estoque ou altere a senha do seu acesso ao app." }), _jsxs("div", { className: "flex flex-col gap-2", children: [_jsx(Link, { to: "/conta/preferencias", className: "inline-flex text-sm font-bold text-primary underline", children: "Prefer\u00EAncias do estoque" }), _jsx(Link, { to: "/conta/senha", className: "inline-flex text-sm font-bold text-primary underline", children: "Trocar senha" })] })] })] }));
};
