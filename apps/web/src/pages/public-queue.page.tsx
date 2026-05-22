import { useMutation, useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { useParams } from "react-router-dom";
import { z } from "zod";
import { getPublicQueueInfo, joinPublicQueue } from "../api/public-queue";
import { ClientContactFields } from "../components/client-contact-fields";
import { Button } from "../components/ui";

const formSchema = z
  .object({
    nome: z.string().trim().min(2, "Informe o nome."),
    whatsapp: z.string().trim().optional(),
    instagram: z.string().trim().optional()
  })
  .superRefine((data, ctx) => {
    const w = data.whatsapp?.replace(/\s/g, "") ?? "";
    const i = data.instagram?.replace(/^@+/, "").trim() ?? "";
    if (!w && !i) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Informe WhatsApp ou Instagram.", path: ["whatsapp"] });
    }
  });

export const PublicQueuePage = () => {
  const { token } = useParams();
  const [joinResult, setJoinResult] = useState<{ posicao: number; totalNaFila: number } | null>(null);
  const [dismissedNudge, setDismissedNudge] = useState(false);

  const infoQuery = useQuery({
    queryKey: ["public-queue", token],
    queryFn: () => getPublicQueueInfo(token!),
    enabled: Boolean(token)
  });

  const [values, setValues] = useState({ nome: "", whatsapp: "", instagram: "" });
  const [formError, setFormError] = useState<string | null>(null);

  const joinMutation = useMutation({
    mutationFn: (data: z.infer<typeof formSchema>) =>
      joinPublicQueue(token!, {
        nome: data.nome.trim(),
        whatsapp: data.whatsapp?.trim() || undefined,
        instagram: data.instagram?.trim() || undefined
      }),
    onSuccess: (result) => {
      setJoinResult({ posicao: result.posicao, totalNaFila: result.totalNaFila });
    }
  });

  const info = infoQuery.data;

  return (
    <div className="mx-auto min-h-screen max-w-md bg-rose-50 px-4 py-8">
      <header className="mb-6 text-center">
        <h1 className="font-headline text-2xl font-extrabold text-primary">Fila de interesse</h1>
        <p className="mt-1 text-sm text-on-surface-variant">Entre na fila desta peça</p>
      </header>

      {infoQuery.isLoading && <p>Carregando...</p>}
      {infoQuery.isError && (
        <p className="rounded-2xl border border-rose-200 bg-white p-4 text-sm">Link inválido ou expirado.</p>
      )}

      {info && (
        <div className="mb-6 overflow-hidden rounded-3xl border border-rose-100 bg-white shadow-sm">
          {info.fotoUrl && (
            <img src={info.fotoUrl} alt={info.pecaNome} className="aspect-[4/5] w-full object-cover" />
          )}
          <div className="p-4">
            {info.pecaCodigo && (
              <p className="text-xs font-bold uppercase tracking-wider text-primary">{info.pecaCodigo}</p>
            )}
            <h2 className="text-lg font-bold text-gray-900">{info.pecaNome}</h2>
            <p className="mt-1 text-sm text-gray-500">
              {info.canJoin ? `${info.totalNaFila} pessoa(s) na fila` : "Peça indisponível para fila"}
            </p>
          </div>
        </div>
      )}

      {joinResult && (
        <div className="mb-6 rounded-2xl border border-green-200 bg-green-50 p-4 text-sm text-green-900">
          Você é a <strong>{joinResult.posicao + 1}ª</strong> da fila ({joinResult.totalNaFila} no total). Entraremos em
          contato em breve!
        </div>
      )}

      {info?.canJoin && !joinResult && (
        <form
          className="space-y-4 rounded-3xl border border-rose-100 bg-white p-4"
          onSubmit={(event) => {
            event.preventDefault();
            const parsed = formSchema.safeParse(values);
            if (!parsed.success) {
              setFormError(parsed.error.issues[0]?.message ?? "Dados inválidos.");
              return;
            }
            setFormError(null);
            joinMutation.mutate(parsed.data);
          }}
        >
          <ClientContactFields
            values={values}
            onChange={(field, value) => setValues((prev) => ({ ...prev, [field]: value }))}
            dismissedNudge={dismissedNudge}
            onDismissNudge={() => setDismissedNudge(true)}
          />
          {formError && <p className="text-sm text-red-600">{formError}</p>}
          <Button type="submit" disabled={joinMutation.isPending} className="w-full">
            {joinMutation.isPending ? "Entrando..." : "Entrar na fila"}
          </Button>
          {joinMutation.isError && (
            <p className="text-sm text-red-600">{(joinMutation.error as Error).message}</p>
          )}
        </form>
      )}
    </div>
  );
};
