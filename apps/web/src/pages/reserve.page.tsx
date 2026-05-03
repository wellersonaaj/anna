import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { Link, useNavigate, useParams } from "react-router-dom";
import { z } from "zod";
import { ClientPicker } from "../components/client-picker";
import { getItem, joinItemFila } from "../api/items";
import { useSessionStore } from "../store/session.store";
import { AppShell, Button, Field, Input, Section } from "../components/ui";

const reserveFormSchema = z.object({
  nome: z.string().trim().min(2, "Informe o nome."),
  whatsapp: z.string().trim().optional(),
  instagram: z.string().trim().optional()
}).superRefine((data, ctx) => {
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

type ReserveFormData = z.infer<typeof reserveFormSchema>;

const needsAdjustFieldsForReserve = (data: ReserveFormData): boolean => {
  const nomeOk = data.nome.trim().length >= 2;
  const w = data.whatsapp?.replace(/\s/g, "") ?? "";
  const i = data.instagram?.replace(/^@+/, "").trim() ?? "";
  return !nomeOk || (!w && !i);
};

const formatPreco = (value: string | number | null | undefined): string => {
  if (value === null || value === undefined || value === "") {
    return "—";
  }

  const num = typeof value === "string" ? Number(value.replace(",", ".")) : Number(value);
  if (Number.isNaN(num)) {
    return String(value);
  }

  return num.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
};

export const ReservePage = () => {
  const { itemId } = useParams<{ itemId: string }>();
  const brechoId = useSessionStore((state) => state.brechoId);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [showAdjustFields, setShowAdjustFields] = useState(false);

  const itemQuery = useQuery({
    queryKey: ["item", brechoId, itemId],
    queryFn: () => getItem(brechoId, itemId!),
    enabled: Boolean(itemId)
  });

  const { register, handleSubmit, setValue, formState, watch } = useForm<ReserveFormData>({
    resolver: zodResolver(reserveFormSchema),
    defaultValues: {
      nome: "",
      whatsapp: "",
      instagram: ""
    }
  });

  const reserveMutation = useMutation({
    mutationFn: (data: ReserveFormData) => {
      if (!itemId) {
        throw new Error("Peça não informada.");
      }

      return joinItemFila(brechoId, itemId, {
        cliente: {
          nome: data.nome.trim(),
          whatsapp: data.whatsapp?.trim() || undefined,
          instagram: data.instagram?.trim() || undefined
        }
      });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["items", brechoId] });
      await queryClient.invalidateQueries({ queryKey: ["item", brechoId, itemId] });
      navigate("/");
    }
  });

  const item = itemQuery.data;
  const listCoverFoto = item?.fotos?.find((f) => f.isCover) ?? item?.fotos?.[0];
  const itemPhoto =
    listCoverFoto?.thumbnailUrl ??
    listCoverFoto?.url ??
    item?.fotoCapaThumbnailUrl ??
    item?.fotoCapaUrl ??
    null;
  const canQueue = item?.status === "DISPONIVEL" || item?.status === "RESERVADO";
  const selectedContact = {
    nome: watch("nome") ?? "",
    whatsapp: watch("whatsapp") ?? "",
    instagram: watch("instagram") ?? ""
  };
  const fillClient = (cliente: ReserveFormData) => {
    setValue("nome", cliente.nome, { shouldValidate: true, shouldDirty: true });
    setValue("whatsapp", cliente.whatsapp ?? "", { shouldValidate: true, shouldDirty: true });
    setValue("instagram", cliente.instagram ?? "", { shouldValidate: true, shouldDirty: true });
  };

  const hasContact =
    Boolean(selectedContact.nome.trim()) ||
    Boolean(selectedContact.whatsapp.trim()) ||
    Boolean(selectedContact.instagram.trim());

  return (
    <AppShell>
      <header style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
        <Link to="/" style={{ color: "#5a4042", textDecoration: "none" }}>
          ← Voltar
        </Link>
        <h1 style={{ margin: 0, fontSize: "1.25rem" }}>
          {item?.status === "RESERVADO" ? "Adicionar à fila" : "Reserva"}
        </h1>
      </header>

      <p style={{ marginTop: 0, color: "#5a4042", maxWidth: 360 }}>
        Escolha quem reserva: busque quem já está cadastrado ou cadastre alguém novo.
      </p>

      <Section title="Cliente">
        <form className="stack" onSubmit={handleSubmit((data) => reserveMutation.mutate(data))}>
          <ClientPicker
            brechoId={brechoId}
            selectedContact={selectedContact}
            onSelect={(cliente) => {
              fillClient(cliente);
              setShowAdjustFields(needsAdjustFieldsForReserve(cliente));
            }}
            onCreateNew={(cliente) => {
              fillClient(cliente);
              setShowAdjustFields(needsAdjustFieldsForReserve(cliente));
            }}
            onClear={() => {
              fillClient({ nome: "", whatsapp: "", instagram: "" });
              setShowAdjustFields(false);
            }}
          />

          {hasContact && !showAdjustFields && (
            <button
              type="button"
              className="w-full rounded-xl border border-rose-100 bg-white py-3 text-sm font-bold text-primary"
              onClick={() => setShowAdjustFields(true)}
            >
              Ajustar nome, WhatsApp ou Instagram
            </button>
          )}

          {hasContact && showAdjustFields && (
            <button
              type="button"
              className="text-sm font-bold text-on-surface-variant underline"
              onClick={() => setShowAdjustFields(false)}
            >
              Ocultar campos
            </button>
          )}

          <div
            className={hasContact && showAdjustFields ? "grid gap-3" : "hidden"}
            aria-hidden={!(hasContact && showAdjustFields)}
          >
            <Field label="Nome completo">
              <Input {...register("nome")} placeholder="ex: Elena Rossi" />
            </Field>
            <div className="grid cols-2">
              <Field label="WhatsApp">
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <span style={{ color: "#8e6f71" }}>+</span>
                  <Input {...register("whatsapp")} placeholder="55 11 99999-9999" type="tel" />
                </div>
              </Field>
              <Field label="Instagram">
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <span style={{ color: "#8e6f71" }}>@</span>
                  <Input {...register("instagram")} placeholder="usuario" />
                </div>
              </Field>
            </div>
          </div>

          {item && (
            <div
              style={{
                display: "flex",
                gap: 16,
                padding: 16,
                background: "#fee1e3",
                borderRadius: 16,
                marginTop: 8
              }}
            >
              {itemPhoto ? (
                <img
                  src={itemPhoto}
                  alt={`Foto da peça ${item.nome}`}
                  style={{ width: 80, height: 96, borderRadius: 12, objectFit: "cover", flexShrink: 0 }}
                />
              ) : (
                <div
                  style={{
                    width: 80,
                    height: 96,
                    borderRadius: 12,
                    background: "#fff",
                    flexShrink: 0,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 11,
                    color: "#5a4042"
                  }}
                >
                  Foto
                </div>
              )}
              <div>
                <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: "0.15em", color: "#b60e3d" }}>
                  {item.status === "RESERVADO" ? "ADICIONANDO À FILA" : "RESERVANDO ITEM"}
                </div>
                <h3 style={{ margin: "4px 0", fontSize: "1.1rem" }}>{item.nome}</h3>
                <div style={{ fontSize: 13, fontWeight: 700 }}>{formatPreco(item.precoVenda)}</div>
              </div>
            </div>
          )}

          <div style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: 12 }}>
            <Button type="submit" disabled={reserveMutation.isPending || !item || !canQueue}>
              {reserveMutation.isPending
                ? "Confirmando..."
                : item?.status === "RESERVADO"
                  ? "Adicionar à fila"
                  : "Confirmar reserva"}
            </Button>
            <button
              type="button"
              onClick={() => navigate(-1)}
              style={{
                height: 40,
                borderRadius: 10,
                border: "1px solid #e2bec0",
                background: "transparent",
                color: "#5a4042",
                cursor: "pointer",
                fontWeight: 600
              }}
            >
              Descartar rascunho
            </button>
          </div>
          {formState.errors.root && <small>{formState.errors.root.message}</small>}
        </form>
      </Section>
    </AppShell>
  );
};
