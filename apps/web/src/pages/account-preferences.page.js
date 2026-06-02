import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { readInventoryPrefs, SOLD_WITHIN_DAYS_OPTIONS, writeInventoryPrefs } from "../lib/inventory-prefs";
import { useSessionStore } from "../store/session.store";
import { AppShell, Button, Field, Section } from "../components/ui";
export const AccountPreferencesPage = () => {
    const queryClient = useQueryClient();
    const brechoId = useSessionStore((state) => state.brechoId);
    const isFounder = useSessionStore((state) => state.user?.isFounder);
    const [soldWithinDays, setSoldWithinDays] = useState(30);
    const [saved, setSaved] = useState(false);
    const backTo = isFounder ? "/admin/brechos" : "/relatorios";
    useEffect(() => {
        if (!brechoId) {
            return;
        }
        setSoldWithinDays(readInventoryPrefs(brechoId).soldWithinDays);
    }, [brechoId]);
    const onSave = () => {
        if (!brechoId) {
            return;
        }
        writeInventoryPrefs(brechoId, { soldWithinDays });
        void queryClient.invalidateQueries({ queryKey: ["items", brechoId] });
        setSaved(true);
    };
    return (_jsxs(AppShell, { showTopBar: true, topBarTitle: "Prefer\u00EAncias", children: [_jsx(Link, { to: backTo, className: "text-sm font-semibold text-on-surface-variant underline", children: "\u2190 Voltar" }), _jsxs(Section, { title: "Estoque", children: [_jsx("p", { className: "mb-4 text-sm text-on-surface-variant", children: "Define por quanto tempo pe\u00E7as vendidas ou entregues continuam vis\u00EDveis no estoque quando voc\u00EA marca esses filtros. Isso \u00E9 apenas visual \u2014 nada \u00E9 apagado do sistema, e relat\u00F3rios ou vendas n\u00E3o s\u00E3o afetados." }), _jsx(Field, { label: "Ocultar vendidos ap\u00F3s", children: _jsx("select", { value: soldWithinDays, onChange: (event) => {
                                setSoldWithinDays(Number(event.target.value));
                                setSaved(false);
                            }, className: "h-12 w-full rounded-2xl border border-rose-100 bg-white px-4 text-base text-on-background", children: SOLD_WITHIN_DAYS_OPTIONS.map((days) => (_jsxs("option", { value: days, children: [days, " dias"] }, days))) }) }), _jsxs("div", { className: "mt-4 flex flex-wrap items-center gap-3", children: [_jsx(Button, { type: "button", onClick: onSave, children: "Salvar prefer\u00EAncias" }), saved ? _jsx("span", { className: "text-sm font-semibold text-green-700", children: "Prefer\u00EAncias salvas." }) : null] })] }), _jsx(Section, { title: "Conta", children: _jsx(Link, { to: "/conta/senha", className: "inline-flex text-sm font-bold text-primary underline", children: "Trocar senha" }) })] }));
};
