import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Link } from "react-router-dom";
import { searchClients } from "../api/clients";
import { AppShell, Input } from "../components/ui";
import { useSessionStore } from "../store/session.store";

const initialBadgeColor = (name: string) => {
  const palette = ["bg-rose-100 text-primary", "bg-blue-50 text-blue-400", "bg-orange-50 text-orange-400", "bg-purple-50 text-purple-400"];
  const idx = name.charCodeAt(0) % palette.length;
  return palette[idx];
};

export const ClientsPage = () => {
  const brechoId = useSessionStore((state) => state.brechoId);
  const [search, setSearch] = useState("");

  const clientsQuery = useQuery({
    queryKey: ["clients-search", brechoId, search, 30],
    queryFn: () => searchClients(brechoId, search, { limit: 30 })
  });

  return (
    <AppShell showTopBar showBottomNav activeTab="clientes" topBarTitle="Agente">
      <div>
        <h1 className="mb-6 font-headline text-4xl font-extrabold tracking-tight text-gray-900">Clientes</h1>
        <div className="group relative">
          <div className="pointer-events-none absolute inset-y-0 left-4 flex items-center text-gray-400">
            <span className="material-symbols-outlined">search</span>
          </div>
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Buscar por nome, WhatsApp ou Instagram..."
            className="h-14 rounded-2xl border-none bg-white pl-12 shadow-sm focus:ring-2 focus:ring-rose-200"
          />
        </div>
      </div>

      <div className="space-y-4">
        {clientsQuery.isLoading && <p>Carregando clientes...</p>}
        {!clientsQuery.isLoading && !clientsQuery.data?.length && (
          <p className="rounded-2xl border border-rose-100 bg-white p-4 text-sm text-on-surface-variant">
            Nenhum cliente encontrado.
          </p>
        )}
        {clientsQuery.data?.map((client) => (
          <Link
            to={`/clientes/${client.id}`}
            key={client.id}
            className="flex items-center gap-4 rounded-[24px] border border-rose-50 bg-white p-4 shadow-sm transition-transform active:scale-[0.98]"
          >
            <div className={`flex h-14 w-14 items-center justify-center rounded-2xl text-xl font-bold ${initialBadgeColor(client.nome)}`}>
              {client.nome.slice(0, 1).toUpperCase()}
            </div>
            <div className="flex-1">
              <h3 className="font-bold text-gray-900">{client.nome}</h3>
              <div className="mt-1 grid gap-0.5 text-xs font-semibold text-gray-500">
                <span>WhatsApp {client.whatsapp || "não informado"}</span>
                <span>Instagram {client.instagram ? `@${client.instagram}` : "não informado"}</span>
              </div>
            </div>
            <span className="material-symbols-outlined text-xl text-gray-300">chevron_right</span>
          </Link>
        ))}
      </div>
    </AppShell>
  );
};
