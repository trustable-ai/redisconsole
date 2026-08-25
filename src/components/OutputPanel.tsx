import { Loader2, CheckCircle2, XCircle, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { RedisResponse } from "@/lib/api";
import { toast } from "sonner";

interface OutputPanelProps {
  loading: boolean;
  result: RedisResponse | null;
  error: string | null;
  title?: string;
}

export function OutputPanel({ loading, result, error, title = "Result" }: OutputPanelProps) {
  const ok = result?.ok !== false && !error;
  const pretty =
    result != null ? JSON.stringify(result, null, 2) : error ? JSON.stringify({ error }, null, 2) : "";

  return (
    <div className="flex h-full flex-col overflow-hidden rounded-lg border border-border bg-card">
      <div className="flex items-center justify-between border-b border-border px-4 py-2.5">
        <div className="flex items-center gap-2">
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          ) : ok ? (
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
          ) : (
            <XCircle className="h-4 w-4 text-destructive" />
          )}
          <span className="text-sm font-medium">{title}</span>
        </div>
        {pretty && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              navigator.clipboard?.writeText(pretty);
              toast.success("Copied to clipboard");
            }}
          >
            <Copy className="h-3.5 w-3.5" /> Copy
          </Button>
        )}
      </div>
      <div className="flex-1 overflow-auto">
        {loading ? (
          <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
            <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Running command…
          </div>
        ) : !result && !error ? (
          <div className="flex h-full items-center justify-center p-6 text-center text-sm text-muted-foreground">
            Run a command to see the result here.
          </div>
        ) : (
          <pre
            className={cn(
              "whitespace-pre-wrap break-words p-4 font-mono text-xs leading-relaxed",
              ok ? "text-foreground" : "text-destructive",
            )}
          >
            {pretty}
          </pre>
        )}
      </div>
    </div>
  );
}