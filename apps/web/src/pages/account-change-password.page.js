import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from "react";
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
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(false);
    const [pending, setPending] = useState(false);
    const backTo = isFounder ? "/admin/brechos" : "/relatorios";
    const onSubmit = async (event) => {
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
        }
        catch (err) {
            setError(err instanceof ApiError ? err.message : "Não foi possível alterar a senha.");
        }
        finally {
            setPending(false);
        }
    };
    return (_jsx("main", { className: "min-h-screen bg-background px-4 py-8 text-on-background", children: _jsxs("div", { className: "mx-auto w-full max-w-sm", children: [_jsx(Link, { to: backTo, className: "text-sm font-bold text-primary underline", children: "\u2190 Voltar" }), _jsx("h1", { className: "mt-4 font-headline text-3xl font-extrabold tracking-tight", children: "Trocar senha" }), _jsx("p", { className: "mt-2 text-sm text-on-surface-variant", children: "Informe a senha que voc\u00EA usa hoje e escolha uma nova. Outros aparelhos conectados ser\u00E3o desconectados." }), _jsxs("form", { onSubmit: onSubmit, className: "mt-6 space-y-4 rounded-3xl border border-rose-100 bg-white p-5 shadow-sm", children: [_jsx(Field, { label: "Senha atual", children: _jsx(Input, { type: "password", autoComplete: "current-password", value: currentPassword, onChange: (e) => setCurrentPassword(e.target.value), required: true }) }), _jsx(Field, { label: "Nova senha", children: _jsx(Input, { type: "password", autoComplete: "new-password", value: newPassword, onChange: (e) => setNewPassword(e.target.value), required: true, minLength: 6 }) }), _jsx(Field, { label: "Confirmar nova senha", children: _jsx(Input, { type: "password", autoComplete: "new-password", value: confirmPassword, onChange: (e) => setConfirmPassword(e.target.value), required: true, minLength: 6 }) }), error && _jsx("p", { className: "rounded-2xl bg-red-50 p-3 text-sm font-semibold text-red-700", children: error }), success && (_jsx("p", { className: "rounded-2xl bg-emerald-50 p-3 text-sm font-semibold text-emerald-800", children: "Senha alterada com sucesso." })), _jsx(Button, { type: "submit", disabled: pending, className: "w-full", children: pending ? "Salvando..." : "Salvar nova senha" })] }), success ? (_jsx(Button, { type: "button", className: "mt-4 w-full bg-on-surface-variant", onClick: () => navigate(backTo, { replace: true }), children: "Voltar ao app" })) : null] }) }));
};
