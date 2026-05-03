import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { countImportacoesPendentes } from "../api/importacoes";
import { getItem, listItems, setItemCoverFoto, type Item, type ItemCategoria } from "../api/items";
import { useSessionStore } from "../store/session.store";
import { AppShell, Input, PhotoLightbox, PillButton, ProductCard, formatCurrency } from "../components/ui";

export const InventoryPage = () => {
  const brechoId = useSessionStore((state) => state.brechoId);
  const queryClient = useQueryClient();
  const [filterStatus, setFilterStatus] = useState<"" | Item["status"]>("");
  const [filterCategoria, setFilterCategoria] = useState<"" | ItemCategoria>("");
  const [filterSearch, setFilterSearch] = useState("");
  const [expandedItemId, setExpandedItemId] = useState<string | null>(null);

  const listFilters = useMemo(
    () => ({
      ...(filterStatus ? { status: filterStatus } : {}),
      ...(filterCategoria ? { categoria: filterCategoria } : {}),
      ...(filterSearch.trim() ? { search: filterSearch.trim() } : {})
    }),
    [filterStatus, filterCategoria, filterSearch]
  );

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

  const statusFilters: Array<{ key: "" | Item["status"]; label: string }> = [
    { key: "", label: "Todos" },
    { key: "DISPONIVEL", label: "Disponível" },
    { key: "RESERVADO", label: "Reservado" },
    { key: "INDISPONIVEL", label: "Indisponível" }
  ];

  const categoryFilters: Array<{ key: "" | ItemCategoria; label: string }> = [
    { key: "", label: "Todas" },
    { key: "ROUPA_FEMININA", label: "Roupas femininas" },
    { key: "ROUPA_MASCULINA", label: "Roupas masculinas" },
    { key: "CALCADO", label: "Calçados" },
    { key: "ACESSORIO", label: "Acessórios" }
  ];

  return (
    <AppShell
      showTopBar
      showBottomNav
      activeTab="estoque"
      topBarTitle="Agente Brechó"
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
          <div className="no-scrollbar flex gap-2 overflow-x-auto">
            {statusFilters.map((statusFilter) => (
              <PillButton
                key={statusFilter.label}
                active={filterStatus === statusFilter.key}
                onClick={() => setFilterStatus(statusFilter.key)}
              >
                {statusFilter.label}
              </PillButton>
            ))}
          </div>
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
      </div>

      {itemsQuery.isLoading ? (
        <p>Carregando...</p>
      ) : itemsQuery.data?.length ? (
        <div className="grid grid-cols-2 gap-x-4 gap-y-8">
          {itemsQuery.data.map((item) => (
            <div key={item.id}>
              <ProductCard
                item={item}
                subtitle={`${item.categoria.replaceAll("_", " ")} / ${item.subcategoria}`}
                priceLabel={formatCurrency(item.precoVenda)}
                onImageClick={
                  (item.fotoCapaThumbnailUrl ?? item.fotoCapaUrl)
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
      ) : (
        <p className="rounded-2xl border border-rose-100 bg-white p-4 text-sm text-on-surface-variant">
          Nenhuma peça encontrada com os filtros atuais.
        </p>
      )}
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
