import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { isClientContactComplete, isClientContactEnriched, missingContactChannel } from "@anna/shared";
import { Button, Field, Input } from "./ui";
export { isClientContactComplete, isClientContactEnriched, missingContactChannel };
export const ClientContactFields = ({ values, onChange, errors, dismissedNudge, onDismissNudge }) => {
    const missing = missingContactChannel(values);
    const showNudge = !dismissedNudge && isClientContactComplete(values) && missing !== null;
    return (_jsxs("div", { className: "grid gap-3", children: [showNudge && (_jsxs("div", { className: "rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950", children: [_jsx("p", { className: "font-semibold", children: missing === "whatsapp"
                            ? "Tem o WhatsApp dela? Responde mais rápido que DM."
                            : "Instagram ajuda a reconhecer a cliente depois." }), _jsxs("div", { className: "mt-3 flex flex-wrap gap-2", children: [_jsx(Button, { type: "button", className: "!h-9 !min-h-0 !px-4 !py-0 text-xs", onClick: () => {
                                    const id = missing === "whatsapp" ? "client-whatsapp" : "client-instagram";
                                    document.getElementById(id)?.focus();
                                }, children: "Adicionar" }), onDismissNudge && (_jsx("button", { type: "button", className: "text-xs font-bold text-amber-800 underline", onClick: onDismissNudge, children: "Continuar assim" }))] })] })), _jsxs(Field, { label: "Nome completo", children: [_jsx(Input, { id: "client-nome", value: values.nome, onChange: (e) => onChange("nome", e.target.value), placeholder: "ex: Elena Rossi" }), errors?.nome && _jsx("small", { className: "text-red-600", children: errors.nome })] }), _jsxs("div", { className: "grid grid-cols-1 gap-3 sm:grid-cols-2", children: [_jsxs(Field, { label: "WhatsApp", children: [_jsx(Input, { id: "client-whatsapp", type: "tel", value: values.whatsapp, onChange: (e) => onChange("whatsapp", e.target.value), placeholder: "55 11 99999-9999" }), errors?.whatsapp && _jsx("small", { className: "text-red-600", children: errors.whatsapp })] }), _jsxs(Field, { label: "Instagram", children: [_jsx(Input, { id: "client-instagram", value: values.instagram, onChange: (e) => onChange("instagram", e.target.value), placeholder: "@usuario" }), errors?.instagram && _jsx("small", { className: "text-red-600", children: errors.instagram })] })] })] }));
};
