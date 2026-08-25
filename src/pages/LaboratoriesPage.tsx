import { useState } from "react";
import { FlaskConical } from "lucide-react";
import { cn } from "@/lib/utils";
import StringsLab from "@/components/labs/StringsLab";
import HashesLab from "@/components/labs/HashesLab";
import ListsLab from "@/components/labs/ListsLab";
import SetsLab from "@/components/labs/SetsLab";
import SortedSetsLab from "@/components/labs/SortedSetsLab";
import StreamsLab from "@/components/labs/StreamsLab";
import TtlLab from "@/components/labs/TtlLab";
import { useDemoData } from "@/hooks/use-lab-execution";
import { Button } from "@/components/ui/button";
import { Trash2, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface LabTab {
  id: string;
  label: string;
  Component: React.ComponentType;
}

const LABS: LabTab[] = [
  { id: "strings", label: "Strings", Component: StringsLab },
  { id: "hashes", label: "Hashes", Component: HashesLab },
  { id: "lists", label: "Lists", Component: ListsLab },
  { id: "sets", label: "Sets", Component: SetsLab },
  { id: "sorted-sets", label: "Sorted Sets", Component: SortedSetsLab },
  { id: "streams", label: "Streams", Component: StreamsLab },
  { id: "ttl", label: "TTL", Component: TtlLab },
];

/**
 * Interactive Redis Laboratories hub. Each laboratory is a self-contained
 * component with its own execution state, so sections stay independent. Only
 * the active lab is mounted at a time. A shared "Delete demo data" control at
 * the top cleans the whole redis-console:demo: namespace at once.
 */
export default function LaboratoriesPage() {
  const [active, setActive] = useState<string>("strings");
  const ActiveLab = LABS.find((l) => l.id === active)?.Component ?? StringsLab;

  // Top-level "delete all demo data" sweep, independent from per-lab buttons.
  const globalDemo = useDemoData(async () => {});

  const onSweep = async () => {
    const ok = await globalDemo.clean();
    if (ok) toast.success("All demo data deleted");
  };

  return (
    <div className="flex h-full flex-col">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <FlaskConical className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-lg font-semibold leading-tight">Interactive Laboratories</h2>
            <p className="text-sm text-muted-foreground">
              Learn each Redis data structure by running real commands against the
              connected instance. Demo keys live under{" "}
              <code className="rounded bg-muted px-1 py-0.5 text-xs">redis-console:demo:</code>
              and are never mixed with your other data.
            </p>
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={onSweep}
          disabled={globalDemo.seeding === "clean"}
          className="gap-1.5 text-destructive"
        >
          {globalDemo.seeding === "clean" ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Trash2 className="h-3.5 w-3.5" />
          )}
          Delete all demo data
        </Button>
      </div>

      <div className="mb-4 flex flex-wrap gap-1 rounded-lg border border-border bg-card p-1">
        {LABS.map((l) => (
          <button
            key={l.id}
            type="button"
            onClick={() => setActive(l.id)}
            className={cn(
              "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
              active === l.id
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
            )}
          >
            {l.label}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-auto">
        <ActiveLab />
      </div>
    </div>
  );
}