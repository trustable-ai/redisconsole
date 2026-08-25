import { useCallback, useEffect, useRef, useState } from "react";
import { Terminal, Trash2, ChevronUp, ChevronDown, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { redisCommand, type RedisResponse } from "@/lib/api";
import { cn } from "@/lib/utils";

/**
 * Terminal-like Redis command console.
 *
 * Sends commands to the OpenServerless `v1/console` action (cmd="raw"). The
 * backend parses the line (quoted arguments supported, no eval), enforces an
 * authoritative denylist for dangerous commands, executes against Redis, and
 * returns the result + execution duration. The frontend never connects to
 * Redis directly.
 *
 * Features:
 *  - command history (persisted for the browser session in localStorage)
 *  - Up/Down navigation through history
 *  - Enter to execute
 *  - multiline output, execution duration, and error display
 *  - clear console
 */

const HISTORY_KEY = "redisconsole2:console:history";
const ENTRIES_KEY = "redisconsole2:console:entries";
const MAX_HISTORY = 100;
const MAX_ENTRIES = 200;

// Redis status-reply commands whose True/None result renders as "OK" /
// "(nil)" the way redis-cli would, for a familiar console feel. This is a
// display concern only; the backend returns the raw typed reply.
const STATUS_OK_COMMANDS = new Set([
  "SET", "MSET", "SETEX", "PSETEX", "GETSET", "SELECT", "QUIT", "RENAME",
  "RENAMENX", "COPY", "MOVE", "PERSIST", "EXPIRE", "PEXPIRE", "EXPIREAT",
  "PEXPIREAT", "SAVE", "BGSAVE", "BGREWRITEAOF", "FLUSHALL", "FLUSHDB",
  "SHUTDOWN",
]);

export interface ConsoleEntry {
  id: number;
  command: string;
  /** Pre-formatted, multi-line output text. */
  output: string;
  isError: boolean;
  durationMs: number | null;
  at: number;
}

function loadHistory(): string[] {
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((x) => typeof x === "string") : [];
  } catch {
    return [];
  }
}

function loadEntries(): ConsoleEntry[] {
  try {
    const raw = localStorage.getItem(ENTRIES_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.slice(-MAX_ENTRIES) : [];
  } catch {
    return [];
  }
}

/** Escape a string for redis-cli-style double-quoted rendering. */
function quoteString(value: string): string {
  return `"${value.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
}

/** Format a single scalar element for inline display. */
function formatScalar(value: unknown): string {
  if (value === null || value === undefined) return "(nil)";
  if (typeof value === "boolean") return value ? "true" : "false";
  if (typeof value === "number") return Number.isFinite(value) ? String(value) : String(value);
  if (typeof value === "string") return quoteString(value);
  // Fallback for unexpected scalar shapes.
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

/** Render a Redis reply in a redis-cli-like, multi-line form. */
function formatResult(cmdName: string, result: unknown): string {
  const upper = cmdName.toUpperCase();

  if (result === null || result === undefined) {
    if (STATUS_OK_COMMANDS.has(upper)) return "(nil)";
    return "(nil)";
  }
  if (typeof result === "boolean") {
    // Status-reply commands return True on success -> show "OK".
    if (result && STATUS_OK_COMMANDS.has(upper)) return "OK";
    if (!result && STATUS_OK_COMMANDS.has(upper)) return "(nil)";
    return result ? "true" : "false";
  }
  if (typeof result === "number") return String(result);
  if (typeof result === "string") return result === "" ? `""` : quoteString(result);

  if (Array.isArray(result)) {
    if (result.length === 0) return "(empty array)";
    return result
      .map((item, i) => `${i + 1}) ${formatReplyElement(item, 1)}`)
      .join("\n");
  }

  if (typeof result === "object") {
    const entries = Object.entries(result as Record<string, unknown>);
    if (entries.length === 0) return "(empty object)";
    return entries
      .map(([k, v]) => `${k}: ${formatReplyElement(v, 1)}`)
      .join("\n");
  }

  try {
    return JSON.stringify(result, null, 2);
  } catch {
    return String(result);
  }
}

/** Format an element that may be nested inside arrays / objects. */
function formatReplyElement(value: unknown, depth: number): string {
  if (value === null || value === undefined) return "(nil)";
  if (typeof value === "boolean") return value ? "true" : "false";
  if (typeof value === "number") return String(value);
  if (typeof value === "string") return quoteString(value);
  if (Array.isArray(value)) {
    if (value.length === 0) return "[]";
    const indent = "  ".repeat(depth);
    return "[\n" + value
      .map((item, i) => `${indent}  ${i + 1}) ${formatReplyElement(item, depth + 1)}`)
      .join("\n") + `\n${indent}]`;
  }
  if (typeof value === "object") {
    try {
      return JSON.stringify(value, null, 2);
    } catch {
      return String(value);
    }
  }
  return String(value);
}

/** Extract the human-readable error text from a RedisResponse. */
function errorText(res: RedisResponse): string {
  const errAny = res.error as unknown;
  if (errAny && typeof errAny === "object") {
    const e = errAny as Record<string, unknown>;
    const message = typeof e.message === "string" ? e.message : "";
    const type = typeof e.type === "string" ? e.type : "";
    return [message, type].filter(Boolean).join(" — ") || "Unknown error";
  }
  if (typeof errAny === "string" && errAny) return errAny;
  return "Unknown error";
}

export function RedisConsole() {
  const [entries, setEntries] = useState<ConsoleEntry[]>(() => loadEntries());
  const [history, setHistory] = useState<string[]>(() => loadHistory());
  const [historyIndex, setHistoryIndex] = useState<number | null>(null);
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(false);

  const nextIdRef = useRef<number>(
    entries.length > 0 ? Math.max(...entries.map((e) => e.id)) + 1 : 1,
  );
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  // Persist history + entries for the browser session.
  useEffect(() => {
    try {
      localStorage.setItem(HISTORY_KEY, JSON.stringify(history.slice(-MAX_HISTORY)));
    } catch {
      /* ignore quota errors */
    }
  }, [history]);

  useEffect(() => {
    try {
      localStorage.setItem(ENTRIES_KEY, JSON.stringify(entries.slice(-MAX_ENTRIES)));
    } catch {
      /* ignore quota errors */
    }
  }, [entries]);

  // Auto-scroll to the latest entry / prompt.
  const scrollToBottom = useCallback(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [entries, loading, scrollToBottom]);

  const pushEntry = useCallback(
    (command: string, output: string, isError: boolean, durationMs: number | null) => {
      const id = nextIdRef.current++;
      const entry: ConsoleEntry = { id, command, output, isError, durationMs, at: Date.now() };
      setEntries((prev) => [...prev, entry].slice(-MAX_ENTRIES));
    },
    [],
  );

  const runCommand = useCallback(
    async (command: string) => {
      const trimmed = command.trim();
      if (!trimmed || loading) return;

      setLoading(true);

      // Update history (dedupe consecutive duplicates), reset navigation.
      setHistory((prev) => {
        const last = prev[prev.length - 1];
        const next = last === trimmed ? prev : [...prev, trimmed];
        return next.slice(-MAX_HISTORY);
      });
      setHistoryIndex(null);

      const start = performance.now();
      let res: RedisResponse;
      try {
        res = await redisCommand({ cmd: "raw", command: trimmed });
      } catch (e) {
        const wallMs = Math.round(performance.now() - start);
        const msg = e instanceof Error ? e.message : "Request failed";
        pushEntry(trimmed, msg, true, wallMs);
        setLoading(false);
        return;
      }
      const wallMs = Math.round(performance.now() - start);

      const ok = res.ok !== false;
      // Prefer the backend-measured Redis execution duration; fall back to
      // the frontend wall-clock time which includes network round-trip.
      const backendMs =
        typeof res.duration_ms === "number" && Number.isFinite(res.duration_ms)
          ? Math.round(res.duration_ms)
          : wallMs;

      if (ok) {
        const cmdName = typeof res.command === "string" ? res.command : trimmed.split(/\s+/)[0];
        const out = formatResult(cmdName, res.result);
        pushEntry(trimmed, out, false, backendMs);
      } else {
        pushEntry(trimmed, errorText(res), true, backendMs);
      }

      setLoading(false);
      // Keep focus on the input for rapid successive commands.
      requestAnimationFrame(() => inputRef.current?.focus());
    },
    [loading, pushEntry],
  );

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      runCommand(draft);
      return;
    }
    if (e.key === "ArrowUp") {
      if (history.length === 0) return;
      e.preventDefault();
      setHistoryIndex((prev) => {
        const idx = prev === null ? history.length - 1 : Math.max(0, prev - 1);
        setDraft(history[idx] ?? "");
        return idx;
      });
      return;
    }
    if (e.key === "ArrowDown") {
      if (historyIndex === null) return;
      e.preventDefault();
      setHistoryIndex((prev) => {
        if (prev === null) return null;
        const idx = prev + 1;
        if (idx >= history.length) {
          setDraft("");
          return null;
        }
        setDraft(history[idx] ?? "");
        return idx;
      });
      return;
    }
  };

  const clearConsole = () => {
    setEntries([]);
    try {
      localStorage.removeItem(ENTRIES_KEY);
    } catch {
      /* ignore */
    }
    requestAnimationFrame(() => inputRef.current?.focus());
  };

  const clearHistory = () => {
    setHistory([]);
    setHistoryIndex(null);
    try {
      localStorage.removeItem(HISTORY_KEY);
    } catch {
      /* ignore */
    }
  };

  return (
    <div className="flex h-full flex-col gap-4">
      <div className="flex items-start gap-3">
        <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Terminal className="h-5 w-5" />
        </div>
        <div className="flex-1">
          <h2 className="text-lg font-semibold leading-tight">Console</h2>
          <p className="text-sm text-muted-foreground">
            Execute raw Redis commands. Quoted arguments are supported; the
            backend enforces a denylist for dangerous commands and never uses
            <code className="mx-1 rounded bg-muted px-1 py-0.5 text-xs">eval</code>
            or shell execution.
          </p>
        </div>
      </div>

      <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-lg border border-border bg-black/95 shadow-inner">
        {/* Output log */}
        <div
          ref={scrollRef}
          className="flex-1 overflow-auto p-3 font-mono text-[13px] leading-relaxed text-emerald-300/90 sm:p-4"
          aria-live="polite"
        >
          {entries.length === 0 && !loading ? (
            <div className="text-emerald-300/40">
              Type a Redis command and press Enter. Try:{" "}
              <span className="text-emerald-300/80">PING</span>,{" "}
              <span className="text-emerald-300/80">SET hello world</span>,{" "}
              <span className="text-emerald-300/80">GET hello</span>.
            </div>
          ) : null}

          {entries.map((entry) => (
            <div key={entry.id} className="mb-3">
              <div className="flex flex-wrap items-baseline gap-x-2">
                <span className="select-none text-emerald-400">&gt;</span>
                <span className="break-all text-emerald-200">{entry.command}</span>
              </div>
              <pre
                className={cn(
                  "mt-1 whitespace-pre-wrap break-words pl-3",
                  entry.isError ? "text-red-400" : "text-emerald-300/90",
                )}
              >
                {entry.output || (entry.isError ? "(error)" : "(no output)")}
              </pre>
              {entry.durationMs !== null && (
                <div className="mt-0.5 pl-3 text-[11px] text-emerald-300/40">
                  ({entry.durationMs} ms)
                </div>
              )}
            </div>
          ))}

          {loading && (
            <div className="mb-3 flex items-center gap-2 text-emerald-300/70">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              <span>executing…</span>
            </div>
          )}
        </div>

        {/* Prompt / input row */}
        <div className="flex items-center gap-2 border-t border-emerald-900/40 bg-black px-2 py-2 sm:px-3">
          <span className="select-none font-mono text-sm text-emerald-400">&gt;</span>
          <Input
            ref={inputRef}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Type a Redis command, e.g. GET hello"
            autoFocus
            spellCheck={false}
            autoComplete="off"
            autoCapitalize="off"
            className="flex-1 border-0 bg-transparent font-mono text-[13px] text-emerald-200 shadow-none focus-visible:ring-0 focus-visible:ring-offset-0"
          />
          <Button
            type="button"
            size="sm"
            onClick={() => runCommand(draft)}
            disabled={loading || draft.trim().length === 0}
            className="gap-1.5"
          >
            Run
          </Button>
        </div>
      </div>

      {/* Console controls */}
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={clearConsole} className="gap-1.5">
            <Trash2 className="h-3.5 w-3.5" /> Clear console
          </Button>
          {history.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={clearHistory}
              className="gap-1.5 text-muted-foreground"
              title="Clear command history"
            >
              Clear history
            </Button>
          )}
        </div>
        <div className="flex items-center gap-3">
          <span className="inline-flex items-center gap-1">
            <kbd className="rounded border border-border bg-muted px-1.5 py-0.5 font-mono text-[10px]">
              <ChevronUp className="inline h-3 w-3" />
            </kbd>
            <kbd className="rounded border border-border bg-muted px-1.5 py-0.5 font-mono text-[10px]">
              <ChevronDown className="inline h-3 w-3" />
            </kbd>
            history
          </span>
          <span>
            <kbd className="rounded border border-border bg-muted px-1.5 py-0.5 font-mono text-[10px]">
              Enter
            </kbd>{" "}
            run
          </span>
          <span>{history.length} in history</span>
        </div>
      </div>
    </div>
  );
}