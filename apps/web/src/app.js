import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { DeliveriesPage } from "./pages/deliveries.page";
import { InventoryPage } from "./pages/inventory.page";
import { ItemDetailPage } from "./pages/item-detail.page";
import { ItemFotoUploadPage } from "./pages/item-foto-upload.page";
import { ReservePage } from "./pages/reserve.page";
import { SellPage } from "./pages/sell.page";
const queryClient = new QueryClient();
export const App = () => {
    return (_jsx(QueryClientProvider, { client: queryClient, children: _jsx(BrowserRouter, { children: _jsxs(Routes, { children: [_jsx(Route, { path: "/", element: _jsx(InventoryPage, {}) }), _jsx(Route, { path: "/items/:itemId", element: _jsx(ItemDetailPage, {}) }), _jsx(Route, { path: "/items/:itemId/fotos/upload", element: _jsx(ItemFotoUploadPage, {}) }), _jsx(Route, { path: "/reserve/:itemId", element: _jsx(ReservePage, {}) }), _jsx(Route, { path: "/sell/:itemId", element: _jsx(SellPage, {}) }), _jsx(Route, { path: "/deliveries", element: _jsx(DeliveriesPage, {}) }), _jsx(Route, { path: "*", element: _jsx(Navigate, { to: "/", replace: true }) })] }) }) }));
};
