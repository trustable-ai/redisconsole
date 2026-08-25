import { useState } from "react";
import { GitBranch, Info, ShieldAlert, Trash2, Plus } from "lucide-react";
import { SectionShell } from "@/components/SectionShell";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { cn } from "@/lib/utils";

interface CmdRow {
  cmd: string;
  args: string;
}

/**
 * Transactions — educational demonstration of MULTI/EXEC, DISCARD, and WATCH.
 *
 * OpenServerless requests may use separate Redis connections, so the whole
 * transaction is sent to one backend action (`cmd: "transactions"`) which runs
 * MULTI/EXEC, MULTI/DISCARD, or WATCH+MULTI+EXEC on a single redis-py
 * pipeline / connection. That keeps the optimistic lock held by the same
 * client that issues EXEC.
 */

type TxMode = "multi" | "discard" | "watch";

const MODES = [
  { value: "multi", label: "MULTI / EXEC — queue commands atomically, then run" },
  { value: "discard", label: "MULTI / DISCARD — queue commands, then abort the transaction" },
  { value: "watch", label: "WATCH / MULTI / EXEC — optimistic lock, abort if a key changes" },
];

const MULTI_EXAMPLE: CmdRow[] = [
  { cmd: "set", args: "tx:counter, 1" },
  { cmd: "incr", args: "tx:counter" },
  { cmd: "get", args: "tx:counter" },
];

const DISCARD_EXAMPLE: CmdRow[] = [
  { cmd: "set", args: "tx:temp, should-not-persist" },
  { cmd: "incr", args: "tx:temp" },
];

const WATCH_EXAMPLE: CmdRow[] = [
  { cmd: "incr", args: "tx:balance" },
  { cmd: "get", args: "tx:balance" },
];

export default function TransactionsPage() {
  const [mode, setMode] = useState<TxMode>("multi");
  const [rows, setRows] = useState<CmdRow[]>(MULTI_EXAMPLE);
  const [watchKeys, setWatchKeys] = useState("tx:balance");
  const [interfere, setInterfere] = useState(true);

  const exampleFor = (m: TxMode): CmdRow[] =>
    m === "discard" ? DISCARD_EXAMPLE : m === "watch" ? WATCH_EXAMPLE : MULTI_EXAMPLE;

  const changeMode = (m: TxMode) => {
    setMode(m);
    setRows(exampleFor(m));
  };

  const update = (i: number, patch: Partial<CmdRow>) =>
    setRows((rs) => rs.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));
  const addRow = () => setRows((rs) => [...rs, { cmd: "get", args: "" }]);
  const removeRow = (i: number) => setRows((rs) => rs.filter((_, idx) => idx !== i));

  const build = () => {
    const commands = rows
      .filter((r) => r.cmd.trim())
      .map((r) => [
        r.cmd.trim().toLowerCase(),
        ...r.args
          .split(",")
          .map((a) => a.trim())
          .filter((a) => a !== ""),
      ]);
    const p: Record<string, unknown> = { cmd: "transactions", mode, commands };
    if (mode === "watch") {
      p.watch = watchKeys
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
      // Demonstrate a watched-key modification between WATCH and EXEC on the
      // SAME connection so the optimistic lock deterministically aborts.
      if (interfere) {
        const firstWatch = watchKeys.split(",")[0]?.trim();
        if (firstWatch) {
          p.interfere_key = firstWatch;
          p.interfere_value = "interfered";
        }
      }
    }
    return p;
  };

  return (
    <SectionShell
      icon={GitBranch}
      title="Transactions"
      description="Run MULTI/EXEC, DISCARD, and WATCH on a single backend Redis connection."
      buildPayload={build}
      canRun={rows.some((r) => r.cmd.trim()) && (mode !== "watch" || !!watchKeys.trim())}
      resultTitle="Transaction result"
    >
      <Field label="Transaction mode" htmlFor="tx-mode">
        <Select id="tx-mode" value={mode} onChange={(e) => changeMode(e.target.value as TxMode)} options={MODES} />
      </Field>

      {/* Mode explainer */}
      <div className="rounded-md border border-sky-500/30 bg-sky-500/10 p-3 text-xs text-sky-800 dark:text-sky-200">
        <div className="flex items-start gap-2">
          <Info className="mt-0.5 h-4 w-4 shrink-0" />
          <p>
            {mode === "multi" && (
              <>
                <code className="font-mono">MULTI</code> opens a transaction;
                every command is queued and <code className="font-mono">EXEC</code>{" "}
                runs them atomically in order, returning an array of results.
              </>
            )}
            {mode === "discard" && (
              <>
                <code className="font-mono">DISCARD</code> aborts a transaction:
                queued commands are thrown away and the connection leaves the
                MULTI state. No queued command is executed.
              </>
            )}
            {mode === "watch" && (
              <>
                <code className="font-mono">WATCH</code> optimistically locks the
                listed keys. <code className="font-mono">EXEC</code> runs only if
                none of them changed since WATCH; otherwise the transaction is
                aborted and <code className="font-mono">EXEC</code> returns nil.
              </>
            )}
          </p>
        </div>
      </div>

      {mode === "watch" && (
        <div className="space-y-2 rounded-md border border-border bg-muted/30 p-3">
          <Field label="WATCH keys (comma-separated)" htmlFor="tx-watch" hint="The keys the transaction will optimistically lock.">
            <Input id="tx-watch" value={watchKeys} onChange={(e) => setWatchKeys(e.target.value)} placeholder="tx:balance" className="font-mono" />
          </Field>
          <label htmlFor="tx-interfere" className="flex items-center gap-2 text-sm">
            <input
              id="tx-interfere"
              type="checkbox"
              checked={interfere}
              onChange={(e) => setInterfere(e.target.checked)}
              className="h-4 w-4 rounded border-input"
            />
            <span>
              Mutate the first watched key between <code className="font-mono">WATCH</code> and{" "}
              <code className="font-mono">EXEC</code> (demonstrates an aborted transaction)
            </span>
          </label>
          {interfere && watchKeys.trim() && (
            <div className="flex items-start gap-2 rounded-md border border-amber-500/30 bg-amber-500/10 p-2 text-xs text-amber-700 dark:text-amber-300">
              <ShieldAlert className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              <p>
                The backend will run <code className="font-mono">SET &lt;first-watch-key&gt; "interfered"</code>{" "}
                after WATCH and before EXEC, on the same connection, so EXEC
                observes the modification and aborts. This is the classic
                optimistic-locking abort path.
              </p>
            </div>
          )}
        </div>
      )}

      <div className="space-y-2">
        <div className="text-sm font-medium">
          Queued commands ({mode === "discard" ? "will be discarded" : "will run atomically"})
        </div>
        {rows.map((row, i) => (
          <div key={i} className="flex items-start gap-2">
            <div className="grid flex-1 grid-cols-3 gap-2">
              <Input
                id={`tx-cmd-${i}`}
                name={`tx-cmd-${i}`}
                aria-label={`Command ${i + 1} name`}
                value={row.cmd}
                onChange={(e) => update(i, { cmd: e.target.value })}
                placeholder="set"
                className="font-mono"
              />
              <Input
                id={`tx-args-${i}`}
                name={`tx-args-${i}`}
                aria-label={`Command ${i + 1} args`}
                value={row.args}
                onChange={(e) => update(i, { args: e.target.value })}
                placeholder="key, value"
                className="col-span-2 font-mono"
              />
            </div>
            <Button variant="ghost" size="icon" onClick={() => removeRow(i)} aria-label="Remove row">
              <Trash2 className={cn("h-4 w-4 text-destructive")} />
            </Button>
          </div>
        ))}
      </div>

      <Button variant="outline" size="sm" onClick={addRow} className="gap-2">
        <Plus className="h-4 w-4" /> Add command
      </Button>

      <p className="text-xs text-muted-foreground">
        Each row is <code className="font-mono">CMD key, args…</code>. The first
        key argument is automatically prefixed with the app namespace, and the
        whole sequence executes on a single Redis connection inside one
        OpenServerless action.
      </p>
    </SectionShell>
  );
}

function Field({
  label,
  htmlFor,
  hint,
  children,
}: {
  label: string;
  htmlFor?: string;
  hint?: string;
  children: React.ReactNode;
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