import { useEffect, useState } from "react";
import {
  LayoutDashboard,
  Database,
  Hash,
  Clock,
  Server,
  Users,
  MemoryStick,
  Target,
  KeyRound,
  Activity,
  Trash2,
  Layers,
} from "lucide-react";
import { redisCommand, type RedisResponse } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { OutputPanel } from "@/components/OutputPanel";
import { useRedisCommand } from "@/hooks/use-redis-command";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface Stats {
  redis_version?: string;
  redis_mode?: string;
  os?: string;
  arch_bits?: number;
  uptime_in_seconds?: number;
  connected_clients?: number;
  used_memory?: number;
  used_memory_human?: string;
  used_memory_peak_human?: string;
  total_keys?: number;
  current_db?: number;
  keyspace_hits?: number;
  keyspace_misses?: number;
  hit_rate?: number | null;
  expired_keys?: number;
  evicted_keys?: number;
  rejected_connections?: number;
  total_connections_received?: number;
  total_commands_processed?: number;
  keyspace?: Record<string, Record<string, number>>;
}

function fmtUptime(seconds: number): string {
  if (!seconds || seconds < 0) return "—";
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const parts: string[] = [];
  if (d > 0) parts.push(`${d}d`);
  if (h > 0 || d > 0) parts.push(`${h}h`);
  parts.push(`${m}m`);
  return parts.join(" ");
}

function fmtBytes(n: number): string {
  if (!n || n < 0) return "—";
  const units = ["B", "KB", "MB", "GB", "TB"];
  let v = n;
  let i = 0;
  while (v >= 1024 && i < units.length - 1) {
    v /= 1024;
    i++;
  }
  return `${v.toFixed(v < 10 && i > 0 ? 1 : 0)} ${units[i]}`;
}

interface CardProps {
  icon: typeof Database;
  label: string;
  value: string;
  sub?: string;
  tone?: "default" | "emerald" | "amber" | "rose";
}

function StatCard({ icon: Icon, label, value, sub, tone = "default" }: CardProps) {
  const toneCls =
    tone === "emerald"
      ? "text-emerald-600 dark:text-emerald-400"
      : tone === "amber"
        ? "text-amber-600 dark:text-amber-400"
        : tone === "rose"
          ? "text-rose-600 dark:text-rose-400"
          : "text-primary";
  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <div className="flex items-center gap-2 text-muted-foreground">
        <Icon className={cn("h-4 w-4", toneCls)} />
        <span className="text-xs font-medium uppercase tracking-wide">{label}</span>
      </div>
      <div className="mt-2 truncate text-lg font-semibold" title={value}>{value}</div>
      {sub && <div className="mt-0.5 truncate text-xs text-muted-foreground">{sub}</div>}
    </div>
  );
}

export default function OverviewPage() {
  const status = useRedisCommand();
  const [stats, setStats] = useState<RedisResponse | null>(null);

  const load = () => {
    status.run({ cmd: "status", detail: true }).then((r) => setStats(r));
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const connected = (stats as any)?.connected === true;
  const prefix = (stats as any)?.prefix || "—";
  const info: Stats = ((stats as any)?.info ?? {}) as Stats;
  const detailed: Stats = ((stats as any)?.stats ?? {}) as Stats;
  const dbsize: number = (stats as any)?.dbsize ?? 0;

  // Prefer the structured `stats` object (always present with detail:true),
  // fall back to the narrow `info` object for resilience.
  const redisVersion = detailed.redis_version ?? info.redis_version ?? "—";
  const uptimeSec = Number(detailed.uptime_in_seconds ?? info.uptime_in_seconds ?? 0);
  const connectedClients = detailed.connected_clients ?? info.connected_clients;
  const usedMemoryHuman =
    detailed.used_memory_human ?? info.used_memory_human ?? "—";
  const totalKeys = detailed.total_keys ?? dbsize;
  const currentDb = detailed.current_db ?? 0;
  const hitRate = detailed.hit_rate;
  const expiredKeys = detailed.expired_keys;
  const evictedKeys = detailed.evicted_keys;

  const connectionValue = stats
    ? connected
      ? "Healthy"
      : "Disconnected"
    : "—";

  const cards: CardProps[] = [
    {
      icon: Database,
      label: "Connection",
      value: connectionValue,
      sub: connected ? "PING ok" : "Redis not reachable",
      tone: connected ? "emerald" : "rose",
    },
    {
      icon: Server,
      label: "Redis version",
      value: String(redisVersion ?? "—"),
      sub: detailed.redis_mode ? `mode: ${detailed.redis_mode}` : undefined,
    },
    {
      icon: Clock,
      label: "Uptime",
      value: fmtUptime(uptimeSec),
      sub: `${uptimeSec.toLocaleString()} s`,
    },
    {
      icon: Users,
      label: "Connected clients",
      value: connectedClients != null ? String(connectedClients) : "—",
      sub: detailed.rejected_connections
        ? `${detailed.rejected_connections} rejected`
        : undefined,
    },
    {
      icon: MemoryStick,
      label: "Used memory",
      value: String(usedMemoryHuman ?? "—"),
      sub: detailed.used_memory_peak_human
        ? `peak ${detailed.used_memory_peak_human}`
        : undefined,
    },
    {
      icon: Hash,
      label: "Total keys",
      value: totalKeys != null ? String(totalKeys) : "—",
      sub: `DBSIZE`,
    },
    {
      icon: Layers,
      label: "Current database",
      value: `db${currentDb}`,
      sub: detailed.keyspace && detailed.keyspace[`db${currentDb}`]
        ? `${detailed.keyspace[`db${currentDb}`].keys ?? 0} keys · ${detailed.keyspace[`db${currentDb}`].expires ?? 0} expiring`
        : undefined,
    },
    {
      icon: Target,
      label: "Hit rate",
      value: hitRate == null ? "—" : `${hitRate}%`,
      sub:
        detailed.keyspace_hits != null && detailed.keyspace_misses != null
          ? `${detailed.keyspace_hits} hits / ${detailed.keyspace_misses} misses`
          : undefined,
      tone: hitRate == null ? "default" : hitRate >= 80 ? "emerald" : hitRate >= 50 ? "amber" : "rose",
    },
    {
      icon: Trash2,
      label: "Expired keys",
      value: expiredKeys != null ? String(expiredKeys) : "—",
    },
    {
      icon: KeyRound,
      label: "Evicted keys",
      value: evictedKeys != null ? String(evictedKeys) : "—",
      tone: evictedKeys && evictedKeys > 0 ? "rose" : "default",
    },
  ];

  return (
    <div className="flex h-full flex-col gap-4 xl:flex-row">
      <div className="flex w-full flex-col xl:w-3/5">
        <div className="mb-4 flex items-start gap-3">
          <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <LayoutDashboard className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-lg font-semibold leading-tight">Overview</h2>
            <p className="text-sm text-muted-foreground">
              Live status of the Redis instance backing this console, exposed
              through <code className="text-xs">INFO</code> and{" "}
              <code className="text-xs">DBSIZE</code> via the{" "}
              <code className="text-xs">v1/console</code> action.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {cards.map((c) => (
            <StatCard key={c.label} {...c} />
          ))}
        </div>

        <div className="mt-4 rounded-lg border border-border bg-card p-4 text-sm">
          <div className="mb-1 flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
            <Activity className="h-3.5 w-3.5" /> Active prefix
          </div>
          <code className="break-all text-xs">{prefix}</code>
          <p className="mt-2 text-xs text-muted-foreground">
            All keys you create through this console are stored under this
            per-app namespace automatically.
          </p>
        </div>

        <div className="mt-4 flex justify-end">
          <Button onClick={load} variant="outline" className="gap-2" disabled={status.loading}>
            {status.loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Database className="h-4 w-4" />}
            Refresh status
          </Button>
        </div>
      </div>

      <div className="flex min-h-[280px] w-full flex-col xl:w-2/5">
        <OutputPanel
          loading={status.loading}
          result={stats as any}
          error={status.error}
          title="Server info (INFO)"
        />
      </div>
    </div>
  );
}