import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { Link, useParams } from "react-router-dom";
import { z } from "zod";
import {
  addItemFoto,
  deleteItemFoto,
  getItem,
  joinItemFila,
  leaveItemFila
} from "../api/items";
import { ApiError } from "../api/client";
import { useSessionStore } from "../store/session.store";
import { AppShell, Button, Field, Input, Section } from "../components/ui";

const fotoFormSchema = z.object({
  url: z.string().trim().url("Informe uma URL válida (http ou https).")
});

const filaFormSchema = z
  .object({
    nome: z.string().trim().min(2),
    whatsapp: z.string().optional(),
    instagram: z.string().optional()
  })
  .superRefine((data, ctx) => {
    const w = data.whatsapp?.replace(/\s/g, "") ?? "";
    const i = data.instagram?.replace(/^@+/, "").trim() ?? "";
    if (!w && !i) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Informe WhatsApp ou Instagram.",
        path: ["whatsapp"]
      });
    }
  });

type FotoFormData = z.infer<typeof fotoFormSchema>;
type FilaFormData = z.infer<typeof filaFormSchema>;

export const ItemDetailPage = () => {
  const { itemId } = useParams<{ itemId: string }>();
  const brechoId = useSessionStore((state) => state.brechoId);
  const queryClient = useQueryClient();

  const itemQuery = useQuery({
    queryKey: ["item", brechoId, itemId],
    queryFn: () => getItem(brechoId, itemId!),
    enabled: Boolean(itemId)
  });

  const fotoForm = useForm<FotoFormData>({
    resolver: zodResolver(fotoFormSchema),
    defaultValues: { url: "" }
  });

  const filaForm = useForm<FilaFormData>({
    resolver: zodResolver(filaFormSchema),
    defaultValues: { nome: "", whatsapp: "", instagram: "" }
  });

  const addFotoMutation = useMutation({
    mutationFn: (url: string) => addItemFoto(brechoId, itemId!, { url }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["item", brechoId, itemId] });
      fotoForm.reset();
    }
  });

  const deleteFotoMutation = useMutation({
    mutationFn: (fotoId: string) => deleteItemFoto(brechoId, itemId!, fotoId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["item", brechoId, itemId] });
    }
  });

  const joinFilaMutation = useMutation({
    mutationFn: (data: FilaFormData) =>
      joinItemFila(brechoId, itemId!, {
        cliente: {
          nome: data.nome,
          whatsapp: data.whatsapp?.trim() || undefined,
          instagram: data.instagram?.trim() || undefined
        }
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["item", brechoId, itemId] });
      await queryClient.invalidateQueries({ queryKey: ["items", brechoId] });
      filaForm.reset();
    }
  });

  const leaveFilaMutation = useMutation({
    mutationFn: (entradaId: string) => leaveItemFila(brechoId, itemId!, entradaId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["item", brechoId, itemId] });
      await queryClient.invalidateQueries({ queryKey: ["items", brechoId] });
    }
  });

  if (!itemId) {
    return (
      <AppShell>
        <p>Peça não encontrada.</p>
        <Link to="/">Voltar</Link>
      </AppShell>
    );
  }

  const item = itemQuery.data;

  return (
    <AppShell>
      <Link to="/">← Estoque</Link>
      {itemQuery.isLoading && <p>Carregando...</p>}
      {itemQuery.isError && <p>Não foi possível carregar a peça.</p>}
      {item && (
        <>
          <header>
            <h1 style={{ marginBottom: 4 }}>{item.nome}</h1>
            <p style={{ marginTop: 0, opacity: 0.85 }}>
              {item.categoria} · {item.status}
            </p>
          </header>

          <Section title="Fotos">
            <p style={{ marginTop: 0, fontSize: 14, opacity: 0.85 }}>
              <Link to={`/items/${item.id}/fotos/upload`}>Enviar fotos (câmera, galeria, nota em texto ou voz)</Link>
              {" · "}
              Ou cole uma URL pública abaixo.
            </p>
            <form
              className="stack"
              style={{ gap: 12, marginBottom: 16 }}
              onSubmit={fotoForm.handleSubmit((data) => addFotoMutation.mutate(data.url))}
            >
              <Field label="URL da imagem">
                <Input {...fotoForm.register("url")} placeholder="https://..." />
              </Field>
              {fotoForm.formState.errors.url && (
                <small style={{ color: "#b60e3d" }}>{fotoForm.formState.errors.url.message}</small>
              )}
              <Button type="submit" disabled={addFotoMutation.isPending}>
                {addFotoMutation.isPending ? "Adicionando..." : "Adicionar foto"}
              </Button>
              {addFotoMutation.isError && (
                <small style={{ color: "#b60e3d" }}>
                  {addFotoMutation.error instanceof ApiError
                    ? addFotoMutation.error.message
                    : "Não foi possível adicionar a foto."}
                </small>
              )}
            </form>
            <div className="stack" style={{ gap: 12 }}>
              {(item.fotos ?? []).length === 0 ? (
                <p style={{ opacity: 0.8 }}>Nenhuma foto ainda.</p>
              ) : (
                (item.fotos ?? []).map((foto) => (
                  <div
                    key={foto.id}
                    className="card"
                    style={{ display: "flex", gap: 12, alignItems: "center" }}
                  >
                    <img
                      src={foto.url}
                      alt=""
                      style={{ width: 72, height: 72, objectFit: "cover", borderRadius: 8 }}
                    />
                    <div className="stack" style={{ flex: 1, minWidth: 0 }}>
                      <small style={{ wordBreak: "break-all" }}>{foto.url}</small>
                      <small>Ordem {foto.ordem}</small>
                    </div>
                    <Button
                      type="button"
                      onClick={() => deleteFotoMutation.mutate(foto.id)}
                      disabled={deleteFotoMutation.isPending}
                    >
                      Remover
                    </Button>
                  </div>
                ))
              )}
            </div>
          </Section>

          <Section title="Fila de interessados">
            {item.status === "DISPONIVEL" ? (
              <form
                className="grid cols-2"
                style={{ marginBottom: 16 }}
                onSubmit={filaForm.handleSubmit((data) => joinFilaMutation.mutate(data))}
              >
                <Field label="Nome">
                  <Input {...filaForm.register("nome")} />
                </Field>
                <Field label="WhatsApp">
                  <Input {...filaForm.register("whatsapp")} />
                </Field>
                <Field label="Instagram">
                  <Input {...filaForm.register("instagram")} placeholder="@usuario" />
                </Field>
                <div className="stack" style={{ justifyContent: "end" }}>
                  <Button type="submit" disabled={joinFilaMutation.isPending}>
                    {joinFilaMutation.isPending ? "Entrando..." : "Entrar na fila"}
                  </Button>
                </div>
                {(filaForm.formState.errors.whatsapp || filaForm.formState.errors.root) && (
                  <small style={{ color: "#b60e3d", gridColumn: "1 / -1" }}>
                    {filaForm.formState.errors.whatsapp?.message}
                  </small>
                )}
                {joinFilaMutation.isError && (
                  <small style={{ color: "#b60e3d", gridColumn: "1 / -1" }}>
                    {joinFilaMutation.error instanceof ApiError
                      ? joinFilaMutation.error.message
                      : "Não foi possível entrar na fila."}
                  </small>
                )}
              </form>
            ) : (
              <p style={{ opacity: 0.85 }}>
                Só é possível adicionar interessados enquanto a peça está <strong>disponível</strong>.
              </p>
            )}
            <div className="stack" style={{ gap: 8 }}>
              {(item.filaInteressados ?? []).length === 0 ? (
                <p style={{ opacity: 0.8 }}>Ninguém na fila.</p>
              ) : (
                (item.filaInteressados ?? []).map((e) => (
                  <div
                    key={e.id}
                    className="card"
                    style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}
                  >
                    <div>
                      <strong>
                        {e.posicao + 1}º — {e.cliente.nome}
                      </strong>
                      <div style={{ fontSize: 13, opacity: 0.85 }}>
                        {[e.cliente.whatsapp, e.cliente.instagram].filter(Boolean).join(" · ") ||
                          "Sem contato"}
                      </div>
                    </div>
                    <Button
                      type="button"
                      onClick={() => leaveFilaMutation.mutate(e.id)}
                      disabled={leaveFilaMutation.isPending}
                    >
                      Remover
                    </Button>
                  </div>
                ))
              )}
            </div>
          </Section>
        </>
      )}
    </AppShell>
  );
};
