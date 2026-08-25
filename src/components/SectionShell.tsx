import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { OutputPanel } from "@/components/OutputPanel";
import { Button } from "@/components/ui/button";
import { Loader2, Play } from "lucide-react";
import { useRedisCommand } from "@/hooks/use-redis-command";

interface SectionShellProps {
  icon: LucideIcon;
  title: string;
  description: string;
  /** The command-building form for this section. */
  children: ReactNode;
  /** Whether the run button should be enabled. */
  canRun?: boolean;
  /** Payload to send to the backend action when Run is pressed. */
  buildPayload: () => Record<string, unknown>;
  /** Optional override of the result panel title. */
  resultTitle?: string;
}

/**
 * Shared two-panel layout for every section: a command execution area on top
 * (the form + Run button) and the output/result panel below. On large screens
 * they sit side-by-side; on mobile they stack.
 */
export function SectionShell({
  icon: Icon,
  title,
  description,
  children,
  canRun = true,
  buildPayload,
  resultTitle = "Result",
}: SectionShellProps) {
  const { loading, result, error, run } = useRedisCommand();

  const onRun = () => {
    if (!canRun) return;
    run(buildPayload());
  };

  return (
    <div className="flex h-full flex-col gap-4 lg:flex-row">
      <div className="flex w-full flex-col lg:w-1/2">
        <div className="mb-4 flex items-start gap-3">
          <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Icon className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-lg font-semibold leading-tight">{title}</h2>
            <p className="text-sm text-muted-foreground">{description}</p>
          </div>
        </div>

        <div className="flex-1 overflow-auto rounded-lg border border-border bg-card p-4">
          <div className="space-y-4">{children}</div>
        </div>

        <div className="mt-4 flex items-center justify-end">
          <Button onClick={onRun} disabled={!canRun || loading} className="gap-2">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
            Run command
          </Button>
        </div>
      </div>

      <div className="flex min-h-[280px] w-full flex-col lg:w-1/2">
        <OutputPanel loading={loading} result={result} error={error} title={resultTitle} />
      </div>
    </div>
  );
}

/** Small labeled field wrapper used by the section forms. */
export function Field({
  label,
  htmlFor,
  hint,
  children,
}: {
  label: string;
  htmlFor?: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={htmlFor} className="text-sm font-medium">
        {label}
      </label>
      {children}
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}