import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  confirmarImportacaoGrupos,
  getImportacaoLote,
  patchImportacaoGrupos,
  agruparImportacaoLote
} from "../api/importacoes";
import type { ImportacaoGrupoDto } from "../api/importacoes";
import { useSessionStore } from "../store/session.store";
import { AppShell, Button, Section } from "../components/ui";

const gruposToPatchBody = (grupos: ImportacaoGrupoDto[]) => ({
  grupos: grupos.map((g) => ({
    fotoIds: g.fotos.map((f) => f.id)
  }))
});

export const ImportacaoGruposPage = () => {
  const { loteId } = useParams<{ loteId: string }>();
  const brechoId = useSessionStore((s) => s.brechoId);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [localGrupos, setLocalGrupos] = useState<ImportacaoGrupoDto[] | null>(null);

  const detailQuery = useQuery({
    queryKey: ["importacao", brechoId, loteId],
    queryFn: () => getImportacaoLote(brechoId, loteId!),
    enabled: Boolean(loteId)
  });

  useEffect(() => {
    if (detailQuery.data?.grupos) {
      setLocalGrupos(detailQuery.data.grupos);
    }
  }, [detailQuery.data]);

  const saveMutation = useMutation({
    mutationFn: async (grupos: ImportacaoGrupoDto[]) => {
      return patchImportacaoGrupos(brechoId, loteId!, gruposToPatchBody(grupos));
    },
    onSuccess: (data) => {
      setLocalGrupos(data.grupos);
      void queryClient.invalidateQueries({ queryKey: ["importacao", brechoId, loteId] });
    }
  });

  const confirmMutation = useMutation({
    mutationFn: () => confirmarImportacaoGrupos(brechoId, loteId!),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["importacao", brechoId, loteId] });
      navigate(`/importacoes/${loteId}/rascunhos`);
    }
  });

  const reagruparMutation = useMutation({
    mutationFn: () => agruparImportacaoLote(brechoId, loteId!),
    onSuccess: (data) => {
      setLocalGrupos(data.grupos);
      void queryClient.invalidateQueries({ queryKey: ["importacao", brechoId, loteId] });
    }
  });

  const grupos = localGrupos ?? detailQuery.data?.grupos ?? [];

  const moveFoto = (fotoId: string, fromG: number, toG: number) => {
    if (fromG === toG || !localGrupos) {
      return;
    }
    const next = localGrupos.map((g) => ({
      ...g,
      fotos: [...g.fotos]
    }));
    const from = next[fromG];
    const to = next[toG];
    if (!from || !to) {
      return;
    }
    from.fotos = from.fotos.filter((f) => f.id !== fotoId);
    const moved = localGrupos.flatMap((g) => g.fotos).find((f) => f.id === fotoId);
    if (!moved) {
      return;
    }
    to.fotos.push({ ...moved, ordemNoGrupo: to.fotos.length });
    next.forEach((g) => {
      g.fotos = g.fotos
        .sort((a, b) => a.ordemOriginal - b.ordemOriginal)
        .map((f, i) => ({ ...f, ordemNoGrupo: i }));
    });
    setLocalGrupos(next);
  };

  if (!loteId) {
    return null;
  }

  return (
    <AppShell showTopBar showBottomNav activeTab="estoque" topBarTitle="Grupos" fabLink="/items/new">
      <section>
        <h1 className="font-headline text-3xl font-extrabold tracking-tighter">Revisar grupos</h1>
        <p className="mt-1 text-sm text-on-surface-variant">
          Cada grupo deve ser uma peça. Mova fotos entre grupos se precisar, salve e confirme.
        </p>
      </section>

      {detailQuery.isLoading ? (
        <p className="text-sm">Carregando…</p>
      ) : grupos.length === 0 ? (
        <Section title="Sem grupos">
          <p className="mb-3 text-sm">Volte e envie fotos, ou rode a IA de novo.</p>
          <Link to={`/importacoes/${loteId}/criar`} className="font-bold text-primary underline">
            Voltar às fotos
          </Link>
        </Section>
      ) : (
        <>
          <div className="flex flex-wrap gap-2">
            <Button type="button" onClick={() => saveMutation.mutate(grupos)} disabled={saveMutation.isPending}>
              {saveMutation.isPending ? "Salvando…" : "Salvar grupos"}
            </Button>
            <Button
              type="button"
              className="!bg-[#5e2d86]"
              disabled={reagruparMutation.isPending}
              onClick={() => reagruparMutation.mutate()}
            >
              {reagruparMutation.isPending ? "Reorganizando…" : "Reorganizar com IA"}
            </Button>
            <Button
              type="button"
              className="!bg-[#006a39]"
              disabled={confirmMutation.isPending || saveMutation.isPending}
              onClick={() => confirmMutation.mutate()}
            >
              {confirmMutation.isPending ? "Confirmando…" : "Confirmar grupos e continuar"}
            </Button>
          </div>

          <div className="stack gap-4" style={{ marginTop: 16 }}>
            {grupos.map((g, gi) => (
              <Section key={g.id} title={`Grupo ${gi + 1} · fotos ${g.fotos.length}`}>
                {g.motivoRevisao ? <p className="mb-2 text-xs text-[#8a6d00]">{g.motivoRevisao}</p> : null}
                <div className="flex flex-wrap gap-2">
                  {g.fotos.map((f) => (
                    <div key={f.id} className="w-[100px]">
                      <img src={f.url} alt="" className="h-28 w-full rounded-lg object-cover" />
                      <label className="mt-1 block text-[10px] font-bold uppercase text-on-surface-variant">
                        Mover para
                      </label>
                      <select
                        className="mt-0.5 w-full rounded-lg border border-[#d9b9bc] bg-white px-1 py-1 text-[11px]"
                        value={gi}
                        onChange={(e) => moveFoto(f.id, gi, Number(e.target.value))}
                      >
                        {grupos.map((_, ti) => (
                          <option key={ti} value={ti}>
                            Grupo {ti + 1}
                          </option>
                        ))}
                      </select>
                    </div>
                  ))}
                </div>
              </Section>
            ))}
          </div>
        </>
      )}

      <p className="mt-6 text-center text-sm">
        <Link to="/importacoes" className="font-bold text-primary underline">
          Inbox
        </Link>
      </p>
    </AppShell>
  );
};
