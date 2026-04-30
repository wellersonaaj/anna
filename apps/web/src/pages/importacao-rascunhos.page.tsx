import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef } from "react";
import { Link, useParams } from "react-router-dom";
import { classificarImportacaoLote, getImportacaoLote } from "../api/importacoes";
import { useSessionStore } from "../store/session.store";
import { AppShell, Button, Section } from "../components/ui";

const nomeSugeridoFromFormValues = (formValues: unknown): string | null => {
  if (!formValues || typeof formValues !== "object") {
    return null;
  }

  const nome = (formValues as { nome?: unknown }).nome;
  return typeof nome === "string" && nome.trim() ? nome.trim() : null;
};

export const ImportacaoRascunhosPage = () => {
  const { loteId } = useParams<{ loteId: string }>();
  const brechoId = useSessionStore((s) => s.brechoId);
  const queryClient = useQueryClient();
  const autoClassificacaoLoteRef = useRef<string | null>(null);

  const detailQuery = useQuery({
    queryKey: ["importacao", brechoId, loteId],
    queryFn: () => getImportacaoLote(brechoId, loteId!),
    enabled: Boolean(loteId)
  });

  const classificarMutation = useMutation({
    mutationFn: () => classificarImportacaoLote(brechoId, loteId!),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["importacao", brechoId, loteId] });
      void queryClient.invalidateQueries({ queryKey: ["importacoes", brechoId] });
    }
  });
  const {
    data: classificarData,
    error: classificarError,
    isError: classificarIsError,
    isPending: classificarIsPending,
    mutate: classificar
  } = classificarMutation;

  const grupos = detailQuery.data?.grupos ?? [];
  const todosGruposConfirmados = grupos.length > 0 && grupos.every((g) => g.status === "CONFIRMADO");
  const precisaClassificar =
    todosGruposConfirmados &&
    grupos.some(
      (g) =>
        !g.rascunho ||
        !g.rascunho.draftAnalysisId ||
        g.rascunho.status === "ERRO_CLASSIFICACAO"
    );

  useEffect(() => {
    if (!loteId || !precisaClassificar || classificarIsPending) {
      return;
    }
    if (autoClassificacaoLoteRef.current === loteId) {
      return;
    }

    autoClassificacaoLoteRef.current = loteId;
    classificar();
  }, [classificar, classificarIsPending, loteId, precisaClassificar]);

  if (!loteId) {
    return null;
  }

  return (
    <AppShell showTopBar showBottomNav activeTab="estoque" topBarTitle="Peças" fabLink="/items/new">
      <section>
        <h1 className="font-headline text-3xl font-extrabold tracking-tighter">Dados das peças</h1>
        <p className="mt-1 text-sm text-on-surface-variant">
          A IA preenche os dados automaticamente depois que as peças são confirmadas. Revise cada rascunho e publique no estoque.
        </p>
      </section>

      {!todosGruposConfirmados ? (
        <p className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm">
          Confirme as peças antes de gerar os dados.{" "}
          <Link to={`/importacoes/${loteId}/grupos`} className="font-bold text-primary underline">
            Ir para peças
          </Link>
        </p>
      ) : null}

      {todosGruposConfirmados && (precisaClassificar || classificarIsPending || classificarIsError) ? (
        <Section title="Análise com IA">
          {classificarIsPending ? (
            <p className="text-sm font-semibold text-on-surface-variant">Analisando peças com IA...</p>
          ) : precisaClassificar && !classificarIsError ? (
            <p className="text-sm font-semibold text-on-surface-variant">Preparando análise das peças...</p>
          ) : null}
          {classificarData ? (
            <p className="mt-2 text-xs text-on-surface-variant">
              OK: {classificarData.ok} · Falhas: {classificarData.fail}
            </p>
          ) : null}
          {classificarIsError ? (
            <>
              <p className="mt-2 text-sm text-rose-800">{(classificarError as Error).message}</p>
              <Button type="button" className="mt-3" onClick={() => classificar()}>
                Tentar novamente
              </Button>
            </>
          ) : null}
        </Section>
      ) : null}

      <Section title="Peças para revisar">
        {detailQuery.isLoading ? (
          <p className="text-sm">Carregando…</p>
        ) : (
          <ul className="space-y-2">
            {grupos.map((g, i) => {
              const fotoPrincipal = g.fotos[0];
              const nomeSugerido = nomeSugeridoFromFormValues(g.rascunho?.formValues);
              const titulo = nomeSugerido ?? `Peça ${i + 1}`;

              return (
                <li
                  key={g.id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-rose-100 bg-white p-3"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    {fotoPrincipal ? (
                      <img
                        src={fotoPrincipal.thumbnailUrl ?? fotoPrincipal.url}
                        alt=""
                        loading="lazy"
                        width={56}
                        height={56}
                        className="h-14 w-14 shrink-0 rounded-lg object-cover"
                      />
                    ) : (
                      <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-lg bg-surface-container-low text-[10px] font-bold text-outline">
                        Sem foto
                      </div>
                    )}
                    <div className="min-w-0">
                      <p className="truncate font-bold">{titulo}</p>
                      <p className="text-xs text-on-surface-variant">
                        {g.rascunho?.status === "PUBLICADO"
                          ? "Publicado"
                          : g.rascunho?.status === "ERRO_CLASSIFICACAO"
                            ? "Erro na IA - tente novamente"
                            : g.rascunho
                              ? "Rascunho pronto para revisar"
                              : classificarIsPending
                                ? "Analisando peça..."
                                : "Aguardando análise"}
                      </p>
                    </div>
                  </div>
                  {g.rascunho && g.rascunho.status === "RASCUNHO" ? (
                    <Link
                      to={`/importacoes/${loteId}/rascunhos/${g.rascunho.id}`}
                      className="text-sm font-bold text-primary underline"
                    >
                      Revisar
                    </Link>
                  ) : g.rascunho?.status === "PUBLICADO" && g.rascunho.pecaId ? (
                    <Link to={`/items/${g.rascunho.pecaId}`} className="text-sm font-bold text-primary underline">
                      Abrir peça
                    </Link>
                  ) : null}
                </li>
              );
            })}
          </ul>
        )}
      </Section>

      <p className="text-center text-sm">
        <Link to="/importacoes" className="font-bold text-primary underline">
          Inbox
        </Link>
      </p>
    </AppShell>
  );
};
