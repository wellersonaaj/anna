import { FormEvent, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useParams } from "react-router-dom";
import { createAdminBrechoUser, getAdminBrecho, resetAdminUserPassword, updateAdminBrecho, type BrechoPayload } from "../../api/admin";
import { ApiError } from "../../api/client";
import { Button, Field, Input, Select } from "../../components/ui";
import { AdminLayout } from "./admin-layout.page";

export const AdminBrechoDetailPage = () => {
  const { brechoId } = useParams();
  const queryClient = useQueryClient();
  const [error, setError] = useState<string | null>(null);
  const [temporaryPassword, setTemporaryPassword] = useState<string | null>(null);
  const [newUser, setNewUser] = useState({ nome: "", telefone: "", email: "", password: "" });

  const brechoQuery = useQuery({
    queryKey: ["admin-brecho", brechoId],
    queryFn: () => getAdminBrecho(brechoId!),
    enabled: Boolean(brechoId)
  });

  const brecho = brechoQuery.data;
  const [edit, setEdit] = useState<Partial<BrechoPayload>>({});

  const updateMutation = useMutation({
    mutationFn: () => updateAdminBrecho(brechoId!, edit),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["admin-brecho", brechoId] });
      await queryClient.invalidateQueries({ queryKey: ["admin-brechos"] });
      setEdit({});
    },
    onError: (err) => setError(err instanceof ApiError ? err.message : "Erro ao salvar brechó.")
  });

  const userMutation = useMutation({
    mutationFn: () =>
      createAdminBrechoUser(brechoId!, {
        ...newUser,
        password: newUser.password || undefined
      }),
    onSuccess: async (result) => {
      setTemporaryPassword(result.temporaryPassword);
      setNewUser({ nome: "", telefone: "", email: "", password: "" });
      await queryClient.invalidateQueries({ queryKey: ["admin-brecho", brechoId] });
    },
    onError: (err) => setError(err instanceof ApiError ? err.message : "Erro ao criar acesso.")
  });

  const onUpdate = (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    updateMutation.mutate();
  };

  const onCreateUser = (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    setTemporaryPassword(null);
    userMutation.mutate();
  };

  const onResetPassword = async (userId: string) => {
    setError(null);
    try {
      const result = await resetAdminUserPassword(userId);
      setTemporaryPassword(result.temporaryPassword);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Erro ao redefinir senha.");
    }
  };

  if (brechoQuery.isLoading) {
    return <AdminLayout>Carregando...</AdminLayout>;
  }

  if (!brecho) {
    return <AdminLayout>Brechó não encontrado.</AdminLayout>;
  }

  const current = { ...brecho, ...edit };

  return (
    <AdminLayout>
      <div className="mb-6">
        <Link to="/admin/brechos" className="text-sm font-bold text-primary underline">
          Voltar
        </Link>
        <h1 className="mt-2 font-headline text-4xl font-extrabold tracking-tight">{brecho.nome}</h1>
        <p className="text-sm text-on-surface-variant">{brecho.telefone}</p>
      </div>

      {error && <p className="mb-4 rounded-2xl bg-red-50 p-3 text-sm font-semibold text-red-700">{error}</p>}
      {temporaryPassword && (
        <div className="mb-4 rounded-3xl border border-amber-200 bg-amber-50 p-4">
          <p className="text-sm font-bold text-amber-900">Senha provisória, aparece só agora:</p>
          <code className="mt-2 block text-2xl font-extrabold text-amber-900">{temporaryPassword}</code>
        </div>
      )}

      <div className="grid gap-5 lg:grid-cols-[1.2fr_0.8fr]">
        <form onSubmit={onUpdate} className="grid gap-4 rounded-3xl border border-rose-100 bg-white p-5">
          <h2 className="text-xl font-extrabold">Dados do brechó</h2>
          <Field label="Nome">
            <Input value={current.nome} onChange={(event) => setEdit({ ...edit, nome: event.target.value })} />
          </Field>
          <Field label="Telefone">
            <Input value={current.telefone} onChange={(event) => setEdit({ ...edit, telefone: event.target.value })} />
          </Field>
          <Field label="Email">
            <Input value={current.email ?? ""} onChange={(event) => setEdit({ ...edit, email: event.target.value })} />
          </Field>
          <Field label="Avatar/logo URL">
            <Input value={current.avatarUrl ?? ""} onChange={(event) => setEdit({ ...edit, avatarUrl: event.target.value })} />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Plano">
              <Select value={current.plano} onChange={(event) => setEdit({ ...edit, plano: event.target.value as BrechoPayload["plano"] })}>
                <option value="TRIAL">Trial</option>
                <option value="BASICO">Básico</option>
                <option value="MEDIO">Médio</option>
                <option value="PRO">Pro</option>
              </Select>
            </Field>
            <Field label="Status">
              <Select value={current.status} onChange={(event) => setEdit({ ...edit, status: event.target.value as BrechoPayload["status"] })}>
                <option value="TRIAL">Trial</option>
                <option value="ATIVO">Ativo</option>
                <option value="SUSPENSO">Suspenso</option>
              </Select>
            </Field>
          </div>
          <Button type="submit" disabled={updateMutation.isPending || Object.keys(edit).length === 0}>
            {updateMutation.isPending ? "Salvando..." : "Salvar alterações"}
          </Button>
        </form>

        <section className="rounded-3xl border border-rose-100 bg-white p-5">
          <h2 className="text-xl font-extrabold">Resumo</h2>
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
              <strong className="block text-lg text-gray-900">{brecho.resumo?.vendasPendentes ?? 0}</strong>
              pendentes
            </div>
          </div>
        </section>
      </div>

      <section className="mt-5 rounded-3xl border border-rose-100 bg-white p-5">
        <h2 className="text-xl font-extrabold">Dona/equipe</h2>
        <form onSubmit={onCreateUser} className="mt-4 grid gap-3 md:grid-cols-5">
          <Input value={newUser.nome} onChange={(event) => setNewUser({ ...newUser, nome: event.target.value })} placeholder="Nome" />
          <Input value={newUser.telefone} onChange={(event) => setNewUser({ ...newUser, telefone: event.target.value })} placeholder="Telefone" required />
          <Input value={newUser.email} onChange={(event) => setNewUser({ ...newUser, email: event.target.value })} placeholder="Email" />
          <Input value={newUser.password} onChange={(event) => setNewUser({ ...newUser, password: event.target.value })} placeholder="Senha opcional" />
          <Button type="submit" disabled={userMutation.isPending}>
            Criar acesso
          </Button>
        </form>

        <div className="mt-5 space-y-3">
          {brecho.memberships?.map((membership) => (
            <article key={membership.id} className="flex flex-col gap-3 rounded-2xl bg-surface-container-low p-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h3 className="font-bold text-gray-900">{membership.user.nome ?? membership.user.telefone}</h3>
                <p className="text-xs font-semibold text-on-surface-variant">
                  {membership.user.telefone} • {membership.role} • {membership.ativo ? "ativo" : "inativo"}
                </p>
              </div>
              <Button type="button" className="h-9" onClick={() => onResetPassword(membership.user.id)}>
                Redefinir senha
              </Button>
            </article>
          ))}
        </div>
      </section>
    </AdminLayout>
  );
};
