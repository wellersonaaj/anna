import { useMutation, useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { listItems, sellBatch } from "../api/items";
import { ClientPicker, type ClientContact } from "../components/client-picker";
import { AppShell, Button, Input } from "../components/ui";
import { useSessionStore } from "../store/session.store";

export const SellBatchPage = () => {
  const brechoId = useSessionStore((state) => state.brechoId);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const pecaIds = useMemo(() => searchParams.get("ids")?.split(",").filter(Boolean) ?? [], [searchParams]);
  const [client, setClient] = useState<ClientContact | null>(null);
  const [prices, setPrices] = useState<Record<string, string>>({});

  const itemsQuery = useQuery({
    queryKey: ["items", brechoId, "batch", pecaIds.join(",")],
    queryFn: async () => {
      const all = await listItems(brechoId);
      return all.filter((item) => pecaIds.includes(item.id));
    },
    enabled: pecaIds.length > 0
  });

  const sellMutation = useMutation({
    mutationFn: () => {
      if (!client) throw new Error("Selecione a cliente.");
      return sellBatch(brechoId, {
        cliente: {
          nome: client.nome.trim(),
          whatsapp: client.whatsapp.trim() || undefined,
          instagram: client.instagram.trim() || undefined
        },
        itens: (itemsQuery.data ?? []).map((item) => ({
          pecaId: item.id,
          precoVenda: Number.parseFloat(prices[item.id] || String(item.precoVenda ?? 0))
        }))
      });
    },
    onSuccess: () => navigate("/vendas")
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
                  placeholder="Preço"
                  value={prices[item.id] ?? String(item.precoVenda ?? "")}
                  onChange={(e) => setPrices((prev) => ({ ...prev, [item.id]: e.target.value }))}
                />
              </li>
            ))}
          </ul>
          <Button type="button" disabled={!client || sellMutation.isPending} onClick={() => sellMutation.mutate()}>
            Confirmar venda
          </Button>
        </div>
      )}
    </AppShell>
  );
};
