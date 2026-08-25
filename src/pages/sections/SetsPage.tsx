import { useState } from "react";
import { Boxes } from "lucide-react";
import { SectionShell, Field } from "@/components/SectionShell";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";

const OPS = [
  { value: "sadd", label: "SADD — add member(s)" },
  { value: "srem", label: "SREM — remove member(s)" },
  { value: "smembers", label: "SMEMBERS — all members" },
  { value: "sismember", label: "SISMEMBER — check membership" },
  { value: "scard", label: "SCARD — number of members" },
];

export default function SetsPage() {
  const [op, setOp] = useState("smembers");
  const [key, setKey] = useState("");
  const [members, setMembers] = useState("a, b, c");
  const [member, setMember] = useState("");

  const build = () => {
    const p: Record<string, unknown> = { cmd: "sets", op, key };
    if (["sadd", "srem"].includes(op)) p.members = members.split(",").map((s) => s.trim()).filter(Boolean);
    if (["sismember"].includes(op)) p.member = member;
    return p;
  };

  return (
    <SectionShell icon={Boxes} title="Sets" description="SADD, SREM, SMEMBERS — unordered unique collections." buildPayload={build} resultTitle="Sets result">
      <Field label="Operation" htmlFor="s-op">
        <Select id="s-op" value={op} onChange={(e) => setOp(e.target.value)} options={OPS} />
      </Field>
      <Field label="Key" htmlFor="s-key">
        <Input id="s-key" value={key} onChange={(e) => setKey(e.target.value)} placeholder="tags" />
      </Field>
      {["sadd", "srem"].includes(op) && (
        <Field label="Members (comma-separated)" htmlFor="s-members">
          <Input id="s-members" value={members} onChange={(e) => setMembers(e.target.value)} />
        </Field>
      )}
      {op === "sismember" && (
        <Field label="Member" htmlFor="s-member">
          <Input id="s-member" value={member} onChange={(e) => setMember(e.target.value)} />
        </Field>
      )}
    </SectionShell>
  );
}