import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { DeliveriesPage } from "./pages/deliveries.page";
import { InventoryPage } from "./pages/inventory.page";
import { ItemAIDraftPage } from "./pages/item-ai-draft.page";
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

const queryClient = new QueryClient();

export const App = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<InventoryPage />} />
          <Route path="/items/new/ai" element={<ItemAIDraftPage />} />
          <Route path="/items/new/manual" element={<ItemManualCreatePage />} />
          <Route path="/items/:itemId" element={<ItemDetailPage />} />
          <Route path="/items/:itemId/fotos/upload" element={<ItemFotoUploadPage />} />
          <Route path="/reserve/:itemId" element={<ReservePage />} />
          <Route path="/sell/:itemId" element={<SellPage />} />
          <Route path="/vendas" element={<SalesHubPage />} />
          <Route path="/deliveries" element={<DeliveriesPage />} />
          <Route path="/clientes" element={<ClientsPage />} />
          <Route path="/clientes/:clientId" element={<ClientDetailPage />} />
          <Route path="/relatorios" element={<ReportsPage />} />
          <Route path="/ai/quality" element={<AiQualityPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  );
};
