import { useState } from "react";
import { List } from "lucide-react";
import { SectionShell, Field } from "@/components/SectionShell";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";

const OPS = [
  { value: "lpush", label: "LPUSH — prepend value(s)" },
  { value: "rpush", label: "RPUSH — append value(s)" },
  { value: "lpop", label: "LPOP — pop from head" },
  { value: "rpop", label: "RPOP — pop from tail" },
  { value: "lrange", label: "LRANGE — read a range" },
  { value: "llen", label: "LLEN — list length" },
  { value: "lset", label: "LSET — set element by index" },
  { value: "lrem", label: "LREM — remove occurrences of value" },
];

export default function ListsPage() {
  const [op, setOp] = useState("lrange");
  const [key, setKey] = useState("");
  const [values, setValues] = useState("a, b, c");
  const [value, setValue] = useState("");
  const [start, setStart] = useState("0");
  const [stop, setStop] = useState("-1");
  const [index, setIndex] = useState("0");
  const [count, setCount] = useState("1");

  const build = () => {
    const p: Record<string, unknown> = { cmd: "lists", op, key };
    if (["lpush", "rpush"].includes(op)) p.values = values.split(",").map((s) => s.trim()).filter(Boolean);
    if (["lpop", "rpop"].includes(op) && count) p.count = Number(count);
    if (op === "lrange") { p.start = Number(start) || 0; p.stop = Number(stop) || -1; }
    if (op === "lset") { p.index = Number(index) || 0; p.value = value; }
    if (op === "lrem") { p.value = value; p.count = Number(count) || 0; }
    return p;
  };

  return (
    <SectionShell icon={List} title="Lists" description="LPUSH/RPUSH, LPOP/RPOP, LRANGE — linked lists." buildPayload={build} resultTitle="Lists result">
      <Field label="Operation" htmlFor="l-op">
        <Select id="l-op" value={op} onChange={(e) => setOp(e.target.value)} options={OPS} />
      </Field>
      <Field label="Key" htmlFor="l-key">
        <Input id="l-key" value={key} onChange={(e) => setKey(e.target.value)} placeholder="queue" />
      </Field>
      {["lpush", "rpush"].includes(op) && (
        <Field label="Values (comma-separated)" htmlFor="l-vals">
          <Input id="l-vals" value={values} onChange={(e) => setValues(e.target.value)} />
        </Field>
      )}
      {["lpop", "rpop"].includes(op) && (
        <Field label="Count (optional)" htmlFor="l-count">
          <Input id="l-count" type="number" value={count} onChange={(e) => setCount(e.target.value)} />
        </Field>
      )}
      {op === "lrange" && (
        <div className="grid grid-cols-2 gap-3">
          <Field label="Start" htmlFor="l-start">
            <Input id="l-start" type="number" value={start} onChange={(e) => setStart(e.target.value)} />
          </Field>
          <Field label="Stop" htmlFor="l-stop">
            <Input id="l-stop" value={stop} onChange={(e) => setStop(e.target.value)} placeholder="-1" />
          </Field>
        </div>
      )}
      {["lset", "lrem"].includes(op) && (
        <Field label="Value" htmlFor="l-val">
          <Input id="l-val" value={value} onChange={(e) => setValue(e.target.value)} />
        </Field>
      )}
      {op === "lset" && (
        <Field label="Index" htmlFor="l-idx">
          <Input id="l-idx" type="number" value={index} onChange={(e) => setIndex(e.target.value)} />
        </Field>
      )}
      {op === "lrem" && (
        <Field label="Count (>0 head, <0 tail, 0 all)" htmlFor="l-remcount">
          <Input id="l-remcount" type="number" value={count} onChange={(e) => setCount(e.target.value)} />
        </Field>
      )}
    </SectionShell>
  );
}