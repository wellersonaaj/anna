import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Link } from "react-router-dom";
import { listAdminBrechos } from "../../api/admin";
import { Button, Input } from "../../components/ui";
import { AdminLayout } from "./admin-layout.page";

export const AdminBrechosPage = () => {
  const [search, setSearch] = useState("");
  const brechosQuery = useQuery({
    queryKey: ["admin-brechos", search],
    queryFn: () => listAdminBrechos({ search })
  });

  return (
    <AdminLayout>
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-headline text-4xl font-extrabold tracking-tight">Brechós</h1>
          <p className="text-sm text-on-surface-variant">Cadastre e acompanhe as operações.</p>
        </div>
        <Link to="/admin/brechos/new">
          <Button type="button">Novo brechó</Button>
        </Link>
      </div>

      <div className="mb-5 rounded-3xl border border-rose-100 bg-white p-4">
        <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar por nome, telefone ou email" />
      </div>

      {brechosQuery.isLoading && <p>Carregando brechós...</p>}
      {!brechosQuery.isLoading && !brechosQuery.data?.length && (
        <p className="rounded-3xl border border-rose-100 bg-white p-5 text-sm text-on-surface-variant">Nenhum brechó encontrado.</p>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        {brechosQuery.data?.map((brecho) => (
          <Link
            key={brecho.id}
            to={`/admin/brechos/${brecho.id}`}
            className="rounded-3xl border border-rose-100 bg-white p-5 shadow-sm transition-transform active:scale-[0.99]"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-xl font-extrabold text-gray-900">{brecho.nome}</h2>
                <p className="text-sm font-semibold text-on-surface-variant">{brecho.telefone}</p>
              </div>
              <span className="rounded-full bg-rose-50 px-3 py-1 text-xs font-bold text-primary">{brecho.status}</span>
            </div>
            <div className="mt-4 grid grid-cols-3 gap-2 text-center text-xs font-semibold text-on-surface-variant">
              <div className="rounded-2xl bg-surface-container-low p-3">
                <strong className="block text-lg text-gray-900">{brecho.resumo?.pecas ?? 0}</strong>
                peças
              </div>
              <div className="rounded-2xl bg-surface-container-low p-3">
                <strong className="block text-lg text-gray-900">{brecho.resumo?.clientes ?? 0}</strong>
                clientes
              </div>
              <div className="rounded-2xl bg-surface-container-low p-3">
                <strong className="block text-lg text-gray-900">{brecho.resumo?.usuarios ?? 0}</strong>
                acessos
              </div>
            </div>
          </Link>
        ))}
      </div>
    </AdminLayout>
  );
};
