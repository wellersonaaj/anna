import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Link } from "react-router-dom";
import { searchClients } from "../api/clients";
import { AppShell, Input } from "../components/ui";
import { useSessionStore } from "../store/session.store";
const initialBadgeColor = (name) => {
    const palette = ["bg-rose-100 text-primary", "bg-blue-50 text-blue-400", "bg-orange-50 text-orange-400", "bg-purple-50 text-purple-400"];
    const idx = name.charCodeAt(0) % palette.length;
    return palette[idx];
};
export const ClientsPage = () => {
    const brechoId = useSessionStore((state) => state.brechoId);
    const [search, setSearch] = useState("");
    const clientsQuery = useQuery({
        queryKey: ["clients-search", brechoId, search],
        queryFn: () => searchClients(brechoId, search)
    });
    return (_jsxs(AppShell, { showTopBar: true, showBottomNav: true, activeTab: "clientes", topBarTitle: "Agente", children: [_jsxs("div", { children: [_jsx("h1", { className: "mb-6 font-headline text-4xl font-extrabold tracking-tight text-gray-900", children: "Clientes" }), _jsxs("div", { className: "group relative", children: [_jsx("div", { className: "pointer-events-none absolute inset-y-0 left-4 flex items-center text-gray-400", children: _jsx("span", { className: "material-symbols-outlined", children: "search" }) }), _jsx(Input, { value: search, onChange: (event) => setSearch(event.target.value), placeholder: "Buscar por nome...", className: "h-14 rounded-2xl border-none bg-white pl-12 shadow-sm focus:ring-2 focus:ring-rose-200" })] })] }), _jsxs("div", { className: "space-y-4", children: [clientsQuery.isLoading && _jsx("p", { children: "Carregando clientes..." }), !clientsQuery.isLoading && !clientsQuery.data?.length && (_jsx("p", { className: "rounded-2xl border border-rose-100 bg-white p-4 text-sm text-on-surface-variant", children: "Nenhum cliente encontrado." })), clientsQuery.data?.map((client) => (_jsxs(Link, { to: `/clientes/${client.id}`, className: "flex items-center gap-4 rounded-[24px] border border-rose-50 bg-white p-4 shadow-sm transition-transform active:scale-[0.98]", children: [_jsx("div", { className: `flex h-14 w-14 items-center justify-center rounded-2xl text-xl font-bold ${initialBadgeColor(client.nome)}`, children: client.nome.slice(0, 1).toUpperCase() }), _jsxs("div", { className: "flex-1", children: [_jsx("h3", { className: "font-bold text-gray-900", children: client.nome }), _jsxs("div", { className: "mt-1 flex items-center gap-3", children: [client.whatsapp && _jsx("span", { className: "material-symbols-outlined text-lg text-[#25D366]", children: "chat" }), client.instagram && _jsx("span", { className: "material-symbols-outlined text-lg text-[#833AB4]", children: "photo_camera" }), !client.whatsapp && !client.instagram && (_jsx("span", { className: "text-xs font-semibold text-gray-400", children: "Sem contato salvo" }))] })] }), _jsx("span", { className: "material-symbols-outlined text-xl text-gray-300", children: "chevron_right" })] }, client.id)))] })] }));
};
