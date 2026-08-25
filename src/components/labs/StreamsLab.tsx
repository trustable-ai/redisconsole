import { useState, useCallback } from "react";
import { Waves } from "lucide-react";
import { LabShell, LabField } from "@/components/labs/LabShell";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { useLabExecution, useDemoData } from "@/hooks/use-lab-execution";
import { formatCommand, demoKey } from "@/lib/labs";

const OPS = [
  { value: "xadd", label: "XADD — append an entry" },
  { value: "xrange", label: "XRANGE — read entries (oldest first)" },
  { value: "xrevrange", label: "XREVRANGE — read entries (newest first)" },
  { value: "xlen", label: "XLEN — stream length" },
];

const EXAMPLES = [
  { syntax: "XADD key ID field value [field value ...]", desc: "Append an entry; use * for an auto-generated ID." },
  { syntax: "XRANGE key min max [COUNT n]", desc: "Read entries from oldest to newest (- to +)." },
  { syntax: "XREVRANGE key max min [COUNT n]", desc: "Read entries from newest to oldest (+ to -)." },
  { syntax: "XLEN key", desc: "Return the number of entries in the stream." },
];

const DEMO_KIND = "streams";

export default function StreamsLab() {
  const [op, setOp] = useState("xadd");
  const [key, setKey] = useState(demoKey("streams:events"));
  const [id, setId] = useState("*");
  const [fields, setFields] = useState('{"event":"login","user":"ada"}');
  const [min, setMin] = useState("-");
  const [max, setMax] = useState("+");

  const lab = useLabExecution();
  const refreshState = useCallback(async () => {
    if (!key) return;
    await lab.run({ cmd: "streams", op: "xrange", key, min: "-", max: "+" }, {});
  }, [key, lab]);
  const demo = useDemoData(refreshState);

  const mutating = op === "xadd";
  const readPayload = key ? { cmd: "streams", op: "xrange", key, min: "-", max: "+" } : null;

  const buildPayload = (): Record<string, unknown> => {
    const p: Record<string, unknown> = { cmd: "streams", op, key };
    if (op === "xadd") {
      p.id = id || "*";
      try { p.fields = JSON.parse(fields); } catch { p.fields = {}; }
    }
    if (["xrange", "xrevrange"].includes(op)) { p.min = min; p.max = max; }
    return p;
  };

  const buildCommand = (): string => {
    if (op === "xadd") {
      let pairs: string[] = [];
      try {
        const obj = JSON.parse(fields) as Record<string, string>;
        pairs = Object.entries(obj).flat();
      } catch {
        pairs = [];
      }
      return formatCommand(["XADD", key, id || "*", ...pairs]);
    }
    if (op === "xrange") return formatCommand(["XRANGE", key, min, max]);
    if (op === "xrevrange") return formatCommand(["XREVRANGE", key, max, min]);
    return formatCommand(["XLEN", key]);
  };

  const onExecute = () => {
    if (!key) return;
    lab.run(buildPayload(), {
      before: mutating ? readPayload : undefined,
      after: mutating ? readPayload : undefined,
    });
  };

  return (
    <LabShell
      icon={Waves}
      title="Streams Laboratory"
      explanation={
        <p>
          Redis streams are append-only logs of entries, each with an auto-generated
          ID and field/value pairs. They power event logs and consumer groups.
          <code>XADD</code> appends, <code>XRANGE</code>/<code>XREVRANGE</code> read,
          and <code>XLEN</code> counts entries.
        </p>
      }
      examples={EXAMPLES}
      command={buildCommand()}
      onExecute={onExecute}
      canExecute={!!key}
      loading={lab.loading}
      result={lab.result}
      before={lab.before}
      after={lab.after}
      error={lab.error}
      showBeforeAfter={mutating}
      demo={{ onCreate: () => demo.seed(DEMO_KIND), onClean: () => demo.clean(), seeding: demo.seeding }}
      demoHint="Demo key: redis-console:demo:streams:events (3 seed entries)."
      resultTitle="Streams response"
    >
      <LabField label="Operation" htmlFor="xlab-op">
        <Select id="xlab-op" value={op} onChange={(e) => setOp(e.target.value)} options={OPS} />
      </LabField>
      <LabField label="Key" htmlFor="xlab-key">
        <Input id="xlab-key" value={key} onChange={(e) => setKey(e.target.value)} placeholder={demoKey("streams:events")} />
      </LabField>
      {op === "xadd" && (
        <>
          <LabField label="Entry ID (* = auto)" htmlFor="xlab-id">
            <Input id="xlab-id" value={id} onChange={(e) => setId(e.target.value)} placeholder="*" />
          </LabField>
          <LabField label="Fields (JSON object)" htmlFor="xlab-fields" hint='e.g. {"event":"login","user":"ada"}'>
            <Input id="xlab-fields" value={fields} onChange={(e) => setFields(e.target.value)} />
          </LabField>
        </>
      )}
      {["xrange", "xrevrange"].includes(op) && (
        <div className="grid grid-cols-2 gap-3">
          <LabField label="Min" htmlFor="xlab-min">
            <Input id="xlab-min" value={min} onChange={(e) => setMin(e.target.value)} placeholder="-" />
          </LabField>
          <LabField label="Max" htmlFor="xlab-max">
            <Input id="xlab-max" value={max} onChange={(e) => setMax(e.target.value)} placeholder="+" />
          </LabField>
        </div>
      )}
    </LabShell>
  );
}