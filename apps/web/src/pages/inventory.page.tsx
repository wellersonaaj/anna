import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useId, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { countImportacoesPendentes } from "../api/importacoes";
import {
  getItem,
  listAcervoSuggestions,
  listItems,
  setItemCoverFoto,
  type Item,
  type ItemCategoria,
  type ItemStatus
} from "../api/items";
import {
  includesSoldStatuses,
  readInventoryPrefs,
  SOLD_ITEM_STATUSES,
  writeInventoryPrefs
} from "../lib/inventory-prefs";
import { useSessionStore } from "../store/session.store";
import { AppShell, Input, PhotoLightbox, PillButton, ProductCard, formatCurrency } from "../components/ui";

const STATUS_FILTER_OPTIONS: Array<{ key: ItemStatus; label: string }> = [
  { key: "DISPONIVEL", label: "Disponível" },
  { key: "RESERVADO", label: "Reservado" },
  { key: "INDISPONIVEL", label: "Indisponível" },
  { key: "VENDIDO", label: "Vendido" },
  { key: "ENTREGUE", label: "Entregue" }
];

export const InventoryPage = () => {
  const brechoId = useSessionStore((state) => state.brechoId);
  const queryClient = useQueryClient();
  const [filterStatusIn, setFilterStatusIn] = useState<ItemStatus[]>(() =>
    brechoId ? readInventoryPrefs(brechoId).statusIn : []
  );
  const soldWithinDays = brechoId ? readInventoryPrefs(brechoId).soldWithinDays : 30;
  const [filterCategoria, setFilterCategoria] = useState<"" | ItemCategoria>("");
  const [filterAcervoTipo, setFilterAcervoTipo] = useState<"" | Item["acervoTipo"]>("");
  const [filterAcervoNome, setFilterAcervoNome] = useState("");
  const [filterSearch, setFilterSearch] = useState("");
  const [expandedItemId, setExpandedItemId] = useState<string | null>(null);
  const acervoSuggestionsListId = useId();

  useEffect(() => {
    if (!brechoId) {
      return;
    }
    const prefs = readInventoryPrefs(brechoId);
    setFilterStatusIn(prefs.statusIn);
  }, [brechoId]);

  const toggleStatusFilter = (status: ItemStatus) => {
    setFilterStatusIn((current) => {
      const next = current.includes(status) ? current.filter((entry) => entry !== status) : [...current, status];
      if (brechoId) {
        writeInventoryPrefs(brechoId, { statusIn: next });
      }
      return next;
    });
  };

  const showSoldStatuses = includesSoldStatuses(filterStatusIn);

  const listFilters = useMemo(
    () => ({
      statusIn: filterStatusIn,
      ...(showSoldStatuses ? { soldWithinDays } : {}),
      ...(filterCategoria ? { categoria: filterCategoria } : {}),
      ...(filterSearch.trim() ? { search: filterSearch.trim() } : {}),
      ...(filterAcervoTipo ? { acervoTipo: filterAcervoTipo } : {}),
      ...(filterAcervoNome.trim() ? { acervoNome: filterAcervoNome.trim() } : {})
    }),
    [filterStatusIn, showSoldStatuses, soldWithinDays, filterCategoria, filterSearch, filterAcervoTipo, filterAcervoNome]
  );

  const acervoSuggestionsQuery = useQuery({
    queryKey: ["acervo-suggestions", brechoId, filterAcervoTipo, filterAcervoNome],
    queryFn: () =>
      listAcervoSuggestions(brechoId, {
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
    queryFn: () => getItem(brechoId, expandedItemId!),
    enabled: Boolean(expandedItemId)
  });

  const setCoverMutation = useMutation({
    mutationFn: (vars: { itemId: string; fotoId: string }) => setItemCoverFoto(brechoId, vars.itemId, vars.fotoId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["items", brechoId] });
      await queryClient.invalidateQueries({ queryKey: ["item", brechoId, expandedItemId] });
    }
  });

  const categoryFilters: Array<{ key: "" | ItemCategoria; label: string }> = [
    { key: "", label: "Todas" },
    { key: "ROUPA_FEMININA", label: "Roupas femininas" },
    { key: "ROUPA_MASCULINA", label: "Roupas masculinas" },
    { key: "CALCADO", label: "Calçados" },
    { key: "ACESSORIO", label: "Acessórios" }
  ];

  const acervoTipoFilters: Array<{ key: "" | Item["acervoTipo"]; label: string }> = [
    { key: "", label: "Todos" },
    { key: "PROPRIO", label: "Próprio" },
    { key: "CONSIGNACAO", label: "Consignação" }
  ];

  return (
    <AppShell
      showTopBar
      showBottomNav
      activeTab="estoque"
      topBarAction={
        <Link to="/importacoes" className="text-xs font-bold text-primary underline">
          Importações
          {importPendentesQuery.data?.count ? ` (${importPendentesQuery.data.count})` : ""}
        </Link>
      }
    >
      <section>
        <h1 className="mb-2 font-headline text-5xl font-extrabold tracking-tighter">Estoque</h1>
        {importPendentesQuery.data?.count ? (
          <p className="mb-2 rounded-2xl border border-amber-100 bg-amber-50/90 px-3 py-2 text-sm text-on-background">
            Você tem{" "}
            <strong>
              {importPendentesQuery.data.count}{" "}
              {importPendentesQuery.data.count === 1 ? "importação pendente" : "importações pendentes"}
            </strong>
            .{" "}
            <Link to="/importacoes" className="font-bold text-primary underline">
              Continuar
            </Link>
          </p>
        ) : null}
      </section>

      <div className="mb-2">
        <label className="mb-2 ml-1 block text-[10px] font-bold uppercase tracking-[0.1em] text-on-surface-variant">
          Buscar peça
        </label>
        <Input
          value={filterSearch}
          onChange={(e) => setFilterSearch(e.target.value)}
          placeholder="Buscar por nome, cor ou categoria..."
          className="h-12 rounded-none border-0 border-b-2 border-outline-variant bg-transparent px-0 text-base focus:border-primary"
        />
      </div>

      <div className="space-y-5">
        <div>
          <label className="mb-3 block text-[9px] font-bold uppercase tracking-widest text-outline">Status</label>
          <div className="flex flex-wrap gap-3">
            {STATUS_FILTER_OPTIONS.map((statusFilter) => (
              <label
                key={statusFilter.key}
                className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-rose-100 bg-white px-3 py-2 text-sm font-semibold text-on-surface-variant"
              >
                <input
                  type="checkbox"
                  checked={filterStatusIn.includes(statusFilter.key)}
                  onChange={() => toggleStatusFilter(statusFilter.key)}
                  className="h-4 w-4 accent-primary"
                />
                {statusFilter.label}
              </label>
            ))}
          </div>
          {showSoldStatuses ? (
            <p className="mt-2 text-xs text-on-surface-variant">
              Mostrando {SOLD_ITEM_STATUSES.filter((status) => filterStatusIn.includes(status)).map((status) => (status === "VENDIDO" ? "vendidos" : "entregues")).join(" e ")} dos últimos {soldWithinDays} dias.{" "}
              <Link to="/conta/preferencias" className="font-bold text-primary underline">
                Ajustar prazo
              </Link>
            </p>
          ) : null}
        </div>
        <div>
          <label className="mb-3 block text-[9px] font-bold uppercase tracking-widest text-outline">Categoria</label>
          <div className="no-scrollbar flex gap-2 overflow-x-auto">
            {categoryFilters.map((categoryFilter) => (
              <PillButton
                key={categoryFilter.label}
                active={filterCategoria === categoryFilter.key}
                onClick={() => setFilterCategoria(categoryFilter.key)}
              >
                {categoryFilter.label}
              </PillButton>
            ))}
          </div>
        </div>
        <div>
          <label className="mb-3 block text-[9px] font-bold uppercase tracking-widest text-outline">Tipo de acervo</label>
          <div className="no-scrollbar flex gap-2 overflow-x-auto">
            {acervoTipoFilters.map((acervoTipoFilter) => (
              <PillButton
                key={acervoTipoFilter.label}
                active={filterAcervoTipo === acervoTipoFilter.key}
                onClick={() => setFilterAcervoTipo(acervoTipoFilter.key)}
              >
                {acervoTipoFilter.label}
              </PillButton>
            ))}
          </div>
        </div>
        <div>
          <label className="mb-2 ml-1 block text-[10px] font-bold uppercase tracking-[0.1em] text-on-surface-variant">
            Nome do acervo
          </label>
          <Input
            list={acervoSuggestionsListId}
            value={filterAcervoNome}
            onChange={(e) => setFilterAcervoNome(e.target.value)}
            placeholder="Filtrar por nome (opcional)..."
            className="h-12 rounded-none border-0 border-b-2 border-outline-variant bg-transparent px-0 text-base focus:border-primary"
          />
          <datalist id={acervoSuggestionsListId}>
            {(acervoSuggestionsQuery.data ?? []).map((suggestion) => (
              <option key={suggestion} value={suggestion} />
            ))}
          </datalist>
        </div>
      </div>

      {itemsQuery.isLoading && <p>Carregando...</p>}
      {itemsQuery.isError && (
        <p className="rounded-2xl border border-rose-100 bg-white p-4 text-sm text-on-surface-variant">
          Não foi possível carregar. Verifique a conexão e tente de novo.
        </p>
      )}
      {itemsQuery.isSuccess && !itemsQuery.data?.length && (
        <p className="rounded-2xl border border-rose-100 bg-white p-4 text-sm text-on-surface-variant">
          Nenhuma peça encontrada com os filtros atuais.
        </p>
      )}
      {itemsQuery.isSuccess && itemsQuery.data?.length ? (
        <div className="grid grid-cols-2 gap-x-4 gap-y-8">
          {itemsQuery.data.map((item) => (
            <div key={item.id}>
              <ProductCard
                key={item.id}
                item={item}
                subtitle={`${item.codigo ? `${item.codigo} · ` : ""}${item.categoria.replaceAll("_", " ")} / ${item.subcategoria}`}
                priceLabel={formatCurrency(item.precoVenda)}
                onImageClick={
                  (item.fotoPreviews?.length || item.fotoCapaThumbnailUrl || item.fotoCapaUrl)
                    ? () => {
                        setExpandedItemId(item.id);
                      }
                    : undefined
                }
              >
                <div className="mt-2 flex flex-wrap gap-2">
                  <Link className="text-xs font-bold text-on-surface-variant underline" to={`/items/${item.id}`}>
                    Ver detalhes
                  </Link>
                  {(item.status === "DISPONIVEL" || item.status === "RESERVADO") && (
                    <Link className="text-xs font-bold text-primary underline" to={`/sell/${item.id}`}>
                      Vender
                    </Link>
                  )}
                  {(item.status === "DISPONIVEL" || item.status === "RESERVADO") && (
                    <Link className="text-xs font-bold text-primary underline" to={`/reserve/${item.id}`}>
                      {item.status === "RESERVADO" ? "Adicionar à fila" : "Reservar"}
                    </Link>
                  )}
                </div>
              </ProductCard>
            </div>
          ))}
        </div>
      ) : null}
      {expandedItemId && expandedItemQuery.isLoading && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/70 p-4 text-white">
          Carregando fotos...
        </div>
      )}
      {expandedItemId && expandedItemQuery.data && (expandedItemQuery.data.fotos ?? []).length > 0 && (
        <PhotoLightbox
          photos={(expandedItemQuery.data.fotos ?? []).map((foto) => ({
            id: foto.id,
            url: foto.url,
            thumbnailUrl: foto.thumbnailUrl ?? undefined,
            alt: `Foto da peça ${expandedItemQuery.data.nome}`
          }))}
          initialIndex={Math.max(
            0,
            (expandedItemQuery.data.fotos ?? []).findIndex((foto) => foto.isCover)
          )}
          title={expandedItemQuery.data.nome}
          coverPhotoId={(expandedItemQuery.data.fotos ?? []).find((foto) => foto.isCover)?.id}
          onSetCover={(fotoId) => setCoverMutation.mutate({ itemId: expandedItemQuery.data.id, fotoId })}
          setCoverPending={setCoverMutation.isPending}
          onClose={() => setExpandedItemId(null)}
        />
      )}
    </AppShell>
  );
};
