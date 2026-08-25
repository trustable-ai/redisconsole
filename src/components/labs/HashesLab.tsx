import { useState, useCallback } from "react";
import { Hash } from "lucide-react";
import { LabShell, LabField } from "@/components/labs/LabShell";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { useLabExecution, useDemoData } from "@/hooks/use-lab-execution";
import { formatCommand, demoKey } from "@/lib/labs";

const OPS = [
  { value: "hset", label: "HSET — set a field" },
  { value: "hget", label: "HGET — read a field" },
  { value: "hgetall", label: "HGETALL — read all fields" },
  { value: "hdel", label: "HDEL — delete a field" },
];

const EXAMPLES = [
  { syntax: "HSET key field value", desc: "Set a single field/value on the hash at key." },
  { syntax: "HGET key field", desc: "Return the value of one field." },
  { syntax: "HGETALL key", desc: "Return every field/value pair in the hash." },
  { syntax: "HDEL key field [field ...]", desc: "Delete one or more fields from the hash." },
];

const DEMO_KIND = "hashes";

export default function HashesLab() {
  const [op, setOp] = useState("hset");
  const [key, setKey] = useState(demoKey("hashes:user:1"));
  const [field, setField] = useState("name");
  const [value, setValue] = useState("Ada");
  const [fields, setFields] = useState("name");

  const lab = useLabExecution();
  const refreshState = useCallback(async () => {
    if (!key) return;
    await lab.run({ cmd: "hashes", op: "hgetall", key }, {});
  }, [key, lab]);
  const demo = useDemoData(refreshState);

  const mutating = ["hset", "hdel"].includes(op);
  const readPayload = key ? { cmd: "hashes", op: "hgetall", key } : null;

  const buildPayload = (): Record<string, unknown> => {
    const p: Record<string, unknown> = { cmd: "hashes", op, key };
    if (["hset", "hget", "hdel"].includes(op)) p.field = field;
    if (op === "hset") p.value = value;
    if (op === "hdel") p.fields = fields.split(",").map((s) => s.trim()).filter(Boolean);
    return p;
  };

  const buildCommand = (): string => {
    if (op === "hset") return formatCommand(["HSET", key, field, value]);
    if (op === "hget") return formatCommand(["HGET", key, field]);
    if (op === "hdel") return formatCommand(["HDEL", key, ...fields.split(",").map((s) => s.trim()).filter(Boolean)]);
    return formatCommand(["HGETALL", key]);
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
      icon={Hash}
      title="Hashes Laboratory"
      explanation={
        <p>
          A Redis hash maps field names to values — think of it as a record or
          object stored at one key. <code>HSET</code> writes a field,
          <code>HGET</code> reads one, <code>HGETALL</code> reads the whole record,
          and <code>HDEL</code> removes fields.
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
      demoHint="Demo key: redis-console:demo:hashes:user:1 (name/role/active)."
      resultTitle="Hashes response"
    >
      <LabField label="Operation" htmlFor="hlab-op">
        <Select id="hlab-op" value={op} onChange={(e) => setOp(e.target.value)} options={OPS} />
      </LabField>
      <LabField label="Key" htmlFor="hlab-key">
        <Input id="hlab-key" value={key} onChange={(e) => setKey(e.target.value)} placeholder={demoKey("hashes:user:1")} />
      </LabField>
      {op !== "hgetall" && (
        <LabField label={op === "hdel" ? "Fields to delete (comma-separated)" : "Field"} htmlFor="hlab-field">
          <Input
            id="hlab-field"
            value={op === "hdel" ? fields : field}
            onChange={(e) => (op === "hdel" ? setFields(e.target.value) : setField(e.target.value))}
            placeholder="name"
          />
        </LabField>
      )}
      {op === "hset" && (
        <LabField label="Value" htmlFor="hlab-val">
          <Input id="hlab-val" value={value} onChange={(e) => setValue(e.target.value)} placeholder="Ada" />
        </LabField>
      )}
    </LabShell>
  );
}