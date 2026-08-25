import { useState, useCallback } from "react";
import { BarChart3 } from "lucide-react";
import { LabShell, LabField } from "@/components/labs/LabShell";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { useLabExecution, useDemoData } from "@/hooks/use-lab-execution";
import { formatCommand, demoKey } from "@/lib/labs";

const OPS = [
  { value: "zadd", label: "ZADD — add a scored member" },
  { value: "zrange", label: "ZRANGE — ascending order" },
  { value: "zrevrange", label: "ZREVRANGE — descending order" },
  { value: "zscore", label: "ZSCORE — read a member's score" },
];

const EXAMPLES = [
  { syntax: "ZADD key score member", desc: "Add or update a member with its floating-point score." },
  { syntax: "ZRANGE key start stop [WITHSCORES]", desc: "Return members in ascending score order." },
  { syntax: "ZREVRANGE key start stop [WITHSCORES]", desc: "Return members in descending score order." },
  { syntax: "ZSCORE key member", desc: "Return the score of a single member, or nil." },
];

const DEMO_KIND = "sortedsets";

export default function SortedSetsLab() {
  const [op, setOp] = useState("zadd");
  const [key, setKey] = useState(demoKey("zset:leaderboard"));
  const [member, setMember] = useState("ada");
  const [score, setScore] = useState("100");
  const [start, setStart] = useState("0");
  const [stop, setStop] = useState("-1");
  const [withscores, setWithscores] = useState(true);

  const lab = useLabExecution();
  const refreshState = useCallback(async () => {
    if (!key) return;
    await lab.run({ cmd: "sorted-sets", op: "zrange", key, start: 0, stop: -1, withscores: true }, {});
  }, [key, lab]);
  const demo = useDemoData(refreshState);

  const mutating = op === "zadd";
  const readPayload = key
    ? { cmd: "sorted-sets", op: "zrange", key, start: 0, stop: -1, withscores: true }
    : null;

  const buildPayload = (): Record<string, unknown> => {
    const p: Record<string, unknown> = { cmd: "sorted-sets", op, key };
    if (op === "zadd") { p.member = member; p.score = Number(score) || 0; }
    if (["zrange", "zrevrange"].includes(op)) {
      p.start = Number(start) || 0;
      p.stop = Number(stop) || -1;
      p.withscores = withscores;
    }
    if (op === "zscore") p.member = member;
    return p;
  };

  const buildCommand = (): string => {
    if (op === "zadd") return formatCommand(["ZADD", key, score, member]);
    if (op === "zrange") return formatCommand(["ZRANGE", key, start, stop, ...(withscores ? ["WITHSCORES"] : [])]);
    if (op === "zrevrange") return formatCommand(["ZREVRANGE", key, start, stop, ...(withscores ? ["WITHSCORES"] : [])]);
    return formatCommand(["ZSCORE", key, member]);
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
      icon={BarChart3}
      title="Sorted Sets Laboratory"
      explanation={
        <p>
          Sorted sets map unique members to floating-point scores and keep them
          ordered. They power leaderboards, rankings, and time-series indexes.
          <code>ZADD</code> sets a score, <code>ZRANGE</code>/<code>ZREVRANGE</code>
          iterate, and <code>ZSCORE</code> reads one score.
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
      demoHint="Demo key: redis-console:demo:zset:leaderboard (ada 100, grace 85, alan 92)."
      resultTitle="Sorted sets response"
    >
      <LabField label="Operation" htmlFor="zlab-op">
        <Select id="zlab-op" value={op} onChange={(e) => setOp(e.target.value)} options={OPS} />
      </LabField>
      <LabField label="Key" htmlFor="zlab-key">
        <Input id="zlab-key" value={key} onChange={(e) => setKey(e.target.value)} placeholder={demoKey("zset:leaderboard")} />
      </LabField>
      {(op === "zadd" || op === "zscore") && (
        <LabField label="Member" htmlFor="zlab-member">
          <Input id="zlab-member" value={member} onChange={(e) => setMember(e.target.value)} placeholder="ada" />
        </LabField>
      )}
      {op === "zadd" && (
        <LabField label="Score" htmlFor="zlab-score">
          <Input id="zlab-score" type="number" value={score} onChange={(e) => setScore(e.target.value)} placeholder="100" />
        </LabField>
      )}
      {["zrange", "zrevrange"].includes(op) && (
        <>
          <div className="grid grid-cols-2 gap-3">
            <LabField label="Start" htmlFor="zlab-start">
              <Input id="zlab-start" value={start} onChange={(e) => setStart(e.target.value)} placeholder="0" />
            </LabField>
            <LabField label="Stop" htmlFor="zlab-stop">
              <Input id="zlab-stop" value={stop} onChange={(e) => setStop(e.target.value)} placeholder="-1" />
            </LabField>
          </div>
          <label htmlFor="zlab-ws" className="flex items-center gap-2 text-sm">
            <input
              id="zlab-ws"
              name="zlab-ws"
              type="checkbox"
              checked={withscores}
              onChange={(e) => setWithscores(e.target.checked)}
              className="h-4 w-4"
            />
            Include scores (WITHSCORES)
          </label>
        </>
      )}
    </LabShell>
  );
}