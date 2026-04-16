import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { Link, useNavigate, useParams } from "react-router-dom";
import { z } from "zod";
import { searchClients } from "../api/clients";
import { getItem, reserveItem } from "../api/items";
import { useSessionStore } from "../store/session.store";
import { AppShell, Button, Field, Input, Section } from "../components/ui";
const reserveFormSchema = z.object({
    nome: z.string().trim().min(2, "Informe o nome."),
    whatsapp: z.string().trim().optional(),
    instagram: z.string().trim().optional()
}).superRefine((data, ctx) => {
    const w = data.whatsapp?.replace(/\s/g, "") ?? "";
    const i = data.instagram?.replace(/^@+/, "").trim() ?? "";
    if (!w && !i) {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "Informe WhatsApp ou Instagram.",
            path: ["whatsapp"]
        });
    }
});
const formatPreco = (value) => {
    if (value === null || value === undefined || value === "") {
        return "—";
    }
    const num = typeof value === "string" ? Number(value.replace(",", ".")) : Number(value);
    if (Number.isNaN(num)) {
        return String(value);
    }
    return num.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
};
export const ReservePage = () => {
    const { itemId } = useParams();
    const brechoId = useSessionStore((state) => state.brechoId);
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const itemQuery = useQuery({
        queryKey: ["item", brechoId, itemId],
        queryFn: () => getItem(brechoId, itemId),
        enabled: Boolean(itemId)
    });
    const [searchDraft, setSearchDraft] = useState("");
    const clientsQuery = useQuery({
        queryKey: ["clients-search", brechoId, searchDraft],
        queryFn: () => searchClients(brechoId, searchDraft),
        enabled: searchDraft.trim().length >= 2
    });
    const { register, handleSubmit, setValue, formState } = useForm({
        resolver: zodResolver(reserveFormSchema),
        defaultValues: {
            nome: "",
            whatsapp: "",
            instagram: ""
        }
    });
    const reserveMutation = useMutation({
        mutationFn: (data) => {
            if (!itemId) {
                throw new Error("Peça não informada.");
            }
            return reserveItem(brechoId, itemId, {
                cliente: {
                    nome: data.nome.trim(),
                    whatsapp: data.whatsapp?.trim() || undefined,
                    instagram: data.instagram?.trim() || undefined
                }
            });
        },
        onSuccess: async () => {
            await queryClient.invalidateQueries({ queryKey: ["items", brechoId] });
            await queryClient.invalidateQueries({ queryKey: ["item", brechoId, itemId] });
            navigate("/");
        }
    });
    const item = itemQuery.data;
    return (_jsxs(AppShell, { children: [_jsxs("header", { style: { display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }, children: [_jsx(Link, { to: "/", style: { color: "#5a4042", textDecoration: "none" }, children: "\u2190 Voltar" }), _jsx("h1", { style: { margin: 0, fontSize: "1.25rem" }, children: "Reserva" })] }), _jsx("p", { style: { marginTop: 0, color: "#5a4042", maxWidth: 360 }, children: "Busque um cliente ou cadastre um novo" }), _jsxs(Section, { title: "Buscar cliente existente", children: [_jsx("div", { style: { position: "relative" }, children: _jsx(Input, { placeholder: "Buscar cliente existente...", value: searchDraft, onChange: (event) => setSearchDraft(event.target.value), style: { paddingLeft: 12 } }) }), clientsQuery.data && clientsQuery.data.length > 0 && (_jsx("ul", { style: {
                            listStyle: "none",
                            margin: "12px 0 0",
                            padding: 0,
                            border: "1px solid #e2bec0",
                            borderRadius: 12,
                            overflow: "hidden"
                        }, children: clientsQuery.data.map((c) => (_jsx("li", { children: _jsxs("button", { type: "button", onClick: () => {
                                    setValue("nome", c.nome, { shouldValidate: true });
                                    setValue("whatsapp", c.whatsapp ?? "", { shouldValidate: true });
                                    setValue("instagram", c.instagram ?? "", { shouldValidate: true });
                                    setSearchDraft("");
                                }, style: {
                                    width: "100%",
                                    textAlign: "left",
                                    padding: "12px 14px",
                                    border: 0,
                                    borderBottom: "1px solid #f2d5d7",
                                    background: "#fff",
                                    cursor: "pointer"
                                }, children: [_jsx("strong", { children: c.nome }), _jsxs("div", { style: { fontSize: 12, color: "#5a4042" }, children: [c.whatsapp ? `WhatsApp: ${c.whatsapp}` : null, c.whatsapp && c.instagram ? " · " : null, c.instagram ? `Instagram: @${c.instagram}` : null] })] }) }, c.id))) }))] }), _jsxs("div", { style: {
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                    margin: "20px 0",
                    color: "#8e6f71",
                    fontSize: 10,
                    fontWeight: 700,
                    letterSpacing: "0.2em"
                }, children: [_jsx("div", { style: { flex: 1, height: 1, background: "#e2bec0" } }), "OU", _jsx("div", { style: { flex: 1, height: 1, background: "#e2bec0" } })] }), _jsxs(Section, { title: "Perfil do Cliente", children: [_jsxs("form", { className: "stack", onSubmit: handleSubmit((data) => reserveMutation.mutate(data)), children: [_jsx(Field, { label: "Nome completo", children: _jsx(Input, { ...register("nome"), placeholder: "ex: Elena Rossi" }) }), _jsxs("div", { className: "grid cols-2", children: [_jsx(Field, { label: "WhatsApp", children: _jsxs("div", { style: { display: "flex", alignItems: "center", gap: 6 }, children: [_jsx("span", { style: { color: "#8e6f71" }, children: "+" }), _jsx(Input, { ...register("whatsapp"), placeholder: "55 11 99999-9999", type: "tel" })] }) }), _jsx(Field, { label: "Instagram", children: _jsxs("div", { style: { display: "flex", alignItems: "center", gap: 6 }, children: [_jsx("span", { style: { color: "#8e6f71" }, children: "@" }), _jsx(Input, { ...register("instagram"), placeholder: "usuario" })] }) })] }), item && (_jsxs("div", { style: {
                                    display: "flex",
                                    gap: 16,
                                    padding: 16,
                                    background: "#fee1e3",
                                    borderRadius: 16,
                                    marginTop: 8
                                }, children: [_jsx("div", { style: {
                                            width: 80,
                                            height: 96,
                                            borderRadius: 12,
                                            background: "#fff",
                                            flexShrink: 0,
                                            display: "flex",
                                            alignItems: "center",
                                            justifyContent: "center",
                                            fontSize: 11,
                                            color: "#5a4042"
                                        }, children: "Foto" }), _jsxs("div", { children: [_jsx("div", { style: { fontSize: 10, fontWeight: 800, letterSpacing: "0.15em", color: "#b60e3d" }, children: "RESERVANDO ITEM" }), _jsx("h3", { style: { margin: "4px 0", fontSize: "1.1rem" }, children: item.nome }), _jsx("div", { style: { fontSize: 13, fontWeight: 700 }, children: formatPreco(item.precoVenda) })] })] })), _jsxs("div", { style: { display: "flex", flexDirection: "column", gap: 12, marginTop: 12 }, children: [_jsx(Button, { type: "submit", disabled: reserveMutation.isPending || !item, children: reserveMutation.isPending ? "Confirmando..." : "Confirmar reserva" }), _jsx("button", { type: "button", onClick: () => navigate(-1), style: {
                                            height: 40,
                                            borderRadius: 10,
                                            border: "1px solid #e2bec0",
                                            background: "transparent",
                                            color: "#5a4042",
                                            cursor: "pointer",
                                            fontWeight: 600
                                        }, children: "Descartar rascunho" })] })] }), formState.errors.root && _jsx("small", { children: formState.errors.root.message })] })] }));
};
