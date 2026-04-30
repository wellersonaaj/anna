import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from "react";
import { Link } from "react-router-dom";
const cx = (...parts) => parts.filter(Boolean).join(" ");
export const AppShell = ({ children, showTopBar = false, topBarTitle = "Agente", topBarAction, showBottomNav = false, activeTab = "estoque", fabLink = "/items/new", maxWidthClass = "max-w-5xl" }) => {
    return (_jsxs("div", { className: "min-h-screen bg-background text-on-background", children: [showTopBar && (_jsx("header", { className: "fixed inset-x-0 top-0 z-40 border-b border-rose-100 bg-[#fff8f7]/90 backdrop-blur-md", children: _jsxs("div", { className: cx("mx-auto flex h-16 items-center justify-between px-4", maxWidthClass), children: [_jsxs("div", { className: "flex items-center gap-3", children: [_jsx("div", { className: "h-9 w-9 overflow-hidden rounded-full bg-surface-container-high" }), _jsx("span", { className: "font-headline text-lg font-bold text-primary", children: topBarTitle })] }), _jsx("div", { children: topBarAction })] }) })), _jsx("div", { className: cx("mx-auto px-4 pb-8 pt-6", maxWidthClass, showTopBar && "pt-24", showBottomNav && "pb-36"), children: _jsx("div", { className: "flex flex-col gap-4", children: children }) }), showBottomNav && _jsx(BottomNav, { activeTab: activeTab, fabLink: fabLink })] }));
};
export const Section = ({ title, children }) => {
    return (_jsxs("section", { className: "rounded-3xl border border-rose-100 bg-white p-4 shadow-sm", children: [_jsx("h2", { className: "m-0 mb-3 font-headline text-lg font-extrabold tracking-tight", children: title }), children] }));
};
export const Field = ({ label, children }) => {
    return (_jsxs("label", { className: "flex flex-col gap-1", children: [_jsx("span", { className: "text-xs font-semibold text-on-surface-variant", children: label }), children] }));
};
export const Input = (props) => {
    const { className, style, ...rest } = props;
    return (_jsx("input", { ...rest, className: cx("h-11 rounded-xl border border-[#d9b9bc] bg-white px-3 text-sm outline-none transition-colors placeholder:text-outline focus:border-primary", className), style: style }));
};
export const Select = (props) => {
    const { className, style, ...rest } = props;
    return (_jsx("select", { ...rest, className: cx("h-11 rounded-xl border border-[#d9b9bc] bg-white px-3 text-sm outline-none transition-colors focus:border-primary", className), style: style }));
};
export const Button = ({ children, ...props }) => {
    const { className, style, ...rest } = props;
    return (_jsx("button", { ...rest, className: cx("inline-flex h-11 items-center justify-center rounded-xl bg-primary px-4 text-sm font-bold text-white transition-opacity active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60", className), style: style, children: children }));
};
const statusColorMap = {
    DISPONIVEL: "#006a39",
    RESERVADO: "#8a6d00",
    VENDIDO: "#5e2d86",
    ENTREGUE: "#176179",
    INDISPONIVEL: "#6a5557"
};
export const StatusBadge = ({ status }) => {
    return (_jsx("span", { style: {
            display: "inline-block",
            borderRadius: 999,
            padding: "4px 10px",
            fontSize: 12,
            color: "white",
            background: statusColorMap[status]
        }, children: status }));
};
const navItemClass = (active) => cx("flex flex-col items-center justify-center px-2 py-2 text-[11px] font-bold uppercase tracking-wider", active ? "text-primary" : "text-on-surface-variant/60");
const BottomNav = ({ activeTab, fabLink }) => {
    return (_jsx("nav", { className: "fixed inset-x-0 bottom-0 z-50 rounded-t-[2rem] border-t border-rose-100 bg-[#fff8f7]/95 px-2 pt-2 shadow-[0_-12px_40px_rgba(186,19,64,0.08)] backdrop-blur-md", style: { paddingBottom: "calc(1.5rem + env(safe-area-inset-bottom))" }, children: _jsxs("div", { className: "mx-auto flex max-w-5xl items-end justify-around", children: [_jsxs(Link, { to: "/", className: navItemClass(activeTab === "estoque"), children: [_jsx("span", { className: "material-symbols-outlined", children: "inventory_2" }), "Estoque"] }), _jsxs(Link, { to: "/vendas", className: navItemClass(activeTab === "vendas"), children: [_jsx("span", { className: "material-symbols-outlined", children: "payments" }), "Vendas"] }), _jsx(Link, { to: fabLink, "aria-label": "Cadastrar com IA", className: "relative -top-5 inline-flex h-16 w-16 items-center justify-center rounded-full bg-primary text-white shadow-[0_8px_25px_rgba(186,19,64,0.35)] transition-transform active:scale-90", children: _jsx("span", { className: "material-symbols-outlined text-3xl", children: "add" }) }), _jsxs(Link, { to: "/clientes", className: navItemClass(activeTab === "clientes"), children: [_jsx("span", { className: "material-symbols-outlined", children: "group" }), "Clientes"] }), _jsxs(Link, { to: "/relatorios", className: navItemClass(activeTab === "relatorios"), children: [_jsx("span", { className: "material-symbols-outlined", children: "analytics" }), "Relat\u00F3rios"] })] }) }));
};
export const TopShortcutBar = ({ shortcuts }) => {
    return (_jsx("div", { className: "sticky top-16 z-30 -mx-4 border-b border-rose-100 bg-[#fff8f7]/95 px-4 py-3 backdrop-blur-sm", children: _jsx("div", { className: "no-scrollbar flex gap-2 overflow-x-auto", children: shortcuts.map((shortcut) => (_jsx("a", { href: `#${shortcut.id}`, className: "whitespace-nowrap rounded-full bg-[#fce7eb] px-4 py-1.5 text-xs font-bold text-primary shadow-sm transition-transform active:scale-95", children: shortcut.label }, shortcut.id))) }) }));
};
export const PillButton = ({ children, active, onClick }) => (_jsx("button", { type: "button", onClick: onClick, className: cx("whitespace-nowrap rounded-full px-5 py-2.5 text-xs font-bold transition-colors", active ? "bg-primary text-white" : "bg-surface-container-low text-on-surface-variant hover:bg-surface-container-high"), children: children }));
export const ItemStatusTone = ({ status, compact = false }) => {
    const toneMap = {
        DISPONIVEL: { bg: "bg-[#006a39]/10", text: "text-[#006a39]", label: "Disponível" },
        RESERVADO: { bg: "bg-amber-500/10", text: "text-amber-700", label: "Reservado" },
        VENDIDO: { bg: "bg-violet-500/10", text: "text-violet-700", label: "Vendido" },
        ENTREGUE: { bg: "bg-cyan-500/10", text: "text-cyan-700", label: "Entregue" },
        INDISPONIVEL: { bg: "bg-zinc-400/10", text: "text-zinc-600", label: "Indisponível" }
    };
    const tone = toneMap[status];
    return (_jsx("span", { className: cx("inline-flex rounded-full font-bold uppercase tracking-wider", tone.bg, tone.text, compact ? "px-2 py-0.5 text-[10px]" : "px-3 py-1 text-[9px]"), children: tone.label }));
};
export const ProductCard = ({ item, subtitle, priceLabel, children, onImageClick }) => {
    const [imageBroken, setImageBroken] = useState(false);
    const hasImage = Boolean(item.fotoCapaUrl) && !imageBroken;
    const image = hasImage ? (_jsx("img", { src: item.fotoCapaUrl ?? undefined, alt: `Foto da peça ${item.nome}`, className: "h-full w-full object-cover transition-transform duration-700 group-hover:scale-105", loading: "lazy", onError: () => setImageBroken(true) })) : (_jsx("div", { className: "flex h-full w-full items-center justify-center text-xs font-bold text-outline", children: "Sem foto" }));
    return (_jsxs("article", { className: "group", children: [_jsxs("div", { className: "relative mb-3 aspect-[4/5] overflow-hidden rounded-xl bg-surface-container-low", children: [onImageClick && hasImage ? (_jsx("button", { type: "button", onClick: onImageClick, className: "block h-full w-full cursor-zoom-in p-0", children: image })) : (image), _jsx("div", { className: "absolute left-3 top-3", children: _jsx(ItemStatusTone, { status: item.status }) })] }), _jsx("p", { className: "mb-1 text-[9px] font-bold uppercase tracking-widest text-outline", children: subtitle }), _jsx("h3", { className: "mb-1 text-sm font-bold leading-tight tracking-tight text-on-background", children: item.nome }), priceLabel && _jsx("p", { className: "text-sm font-bold text-on-background", children: priceLabel }), children] }));
};
export const PhotoLightbox = ({ photos, initialIndex, title, onClose, coverPhotoId, onSetCover, setCoverPending = false }) => {
    const [index, setIndex] = useState(initialIndex);
    const total = photos.length;
    const photo = photos[index];
    if (!photo) {
        return null;
    }
    const goTo = (nextIndex) => {
        setIndex((nextIndex + total) % total);
    };
    return (_jsxs("div", { className: "fixed inset-0 z-[80] flex flex-col bg-black/90 p-4 text-white", role: "dialog", "aria-modal": "true", "aria-label": title, children: [_jsxs("div", { className: "mb-3 flex items-center justify-between gap-3", children: [_jsxs("div", { children: [_jsx("strong", { className: "block text-sm", children: title }), _jsxs("span", { className: "text-xs text-white/70", children: [index + 1, " de ", total] })] }), _jsxs("div", { className: "flex items-center gap-2", children: [onSetCover &&
                                (photo.id === coverPhotoId ? (_jsx("span", { className: "rounded-full bg-white/10 px-3 py-2 text-xs font-bold text-white/80", children: "Capa" })) : (_jsx("button", { type: "button", onClick: () => onSetCover(photo.id), disabled: setCoverPending, className: "rounded-full bg-white/10 px-3 py-2 text-xs font-bold text-white disabled:opacity-60", children: setCoverPending ? "Salvando..." : "Definir como capa" }))), _jsx("button", { type: "button", onClick: onClose, className: "rounded-full bg-white/10 px-4 py-2 text-sm font-bold text-white", children: "Fechar" })] })] }), _jsxs("div", { className: "flex min-h-0 flex-1 items-center justify-center gap-2", children: [total > 1 && (_jsx("button", { type: "button", onClick: () => goTo(index - 1), className: "rounded-full bg-white/10 px-3 py-3 text-2xl font-bold", "aria-label": "Foto anterior", children: "\u2039" })), _jsx("img", { src: photo.url, alt: photo.alt ?? title, className: "max-h-full min-w-0 rounded-2xl object-contain" }), total > 1 && (_jsx("button", { type: "button", onClick: () => goTo(index + 1), className: "rounded-full bg-white/10 px-3 py-3 text-2xl font-bold", "aria-label": "Pr\u00F3xima foto", children: "\u203A" }))] })] }));
};
export const formatCurrency = (value) => {
    if (value === null || value === undefined || value === "") {
        return "Preço a confirmar";
    }
    const asNumber = typeof value === "string" ? Number(value.replace(",", ".")) : Number(value);
    if (Number.isNaN(asNumber)) {
        return "Preço a confirmar";
    }
    return asNumber.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
};
export const relativeAgeLabel = (createdAt) => {
    const hours = Math.max(0, Math.floor((Date.now() - new Date(createdAt).getTime()) / (1000 * 60 * 60)));
    if (hours >= 24) {
        return { label: `há ${hours}h`, tone: "#ef4444" };
    }
    if (hours >= 1) {
        return { label: `há ${hours}h`, tone: "#f59e0b" };
    }
    const minutes = Math.max(1, Math.floor((Date.now() - new Date(createdAt).getTime()) / (1000 * 60)));
    return { label: `há ${minutes}m`, tone: "#9ca3af" };
};
