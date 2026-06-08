import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Link } from "react-router-dom";
import {
  DESPESA_CATEGORIA_LABELS,
  createDespesa,
  deleteDespesa,
  listDespesas,
  type DespesaCategoria
} from "../api/despesas";
import { getSalesPeriodSummary, listItems, listMissingCostSales } from "../api/items";
import { ReportMetricCard } from "../components/report-metric-card";
import { SaleCostEditor } from "../components/sale-cost-editor";
import { AppShell, Button, Field, Input, Section, Select, formatCurrency } from "../components/ui";
import {
  buildFaturamentoFootnotes,
  buildLucroFootnotes,
  formatLucroDisplay,
  getLucroCompleteness
} from "../lib/report-metrics";
import { parseMoneyLike } from "../lib/money";
import { useSessionStore } from "../store/session.store";

const daysSince = (isoDate: string) => Math.floor((Date.now() - new Date(isoDate).getTime()) / (1000 * 60 * 60 * 24));

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
  const [despesaCategoria, setDespesaCategoria] = useState<DespesaCategoria>("MARKETING");
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
    queryFn: () =>
      listMissingCostSales(brechoId, {
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
    mutationFn: (despesaId: string) => deleteDespesa(brechoId, despesaId),
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

  const faturamentoBarPct =
    summary && summary.faturamentoPecas > 0 && summary.aguardandoEnvio.valorNoPeriodo > 0
      ? Math.min(100, (summary.aguardandoEnvio.valorNoPeriodo / summary.faturamentoPecas) * 100)
      : 0;

  return (
    <AppShell showTopBar showBottomNav activeTab="relatorios">
      <div className="mb-2">
        <h1 className="text-3xl font-extrabold tracking-tight">Relatórios</h1>
        <p className="text-sm font-medium text-gray-500">Visão geral do seu desempenho este mês</p>
      </div>

      {(itemsQuery.isLoading || periodSummaryQuery.isLoading) && <p>Carregando indicadores...</p>}

      <div className="grid grid-cols-1 gap-4">
        <ReportMetricCard
          value={stockCount}
          label="Peças em estoque"
          helpText="Disponíveis, reservadas e indisponíveis no estoque"
          icon="inventory_2"
        />

        <ReportMetricCard
          value={summary?.vendasNoPeriodo ?? 0}
          label="Vendidas este mês"
          helpText="Quantidade de vendas registradas nos últimos 30 dias"
          icon="shopping_bag"
          iconClassName="bg-green-50 text-green-600"
        />

        <button
          type="button"
          className="rounded-2xl border border-rose-100 bg-white px-4 py-3 text-left"
          onClick={() => setShowFinanceGuide((open) => !open)}
        >
          <div className="flex items-center justify-between gap-2">
            <span className="text-sm font-bold text-gray-800">Como ler seus números</span>
            <span className="material-symbols-outlined text-gray-400">
              {showFinanceGuide ? "expand_less" : "expand_more"}
            </span>
          </div>
          {showFinanceGuide && (
            <ol className="mt-2 list-decimal space-y-1 pl-4 text-xs text-gray-600">
              <li>
                <strong>Faturamento</strong> — soma dos preços vendidos (últimos 30 dias)
              </li>
              <li>
                <strong>Lucro bruto</strong> — preço vendido menos o que você pagou pela peça
              </li>
              <li>
                <strong>Lucro operacional</strong> — lucro bruto menos frete e embalagem pagos por você
              </li>
              <li>
                <strong>Lucro líquido</strong> — lucro operacional menos despesas gerais do brechó
              </li>
            </ol>
          )}
        </button>

        <ReportMetricCard
          value={formatCurrency(summary?.faturamentoPecas ?? 0)}
          label="Faturamento do mês"
          helpText="Soma dos preços das peças vendidas nos últimos 30 dias"
          icon="payments"
          iconClassName="bg-rose-100 text-primary"
          valueClassName="text-primary"
          shadow
          footnotes={summary ? buildFaturamentoFootnotes(summary, formatCurrency) : []}
          extra={
            faturamentoBarPct > 0 ? (
              <div className="mt-2 max-w-xs">
                <div className="h-1.5 overflow-hidden rounded-full bg-rose-100">
                  <div className="h-full rounded-full bg-amber-400" style={{ width: `${faturamentoBarPct}%` }} />
                </div>
                <p className="mt-1 text-[10px] text-gray-500">
                  {faturamentoBarPct.toFixed(0)}% do faturamento aguarda envio
                </p>
              </div>
            ) : undefined
          }
        />

        <ReportMetricCard
          value={formatLucroDisplay(summary?.lucroBruto ?? 0, lucroCompleteness, formatCurrency)}
          label="Lucro bruto do mês"
          helpText="Preço vendido menos o que você pagou pela peça"
          icon="trending_up"
          iconClassName="bg-green-50 text-green-700"
          valueClassName="text-green-700"
          shadow
          footnotes={
            summary
              ? buildLucroFootnotes(
                  {
                    vendasNoPeriodo: summary.vendasNoPeriodo,
                    vendasComCusto: summary.vendasComCusto,
                    vendasSemCusto: summary.vendasSemCusto,
                    margemBrutaPct: summary.margemBrutaPct
                  },
                  lucroCompleteness,
                  "bruto"
                )
              : []
          }
          action={
            summary && summary.vendasSemCusto > 0 ? (
              <button
                type="button"
                className="text-xs font-bold text-primary underline"
                onClick={scrollToCompletarCustos}
              >
                Completar custos ↓
              </button>
            ) : undefined
          }
        />

        <ReportMetricCard
          value={formatLucroDisplay(summary?.lucroOperacional ?? 0, lucroCompleteness, formatCurrency)}
          label="Lucro operacional"
          helpText="Lucro bruto menos frete e embalagem pagos por você"
          icon="local_shipping"
          iconClassName="bg-emerald-50 text-emerald-700"
          valueClassName="text-emerald-700"
          shadow
          footnotes={
            summary
              ? buildLucroFootnotes(
                  {
                    vendasNoPeriodo: summary.vendasNoPeriodo,
                    vendasComCusto: summary.vendasComCusto,
                    vendasSemCusto: summary.vendasSemCusto,
                    margemBrutaPct: summary.margemBrutaPct,
                    custosFreteEmbalagem: summary.custosFreteEmbalagem
                  },
                  lucroCompleteness,
                  "operacional"
                )
              : []
          }
        />

        <ReportMetricCard
          value={formatLucroDisplay(summary?.lucroLiquido ?? 0, lucroCompleteness, formatCurrency)}
          label="Lucro líquido do mês"
          helpText="Lucro operacional menos despesas gerais do brechó"
          icon="account_balance_wallet"
          iconClassName="bg-indigo-50 text-indigo-700"
          valueClassName="text-indigo-700"
          shadow
          footnotes={
            summary
              ? [
                  ...buildLucroFootnotes(
                    {
                      vendasNoPeriodo: summary.vendasNoPeriodo,
                      vendasComCusto: summary.vendasComCusto,
                      vendasSemCusto: summary.vendasSemCusto,
                      margemBrutaPct: summary.margemBrutaPct,
                      despesasGerais: summary.despesasGerais
                    },
                    lucroCompleteness,
                    "liquido"
                  ),
                  ...(summary.despesasGerais > 0 && lucroCompleteness !== "empty"
                    ? [
                        {
                          tone: "neutral" as const,
                          text: `Descontadas ${formatCurrency(summary.despesasGerais)} em despesas gerais`
                        }
                      ]
                    : [])
                ]
              : []
          }
        />

        <ReportMetricCard
          value={staleItems.length}
          label="Paradas há +30 dias"
          helpText="Peças em estoque há mais de 30 dias sem venda"
          icon="timer"
          iconClassName="bg-amber-50 text-amber-600"
          valueClassName="text-amber-500"
        />
      </div>

      {vendasSemCusto > 0 && (
        <div id="completar-custos" className="mt-4 scroll-mt-24">
        <Section title="Completar custos do mês">
          <p className="mb-3 text-sm text-on-surface-variant">
            {vendasSemCusto} venda{vendasSemCusto === 1 ? "" : "s"} sem custo — o lucro acima não inclui essas
            vendas. Informe quanto você pagou por cada peça.
          </p>
          {missingCostQuery.isLoading && <p className="text-sm">Carregando vendas...</p>}
          <div className="space-y-2">
            {missingCostRows.map((sale) => (
              <SaleCostEditor
                key={sale.id}
                brechoId={brechoId}
                saleId={sale.id}
                pecaId={sale.peca.id}
                pecaNome={sale.peca.nome}
                pecaCodigo={sale.peca.codigo}
                precoVenda={sale.precoVenda}
                criadoEm={sale.criadoEm}
                clienteNome={sale.cliente.nome}
                pecaPrecoCusto={sale.peca.precoCusto}
                pecaThumbnailUrl={sale.peca.fotoCapaThumbnailUrl}
              />
            ))}
          </div>
          {!missingCostQuery.isLoading && missingCostRows.length === 0 && (
            <p className="rounded-2xl border border-rose-100 bg-white p-4 text-sm text-on-surface-variant">
              Nenhuma venda pendente de custo neste período.
            </p>
          )}
          {missingCostQuery.data?.hasMore && (
            <Button
              type="button"
              className="mt-3 w-full"
              disabled={missingCostQuery.isFetching}
              onClick={() => setMissingCostOffset((prev) => prev + MISSING_COST_PAGE_SIZE)}
            >
              Ver mais
            </Button>
          )}
        </Section>
        </div>
      )}

      <Section title="Despesas do mês">
        <div className="mb-3 flex items-center justify-between gap-2">
          <p className="text-sm text-on-surface-variant">
            Marketing, plataformas, embalagem em lote e outros custos do brechó.
          </p>
          <Button type="button" onClick={() => setShowDespesaForm((open) => !open)}>
            {showDespesaForm ? "Cancelar" : "Nova despesa"}
          </Button>
        </div>

        {showDespesaForm && (
          <form
            className="mb-4 grid gap-3 rounded-2xl border border-rose-100 bg-white p-4"
            onSubmit={(event) => {
              event.preventDefault();
              createDespesaMutation.mutate();
            }}
          >
            <Field label="Categoria">
              <Select
                value={despesaCategoria}
                onChange={(event) => setDespesaCategoria(event.target.value as DespesaCategoria)}
              >
                {Object.entries(DESPESA_CATEGORIA_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Valor (R$)">
              <Input
                type="number"
                step="0.01"
                min={0}
                value={despesaValor}
                onChange={(event) => setDespesaValor(event.target.value)}
              />
            </Field>
            <Field label="Data">
              <Input type="date" value={despesaData} onChange={(event) => setDespesaData(event.target.value)} />
            </Field>
            <Field label="Descrição (opcional)">
              <Input value={despesaDescricao} onChange={(event) => setDespesaDescricao(event.target.value)} />
            </Field>
            {createDespesaMutation.isError && (
              <p className="text-sm text-red-600">
                {createDespesaMutation.error instanceof Error
                  ? createDespesaMutation.error.message
                  : "Não foi possível salvar a despesa."}
              </p>
            )}
            <Button type="submit" disabled={createDespesaMutation.isPending}>
              {createDespesaMutation.isPending ? "Salvando..." : "Salvar despesa"}
            </Button>
          </form>
        )}

        {despesasQuery.isLoading && <p className="text-sm">Carregando despesas...</p>}
        {!despesasQuery.isLoading && despesas.length === 0 && (
          <p className="rounded-2xl border border-rose-100 bg-white p-4 text-sm text-on-surface-variant">
            Nenhuma despesa lançada neste período.
          </p>
        )}
        <div className="space-y-2">
          {despesas.map((despesa) => (
            <article
              key={despesa.id}
              className="flex items-center justify-between gap-3 rounded-2xl border border-rose-50 bg-white p-3"
            >
              <div>
                <p className="text-sm font-bold text-gray-900">{DESPESA_CATEGORIA_LABELS[despesa.categoria]}</p>
                <p className="text-xs text-gray-500">
                  {new Date(despesa.dataCompetencia).toLocaleDateString("pt-BR")}
                  {despesa.descricao ? ` · ${despesa.descricao}` : ""}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-sm font-extrabold text-primary">{formatCurrency(despesa.valor)}</span>
                <button
                  type="button"
                  className="text-xs font-bold text-red-600 underline"
                  disabled={deleteDespesaMutation.isPending}
                  onClick={() => deleteDespesaMutation.mutate(despesa.id)}
                >
                  Excluir
                </button>
              </div>
            </article>
          ))}
        </div>
      </Section>

      <section className="mt-2">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold">Peças sem movimento</h2>
          <span className="rounded-full bg-rose-50 px-2 py-1 text-xs font-bold text-primary">+30 dias</span>
        </div>
        <div className="space-y-3">
          {staleItems.length === 0 && (
            <p className="rounded-2xl border border-rose-100 bg-white p-4 text-sm text-on-surface-variant">
              Não há peças paradas acima de 30 dias.
            </p>
          )}
          {staleItems.map((item) => {
            const staleThumb = item.fotoCapaThumbnailUrl ?? item.fotoCapaUrl;
            return (
              <article key={item.id} className="flex items-center gap-4 rounded-2xl border border-rose-50 bg-white p-3">
                {staleThumb ? (
                  <img
                    src={staleThumb}
                    alt={`Foto da peça ${item.nome}`}
                    className="h-16 w-16 rounded-xl object-cover"
                    loading="lazy"
                  />
                ) : (
                  <div className="flex h-16 w-16 items-center justify-center rounded-xl bg-surface-container-low text-xs text-outline">
                    Sem foto
                  </div>
                )}
                <div className="flex-grow">
                  <h3 className="text-sm font-bold text-gray-800">{item.nome}</h3>
                  <p className="text-xs text-gray-500">
                    {item.subcategoria} • {item.status.toLowerCase()}
                  </p>
                </div>
                <div className="text-right">
                  <span className="block text-sm font-bold text-amber-600">{daysSince(item.criadoEm)} dias</span>
                  <span className="text-[10px] font-bold uppercase text-gray-400">parada</span>
                </div>
              </article>
            );
          })}
        </div>
      </section>

      <Section title="Conta">
        <p className="mb-3 text-sm text-on-surface-variant">
          Ajuste preferências do estoque ou altere a senha do seu acesso ao app.
        </p>
        <div className="flex flex-col gap-2">
          <Link to="/conta/preferencias" className="inline-flex text-sm font-bold text-primary underline">
            Preferências do estoque
          </Link>
          <Link to="/conta/senha" className="inline-flex text-sm font-bold text-primary underline">
            Trocar senha
          </Link>
        </div>
      </Section>
    </AppShell>
  );
};
