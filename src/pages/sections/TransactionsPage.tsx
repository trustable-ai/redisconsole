import { useState } from "react";
import { GitBranch } from "lucide-react";
import { SectionShell } from "@/components/SectionShell";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Plus, Trash2 } from "lucide-react";

interface CmdRow {
  cmd: string;
  args: string;
}

const EXAMPLE: CmdRow[] = [
  { cmd: "set", args: "counter, 1" },
  { cmd: "incr", args: "counter" },
  { cmd: "get", args: "counter" },
];

export default function TransactionsPage() {
  const [rows, setRows] = useState<CmdRow[]>(EXAMPLE);
  const [multi, setMulti] = useState(true);

  const update = (i: number, patch: Partial<CmdRow>) =>
    setRows((rs) => rs.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));
  const addRow = () => setRows((rs) => [...rs, { cmd: "get", args: "" }]);
  const removeRow = (i: number) => setRows((rs) => rs.filter((_, idx) => idx !== i));

  const build = () => ({
    cmd: "transactions",
    multi,
    commands: rows
      .filter((r) => r.cmd.trim())
      .map((r) => [
        r.cmd.trim().toLowerCase(),
        ...r.args.split(",").map((a) => a.trim()).filter((a) => a !== ""),
      ]),
  });

  return (
    <SectionShell
      icon={GitBranch}
      title="Transactions"
      description="Run a sequence of commands atomically via MULTI/EXEC."
      buildPayload={build}
      canRun={rows.some((r) => r.cmd.trim())}
      resultTitle="Transaction results"
    >
      <div className="space-y-3">
        {rows.map((row, i) => (
          <div key={i} className="flex items-start gap-2">
            <div className="grid flex-1 grid-cols-3 gap-2">
              <Input
                aria-label={`Command ${i + 1} name`}
                value={row.cmd}
                onChange={(e) => update(i, { cmd: e.target.value })}
                placeholder="set"
                className="font-mono"
              />
              <Input
                aria-label={`Command ${i + 1} args`}
                value={row.args}
                onChange={(e) => update(i, { args: e.target.value })}
                placeholder="key, value"
                className="col-span-2 font-mono"
              />
            </div>
            <Button variant="ghost" size="icon" onClick={() => removeRow(i)} aria-label="Remove row">
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        ))}
      </div>

      <Button variant="outline" size="sm" onClick={addRow} className="gap-2">
        <Plus className="h-4 w-4" /> Add command
      </Button>

      <div className="flex items-center gap-2 text-sm">
        <input
          id="tx-multi"
          type="checkbox"
          checked={multi}
          onChange={(e) => setMulti(e.target.checked)}
          className="h-4 w-4 rounded border-input"
        />
        <Label htmlFor="tx-multi">Use MULTI/EXEC (atomic). Uncheck for a non-transactional pipeline.</Label>
      </div>

      <p className="text-xs text-muted-foreground">
        Each row is <code className="text-xs">CMD key, args…</code>. The key
        argument is automatically prefixed with the app namespace.
      </p>
    </SectionShell>
  );
}