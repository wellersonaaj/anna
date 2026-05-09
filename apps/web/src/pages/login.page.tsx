import { FormEvent, useState } from "react";
import { useNavigate } from "react-router-dom";
import { login } from "../api/auth";
import { ApiError } from "../api/client";
import { SHOW_HOME_SCREEN_PROMPT_KEY } from "../lib/pwa/prompt-keys";
import { Button, Field, Input } from "../components/ui";
import { useSessionStore } from "../store/session.store";

export const LoginPage = () => {
  const navigate = useNavigate();
  const setSession = useSessionStore((state) => state.setSession);
  const [telefone, setTelefone] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      const session = await login({ telefone, password });
      setSession(session);
      sessionStorage.setItem(SHOW_HOME_SCREEN_PROMPT_KEY, "1");
      navigate(session.user.isFounder ? "/admin/brechos" : "/", { replace: true });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Não foi possível entrar.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4 text-on-background">
      <form onSubmit={onSubmit} className="w-full max-w-sm rounded-3xl border border-rose-100 bg-white p-6 shadow-sm">
        <div className="mb-6">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-primary">Anna</p>
          <h1 className="mt-2 font-headline text-4xl font-extrabold tracking-tight">Entrar</h1>
          <p className="mt-2 text-sm text-on-surface-variant">Acesse com o telefone e senha provisória.</p>
        </div>

        <div className="space-y-4">
          <Field label="Telefone">
            <Input value={telefone} onChange={(event) => setTelefone(event.target.value)} placeholder="DDD + número" />
          </Field>
          <Field label="Senha">
            <Input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Senha provisória"
            />
          </Field>
        </div>

        {error && <p className="mt-4 rounded-2xl bg-red-50 p-3 text-sm font-semibold text-red-700">{error}</p>}

        <Button type="submit" disabled={isSubmitting} className="mt-6 w-full">
          {isSubmitting ? "Entrando..." : "Entrar"}
        </Button>
      </form>
    </main>
  );
};
