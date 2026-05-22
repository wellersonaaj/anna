import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { isClientContactEnriched } from "@anna/shared";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { getClientById, updateClient } from "../api/clients";
import { ClientContactFields } from "../components/client-contact-fields";
import { AppShell, Button, formatCurrency } from "../components/ui";
import { parseMoneyLike } from "../lib/money";
import { useSessionStore } from "../store/session.store";
const toNumber = (value) => {
    if (value === null || value === undefined) {
        return 0;
    }
    const parsed = parseMoneyLike(value);
    return Number.isNaN(parsed) ? 0 : parsed;
};
export const ClientDetailPage = () => {
    const { clientId } = useParams();
    const brechoId = useSessionStore((state) => state.brechoId);
    const queryClient = useQueryClient();
    const [editingContact, setEditingContact] = useState(false);
    const [contactDraft, setContactDraft] = useState({ nome: "", whatsapp: "", instagram: "" });
    const clientQuery = useQuery({
        queryKey: ["client", brechoId, clientId],
        queryFn: () => getClientById(brechoId, clientId),
        enabled: Boolean(clientId)
    });
    const updateMutation = useMutation({
        mutationFn: (payload) => updateClient(brechoId, clientId, payload),
        onSuccess: async () => {
            await queryClient.invalidateQueries({ queryKey: ["client", brechoId, clientId] });
            setEditingContact(false);
        }
    });
    const client = clientQuery.data;
    const openSacola = client?.sacolas?.[0];
    const totalSpent = (client?.vendas ?? []).reduce((sum, sale) => sum + toNumber(sale.ganhosTotal), 0);
    const profileIncomplete = client && !isClientContactEnriched(client);
    const startEditContact = () => {
        if (!client)
            return;
        setContactDraft({
            nome: client.nome,
            whatsapp: client.whatsapp ?? "",
            instagram: client.instagram ?? ""
        });
        setEditingContact(true);
    };
    return (_jsxs(AppShell, { showTopBar: true, showBottomNav: true, activeTab: "clientes", topBarTitle: client?.nome ?? "Cliente", children: [_jsx("div", { className: "mb-2 flex items-center gap-3", children: _jsx(Link, { to: "/clientes", className: "text-sm font-semibold text-on-surface-variant", children: "\u2190 Voltar" }) }), clientQuery.isLoading && _jsx("p", { children: "Carregando cliente..." }), clientQuery.isError && (_jsx("p", { className: "rounded-2xl border border-rose-100 bg-white p-4 text-sm text-on-surface-variant", children: "N\u00E3o foi poss\u00EDvel carregar este cliente." })), client && (_jsxs(_Fragment, { children: [_jsxs("section", { className: "mb-2 flex flex-col items-center rounded-3xl border border-rose-50 bg-white p-6 shadow-sm", children: [_jsx("div", { className: "mb-4 flex h-24 w-24 items-center justify-center rounded-full border-4 border-white bg-rose-100 text-4xl font-bold text-primary shadow-md", children: client.nome.slice(0, 1).toUpperCase() }), _jsx("h2", { className: "text-center font-headline text-2xl font-extrabold text-gray-900", children: client.nome }), profileIncomplete && (_jsx("span", { className: "mt-2 rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-800", children: "Perfil incompleto" })), _jsxs("p", { className: "mb-5 mt-2 text-sm font-medium text-gray-500", children: ["Cliente desde ", new Date(client.criadoEm ?? Date.now()).toLocaleDateString("pt-BR")] }), !editingContact ? (_jsx(Button, { type: "button", className: "mb-4 !h-9 !min-h-0 text-xs", onClick: startEditContact, children: "Completar contato" })) : (_jsxs("div", { className: "mb-4 w-full space-y-3", children: [_jsx(ClientContactFields, { values: contactDraft, onChange: (field, value) => setContactDraft((prev) => ({ ...prev, [field]: value })) }), _jsxs("div", { className: "flex gap-2", children: [_jsx(Button, { type: "button", disabled: updateMutation.isPending, onClick: () => updateMutation.mutate({
                                                    nome: contactDraft.nome.trim(),
                                                    whatsapp: contactDraft.whatsapp.trim() || undefined,
                                                    instagram: contactDraft.instagram.trim() || undefined
                                                }), children: "Salvar" }), _jsx(Button, { type: "button", className: "!bg-white !text-primary ring-1 ring-rose-100", onClick: () => setEditingContact(false), children: "Cancelar" })] })] })), _jsxs("div", { className: "flex w-full gap-4", children: [_jsx("a", { className: "flex flex-1 items-center justify-center gap-2 rounded-xl bg-[#25D366]/10 px-4 py-3 font-bold text-[#128C7E]", href: client.whatsapp ? `https://wa.me/${client.whatsapp}` : "#", target: "_blank", rel: "noreferrer", children: "WhatsApp" }), _jsx("a", { className: "flex flex-1 items-center justify-center gap-2 rounded-xl bg-[#E1306C]/10 px-4 py-3 font-bold text-[#C13584]", href: client.instagram ? `https://instagram.com/${client.instagram}` : "#", target: "_blank", rel: "noreferrer", children: "Instagram" })] })] }), openSacola && openSacola.vendas.length > 0 && (_jsxs("section", { className: "mb-6 rounded-3xl border border-rose-100 bg-white p-4 shadow-sm", children: [_jsx("h3", { className: "mb-2 text-lg font-bold text-gray-800", children: "Sacola aberta" }), _jsxs("p", { className: "mb-3 text-sm text-gray-500", children: [openSacola.vendas.length, " pe\u00E7a(s) aguardando envio"] }), _jsx("ul", { className: "space-y-1 text-sm", children: openSacola.vendas.map((v) => (_jsxs("li", { children: [v.peca.codigo ? `${v.peca.codigo} · ` : "", v.peca.nome] }, v.id))) }), _jsx(Link, { to: "/vendas#aguardando", className: "mt-3 inline-block text-sm font-bold text-primary", children: "Gerenciar envio \u2192" })] })), _jsxs("section", { className: "mb-6 grid grid-cols-2 gap-4", children: [_jsxs("div", { className: "rounded-3xl border border-rose-50 bg-white p-4 shadow-sm", children: [_jsx("p", { className: "mb-1 text-xs font-bold uppercase tracking-wider text-gray-400", children: "Total Gasto" }), _jsx("p", { className: "text-xl font-extrabold text-primary", children: formatCurrency(totalSpent) })] }), _jsxs("div", { className: "rounded-3xl border border-rose-50 bg-white p-4 shadow-sm", children: [_jsx("p", { className: "mb-1 text-xs font-bold uppercase tracking-wider text-gray-400", children: "Pe\u00E7as Compradas" }), _jsxs("p", { className: "text-xl font-extrabold text-gray-900", children: [client.vendas.length, " itens"] })] })] }), _jsxs("section", { children: [_jsx("div", { className: "mb-4 flex items-center justify-between", children: _jsx("h3", { className: "text-lg font-bold text-gray-800", children: "Hist\u00F3rico de Pe\u00E7as" }) }), _jsxs("div", { className: "space-y-3", children: [client.vendas.length === 0 && (_jsx("p", { className: "rounded-2xl border border-rose-100 bg-white p-4 text-sm text-on-surface-variant", children: "Este cliente ainda n\u00E3o possui compras registradas." })), client.vendas.map((sale) => (_jsxs("div", { className: "flex items-center gap-4 rounded-2xl border border-rose-50 bg-white p-3 shadow-sm", children: [_jsxs("div", { className: "flex-1", children: [_jsxs("h4", { className: "font-bold text-gray-900", children: [sale.peca.codigo ? `${sale.peca.codigo} · ` : "", sale.peca.nome] }), _jsx("p", { className: "text-xs font-medium text-gray-500", children: new Date(sale.criadoEm).toLocaleDateString("pt-BR") })] }), _jsxs("div", { className: "text-right", children: [_jsx("p", { className: "font-extrabold text-primary", children: formatCurrency(sale.ganhosTotal) }), _jsx("span", { className: `rounded-md px-2 py-0.5 text-[10px] font-bold ${sale.entrega ? "bg-green-50 text-green-600" : "bg-amber-50 text-amber-700"}`, children: sale.entrega ? "ENTREGUE" : "AGUARDANDO ENVIO" })] })] }, sale.id)))] })] })] }))] }));
};
