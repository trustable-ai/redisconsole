import { useState } from "react";
import { Terminal } from "lucide-react";
import { SectionShell, Field } from "@/components/SectionShell";
import { Input } from "@/components/ui/input";

const EXAMPLES = [
  "PING",
  "DBSIZE",
  "INFO",
  "SET greeting hello",
  "GET greeting",
  "HSET user:1 name Ada role admin",
  "HGETALL user:1",
  "LPUSH queue a b c",
  "LRANGE queue 0 -1",
];

export default function RawPage() {
  const [command, setCommand] = useState("SET greeting hello");

  const build = () => ({ cmd: "raw", command });

  return (
    <SectionShell
      icon={Terminal}
      title="Raw Commands"
      description="Execute arbitrary Redis commands directly."
      buildPayload={build}
      canRun={command.trim().length > 0}
      resultTitle="Raw result"
    >
      <Field label="Command" htmlFor="raw-cmd" hint="Quoted arguments are supported via shell-style splitting.">
        <Input
          id="raw-cmd"
          value={command}
          onChange={(e) => setCommand(e.target.value)}
          placeholder="SET key value"
          className="font-mono"
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              (e.currentTarget.form as any)?.requestSubmit?.();
            }
          }}
        />
      </Field>

      <div className="space-y-1.5">
        <p className="text-xs font-medium text-muted-foreground">Examples</p>
        <div className="flex flex-wrap gap-1.5">
          {EXAMPLES.map((ex) => (
            <button
              key={ex}
              type="button"
              onClick={() => setCommand(ex)}
              className="rounded-md border border-border bg-muted/40 px-2 py-1 font-mono text-xs hover:bg-muted"
            >
              {ex}
            </button>
          ))}
        </div>
      </div>

      <p className="text-xs text-muted-foreground">
        The key argument is automatically namespaced with the app prefix. Meta
        commands like PING, INFO, and DBSIZE run without a key.
      </p>
    </SectionShell>
  );
}