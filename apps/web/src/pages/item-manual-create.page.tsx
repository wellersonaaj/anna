import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useId } from "react";
import { useForm } from "react-hook-form";
import { Link, useNavigate } from "react-router-dom";
import { z } from "zod";
import { createItem, listAcervoSuggestions } from "../api/items";
import { AppShell, Button, Field, Input, Section, Select } from "../components/ui";
import { useSessionStore } from "../store/session.store";

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

export const ItemManualCreatePage = () => {
  const brechoId = useSessionStore((state) => state.brechoId);
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const acervoSuggestionsListId = useId();
  const { register, handleSubmit, formState, watch } = useForm<CreateItemFormData>({
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

  const acervoSuggestionsQuery = useQuery({
    queryKey: ["acervo-suggestions", brechoId, acervoTipo, acervoNome],
    queryFn: () =>
      listAcervoSuggestions(brechoId, {
        q: acervoNome?.trim() || undefined,
        acervoTipo,
        limit: 8
      })
  });

  const createItemMutation = useMutation({
    mutationFn: (data: CreateItemFormData) =>
      createItem(brechoId, {
        ...data,
        acervoNome: data.acervoNome?.trim() || undefined
      }),
    onSuccess: async (created) => {
      await queryClient.invalidateQueries({ queryKey: ["items", brechoId] });
      navigate(`/items/${created.id}`);
    }
  });

  return (
    <AppShell>
      <Link to="/items/new" className="text-sm font-semibold text-on-surface-variant">
        ← Voltar para cadastro com IA
      </Link>
      <header>
        <h1 className="mb-1 font-headline text-3xl font-extrabold tracking-tight">Cadastro manual</h1>
        <p className="mt-0 text-sm text-on-surface-variant">
          Preencha os campos essenciais quando não quiser usar análise automática.
        </p>
      </header>

      <Section title="Dados da peça">
        <form className="grid cols-2" onSubmit={handleSubmit((data) => createItemMutation.mutate(data))}>
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
            <Input list={acervoSuggestionsListId} placeholder="Ex.: Acervo Verão 2026" {...register("acervoNome")} />
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
    </AppShell>
  );
};
