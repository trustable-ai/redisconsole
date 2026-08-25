/**
 * Reference — educational Redis command reference.
 *
 * Purely static, frontend-only data (see src/lib/redis-commands.ts). Users
 * filter by category and search by command/description/syntax, then expand an
 * entry to see the syntax, argument explanations, and a worked example.
 * No Redis calls are made from this page.
 */
import { useMemo, useState } from "react";
import { BookOpen, ChevronDown, Search } from "lucide-react";
import { CATEGORIES, COMMANDS, type RedisCategory, type CommandDoc } from "@/lib/redis-commands";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Copy } from "lucide-react";
import { toast } from "sonner";

/** Token-level Redis command highlighter, shared with CommandHint. */
const OPTION_TOKENS = new Set([
  "EX", "PX", "EXAT", "PXAT", "NX", "XX", "GET", "KEEPTTL", "IFGT", "IFLT",
  "WITHSCORES", "BYSCORE", "BYRANK", "LIMIT", "MATCH", "COUNT", "TYPE",
  "ASC", "DESC", "REV", "STORE", "BY", "FROM", "TO", "NOMKSTREAM",
]);

function HighlightedCommand({ command }: { command: string }) {
  const tokens = command.trim().split(/\s+/);
  return (
    <code className="break-all">
      {tokens.map((t, i) => {
        let cls = "text-cyan-600 dark:text-cyan-400";
        if (i === 0) cls = "font-semibold text-primary";
        else if (OPTION_TOKENS.has(t.toUpperCase())) cls = "text-amber-600 dark:text-amber-400";
        else if (t.startsWith('"') && t.endsWith('"')) cls = "text-emerald-600 dark:text-emerald-400";
        else if (/^-?\d+(\.\d+)?$/.test(t)) cls = "text-rose-500";
        return (
          <span key={i} className={cls}>
            {i > 0 ? " " : ""}
            {t}
          </span>
        );
      })}
    </code>
  );
}

function CopyChip({ text, label }: { text: string; label: string }) {
  return (
    <button
      type="button"
      onClick={() => {
        navigator.clipboard?.writeText(text);
        toast.success(`${label} copied`);
      }}
      className="inline-flex items-center gap-1 rounded border border-border bg-background px-1.5 py-0.5 text-[11px] text-muted-foreground transition-colors hover:text-foreground"
      aria-label={`Copy ${label}`}
    >
      <Copy className="h-3 w-3" /> {label}
    </button>
  );
}

function CommandCard({ doc }: { doc: CommandDoc }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="overflow-hidden rounded-lg border border-border bg-card">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="flex w-full items-center gap-3 px-3 py-2.5 text-left transition-colors hover:bg-accent/40"
      >
        <ChevronDown
          className={cn(
            "h-4 w-4 shrink-0 text-muted-foreground transition-transform",
            open && "rotate-180",
          )}
        />
        <code className="shrink-0 font-mono text-sm font-semibold text-primary">
          {doc.command}
        </code>
        <span className="min-w-0 truncate text-xs text-muted-foreground">
          {doc.description}
        </span>
      </button>

      {open && (
        <div className="space-y-3 border-t border-border px-3 py-3">
          <div>
            <div className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Syntax
            </div>
            <div className="flex items-start gap-2 rounded-md border border-border bg-muted/40 px-3 py-2 font-mono text-xs">
              <HighlightedCommand command={doc.syntax} />
              <span className="ml-auto">
                <CopyChip text={doc.syntax} label="syntax" />
              </span>
            </div>
          </div>

          {doc.args.length > 0 && (
            <div>
              <div className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                Arguments
              </div>
              <dl className="space-y-1">
                {doc.args.map((a) => (
                  <div key={a.token} className="grid grid-cols-1 gap-0.5 text-xs sm:grid-cols-[minmax(0,40%)_1fr]">
                    <dt className="font-mono text-foreground">
                      {a.optional ? (
                        <span className="text-muted-foreground">[</span>
                      ) : null}
                      {a.token}
                      {a.optional ? (
                        <span className="text-muted-foreground">]</span>
                      ) : null}
                    </dt>
                    <dd className="text-muted-foreground">{a.desc}</dd>
                  </div>
                ))}
              </dl>
            </div>
          )}

          <div>
            <div className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Example
            </div>
            <div className="space-y-1.5 rounded-md border border-border bg-muted/40 px-3 py-2">
              <div className="flex items-start gap-2 font-mono text-xs">
                <span className="shrink-0 text-muted-foreground">redis&gt;</span>
                <HighlightedCommand command={doc.example} />
                <span className="ml-auto shrink-0">
                  <CopyChip text={doc.example} label="example" />
                </span>
              </div>
              {doc.exampleOutput && (
                <pre className="whitespace-pre-wrap break-words border-t border-border pt-1.5 font-mono text-[11px] text-muted-foreground">
                  {doc.exampleOutput}
                </pre>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function ReferencePage() {
  const [category, setCategory] = useState<RedisCategory | "All">("All");
  const [query, setQuery] = useState("");

  const counts = useMemo(() => {
    const map = new Map<RedisCategory, number>();
    for (const c of COMMANDS) map.set(c.category, (map.get(c.category) ?? 0) + 1);
    return map;
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return COMMANDS.filter((c) => {
      if (category !== "All" && c.category !== category) return false;
      if (!q) return true;
      return (
        c.command.toLowerCase().includes(q) ||
        c.description.toLowerCase().includes(q) ||
        c.syntax.toLowerCase().includes(q)
      );
    });
  }, [category, query]);

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="mb-4 flex items-start gap-3">
        <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <BookOpen className="h-5 w-5" />
        </div>
        <div>
          <h2 className="text-lg font-semibold leading-tight">Command Reference</h2>
          <p className="text-sm text-muted-foreground">
            A curated, educational reference for common Redis commands. Filter
            by category, search, and expand any entry for its syntax,
            arguments, and a worked example.
          </p>
        </div>
      </div>

      {/* Controls */}
      <div className="mb-3 space-y-3 rounded-lg border border-border bg-card p-3">
        <div className="space-y-1.5">
          <label htmlFor="ref-search" className="text-sm font-medium">
            Search commands
          </label>
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="ref-search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="e.g. sorted set, ZADD, expire…"
              className="pl-9"
            />
          </div>
        </div>

        {/* Category chips */}
        <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label="Category filter">
          <button
            type="button"
            onClick={() => setCategory("All")}
            className={cn(
              "rounded-md border px-2.5 py-1 text-xs font-medium transition-colors",
              category === "All"
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-background hover:bg-accent",
            )}
          >
            All
          </button>
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setCategory(cat)}
              className={cn(
                "rounded-md border px-2.5 py-1 text-xs font-medium transition-colors",
                category === cat
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-background hover:bg-accent",
              )}
            >
              {cat}
              <span className="ml-1 text-muted-foreground">{counts.get(cat) ?? 0}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Results */}
      <div className="flex-1 overflow-auto">
        <div className="mb-2 text-xs text-muted-foreground">
          {filtered.length} command{filtered.length === 1 ? "" : "s"}
        </div>
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border bg-card p-8 text-center">
            <Search className="mb-2 h-8 w-8 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              No commands match <span className="font-mono">{query || category}</span>.
            </p>
            <Button
              variant="outline"
              size="sm"
              className="mt-3"
              onClick={() => {
                setQuery("");
                setCategory("All");
              }}
            >
              Clear filters
            </Button>
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map((doc) => (
              <CommandCard key={`${doc.category}-${doc.command}`} doc={doc} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}