import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { listItems, listSalesDelivered, listSalesPendingDelivery } from "../api/items";
import { AppShell, Section, formatCurrency } from "../components/ui";
import { parseMoneyLike } from "../lib/money";
import { useSessionStore } from "../store/session.store";

const daysSince = (isoDate: string) => Math.floor((Date.now() - new Date(isoDate).getTime()) / (1000 * 60 * 60 * 24));

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
    const asNumber = parseMoneyLike(row.ganhosTotal);
    return sum + (Number.isNaN(asNumber) ? 0 : asNumber);
  }, 0);
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

      {(itemsQuery.isLoading || deliveredQuery.isLoading || pendingDeliveryQuery.isLoading) && (
        <p>Carregando indicadores...</p>
      )}

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
            <span className="block text-4xl font-extrabold">{soldMonthEstimate}</span>
            <span className="text-sm font-semibold text-gray-500">Vendidas este mês</span>
          </div>
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-green-50 text-green-600">
            <span className="material-symbols-outlined">shopping_bag</span>
          </div>
        </div>

        <div className="flex items-center justify-between rounded-3xl border border-rose-50 bg-white p-6 shadow-sm">
          <div>
            <span className="block text-4xl font-extrabold text-primary">{formatCurrency(grossRevenue)}</span>
            <span className="text-sm font-semibold text-gray-500">Faturamento do mês</span>
          </div>
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-100 text-primary">
            <span className="material-symbols-outlined">payments</span>
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

      <Section title="Conta e segurança">
        <p className="mb-3 text-sm text-on-surface-variant">
          Altere a senha do seu acesso ao app sem depender do suporte.
        </p>
        <Link to="/conta/senha" className="inline-flex text-sm font-bold text-primary underline">
          Trocar senha
        </Link>
      </Section>
    </AppShell>
  );
};
