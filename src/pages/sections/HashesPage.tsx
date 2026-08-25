import { useState } from "react";
import { Hash } from "lucide-react";
import { SectionShell, Field } from "@/components/SectionShell";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";

const OPS = [
  { value: "hset", label: "HSET — set a field" },
  { value: "hmset", label: "HMSET — set multiple fields" },
  { value: "hget", label: "HGET — read a field" },
  { value: "hgetall", label: "HGETALL — read all fields" },
  { value: "hkeys", label: "HKEYS — list fields" },
  { value: "hvals", label: "HVALS — list values" },
  { value: "hlen", label: "HLEN — number of fields" },
  { value: "hdel", label: "HDEL — delete field(s)" },
  { value: "hexists", label: "HEXISTS — check a field" },
];

export default function HashesPage() {
  const [op, setOp] = useState("hset");
  const [key, setKey] = useState("");
  const [field, setField] = useState("");
  const [value, setValue] = useState("");
  const [fields, setFields] = useState("f1, f2");
  const [mapping, setMapping] = useState('{"f1":"v1","f2":"v2"}');

  const build = () => {
    const p: Record<string, unknown> = { cmd: "hashes", op, key };
    if (["hset", "hget", "hexists"].includes(op)) p.field = field;
    if (["hset"].includes(op)) p.value = value;
    if (op === "hdel") p.fields = fields.split(",").map((s) => s.trim()).filter(Boolean);
    if (op === "hmset") {
      try { p.mapping = JSON.parse(mapping); } catch { /* invalid */ }
    }
    return p;
  };

  return (
    <SectionShell icon={Hash} title="Hashes" description="HSET, HGET, HGETALL — field/value maps stored at a key." buildPayload={build} resultTitle="Hashes result">
      <Field label="Operation" htmlFor="h-op">
        <Select id="h-op" value={op} onChange={(e) => setOp(e.target.value)} options={OPS} />
      </Field>
      <Field label="Key" htmlFor="h-key">
        <Input id="h-key" value={key} onChange={(e) => setKey(e.target.value)} placeholder="user:1" />
      </Field>
      {["hset", "hget", "hexists"].includes(op) && (
        <Field label="Field" htmlFor="h-field">
          <Input id="h-field" value={field} onChange={(e) => setField(e.target.value)} placeholder="name" />
        </Field>
      )}
      {op === "hset" && (
        <Field label="Value" htmlFor="h-val">
          <Input id="h-val" value={value} onChange={(e) => setValue(e.target.value)} placeholder="Ada" />
        </Field>
      )}
      {op === "hdel" && (
        <Field label="Fields (comma-separated)" htmlFor="h-fields">
          <Input id="h-fields" value={fields} onChange={(e) => setFields(e.target.value)} />
        </Field>
      )}
      {op === "hmset" && (
        <Field label="Mapping (JSON object)" htmlFor="h-map">
          <Input id="h-map" value={mapping} onChange={(e) => setMapping(e.target.value)} />
        </Field>
      )}
    </SectionShell>
  );
}