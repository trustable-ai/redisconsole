import { useEffect, useState } from "react";
import { LayoutDashboard, Database, Hash, Clock, Server } from "lucide-react";
import { redisCommand } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { OutputPanel } from "@/components/OutputPanel";
import { useRedisCommand } from "@/hooks/use-redis-command";
import { Loader2 } from "lucide-react";

export default function OverviewPage() {
  const status = useRedisCommand();
  const [stats, setStats] = useState<any>(null);

  const load = () => {
    status.run({ cmd: "status", detail: true }).then((r) => setStats(r));
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const info = (stats as any)?.info ?? {};

  const cards = [
    { icon: Database, label: "Connection", value: (stats as any)?.connected ? "Healthy (PING ok)" : "—" },
    { icon: Hash, label: "DB size", value: String((stats as any)?.dbsize ?? 0) },
    { icon: Clock, label: "Uptime", value: info.uptime_in_seconds ? `${Math.round(Number(info.uptime_in_seconds) / 60)} min` : "—" },
    { icon: Server, label: "Redis version", value: info.redis_version ?? "—" },
  ];

  return (
    <div className="flex h-full flex-col gap-4 lg:flex-row">
      <div className="flex w-full flex-col lg:w-1/2">
        <div className="mb-4 flex items-start gap-3">
          <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <LayoutDashboard className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-lg font-semibold leading-tight">Overview</h2>
            <p className="text-sm text-muted-foreground">
              Live status of the Redis instance backing this console, exposed
              through the <code className="text-xs">v1/console</code> action.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {cards.map((c) => (
            <div key={c.label} className="rounded-lg border border-border bg-card p-4">
              <div className="flex items-center gap-2 text-muted-foreground">
                <c.icon className="h-4 w-4" />
                <span className="text-xs font-medium uppercase tracking-wide">{c.label}</span>
              </div>
              <div className="mt-2 truncate text-lg font-semibold">{c.value}</div>
            </div>
          ))}
        </div>

        <div className="mt-4 rounded-lg border border-border bg-card p-4 text-sm">
          <div className="mb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Active prefix
          </div>
          <code className="break-all text-xs">
            {(stats as any)?.prefix || "—"}
          </code>
          <p className="mt-2 text-xs text-muted-foreground">
            All keys you create through this console are stored under this
            per-app namespace automatically.
          </p>
        </div>

        <div className="mt-4 flex justify-end">
          <Button onClick={load} variant="outline" className="gap-2">
            {status.loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Database className="h-4 w-4" />}
            Refresh status
          </Button>
        </div>
      </div>

      <div className="flex min-h-[280px] w-full flex-col lg:w-1/2">
        <OutputPanel
          loading={status.loading}
          result={stats as any}
          error={status.error}
          title="Server info"
        />
      </div>
    </div>
  );
}