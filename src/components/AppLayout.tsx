import { Outlet } from "react-router-dom";
import { Header } from "@/components/Header";
import { Sidebar, useSidebar } from "@/components/Sidebar";
import { useConnection } from "@/components/ConnectionBadge";
import { useTheme } from "@/hooks/use-theme";

export function AppLayout() {
  const { open, setOpen } = useSidebar();
  const { info, loading, refresh } = useConnection(15000);
  const { theme, toggle } = useTheme();

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-background text-foreground">
      <Sidebar open={open} onClose={() => setOpen(false)} />
      <div className="flex min-w-0 flex-1 flex-col">
        <Header
          onMenu={() => setOpen(true)}
          connection={info}
          connectionLoading={loading}
          onRefreshConnection={refresh}
          theme={theme}
          onToggleTheme={toggle}
        />
        <main className="flex-1 overflow-auto p-3 md:p-6">
          <div className="mx-auto h-full max-w-7xl">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}