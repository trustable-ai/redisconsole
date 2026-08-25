import { useState } from "react";
import { Radio, Megaphone } from "lucide-react";
import { SectionShell, Field } from "@/components/SectionShell";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";

const OPS = [
  { value: "publish", label: "PUBLISH — send a message" },
  { value: "channels", label: "PUBSUB CHANNELS — list active channels" },
  { value: "numsub", label: "PUBSUB NUMSUB — subscriber counts" },
];

export default function PubSubPage() {
  const [op, setOp] = useState("channels");
  const [channel, setChannel] = useState("");
  const [message, setMessage] = useState("");
  const [channels, setChannels] = useState("news, alerts");

  const build = () => {
    const p: Record<string, unknown> = { cmd: "pubsub", op };
    if (op === "publish") { p.channel = channel; p.message = message; }
    if (op === "numsub") p.channels = channels.split(",").map((s) => s.trim()).filter(Boolean);
    return p;
  };

  return (
    <SectionShell icon={Radio} title="Pub/Sub" description="PUBLISH messages and list active channels." buildPayload={build} resultTitle="Pub/Sub result">
      <Field label="Operation" htmlFor="p-op">
        <Select id="p-op" value={op} onChange={(e) => setOp(e.target.value)} options={OPS} />
      </Field>
      {op === "publish" && (
        <>
          <Field label="Channel" htmlFor="p-channel">
            <Input id="p-channel" value={channel} onChange={(e) => setChannel(e.target.value)} placeholder="news" />
          </Field>
          <Field label="Message" htmlFor="p-message">
            <Input id="p-message" value={message} onChange={(e) => setMessage(e.target.value)} placeholder="hello world" />
          </Field>
        </>
      )}
      {op === "numsub" && (
        <Field label="Channels (comma-separated)" htmlFor="p-channels">
          <Input id="p-channels" value={channels} onChange={(e) => setChannels(e.target.value)} />
        </Field>
      )}
      <div className="flex items-start gap-2 rounded-md border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-700 dark:text-amber-300">
        <Megaphone className="mt-0.5 h-4 w-4 shrink-0" />
        <p>
          SUBSCRIBE needs a long-lived connection, which serverless actions
          cannot hold. PUBLISH and channel listing are exposed here, but the
          platform Redis ACL may restrict publishing to channels; if a publish
          returns <code className="text-xs">No permissions to access a channel</code>,
          that is an account-level ACL limit, not a console error.
        </p>
      </div>
    </SectionShell>
  );
}