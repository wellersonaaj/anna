import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import type { PropsWithChildren } from "react";
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
import { AccountChangePasswordPage } from "./pages/account-change-password.page";
import { LoginPage } from "./pages/login.page";
import { AdminBrechosPage } from "./pages/admin/admin-brechos.page";
import { AdminBrechoFormPage } from "./pages/admin/admin-brecho-form.page";
import { AdminBrechoDetailPage } from "./pages/admin/admin-brecho-detail.page";
import { useSessionStore } from "./store/session.store";

const queryClient = new QueryClient();

const RequireAuth = ({ children }: PropsWithChildren) => {
  const isAuthenticated = useSessionStore((state) => state.isAuthenticated);
  const activeBrecho = useSessionStore((state) => state.activeBrecho);
  const isFounder = useSessionStore((state) => state.user?.isFounder);
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  if (!activeBrecho) {
    return isFounder ? <Navigate to="/admin/brechos" replace /> : <Navigate to="/login" replace />;
  }
  return <>{children}</>;
};

const RequireFounder = ({ children }: PropsWithChildren) => {
  const isAuthenticated = useSessionStore((state) => state.isAuthenticated);
  const isFounder = useSessionStore((state) => state.user?.isFounder);
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  if (!isFounder) {
    return <Navigate to="/" replace />;
  }
  return <>{children}</>;
};

/** Qualquer usuário logado (dona ou fundador), sem exigir brechó ativo. */
const RequireSession = ({ children }: PropsWithChildren) => {
  const isAuthenticated = useSessionStore((state) => state.isAuthenticated);
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  return <>{children}</>;
};

export const App = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/conta/senha" element={<RequireSession><AccountChangePasswordPage /></RequireSession>} />
          <Route path="/admin" element={<Navigate to="/admin/brechos" replace />} />
          <Route path="/admin/brechos" element={<RequireFounder><AdminBrechosPage /></RequireFounder>} />
          <Route path="/admin/brechos/new" element={<RequireFounder><AdminBrechoFormPage /></RequireFounder>} />
          <Route path="/admin/brechos/:brechoId" element={<RequireFounder><AdminBrechoDetailPage /></RequireFounder>} />
          <Route path="/" element={<RequireAuth><InventoryPage /></RequireAuth>} />
          <Route path="/items/new" element={<RequireAuth><ItemCreateChoicePage /></RequireAuth>} />
          <Route path="/items/new/ai" element={<RequireAuth><ItemAIDraftPage /></RequireAuth>} />
          <Route path="/importacoes/criar" element={<RequireAuth><ImportacaoCriarPage /></RequireAuth>} />
          <Route path="/importacoes/:loteId/criar" element={<RequireAuth><ImportacaoCriarPage /></RequireAuth>} />
          <Route path="/importacoes/:loteId/grupos" element={<RequireAuth><ImportacaoGruposPage /></RequireAuth>} />
          <Route path="/importacoes/:loteId/rascunhos/:rascunhoId" element={<RequireAuth><ImportacaoRascunhoDetailPage /></RequireAuth>} />
          <Route path="/importacoes/:loteId/rascunhos" element={<RequireAuth><ImportacaoRascunhosPage /></RequireAuth>} />
          <Route path="/importacoes" element={<RequireAuth><ImportacaoInboxPage /></RequireAuth>} />
          <Route path="/items/new/manual" element={<RequireAuth><ItemManualCreatePage /></RequireAuth>} />
          <Route path="/items/:itemId" element={<RequireAuth><ItemDetailPage /></RequireAuth>} />
          <Route path="/items/:itemId/fotos/upload" element={<RequireAuth><ItemFotoUploadPage /></RequireAuth>} />
          <Route path="/reserve/:itemId" element={<RequireAuth><ReservePage /></RequireAuth>} />
          <Route path="/sell/:itemId" element={<RequireAuth><SellPage /></RequireAuth>} />
          <Route path="/vendas" element={<RequireAuth><SalesHubPage /></RequireAuth>} />
          <Route path="/deliveries" element={<RequireAuth><DeliveriesPage /></RequireAuth>} />
          <Route path="/clientes" element={<RequireAuth><ClientsPage /></RequireAuth>} />
          <Route path="/clientes/:clientId" element={<RequireAuth><ClientDetailPage /></RequireAuth>} />
          <Route path="/relatorios" element={<RequireAuth><ReportsPage /></RequireAuth>} />
          <Route path="/ai/quality" element={<RequireAuth><AiQualityPage /></RequireAuth>} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  );
};
