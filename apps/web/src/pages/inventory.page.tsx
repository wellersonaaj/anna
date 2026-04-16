import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useId, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { Link } from "react-router-dom";
import { z } from "zod";
import { createItem, listAcervoSuggestions, listItems, type Item, type ItemCategoria } from "../api/items";
import { useSessionStore } from "../store/session.store";
import { AppShell, Button, Field, Input, Section, Select, StatusBadge } from "../components/ui";

const createItemFormSchema = z.object({
  nome: z.string().min(2),
  categoria: z.enum(["ROUPA_FEMININA", "ROUPA_MASCULINA", "CALCADO", "ACESSORIO"]),
  subcategoria: z.string().min(2),
  cor: z.string().min(2),
  estampa: z.boolean().default(false),
  condicao: z.enum(["OTIMO", "BOM", "REGULAR"]),
  tamanho: z.string().min(1),
  marca: z.string().optional(),
  precoVenda: z.coerce.number().optional(),
  acervoTipo: z.enum(["PROPRIO", "CONSIGNACAO"]),
  acervoNome: z.string().trim().min(2).max(80).optional().or(z.literal(""))
});

type CreateItemFormData = z.infer<typeof createItemFormSchema>;

export const InventoryPage = () => {
  const brechoId = useSessionStore((state) => state.brechoId);
  const acervoSuggestionsListId = useId();
  const queryClient = useQueryClient();
  const { register, handleSubmit, formState, reset, watch } = useForm<CreateItemFormData>({
    resolver: zodResolver(createItemFormSchema),
    defaultValues: {
      acervoTipo: "PROPRIO",
      categoria: "ROUPA_FEMININA",
      condicao: "OTIMO",
      estampa: false,
      acervoNome: ""
    }
  });

  const acervoTipo = watch("acervoTipo");
  const acervoNome = watch("acervoNome");

  const [filterStatus, setFilterStatus] = useState<"" | Item["status"]>("");
  const [filterCategoria, setFilterCategoria] = useState<"" | ItemCategoria>("");
  const [filterSearch, setFilterSearch] = useState("");

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

  const createItemMutation = useMutation({
    mutationFn: (data: CreateItemFormData) =>
      createItem(brechoId, {
        ...data,
        acervoNome: data.acervoNome?.trim() || undefined
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["items", brechoId] });
      await queryClient.invalidateQueries({ queryKey: ["acervo-suggestions", brechoId] });
      reset();
    }
  });

  const acervoSuggestionsQuery = useQuery({
    queryKey: ["acervo-suggestions", brechoId, acervoTipo, acervoNome],
    queryFn: () =>
      listAcervoSuggestions(brechoId, {
        q: acervoNome?.trim() || undefined,
        acervoTipo,
        limit: 8
      })
  });

  return (
    <AppShell>
      <header>
        <h1 style={{ marginBottom: 4 }}>Estoque</h1>
        <p style={{ marginTop: 0, opacity: 0.8 }}>Fluxos P0 com foco em cadastro e baixa rápida.</p>
      </header>

      <Section title="Cadastro rápido de peça">
        <form
          className="grid cols-2"
          onSubmit={handleSubmit((data) => createItemMutation.mutate(data))}
        >
          <Field label="Nome">
            <Input {...register("nome")} />
          </Field>
          <Field label="Categoria">
            <Select {...register("categoria")}>
              <option value="ROUPA_FEMININA">Roupa feminina</option>
              <option value="ROUPA_MASCULINA">Roupa masculina</option>
              <option value="CALCADO">Calçado</option>
              <option value="ACESSORIO">Acessório</option>
            </Select>
          </Field>
          <Field label="Subcategoria">
            <Input {...register("subcategoria")} />
          </Field>
          <Field label="Cor">
            <Input {...register("cor")} />
          </Field>
          <Field label="Tem estampa?">
            <input type="checkbox" {...register("estampa")} />
          </Field>
          <Field label="Condição">
            <Select {...register("condicao")}>
              <option value="OTIMO">Ótimo</option>
              <option value="BOM">Bom</option>
              <option value="REGULAR">Regular</option>
            </Select>
          </Field>
          <Field label="Tamanho">
            <Input {...register("tamanho")} />
          </Field>
          <Field label="Marca">
            <Input {...register("marca")} />
          </Field>
          <Field label="Preço venda">
            <Input type="number" step="0.01" {...register("precoVenda")} />
          </Field>
          <Field label="Acervo">
            <Select {...register("acervoTipo")}>
              <option value="PROPRIO">Próprio</option>
              <option value="CONSIGNACAO">Consignação</option>
            </Select>
          </Field>
          <Field label="Nome do acervo">
            <Input
              list={acervoSuggestionsListId}
              placeholder="Ex.: Acervo Verão 2026"
              {...register("acervoNome")}
            />
            <datalist id={acervoSuggestionsListId}>
              {acervoSuggestionsQuery.data?.map((suggestion) => (
                <option key={suggestion} value={suggestion} />
              ))}
            </datalist>
          </Field>
          <div className="stack" style={{ justifyContent: "end" }}>
            <Button type="submit" disabled={createItemMutation.isPending}>
              {createItemMutation.isPending ? "Salvando..." : "Cadastrar peça"}
            </Button>
          </div>
        </form>
        {formState.errors.root && <small>{formState.errors.root.message}</small>}
      </Section>

      <Section title="Itens cadastrados">
        <div className="grid cols-2" style={{ marginBottom: 16 }}>
          <Field label="Status">
            <Select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value as "" | Item["status"])}
            >
              <option value="">Todos</option>
              <option value="DISPONIVEL">Disponível</option>
              <option value="RESERVADO">Reservado</option>
              <option value="VENDIDO">Vendido</option>
              <option value="ENTREGUE">Entregue</option>
              <option value="INDISPONIVEL">Indisponível</option>
            </Select>
          </Field>
          <Field label="Categoria">
            <Select
              value={filterCategoria}
              onChange={(e) => setFilterCategoria(e.target.value as "" | ItemCategoria)}
            >
              <option value="">Todas</option>
              <option value="ROUPA_FEMININA">Roupa feminina</option>
              <option value="ROUPA_MASCULINA">Roupa masculina</option>
              <option value="CALCADO">Calçado</option>
              <option value="ACESSORIO">Acessório</option>
            </Select>
          </Field>
          <Field label="Busca (nome, subcategoria, marca, acervo)">
            <Input
              value={filterSearch}
              onChange={(e) => setFilterSearch(e.target.value)}
              placeholder="Digite para filtrar..."
            />
          </Field>
          <div className="stack" style={{ justifyContent: "end", alignItems: "stretch" }}>
            <Button
              type="button"
              onClick={() => {
                setFilterStatus("");
                setFilterCategoria("");
                setFilterSearch("");
              }}
            >
              Limpar filtros
            </Button>
          </div>
        </div>
        {itemsQuery.isLoading ? (
          <p>Carregando...</p>
        ) : (
          <div className="stack">
            {itemsQuery.data?.map((item) => (
              <article
                key={item.id}
                className="card"
                style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}
              >
                <div className="stack" style={{ gap: 6 }}>
                  <strong>{item.nome}</strong>
                  <small>
                    {item.categoria} - {item.subcategoria}
                  </small>
                  <StatusBadge status={item.status} />
                </div>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  <Link to={`/items/${item.id}`}>Fotos / fila</Link>
                  {item.status === "DISPONIVEL" && (
                    <Link
                      to={`/reserve/${item.id}`}
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "center",
                        height: 40,
                        padding: "0 14px",
                        borderRadius: 10,
                        background: "#b60e3d",
                        color: "#fff",
                        textDecoration: "none",
                        fontWeight: 600
                      }}
                    >
                      Reservar
                    </Link>
                  )}
                  {(item.status === "DISPONIVEL" || item.status === "RESERVADO") && (
                    <Link to={`/sell/${item.id}`}>Vender</Link>
                  )}
                </div>
              </article>
            ))}
          </div>
        )}
      </Section>

      <Link to="/deliveries">Ir para entregas pendentes</Link>
    </AppShell>
  );
};
