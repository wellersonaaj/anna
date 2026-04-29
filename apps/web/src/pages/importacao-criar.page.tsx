import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  agruparImportacaoLote,
  createImportacaoLote,
  getImportacaoLote,
  presignImportFoto,
  putToPresignedUrl,
  registerImportFoto
} from "../api/importacoes";
import { useSessionStore } from "../store/session.store";
import { AppShell, Button, Section } from "../components/ui";

type RowStatus = "pendente" | "enviando" | "ok" | "erro";

type FilaRow = {
  ordemOriginal: number;
  file: File;
  previewUrl: string;
  status: RowStatus;
  error?: string;
};

type UploadMutationVars = {
  brechoId: string;
  loteId: string;
  pend: FilaRow[];
};

const extFromMime = (mime: string): string => {
  const m = mime.split(";")[0]?.trim().toLowerCase() ?? "image/jpeg";
  if (m === "image/png") {
    return "png";
  }
  if (m === "image/webp") {
    return "webp";
  }
  return "jpg";
};

export const ImportacaoCriarPage = () => {
  const { loteId: loteIdParam } = useParams<{ loteId: string }>();
  const brechoId = useSessionStore((s) => s.brechoId);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [loteId, setLoteId] = useState<string | null>(loteIdParam ?? null);
  const [fila, setFila] = useState<FilaRow[]>([]);
  const [criarError, setCriarError] = useState<string | null>(null);
  const creatingRef = useRef(false);

  useEffect(() => {
    if (loteIdParam) {
      setLoteId(loteIdParam);
    }
  }, [loteIdParam]);

  useEffect(() => {
    if (loteId || loteIdParam || creatingRef.current) {
      return;
    }
    creatingRef.current = true;
    void (async () => {
      try {
        const l = await createImportacaoLote(brechoId);
        setLoteId(l.id);
        void navigate(`/importacoes/${l.id}/criar`, { replace: true });
      } catch (e) {
        setCriarError(e instanceof Error ? e.message : "Falha ao criar lote.");
      }
    })();
  }, [brechoId, loteId, loteIdParam, navigate]);

  const detailQuery = useQuery({
    queryKey: ["importacao", brechoId, loteId],
    queryFn: () => getImportacaoLote(brechoId, loteId!),
    enabled: Boolean(loteId)
  });

  const nextOrdem = useMemo(() => {
    const fromServer = detailQuery.data?.fotos?.length
      ? Math.max(...detailQuery.data.fotos.map((f) => f.ordemOriginal)) + 1
      : 0;
    const fromFila = fila.length ? Math.max(...fila.map((f) => f.ordemOriginal)) + 1 : 0;
    return Math.max(fromServer, fromFila, 0);
  }, [detailQuery.data?.fotos, fila]);

  const onPickFiles = useCallback(
    (list: FileList | null) => {
      if (!list?.length) {
        return;
      }
      let o = nextOrdem;
      const added: FilaRow[] = [];
      for (let i = 0; i < list.length; i++) {
        const file = list.item(i);
        if (!file || !file.type.startsWith("image/")) {
          continue;
        }
        added.push({
          ordemOriginal: o,
          file,
          previewUrl: URL.createObjectURL(file),
          status: "pendente"
        });
        o++;
      }
      if (added.length) {
        setFila((prev) => [...prev, ...added]);
      }
    },
    [nextOrdem]
  );

  const uploadMutation = useMutation({
    mutationFn: async ({ brechoId: bid, loteId: lid, pend }: UploadMutationVars) => {
      const uploadOneRow = async (row: FilaRow) => {
        const mime = row.file.type.split(";")[0]?.trim() || "image/jpeg";
        const ext = extFromMime(mime);
        const signed = await presignImportFoto(bid, lid, {
          contentType: mime,
          extensao: ext,
          ordemOriginal: row.ordemOriginal,
          tamanhoBytes: row.file.size
        });
        await putToPresignedUrl(signed.uploadUrl, row.file, mime);
        await registerImportFoto(bid, lid, {
          ordemOriginal: row.ordemOriginal,
          url: signed.publicUrl,
          mime,
          tamanhoBytes: row.file.size,
          nomeArquivo: row.file.name,
          source: "galeria"
        });
      };

      for (const row of pend) {
        setFila((prev) =>
          prev.map((r) => (r.ordemOriginal === row.ordemOriginal ? { ...r, status: "enviando" as const } : r))
        );
        try {
          await uploadOneRow(row);
          setFila((prev) =>
            prev.map((r) => (r.ordemOriginal === row.ordemOriginal ? { ...r, status: "ok" as const } : r))
          );
        } catch (e) {
          const msg = e instanceof Error ? e.message : "Erro no upload.";
          setFila((prev) =>
            prev.map((r) =>
              r.ordemOriginal === row.ordemOriginal ? { ...r, status: "erro" as const, error: msg } : r
            )
          );
        }
      }
      await queryClient.invalidateQueries({ queryKey: ["importacao", bid, lid] });
      await queryClient.invalidateQueries({ queryKey: ["importacoes", bid] });
      await queryClient.invalidateQueries({ queryKey: ["importacoes-pendentes", bid] });
    }
  });

  const agruparMutation = useMutation({
    mutationFn: async () => {
      if (!loteId) {
        throw new Error("Sem lote.");
      }
      return agruparImportacaoLote(brechoId, loteId);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["importacao", brechoId, loteId] });
      await queryClient.invalidateQueries({ queryKey: ["importacoes", brechoId] });
      if (loteId) {
        navigate(`/importacoes/${loteId}/grupos`);
      }
    }
  });

  const totalFotosServidor = detailQuery.data?.fotos?.length ?? 0;
  const filaPendente = fila.some((f) => f.status === "pendente" || f.status === "erro");
  const filaEnviando = fila.some((f) => f.status === "enviando");
  const podeAgrupar = totalFotosServidor > 0 && !filaPendente && !filaEnviando && !uploadMutation.isPending;

  return (
    <AppShell showTopBar showBottomNav activeTab="estoque" topBarTitle="Nova importação" fabLink="/items/new">
      <section>
        <h1 className="font-headline text-3xl font-extrabold tracking-tighter">Fotos do lote</h1>
        <p className="mt-1 text-sm text-on-surface-variant">
          Selecione na ordem em que quer agrupar (a ordem importa). Envie todas antes de organizar.
        </p>
      </section>

      {criarError ? <p className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-900">{criarError}</p> : null}

      <Section title="Adicionar fotos">
        <p className="mb-2 text-sm text-on-surface-variant">
          No servidor: <strong>{totalFotosServidor}</strong> · Na fila local: <strong>{fila.length}</strong>
        </p>
        <label className="inline-flex cursor-pointer">
          <span className="inline-flex h-11 items-center rounded-xl border-2 border-primary bg-white px-4 text-sm font-bold text-primary">
            Escolher da galeria
          </span>
          <input
            type="file"
            accept="image/*"
            multiple
            className="sr-only"
            onChange={(e) => {
              onPickFiles(e.target.files);
              e.target.value = "";
            }}
          />
        </label>
        <div className="mt-3 flex flex-wrap gap-2">
          <Button
            type="button"
            disabled={
              !loteId ||
              (!filaPendente && !fila.some((f) => f.status === "erro")) ||
              uploadMutation.isPending
            }
            onClick={() => {
              if (!loteId) {
                return;
              }
              const pend = fila.filter((f) => f.status === "pendente" || f.status === "erro");
              if (pend.length === 0) {
                return;
              }
              uploadMutation.mutate({ brechoId, loteId, pend });
            }}
          >
            {uploadMutation.isPending ? "Enviando…" : "Enviar fotos da fila"}
          </Button>
          <Button
            type="button"
            disabled={!podeAgrupar || agruparMutation.isPending}
            onClick={() => agruparMutation.mutate()}
            className="!bg-[#006a39]"
          >
            {agruparMutation.isPending ? "Organizando…" : "Organizar fotos com IA"}
          </Button>
        </div>
        {uploadMutation.isError ? (
          <p className="mt-2 text-sm text-rose-800">
            {(uploadMutation.error as Error)?.message ?? "Falha ao enviar fotos."}
          </p>
        ) : null}
        {agruparMutation.isError ? (
          <p className="mt-2 text-sm text-rose-800">
            {(agruparMutation.error as Error)?.message ?? "Falha ao agrupar."}
          </p>
        ) : null}
      </Section>

      {fila.length > 0 ? (
        <Section title="Fila de envio (miniaturas)">
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
            {fila.map((r) => (
              <div key={r.ordemOriginal} className="relative overflow-hidden rounded-xl border border-rose-100">
                <img src={r.previewUrl} alt="" className="aspect-square w-full object-cover" />
                <span className="absolute left-1 top-1 rounded bg-black/60 px-1.5 py-0.5 text-[10px] font-bold text-white">
                  #{r.ordemOriginal + 1}
                </span>
                <span className="absolute bottom-1 right-1 rounded bg-black/60 px-1.5 py-0.5 text-[10px] font-bold text-white">
                  {r.status}
                </span>
              </div>
            ))}
          </div>
        </Section>
      ) : null}

      <p className="text-center text-sm">
        <Link to="/importacoes" className="font-bold text-primary underline">
          Ver importações
        </Link>
      </p>
    </AppShell>
  );
};
