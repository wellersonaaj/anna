import { isClientContactEnriched } from "@anna/shared";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { getClientById, updateClient } from "../api/clients";
import { ClientContactFields } from "../components/client-contact-fields";
import { EditSaleForm } from "../components/edit-sale-form";
import { formatFreteInclusoLabel } from "../components/frete-incluso-detail";
import { AppShell, Button, formatCurrency } from "../components/ui";
import { parseMoneyLike } from "../lib/money";
import { useSessionStore } from "../store/session.store";

const toNumber = (value: string | number | null | undefined) => {
  if (value === null || value === undefined) {
    return 0;
  }
  const parsed = parseMoneyLike(value);
  return Number.isNaN(parsed) ? 0 : parsed;
};

export const ClientDetailPage = () => {
  const { clientId } = useParams<{ clientId: string }>();
  const brechoId = useSessionStore((state) => state.brechoId);
  const queryClient = useQueryClient();
  const [editingContact, setEditingContact] = useState(false);
  const [contactDraft, setContactDraft] = useState({ nome: "", whatsapp: "", instagram: "" });
  const [editingSale, setEditingSale] = useState<{
    id: string;
    pecaNome: string;
    preco: number;
    precoCusto?: number | null;
    freteIncluso: boolean;
    freteInclusoValor?: number | null;
    canEditFreteIncluso: boolean;
  } | null>(null);

  const clientQuery = useQuery({
    queryKey: ["client", brechoId, clientId],
    queryFn: () => getClientById(brechoId, clientId!),
    enabled: Boolean(clientId)
  });

  const updateMutation = useMutation({
    mutationFn: (payload: { nome?: string; whatsapp?: string; instagram?: string }) =>
      updateClient(brechoId, clientId!, payload),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["client", brechoId, clientId] });
      setEditingContact(false);
    }
  });

  const client = clientQuery.data;
  const openSacola = client?.sacolas?.[0];
  const totalSpent = (client?.vendas ?? []).reduce((sum, sale) => sum + toNumber(sale.ganhosTotal), 0);
  const profileIncomplete = client && !isClientContactEnriched(client);

  const startEditContact = () => {
    if (!client) return;
    setContactDraft({
      nome: client.nome,
      whatsapp: client.whatsapp ?? "",
      instagram: client.instagram ?? ""
    });
    setEditingContact(true);
  };

  return (
    <AppShell showTopBar showBottomNav activeTab="clientes" topBarTitle={client?.nome ?? "Cliente"}>
      <div className="mb-2 flex items-center gap-3">
        <Link to="/clientes" className="text-sm font-semibold text-on-surface-variant">
          ← Voltar
        </Link>
      </div>

      {clientQuery.isLoading && <p>Carregando cliente...</p>}
      {clientQuery.isError && (
        <p className="rounded-2xl border border-rose-100 bg-white p-4 text-sm text-on-surface-variant">
          Não foi possível carregar este cliente.
        </p>
      )}

      {editingSale && clientId && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center">
          <div className="w-full max-w-md">
            <EditSaleForm
              brechoId={brechoId}
              saleId={editingSale.id}
              pecaNome={editingSale.pecaNome}
              initialPreco={editingSale.preco}
              initialPrecoCusto={editingSale.precoCusto}
              initialFreteIncluso={editingSale.freteIncluso}
              initialFreteInclusoValor={editingSale.freteInclusoValor}
              canEditFreteIncluso={editingSale.canEditFreteIncluso}
              onClose={() => setEditingSale(null)}
              onSuccess={async () => {
                await queryClient.invalidateQueries({ queryKey: ["client", brechoId, clientId] });
              }}
            />
          </div>
        </div>
      )}

      {client && (
        <>
          <section className="mb-2 flex flex-col items-center rounded-3xl border border-rose-50 bg-white p-6 shadow-sm">
            <div className="mb-4 flex h-24 w-24 items-center justify-center rounded-full border-4 border-white bg-rose-100 text-4xl font-bold text-primary shadow-md">
              {client.nome.slice(0, 1).toUpperCase()}
            </div>
            <h2 className="text-center font-headline text-2xl font-extrabold text-gray-900">{client.nome}</h2>
            {profileIncomplete && (
              <span className="mt-2 rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-800">
                Perfil incompleto
              </span>
            )}
            <p className="mb-5 mt-2 text-sm font-medium text-gray-500">
              Cliente desde {new Date(client.criadoEm ?? Date.now()).toLocaleDateString("pt-BR")}
            </p>
            {!editingContact ? (
              <Button type="button" className="mb-4 !h-9 !min-h-0 text-xs" onClick={startEditContact}>
                Completar contato
              </Button>
            ) : (
              <div className="mb-4 w-full space-y-3">
                <ClientContactFields
                  values={contactDraft}
                  onChange={(field, value) => setContactDraft((prev) => ({ ...prev, [field]: value }))}
                />
                <div className="flex gap-2">
                  <Button
                    type="button"
                    disabled={updateMutation.isPending}
                    onClick={() =>
                      updateMutation.mutate({
                        nome: contactDraft.nome.trim(),
                        whatsapp: contactDraft.whatsapp.trim() || undefined,
                        instagram: contactDraft.instagram.trim() || undefined
                      })
                    }
                  >
                    Salvar
                  </Button>
                  <Button type="button" className="!bg-white !text-primary ring-1 ring-rose-100" onClick={() => setEditingContact(false)}>
                    Cancelar
                  </Button>
                </div>
              </div>
            )}
            <div className="flex w-full gap-4">
              <a
                className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-[#25D366]/10 px-4 py-3 font-bold text-[#128C7E]"
                href={client.whatsapp ? `https://wa.me/${client.whatsapp}` : "#"}
                target="_blank"
                rel="noreferrer"
              >
                WhatsApp
              </a>
              <a
                className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-[#E1306C]/10 px-4 py-3 font-bold text-[#C13584]"
                href={client.instagram ? `https://instagram.com/${client.instagram}` : "#"}
                target="_blank"
                rel="noreferrer"
              >
                Instagram
              </a>
            </div>
          </section>

          {openSacola && openSacola.vendas.length > 0 && (
            <section className="mb-6 rounded-3xl border border-rose-100 bg-white p-4 shadow-sm">
              <h3 className="mb-2 text-lg font-bold text-gray-800">Sacola aberta</h3>
              <p className="mb-3 text-sm text-gray-500">{openSacola.vendas.length} peça(s) aguardando envio</p>
              <ul className="space-y-1 text-sm">
                {openSacola.vendas.map((v) => (
                  <li key={v.id}>
                    {v.peca.codigo ? `${v.peca.codigo} · ` : ""}
                    {v.peca.nome}
                  </li>
                ))}
              </ul>
              <Link to="/vendas#aguardando" className="mt-3 inline-block text-sm font-bold text-primary">
                Gerenciar envio →
              </Link>
            </section>
          )}

          <section className="mb-6 grid grid-cols-2 gap-4">
            <div className="rounded-3xl border border-rose-50 bg-white p-4 shadow-sm">
              <p className="mb-1 text-xs font-bold uppercase tracking-wider text-gray-400">Total Gasto</p>
              <p className="text-xl font-extrabold text-primary">{formatCurrency(totalSpent)}</p>
            </div>
            <div className="rounded-3xl border border-rose-50 bg-white p-4 shadow-sm">
              <p className="mb-1 text-xs font-bold uppercase tracking-wider text-gray-400">Peças Compradas</p>
              <p className="text-xl font-extrabold text-gray-900">{client.vendas.length} itens</p>
            </div>
          </section>

          <section>
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-bold text-gray-800">Histórico de Peças</h3>
            </div>
            <div className="space-y-3">
              {client.vendas.length === 0 && (
                <p className="rounded-2xl border border-rose-100 bg-white p-4 text-sm text-on-surface-variant">
                  Este cliente ainda não possui compras registradas.
                </p>
              )}
              {client.vendas.map((sale) => (
                <div key={sale.id} className="flex items-center gap-4 rounded-2xl border border-rose-50 bg-white p-3 shadow-sm">
                  <div className="flex-1">
                    <h4 className="font-bold text-gray-900">
                      {sale.peca.codigo ? `${sale.peca.codigo} · ` : ""}
                      {sale.peca.nome}
                    </h4>
                    <p className="text-xs font-medium text-gray-500">
                      {new Date(sale.criadoEm).toLocaleDateString("pt-BR")}
                      {sale.freteIncluso && (
                        <> · {formatFreteInclusoLabel(sale.freteIncluso, sale.freteInclusoValor)}</>
                      )}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-extrabold text-primary">{formatCurrency(sale.ganhosTotal)}</p>
                    <span
                      className={`rounded-md px-2 py-0.5 text-[10px] font-bold ${
                        sale.entrega ? "bg-green-50 text-green-600" : "bg-amber-50 text-amber-700"
                      }`}
                    >
                      {sale.entrega ? "ENTREGUE" : "AGUARDANDO ENVIO"}
                    </span>
                    <button
                      type="button"
                      className="mt-1 block w-full text-[10px] font-bold uppercase text-primary underline"
                      onClick={() =>
                        setEditingSale({
                          id: sale.id,
                          pecaNome: sale.peca.nome,
                          preco: toNumber(sale.precoVenda),
                          precoCusto: sale.precoCusto != null ? toNumber(sale.precoCusto) : null,
                          freteIncluso: sale.freteIncluso ?? false,
                          freteInclusoValor: sale.freteInclusoValor
                            ? toNumber(sale.freteInclusoValor)
                            : null,
                          canEditFreteIncluso: !sale.entrega
                        })
                      }
                    >
                      Editar
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </>
      )}
    </AppShell>
  );
};
