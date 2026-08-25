import { useState } from "react";
import { BarChart3 } from "lucide-react";
import { SectionShell, Field } from "@/components/SectionShell";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";

const OPS = [
  { value: "zadd", label: "ZADD — add member with score" },
  { value: "zaddmany", label: "ZADD (many) — add several members" },
  { value: "zrange", label: "ZRANGE — ascending range" },
  { value: "zrevrange", label: "ZREVRANGE — descending range" },
  { value: "zrangebyscore", label: "ZRANGEBYSCORE — by score" },
  { value: "zrem", label: "ZREM — remove a member" },
  { value: "zcard", label: "ZCARD — member count" },
  { value: "zscore", label: "ZSCORE — score of a member" },
];

export default function SortedSetsPage() {
  const [op, setOp] = useState("zrange");
  const [key, setKey] = useState("");
  const [member, setMember] = useState("");
  const [score, setScore] = useState("0");
  const [mapping, setMapping] = useState('{"a":1,"b":2}');
  const [start, setStart] = useState("0");
  const [stop, setStop] = useState("-1");
  const [min, setMin] = useState("-inf");
  const [max, setMax] = useState("+inf");
  const [withscores, setWithscores] = useState(true);

  const build = () => {
    const p: Record<string, unknown> = { cmd: "sorted-sets", op, key };
    if (["zadd", "zrem", "zscore"].includes(op)) p.member = member;
    if (op === "zadd") p.score = Number(score);
    if (op === "zaddmany") {
      try { p.mapping = JSON.parse(mapping); } catch { /* invalid */ }
    }
    if (["zrange", "zrevrange"].includes(op)) { p.start = Number(start) || 0; p.stop = Number(stop) || -1; p.withscores = withscores; }
    if (op === "zrangebyscore") { p.min = min; p.max = max; p.withscores = withscores; }
    return p;
  };

  return (
    <SectionShell icon={BarChart3} title="Sorted Sets" description="ZADD, ZRANGE, ZRANGEBYSCORE — scored, ordered members." buildPayload={build} resultTitle="Sorted sets result">
      <Field label="Operation" htmlFor="z-op">
        <Select id="z-op" value={op} onChange={(e) => setOp(e.target.value)} options={OPS} />
      </Field>
      <Field label="Key" htmlFor="z-key">
        <Input id="z-key" value={key} onChange={(e) => setKey(e.target.value)} placeholder="leaderboard" />
      </Field>
      {op === "zadd" && (
        <>
          <Field label="Member" htmlFor="z-member">
            <Input id="z-member" value={member} onChange={(e) => setMember(e.target.value)} placeholder="alice" />
          </Field>
          <Field label="Score" htmlFor="z-score">
            <Input id="z-score" type="number" value={score} onChange={(e) => setScore(e.target.value)} placeholder="100" />
          </Field>
        </>
      )}
      {op === "zaddmany" && (
        <Field label="Mapping (JSON: member→score)" htmlFor="z-map">
          <Input id="z-map" value={mapping} onChange={(e) => setMapping(e.target.value)} />
        </Field>
      )}
      {["zrem", "zscore"].includes(op) && (
        <Field label="Member" htmlFor="z-rem-mem">
          <Input id="z-rem-mem" value={member} onChange={(e) => setMember(e.target.value)} />
        </Field>
      )}
      {["zrange", "zrevrange"].includes(op) && (
        <div className="grid grid-cols-2 gap-3">
          <Field label="Start" htmlFor="z-start">
            <Input id="z-start" type="number" value={start} onChange={(e) => setStart(e.target.value)} />
          </Field>
          <Field label="Stop" htmlFor="z-stop">
            <Input id="z-stop" value={stop} onChange={(e) => setStop(e.target.value)} placeholder="-1" />
          </Field>
        </div>
      )}
      {op === "zrangebyscore" && (
        <div className="grid grid-cols-2 gap-3">
          <Field label="Min" htmlFor="z-min">
            <Input id="z-min" value={min} onChange={(e) => setMin(e.target.value)} placeholder="-inf" />
          </Field>
          <Field label="Max" htmlFor="z-max">
            <Input id="z-max" value={max} onChange={(e) => setMax(e.target.value)} placeholder="+inf" />
          </Field>
        </div>
      )}
      {["zrange", "zrevrange", "zrangebyscore"].includes(op) && (
        <label htmlFor="z-withscores" className="flex items-center gap-2 text-sm">
          <input id="z-withscores" type="checkbox" checked={withscores} onChange={(e) => setWithscores(e.target.checked)} className="h-4 w-4 rounded border-input" />
          Include scores
        </label>
      )}
    </SectionShell>
  );
}