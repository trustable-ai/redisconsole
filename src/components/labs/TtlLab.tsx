import { useState, useCallback } from "react";
import { Clock } from "lucide-react";
import { LabShell, LabField } from "@/components/labs/LabShell";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { useLabExecution, useDemoData } from "@/hooks/use-lab-execution";
import { formatCommand, demoKey } from "@/lib/labs";

const OPS = [
  { value: "ttl", label: "TTL — remaining seconds" },
  { value: "pttl", label: "PTTL — remaining milliseconds" },
  { value: "expire", label: "EXPIRE — set a TTL in seconds" },
  { value: "persist", label: "PERSIST — remove the TTL" },
];

const EXAMPLES = [
  { syntax: "TTL key", desc: "Return remaining seconds; -1 = no expiry, -2 = no key." },
  { syntax: "PTTL key", desc: "Return remaining milliseconds (same sentinel values)." },
  { syntax: "EXPIRE key seconds", desc: "Set a time-to-live in seconds on an existing key." },
  { syntax: "PERSIST key", desc: "Remove the TTL so the key lives until explicitly deleted." },
];

const DEMO_KIND = "ttl";

export default function TtlLab() {
  const [op, setOp] = useState("expire");
  const [key, setKey] = useState(demoKey("ttl:session"));
  const [seconds, setSeconds] = useState("60");

  const lab = useLabExecution();
  const refreshState = useCallback(async () => {
    if (!key) return;
    await lab.run({ cmd: "ttl", op: "ttl", key }, {});
  }, [key, lab]);
  const demo = useDemoData(refreshState);

  const mutating = ["expire", "persist"].includes(op);
  const readPayload = key ? { cmd: "ttl", op: "ttl", key } : null;

  const buildPayload = (): Record<string, unknown> => {
    const p: Record<string, unknown> = { cmd: "ttl", op, key };
    if (op === "expire") p.seconds = Number(seconds) || 0;
    return p;
  };

  const buildCommand = (): string => {
    if (op === "ttl") return formatCommand(["TTL", key]);
    if (op === "pttl") return formatCommand(["PTTL", key]);
    if (op === "expire") return formatCommand(["EXPIRE", key, seconds]);
    return formatCommand(["PERSIST", key]);
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
      icon={Clock}
      title="TTL Laboratory"
      explanation={
        <p>
          Redis can expire keys after a time-to-live. <code>EXPIRE</code> sets a
          TTL in seconds, <code>PERSIST</code> removes it, and
          <code>TTL</code>/<code>PTTL</code> read the remaining time. Watch the
          before/after snapshot to see the TTL change.
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
      demoHint="Demo key: redis-console:demo:ttl:session (value with EX 120). Note TTL/PTTL return -2 if the key no longer exists."
      resultTitle="TTL response"
    >
      <LabField label="Operation" htmlFor="tlab-op">
        <Select id="tlab-op" value={op} onChange={(e) => setOp(e.target.value)} options={OPS} />
      </LabField>
      <LabField label="Key" htmlFor="tlab-key">
        <Input id="tlab-key" value={key} onChange={(e) => setKey(e.target.value)} placeholder={demoKey("ttl:session")} />
      </LabField>
      {op === "expire" && (
        <LabField label="Seconds" htmlFor="tlab-sec">
          <Input id="tlab-sec" type="number" value={seconds} onChange={(e) => setSeconds(e.target.value)} />
        </LabField>
      )}
    </LabShell>
  );
}