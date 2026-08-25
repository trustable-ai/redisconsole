import { useState, useCallback } from "react";
import { List } from "lucide-react";
import { LabShell, LabField } from "@/components/labs/LabShell";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { useLabExecution, useDemoData } from "@/hooks/use-lab-execution";
import { formatCommand, demoKey } from "@/lib/labs";

const OPS = [
  { value: "lpush", label: "LPUSH — push to head (left)" },
  { value: "rpush", label: "RPUSH — push to tail (right)" },
  { value: "lpop", label: "LPOP — pop from head (left)" },
  { value: "rpop", label: "RPOP — pop from tail (right)" },
  { value: "lrange", label: "LRANGE — read a range" },
];

const EXAMPLES = [
  { syntax: "LPUSH key value [value ...]", desc: "Insert one or more values at the head of the list." },
  { syntax: "RPUSH key value [value ...]", desc: "Insert one or more values at the tail of the list." },
  { syntax: "LPOP key [count]", desc: "Remove and return elements from the head." },
  { syntax: "RPOP key [count]", desc: "Remove and return elements from the tail." },
  { syntax: "LRANGE key start stop", desc: "Return elements from start to stop (0 -1 = all)." },
];

const DEMO_KIND = "lists";

export default function ListsLab() {
  const [op, setOp] = useState("rpush");
  const [key, setKey] = useState(demoKey("lists:queue"));
  const [values, setValues] = useState("a, b, c");
  const [start, setStart] = useState("0");
  const [stop, setStop] = useState("-1");

  const lab = useLabExecution();
  const refreshState = useCallback(async () => {
    if (!key) return;
    await lab.run({ cmd: "lists", op: "lrange", key, start: 0, stop: -1 }, {});
  }, [key, lab]);
  const demo = useDemoData(refreshState);

  const mutating = ["lpush", "rpush", "lpop", "rpop"].includes(op);
  const readPayload = key ? { cmd: "lists", op: "lrange", key, start: 0, stop: -1 } : null;

  const valueList = () => values.split(",").map((s) => s.trim()).filter(Boolean);

  const buildPayload = (): Record<string, unknown> => {
    const p: Record<string, unknown> = { cmd: "lists", op, key };
    if (["lpush", "rpush"].includes(op)) p.values = valueList();
    if (["lpop", "rpop"].includes(op)) p.count = 1;
    if (op === "lrange") { p.start = Number(start) || 0; p.stop = Number(stop) || -1; }
    return p;
  };

  const buildCommand = (): string => {
    if (["lpush", "rpush"].includes(op))
      return formatCommand([op === "lpush" ? "LPUSH" : "RPUSH", key, ...valueList()]);
    if (["lpop", "rpop"].includes(op))
      return formatCommand([op === "lpop" ? "LPOP" : "RPOP", key]);
    return formatCommand(["LRANGE", key, start, stop]);
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
      icon={List}
      title="Lists Laboratory"
      explanation={
        <p>
          Redis lists are linked lists of strings. <code>LPUSH</code>/<code>RPUSH</code>
          add to the head/tail; <code>LPOP</code>/<code>RPOP</code> remove from the
          head/tail; <code>LRANGE</code> reads a slice. They back queues and stacks.
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
      demoHint="Demo key: redis-console:demo:lists:queue (first, second, third)."
      resultTitle="Lists response"
    >
      <LabField label="Operation" htmlFor="llab-op">
        <Select id="llab-op" value={op} onChange={(e) => setOp(e.target.value)} options={OPS} />
      </LabField>
      <LabField label="Key" htmlFor="llab-key">
        <Input id="llab-key" value={key} onChange={(e) => setKey(e.target.value)} placeholder={demoKey("lists:queue")} />
      </LabField>
      {["lpush", "rpush"].includes(op) && (
        <LabField label="Values (comma-separated)" htmlFor="llab-vals">
          <Input id="llab-vals" value={values} onChange={(e) => setValues(e.target.value)} placeholder="a, b, c" />
        </LabField>
      )}
      {op === "lrange" && (
        <div className="grid grid-cols-2 gap-3">
          <LabField label="Start" htmlFor="llab-start">
            <Input id="llab-start" value={start} onChange={(e) => setStart(e.target.value)} placeholder="0" />
          </LabField>
          <LabField label="Stop" htmlFor="llab-stop">
            <Input id="llab-stop" value={stop} onChange={(e) => setStop(e.target.value)} placeholder="-1" />
          </LabField>
        </div>
      )}
    </LabShell>
  );
}