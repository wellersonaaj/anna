import { jsxs as _jsxs, jsx as _jsx } from "react/jsx-runtime";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { searchClients } from "../api/clients";
import { Button, Input } from "./ui";
const digitsOnly = (value) => value.replace(/\D/g, "");
export const guessClientContactFromSearch = (search) => {
    const raw = search.trim();
    const digits = digitsOnly(raw);
    const instagram = raw.replace(/^@+/, "").trim();
    if (digits.length >= 8 && digits.length >= raw.replace(/\s/g, "").length - 2) {
        return { nome: "", whatsapp: digits, instagram: "" };
    }
    if (raw.startsWith("@")) {
        return { nome: "", whatsapp: "", instagram };
    }
    return { nome: raw, whatsapp: "", instagram: "" };
};
const displayInstagram = (instagram) => {
    if (!instagram) {
        return "Instagram não informado";
    }
    return `Instagram @${instagram.replace(/^@+/, "")}`;
};
const displayWhatsapp = (whatsapp) => {
    if (!whatsapp) {
        return "WhatsApp não informado";
    }
    return `WhatsApp ${whatsapp}`;
};
const contactFromClient = (client) => ({
    nome: client.nome,
    whatsapp: client.whatsapp ?? "",
    instagram: client.instagram ?? ""
});
const hasSelectedContact = (contact) => Boolean(contact?.nome.trim() || contact?.whatsapp.trim() || contact?.instagram.trim());
export const ClientPicker = ({ brechoId, selectedContact, onSelect, onCreateNew, onClear, title = "Cliente" }) => {
    const [search, setSearch] = useState("");
    const trimmedSearch = search.trim();
    const canSearch = trimmedSearch.length >= 2;
    const clientsQuery = useQuery({
        queryKey: ["clients-search", brechoId, trimmedSearch, 5],
        queryFn: () => searchClients(brechoId, trimmedSearch, { limit: 5 }),
        enabled: canSearch && !hasSelectedContact(selectedContact)
    });
    if (hasSelectedContact(selectedContact)) {
        return (_jsxs("div", { className: "rounded-2xl border border-rose-100 bg-rose-50 p-4", children: [_jsxs("div", { className: "mb-3 flex items-start justify-between gap-3", children: [_jsxs("div", { children: [_jsxs("p", { className: "text-[10px] font-bold uppercase tracking-wider text-primary", children: [title, " selecionado"] }), _jsx("strong", { className: "block text-base text-gray-900", children: selectedContact?.nome || "Nome não informado" })] }), onClear && (_jsx("button", { type: "button", className: "text-sm font-bold text-primary", onClick: onClear, children: "Trocar" }))] }), _jsxs("div", { className: "grid gap-1 text-sm text-on-surface-variant", children: [_jsx("span", { children: displayWhatsapp(selectedContact?.whatsapp) }), _jsx("span", { children: displayInstagram(selectedContact?.instagram) })] })] }));
    }
    const createContact = guessClientContactFromSearch(trimmedSearch);
    return (_jsxs("div", { className: "grid gap-3", children: [_jsxs("div", { children: [_jsx("label", { className: "mb-1 block text-xs font-semibold text-on-surface-variant", children: "Buscar por nome, WhatsApp ou Instagram" }), _jsx(Input, { value: search, onChange: (event) => setSearch(event.target.value), placeholder: "Digite nome, telefone ou @instagram", className: "h-14 w-full rounded-2xl text-base" })] }), clientsQuery.isFetching && _jsx("p", { className: "text-sm text-on-surface-variant", children: "Buscando clientes parecidos..." }), canSearch && Boolean(clientsQuery.data?.length) && (_jsxs("div", { className: "grid gap-2", children: [_jsx("p", { className: "text-xs font-bold uppercase tracking-wider text-on-surface-variant", children: "Clientes parecidos" }), clientsQuery.data?.map((client) => (_jsxs("button", { type: "button", onClick: () => {
                            onSelect(contactFromClient(client));
                            setSearch("");
                        }, className: "rounded-2xl border border-rose-100 bg-white p-4 text-left shadow-sm transition-transform active:scale-[0.98]", children: [_jsx("strong", { className: "block text-base text-gray-900", children: client.nome }), _jsxs("span", { className: "mt-2 block text-sm text-on-surface-variant", children: ["Nome ", client.nome] }), _jsx("span", { className: "block text-sm text-on-surface-variant", children: displayWhatsapp(client.whatsapp) }), _jsx("span", { className: "block text-sm text-on-surface-variant", children: displayInstagram(client.instagram) }), _jsx("span", { className: "mt-3 inline-flex rounded-full bg-rose-50 px-3 py-1 text-xs font-bold text-primary", children: "Selecionar cliente" })] }, client.id)))] })), canSearch && !clientsQuery.isFetching && clientsQuery.data?.length === 0 && (_jsx("p", { className: "rounded-2xl border border-rose-100 bg-white p-4 text-sm text-on-surface-variant", children: "Nenhum cliente parecido encontrado." })), canSearch && (_jsx(Button, { type: "button", className: "h-auto min-h-11 bg-white py-3 text-primary ring-1 ring-rose-100", onClick: () => {
                    onCreateNew(createContact);
                    setSearch("");
                }, children: "N\u00E3o \u00E9 nenhuma dessas pessoas? Cadastrar novo cliente" }))] }));
};
