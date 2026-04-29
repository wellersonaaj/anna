import { useQuery } from "@tanstack/react-query";
import { Link, useParams } from "react-router-dom";
import { getClientById } from "../api/clients";
import { AppShell, formatCurrency } from "../components/ui";
import { useSessionStore } from "../store/session.store";

const toNumber = (value: string | number | null | undefined) => {
  if (value === null || value === undefined) {
    return 0;
  }
  const parsed = typeof value === "string" ? Number(value.replace(",", ".")) : Number(value);
  return Number.isNaN(parsed) ? 0 : parsed;
};

export const ClientDetailPage = () => {
  const { clientId } = useParams<{ clientId: string }>();
  const brechoId = useSessionStore((state) => state.brechoId);

  const clientQuery = useQuery({
    queryKey: ["client", brechoId, clientId],
    queryFn: () => getClientById(brechoId, clientId!),
    enabled: Boolean(clientId)
  });

  const client = clientQuery.data;
  const totalSpent = (client?.vendas ?? []).reduce((sum, sale) => sum + toNumber(sale.ganhosTotal), 0);

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

      {client && (
        <>
          <section className="mb-2 flex flex-col items-center rounded-3xl border border-rose-50 bg-white p-6 shadow-sm">
            <div className="mb-4 flex h-24 w-24 items-center justify-center rounded-full border-4 border-white bg-rose-100 text-4xl font-bold text-primary shadow-md">
              {client.nome.slice(0, 1).toUpperCase()}
            </div>
            <h2 className="text-center font-headline text-2xl font-extrabold text-gray-900">{client.nome}</h2>
            <p className="mb-5 text-sm font-medium text-gray-500">
              Cliente desde {new Date(client.criadoEm ?? Date.now()).toLocaleDateString("pt-BR")}
            </p>
            <div className="flex w-full gap-4">
              <a
                className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-[#25D366]/10 px-4 py-3 font-bold text-[#128C7E]"
                href={client.whatsapp ? `https://wa.me/${client.whatsapp}` : "#"}
                target="_blank"
                rel="noreferrer"
              >
                <span className="material-symbols-outlined">chat</span>
                WhatsApp
              </a>
              <a
                className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-[#E1306C]/10 px-4 py-3 font-bold text-[#C13584]"
                href={client.instagram ? `https://instagram.com/${client.instagram}` : "#"}
                target="_blank"
                rel="noreferrer"
              >
                <span className="material-symbols-outlined">photo_camera</span>
                Instagram
              </a>
            </div>
          </section>

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
              <span className="rounded-full bg-rose-50 px-3 py-1 text-xs font-bold uppercase text-primary">Recentes</span>
            </div>
            <div className="space-y-3">
              {client.vendas.length === 0 && (
                <p className="rounded-2xl border border-rose-100 bg-white p-4 text-sm text-on-surface-variant">
                  Este cliente ainda não possui compras registradas.
                </p>
              )}
              {client.vendas.map((sale) => (
                <div key={sale.id} className="flex items-center gap-4 rounded-2xl border border-rose-50 bg-white p-3 shadow-sm">
                  <div className="flex h-16 w-16 items-center justify-center rounded-xl bg-surface-container-low text-xs text-outline">
                    Peça
                  </div>
                  <div className="flex-1">
                    <h4 className="font-bold text-gray-900">{sale.peca.nome}</h4>
                    <p className="text-xs font-medium text-gray-500">
                      {new Date(sale.criadoEm).toLocaleDateString("pt-BR")} •{" "}
                      {new Date(sale.criadoEm).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-extrabold text-primary">{formatCurrency(sale.ganhosTotal)}</p>
                    <span className="rounded-md bg-green-50 px-2 py-0.5 text-[10px] font-bold text-green-600">PAGO</span>
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
