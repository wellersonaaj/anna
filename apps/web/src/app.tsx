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
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<InventoryPage />} />
          <Route path="/items/:itemId" element={<ItemDetailPage />} />
          <Route path="/items/:itemId/fotos/upload" element={<ItemFotoUploadPage />} />
          <Route path="/reserve/:itemId" element={<ReservePage />} />
          <Route path="/sell/:itemId" element={<SellPage />} />
          <Route path="/deliveries" element={<DeliveriesPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  );
};
