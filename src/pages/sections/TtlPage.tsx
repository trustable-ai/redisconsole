import { useState } from "react";
import { Clock } from "lucide-react";
import { SectionShell, Field } from "@/components/SectionShell";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";

const OPS = [
  { value: "ttl", label: "TTL — remaining seconds" },
  { value: "pttl", label: "PTTL — remaining milliseconds" },
  { value: "expire", label: "EXPIRE — set seconds" },
  { value: "pexpire", label: "PEXPIRE — set milliseconds" },
  { value: "persist", label: "PERSIST — remove expiration" },
];

export default function TtlPage() {
  const [op, setOp] = useState("expire");
  const [key, setKey] = useState("");
  const [seconds, setSeconds] = useState("60");
  const [milliseconds, setMilliseconds] = useState("60000");

  const build = () => {
    const p: Record<string, unknown> = { cmd: "ttl", op, key };
    if (op === "expire") p.seconds = Number(seconds) || 0;
    if (op === "pexpire") p.milliseconds = Number(milliseconds) || 0;
    return p;
  };

  return (
    <SectionShell icon={Clock} title="TTL" description="EXPIRE, PERSIST, TTL — key expiration management." buildPayload={build} resultTitle="TTL result">
      <Field label="Operation" htmlFor="t-op">
        <Select id="t-op" value={op} onChange={(e) => setOp(e.target.value)} options={OPS} />
      </Field>
      <Field label="Key" htmlFor="t-key">
        <Input id="t-key" value={key} onChange={(e) => setKey(e.target.value)} placeholder="session:1" />
      </Field>
      {op === "expire" && (
        <Field label="Seconds" htmlFor="t-sec">
          <Input id="t-sec" type="number" value={seconds} onChange={(e) => setSeconds(e.target.value)} />
        </Field>
      )}
      {op === "pexpire" && (
        <Field label="Milliseconds" htmlFor="t-ms">
          <Input id="t-ms" type="number" value={milliseconds} onChange={(e) => setMilliseconds(e.target.value)} />
        </Field>
      )}
      <p className="text-xs text-muted-foreground">
        TTL returns -1 when a key exists but has no expiration, and -2 when the
        key does not exist.
      </p>
    </SectionShell>
  );
}