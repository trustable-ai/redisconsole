import { useState, useCallback } from "react";
import { Boxes } from "lucide-react";
import { LabShell, LabField } from "@/components/labs/LabShell";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { useLabExecution, useDemoData } from "@/hooks/use-lab-execution";
import { formatCommand, demoKey } from "@/lib/labs";

const OPS = [
  { value: "sadd", label: "SADD — add member(s)" },
  { value: "srem", label: "SREM — remove member(s)" },
  { value: "smembers", label: "SMEMBERS — all members" },
  { value: "sismember", label: "SISMEMBER — check membership" },
];

const EXAMPLES = [
  { syntax: "SADD key member [member ...]", desc: "Add one or more members to the set." },
  { syntax: "SREM key member [member ...]", desc: "Remove one or more members from the set." },
  { syntax: "SMEMBERS key", desc: "Return every member of the set (order is arbitrary)." },
  { syntax: "SISMEMBER key member", desc: "Return 1 if member is in the set, else 0." },
];

const DEMO_KIND = "sets";

export default function SetsLab() {
  const [op, setOp] = useState("sadd");
  const [key, setKey] = useState(demoKey("sets:tags"));
  const [members, setMembers] = useState("redis, streams, demo");
  const [member, setMember] = useState("redis");

  const lab = useLabExecution();
  const refreshState = useCallback(async () => {
    if (!key) return;
    await lab.run({ cmd: "sets", op: "smembers", key }, {});
  }, [key, lab]);
  const demo = useDemoData(refreshState);

  const mutating = ["sadd", "srem"].includes(op);
  const readPayload = key ? { cmd: "sets", op: "smembers", key } : null;
  const memberList = () => members.split(",").map((s) => s.trim()).filter(Boolean);

  const buildPayload = (): Record<string, unknown> => {
    const p: Record<string, unknown> = { cmd: "sets", op, key };
    if (["sadd", "srem"].includes(op)) p.members = memberList();
    if (op === "sismember") p.member = member;
    return p;
  };

  const buildCommand = (): string => {
    if (op === "sadd") return formatCommand(["SADD", key, ...memberList()]);
    if (op === "srem") return formatCommand(["SREM", key, ...memberList()]);
    if (op === "sismember") return formatCommand(["SISMEMBER", key, member]);
    return formatCommand(["SMEMBERS", key]);
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
      icon={Boxes}
      title="Sets Laboratory"
      explanation={
        <p>
          Redis sets are unordered collections of unique strings.
          <code>SADD</code> adds members, <code>SREM</code> removes them,
          <code>SMEMBERS</code> lists all, and <code>SISMEMBER</code> tests
          membership in O(1).
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
      demoHint="Demo key: redis-console:demo:sets:tags (redis, streams, demo)."
      resultTitle="Sets response"
    >
      <LabField label="Operation" htmlFor="slab-op">
        <Select id="slab-op" value={op} onChange={(e) => setOp(e.target.value)} options={OPS} />
      </LabField>
      <LabField label="Key" htmlFor="slab-key">
        <Input id="slab-key" value={key} onChange={(e) => setKey(e.target.value)} placeholder={demoKey("sets:tags")} />
      </LabField>
      {["sadd", "srem"].includes(op) && (
        <LabField label="Members (comma-separated)" htmlFor="slab-members">
          <Input id="slab-members" value={members} onChange={(e) => setMembers(e.target.value)} />
        </LabField>
      )}
      {op === "sismember" && (
        <LabField label="Member" htmlFor="slab-member">
          <Input id="slab-member" value={member} onChange={(e) => setMember(e.target.value)} placeholder="redis" />
        </LabField>
      )}
    </LabShell>
  );
}