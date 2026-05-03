import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useParams } from "react-router-dom";
import { createAdminBrechoUser, getAdminBrecho, resetAdminUserPassword, updateAdminBrecho } from "../../api/admin";
import { ApiError } from "../../api/client";
import { Button, Field, Input, Select } from "../../components/ui";
import { AdminLayout } from "./admin-layout.page";
export const AdminBrechoDetailPage = () => {
    const { brechoId } = useParams();
    const queryClient = useQueryClient();
    const [error, setError] = useState(null);
    const [temporaryPassword, setTemporaryPassword] = useState(null);
    const [newUser, setNewUser] = useState({ nome: "", telefone: "", email: "", password: "" });
    const brechoQuery = useQuery({
        queryKey: ["admin-brecho", brechoId],
        queryFn: () => getAdminBrecho(brechoId),
        enabled: Boolean(brechoId)
    });
    const brecho = brechoQuery.data;
    const [edit, setEdit] = useState({});
    const updateMutation = useMutation({
        mutationFn: () => updateAdminBrecho(brechoId, edit),
        onSuccess: async () => {
            await queryClient.invalidateQueries({ queryKey: ["admin-brecho", brechoId] });
            await queryClient.invalidateQueries({ queryKey: ["admin-brechos"] });
            setEdit({});
        },
        onError: (err) => setError(err instanceof ApiError ? err.message : "Erro ao salvar brechó.")
    });
    const userMutation = useMutation({
        mutationFn: () => createAdminBrechoUser(brechoId, {
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
    const onUpdate = (event) => {
        event.preventDefault();
        setError(null);
        updateMutation.mutate();
    };
    const onCreateUser = (event) => {
        event.preventDefault();
        setError(null);
        setTemporaryPassword(null);
        userMutation.mutate();
    };
    const onResetPassword = async (userId) => {
        setError(null);
        try {
            const result = await resetAdminUserPassword(userId);
            setTemporaryPassword(result.temporaryPassword);
        }
        catch (err) {
            setError(err instanceof ApiError ? err.message : "Erro ao redefinir senha.");
        }
    };
    if (brechoQuery.isLoading) {
        return _jsx(AdminLayout, { children: "Carregando..." });
    }
    if (!brecho) {
        return _jsx(AdminLayout, { children: "Brech\u00F3 n\u00E3o encontrado." });
    }
    const current = { ...brecho, ...edit };
    return (_jsxs(AdminLayout, { children: [_jsxs("div", { className: "mb-6", children: [_jsx(Link, { to: "/admin/brechos", className: "text-sm font-bold text-primary underline", children: "Voltar" }), _jsx("h1", { className: "mt-2 font-headline text-4xl font-extrabold tracking-tight", children: brecho.nome }), _jsx("p", { className: "text-sm text-on-surface-variant", children: brecho.telefone })] }), error && _jsx("p", { className: "mb-4 rounded-2xl bg-red-50 p-3 text-sm font-semibold text-red-700", children: error }), temporaryPassword && (_jsxs("div", { className: "mb-4 rounded-3xl border border-amber-200 bg-amber-50 p-4", children: [_jsx("p", { className: "text-sm font-bold text-amber-900", children: "Senha provis\u00F3ria, aparece s\u00F3 agora:" }), _jsx("code", { className: "mt-2 block text-2xl font-extrabold text-amber-900", children: temporaryPassword })] })), _jsxs("div", { className: "grid gap-5 lg:grid-cols-[1.2fr_0.8fr]", children: [_jsxs("form", { onSubmit: onUpdate, className: "grid gap-4 rounded-3xl border border-rose-100 bg-white p-5", children: [_jsx("h2", { className: "text-xl font-extrabold", children: "Dados do brech\u00F3" }), _jsx(Field, { label: "Nome", children: _jsx(Input, { value: current.nome, onChange: (event) => setEdit({ ...edit, nome: event.target.value }) }) }), _jsx(Field, { label: "Telefone", children: _jsx(Input, { value: current.telefone, onChange: (event) => setEdit({ ...edit, telefone: event.target.value }) }) }), _jsx(Field, { label: "Email", children: _jsx(Input, { value: current.email ?? "", onChange: (event) => setEdit({ ...edit, email: event.target.value }) }) }), _jsx(Field, { label: "Avatar/logo URL", children: _jsx(Input, { value: current.avatarUrl ?? "", onChange: (event) => setEdit({ ...edit, avatarUrl: event.target.value }) }) }), _jsxs("div", { className: "grid gap-4 sm:grid-cols-2", children: [_jsx(Field, { label: "Plano", children: _jsxs(Select, { value: current.plano, onChange: (event) => setEdit({ ...edit, plano: event.target.value }), children: [_jsx("option", { value: "TRIAL", children: "Trial" }), _jsx("option", { value: "BASICO", children: "B\u00E1sico" }), _jsx("option", { value: "MEDIO", children: "M\u00E9dio" }), _jsx("option", { value: "PRO", children: "Pro" })] }) }), _jsx(Field, { label: "Status", children: _jsxs(Select, { value: current.status, onChange: (event) => setEdit({ ...edit, status: event.target.value }), children: [_jsx("option", { value: "TRIAL", children: "Trial" }), _jsx("option", { value: "ATIVO", children: "Ativo" }), _jsx("option", { value: "SUSPENSO", children: "Suspenso" })] }) })] }), _jsx(Button, { type: "submit", disabled: updateMutation.isPending || Object.keys(edit).length === 0, children: updateMutation.isPending ? "Salvando..." : "Salvar alterações" })] }), _jsxs("section", { className: "rounded-3xl border border-rose-100 bg-white p-5", children: [_jsx("h2", { className: "text-xl font-extrabold", children: "Resumo" }), _jsxs("div", { className: "mt-4 grid grid-cols-3 gap-2 text-center text-xs font-semibold text-on-surface-variant", children: [_jsxs("div", { className: "rounded-2xl bg-surface-container-low p-3", children: [_jsx("strong", { className: "block text-lg text-gray-900", children: brecho.resumo?.pecas ?? 0 }), "pe\u00E7as"] }), _jsxs("div", { className: "rounded-2xl bg-surface-container-low p-3", children: [_jsx("strong", { className: "block text-lg text-gray-900", children: brecho.resumo?.clientes ?? 0 }), "clientes"] }), _jsxs("div", { className: "rounded-2xl bg-surface-container-low p-3", children: [_jsx("strong", { className: "block text-lg text-gray-900", children: brecho.resumo?.vendasPendentes ?? 0 }), "pendentes"] })] })] })] }), _jsxs("section", { className: "mt-5 rounded-3xl border border-rose-100 bg-white p-5", children: [_jsx("h2", { className: "text-xl font-extrabold", children: "Dona/equipe" }), _jsxs("form", { onSubmit: onCreateUser, className: "mt-4 grid gap-3 md:grid-cols-5", children: [_jsx(Input, { value: newUser.nome, onChange: (event) => setNewUser({ ...newUser, nome: event.target.value }), placeholder: "Nome" }), _jsx(Input, { value: newUser.telefone, onChange: (event) => setNewUser({ ...newUser, telefone: event.target.value }), placeholder: "Telefone", required: true }), _jsx(Input, { value: newUser.email, onChange: (event) => setNewUser({ ...newUser, email: event.target.value }), placeholder: "Email" }), _jsx(Input, { value: newUser.password, onChange: (event) => setNewUser({ ...newUser, password: event.target.value }), placeholder: "Senha opcional" }), _jsx(Button, { type: "submit", disabled: userMutation.isPending, children: "Criar acesso" })] }), _jsx("div", { className: "mt-5 space-y-3", children: brecho.memberships?.map((membership) => (_jsxs("article", { className: "flex flex-col gap-3 rounded-2xl bg-surface-container-low p-4 sm:flex-row sm:items-center sm:justify-between", children: [_jsxs("div", { children: [_jsx("h3", { className: "font-bold text-gray-900", children: membership.user.nome ?? membership.user.telefone }), _jsxs("p", { className: "text-xs font-semibold text-on-surface-variant", children: [membership.user.telefone, " \u2022 ", membership.role, " \u2022 ", membership.ativo ? "ativo" : "inativo"] })] }), _jsx(Button, { type: "button", className: "h-9", onClick: () => onResetPassword(membership.user.id), children: "Redefinir senha" })] }, membership.id))) })] })] }));
};
