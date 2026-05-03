import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Link, useNavigate } from "react-router-dom";
import { logout } from "../../api/auth";
import { Button } from "../../components/ui";
import { useSessionStore } from "../../store/session.store";
export const AdminLayout = ({ children }) => {
    const navigate = useNavigate();
    const clearSession = useSessionStore((state) => state.clearSession);
    const user = useSessionStore((state) => state.user);
    const onLogout = async () => {
        await logout().catch(() => undefined);
        clearSession();
        navigate("/login", { replace: true });
    };
    return (_jsxs("div", { className: "min-h-screen bg-background text-on-background", children: [_jsx("header", { className: "border-b border-rose-100 bg-white/90 backdrop-blur", children: _jsxs("div", { className: "mx-auto flex max-w-6xl items-center justify-between px-4 py-4", children: [_jsxs("div", { children: [_jsx(Link, { to: "/admin/brechos", className: "font-headline text-2xl font-extrabold text-primary", children: "Admin Anna" }), _jsx("p", { className: "text-xs font-semibold text-on-surface-variant", children: user?.nome ?? user?.telefone })] }), _jsx(Button, { type: "button", onClick: onLogout, className: "h-9 bg-on-surface-variant px-3", children: "Sair" })] }) }), _jsx("main", { className: "mx-auto max-w-6xl px-4 py-6", children: children })] }));
};
