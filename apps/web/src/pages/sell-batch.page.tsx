import { useMutation, useQuery } from "@tanstack/react-query";
import { useMemo, useState, type CSSProperties } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { listItems, sellBatch, type ModoEntrega } from "../api/items";
import { ClientPicker, type ClientContact } from "../components/client-picker";
import { AppShell, Button, Field, Input } from "../components/ui";
import { useSessionStore } from "../store/session.store";

const chipStyle = (active: boolean): CSSProperties => ({
  padding: "10px 16px",
  borderRadius: 12,
  border: active ? "2px solid #b60e3d" : "1px solid #e2bec0",
  background: active ? "#fff0f0" : "#fff",
  cursor: "pointer",
  fontWeight: 700,
  fontSize: 14
});

export const SellBatchPage = () => {
  const brechoId = useSessionStore((state) => state.brechoId);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const pecaIds = useMemo(() => searchParams.get("ids")?.split(",").filter(Boolean) ?? [], [searchParams]);
  const [client, setClient] = useState<ClientContact | null>(null);
  const [prices, setPrices] = useState<Record<string, string>>({});
  const [modoEntrega, setModoEntrega] = useState<ModoEntrega>("SACOLA");
  const [freteIncluso, setFreteIncluso] = useState(false);

  const itemsQuery = useQuery({
    queryKey: ["items", brechoId, "batch", pecaIds.join(",")],
    queryFn: async () => {
      const all = await listItems(brechoId);
      return all.filter((item) => pecaIds.includes(item.id));
    },
    enabled: pecaIds.length > 0
  });

  const precoLabel =
    modoEntrega === "IMEDIATA"
      ? "Quanto a cliente pagou por peça?"
      : freteIncluso
        ? "Preço cobrado (com frete incluso)"
        : "Preço da peça (sem frete)";

  const sellMutation = useMutation({
    mutationFn: () => {
      if (!client) throw new Error("Selecione a cliente.");
      return sellBatch(brechoId, {
        cliente: {
          nome: client.nome.trim(),
          whatsapp: client.whatsapp.trim() || undefined,
          instagram: client.instagram.trim() || undefined
        },
        modoEntrega,
        freteIncluso: modoEntrega === "SACOLA" ? freteIncluso : undefined,
        itens: (itemsQuery.data ?? []).map((item) => ({
          pecaId: item.id,
          precoVenda: Number.parseFloat(prices[item.id] || String(item.precoVenda ?? 0))
        }))
      });
    },
    onSuccess: () => navigate(modoEntrega === "SACOLA" ? "/vendas#aguardando" : "/vendas")
  });

  return (
    <AppShell showTopBar topBarTitle="Venda em lote">
      <Link to="/" className="mb-4 inline-block text-sm font-semibold text-on-surface-variant">
        ← Voltar
      </Link>
      {!pecaIds.length && (
        <p className="rounded-2xl border border-rose-100 bg-white p-4 text-sm">
          Nenhuma peça selecionada. Use <code>?ids=id1,id2</code> na URL.
        </p>
      )}
      {itemsQuery.data && (
        <div className="space-y-4">
          <ClientPicker
            brechoId={brechoId}
            selectedContact={client}
            onSelect={setClient}
            onCreateNew={setClient}
            onClear={() => setClient(null)}
          />

          <Field label="Como foi a entrega?">
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              <button type="button" style={chipStyle(modoEntrega === "IMEDIATA")} onClick={() => setModoEntrega("IMEDIATA")}>
                Já entregue
              </button>
              <button type="button" style={chipStyle(modoEntrega === "SACOLA")} onClick={() => setModoEntrega("SACOLA")}>
                Vai enviar depois
              </button>
            </div>
          </Field>

          {modoEntrega === "SACOLA" && (
            <Field label="Esse preço inclui frete?">
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                <button type="button" style={chipStyle(freteIncluso)} onClick={() => setFreteIncluso(true)}>
                  Sim
                </button>
                <button type="button" style={chipStyle(!freteIncluso)} onClick={() => setFreteIncluso(false)}>
                  Não
                </button>
              </div>
              {!freteIncluso && (
                <small className="text-on-surface-variant">O frete será informado ao enviar a sacola.</small>
              )}
            </Field>
          )}

          <p className="text-sm font-semibold text-gray-700">{precoLabel}</p>
          <ul className="space-y-3">
            {itemsQuery.data.map((item) => (
              <li key={item.id} className="rounded-2xl border border-rose-50 bg-white p-3">
                <p className="font-bold">
                  {item.codigo ? `${item.codigo} · ` : ""}
                  {item.nome}
                </p>
                <Input
                  type="number"
                  step="0.01"
                  placeholder="Preço (R$)"
                  value={prices[item.id] ?? String(item.precoVenda ?? "")}
                  onChange={(e) => setPrices((prev) => ({ ...prev, [item.id]: e.target.value }))}
                />
              </li>
            ))}
          </ul>

          <div className="rounded-2xl bg-rose-50 p-4 text-sm">
            <strong>{itemsQuery.data.length} peça(s)</strong> nesta venda
            {modoEntrega === "SACOLA" && " · entram na sacola da cliente"}
          </div>

          <Button type="button" disabled={!client || sellMutation.isPending} onClick={() => sellMutation.mutate()}>
            Confirmar venda
          </Button>
        </div>
      )}
    </AppShell>
  );
};
