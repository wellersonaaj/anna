import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  listItems,
  listSalesDelivered,
  type DeliveredSale,
  type Item
} from "../api/items";
import { listPendingSacolas, shipSacola, type PendingSacola } from "../api/sacolas";
import { EditSaleForm } from "../components/edit-sale-form";
import { formatFreteInclusoLabel } from "../components/frete-incluso-detail";
import {
  AppShell,
  Button,
  Input,
  TopShortcutBar,
  formatCurrency,
  relativeAgeLabel
} from "../components/ui";
import { parseMoneyLike } from "../lib/money";
import { computeLucroOperacional } from "../lib/peca-lucro";
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

  const [rastreioPorSacola, setRastreioPorSacola] = useState<Record<string, string>>({});
  const [fretePorSacola, setFretePorSacola] = useState<Record<string, string>>({});
  const [freteCustoPorSacola, setFreteCustoPorSacola] = useState<Record<string, string>>({});
  const [embalagemCustoPorSacola, setEmbalagemCustoPorSacola] = useState<Record<string, string>>({});
  const [selectedVendas, setSelectedVendas] = useState<Record<string, string[]>>({});
  const [deliveredOffset, setDeliveredOffset] = useState(0);
  const [deliveredRows, setDeliveredRows] = useState<DeliveredSale[]>([]);
  const [editingSale, setEditingSale] = useState<{
    id: string;
    pecaNome: string;
    preco: number;
    freteIncluso: boolean;
    freteInclusoValor?: number | null;
  } | null>(null);

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

  const reservedItems = useMemo(
    () => sortReservedByOldest(reservedItemsQuery.data ?? []),
    [reservedItemsQuery.data]
  );

  const shipSacolaMutation = useMutation({
    mutationFn: (vars: {
      sacolaId: string;
      vendaIds?: string[];
      codigoRastreio?: string;
      freteValor?: number;
      freteCustoLoja?: number;
      embalagemCusto?: number;
    }) =>
      shipSacola(brechoId, vars.sacolaId, {
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

  return (
    <AppShell showTopBar showBottomNav activeTab="vendas">
      <TopShortcutBar
        shortcuts={[
          { id: "reservados", label: "Reservados" },
          { id: "aguardando", label: "Aguardando" },
          { id: "entregues", label: "Entregues" }
        ]}
      />

      {editingSale && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center">
          <div className="w-full max-w-md">
            <EditSaleForm
              brechoId={brechoId}
              saleId={editingSale.id}
              pecaNome={editingSale.pecaNome}
              initialPreco={editingSale.preco}
              initialFreteIncluso={editingSale.freteIncluso}
              initialFreteInclusoValor={editingSale.freteInclusoValor}
              canEditFreteIncluso
              onClose={() => setEditingSale(null)}
            />
          </div>
        </div>
      )}

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
            {totalPecasPendentes} peças · {pendingSacolas.length} sacolas
          </span>
        </div>
        <div className="space-y-4">
          {pendingSacolasQuery.isLoading && <p>Carregando sacolas...</p>}
          {!pendingSacolasQuery.isLoading && pendingSacolas.length === 0 && (
            <p className="rounded-2xl border border-rose-100 bg-white p-4 text-sm text-on-surface-variant">
              Nenhuma venda aguardando entrega.
            </p>
          )}
          {pendingSacolas.map((sacola: PendingSacola) => {
            const selected = selectedVendas[sacola.id] ?? sacola.vendas.map((v) => v.id);
            const selectedVendaRows = sacola.vendas.filter((v) => selected.includes(v.id));
            const allSelectedFreteIncluso =
              selectedVendaRows.length > 0 && selectedVendaRows.every((v) => v.freteIncluso);
            const subtotalPecas = selectedVendaRows.reduce(
              (sum, v) => sum + parseMoneyLike(v.precoVenda),
              0
            );
            const freteInput = fretePorSacola[sacola.id] ?? "";
            const freteValor = parseMoneyLike(freteInput);
            const freteNumerico = Number.isNaN(freteValor) ? 0 : freteValor;
            const freteCustoInput = freteCustoPorSacola[sacola.id] ?? "";
            const freteCustoValor = parseMoneyLike(freteCustoInput);
            const freteCustoNumerico = Number.isNaN(freteCustoValor) ? 0 : freteCustoValor;
            const embalagemCustoInput = embalagemCustoPorSacola[sacola.id] ?? "";
            const embalagemCustoValor = parseMoneyLike(embalagemCustoInput);
            const embalagemCustoNumerico = Number.isNaN(embalagemCustoValor) ? 0 : embalagemCustoValor;

            return (
              <article key={sacola.id} className="rounded-3xl border border-rose-50 bg-white p-4 shadow-sm">
                <div className="mb-3 flex items-start justify-between gap-2">
                  <div>
                    <h3 className="font-bold text-gray-900">{sacola.cliente.nome}</h3>
                    <p className="text-sm text-gray-500">{sacola.totalPecas} peça(s) na sacola</p>
                  </div>
                  <Link to={`/clientes/${sacola.cliente.id}`} className="text-xs font-bold text-primary">
                    Ver cliente
                  </Link>
                </div>
                <ul className="mb-3 space-y-2">
                  {sacola.vendas.map((venda) => (
                    <li key={venda.id} className="flex items-start gap-2 text-sm">
                      <input
                        type="checkbox"
                        className="mt-1"
                        checked={selected.includes(venda.id)}
                        onChange={(e) => {
                          setSelectedVendas((prev) => {
                            const current = prev[sacola.id] ?? sacola.vendas.map((v) => v.id);
                            const next = e.target.checked
                              ? [...current, venda.id]
                              : current.filter((id) => id !== venda.id);
                            return { ...prev, [sacola.id]: next };
                          });
                        }}
                      />
                      <div className="flex-1">
                        <span>
                          {venda.peca.codigo ? `${venda.peca.codigo} · ` : ""}
                          {venda.peca.nome}
                        </span>
                        <div className="mt-0.5 flex flex-wrap items-center gap-2">
                          <span className="text-xs font-semibold text-primary">
                            {formatCurrency(venda.precoVenda)}
                          </span>
                          {computeLucroOperacional(
                            parseMoneyLike(venda.precoVenda),
                            venda.precoCusto != null ? parseMoneyLike(venda.precoCusto) : null,
                            venda.freteCustoLoja != null ? parseMoneyLike(venda.freteCustoLoja) : null,
                            venda.embalagemCusto != null ? parseMoneyLike(venda.embalagemCusto) : null
                          ) != null && (
                            <span className="text-xs font-semibold text-green-700">
                              Lucro {formatCurrency(
                                computeLucroOperacional(
                                  parseMoneyLike(venda.precoVenda),
                                  venda.precoCusto != null ? parseMoneyLike(venda.precoCusto) : null,
                                  venda.freteCustoLoja != null ? parseMoneyLike(venda.freteCustoLoja) : null,
                                  venda.embalagemCusto != null ? parseMoneyLike(venda.embalagemCusto) : null
                                )
                              )}
                            </span>
                          )}
                          <span
                            className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${
                              venda.freteIncluso ? "bg-green-50 text-green-700" : "bg-gray-100 text-gray-600"
                            }`}
                          >
                            {formatFreteInclusoLabel(venda.freteIncluso, venda.freteInclusoValor)}
                          </span>
                          <button
                            type="button"
                            className="text-[10px] font-bold uppercase text-primary underline"
                            onClick={() =>
                              setEditingSale({
                                id: venda.id,
                                pecaNome: venda.peca.nome,
                                preco: parseMoneyLike(venda.precoVenda),
                                freteIncluso: venda.freteIncluso,
                                freteInclusoValor: venda.freteInclusoValor
                                  ? parseMoneyLike(venda.freteInclusoValor)
                                  : null
                              })
                            }
                          >
                            Editar
                          </button>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>

                {selectedVendaRows.length > 0 && (
                  <div className="mb-3 rounded-xl bg-rose-50/50 p-3 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Peças selecionadas</span>
                      <strong>{formatCurrency(subtotalPecas)}</strong>
                    </div>
                    {!allSelectedFreteIncluso && freteNumerico > 0 && (
                      <div className="mt-1 flex justify-between">
                        <span className="text-gray-600">Frete deste envio</span>
                        <strong>{formatCurrency(freteNumerico)}</strong>
                      </div>
                    )}
                  </div>
                )}

                {!allSelectedFreteIncluso ? (
                  <Input
                    type="number"
                    step="0.01"
                    min={0}
                    placeholder="Frete deste envio (opcional)"
                    value={freteInput}
                    onChange={(event) =>
                      setFretePorSacola((prev) => ({ ...prev, [sacola.id]: event.target.value }))
                    }
                    className="mb-2"
                  />
                ) : (
                  <p className="mb-2 text-xs text-green-700">Frete já incluso nos preços das peças selecionadas.</p>
                )}

                <Input
                  type="number"
                  step="0.01"
                  min={0}
                  placeholder="Quanto você pagou de frete? (R$) (opcional)"
                  value={freteCustoInput}
                  onChange={(event) =>
                    setFreteCustoPorSacola((prev) => ({ ...prev, [sacola.id]: event.target.value }))
                  }
                  className="mb-2"
                />
                <Input
                  type="number"
                  step="0.01"
                  min={0}
                  placeholder="Custo de embalagem deste envio (R$) (opcional)"
                  value={embalagemCustoInput}
                  onChange={(event) =>
                    setEmbalagemCustoPorSacola((prev) => ({ ...prev, [sacola.id]: event.target.value }))
                  }
                  className="mb-2"
                />
                <Input
                  placeholder="Código de rastreio (opcional)"
                  value={rastreioPorSacola[sacola.id] ?? ""}
                  onChange={(event) =>
                    setRastreioPorSacola((prev) => ({ ...prev, [sacola.id]: event.target.value }))
                  }
                />
                <div className="mt-4 flex flex-wrap gap-2">
                  <Button
                    type="button"
                    disabled={shipSacolaMutation.isPending || selected.length === 0}
                    onClick={() =>
                      shipSacolaMutation.mutate({
                        sacolaId: sacola.id,
                        vendaIds: selected.length === sacola.vendas.length ? undefined : selected,
                        codigoRastreio: rastreioPorSacola[sacola.id],
                        freteValor: allSelectedFreteIncluso ? undefined : freteNumerico > 0 ? freteNumerico : undefined,
                        freteCustoLoja: freteCustoNumerico > 0 ? freteCustoNumerico : undefined,
                        embalagemCusto: embalagemCustoNumerico > 0 ? embalagemCustoNumerico : undefined
                      })
                    }
                  >
                    Enviar {selected.length === sacola.vendas.length ? "sacola" : `${selected.length} peça(s)`}
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
            const lucroOperacional = computeLucroOperacional(
              parseMoneyLike(sale.precoVenda),
              sale.precoCusto != null ? parseMoneyLike(sale.precoCusto) : null,
              sale.freteCustoLoja != null ? parseMoneyLike(sale.freteCustoLoja) : null,
              sale.embalagemCusto != null ? parseMoneyLike(sale.embalagemCusto) : null
            );
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
                      {sale.cliente.nome} •{" "}
                      {new Date(sale.entrega?.entregueEm ?? sale.criadoEm).toLocaleDateString("pt-BR")}
                    </p>
                    {lucroOperacional != null && (
                      <p className="text-xs font-semibold text-green-700">Lucro {formatCurrency(lucroOperacional)}</p>
                    )}
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
