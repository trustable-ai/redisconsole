import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { Loader2, Play, Sparkles, Trash2, Terminal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { RedisResponse } from "@/lib/api";

/** Command-view options recognized for highlighting (beyond the verb + key). */
const OPTION_TOKENS = new Set([
  "EX", "PX", "EXAT", "PXAT", "NX", "XX", "GET", "KEEPTTL", "IFGT", "IFLT",
]);

function highlightToken(tok: string, idx: number): ReactNode {
  if (idx === 0) {
    return <span className="font-semibold text-primary">{tok}</span>;
  }
  if (OPTION_TOKENS.has(tok.toUpperCase())) {
    return <span className="text-amber-500">{tok}</span>;
  }
  if (tok.startsWith('"') && tok.endsWith('"')) {
    return <span className="text-emerald-500">{tok}</span>;
  }
  // Heuristic: tokens containing ":" or starting with redis-console:demo: are keys.
  if (tok.includes(":") || /^[A-Za-z0-9_-]+$/.test(tok)) {
    return <span className="text-cyan-500">{tok}</span>;
  }
  return tok;
}

export function CommandView({ command }: { command: string }) {
  const trimmed = command.trim();
  const tokens = trimmed.length ? trimmed.split(/\s+/) : [];
  return (
    <div className="rounded-md border border-border bg-muted/40 px-3 py-2 font-mono text-xs leading-relaxed">
      {tokens.length === 0 ? (
        <span className="text-muted-foreground">Fill the parameters to build a command…</span>
      ) : (
        tokens.map((t, i) => (
          <span key={i}>
            {i > 0 ? " " : ""}
            {highlightToken(t, i)}
          </span>
        ))
      )}
    </div>
  );
}

/** Compact JSON-ish state snapshot for before/after visualization. */
function StateSnap({ snap, label }: { snap: RedisResponse | null; label: string }) {
  const empty = !snap || snap.ok === false;
  return (
    <div className="flex flex-col rounded-md border border-border bg-card">
      <div className="border-b border-border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </div>
      <div className="max-h-40 overflow-auto px-2.5 py-1.5">
        {empty ? (
          <span className="text-xs text-muted-foreground">—</span>
        ) : (
          <pre className="whitespace-pre-wrap break-words font-mono text-[11px] leading-relaxed text-foreground">
            {renderCompact(snap)}
          </pre>
        )}
      </div>
    </div>
  );
}

/** Render only the meaningful fields of a read snapshot, omitting ok/error. */
function renderCompact(snap: RedisResponse): string {
  const { ok: _ok, ...rest } = snap as any;
  const trimmed: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(rest)) {
    if (v === null || v === undefined) continue;
    trimmed[k] = v;
  }
  if (Object.keys(trimmed).length === 0) return JSON.stringify(snap, null, 2);
  return JSON.stringify(trimmed, null, 2);
}

export interface LabShellProps {
  icon: LucideIcon;
  title: string;
  explanation: ReactNode;
  examples: { syntax: string; desc: string }[];
  children: ReactNode;
  command: string;
  onExecute: () => void;
  canExecute?: boolean;
  loading: boolean;
  result: RedisResponse | null;
  before: RedisResponse | null;
  after: RedisResponse | null;
  error: string | null;
  /** When set, before/after snapshot blocks are shown using this renderer. */
  showBeforeAfter?: boolean;
  demo?: {
    onCreate: () => void;
    onClean: () => void;
    seeding: string | null;
    canClean?: boolean;
  };
  demoHint?: string;
  resultTitle?: string;
}

/**
 * Shared frame for every interactive laboratory. Renders: explanation,
 * command examples with parameter highlighting, the editable parameter form,
 * the generated Redis command, the Execute button, before/after snapshots
 * (when provided), and the backend response. State is supplied per-lab so
 * sections stay independent.
 */
export function LabShell({
  icon: Icon,
  title,
  explanation,
  examples,
  children,
  command,
  onExecute,
  canExecute = true,
  loading,
  result,
  before,
  after,
  error,
  showBeforeAfter,
  demo,
  demoHint,
  resultTitle = "Backend response",
}: LabShellProps) {
  const ok = result?.ok !== false && !error;
  const pretty =
    result != null
      ? JSON.stringify(result, null, 2)
      : error
        ? JSON.stringify({ error }, null, 2)
        : "";

  return (
    <div className="flex h-full flex-col gap-4 xl:flex-row">
      {/* Left: explanation + examples + parameters + execute */}
      <div className="flex w-full min-w-0 flex-col xl:w-1/2">
        <div className="mb-3 flex items-start gap-3">
          <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Icon className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <h2 className="text-lg font-semibold leading-tight">{title}</h2>
            <div className="text-sm text-muted-foreground">{explanation}</div>
          </div>
        </div>

        {/* Examples */}
        <div className="mb-3 rounded-lg border border-border bg-card p-3">
          <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            <Terminal className="h-3.5 w-3.5" /> Command syntax
          </div>
          <ul className="space-y-1.5">
            {examples.map((ex, i) => (
              <li key={i} className="text-xs">
                <code className="block rounded bg-muted/50 px-2 py-1 font-mono text-foreground">
                  {ex.syntax}
                </code>
                <span className="text-muted-foreground">{ex.desc}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Parameters */}
        <div className="flex-1 overflow-auto rounded-lg border border-border bg-card p-4">
          <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Parameters
          </div>
          <div className="space-y-4">{children}</div>
        </div>

        {/* Generated command + Execute */}
        <div className="mt-3 space-y-2">
          <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Generated command
          </div>
          <CommandView command={command} />
          <div className="flex items-center justify-end gap-2">
            {demo && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={demo.onClean}
                  disabled={!!demo.seeding}
                  className="gap-1.5 text-destructive"
                >
                  {demo.seeding === "clean" ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Trash2 className="h-3.5 w-3.5" />
                  )}
                  Delete demo data
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={demo.onCreate}
                  disabled={!!demo.seeding}
                  className="gap-1.5"
                >
                  {demo.seeding ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Sparkles className="h-3.5 w-3.5" />
                  )}
                  Create example data
                </Button>
              </>
            )}
            <Button onClick={onExecute} disabled={!canExecute || loading} size="sm" className="gap-2">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
              Execute
            </Button>
          </div>
          {demoHint && (
            <p className="text-[11px] text-muted-foreground">{demoHint}</p>
          )}
        </div>
      </div>

      {/* Right: before/after + response */}
      <div className="flex min-h-[300px] w-full flex-col gap-3 xl:w-1/2">
        {showBeforeAfter && (
          <div className="grid grid-cols-2 gap-3">
            <StateSnap snap={before} label="Before" />
            <StateSnap snap={after} label="After" />
          </div>
        )}
        <div className="flex flex-1 flex-col overflow-hidden rounded-lg border border-border bg-card">
          <div className="flex items-center justify-between border-b border-border px-4 py-2.5">
            <div className="flex items-center gap-2">
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              ) : ok ? (
                <span className="h-2 w-2 rounded-full bg-emerald-500" />
              ) : (
                <span className="h-2 w-2 rounded-full bg-destructive" />
              )}
              <span className="text-sm font-medium">{resultTitle}</span>
            </div>
          </div>
          <div className="flex-1 overflow-auto">
            {loading ? (
              <div className="flex h-full items-center justify-center p-6 text-sm text-muted-foreground">
                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Running command…
              </div>
            ) : !result && !error ? (
              <div className="flex h-full items-center justify-center p-6 text-center text-sm text-muted-foreground">
                Execute a command to see the backend response.
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
      </div>
    </div>
  );
}

/** Labeled field wrapper mirroring SectionShell's Field. */
export function LabField({
  label,
  htmlFor,
  hint,
  children,
}: {
  label: string;
  htmlFor?: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={htmlFor} className="text-sm font-medium">
        {label}
      </label>
      {children}
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}