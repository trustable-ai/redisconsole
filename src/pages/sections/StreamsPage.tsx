import { useState } from "react";
import { Waves } from "lucide-react";
import { SectionShell, Field } from "@/components/SectionShell";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";

const OPS = [
  { value: "xadd", label: "XADD — append an entry" },
  { value: "xrange", label: "XRANGE — read entries" },
  { value: "xlen", label: "XLEN — stream length" },
  { value: "xdel", label: "XDEL — delete entry/entries" },
];

export default function StreamsPage() {
  const [op, setOp] = useState("xrange");
  const [key, setKey] = useState("");
  const [id, setId] = useState("*");
  const [fields, setFields] = useState('{"event":"login","user":"ada"}');
  const [min, setMin] = useState("-");
  const [max, setMax] = useState("+");
  const [ids, setIds] = useState("");

  const build = () => {
    const p: Record<string, unknown> = { cmd: "streams", op, key };
    if (op === "xadd") { p.id = id; try { p.fields = JSON.parse(fields); } catch { /* invalid */ } }
    if (op === "xrange") { p.min = min; p.max = max; }
    if (op === "xdel") p.ids = ids.split(",").map((s) => s.trim()).filter(Boolean);
    return p;
  };

  return (
    <SectionShell icon={Waves} title="Streams" description="XADD, XRANGE, XLEN — append-only log entries." buildPayload={build} resultTitle="Streams result">
      <Field label="Operation" htmlFor="x-op">
        <Select id="x-op" value={op} onChange={(e) => setOp(e.target.value)} options={OPS} />
      </Field>
      <Field label="Key" htmlFor="x-key">
        <Input id="x-key" value={key} onChange={(e) => setKey(e.target.value)} placeholder="events" />
      </Field>
      {op === "xadd" && (
        <>
          <Field label="Entry ID (* = auto)" htmlFor="x-id">
            <Input id="x-id" value={id} onChange={(e) => setId(e.target.value)} placeholder="*" />
          </Field>
          <Field label="Fields (JSON object)" htmlFor="x-fields">
            <Input id="x-fields" value={fields} onChange={(e) => setFields(e.target.value)} />
          </Field>
        </>
      )}
      {op === "xrange" && (
        <div className="grid grid-cols-2 gap-3">
          <Field label="Min" htmlFor="x-min">
            <Input id="x-min" value={min} onChange={(e) => setMin(e.target.value)} placeholder="-" />
          </Field>
          <Field label="Max" htmlFor="x-max">
            <Input id="x-max" value={max} onChange={(e) => setMax(e.target.value)} placeholder="+" />
          </Field>
        </div>
      )}
      {op === "xdel" && (
        <Field label="IDs (comma-separated)" htmlFor="x-ids">
          <Input id="x-ids" value={ids} onChange={(e) => setIds(e.target.value)} placeholder="1234567-0" />
        </Field>
      )}
    </SectionShell>
  );
}