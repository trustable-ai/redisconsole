import { useState } from "react";
import { Type } from "lucide-react";
import { SectionShell, Field } from "@/components/SectionShell";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";

const OPS = [
  { value: "set", label: "SET — set a string value" },
  { value: "get", label: "GET — read a string value" },
  { value: "getset", label: "GETSET — set and return old value" },
  { value: "incr", label: "INCR — increment (by amount)" },
  { value: "decr", label: "DECR — decrement (by amount)" },
  { value: "append", label: "APPEND — append to value" },
  { value: "strlen", label: "STRLEN — length of value" },
  { value: "mget", label: "MGET — read multiple keys" },
  { value: "mset", label: "MSET — set multiple keys" },
];

export default function StringsPage() {
  const [op, setOp] = useState("set");
  const [key, setKey] = useState("");
  const [value, setValue] = useState("");
  const [amount, setAmount] = useState("1");
  const [ex, setEx] = useState("");
  const [keys, setKeys] = useState("k1, k2");
  const [mapping, setMapping] = useState('{"k1":"a","k2":"b"}');

  const build = () => {
    const p: Record<string, unknown> = { cmd: "strings", op, key };
    if (["set", "getset", "append"].includes(op)) p.value = value;
    if (["incr", "decr"].includes(op)) p.amount = Number(amount) || 1;
    if (op === "set" && ex) p.ex = Number(ex);
    if (op === "mget") p.keys = keys.split(",").map((s) => s.trim()).filter(Boolean);
    if (op === "mset") {
      try { p.mapping = JSON.parse(mapping); } catch { /* invalid handled by user */ }
    }
    return p;
  };

  return (
    <SectionShell icon={Type} title="Strings" description="SET, GET, INCR, APPEND and other string commands." buildPayload={build} resultTitle="Strings result">
      <Field label="Operation" htmlFor="str-op">
        <Select id="str-op" value={op} onChange={(e) => setOp(e.target.value)} options={OPS} />
      </Field>
      {op !== "mget" && op !== "mset" && (
        <Field label="Key" htmlFor="str-key">
          <Input id="str-key" value={key} onChange={(e) => setKey(e.target.value)} placeholder="mystring" />
        </Field>
      )}
      {["set", "getset", "append"].includes(op) && (
        <Field label="Value" htmlFor="str-val">
          <Input id="str-val" value={value} onChange={(e) => setValue(e.target.value)} placeholder="hello" />
        </Field>
      )}
      {["incr", "decr"].includes(op) && (
        <Field label="Amount" htmlFor="str-amt">
          <Input id="str-amt" type="number" value={amount} onChange={(e) => setAmount(e.target.value)} />
        </Field>
      )}
      {op === "set" && (
        <Field label="Expire (seconds, optional)" htmlFor="str-ex">
          <Input id="str-ex" type="number" value={ex} onChange={(e) => setEx(e.target.value)} placeholder="60" />
        </Field>
      )}
      {op === "mget" && (
        <Field label="Keys (comma-separated)" htmlFor="str-keys">
          <Input id="str-keys" value={keys} onChange={(e) => setKeys(e.target.value)} />
        </Field>
      )}
      {op === "mset" && (
        <Field label="Mapping (JSON object)" htmlFor="str-map" hint='e.g. {"a":"1","b":"2"}'>
          <Input id="str-map" value={mapping} onChange={(e) => setMapping(e.target.value)} />
        </Field>
      )}
    </SectionShell>
  );
}