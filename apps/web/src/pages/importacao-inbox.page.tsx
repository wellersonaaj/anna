import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { cancelarImportacaoLote, listImportacaoLotes } from "../api/importacoes";
import { useSessionStore } from "../store/session.store";
import { AppShell, Button, Section } from "../components/ui";

const statusLabel: Record<string, string> = {
  RECEBENDO_FOTOS: "Enviando fotos",
  AGRUPANDO: "Organizando…",
  REVISAR_GRUPOS: "Revisar grupos",
  CLASSIFICANDO: "Classificando…",
  REVISAR_DADOS: "Revisar dados",
  CONCLUIDO: "Concluído",
  ERRO: "Erro",
  ABANDONADO: "Abandonado"
};

export const ImportacaoInboxPage = () => {
  const brechoId = useSessionStore((s) => s.brechoId);
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: ["importacoes", brechoId],
    queryFn: () => listImportacaoLotes(brechoId)
  });
  const cancelarMutation = useMutation({
    mutationFn: (loteId: string) => cancelarImportacaoLote(brechoId, loteId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["importacoes", brechoId] });
      void queryClient.invalidateQueries({ queryKey: ["importacoes-pendentes", brechoId] });
    }
  });
  const lotesVisiveis =
    query.data?.filter((l) => l.status !== "ABANDONADO" && !(l.status === "RECEBENDO_FOTOS" && l.totalFotos === 0)) ??
    [];

  return (
    <AppShell
      showTopBar
      showBottomNav
      activeTab="estoque"
      topBarTitle="Importações"
      fabLink="/items/new"
    >
      <section className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-headline text-4xl font-extrabold tracking-tighter">Importações</h1>
          <p className="mt-1 text-sm text-on-surface-variant">Lotes com várias peças — fora do estoque até publicar.</p>
        </div>
        <Link to="/importacoes/criar">
          <Button type="button">Nova importação</Button>
        </Link>
      </section>

      <Section title="Seus lotes">
        {query.isLoading ? (
          <p className="text-sm">Carregando…</p>
        ) : lotesVisiveis.length ? (
          <ul className="space-y-3">
            {lotesVisiveis.map((l) => (
              <li
                key={l.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-rose-100 bg-white p-3"
              >
                <div>
                  <p className="font-bold text-on-background">
                    {new Date(l.criadoEm).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })}
                  </p>
                  <p className="text-xs text-on-surface-variant">
                    {statusLabel[l.status] ?? l.status} · {l.totalFotos} fotos · {l.totalGrupos} grupos
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {l.status === "RECEBENDO_FOTOS" || l.status === "AGRUPANDO" ? (
                    <Link to={`/importacoes/${l.id}/criar`} className="text-xs font-bold text-primary underline">
                      Continuar fotos
                    </Link>
                  ) : null}
                  {l.status === "REVISAR_GRUPOS" ? (
                    <Link to={`/importacoes/${l.id}/grupos`} className="text-xs font-bold text-primary underline">
                      Revisar grupos
                    </Link>
                  ) : null}
                  {(l.status === "REVISAR_DADOS" || l.status === "CLASSIFICANDO" || l.status === "ERRO") && (
                    <Link to={`/importacoes/${l.id}/rascunhos`} className="text-xs font-bold text-primary underline">
                      Rascunhos
                    </Link>
                  )}
                  {l.status === "CONCLUIDO" ? (
                    <span className="text-xs font-bold text-[#006a39]">Publicado</span>
                  ) : null}
                  {l.status !== "CONCLUIDO" ? (
                    <button
                      type="button"
                      className="text-xs font-bold text-primary underline disabled:opacity-60"
                      disabled={cancelarMutation.isPending}
                      onClick={() => {
                        if (window.confirm("Cancelar esta importação? Ela sairá da lista.")) {
                          cancelarMutation.mutate(l.id);
                        }
                      }}
                    >
                      Cancelar
                    </button>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-on-surface-variant">Nenhuma importação ainda.</p>
        )}
      </Section>

      <p className="text-center text-sm">
        <Link to="/" className="font-bold text-primary underline">
          Voltar ao estoque
        </Link>
      </p>
    </AppShell>
  );
};
