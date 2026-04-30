import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useMemo, useState } from "react";
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
import { resizeImageDetailed } from "../lib/imageResize";

type RowStatus = "pendente" | "enviando" | "ok" | "erro";

type FilaRow = {
  ordemOriginal: number;
  file: File;
  uploadBlob: Blob;
  uploadMime: string;
  uploadName: string;
  uploadWidth?: number;
  uploadHeight?: number;
  thumbnailBlob?: Blob;
  thumbnailMime?: string;
  previewUrl: string;
  status: RowStatus;
  error?: string;
};

type UploadMutationVars = {
  brechoId: string;
  loteId: string | null;
  pend: FilaRow[];
};

type ImportacaoMutationVars = {
  brechoId: string;
  loteId: string;
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

const UPLOAD_CONCURRENCY = 3;

const runWithConcurrency = async <T,>(items: T[], limit: number, worker: (item: T) => Promise<void>) => {
  let nextIndex = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (nextIndex < items.length) {
      const item = items[nextIndex];
      nextIndex++;
      if (item) {
        await worker(item);
      }
    }
  });
  await Promise.all(workers);
};

const prepareImportFile = async (file: File) => {
  try {
    const [upload, thumbnail] = await Promise.all([
      resizeImageDetailed(file, { maxSide: 1600, quality: 0.78, mime: "image/jpeg" }),
      resizeImageDetailed(file, { maxSide: 360, quality: 0.72, mime: "image/jpeg" })
    ]);

    return {
      uploadBlob: upload.blob,
      uploadMime: upload.mime,
      uploadName: file.name.replace(/\.[^.]+$/, "") + ".jpg",
      uploadWidth: upload.width,
      uploadHeight: upload.height,
      thumbnailBlob: thumbnail.blob,
      thumbnailMime: thumbnail.mime,
      previewUrl: URL.createObjectURL(thumbnail.blob)
    };
  } catch {
    const mime = file.type.split(";")[0]?.trim() || "image/jpeg";
    return {
      uploadBlob: file,
      uploadMime: mime,
      uploadName: file.name,
      previewUrl: URL.createObjectURL(file)
    };
  }
};

export const ImportacaoCriarPage = () => {
  const { loteId: loteIdParam } = useParams<{ loteId: string }>();
  const brechoId = useSessionStore((s) => s.brechoId);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [loteId, setLoteId] = useState<string | null>(loteIdParam ?? null);
  const [fila, setFila] = useState<FilaRow[]>([]);
  const [preparandoFotos, setPreparandoFotos] = useState(false);

  useEffect(() => {
    if (loteIdParam) {
      setLoteId(loteIdParam);
    }
  }, [loteIdParam]);

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
    async (list: FileList | null) => {
      if (!list?.length) {
        return;
      }
      let o = nextOrdem;
      const selected: Array<{ ordemOriginal: number; file: File }> = [];
      for (const file of Array.from(list)) {
        if (file.type.startsWith("image/")) {
          selected.push({ ordemOriginal: o, file });
          o++;
        }
      }

      if (selected.length === 0) {
        return;
      }

      setPreparandoFotos(true);
      try {
        const startedAt = performance.now();
        const added = await Promise.all(
          selected.map(async ({ ordemOriginal, file }) => ({
            ordemOriginal,
            file,
            ...(await prepareImportFile(file)),
            status: "pendente" as const
          }))
        );
        setFila((prev) => [...prev, ...added]);
        console.info("[importacao] fotos preparadas", {
          total: added.length,
          originalBytes: added.reduce((sum, r) => sum + r.file.size, 0),
          uploadBytes: added.reduce((sum, r) => sum + r.uploadBlob.size, 0),
          elapsedMs: Math.round(performance.now() - startedAt)
        });
      } finally {
        setPreparandoFotos(false);
      }
    },
    [nextOrdem]
  );

  const uploadMutation = useMutation({
    mutationFn: async ({ brechoId: bid, loteId: lid, pend }: UploadMutationVars) => {
      let fail = 0;
      let activeLoteId = lid;

      if (!activeLoteId) {
        const lote = await createImportacaoLote(bid);
        activeLoteId = lote.id;
        setLoteId(lote.id);
        void navigate(`/importacoes/${lote.id}/criar`, { replace: true });
      }
      const uploadLoteId = activeLoteId;
      const uploadStartedAt = performance.now();

      const uploadOneRow = async (row: FilaRow) => {
        const mime = row.uploadMime;
        const ext = extFromMime(mime);
        const signed = await presignImportFoto(bid, uploadLoteId, {
          contentType: mime,
          extensao: ext,
          ordemOriginal: row.ordemOriginal,
          tamanhoBytes: row.uploadBlob.size
        });
        await putToPresignedUrl(signed.uploadUrl, row.uploadBlob, mime);

        let thumbnailUrl: string | undefined;
        if (row.thumbnailBlob && row.thumbnailMime) {
          const thumbSigned = await presignImportFoto(bid, uploadLoteId, {
            contentType: row.thumbnailMime,
            extensao: extFromMime(row.thumbnailMime),
            ordemOriginal: row.ordemOriginal,
            tamanhoBytes: row.thumbnailBlob.size
          });
          await putToPresignedUrl(thumbSigned.uploadUrl, row.thumbnailBlob, row.thumbnailMime);
          thumbnailUrl = thumbSigned.publicUrl;
        }

        await registerImportFoto(bid, uploadLoteId, {
          ordemOriginal: row.ordemOriginal,
          url: signed.publicUrl,
          mime,
          tamanhoBytes: row.uploadBlob.size,
          nomeArquivo: row.uploadName,
          source: "galeria",
          thumbnailUrl,
          thumbnailTamanhoBytes: row.thumbnailBlob?.size,
          largura: row.uploadWidth,
          altura: row.uploadHeight
        });
      };

      await runWithConcurrency(pend, UPLOAD_CONCURRENCY, async (row) => {
        setFila((prev) =>
          prev.map((r) => (r.ordemOriginal === row.ordemOriginal ? { ...r, status: "enviando" as const } : r))
        );
        try {
          await uploadOneRow(row);
          setFila((prev) =>
            prev.map((r) => (r.ordemOriginal === row.ordemOriginal ? { ...r, status: "ok" as const } : r))
          );
        } catch (e) {
          fail++;
          const msg = e instanceof Error ? e.message : "Erro no upload.";
          setFila((prev) =>
            prev.map((r) =>
              r.ordemOriginal === row.ordemOriginal ? { ...r, status: "erro" as const, error: msg } : r
            )
          );
        }
      });
      await queryClient.invalidateQueries({ queryKey: ["importacao", bid, uploadLoteId] });
      await queryClient.invalidateQueries({ queryKey: ["importacoes", bid] });
      await queryClient.invalidateQueries({ queryKey: ["importacoes-pendentes", bid] });
      console.info("[importacao] upload concluido", {
        loteId: uploadLoteId,
        total: pend.length,
        fail,
        elapsedMs: Math.round(performance.now() - uploadStartedAt)
      });
      return { brechoId: bid, loteId: uploadLoteId, fail };
    },
    onSuccess: (result) => {
      if (result.fail === 0) {
        agruparMutation.mutate({ brechoId: result.brechoId, loteId: result.loteId });
      }
    }
  });

  const agruparMutation = useMutation({
    mutationFn: async ({ brechoId: bid, loteId: lid }: ImportacaoMutationVars) => {
      const startedAt = performance.now();
      const detail = await agruparImportacaoLote(bid, lid);
      console.info("[importacao] agrupamento concluido", {
        loteId: lid,
        fotos: detail.fotos.length,
        grupos: detail.grupos.length,
        elapsedMs: Math.round(performance.now() - startedAt)
      });
      return detail;
    },
    onSuccess: async (_detail, vars) => {
      await queryClient.invalidateQueries({ queryKey: ["importacao", vars.brechoId, vars.loteId] });
      await queryClient.invalidateQueries({ queryKey: ["importacoes", vars.brechoId] });
      navigate(`/importacoes/${vars.loteId}/grupos`);
    }
  });

  const totalFotosServidor = detailQuery.data?.fotos?.length ?? 0;
  const filaPendente = fila.some((f) => f.status === "pendente" || f.status === "erro");
  const filaEnviando = fila.some((f) => f.status === "enviando");
  const podeAgrupar = totalFotosServidor > 0 && !filaPendente && !filaEnviando && !uploadMutation.isPending;
  const filaEmProcessamento = uploadMutation.isPending || agruparMutation.isPending;

  return (
    <AppShell showTopBar showBottomNav activeTab="estoque" topBarTitle="Nova importação" fabLink="/items/new">
      <section>
        <h1 className="font-headline text-3xl font-extrabold tracking-tighter">Fotos do lote</h1>
        <p className="mt-1 text-sm text-on-surface-variant">
          Selecione na ordem em que quer agrupar (a ordem importa). Ao enviar, a IA organiza as fotos automaticamente.
        </p>
      </section>

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
              void onPickFiles(e.target.files);
              e.target.value = "";
            }}
          />
        </label>
        <div className="mt-3 flex flex-wrap gap-2">
          <Button
            type="button"
            disabled={
              preparandoFotos ||
              (!filaPendente && !fila.some((f) => f.status === "erro")) ||
              filaEmProcessamento
            }
            onClick={() => {
              const pend = fila.filter((f) => f.status === "pendente" || f.status === "erro");
              if (pend.length === 0) {
                return;
              }
              uploadMutation.mutate({ brechoId, loteId, pend });
            }}
          >
            {preparandoFotos
              ? "Preparando fotos…"
              : uploadMutation.isPending
              ? "Enviando…"
              : agruparMutation.isPending
                ? "Organizando…"
                : "Enviar e organizar fotos"}
          </Button>
          {!filaPendente && totalFotosServidor > 0 ? (
            <Button
              type="button"
              disabled={!podeAgrupar || agruparMutation.isPending}
              onClick={() => {
                if (!loteId) {
                  return;
                }
                agruparMutation.mutate({ brechoId, loteId });
              }}
              className="!bg-[#006a39]"
            >
              {agruparMutation.isPending ? "Organizando…" : "Organizar fotos com IA"}
            </Button>
          ) : null}
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
