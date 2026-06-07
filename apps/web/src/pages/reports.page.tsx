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
import { getSalesPeriodSummary, listItems } from "../api/items";
import { AppShell, Button, Field, Input, Section, Select, formatCurrency } from "../components/ui";
import { parseMoneyLike } from "../lib/money";
import { useSessionStore } from "../store/session.store";

const daysSince = (isoDate: string) => Math.floor((Date.now() - new Date(isoDate).getTime()) / (1000 * 60 * 60 * 24));

const inStockStatuses = new Set(["DISPONIVEL", "RESERVADO", "INDISPONIVEL"]);

const todayInputValue = () => new Date().toISOString().slice(0, 10);

export const ReportsPage = () => {
  const brechoId = useSessionStore((state) => state.brechoId);
  const queryClient = useQueryClient();
  const [showDespesaForm, setShowDespesaForm] = useState(false);
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
  const summary = periodSummaryQuery.data;
  const despesas = despesasQuery.data ?? [];

  const stockCount = items.filter((item) => inStockStatuses.has(item.status)).length;
  const staleItems = items
    .filter((item) => inStockStatuses.has(item.status) && daysSince(item.criadoEm) > 30)
    .sort((a, b) => new Date(a.criadoEm).getTime() - new Date(b.criadoEm).getTime())
    .slice(0, 10);

  return (
    <AppShell showTopBar showBottomNav activeTab="relatorios">
      <div className="mb-2">
        <h1 className="text-3xl font-extrabold tracking-tight">Relatórios</h1>
        <p className="text-sm font-medium text-gray-500">Visão geral do seu desempenho este mês</p>
      </div>

      {(itemsQuery.isLoading || periodSummaryQuery.isLoading) && <p>Carregando indicadores...</p>}

      <div className="grid grid-cols-1 gap-4">
        <div className="flex items-center justify-between rounded-3xl border border-rose-50 bg-white p-6">
          <div>
            <span className="block text-4xl font-extrabold">{stockCount}</span>
            <span className="text-sm font-semibold text-gray-500">Peças em estoque</span>
          </div>
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-50 text-primary">
            <span className="material-symbols-outlined">inventory_2</span>
          </div>
        </div>

        <div className="flex items-center justify-between rounded-3xl border border-rose-50 bg-white p-6">
          <div>
            <span className="block text-4xl font-extrabold">{summary?.vendasNoPeriodo ?? 0}</span>
            <span className="text-sm font-semibold text-gray-500">Vendidas este mês</span>
          </div>
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-green-50 text-green-600">
            <span className="material-symbols-outlined">shopping_bag</span>
          </div>
        </div>

        <div className="flex items-center justify-between rounded-3xl border border-rose-50 bg-white p-6 shadow-sm">
          <div>
            <span className="block text-4xl font-extrabold text-primary">
              {formatCurrency(summary?.faturamentoPecas ?? 0)}
            </span>
            <span className="text-sm font-semibold text-gray-500">Faturamento do mês</span>
            {summary && summary.freteInclusoInformado > 0 && (
              <p className="mt-1 text-xs text-gray-500">
                incl. {formatCurrency(summary.freteInclusoInformado)} em frete (informado nas vendas)
              </p>
            )}
            {summary && summary.aguardandoEnvio.count > 0 && (
              <p className="mt-1 text-xs text-amber-700">
                {summary.aguardandoEnvio.count} aguardando envio ·{" "}
                {formatCurrency(summary.aguardandoEnvio.valorPecas)}
              </p>
            )}
          </div>
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-100 text-primary">
            <span className="material-symbols-outlined">payments</span>
          </div>
        </div>

        <div className="flex items-center justify-between rounded-3xl border border-rose-50 bg-white p-6 shadow-sm">
          <div>
            <span className="block text-4xl font-extrabold text-green-700">
              {formatCurrency(summary?.lucroBruto ?? 0)}
            </span>
            <span className="text-sm font-semibold text-gray-500">Lucro bruto do mês</span>
            {summary && summary.margemBrutaPct != null && (
              <p className="mt-1 text-xs text-gray-500">
                Margem bruta: {summary.margemBrutaPct.toFixed(0)}% (vendas com custo cadastrado)
              </p>
            )}
            {summary && summary.vendasSemCusto > 0 && (
              <p className="mt-1 text-xs text-amber-700">
                {summary.vendasSemCusto} venda{summary.vendasSemCusto === 1 ? "" : "s"} sem custo cadastrado — lucro
                pode estar incompleto
              </p>
            )}
          </div>
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-green-50 text-green-700">
            <span className="material-symbols-outlined">trending_up</span>
          </div>
        </div>

        <div className="flex items-center justify-between rounded-3xl border border-rose-50 bg-white p-6 shadow-sm">
          <div>
            <span className="block text-4xl font-extrabold text-emerald-700">
              {formatCurrency(summary?.lucroOperacional ?? 0)}
            </span>
            <span className="text-sm font-semibold text-gray-500">Lucro operacional</span>
            {summary && summary.custosFreteEmbalagem > 0 && (
              <p className="mt-1 text-xs text-gray-500">
                após {formatCurrency(summary.custosFreteEmbalagem)} em frete/embalagem das vendas
              </p>
            )}
          </div>
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700">
            <span className="material-symbols-outlined">local_shipping</span>
          </div>
        </div>

        <div className="flex items-center justify-between rounded-3xl border border-rose-50 bg-white p-6 shadow-sm">
          <div>
            <span className="block text-4xl font-extrabold text-indigo-700">
              {formatCurrency(summary?.lucroLiquido ?? 0)}
            </span>
            <span className="text-sm font-semibold text-gray-500">Lucro líquido do mês</span>
            {summary && summary.despesasGerais > 0 && (
              <p className="mt-1 text-xs text-gray-500">
                após {formatCurrency(summary.despesasGerais)} em despesas gerais
              </p>
            )}
          </div>
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-700">
            <span className="material-symbols-outlined">account_balance_wallet</span>
          </div>
        </div>

        <div className="flex items-center justify-between rounded-3xl border border-rose-50 bg-white p-6">
          <div>
            <span className="block text-4xl font-extrabold text-amber-500">{staleItems.length}</span>
            <span className="text-sm font-semibold text-gray-500">Paradas há +30 dias</span>
          </div>
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-50 text-amber-600">
            <span className="material-symbols-outlined">timer</span>
          </div>
        </div>
      </div>

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
