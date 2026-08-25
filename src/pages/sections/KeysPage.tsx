import { useState } from "react";
import { Key } from "lucide-react";
import { SectionShell, Field } from "@/components/SectionShell";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";

const OPS = [
  { value: "scan", label: "SCAN — list keys matching a pattern" },
  { value: "type", label: "TYPE — type of value at key" },
  { value: "del", label: "DEL — delete a key" },
  { value: "exists", label: "EXISTS — check a key exists" },
  { value: "rename", label: "RENAME — rename a key" },
];

export default function KeysPage() {
  const [op, setOp] = useState("scan");
  const [key, setKey] = useState("");
  const [pattern, setPattern] = useState("*");
  const [count, setCount] = useState("200");
  const [newkey, setNewkey] = useState("");

  const build = () => {
    const payload: Record<string, unknown> = { cmd: "keys", op };
    if (op === "scan") {
      payload.pattern = pattern || "*";
      payload.count = Number(count) || 200;
    } else {
      payload.key = key;
      if (op === "rename") payload.newkey = newkey;
    }
    return payload;
  };

  return (
    <SectionShell
      icon={Key}
      title="Keys"
      description="Scan, inspect, rename, and delete keys across the database."
      buildPayload={build}
      resultTitle="Keys result"
    >
      <Field label="Operation" htmlFor="keys-op">
        <Select id="keys-op" value={op} onChange={(e) => setOp(e.target.value)} options={OPS} />
      </Field>

      {op === "scan" ? (
        <>
          <Field label="Pattern" htmlFor="keys-pattern" hint="Glob pattern, e.g. user:* or *">
            <Input id="keys-pattern" value={pattern} onChange={(e) => setPattern(e.target.value)} placeholder="*" />
          </Field>
          <Field label="Count hint" htmlFor="keys-count">
            <Input id="keys-count" type="number" value={count} onChange={(e) => setCount(e.target.value)} />
          </Field>
        </>
      ) : (
        <>
          <Field label="Key" htmlFor="keys-key">
            <Input id="keys-key" value={key} onChange={(e) => setKey(e.target.value)} placeholder="mykey" />
          </Field>
          {op === "rename" && (
            <Field label="New key" htmlFor="keys-newkey">
              <Input id="keys-newkey" value={newkey} onChange={(e) => setNewkey(e.target.value)} placeholder="newname" />
            </Field>
          )}
        </>
      )}

      <p className="text-xs text-muted-foreground">
        SCAN is non-blocking and cursor-based; the prefix is applied automatically.
      </p>
    </SectionShell>
  );
}