import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  deliverSale,
  listItems,
  listSalesDelivered,
  listSalesPendingDelivery,
  type DeliveredSale,
  type Item
} from "../api/items";
import {
  AppShell,
  Button,
  Input,
  TopShortcutBar,
  formatCurrency,
  relativeAgeLabel
} from "../components/ui";
import { useSessionStore } from "../store/session.store";

const sortReservedByOldest = (items: Item[]) =>
  [...items].sort((a, b) => {
    const aTime = new Date(a.ultimoStatus?.criadoEm ?? a.criadoEm).getTime();
    const bTime = new Date(b.ultimoStatus?.criadoEm ?? b.criadoEm).getTime();
    return aTime - bTime;
  });

export const SalesHubPage = () => {
  const brechoId = useSessionStore((state) => state.brechoId);
  const queryClient = useQueryClient();

  const [rastreioPorVenda, setRastreioPorVenda] = useState<Record<string, string>>({});
  const [deliveredOffset, setDeliveredOffset] = useState(0);
  const [deliveredRows, setDeliveredRows] = useState<DeliveredSale[]>([]);

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

  const reservedItems = useMemo(
    () => sortReservedByOldest(reservedItemsQuery.data ?? []),
    [reservedItemsQuery.data]
  );

  const deliverMutation = useMutation({
    mutationFn: (vars: { saleId: string; codigoRastreio?: string }) =>
      deliverSale(brechoId, vars.saleId, {
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

  return (
    <AppShell showTopBar showBottomNav activeTab="vendas">
      <TopShortcutBar
        shortcuts={[
          { id: "reservados", label: "Reservados" },
          { id: "aguardando", label: "Aguardando" },
          { id: "entregues", label: "Entregues" }
        ]}
      />

      <section id="reservados" className="scroll-mt-40">
        <div className="mb-4 flex items-center justify-between px-1">
          <h2 className="font-headline text-2xl font-extrabold text-primary">Reservados</h2>
          <span className="rounded-full bg-rose-100 px-2 py-1 text-xs font-semibold text-primary">
            {reservedItems.length} peças
          </span>
        </div>
        <div className="space-y-4">
          {reservedItemsQuery.isLoading && <p>Carregando reservados...</p>}
          {!reservedItemsQuery.isLoading && reservedItems.length === 0 && (
            <p className="rounded-2xl border border-rose-100 bg-white p-4 text-sm text-on-surface-variant">
              Sem peças reservadas no momento.
            </p>
          )}
          {reservedItems.map((item) => {
            const age = relativeAgeLabel(item.ultimoStatus?.criadoEm ?? item.criadoEm);
            const isUrgent = age.label.includes("h") && Number.parseInt(age.label.replace(/\D/g, ""), 10) >= 24;
            const itemImg = item.fotoCapaThumbnailUrl ?? item.fotoCapaUrl;
            return (
              <article key={item.id} className="rounded-3xl border border-rose-50 bg-white p-4 shadow-sm">
                <div className="flex gap-4">
                  {itemImg ? (
                    <img
                      src={itemImg}
                      alt={`Foto da peça ${item.nome}`}
                      className="h-20 w-20 rounded-2xl object-cover"
                      loading="lazy"
                    />
                  ) : (
                    <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-surface-container-low text-xs text-outline">
                      Sem foto
                    </div>
                  )}
                  <div className="flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="font-bold text-gray-900">{item.nome}</h3>
                      {isUrgent && (
                        <span className="rounded-full bg-red-500 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white">
                          Urgente
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-500">
                      Reservado por {item.ultimoStatus?.cliente?.nome ?? "cliente não identificado"}
                    </p>
                    <p className="mt-1 text-xs font-bold italic" style={{ color: age.tone }}>
                      {age.label}
                    </p>
                  </div>
                </div>
                <div className="mt-4 flex items-center justify-between border-t border-gray-50 pt-4">
                  <div className="flex items-center gap-4">
                    <Link to={`/items/${item.id}`} className="text-xs font-bold uppercase tracking-widest text-gray-400">
                      Gerenciar fila
                    </Link>
                  </div>
                  <div className="flex items-center gap-3">
                    <Link
                      to={`/sell/${item.id}`}
                      className="rounded-full bg-primary px-6 py-2 text-sm font-bold text-white shadow-md shadow-rose-100 transition-transform active:scale-95"
                    >
                      Vender
                    </Link>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      </section>

      <section id="aguardando" className="scroll-mt-40">
        <div className="mb-4 flex items-center justify-between px-1">
          <h2 className="font-headline text-2xl font-extrabold text-primary">Aguardando Entrega</h2>
          <span className="rounded-full bg-rose-100 px-2 py-1 text-xs font-semibold text-primary">
            {pendingSalesQuery.data?.length ?? 0} peças
          </span>
        </div>
        <div className="space-y-4">
          {pendingSalesQuery.isLoading && <p>Carregando entregas pendentes...</p>}
          {!pendingSalesQuery.isLoading && !pendingSalesQuery.data?.length && (
            <p className="rounded-2xl border border-rose-100 bg-white p-4 text-sm text-on-surface-variant">
              Nenhuma venda aguardando entrega.
            </p>
          )}
          {pendingSalesQuery.data?.map((sale) => {
            const pecaImg = sale.peca.fotoCapaThumbnailUrl ?? sale.peca.fotoCapaUrl;
            return (
            <article key={sale.id} className="rounded-3xl border border-rose-50 bg-white p-4 shadow-sm">
              <div className="flex gap-4">
                {pecaImg ? (
                  <img
                    src={pecaImg}
                    alt={`Foto da peça ${sale.peca.nome}`}
                    className="h-20 w-20 rounded-2xl object-cover"
                    loading="lazy"
                  />
                ) : (
                  <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-surface-container-low text-xs text-outline">
                    Sem foto
                  </div>
                )}
                <div className="flex-1">
                  <h3 className="font-bold text-gray-900">{sale.peca.nome}</h3>
                  <p className="text-sm text-gray-500">Cliente: {sale.cliente.nome}</p>
                  <div className="mt-3">
                    <Input
                      placeholder="Código de rastreio (opcional)"
                      value={rastreioPorVenda[sale.id] ?? ""}
                      onChange={(event) =>
                        setRastreioPorVenda((prev) => ({
                          ...prev,
                          [sale.id]: event.target.value
                        }))
                      }
                    />
                  </div>
                </div>
              </div>
              <div className="mt-4 flex items-center justify-end border-t border-gray-50 pt-4">
                <Button
                  type="button"
                  disabled={deliverMutation.isPending}
                  onClick={() =>
                    deliverMutation.mutate({
                      saleId: sale.id,
                      codigoRastreio: rastreioPorVenda[sale.id]
                    })
                  }
                >
                  Marcar como Entregue
                </Button>
              </div>
            </article>
            );
          })}
        </div>
      </section>

      <section id="entregues" className="scroll-mt-40">
        <div className="mb-4 flex items-center justify-between px-1">
          <h2 className="font-headline text-2xl font-extrabold text-primary">Entregues</h2>
          <span className="rounded-full bg-rose-100 px-2 py-1 text-xs font-semibold text-primary">30 dias</span>
        </div>
        <div className="space-y-3">
          {deliveredSalesQuery.isLoading && deliveredOffset === 0 && <p>Carregando histórico...</p>}
          {!deliveredSalesQuery.isLoading && deliveredRows.length === 0 && (
            <p className="rounded-2xl border border-rose-100 bg-white p-4 text-sm text-on-surface-variant">
              Nenhuma entrega nos últimos 30 dias.
            </p>
          )}
          {deliveredRows.map((sale) => {
            const pecaImg = sale.peca.fotoCapaThumbnailUrl ?? sale.peca.fotoCapaUrl;
            return (
            <article key={sale.id} className="rounded-2xl border border-rose-50 bg-white p-3 shadow-sm">
              <div className="flex items-center gap-4">
                {pecaImg ? (
                  <img
                    src={pecaImg}
                    alt={`Foto da peça ${sale.peca.nome}`}
                    className="h-14 w-14 rounded-xl object-cover"
                    loading="lazy"
                  />
                ) : (
                  <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-surface-container-low text-xs text-outline">
                    Sem foto
                  </div>
                )}
                <div className="flex-1">
                  <h3 className="font-bold text-gray-900">{sale.peca.nome}</h3>
                  <p className="text-xs text-gray-500">
                    {sale.cliente.nome} • {new Date(sale.entrega?.entregueEm ?? sale.criadoEm).toLocaleDateString("pt-BR")}
                  </p>
                </div>
                <strong className="text-primary">{formatCurrency(sale.ganhosTotal)}</strong>
              </div>
            </article>
            );
          })}
          {deliveredSalesQuery.data?.hasMore && (
            <Button
              type="button"
              className="w-full"
              disabled={deliveredSalesQuery.isFetching}
              onClick={() => setDeliveredOffset((prev) => prev + (deliveredSalesQuery.data?.rows.length ?? 20))}
            >
              Ver mais
            </Button>
          )}
        </div>
      </section>
    </AppShell>
  );
};
