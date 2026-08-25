import { Copy } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

interface CommandHintProps {
  /** The Redis command string this visual operation corresponds to. */
  command: string;
  className?: string;
}

/** Command-view options recognized for highlighting (beyond the verb + key). */
const OPTION_TOKENS = new Set([
  "EX", "PX", "EXAT", "PXAT", "NX", "XX", "GET", "KEEPTTL", "IFGT", "IFLT",
  "WITHSCORES", "BYSCORE", "BYRANK", "LIMIT", "MATCH", "COUNT", "TYPE",
  "ASC", "DESC", "REV", "STORE", "BY", "FROM", "TO",
]);

/**
 * Token-level Redis command syntax highlighter. The command verb (first
 * token) is primary-colored, known options are amber, quoted values are
 * emerald, and remaining tokens (keys / args) are cyan.
 */
function highlightToken(tok: string, idx: number): ReactNode {
  if (idx === 0) {
    return <span className="font-semibold text-primary">{tok}</span>;
  }
  const upper = tok.toUpperCase();
  if (OPTION_TOKENS.has(upper)) {
    return <span className="text-amber-600 dark:text-amber-400">{tok}</span>;
  }
  if (tok.startsWith('"') && tok.endsWith('"')) {
    return <span className="text-emerald-600 dark:text-emerald-400">{tok}</span>;
  }
  if (/^-?\d+(\.\d+)?$/.test(tok)) {
    return <span className="text-rose-500">{tok}</span>;
  }
  return <span className="text-cyan-600 dark:text-cyan-400">{tok}</span>;
}

/**
 * Shows the raw Redis command equivalent of a visual operation, so the
 * console doubles as a Redis learning tool. Rendered in a monospace badge
 * with token-level syntax highlighting and a copy button.
 */
export function CommandHint({ command, className }: CommandHintProps) {
  const trimmed = command.trim();
  const tokens = trimmed.length ? trimmed.split(/\s+/) : [];

  return (
    <div
      className={cn(
        "flex items-center gap-2 rounded-md border border-border bg-muted/50 px-3 py-1.5 font-mono text-xs",
        className,
      )}
    >
      <span className="shrink-0 text-muted-foreground">redis&gt;</span>
      <code className="min-w-0 break-all text-foreground">
        {tokens.map((t, i) => (
          <span key={i}>
            {i > 0 ? " " : ""}
            {highlightToken(t, i)}
          </span>
        ))}
      </code>
      <button
        type="button"
        className="ml-auto inline-flex shrink-0 items-center text-muted-foreground transition-colors hover:text-foreground"
        aria-label="Copy command"
        onClick={() => {
          navigator.clipboard?.writeText(command);
          toast.success("Command copied");
        }}
      >
        <Copy className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}