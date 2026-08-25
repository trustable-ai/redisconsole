import { useState, useCallback } from "react";
import { Type } from "lucide-react";
import { LabShell, LabField } from "@/components/labs/LabShell";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { useLabExecution, useDemoData } from "@/hooks/use-lab-execution";
import { formatCommand, demoKey } from "@/lib/labs";

const OPS = [
  { value: "set", label: "SET — set a string value" },
  { value: "setex", label: "SET … EX — set with expiration (seconds)" },
  { value: "get", label: "GET — read a string value" },
  { value: "append", label: "APPEND — append to value" },
  { value: "incr", label: "INCR — increment by amount" },
  { value: "decr", label: "DECR — decrement by amount" },
];

const EXAMPLES = [
  { syntax: "SET key value [EX seconds]", desc: "Store a string at key, optionally with a TTL." },
  { syntax: "GET key", desc: "Return the string stored at key, or nil." },
  { syntax: "APPEND key value", desc: "Append value to the existing string; return the new length." },
  { syntax: "INCR key  /  DECR key", desc: "Atomic integer increment / decrement by 1 (or an amount)." },
];

const DEMO_KIND = "strings";

export default function StringsLab() {
  const [op, setOp] = useState("set");
  const [key, setKey] = useState(demoKey("strings:counter"));
  const [value, setValue] = useState("Hello");
  const [amount, setAmount] = useState("1");
  const [ex, setEx] = useState("60");

  const lab = useLabExecution();

  const refreshState = useCallback(async () => {
    if (!key) return;
    await lab.run({ cmd: "strings", op: "get", key }, {});
  }, [key, lab]);

  const demo = useDemoData(refreshState);

  const mutating = ["set", "setex", "append", "incr", "decr"].includes(op);
  const readPayload = key ? { cmd: "strings", op: "get", key } : null;

  const buildPayload = (): Record<string, unknown> => {
    const p: Record<string, unknown> = { cmd: "strings", op: op === "setex" ? "set" : op, key };
    if (["set", "setex", "append"].includes(op)) p.value = value;
    if (["incr", "decr"].includes(op)) p.amount = Number(amount) || 1;
    if (op === "setex") p.ex = Number(ex) || 0;
    return p;
  };

  const buildCommand = (): string => {
    if (op === "get") return formatCommand(["GET", key]);
    if (op === "append") return formatCommand(["APPEND", key, value]);
    if (op === "incr") return formatCommand(["INCR", key, "BY", amount]);
    if (op === "decr") return formatCommand(["DECR", key, "BY", amount]);
    if (op === "setex") return formatCommand(["SET", key, value, "EX", ex]);
    return formatCommand(["SET", key, value]);
  };

  const onExecute = () => {
    if (!key) return;
    lab.run(buildPayload(), {
      before: mutating ? readPayload : undefined,
      after: mutating ? readPayload : undefined,
    });
  };

  const onCreate = () => demo.seed(DEMO_KIND);
  const onClean = () => demo.clean();

  return (
    <LabShell
      icon={Type}
      title="Strings Laboratory"
      explanation={
        <p>
          Redis strings are the simplest value type: a single bytes value at a key.
          They back counters (via atomic <code>INCR</code>/<code>DECR</code>), caches,
          and short-lived keys with TTL. Try mutating a key and watch the
          before/after snapshot update.
        </p>
      }
      examples={EXAMPLES}
      command={buildCommand()}
      onExecute={onExecute}
      canExecute={!!key && (op !== "get" || true)}
      loading={lab.loading}
      result={lab.result}
      before={lab.before}
      after={lab.after}
      error={lab.error}
      showBeforeAfter={mutating}
      demo={{ onCreate, onClean, seeding: demo.seeding }}
      demoHint="Demo keys live under redis-console:demo:strings:* and only those are deleted."
      resultTitle="Strings response"
    >
      <LabField label="Operation" htmlFor="strlab-op">
        <Select id="strlab-op" value={op} onChange={(e) => setOp(e.target.value)} options={OPS} />
      </LabField>
      <LabField label="Key" htmlFor="strlab-key" hint="Defaults to a demo key so you can experiment safely.">
        <Input id="strlab-key" value={key} onChange={(e) => setKey(e.target.value)} placeholder={demoKey("strings:counter")} />
      </LabField>
      {["set", "setex", "append"].includes(op) && (
        <LabField label="Value" htmlFor="strlab-val">
          <Input id="strlab-val" value={value} onChange={(e) => setValue(e.target.value)} placeholder="hello" />
        </LabField>
      )}
      {["incr", "decr"].includes(op) && (
        <LabField label="Amount" htmlFor="strlab-amt">
          <Input id="strlab-amt" type="number" value={amount} onChange={(e) => setAmount(e.target.value)} />
        </LabField>
      )}
      {op === "setex" && (
        <LabField label="Expire (seconds)" htmlFor="strlab-ex">
          <Input id="strlab-ex" type="number" value={ex} onChange={(e) => setEx(e.target.value)} placeholder="60" />
        </LabField>
      )}
    </LabShell>
  );
}