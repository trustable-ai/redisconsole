import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { HashRouter, Routes, Route, Navigate } from "react-router-dom";
import { AppLayout } from "@/components/AppLayout";
import OverviewPage from "@/pages/sections/OverviewPage";
import KeysPage from "@/pages/sections/KeysPage";
import StringsPage from "@/pages/sections/StringsPage";
import HashesPage from "@/pages/sections/HashesPage";
import ListsPage from "@/pages/sections/ListsPage";
import SetsPage from "@/pages/sections/SetsPage";
import SortedSetsPage from "@/pages/sections/SortedSetsPage";
import StreamsPage from "@/pages/sections/StreamsPage";
import PubSubPage from "@/pages/sections/PubSubPage";
import TtlPage from "@/pages/sections/TtlPage";
import TransactionsPage from "@/pages/sections/TransactionsPage";
import RawPage from "@/pages/sections/RawPage";
import LaboratoriesPage from "@/pages/LaboratoriesPage";
import NotFound from "@/pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <HashRouter>
        <Routes>
          <Route element={<AppLayout />}>
            <Route path="/" element={<Navigate to="/overview" replace />} />
            <Route path="/overview" element={<OverviewPage />} />
            <Route path="/keys" element={<KeysPage />} />
            <Route path="/strings" element={<StringsPage />} />
            <Route path="/hashes" element={<HashesPage />} />
            <Route path="/lists" element={<ListsPage />} />
            <Route path="/sets" element={<SetsPage />} />
            <Route path="/sorted-sets" element={<SortedSetsPage />} />
            <Route path="/streams" element={<StreamsPage />} />
            <Route path="/pub-sub" element={<PubSubPage />} />
            <Route path="/ttl" element={<TtlPage />} />
            <Route path="/transactions" element={<TransactionsPage />} />
            <Route path="/raw" element={<RawPage />} />
            <Route path="/laboratories" element={<LaboratoriesPage />} />
          </Route>
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </HashRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;