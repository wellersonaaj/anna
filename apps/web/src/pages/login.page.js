import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { login } from "../api/auth";
import { ApiError } from "../api/client";
import { Button, Field, Input } from "../components/ui";
import { useSessionStore } from "../store/session.store";
export const LoginPage = () => {
    const navigate = useNavigate();
    const setSession = useSessionStore((state) => state.setSession);
    const [telefone, setTelefone] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const onSubmit = async (event) => {
        event.preventDefault();
        setError(null);
        setIsSubmitting(true);
        try {
            const session = await login({ telefone, password });
            setSession(session);
            navigate(session.user.isFounder ? "/admin/brechos" : "/", { replace: true });
        }
        catch (err) {
            setError(err instanceof ApiError ? err.message : "Não foi possível entrar.");
        }
        finally {
            setIsSubmitting(false);
        }
    };
    return (_jsx("main", { className: "flex min-h-screen items-center justify-center bg-background px-4 text-on-background", children: _jsxs("form", { onSubmit: onSubmit, className: "w-full max-w-sm rounded-3xl border border-rose-100 bg-white p-6 shadow-sm", children: [_jsxs("div", { className: "mb-6", children: [_jsx("p", { className: "text-xs font-bold uppercase tracking-[0.2em] text-primary", children: "Anna" }), _jsx("h1", { className: "mt-2 font-headline text-4xl font-extrabold tracking-tight", children: "Entrar" }), _jsx("p", { className: "mt-2 text-sm text-on-surface-variant", children: "Acesse com o telefone e senha provis\u00F3ria." })] }), _jsxs("div", { className: "space-y-4", children: [_jsx(Field, { label: "Telefone", children: _jsx(Input, { value: telefone, onChange: (event) => setTelefone(event.target.value), placeholder: "DDD + n\u00FAmero" }) }), _jsx(Field, { label: "Senha", children: _jsx(Input, { type: "password", value: password, onChange: (event) => setPassword(event.target.value), placeholder: "Senha provis\u00F3ria" }) })] }), error && _jsx("p", { className: "mt-4 rounded-2xl bg-red-50 p-3 text-sm font-semibold text-red-700", children: error }), _jsx(Button, { type: "submit", disabled: isSubmitting, className: "mt-6 w-full", children: isSubmitting ? "Entrando..." : "Entrar" })] }) }));
};
