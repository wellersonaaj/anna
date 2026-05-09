import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { getImportacaoLote, patchImportacaoRascunho, publicarImportacaoRascunho } from "../api/importacoes";
import { listAcervoSuggestions, type ItemCategoria } from "../api/items";
import { useSessionStore } from "../store/session.store";
import { AppShell, Button, Field, Input, Section, Select } from "../components/ui";

type FormValues = {
  nome: string;
  categoria: ItemCategoria;
  subcategoria: string;
  cor: string;
  estampa: boolean;
  condicao: "OTIMO" | "BOM" | "REGULAR";
  tamanho: string;
  marca: string;
  precoVenda: string;
  acervoTipo: "PROPRIO" | "CONSIGNACAO";
  acervoNome: string;
};

const emptyForm: FormValues = {
  nome: "",
  categoria: "ROUPA_FEMININA",
  subcategoria: "",
  cor: "",
  estampa: false,
  condicao: "OTIMO",
  tamanho: "",
  marca: "",
  precoVenda: "",
  acervoTipo: "PROPRIO",
  acervoNome: ""
};

const formValuesForApi = (f: FormValues) => ({
  ...f,
  precoVenda: f.precoVenda.trim() ? Number(f.precoVenda.replace(",", ".")) : undefined,
  marca: f.marca.trim() || undefined,
  acervoNome: f.acervoNome.trim() || undefined
});

export const ImportacaoRascunhoDetailPage = () => {
  const { loteId, rascunhoId } = useParams<{ loteId: string; rascunhoId: string }>();
  const brechoId = useSessionStore((s) => s.brechoId);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const acervoSuggestionsListId = useId();
  const [form, setForm] = useState<FormValues>(emptyForm);
  const userEditedRef = useRef(false);
  const prevRascunhoIdRef = useRef<string | undefined>(undefined);

  useEffect(() => {
    if (rascunhoId !== prevRascunhoIdRef.current) {
      prevRascunhoIdRef.current = rascunhoId;
      userEditedRef.current = false;
    }
  }, [rascunhoId]);

  const setFormFromUser = (updater: FormValues | ((prev: FormValues) => FormValues)) => {
    userEditedRef.current = true;
    setForm(updater);
  };

  const detailQuery = useQuery({
    queryKey: ["importacao", brechoId, loteId],
    queryFn: () => getImportacaoLote(brechoId, loteId!),
    enabled: Boolean(loteId)
  });

  const rascunhoEntry = detailQuery.data?.grupos
    .map((grupo) => (grupo.rascunho ? { grupo, rascunho: grupo.rascunho } : null))
    .find((x) => x !== null && x.rascunho.id === rascunhoId);

  const loteAcervoSuggestion = useMemo(() => {
    if (!detailQuery.data?.grupos || !rascunhoId) {
      return null;
    }

    const currentIndex = detailQuery.data.grupos.findIndex((grupo) => grupo.rascunho?.id === rascunhoId);
    const acervosDoLote = detailQuery.data.grupos
      .map((grupo, index) => {
        if (grupo.rascunho?.id === rascunhoId) {
          return null;
        }

        const raw = grupo.rascunho?.formValues as Record<string, unknown> | undefined;
        const acervoNome = typeof raw?.acervoNome === "string" ? raw.acervoNome.trim() : "";
        if (!acervoNome) {
          return null;
        }

        return {
          index,
          acervoNome,
          acervoTipo: raw?.acervoTipo === "CONSIGNACAO" ? "CONSIGNACAO" : "PROPRIO"
        };
      })
      .filter((entry): entry is { index: number; acervoNome: string; acervoTipo: FormValues["acervoTipo"] } =>
        Boolean(entry)
      );

    const previousAcervos = acervosDoLote.filter((entry) => currentIndex === -1 || entry.index < currentIndex);
    return previousAcervos[previousAcervos.length - 1] ?? acervosDoLote[acervosDoLote.length - 1] ?? null;
  }, [detailQuery.data?.grupos, rascunhoId]);

  const acervoSuggestionsQuery = useQuery({
    queryKey: ["acervo-suggestions", brechoId, form.acervoTipo, form.acervoNome],
    queryFn: () =>
      listAcervoSuggestions(brechoId, {
        q: form.acervoNome.trim() || undefined,
        acervoTipo: form.acervoTipo,
        limit: 8
      })
  });

  useEffect(() => {
    const raw = rascunhoEntry?.rascunho.formValues as Record<string, unknown> | undefined;
    if (!raw) {
      return;
    }
    if (userEditedRef.current) {
      return;
    }
    const rawAcervoNome = typeof raw.acervoNome === "string" ? raw.acervoNome : "";
    const rawAcervoTipo = raw.acervoTipo === "CONSIGNACAO" ? "CONSIGNACAO" : "PROPRIO";
    const suggestedAcervo = rawAcervoNome.trim() ? null : loteAcervoSuggestion;

    setForm({
      nome: String(raw.nome ?? ""),
      categoria: (raw.categoria as ItemCategoria) ?? "ROUPA_FEMININA",
      subcategoria: String(raw.subcategoria ?? ""),
      cor: String(raw.cor ?? ""),
      estampa: Boolean(raw.estampa),
      condicao: (raw.condicao as FormValues["condicao"]) ?? "OTIMO",
      tamanho: String(raw.tamanho ?? ""),
      marca: String(raw.marca ?? ""),
      precoVenda: raw.precoVenda != null ? String(raw.precoVenda) : "",
      acervoTipo: suggestedAcervo?.acervoTipo ?? rawAcervoTipo,
      acervoNome: rawAcervoNome || suggestedAcervo?.acervoNome || ""
    });
  }, [loteAcervoSuggestion, rascunhoEntry?.rascunho.formValues, rascunhoEntry?.rascunho.id]);

  const saveMutation = useMutation({
    mutationFn: () =>
      patchImportacaoRascunho(brechoId, loteId!, rascunhoId!, {
        formValues: formValuesForApi(form)
      }),
    onSuccess: () => {
      userEditedRef.current = false;
      void queryClient.invalidateQueries({ queryKey: ["importacao", brechoId, loteId] });
    }
  });

  const pubMutation = useMutation({
    mutationFn: () =>
      publicarImportacaoRascunho(brechoId, loteId!, rascunhoId!, {
        helpfulness: "SIM",
        formValues: formValuesForApi(form)
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["importacao", brechoId, loteId] });
      void queryClient.invalidateQueries({ queryKey: ["items", brechoId] });
      void navigate(`/importacoes/${loteId}/rascunhos`);
    }
  });

  if (!loteId || !rascunhoId) {
    return null;
  }

  return (
    <AppShell showTopBar showBottomNav activeTab="estoque" topBarTitle="Revisar peça" fabLink="/items/new">
      <section>
        <h1 className="font-headline text-3xl font-extrabold tracking-tighter">Revisar dados</h1>
        <p className="mt-1 text-sm text-on-surface-variant">Ajuste os campos e publique no estoque.</p>
      </section>

      {rascunhoEntry ? (
        <div className="mb-4 flex flex-wrap gap-2">
          {rascunhoEntry.grupo.fotos.map((f) => (
            <img key={f.id} src={f.url} alt="" className="h-24 w-20 rounded-lg object-cover" />
          ))}
        </div>
      ) : detailQuery.isLoading ? (
        <p className="text-sm">Carregando…</p>
      ) : (
        <p className="text-sm text-rose-800">Rascunho não encontrado.</p>
      )}

      {rascunhoEntry?.rascunho.status === "PUBLICADO" ? (
        <p>
          Já publicado.{" "}
          <Link to={`/items/${rascunhoEntry.rascunho.pecaId}`} className="font-bold text-primary underline">
            Abrir peça
          </Link>
        </p>
      ) : (
        <Section title="Campos">
          <div className="flex flex-col gap-3">
            <Field label="Nome">
              <Input value={form.nome} onChange={(e) => setFormFromUser((f) => ({ ...f, nome: e.target.value }))} />
            </Field>
            <Field label="Categoria">
              <Select
                value={form.categoria}
                onChange={(e) => setFormFromUser((f) => ({ ...f, categoria: e.target.value as ItemCategoria }))}
              >
                <option value="ROUPA_FEMININA">Roupa feminina</option>
                <option value="ROUPA_MASCULINA">Roupa masculina</option>
                <option value="CALCADO">Calçado</option>
                <option value="ACESSORIO">Acessório</option>
              </Select>
            </Field>
            <Field label="Subcategoria">
              <Input
                value={form.subcategoria}
                onChange={(e) => setFormFromUser((f) => ({ ...f, subcategoria: e.target.value }))}
              />
            </Field>
            <Field label="Cor">
              <Input value={form.cor} onChange={(e) => setFormFromUser((f) => ({ ...f, cor: e.target.value }))} />
            </Field>
            <Field label="Estampa">
              <input
                type="checkbox"
                checked={form.estampa}
                onChange={(e) => setFormFromUser((f) => ({ ...f, estampa: e.target.checked }))}
              />
            </Field>
            <Field label="Condição">
              <Select
                value={form.condicao}
                onChange={(e) => setFormFromUser((f) => ({ ...f, condicao: e.target.value as FormValues["condicao"] }))}
              >
                <option value="OTIMO">Ótimo</option>
                <option value="BOM">Bom</option>
                <option value="REGULAR">Regular</option>
              </Select>
            </Field>
            <Field label="Tamanho">
              <Input
                value={form.tamanho}
                onChange={(e) => setFormFromUser((f) => ({ ...f, tamanho: e.target.value }))}
              />
            </Field>
            <Field label="Marca">
              <Input value={form.marca} onChange={(e) => setFormFromUser((f) => ({ ...f, marca: e.target.value }))} />
            </Field>
            <Field label="Preço venda (opcional)">
              <Input
                value={form.precoVenda}
                onChange={(e) => setFormFromUser((f) => ({ ...f, precoVenda: e.target.value }))}
              />
            </Field>
            <Field label="Acervo">
              <Select
                value={form.acervoTipo}
                onChange={(e) =>
                  setFormFromUser((f) => ({ ...f, acervoTipo: e.target.value as FormValues["acervoTipo"] }))
                }
              >
                <option value="PROPRIO">Próprio</option>
                <option value="CONSIGNACAO">Consignação</option>
              </Select>
            </Field>
            <Field label="Nome do acervo (opcional)">
              <Input
                list={acervoSuggestionsListId}
                value={form.acervoNome}
                onChange={(e) => setFormFromUser((f) => ({ ...f, acervoNome: e.target.value }))}
              />
              <datalist id={acervoSuggestionsListId}>
                {acervoSuggestionsQuery.data?.map((suggestion) => (
                  <option key={suggestion} value={suggestion} />
                ))}
              </datalist>
            </Field>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <Button type="button" disabled={saveMutation.isPending || pubMutation.isPending} onClick={() => saveMutation.mutate()}>
              {saveMutation.isPending ? "Salvando…" : "Salvar rascunho"}
            </Button>
            <Button
              type="button"
              className="!bg-[#006a39]"
              disabled={pubMutation.isPending || saveMutation.isPending}
              onClick={() => pubMutation.mutate()}
            >
              {pubMutation.isPending ? "Publicando…" : "Publicar e revisar próxima"}
            </Button>
          </div>
          {pubMutation.isError ? (
            <p className="mt-2 text-sm text-rose-800">{(pubMutation.error as Error).message}</p>
          ) : null}
        </Section>
      )}

      <p className="mt-6 text-center text-sm">
        <Link to={`/importacoes/${loteId}/rascunhos`} className="font-bold text-primary underline">
          Voltar à lista
        </Link>
      </p>
    </AppShell>
  );
};
