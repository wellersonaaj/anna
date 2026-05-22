import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { useParams } from "react-router-dom";
import { z } from "zod";
import { getPublicQueueInfo, joinPublicQueue } from "../api/public-queue";
import { ClientContactFields } from "../components/client-contact-fields";
import { Button } from "../components/ui";
const formSchema = z
    .object({
    nome: z.string().trim().min(2, "Informe o nome."),
    whatsapp: z.string().trim().optional(),
    instagram: z.string().trim().optional()
})
    .superRefine((data, ctx) => {
    const w = data.whatsapp?.replace(/\s/g, "") ?? "";
    const i = data.instagram?.replace(/^@+/, "").trim() ?? "";
    if (!w && !i) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Informe WhatsApp ou Instagram.", path: ["whatsapp"] });
    }
});
export const PublicQueuePage = () => {
    const { token } = useParams();
    const [joinResult, setJoinResult] = useState(null);
    const [dismissedNudge, setDismissedNudge] = useState(false);
    const infoQuery = useQuery({
        queryKey: ["public-queue", token],
        queryFn: () => getPublicQueueInfo(token),
        enabled: Boolean(token)
    });
    const [values, setValues] = useState({ nome: "", whatsapp: "", instagram: "" });
    const [formError, setFormError] = useState(null);
    const joinMutation = useMutation({
        mutationFn: (data) => joinPublicQueue(token, {
            nome: data.nome.trim(),
            whatsapp: data.whatsapp?.trim() || undefined,
            instagram: data.instagram?.trim() || undefined
        }),
        onSuccess: (result) => {
            setJoinResult({ posicao: result.posicao, totalNaFila: result.totalNaFila });
        }
    });
    const info = infoQuery.data;
    return (_jsxs("div", { className: "mx-auto min-h-screen max-w-md bg-rose-50 px-4 py-8", children: [_jsxs("header", { className: "mb-6 text-center", children: [_jsx("h1", { className: "font-headline text-2xl font-extrabold text-primary", children: "Fila de interesse" }), _jsx("p", { className: "mt-1 text-sm text-on-surface-variant", children: "Entre na fila desta pe\u00E7a" })] }), infoQuery.isLoading && _jsx("p", { children: "Carregando..." }), infoQuery.isError && (_jsx("p", { className: "rounded-2xl border border-rose-200 bg-white p-4 text-sm", children: "Link inv\u00E1lido ou expirado." })), info && (_jsxs("div", { className: "mb-6 overflow-hidden rounded-3xl border border-rose-100 bg-white shadow-sm", children: [info.fotoUrl && (_jsx("img", { src: info.fotoUrl, alt: info.pecaNome, className: "aspect-[4/5] w-full object-cover" })), _jsxs("div", { className: "p-4", children: [info.pecaCodigo && (_jsx("p", { className: "text-xs font-bold uppercase tracking-wider text-primary", children: info.pecaCodigo })), _jsx("h2", { className: "text-lg font-bold text-gray-900", children: info.pecaNome }), _jsx("p", { className: "mt-1 text-sm text-gray-500", children: info.canJoin ? `${info.totalNaFila} pessoa(s) na fila` : "Peça indisponível para fila" })] })] })), joinResult && (_jsxs("div", { className: "mb-6 rounded-2xl border border-green-200 bg-green-50 p-4 text-sm text-green-900", children: ["Voc\u00EA \u00E9 a ", _jsxs("strong", { children: [joinResult.posicao + 1, "\u00AA"] }), " da fila (", joinResult.totalNaFila, " no total). Entraremos em contato em breve!"] })), info?.canJoin && !joinResult && (_jsxs("form", { className: "space-y-4 rounded-3xl border border-rose-100 bg-white p-4", onSubmit: (event) => {
                    event.preventDefault();
                    const parsed = formSchema.safeParse(values);
                    if (!parsed.success) {
                        setFormError(parsed.error.issues[0]?.message ?? "Dados inválidos.");
                        return;
                    }
                    setFormError(null);
                    joinMutation.mutate(parsed.data);
                }, children: [_jsx(ClientContactFields, { values: values, onChange: (field, value) => setValues((prev) => ({ ...prev, [field]: value })), dismissedNudge: dismissedNudge, onDismissNudge: () => setDismissedNudge(true) }), formError && _jsx("p", { className: "text-sm text-red-600", children: formError }), _jsx(Button, { type: "submit", disabled: joinMutation.isPending, className: "w-full", children: joinMutation.isPending ? "Entrando..." : "Entrar na fila" }), joinMutation.isError && (_jsx("p", { className: "text-sm text-red-600", children: joinMutation.error.message }))] }))] }));
};
