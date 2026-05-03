import { FormEvent, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { createAdminBrecho, type BrechoPayload } from "../../api/admin";
import { ApiError } from "../../api/client";
import { Button, Field, Input, Select } from "../../components/ui";
import { AdminLayout } from "./admin-layout.page";

const initialPayload: BrechoPayload = {
  nome: "",
  telefone: "",
  email: "",
  avatarUrl: "",
  plano: "TRIAL",
  status: "TRIAL",
  trialExpiraEm: ""
};

export const AdminBrechoFormPage = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [form, setForm] = useState<BrechoPayload>(initialPayload);
  const [error, setError] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: () => createAdminBrecho(form),
    onSuccess: async (brecho) => {
      await queryClient.invalidateQueries({ queryKey: ["admin-brechos"] });
      navigate(`/admin/brechos/${brecho.id}`);
    },
    onError: (err) => setError(err instanceof ApiError ? err.message : "Erro ao criar brechó.")
  });

  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    mutation.mutate();
  };

  return (
    <AdminLayout>
      <div className="mb-6">
        <h1 className="font-headline text-4xl font-extrabold tracking-tight">Novo brechó</h1>
        <p className="text-sm text-on-surface-variant">Cadastre a operação e depois crie o acesso da dona/equipe.</p>
      </div>

      <form onSubmit={onSubmit} className="grid max-w-2xl gap-4 rounded-3xl border border-rose-100 bg-white p-5">
        <Field label="Nome">
          <Input value={form.nome} onChange={(event) => setForm({ ...form, nome: event.target.value })} required />
        </Field>
        <Field label="Telefone">
          <Input value={form.telefone} onChange={(event) => setForm({ ...form, telefone: event.target.value })} required />
        </Field>
        <Field label="Email">
          <Input value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} />
        </Field>
        <Field label="Avatar/logo URL">
          <Input value={form.avatarUrl} onChange={(event) => setForm({ ...form, avatarUrl: event.target.value })} />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Plano">
            <Select value={form.plano} onChange={(event) => setForm({ ...form, plano: event.target.value as BrechoPayload["plano"] })}>
              <option value="TRIAL">Trial</option>
              <option value="BASICO">Básico</option>
              <option value="MEDIO">Médio</option>
              <option value="PRO">Pro</option>
            </Select>
          </Field>
          <Field label="Status">
            <Select value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value as BrechoPayload["status"] })}>
              <option value="TRIAL">Trial</option>
              <option value="ATIVO">Ativo</option>
              <option value="SUSPENSO">Suspenso</option>
            </Select>
          </Field>
        </div>
        <Field label="Trial expira em">
          <Input
            type="date"
            value={form.trialExpiraEm?.slice(0, 10)}
            onChange={(event) =>
              setForm({ ...form, trialExpiraEm: event.target.value ? new Date(`${event.target.value}T12:00:00.000Z`).toISOString() : "" })
            }
          />
        </Field>

        {error && <p className="rounded-2xl bg-red-50 p-3 text-sm font-semibold text-red-700">{error}</p>}

        <div className="flex gap-3">
          <Button type="submit" disabled={mutation.isPending}>
            {mutation.isPending ? "Criando..." : "Criar brechó"}
          </Button>
          <Button type="button" className="bg-on-surface-variant" onClick={() => navigate("/admin/brechos")}>
            Cancelar
          </Button>
        </div>
      </form>
    </AdminLayout>
  );
};
