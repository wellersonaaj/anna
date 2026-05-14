import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { Link, useParams } from "react-router-dom";
import { z } from "zod";
import {
  addItemFoto,
  analisarItemFoto,
  deleteItemFoto,
  getItem,
  setItemCoverFoto,
  updateItem,
  updateItemStatus,
  type ItemCategoria,
  type ItemCondicao
} from "../api/items";
import { FotoAiSuggestionsCard } from "../components/foto-ai-suggestions";
import { ApiError } from "../api/client";
import { useSessionStore } from "../store/session.store";
import { AppShell, Button, Field, Input, ItemStatusTone, PhotoLightbox, Section, Select } from "../components/ui";
import { moneyInputValue, parseMoneyLike } from "../lib/money";

const fotoFormSchema = z.object({
  url: z.string().trim().url("Informe uma URL válida (http ou https).")
});

const editFormSchema = z.object({
  nome: z.string().trim().min(2, "Informe o nome."),
  categoria: z.enum(["ROUPA_FEMININA", "ROUPA_MASCULINA", "CALCADO", "ACESSORIO"]),
  subcategoria: z.string().trim().min(2, "Informe a subcategoria."),
  cor: z.string().trim().min(2, "Informe a cor."),
  estampa: z.boolean(),
  condicao: z.enum(["OTIMO", "BOM", "REGULAR"]),
  tamanho: z.string().trim().min(1, "Informe o tamanho."),
  marca: z.string().optional(),
  precoVenda: z.string().optional(),
  acervoTipo: z.enum(["PROPRIO", "CONSIGNACAO"]),
  acervoNome: z.string().optional()
});

type FotoFormData = z.infer<typeof fotoFormSchema>;
type EditFormData = z.infer<typeof editFormSchema>;

const categoriaLabels: Record<ItemCategoria, string> = {
  ROUPA_FEMININA: "Roupa feminina",
  ROUPA_MASCULINA: "Roupa masculina",
  CALCADO: "Calçado",
  ACESSORIO: "Acessório"
};

const condicaoLabels: Record<ItemCondicao, string> = {
  OTIMO: "Ótimo",
  BOM: "Bom",
  REGULAR: "Regular"
};

const parsePreco = (value: string | undefined): number | null => {
  const raw = value?.trim();
  if (!raw) {
    return null;
  }
  const parsed = parseMoneyLike(raw);
  return Number.isNaN(parsed) ? null : parsed;
};

const precoInputValue = (value: string | number | null | undefined) => {
  return moneyInputValue(value);
};

export const ItemDetailPage = () => {
  const { itemId } = useParams<{ itemId: string }>();
  const brechoId = useSessionStore((state) => state.brechoId);
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  const itemQuery = useQuery({
    queryKey: ["item", brechoId, itemId],
    queryFn: () => getItem(brechoId, itemId!),
    enabled: Boolean(itemId)
  });

  const fotoForm = useForm<FotoFormData>({
    resolver: zodResolver(fotoFormSchema),
    defaultValues: { url: "" }
  });

  const editForm = useForm<EditFormData>({
    resolver: zodResolver(editFormSchema),
    defaultValues: {
      nome: "",
      categoria: "ROUPA_FEMININA",
      subcategoria: "",
      cor: "",
      estampa: false,
      condicao: "BOM",
      tamanho: "",
      marca: "",
      precoVenda: "",
      acervoTipo: "PROPRIO",
      acervoNome: ""
    }
  });

  const item = itemQuery.data;
  const photos = useMemo(
    () =>
      (item?.fotos ?? []).map((foto) => ({
        id: foto.id,
        url: foto.url,
        thumbnailUrl: foto.thumbnailUrl ?? undefined,
        alt: `Foto da peça ${item?.nome ?? ""}`
      })),
    [item?.fotos, item?.nome]
  );
  const canQueue = item?.status === "DISPONIVEL" || item?.status === "RESERVADO";
  const canSell = item?.status === "DISPONIVEL" || item?.status === "RESERVADO";
  const coverPhotoId = item?.fotos?.find((foto) => foto.isCover)?.id ?? null;

  useEffect(() => {
    if (!item) {
      return;
    }
    editForm.reset({
      nome: item.nome,
      categoria: item.categoria,
      subcategoria: item.subcategoria,
      cor: item.cor,
      estampa: item.estampa,
      condicao: item.condicao,
      tamanho: item.tamanho,
      marca: item.marca ?? "",
      precoVenda: precoInputValue(item.precoVenda),
      acervoTipo: item.acervoTipo,
      acervoNome: item.acervoNome ?? ""
    });
  }, [editForm, item]);

  const invalidateItem = async () => {
    await queryClient.invalidateQueries({ queryKey: ["item", brechoId, itemId] });
    await queryClient.invalidateQueries({ queryKey: ["items", brechoId] });
  };

  const addFotoMutation = useMutation({
    mutationFn: (url: string) => addItemFoto(brechoId, itemId!, { url }),
    onSuccess: async () => {
      await invalidateItem();
      fotoForm.reset();
    }
  });

  const deleteFotoMutation = useMutation({
    mutationFn: (fotoId: string) => deleteItemFoto(brechoId, itemId!, fotoId),
    onSuccess: invalidateItem
  });

  const setCoverMutation = useMutation({
    mutationFn: (fotoId: string) => setItemCoverFoto(brechoId, itemId!, fotoId),
    onSuccess: invalidateItem
  });

  const analyzeFotoMutation = useMutation({
    mutationFn: (fotoId: string) => analisarItemFoto(brechoId, itemId!, fotoId),
    onSuccess: invalidateItem
  });

  const updateMutation = useMutation({
    mutationFn: (data: EditFormData) =>
      updateItem(brechoId, itemId!, {
        nome: data.nome,
        categoria: data.categoria,
        subcategoria: data.subcategoria,
        cor: data.cor,
        estampa: data.estampa,
        condicao: data.condicao,
        tamanho: data.tamanho,
        marca: data.marca ?? "",
        precoVenda: parsePreco(data.precoVenda),
        acervoTipo: data.acervoTipo,
        acervoNome: data.acervoNome?.trim() || null
      }),
    onSuccess: async () => {
      await invalidateItem();
      setEditing(false);
    }
  });

  const statusMutation = useMutation({
    mutationFn: (status: "DISPONIVEL" | "INDISPONIVEL") => updateItemStatus(brechoId, itemId!, status),
    onSuccess: invalidateItem
  });

  if (!itemId) {
    return (
      <AppShell>
        <p>Peça não encontrada.</p>
        <Link to="/">Voltar</Link>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <Link to="/">← Estoque</Link>
      {itemQuery.isLoading && <p>Carregando...</p>}
      {itemQuery.isError && <p>Não foi possível carregar a peça.</p>}
      {item && (
        <>
          <header className="rounded-3xl border border-rose-100 bg-white p-4 shadow-sm">
            <div className="flex items-start justify-between gap-3">
              <div>
                <ItemStatusTone status={item.status} />
                <h1 className="mt-2 font-headline text-3xl font-extrabold tracking-tight">{item.nome}</h1>
                <p className="mt-1 text-sm text-on-surface-variant">
                  {categoriaLabels[item.categoria]} · {item.subcategoria}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setEditing((value) => !value)}
                className="rounded-full border border-rose-100 bg-white px-3 py-2 text-sm font-bold text-primary"
                aria-label="Editar peça"
              >
                ✎
              </button>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              {canSell && (
                <Link
                  to={`/sell/${item.id}`}
                  className="inline-flex h-10 items-center rounded-xl bg-primary px-4 text-sm font-bold text-white"
                >
                  Vender
                </Link>
              )}
              {canQueue && (
                <Link
                  to={`/reserve/${item.id}`}
                  className="inline-flex h-10 items-center rounded-xl border border-primary px-4 text-sm font-bold text-primary"
                >
                  {item.status === "RESERVADO" ? "Adicionar à fila" : "Reservar"}
                </Link>
              )}
              {(item.status === "DISPONIVEL" || item.status === "RESERVADO") && (
                <Button
                  type="button"
                  className="bg-zinc-700"
                  disabled={statusMutation.isPending}
                  onClick={() => statusMutation.mutate("INDISPONIVEL")}
                >
                  Tornar indisponível
                </Button>
              )}
              {item.status === "INDISPONIVEL" && (
                <Button type="button" disabled={statusMutation.isPending} onClick={() => statusMutation.mutate("DISPONIVEL")}>
                  Tornar disponível
                </Button>
              )}
            </div>
          </header>

          <Section title="Cadastro da peça">
            {editing ? (
              <form
                className="grid gap-3 md:grid-cols-2"
                onSubmit={editForm.handleSubmit((data) => updateMutation.mutate(data))}
              >
                <Field label="Nome">
                  <Input {...editForm.register("nome")} />
                </Field>
                <Field label="Preço (R$)">
                  <Input type="number" step="0.01" min={0} {...editForm.register("precoVenda")} />
                </Field>
                <Field label="Categoria">
                  <Select {...editForm.register("categoria")}>
                    {Object.entries(categoriaLabels).map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </Select>
                </Field>
                <Field label="Subcategoria">
                  <Input {...editForm.register("subcategoria")} />
                </Field>
                <Field label="Cor">
                  <Input {...editForm.register("cor")} />
                </Field>
                <Field label="Tamanho">
                  <Input {...editForm.register("tamanho")} />
                </Field>
                <Field label="Condição">
                  <Select {...editForm.register("condicao")}>
                    {Object.entries(condicaoLabels).map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </Select>
                </Field>
                <Field label="Marca">
                  <Input {...editForm.register("marca")} />
                </Field>
                <Field label="Acervo">
                  <Select {...editForm.register("acervoTipo")}>
                    <option value="PROPRIO">Próprio</option>
                    <option value="CONSIGNACAO">Consignação</option>
                  </Select>
                </Field>
                <Field label="Nome do acervo/consignante">
                  <Input {...editForm.register("acervoNome")} />
                </Field>
                <label className="flex items-center gap-2 text-sm font-semibold text-on-surface-variant">
                  <input type="checkbox" {...editForm.register("estampa")} />
                  Peça estampada
                </label>
                <div className="flex gap-2 md:col-span-2">
                  <Button type="submit" disabled={updateMutation.isPending}>
                    {updateMutation.isPending ? "Salvando..." : "Salvar alterações"}
                  </Button>
                  <button
                    type="button"
                    className="rounded-xl border border-rose-100 px-4 text-sm font-bold text-on-surface-variant"
                    onClick={() => setEditing(false)}
                  >
                    Cancelar
                  </button>
                </div>
                {updateMutation.isError && (
                  <small className="text-primary md:col-span-2">
                    {updateMutation.error instanceof ApiError
                      ? updateMutation.error.message
                      : "Não foi possível salvar a peça."}
                  </small>
                )}
              </form>
            ) : (
              <dl className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <dt className="font-bold text-on-surface-variant">Preço</dt>
                  <dd>{item.precoVenda ? `R$ ${String(item.precoVenda).replace(".", ",")}` : "Preço a confirmar"}</dd>
                </div>
                <div>
                  <dt className="font-bold text-on-surface-variant">Condição</dt>
                  <dd>{condicaoLabels[item.condicao]}</dd>
                </div>
                <div>
                  <dt className="font-bold text-on-surface-variant">Cor</dt>
                  <dd>{item.cor}</dd>
                </div>
                <div>
                  <dt className="font-bold text-on-surface-variant">Tamanho</dt>
                  <dd>{item.tamanho}</dd>
                </div>
                <div>
                  <dt className="font-bold text-on-surface-variant">Marca</dt>
                  <dd>{item.marca || "Sem marca"}</dd>
                </div>
                <div>
                  <dt className="font-bold text-on-surface-variant">Estampa</dt>
                  <dd>{item.estampa ? "Sim" : "Não"}</dd>
                </div>
                <div>
                  <dt className="font-bold text-on-surface-variant">Acervo</dt>
                  <dd>{item.acervoTipo === "CONSIGNACAO" ? "Consignação" : "Próprio"}</dd>
                </div>
                <div>
                  <dt className="font-bold text-on-surface-variant">Nome do acervo</dt>
                  <dd>{item.acervoNome || "Não informado"}</dd>
                </div>
              </dl>
            )}
          </Section>

          <Section title="Fotos">
            <p className="mt-0 text-sm text-on-surface-variant">
              <Link to={`/items/${item.id}/fotos/upload`}>Enviar fotos (câmera, galeria, nota em texto ou voz)</Link>
              {" · "}
              Ou cole uma URL pública abaixo.
            </p>
            <form
              className="stack"
              style={{ gap: 12, marginBottom: 16 }}
              onSubmit={fotoForm.handleSubmit((data) => addFotoMutation.mutate(data.url))}
            >
              <Field label="URL da imagem">
                <Input {...fotoForm.register("url")} placeholder="https://..." />
              </Field>
              {fotoForm.formState.errors.url && (
                <small style={{ color: "#b60e3d" }}>{fotoForm.formState.errors.url.message}</small>
              )}
              <Button type="submit" disabled={addFotoMutation.isPending}>
                {addFotoMutation.isPending ? "Adicionando..." : "Adicionar foto"}
              </Button>
              {addFotoMutation.isError && (
                <small style={{ color: "#b60e3d" }}>
                  {addFotoMutation.error instanceof ApiError
                    ? addFotoMutation.error.message
                    : "Não foi possível adicionar a foto."}
                </small>
              )}
            </form>
            <div className="grid gap-3">
              {(item.fotos ?? []).length === 0 ? (
                <p style={{ opacity: 0.8 }}>Nenhuma foto ainda.</p>
              ) : (
                (item.fotos ?? []).map((foto, index) => {
                  const latestAi = foto.aiAnalyses?.[0];
                  return (
                    <div key={foto.id} className="rounded-2xl border border-rose-100 bg-white p-3">
                      <div className="flex items-center gap-3">
                        <div className="relative">
                          <button
                            type="button"
                            onClick={() => setLightboxIndex(index)}
                            className="cursor-zoom-in overflow-hidden rounded-xl p-0"
                            aria-label="Ampliar foto"
                          >
                            <img
                              src={foto.thumbnailUrl ?? foto.url}
                              alt={`Foto da peça ${item.nome}`}
                              className="h-24 w-24 object-cover"
                            />
                          </button>
                          {foto.isCover && (
                            <span className="absolute left-1 top-1 rounded-full bg-white/90 px-2 py-0.5 text-[10px] font-bold text-primary shadow-sm">
                              Capa
                            </span>
                          )}
                        </div>
                        <div className="min-w-0 flex-1 text-sm">
                          <a href={foto.url} target="_blank" rel="noreferrer">
                            Abrir original
                          </a>
                          <div className="text-on-surface-variant">Ordem {foto.ordem}</div>
                          {!foto.isCover && (
                            <button
                              type="button"
                              className="mt-1 text-xs font-bold text-primary underline disabled:opacity-60"
                              disabled={setCoverMutation.isPending}
                              onClick={() => setCoverMutation.mutate(foto.id)}
                            >
                              Definir como capa
                            </button>
                          )}
                        </div>
                        <div className="flex flex-col gap-2">
                          {!latestAi && (
                            <Button
                              type="button"
                              onClick={() => analyzeFotoMutation.mutate(foto.id)}
                              disabled={analyzeFotoMutation.isPending}
                            >
                              {analyzeFotoMutation.isPending && analyzeFotoMutation.variables === foto.id
                                ? "Analisando..."
                                : "Sugerir com IA"}
                            </Button>
                          )}
                          <Button
                            type="button"
                            className="bg-zinc-700"
                            onClick={() => deleteFotoMutation.mutate(foto.id)}
                            disabled={deleteFotoMutation.isPending}
                          >
                            Remover
                          </Button>
                        </div>
                      </div>
                      {analyzeFotoMutation.isError && analyzeFotoMutation.variables === foto.id && (
                        <small style={{ color: "#b60e3d" }}>
                          {analyzeFotoMutation.error instanceof ApiError
                            ? analyzeFotoMutation.error.message
                            : "Não foi possível analisar a foto."}
                        </small>
                      )}
                      {latestAi && <FotoAiSuggestionsCard analysis={latestAi} />}
                    </div>
                  );
                })
              )}
            </div>
          </Section>

        </>
      )}
      {lightboxIndex !== null && photos.length > 0 && (
        <PhotoLightbox
          photos={photos}
          initialIndex={lightboxIndex}
          title={item?.nome ?? "Fotos da peça"}
          coverPhotoId={coverPhotoId}
          onSetCover={(photoId) => setCoverMutation.mutate(photoId)}
          setCoverPending={setCoverMutation.isPending}
          onClose={() => setLightboxIndex(null)}
        />
      )}
    </AppShell>
  );
};
