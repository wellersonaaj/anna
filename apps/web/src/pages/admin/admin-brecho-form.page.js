import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { createAdminBrecho } from "../../api/admin";
import { ApiError } from "../../api/client";
import { Button, Field, Input, Select } from "../../components/ui";
import { AdminLayout } from "./admin-layout.page";
const initialPayload = {
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
    const [form, setForm] = useState(initialPayload);
    const [error, setError] = useState(null);
    const mutation = useMutation({
        mutationFn: () => createAdminBrecho(form),
        onSuccess: async (brecho) => {
            await queryClient.invalidateQueries({ queryKey: ["admin-brechos"] });
            navigate(`/admin/brechos/${brecho.id}`);
        },
        onError: (err) => setError(err instanceof ApiError ? err.message : "Erro ao criar brechó.")
    });
    const onSubmit = (event) => {
        event.preventDefault();
        setError(null);
        mutation.mutate();
    };
    return (_jsxs(AdminLayout, { children: [_jsxs("div", { className: "mb-6", children: [_jsx("h1", { className: "font-headline text-4xl font-extrabold tracking-tight", children: "Novo brech\u00F3" }), _jsx("p", { className: "text-sm text-on-surface-variant", children: "Cadastre a opera\u00E7\u00E3o e depois crie o acesso da dona/equipe." })] }), _jsxs("form", { onSubmit: onSubmit, className: "grid max-w-2xl gap-4 rounded-3xl border border-rose-100 bg-white p-5", children: [_jsx(Field, { label: "Nome", children: _jsx(Input, { value: form.nome, onChange: (event) => setForm({ ...form, nome: event.target.value }), required: true }) }), _jsx(Field, { label: "Telefone", children: _jsx(Input, { value: form.telefone, onChange: (event) => setForm({ ...form, telefone: event.target.value }), required: true }) }), _jsx(Field, { label: "Email", children: _jsx(Input, { value: form.email, onChange: (event) => setForm({ ...form, email: event.target.value }) }) }), _jsx(Field, { label: "Avatar/logo URL", children: _jsx(Input, { value: form.avatarUrl, onChange: (event) => setForm({ ...form, avatarUrl: event.target.value }) }) }), _jsxs("div", { className: "grid gap-4 sm:grid-cols-2", children: [_jsx(Field, { label: "Plano", children: _jsxs(Select, { value: form.plano, onChange: (event) => setForm({ ...form, plano: event.target.value }), children: [_jsx("option", { value: "TRIAL", children: "Trial" }), _jsx("option", { value: "BASICO", children: "B\u00E1sico" }), _jsx("option", { value: "MEDIO", children: "M\u00E9dio" }), _jsx("option", { value: "PRO", children: "Pro" })] }) }), _jsx(Field, { label: "Status", children: _jsxs(Select, { value: form.status, onChange: (event) => setForm({ ...form, status: event.target.value }), children: [_jsx("option", { value: "TRIAL", children: "Trial" }), _jsx("option", { value: "ATIVO", children: "Ativo" }), _jsx("option", { value: "SUSPENSO", children: "Suspenso" })] }) })] }), _jsx(Field, { label: "Trial expira em", children: _jsx(Input, { type: "date", value: form.trialExpiraEm?.slice(0, 10), onChange: (event) => setForm({ ...form, trialExpiraEm: event.target.value ? new Date(`${event.target.value}T12:00:00.000Z`).toISOString() : "" }) }) }), error && _jsx("p", { className: "rounded-2xl bg-red-50 p-3 text-sm font-semibold text-red-700", children: error }), _jsxs("div", { className: "flex gap-3", children: [_jsx(Button, { type: "submit", disabled: mutation.isPending, children: mutation.isPending ? "Criando..." : "Criar brechó" }), _jsx(Button, { type: "button", className: "bg-on-surface-variant", onClick: () => navigate("/admin/brechos"), children: "Cancelar" })] })] })] }));
};
