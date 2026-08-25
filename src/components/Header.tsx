import { Menu, Moon, Sun, RefreshCw } from "lucide-react";
import { ConnectionBadge, type ConnectionInfo } from "@/components/ConnectionBadge";
import { Button } from "@/components/ui/button";

interface HeaderProps {
  onMenu: () => void;
  connection: ConnectionInfo;
  connectionLoading: boolean;
  onRefreshConnection: () => void;
  theme: "light" | "dark";
  onToggleTheme: () => void;
}

export function Header({
  onMenu,
  connection,
  connectionLoading,
  onRefreshConnection,
  theme,
  onToggleTheme,
}: HeaderProps) {
  return (
    <header className="sticky top-0 z-20 flex h-14 items-center justify-between gap-3 border-b border-border bg-background/80 px-3 backdrop-blur md:px-6">
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="icon"
          className="md:hidden"
          onClick={onMenu}
          aria-label="Open navigation"
        >
          <Menu className="h-5 w-5" />
        </Button>
        <h1 className="text-sm font-semibold tracking-tight md:text-base">
          Redis Console
        </h1>
      </div>

      <div className="flex items-center gap-2">
        <ConnectionBadge info={connection} loading={connectionLoading} />
        <Button
          variant="ghost"
          size="icon"
          onClick={onRefreshConnection}
          aria-label="Refresh connection status"
          title="Refresh status"
        >
          <RefreshCw className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={onToggleTheme}
          aria-label="Toggle theme"
          title="Toggle theme"
        >
          {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </Button>
      </div>
    </header>
  );
}