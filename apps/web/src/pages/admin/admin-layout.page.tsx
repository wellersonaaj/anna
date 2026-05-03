import { PropsWithChildren } from "react";
import { Link, useNavigate } from "react-router-dom";
import { logout } from "../../api/auth";
import { Button } from "../../components/ui";
import { useSessionStore } from "../../store/session.store";

export const AdminLayout = ({ children }: PropsWithChildren) => {
  const navigate = useNavigate();
  const clearSession = useSessionStore((state) => state.clearSession);
  const user = useSessionStore((state) => state.user);

  const onLogout = async () => {
    await logout().catch(() => undefined);
    clearSession();
    navigate("/login", { replace: true });
  };

  return (
    <div className="min-h-screen bg-background text-on-background">
      <header className="border-b border-rose-100 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
          <div>
            <Link to="/admin/brechos" className="font-headline text-2xl font-extrabold text-primary">
              Admin Anna
            </Link>
            <p className="text-xs font-semibold text-on-surface-variant">{user?.nome ?? user?.telefone}</p>
          </div>
          <div className="flex items-center gap-2">
            <Link to="/conta/senha" className="text-sm font-bold text-primary underline">
              Trocar senha
            </Link>
            <Button type="button" onClick={onLogout} className="h-9 bg-on-surface-variant px-3">
              Sair
            </Button>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-6">{children}</main>
    </div>
  );
};
