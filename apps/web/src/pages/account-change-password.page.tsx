import { FormEvent, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { changePassword } from "../api/auth";
import { ApiError } from "../api/client";
import { Button, Field, Input } from "../components/ui";
import { useSessionStore } from "../store/session.store";

export const AccountChangePasswordPage = () => {
  const navigate = useNavigate();
  const isFounder = useSessionStore((s) => s.user?.isFounder);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [pending, setPending] = useState(false);

  const backTo = isFounder ? "/admin/brechos" : "/relatorios";

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    setSuccess(false);
    if (newPassword !== confirmPassword) {
      setError("A confirmação da nova senha não confere.");
      return;
    }
    setPending(true);
    try {
      await changePassword({ currentPassword, newPassword });
      setSuccess(true);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Não foi possível alterar a senha.");
    } finally {
      setPending(false);
    }
  };

  return (
    <main className="min-h-screen bg-background px-4 py-8 text-on-background">
      <div className="mx-auto w-full max-w-sm">
        <Link to={backTo} className="text-sm font-bold text-primary underline">
          ← Voltar
        </Link>
        <h1 className="mt-4 font-headline text-3xl font-extrabold tracking-tight">Trocar senha</h1>
        <p className="mt-2 text-sm text-on-surface-variant">
          Informe a senha que você usa hoje e escolha uma nova. Outros aparelhos conectados serão desconectados.
        </p>

        <form onSubmit={onSubmit} className="mt-6 space-y-4 rounded-3xl border border-rose-100 bg-white p-5 shadow-sm">
          <Field label="Senha atual">
            <Input
              type="password"
              autoComplete="current-password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              required
            />
          </Field>
          <Field label="Nova senha">
            <Input
              type="password"
              autoComplete="new-password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
              minLength={6}
            />
          </Field>
          <Field label="Confirmar nova senha">
            <Input
              type="password"
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              minLength={6}
            />
          </Field>

          {error && <p className="rounded-2xl bg-red-50 p-3 text-sm font-semibold text-red-700">{error}</p>}
          {success && (
            <p className="rounded-2xl bg-emerald-50 p-3 text-sm font-semibold text-emerald-800">Senha alterada com sucesso.</p>
          )}

          <Button type="submit" disabled={pending} className="w-full">
            {pending ? "Salvando..." : "Salvar nova senha"}
          </Button>
        </form>

        {success ? (
          <Button type="button" className="mt-4 w-full bg-on-surface-variant" onClick={() => navigate(backTo, { replace: true })}>
            Voltar ao app
          </Button>
        ) : null}
      </div>
    </main>
  );
};
