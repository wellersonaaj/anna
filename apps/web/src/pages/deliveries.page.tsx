import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Link } from "react-router-dom";
import { deliverSale, listSalesPendingDelivery } from "../api/items";
import { AppShell, Button, Field, Input, Section } from "../components/ui";
import { useSessionStore } from "../store/session.store";

export const DeliveriesPage = () => {
  const brechoId = useSessionStore((state) => state.brechoId);
  const queryClient = useQueryClient();
  const [rastreioPorVenda, setRastreioPorVenda] = useState<Record<string, string>>({});

  const pendingSalesQuery = useQuery({
    queryKey: ["pending-sales", brechoId],
    queryFn: () => listSalesPendingDelivery(brechoId)
  });

  const deliverMutation = useMutation({
    mutationFn: (vars: { saleId: string; codigoRastreio?: string }) =>
      deliverSale(brechoId, vars.saleId, {
        codigoRastreio: vars.codigoRastreio?.trim() || undefined,
        entregueEm: new Date().toISOString()
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["pending-sales", brechoId] });
      await queryClient.invalidateQueries({ queryKey: ["items", brechoId] });
    }
  });

  return (
    <AppShell>
      <Link to="/">Voltar ao estoque</Link>
      <Section title="Aguardando entrega">
        {pendingSalesQuery.isLoading ? (
          <p>Carregando...</p>
        ) : (
          <div className="stack">
            {pendingSalesQuery.data?.length ? (
              pendingSalesQuery.data.map((sale) => (
                <article key={sale.id} className="card stack" style={{ gap: 8 }}>
                  <strong>{sale.peca.nome}</strong>
                  <small>Cliente: {sale.cliente.nome}</small>
                  <Field label="Código de rastreio (opcional)">
                    <Input
                      placeholder="Ex.: BR123456789BR"
                      value={rastreioPorVenda[sale.id] ?? ""}
                      onChange={(event) =>
                        setRastreioPorVenda((prev) => ({
                          ...prev,
                          [sale.id]: event.target.value
                        }))
                      }
                    />
                  </Field>
                  <Button
                    type="button"
                    disabled={deliverMutation.isPending}
                    onClick={() =>
                      deliverMutation.mutate({
                        saleId: sale.id,
                        codigoRastreio: rastreioPorVenda[sale.id]
                      })
                    }
                  >
                    Marcar entregue
                  </Button>
                </article>
              ))
            ) : (
              <p>Nenhuma venda pendente de entrega.</p>
            )}
          </div>
        )}
      </Section>
    </AppShell>
  );
};
