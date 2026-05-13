import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { Link, useNavigate, useParams } from "react-router-dom";
import { z } from "zod";
import type { ItemDetail } from "../api/items";
import { getItem, sellItem } from "../api/items";
import { ClientPicker } from "../components/client-picker";
import { useSessionStore } from "../store/session.store";
import { AppShell, Button, Field, Input, Section } from "../components/ui";
import { parseMoneyLike } from "../lib/money";

const parseFreteFromText = (text: string | undefined): number => {
  if (!text?.trim()) {
    return 0;
  }

  const match = text.match(/R\$\s*([\d.,]+)/i);
  if (match?.[1]) {
    const n = parseMoneyLike(match[1]);
    return Number.isNaN(n) ? 0 : n;
  }

  const numbers = [...text.matchAll(/(\d+[.,]\d+|\d+)/g)].map((m) => parseMoneyLike(m[1]));
  if (!numbers.length) {
    return 0;
  }

  const last = numbers.at(-1);
  if (last === undefined) {
    return 0;
  }

  return Number.isNaN(last) ? 0 : last;
};

const sellFormSchema = z
  .object({
    clienteNome: z.string().trim().min(2),
    clienteWhatsapp: z.string().trim().optional(),
    clienteInstagram: z.string().trim().optional(),
    precoVenda: z.coerce.number().positive("Informe o preço da peça."),
    freteTexto: z.string().optional()
  })
  .superRefine((data, ctx) => {
    const w = data.clienteWhatsapp?.replace(/\s/g, "") ?? "";
    const i = data.clienteInstagram?.replace(/^@+/, "").trim() ?? "";
    if (!w && !i) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Informe WhatsApp ou Instagram do cliente.",
        path: ["clienteWhatsapp"]
      });
    }
  });

type SellFormData = z.infer<typeof sellFormSchema>;

const needsAdjustFieldsForSell = (data: {
  nome: string;
  whatsapp: string;
  instagram: string;
}): boolean => {
  const nomeOk = data.nome.trim().length >= 2;
  const w = data.whatsapp?.replace(/\s/g, "") ?? "";
  const i = data.instagram?.replace(/^@+/, "").trim() ?? "";
  return !nomeOk || (!w && !i);
};

const formatMoney = (value: number): string =>
  value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export const SellPage = () => {
  const { itemId } = useParams<{ itemId: string }>();
  const brechoId = useSessionStore((state) => state.brechoId);
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [saleMode, setSaleMode] = useState<"queue" | "manual">("manual");
  const [selectedQueueEntryId, setSelectedQueueEntryId] = useState<string | null>(null);
  const [showAdjustManualCliente, setShowAdjustManualCliente] = useState(false);

  const itemQuery = useQuery({
    queryKey: ["item", brechoId, itemId],
    queryFn: () => getItem(brechoId, itemId!),
    enabled: Boolean(itemId)
  });

  const item = itemQuery.data;
  const queueEntries = item?.filaInteressados ?? [];
  const selectedQueueEntry = queueEntries.find((entry) => entry.id === selectedQueueEntryId) ?? queueEntries[0];
  const selectedCliente = saleMode === "queue" ? selectedQueueEntry?.cliente : undefined;
  const listCoverFoto = item?.fotos?.find((f) => f.isCover) ?? item?.fotos?.[0];
  const itemPhoto =
    listCoverFoto?.thumbnailUrl ??
    listCoverFoto?.url ??
    item?.fotoCapaThumbnailUrl ??
    item?.fotoCapaUrl ??
    null;

  const { register, handleSubmit, reset, control, setValue, watch } = useForm<SellFormData>({
    resolver: zodResolver(sellFormSchema),
    defaultValues: {
      clienteNome: "",
      clienteWhatsapp: "",
      clienteInstagram: "",
      precoVenda: 0,
      freteTexto: ""
    }
  });

  const precoVenda = useWatch({ control, name: "precoVenda" });
  const freteTexto = useWatch({ control, name: "freteTexto" });
  const manualContact = {
    nome: watch("clienteNome") ?? "",
    whatsapp: watch("clienteWhatsapp") ?? "",
    instagram: watch("clienteInstagram") ?? ""
  };
  const fillManualContact = (cliente: { nome: string; whatsapp: string; instagram: string }) => {
    setValue("clienteNome", cliente.nome, { shouldValidate: true, shouldDirty: true });
    setValue("clienteWhatsapp", cliente.whatsapp, { shouldValidate: true, shouldDirty: true });
    setValue("clienteInstagram", cliente.instagram, { shouldValidate: true, shouldDirty: true });
  };

  const hasManualContact =
    Boolean(manualContact.nome.trim()) ||
    Boolean(manualContact.whatsapp.trim()) ||
    Boolean(manualContact.instagram.trim());

  useEffect(() => {
    if (!item) {
      return;
    }

    const preco = parseMoneyLike(item.precoVenda);
    const nextPreco = Number.isNaN(preco) || preco <= 0 ? 0 : preco;

    if (selectedCliente) {
      reset({
        clienteNome: selectedCliente.nome,
        clienteWhatsapp: selectedCliente.whatsapp ?? "",
        clienteInstagram: selectedCliente.instagram ?? "",
        precoVenda: nextPreco,
        freteTexto: ""
      });
      return;
    }

    reset({
      clienteNome: "",
      clienteWhatsapp: "",
      clienteInstagram: "",
      precoVenda: nextPreco,
      freteTexto: ""
    });
  }, [item, selectedCliente, reset]);

  useEffect(() => {
    if (!item) {
      return;
    }
    const firstEntry = item.filaInteressados?.[0];
    if (firstEntry) {
      setSaleMode("queue");
      setSelectedQueueEntryId(firstEntry.id);
      return;
    }
    setSaleMode("manual");
    setSelectedQueueEntryId(null);
  }, [item]);

  const freteValor = useMemo(() => parseFreteFromText(freteTexto), [freteTexto]);
  const totalVenda = useMemo(() => {
    const p = typeof precoVenda === "number" ? precoVenda : Number(precoVenda);
    if (Number.isNaN(p)) {
      return 0;
    }

    return p + freteValor;
  }, [precoVenda, freteValor]);

  const sellMutation = useMutation({
    mutationFn: (data: SellFormData) => {
      if (!itemId) {
        throw new Error("Item não informado.");
      }

      return sellItem(brechoId, itemId, {
        cliente: {
          nome: data.clienteNome.trim(),
          whatsapp: data.clienteWhatsapp?.trim() || undefined,
          instagram: data.clienteInstagram?.trim() || undefined
        },
        precoVenda: data.precoVenda,
        freteTexto: data.freteTexto?.trim() || undefined,
        freteValor: freteValor > 0 ? freteValor : undefined
      });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["items", brechoId] });
      await queryClient.invalidateQueries({ queryKey: ["item", brechoId, itemId] });
      navigate("/");
    }
  });

  return (
    <AppShell>
      <header style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
        <Link to="/" style={{ color: "#5a4042", textDecoration: "none" }}>
          ← Voltar
        </Link>
        <h1 style={{ margin: 0, fontSize: "1.25rem" }}>Confirmar venda</h1>
      </header>

      <span style={{ fontSize: 10, fontWeight: 800, letterSpacing: "0.1em", color: "#b60e3d" }}>
        RESUMO DA VENDA
      </span>
      <h2 style={{ margin: "4px 0 16px", fontSize: "2rem", fontWeight: 800, letterSpacing: "-0.02em" }}>
        Confirmar venda
      </h2>

      {item && (
        <div
          style={{
            display: "flex",
            gap: 20,
            padding: 20,
            background: "#fff",
            borderRadius: "2rem",
            border: "1px solid #f2d5d7",
            marginBottom: 24,
            boxShadow: "0 12px 40px rgba(186, 19, 64, 0.06)"
          }}
        >
          {itemPhoto ? (
            <img
              src={itemPhoto}
              alt={`Foto da peça ${item.nome}`}
              style={{ width: 120, height: 120, borderRadius: 12, objectFit: "cover", flexShrink: 0 }}
            />
          ) : (
            <div
              style={{
                width: 120,
                height: 120,
                borderRadius: 12,
                background: "#fff0f0",
                flexShrink: 0,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 12,
                color: "#5a4042"
              }}
            >
              Foto
            </div>
          )}
          <div style={{ display: "flex", flexDirection: "column", justifyContent: "center" }}>
            <h3 style={{ margin: 0, fontSize: "1.35rem" }}>{item.nome}</h3>
          </div>
        </div>
      )}

      <Section title="Valores">
        <form className="stack" style={{ gap: 20 }} onSubmit={handleSubmit((data) => sellMutation.mutate(data))}>
          {queueEntries.length > 0 && (
            <div style={{ padding: 12, background: "#fff0f0", borderRadius: 12, fontSize: 14 }}>
              <strong>Há fila para esta peça.</strong>
              <p style={{ margin: "4px 0 12px", color: "#5a4042" }}>
                Escolha vender para a primeira pessoa, outra pessoa da fila ou uma venda manual.
              </p>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {queueEntries.map((entry) => (
                  <button
                    key={entry.id}
                    type="button"
                    onClick={() => {
                      setSaleMode("queue");
                      setSelectedQueueEntryId(entry.id);
                      setShowAdjustManualCliente(false);
                    }}
                    style={{
                      padding: "10px 12px",
                      borderRadius: 12,
                      border: selectedQueueEntryId === entry.id && saleMode === "queue" ? "2px solid #b60e3d" : "1px solid #e2bec0",
                      background: "#fff",
                      textAlign: "left",
                      cursor: "pointer"
                    }}
                  >
                    <strong>
                      {entry.posicao + 1}º da fila: {entry.cliente.nome}
                    </strong>
                    {entry.posicao === 0 ? " · primeira pessoa" : null}
                    <div style={{ fontSize: 12, color: "#5a4042" }}>
                      {[entry.cliente.whatsapp, entry.cliente.instagram].filter(Boolean).join(" · ") || "Sem contato"}
                    </div>
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => {
                    setSaleMode("manual");
                    setSelectedQueueEntryId(null);
                    setShowAdjustManualCliente(false);
                  }}
                  style={{
                    padding: "10px 12px",
                    borderRadius: 12,
                    border: saleMode === "manual" ? "2px solid #b60e3d" : "1px solid #e2bec0",
                    background: "#fff",
                    textAlign: "left",
                    cursor: "pointer",
                    fontWeight: 700
                  }}
                >
                  Vender para outra pessoa
                </button>
              </div>
            </div>
          )}

          {!selectedCliente && (
            <>
              <ClientPicker
                brechoId={brechoId}
                selectedContact={manualContact}
                onSelect={(cliente) => {
                  fillManualContact(cliente);
                  setShowAdjustManualCliente(needsAdjustFieldsForSell(cliente));
                }}
                onCreateNew={(cliente) => {
                  fillManualContact(cliente);
                  setShowAdjustManualCliente(needsAdjustFieldsForSell(cliente));
                }}
                onClear={() => {
                  fillManualContact({ nome: "", whatsapp: "", instagram: "" });
                  setShowAdjustManualCliente(false);
                }}
              />
              {hasManualContact && !showAdjustManualCliente && (
                <button
                  type="button"
                  className="w-full rounded-xl border border-rose-100 bg-white py-3 text-sm font-bold text-primary"
                  onClick={() => setShowAdjustManualCliente(true)}
                >
                  Ajustar nome, WhatsApp ou Instagram
                </button>
              )}
              {hasManualContact && showAdjustManualCliente && (
                <button
                  type="button"
                  className="text-sm font-bold text-on-surface-variant underline"
                  onClick={() => setShowAdjustManualCliente(false)}
                >
                  Ocultar campos
                </button>
              )}
              <div
                className={hasManualContact && showAdjustManualCliente ? "stack" : "hidden"}
                style={{ gap: 12 }}
                aria-hidden={!(hasManualContact && showAdjustManualCliente)}
              >
                <Field label="Nome completo">
                  <Input {...register("clienteNome")} />
                </Field>
                <div className="grid cols-2">
                  <Field label="WhatsApp">
                    <Input {...register("clienteWhatsapp")} type="tel" placeholder="55 11 99999-9999" />
                  </Field>
                  <Field label="Instagram">
                    <Input {...register("clienteInstagram")} placeholder="@usuario" />
                  </Field>
                </div>
              </div>
            </>
          )}

          {selectedCliente && (
            <div style={{ padding: 12, background: "#fff0f0", borderRadius: 12, fontSize: 14 }}>
              <strong>Cliente selecionado:</strong> {selectedCliente.nome}
              <div style={{ fontSize: 12, color: "#5a4042", marginTop: 4 }}>
                {selectedCliente.whatsapp ? `WhatsApp: ${selectedCliente.whatsapp}` : null}
                {selectedCliente.whatsapp && selectedCliente.instagram ? " · " : null}
                {selectedCliente.instagram ? `Instagram: @${selectedCliente.instagram}` : null}
              </div>
              <input type="hidden" {...register("clienteNome")} />
              <input type="hidden" {...register("clienteWhatsapp")} />
              <input type="hidden" {...register("clienteInstagram")} />
            </div>
          )}

          <Field label="Preço da peça (R$)">
            <Input type="number" step="0.01" min={0} {...register("precoVenda", { valueAsNumber: true })} />
            <small style={{ color: "#5a4042" }}>Pré-preenchido com o preço de anúncio. Toque para editar.</small>
          </Field>

          <Field label="Informações de envio">
            <Input {...register("freteTexto")} placeholder="ex: Correios R$15 ou Correios 15,50" />
            <small style={{ color: "#5a4042" }}>O valor numérico do frete é somado ao preço da peça.</small>
          </Field>

          <div
            style={{
              padding: 24,
              background: "#fff0f0",
              borderRadius: "2rem",
              display: "flex",
              flexDirection: "column",
              gap: 12
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ color: "#5a4042" }}>Preço da peça</span>
              <strong>{formatMoney(typeof precoVenda === "number" ? precoVenda : Number(precoVenda) || 0)}</strong>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ color: "#5a4042" }}>Frete</span>
              <strong style={{ color: "#006a39" }}>+ {formatMoney(freteValor)}</strong>
            </div>
            <div style={{ borderTop: "1px solid #e2bec0", paddingTop: 12, marginTop: 4 }} />
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: "1.1rem", fontWeight: 800 }}>Total da venda</span>
              <span style={{ fontSize: "1.75rem", fontWeight: 800, color: "#b60e3d" }}>{formatMoney(totalVenda)}</span>
            </div>
          </div>

          <Button type="submit" disabled={sellMutation.isPending || !item || itemQuery.isLoading}>
            {sellMutation.isPending ? "Confirmando..." : "Confirmar venda"}
          </Button>
          <p style={{ textAlign: "center", fontSize: 13, color: "#5a4042", margin: 0 }}>
            Ao confirmar, o status do item será movido para <strong style={{ color: "#b60e3d" }}>Vendido</strong> no seu
            estoque.
          </p>
        </form>
      </Section>
    </AppShell>
  );
};
