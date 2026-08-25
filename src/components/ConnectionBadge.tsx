import { useEffect, useState } from "react";
import { redisCommand } from "@/lib/api";
import { cn } from "@/lib/utils";
import { Loader2, Wifi, WifiOff } from "lucide-react";

export interface ConnectionInfo {
  connected: boolean;
  dbsize?: number;
  prefix?: string;
}

export function useConnection(intervalMs = 10000) {
  const [info, setInfo] = useState<ConnectionInfo>({ connected: false });
  const [loading, setLoading] = useState(true);

  const check = async () => {
    try {
      const res = await redisCommand({ cmd: "status" });
      setInfo({
        connected: !!res.ok && (res as any).connected,
        dbsize: (res as any).dbsize,
        prefix: (res as any).prefix,
      });
    } catch {
      setInfo({ connected: false });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    check();
    const id = setInterval(check, intervalMs);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [intervalMs]);

  return { info, loading, refresh: check };
}

export function ConnectionBadge({ info, loading }: { info: ConnectionInfo; loading: boolean }) {
  const connected = info.connected;
  return (
    <div
      className={cn(
        "inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
        connected
          ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
          : "border-destructive/30 bg-destructive/10 text-destructive",
      )}
      title={connected ? `Connected · ${info.dbsize ?? 0} keys` : "Redis not reachable"}
    >
      {loading ? (
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
      ) : connected ? (
        <Wifi className="h-3.5 w-3.5" />
      ) : (
        <WifiOff className="h-3.5 w-3.5" />
      )}
      <span>{connected ? "Connected" : "Disconnected"}</span>
      {connected && info.dbsize !== undefined && (
        <span className="text-muted-foreground">· {info.dbsize} keys</span>
      )}
    </div>
  );
}