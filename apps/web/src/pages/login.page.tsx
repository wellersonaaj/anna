import { FormEvent, useEffect, useState } from "react";
import { createPortal } from "react-dom";
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
  const [isForgotPasswordModalOpen, setIsForgotPasswordModalOpen] = useState(false);
  const forgotPasswordWhatsappUrl =
    "https://wa.me/5511961971107?text=" +
    encodeURIComponent("Oi, esqueci minha senha para logar na Miranda, me ajuda!");

  useEffect(() => {
    if (!isForgotPasswordModalOpen) {
      return;
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsForgotPasswordModalOpen(false);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isForgotPasswordModalOpen]);

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
        <button
          type="button"
          onClick={() => setIsForgotPasswordModalOpen(true)}
          className="mt-3 block w-full text-center text-sm font-semibold text-primary underline-offset-2 hover:underline"
        >
          Esqueceu a senha?
        </button>
      </form>
      {isForgotPasswordModalOpen &&
        typeof document !== "undefined" &&
        createPortal(
          <>
            <button
              type="button"
              aria-label="Fechar modal"
              className="fixed inset-0 z-[200] bg-black/35"
              onClick={() => setIsForgotPasswordModalOpen(false)}
            />
            <div
              role="dialog"
              aria-modal="true"
              aria-labelledby="forgot-password-title"
              className="fixed bottom-0 left-0 right-0 z-[201] rounded-t-3xl border border-rose-100 bg-white p-5 shadow-[0_-8px_32px_rgba(26,26,46,0.12)]"
            >
              <div className="mx-auto w-full max-w-sm">
                <h2 id="forgot-password-title" className="font-headline text-xl font-extrabold tracking-tight text-on-background">
                  Esqueceu a senha?
                </h2>
                <p className="mt-2 text-sm text-on-surface-variant">Fale com a Cátia para recuperar seu acesso.</p>
                <a
                  href={forgotPasswordWhatsappUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-5 inline-flex h-11 w-full items-center justify-center rounded-xl bg-primary px-4 text-sm font-bold text-white transition-opacity active:scale-[0.98]"
                >
                  Falar com a cátia!
                </a>
                <button
                  type="button"
                  className="mt-2 h-11 w-full rounded-xl text-sm font-bold text-on-surface-variant underline-offset-2 hover:underline"
                  onClick={() => setIsForgotPasswordModalOpen(false)}
                >
                  Fechar
                </button>
              </div>
            </div>
          </>,
          document.body
        )}
    </main>
  );
};
