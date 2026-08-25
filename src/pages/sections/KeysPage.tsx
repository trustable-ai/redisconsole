/**
 * Keys — Visual Key Explorer.
 *
 * Lets the user explore the current Redis database with a bounded, cursor-based
 * SCAN (never KEYS *). Each key row shows its name, Redis TYPE and TTL. The
 * selected key opens a type-aware inspector (see KeyInspector) with safe,
 * paginated reads and the raw Redis command for every visual operation.
 */
import { useCallback, useEffect, useState } from "react";
import { Key, Loader2, RefreshCw, Search } from "lucide-react";
import { toast } from "sonner";
import { redisCommand } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CommandHint } from "@/components/keys/CommandHint";
import { KeyInspector } from "@/components/keys/KeyInspector";
import { cn } from "@/lib/utils";

interface KeyMeta {
  name: string;
  type: string;
  ttl: number;
}

const QUICK_PATTERNS = ["*", "user:*", "session:*", "cache:*"];
const PAGE = 50;

const TYPE_BADGE: Record<string, string> = {
  string: "bg-sky-500/10 text-sky-600 dark:text-sky-400",
  hash: "bg-violet-500/10 text-violet-600 dark:text-violet-400",
  list: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
  set: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  zset: "bg-rose-500/10 text-rose-600 dark:text-rose-400",
  stream: "bg-cyan-500/10 text-cyan-600 dark:text-cyan-400",
  none: "bg-muted text-muted-foreground",
};

function ttlText(ttl: number): string {
  if (ttl === -1) return "∞";
  if (ttl === -2) return "gone";
  return `${ttl}s`;
}

const quote = (v: unknown) => `"${String(v ?? "").replace(/"/g, '\\"')}"`;

/** De-duplicate keys by name, keeping the latest meta entry. */
function dedupe(arr: KeyMeta[]): KeyMeta[] {
  const map = new Map<string, KeyMeta>();
  for (const m of arr) map.set(m.name, m);
  return Array.from(map.values());
}

export default function KeysPage() {
  const [pattern, setPattern] = useState("*");
  const [searchInput, setSearchInput] = useState("*");
  const [keys, setKeys] = useState<KeyMeta[]>([]);
  const [cursor, setCursor] = useState(0);
  const [scanComplete, setScanComplete] = useState(false);
  const [loading, setLoading] = useState(false);
  const [moreLoading, setMoreLoading] = useState(false);
  const [dbsize, setDbsize] = useState<number | null>(null);
  const [selected, setSelected] = useState<string | null>(null);

  const fetchDbsize = useCallback(async () => {
    const res = await redisCommand({ cmd: "status" });
    setDbsize((res as any)?.dbsize ?? null);
  }, []);

  const refresh = useCallback(async (pat: string) => {
    setLoading(true);
    setKeys([]);
    setCursor(0);
    setScanComplete(false);
    const res = await redisCommand({
      cmd: "keys",
      op: "scan",
      pattern: pat || "*",
      count: PAGE,
      cursor: 0,
      withmeta: true,
    });
    setLoading(false);
    if (!res.ok) {
      toast.error((res as any).error?.message ?? "Scan failed");
      return;
    }
    setKeys((res as any).keyMeta ?? []);
    setCursor(Number((res as any).cursor ?? 0));
    setScanComplete(!!(res as any).scan_complete);
  }, []);

  const loadMore = useCallback(async () => {
    setMoreLoading(true);
    const res = await redisCommand({
      cmd: "keys",
      op: "scan",
      pattern: pattern || "*",
      count: PAGE,
      cursor,
      withmeta: true,
    });
    setMoreLoading(false);
    if (!res.ok) {
      toast.error((res as any).error?.message ?? "Scan failed");
      return;
    }
    const meta: KeyMeta[] = (res as any).keyMeta ?? [];
    setKeys((prev) => dedupe([...prev, ...meta]));
    setCursor(Number((res as any).cursor ?? 0));
    setScanComplete(!!(res as any).scan_complete);
  }, [pattern, cursor]);

  useEffect(() => {
    fetchDbsize();
    refresh("*");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const applySearch = () => {
    const pat = searchInput || "*";
    setPattern(pat);
    refresh(pat);
  };

  const applyQuick = (pat: string) => {
    setSearchInput(pat);
    setPattern(pat);
    refresh(pat);
  };

  const onDeleted = () => {
    setSelected(null);
    fetchDbsize();
    refresh(pattern);
  };

  /** Re-fetch the selected key's meta so the list stays in sync. */
  const onMetaChanged = useCallback(async () => {
    if (!selected) return;
    const t = await redisCommand({ cmd: "keys", op: "type", key: selected });
    const tl = await redisCommand({ cmd: "ttl", op: "ttl", key: selected });
    setKeys((prev) =>
      prev.map((k) =>
        k.name === selected
          ? {
              ...k,
              type: (t as any)?.type ?? k.type,
              ttl: Number((tl as any)?.ttl ?? k.ttl),
            }
          : k,
      ),
    );
  }, [selected]);

  return (
    <div className="flex h-full flex-col gap-4">
      {/* Header */}
      <div className="flex items-start gap-3">
        <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Key className="h-5 w-5" />
        </div>
        <div>
          <h2 className="text-lg font-semibold leading-tight">Keys</h2>
          <p className="text-sm text-muted-foreground">
            Scan, inspect, and delete keys across the database. Uses a
            cursor-based <code className="text-xs">SCAN</code> — never{" "}
            <code className="text-xs">KEYS *</code>.
          </p>
        </div>
      </div>

      {/* Toolbar */}
      <div className="rounded-lg border border-border bg-card p-3">
        <div className="flex flex-col gap-3 md:flex-row md:items-end">
          <div className="flex-1 space-y-1.5">
            <label htmlFor="keys-search" className="text-sm font-medium">
              Pattern (SCAN MATCH)
            </label>
            <div className="flex gap-2">
              <Input
                id="keys-search"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") applySearch();
                }}
                placeholder="user:*"
              />
              <Button onClick={applySearch} className="gap-2">
                <Search className="h-4 w-4" /> Scan
              </Button>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={() => {
                fetchDbsize();
                refresh(pattern);
              }}
              disabled={loading}
              className="gap-2"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
              Refresh
            </Button>
          </div>
        </div>

        <div className="mt-2 flex flex-wrap items-center gap-1.5">
          <span className="text-xs text-muted-foreground">Quick:</span>
          {QUICK_PATTERNS.map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => applyQuick(p)}
              className={cn(
                "rounded-md border px-2 py-0.5 font-mono text-xs transition-colors",
                pattern === p
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border bg-background hover:bg-accent",
              )}
            >
              {p}
            </button>
          ))}
        </div>
        <div className="mt-2">
          <CommandHint command={`SCAN 0 MATCH ${quote(pattern)} COUNT ${PAGE}`} />
        </div>
      </div>

      {/* Body: list + inspector */}
      <div className="flex min-h-0 flex-1 flex-col gap-4 lg:flex-row">
        {/* Key list */}
        <div className="flex w-full flex-col lg:w-1/2">
          <div className="mb-2 flex items-center justify-between text-xs text-muted-foreground">
            <span>
              {loading ? "Scanning…" : `${keys.length} keys loaded`}
              {scanComplete && " · scan complete"}
              {!scanComplete && keys.length > 0 && " · more available"}
            </span>
            <span>DB size: {dbsize ?? "—"}</span>
          </div>

          <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-lg border border-border bg-card">
            <div className="flex-1 overflow-auto">
              {loading && keys.length === 0 ? (
                <div className="flex items-center justify-center gap-2 py-8 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" /> Scanning keyspace…
                </div>
              ) : keys.length === 0 ? (
                <div className="flex items-center justify-center py-8 text-sm text-muted-foreground">
                  No keys match <span className="mx-1 font-mono">{pattern}</span>.
                </div>
              ) : (
                <table className="w-full text-sm">
                  <thead className="sticky top-0 z-10 bg-muted/80 text-left text-[11px] uppercase tracking-wide text-muted-foreground backdrop-blur">
                    <tr>
                      <th className="px-3 py-1.5">Key</th>
                      <th className="w-20 px-2 py-1.5">Type</th>
                      <th className="w-20 px-2 py-1.5">TTL</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {keys.map((k) => (
                      <tr
                        key={k.name}
                        onClick={() => setSelected(k.name)}
                        className={cn(
                          "cursor-pointer transition-colors",
                          selected === k.name
                            ? "bg-primary/10"
                            : "hover:bg-accent/50",
                        )}
                      >
                        <td className="break-all px-3 py-1.5 font-mono text-xs">
                          {k.name}
                        </td>
                        <td className="px-2 py-1.5">
                          <span
                            className={cn(
                              "rounded px-1.5 py-0.5 text-[11px] font-medium",
                              TYPE_BADGE[k.type] ?? TYPE_BADGE.none,
                            )}
                          >
                            {k.type}
                          </span>
                        </td>
                        <td className="px-2 py-1.5 font-mono text-xs text-muted-foreground">
                          {ttlText(k.ttl)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            {!scanComplete && keys.length > 0 && (
              <div className="border-t border-border p-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={loadMore}
                  disabled={moreLoading}
                  className="w-full gap-2"
                >
                  {moreLoading && <Loader2 className="h-4 w-4 animate-spin" />}
                  Load more keys (SCAN next cursor)
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* Inspector */}
        <div className="flex min-h-[320px] w-full flex-col lg:w-1/2">
          {selected ? (
            <KeyInspector
              key={selected}
              keyName={selected}
              onDeleted={onDeleted}
              onMetaChanged={onMetaChanged}
            />
          ) : (
            <div className="flex h-full flex-col items-center justify-center rounded-lg border border-dashed border-border bg-card p-6 text-center">
              <Key className="mb-2 h-8 w-8 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                Select a key from the list to inspect its value, type, and TTL.
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Each visual operation shows its raw Redis command.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}