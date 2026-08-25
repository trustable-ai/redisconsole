import { Copy } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface CommandHintProps {
  /** The Redis command string this visual operation corresponds to. */
  command: string;
  className?: string;
}

/**
 * Shows the raw Redis command equivalent of a visual operation, so the
 * console doubles as a Redis learning tool. Rendered in a monospace badge
 * with a copy button.
 */
export function CommandHint({ command, className }: CommandHintProps) {
  return (
    <div
      className={cn(
        "flex items-center gap-2 rounded-md border border-border bg-muted/50 px-3 py-1.5 font-mono text-xs",
        className,
      )}
    >
      <span className="shrink-0 text-muted-foreground">redis&gt;</span>
      <code className="min-w-0 break-all text-foreground">{command}</code>
      <button
        type="button"
        className="ml-auto inline-flex shrink-0 items-center text-muted-foreground transition-colors hover:text-foreground"
        aria-label="Copy command"
        onClick={() => {
          navigator.clipboard?.writeText(command);
          toast.success("Command copied");
        }}
      >
        <Copy className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}