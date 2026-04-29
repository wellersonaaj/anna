import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useParams } from "react-router-dom";
import { classificarImportacaoLote, getImportacaoLote } from "../api/importacoes";
import { useSessionStore } from "../store/session.store";
import { AppShell, Button, Section } from "../components/ui";

export const ImportacaoRascunhosPage = () => {
  const { loteId } = useParams<{ loteId: string }>();
  const brechoId = useSessionStore((s) => s.brechoId);
  const queryClient = useQueryClient();

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

  if (!loteId) {
    return null;
  }

  return (
    <AppShell showTopBar showBottomNav activeTab="estoque" topBarTitle="Rascunhos" fabLink="/items/new">
      <section>
        <h1 className="font-headline text-3xl font-extrabold tracking-tighter">Dados das peças</h1>
        <p className="mt-1 text-sm text-on-surface-variant">
          Gere sugestões com IA depois de confirmar os grupos. Revise cada rascunho e publique no estoque.
        </p>
      </section>

      {!todosGruposConfirmados ? (
        <p className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm">
          Confirme os grupos antes de classificar.{" "}
          <Link to={`/importacoes/${loteId}/grupos`} className="font-bold text-primary underline">
            Ir para grupos
          </Link>
        </p>
      ) : null}

      {todosGruposConfirmados && precisaClassificar ? (
        <Section title="Classificação com IA">
          <Button
            type="button"
            disabled={classificarMutation.isPending}
            onClick={() => classificarMutation.mutate()}
          >
            {classificarMutation.isPending ? "Classificando…" : "Preencher dados com IA (todos os grupos)"}
          </Button>
          {classificarMutation.data ? (
            <p className="mt-2 text-xs text-on-surface-variant">
              OK: {classificarMutation.data.ok} · Falhas: {classificarMutation.data.fail}
            </p>
          ) : null}
          {classificarMutation.isError ? (
            <p className="mt-2 text-sm text-rose-800">{(classificarMutation.error as Error).message}</p>
          ) : null}
        </Section>
      ) : null}

      <Section title="Rascunhos por grupo">
        {detailQuery.isLoading ? (
          <p className="text-sm">Carregando…</p>
        ) : (
          <ul className="space-y-2">
            {grupos.map((g, i) => (
              <li
                key={g.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-rose-100 bg-white p-3"
              >
                <div>
                  <p className="font-bold">Grupo {i + 1}</p>
                  <p className="text-xs text-on-surface-variant">
                    {g.rascunho?.status === "PUBLICADO"
                      ? "Publicado"
                      : g.rascunho?.status === "ERRO_CLASSIFICACAO"
                        ? "Erro na IA — tente classificar de novo"
                        : g.rascunho
                          ? "Rascunho pronto para revisar"
                          : "Aguardando classificação"}
                  </p>
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
            ))}
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
