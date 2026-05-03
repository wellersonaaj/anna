import { jsx as _jsx, Fragment as _Fragment, jsxs as _jsxs } from "react/jsx-runtime";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { DeliveriesPage } from "./pages/deliveries.page";
import { InventoryPage } from "./pages/inventory.page";
import { ItemAIDraftPage } from "./pages/item-ai-draft.page";
import { ItemCreateChoicePage } from "./pages/item-create-choice.page";
import { ImportacaoInboxPage } from "./pages/importacao-inbox.page";
import { ImportacaoCriarPage } from "./pages/importacao-criar.page";
import { ImportacaoGruposPage } from "./pages/importacao-grupos.page";
import { ImportacaoRascunhosPage } from "./pages/importacao-rascunhos.page";
import { ImportacaoRascunhoDetailPage } from "./pages/importacao-rascunho-detail.page";
import { ItemDetailPage } from "./pages/item-detail.page";
import { ItemFotoUploadPage } from "./pages/item-foto-upload.page";
import { ItemManualCreatePage } from "./pages/item-manual-create.page";
import { AiQualityPage } from "./pages/ai-quality.page";
import { ReservePage } from "./pages/reserve.page";
import { SellPage } from "./pages/sell.page";
import { SalesHubPage } from "./pages/sales-hub.page";
import { ClientsPage } from "./pages/clients.page";
import { ClientDetailPage } from "./pages/client-detail.page";
import { ReportsPage } from "./pages/reports.page";
import { LoginPage } from "./pages/login.page";
import { AdminBrechosPage } from "./pages/admin/admin-brechos.page";
import { AdminBrechoFormPage } from "./pages/admin/admin-brecho-form.page";
import { AdminBrechoDetailPage } from "./pages/admin/admin-brecho-detail.page";
import { useSessionStore } from "./store/session.store";
const queryClient = new QueryClient();
const RequireAuth = ({ children }) => {
    const isAuthenticated = useSessionStore((state) => state.isAuthenticated);
    const activeBrecho = useSessionStore((state) => state.activeBrecho);
    const isFounder = useSessionStore((state) => state.user?.isFounder);
    if (!isAuthenticated) {
        return _jsx(Navigate, { to: "/login", replace: true });
    }
    if (!activeBrecho) {
        return isFounder ? _jsx(Navigate, { to: "/admin/brechos", replace: true }) : _jsx(Navigate, { to: "/login", replace: true });
    }
    return _jsx(_Fragment, { children: children });
};
const RequireFounder = ({ children }) => {
    const isAuthenticated = useSessionStore((state) => state.isAuthenticated);
    const isFounder = useSessionStore((state) => state.user?.isFounder);
    if (!isAuthenticated) {
        return _jsx(Navigate, { to: "/login", replace: true });
    }
    if (!isFounder) {
        return _jsx(Navigate, { to: "/", replace: true });
    }
    return _jsx(_Fragment, { children: children });
};
export const App = () => {
    return (_jsx(QueryClientProvider, { client: queryClient, children: _jsx(BrowserRouter, { children: _jsxs(Routes, { children: [_jsx(Route, { path: "/login", element: _jsx(LoginPage, {}) }), _jsx(Route, { path: "/admin", element: _jsx(Navigate, { to: "/admin/brechos", replace: true }) }), _jsx(Route, { path: "/admin/brechos", element: _jsx(RequireFounder, { children: _jsx(AdminBrechosPage, {}) }) }), _jsx(Route, { path: "/admin/brechos/new", element: _jsx(RequireFounder, { children: _jsx(AdminBrechoFormPage, {}) }) }), _jsx(Route, { path: "/admin/brechos/:brechoId", element: _jsx(RequireFounder, { children: _jsx(AdminBrechoDetailPage, {}) }) }), _jsx(Route, { path: "/", element: _jsx(RequireAuth, { children: _jsx(InventoryPage, {}) }) }), _jsx(Route, { path: "/items/new", element: _jsx(RequireAuth, { children: _jsx(ItemCreateChoicePage, {}) }) }), _jsx(Route, { path: "/items/new/ai", element: _jsx(RequireAuth, { children: _jsx(ItemAIDraftPage, {}) }) }), _jsx(Route, { path: "/importacoes/criar", element: _jsx(RequireAuth, { children: _jsx(ImportacaoCriarPage, {}) }) }), _jsx(Route, { path: "/importacoes/:loteId/criar", element: _jsx(RequireAuth, { children: _jsx(ImportacaoCriarPage, {}) }) }), _jsx(Route, { path: "/importacoes/:loteId/grupos", element: _jsx(RequireAuth, { children: _jsx(ImportacaoGruposPage, {}) }) }), _jsx(Route, { path: "/importacoes/:loteId/rascunhos/:rascunhoId", element: _jsx(RequireAuth, { children: _jsx(ImportacaoRascunhoDetailPage, {}) }) }), _jsx(Route, { path: "/importacoes/:loteId/rascunhos", element: _jsx(RequireAuth, { children: _jsx(ImportacaoRascunhosPage, {}) }) }), _jsx(Route, { path: "/importacoes", element: _jsx(RequireAuth, { children: _jsx(ImportacaoInboxPage, {}) }) }), _jsx(Route, { path: "/items/new/manual", element: _jsx(RequireAuth, { children: _jsx(ItemManualCreatePage, {}) }) }), _jsx(Route, { path: "/items/:itemId", element: _jsx(RequireAuth, { children: _jsx(ItemDetailPage, {}) }) }), _jsx(Route, { path: "/items/:itemId/fotos/upload", element: _jsx(RequireAuth, { children: _jsx(ItemFotoUploadPage, {}) }) }), _jsx(Route, { path: "/reserve/:itemId", element: _jsx(RequireAuth, { children: _jsx(ReservePage, {}) }) }), _jsx(Route, { path: "/sell/:itemId", element: _jsx(RequireAuth, { children: _jsx(SellPage, {}) }) }), _jsx(Route, { path: "/vendas", element: _jsx(RequireAuth, { children: _jsx(SalesHubPage, {}) }) }), _jsx(Route, { path: "/deliveries", element: _jsx(RequireAuth, { children: _jsx(DeliveriesPage, {}) }) }), _jsx(Route, { path: "/clientes", element: _jsx(RequireAuth, { children: _jsx(ClientsPage, {}) }) }), _jsx(Route, { path: "/clientes/:clientId", element: _jsx(RequireAuth, { children: _jsx(ClientDetailPage, {}) }) }), _jsx(Route, { path: "/relatorios", element: _jsx(RequireAuth, { children: _jsx(ReportsPage, {}) }) }), _jsx(Route, { path: "/ai/quality", element: _jsx(RequireAuth, { children: _jsx(AiQualityPage, {}) }) }), _jsx(Route, { path: "*", element: _jsx(Navigate, { to: "/", replace: true }) })] }) }) }));
};
