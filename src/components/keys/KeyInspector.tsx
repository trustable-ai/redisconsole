/**
 * KeyInspector — type-aware inspector for a selected Redis key.
 *
 * The backend `v1/console` action detects the key type; this component reads
 * TYPE + TTL and then renders the matching inspector. Every inspector uses
 * bounded, paginated reads so a huge list/hash/set/sorted-set/stream is never
 * fetched in one shot, and every visual operation surfaces the equivalent
 * raw Redis command via <CommandHint> so the console doubles as a learning
 * tool.
 */
import { useCallback, useEffect, useState } from "react";
import {
  ArrowDown,
  ArrowUp,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Plus,
  RefreshCw,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { redisCommand } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CommandHint } from "@/components/keys/CommandHint";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

interface KeyInspectorProps {
  keyName: string;
  /** Called after the key is deleted so the parent list refreshes. */
  onDeleted: () => void;
  /** Called after structural mutations so the parent list meta stays fresh. */
  onMetaChanged: () => void;
}

// Page size for paginated reads. Bounded to keep huge structures safe.
const PAGE = 50;

const TYPE_BADGE: Record<string, string> = {
  string: "bg-sky-500/10 text-sky-600 dark:text-sky-400",
  hash: "bg-violet-500/10 text-violet-600 dark:text-violet-400",
  list: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
  set: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  zset: "bg-rose-500/10 text-rose-600 dark:text-rose-400",
  stream: "bg-cyan-500/10 text-cyan-600 dark:text-cyan-400",
  none: "bg-muted text-muted-foreground",
};

function TypeBadge({ type }: { type: string }) {
  return (
    <span
      className={cn(
        "rounded px-1.5 py-0.5 text-[11px] font-medium",
        TYPE_BADGE[type] ?? TYPE_BADGE.none,
      )}
    >
      {type}
    </span>
  );
}

function ttlText(ttl: number): string {
  if (ttl === -1) return "no expiry";
  if (ttl === -2) return "key missing";
  return `${ttl}s`;
}

/** Quote a value for Redis command display, escaping embedded quotes. */
function quote(v: unknown): string {
  return `"${String(v ?? "").replace(/"/g, '\\"')}"`;
}

function Spinner({ label }: { label: string }) {
  return (
    <div className="flex items-center justify-center gap-2 py-6 text-sm text-muted-foreground">
      <Loader2 className="h-4 w-4 animate-spin" /> {label}
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <p className="py-6 text-center text-sm text-muted-foreground">{text}</p>
  );
}

// ---------------------------------------------------------------------------
// String inspector
// ---------------------------------------------------------------------------

function StringInspector({ keyName }: { keyName: string }) {
  const [value, setValue] = useState<string>("");
  const [length, setLength] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [edit, setEdit] = useState("");
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const v = await redisCommand({ cmd: "strings", op: "get", key: keyName });
    const l = await redisCommand({ cmd: "strings", op: "strlen", key: keyName });
    const val = (v as any)?.value ?? "";
    setValue(String(val));
    setLength(Number((l as any)?.length ?? 0));
    setEdit(String(val));
    setLoading(false);
  }, [keyName]);

  useEffect(() => {
    load();
  }, [load]);

  const save = async () => {
    setSaving(true);
    const res = await redisCommand({
      cmd: "strings",
      op: "set",
      key: keyName,
      value: edit,
    });
    setSaving(false);
    if (res.ok) {
      toast.success("String updated");
      load();
    } else {
      toast.error((res as any).error?.message ?? "Update failed");
    }
  };

  return (
    <div className="space-y-3">
      <CommandHint command={`GET ${quote(keyName)}`} />
      {loading ? (
        <Spinner label="Loading string…" />
      ) : (
        <>
          <div className="grid grid-cols-2 gap-2">
            <div className="rounded-md border border-border bg-card p-2">
              <div className="text-[11px] uppercase tracking-wide text-muted-foreground">
                Length (STRLEN)
              </div>
              <div className="font-mono text-sm">{length}</div>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="str-inspector-value">Value (GET)</Label>
            <textarea
              id="str-inspector-value"
              name="str-inspector-value"
              className="min-h-[80px] w-full rounded-md border border-input bg-background p-2 font-mono text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              value={value}
              readOnly
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="str-inspector-edit">Edit value (SET)</Label>
            <Input
              id="str-inspector-edit"
              value={edit}
              onChange={(e) => setEdit(e.target.value)}
              placeholder="new value"
            />
          </div>
          <CommandHint command={`SET ${quote(keyName)} ${quote(edit)}`} />
          <div className="flex justify-end">
            <Button onClick={save} disabled={saving} className="gap-2">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
              Save string
            </Button>
          </div>
        </>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Hash inspector (HSCAN — paginated, never HGETALL)
// ---------------------------------------------------------------------------

function HashInspector({ keyName }: { keyName: string }) {
  const [fields, setFields] = useState<[string, string][]>([]);
  const [cursor, setCursor] = useState(0);
  const [scanComplete, setScanComplete] = useState(false);
  const [fieldCount, setFieldCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [moreLoading, setMoreLoading] = useState(false);
  const [match, setMatch] = useState("");
  const [newField, setNewField] = useState("");
  const [newValue, setNewValue] = useState("");
  const [editingField, setEditingField] = useState<string | null>(null);
  const [editingValue, setEditingValue] = useState("");

  const fetchPage = useCallback(
    async (fromCursor: number, append: boolean) => {
      if (append) setMoreLoading(true);
      else setLoading(true);
      const res = await redisCommand({
        cmd: "hashes",
        op: "hscan",
        key: keyName,
        cursor: fromCursor,
        count: PAGE,
        match: match || undefined,
      });
      if (append) setMoreLoading(false);
      else setLoading(false);
      if (!res.ok) {
        toast.error((res as any).error?.message ?? "Load failed");
        return;
      }
      const f: Record<string, string> = (res as any).fields ?? {};
      setFields((prev) => {
        const map = new Map(append ? prev : []);
        Object.entries(f).forEach(([k, v]) => map.set(k, String(v)));
        return Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0]));
      });
      setCursor(Number((res as any).cursor ?? 0));
      setScanComplete(!!(res as any).scan_complete);
    },
    [keyName, match],
  );

  const loadCount = useCallback(async () => {
    const r = await redisCommand({ cmd: "hashes", op: "hlen", key: keyName });
    setFieldCount(Number((r as any)?.length ?? 0));
  }, [keyName]);

  useEffect(() => {
    fetchPage(0, false);
    loadCount();
  }, [fetchPage, loadCount]);

  const reload = () => {
    fetchPage(0, false);
    loadCount();
  };

  const addField = async () => {
    if (!newField) {
      toast.error("Field name required");
      return;
    }
    const res = await redisCommand({
      cmd: "hashes",
      op: "hset",
      key: keyName,
      field: newField,
      value: newValue,
    });
    if (res.ok) {
      toast.success("Field added");
      setNewField("");
      setNewValue("");
      reload();
    } else {
      toast.error((res as any).error?.message ?? "Add failed");
    }
  };

  const saveEdit = async () => {
    if (editingField == null) return;
    const res = await redisCommand({
      cmd: "hashes",
      op: "hset",
      key: keyName,
      field: editingField,
      value: editingValue,
    });
    if (res.ok) {
      toast.success("Field updated");
      setEditingField(null);
      setEditingValue("");
      reload();
    } else {
      toast.error((res as any).error?.message ?? "Update failed");
    }
  };

  const removeField = async (f: string) => {
    const res = await redisCommand({
      cmd: "hashes",
      op: "hdel",
      key: keyName,
      fields: [f],
    });
    if (res.ok) {
      toast.success("Field removed");
      reload();
    } else {
      toast.error((res as any).error?.message ?? "Remove failed");
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <CommandHint
          command={`HSCAN ${quote(keyName)} ${cursor} COUNT ${PAGE}${match ? ` MATCH ${quote(match)}` : ""}`}
        />
        <span className="shrink-0 text-xs text-muted-foreground">
          {fieldCount} fields (HLEN)
        </span>
      </div>

      <div className="flex gap-2">
        <Input
          id="hash-match"
          aria-label="Filter fields"
          placeholder="Filter fields (glob, e.g. f*)"
          value={match}
          onChange={(e) => setMatch(e.target.value)}
        />
        <Button variant="outline" onClick={() => fetchPage(0, false)} className="shrink-0">
          Filter
        </Button>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="hash-newfield">Add field (HSET)</Label>
        <div className="flex gap-2">
          <Input
            id="hash-newfield"
            placeholder="field"
            value={newField}
            onChange={(e) => setNewField(e.target.value)}
          />
          <Input
            aria-label="New field value"
            placeholder="value"
            value={newValue}
            onChange={(e) => setNewValue(e.target.value)}
          />
          <Button onClick={addField} className="shrink-0 gap-2">
            <Plus className="h-4 w-4" /> Add
          </Button>
        </div>
        {newField && (
          <CommandHint
            command={`HSET ${quote(keyName)} ${quote(newField)} ${quote(newValue)}`}
          />
        )}
      </div>

      {loading ? (
        <Spinner label="Scanning hash…" />
      ) : fields.length === 0 ? (
        <EmptyState text="No fields in this hash." />
      ) : (
        <div className="overflow-hidden rounded-md border border-border">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-left text-[11px] uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-2 py-1.5">Field</th>
                <th className="px-2 py-1.5">Value</th>
                <th className="w-px px-2 py-1.5"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {fields.map(([f, v]) => (
                <tr key={f} className="align-top">
                  <td className="break-all px-2 py-1.5 font-mono text-xs">{f}</td>
                  <td className="break-all px-2 py-1.5 font-mono text-xs">
                    {editingField === f ? (
                      <Input
                        aria-label={`Edit value for ${f}`}
                        value={editingValue}
                        onChange={(e) => setEditingValue(e.target.value)}
                        className="h-8 font-mono text-xs"
                      />
                    ) : (
                      v
                    )}
                  </td>
                  <td className="px-2 py-1.5">
                    <div className="flex gap-1">
                      {editingField === f ? (
                        <>
                          <Button size="sm" variant="outline" onClick={saveEdit}>
                            Save
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              setEditingField(null);
                              setEditingValue("");
                            }}
                          >
                            Cancel
                          </Button>
                        </>
                      ) : (
                        <>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              setEditingField(f);
                              setEditingValue(v);
                            }}
                          >
                            Edit
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-destructive"
                            onClick={() => removeField(f)}
                          >
                            Remove
                          </Button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {editingField && editingField !== newField && (
        <CommandHint
          command={`HSET ${quote(keyName)} ${quote(editingField)} ${quote(editingValue)}`}
        />
      )}

      {!scanComplete && fields.length > 0 && (
        <div className="flex justify-center">
          <Button
            variant="outline"
            onClick={() => fetchPage(cursor, true)}
            disabled={moreLoading}
            className="gap-2"
          >
            {moreLoading && <Loader2 className="h-4 w-4 animate-spin" />}
            Load more fields (HSCAN)
          </Button>
        </div>
      )}
      {scanComplete && fields.length > 0 && (
        <p className="text-center text-xs text-muted-foreground">
          HSCAN complete — all matching fields loaded.
        </p>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// List inspector (LRANGE — index-paginated)
// ---------------------------------------------------------------------------

function ListInspector({ keyName }: { keyName: string }) {
  const [items, setItems] = useState<{ index: number; value: string }[]>([]);
  const [length, setLength] = useState(0);
  const [start, setStart] = useState(0);
  const [loading, setLoading] = useState(true);
  const [pushValue, setPushValue] = useState("");

  const load = useCallback(
    async (fromStart: number) => {
      setLoading(true);
      const res = await redisCommand({
        cmd: "lists",
        op: "lrange",
        key: keyName,
        start: fromStart,
        stop: fromStart + PAGE - 1,
      });
      const arr: string[] = (res as any)?.items ?? [];
      setItems(arr.map((v, i) => ({ index: fromStart + i, value: String(v) })));
      setLoading(false);
      const lr = await redisCommand({ cmd: "lists", op: "llen", key: keyName });
      setLength(Number((lr as any)?.length ?? 0));
    },
    [keyName],
  );

  useEffect(() => {
    load(0);
    setStart(0);
  }, [load]);

  const go = (delta: number) => {
    const n = Math.max(0, start + delta * PAGE);
    setStart(n);
    load(n);
  };

  const push = async (op: "lpush" | "rpush") => {
    if (!pushValue) return;
    const res = await redisCommand({ cmd: "lists", op, key: keyName, value: pushValue });
    if (res.ok) {
      toast.success(op === "lpush" ? "Pushed left" : "Pushed right");
      setPushValue("");
      load(start);
    } else {
      toast.error((res as any).error?.message ?? "Push failed");
    }
  };

  const pop = async (op: "lpop" | "rpop") => {
    const res = await redisCommand({ cmd: "lists", op, key: keyName });
    if (res.ok) {
      const v = (res as any)?.value;
      toast.success(`${op.toUpperCase()} → ${v ?? "(empty)"}`);
      load(start);
    } else {
      toast.error((res as any).error?.message ?? "Pop failed");
    }
  };

  const showingFrom = length === 0 ? 0 : start + 1;
  const showingTo = Math.min(start + items.length, length);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <CommandHint
          command={`LRANGE ${quote(keyName)} ${start} ${start + PAGE - 1}`}
        />
        <span className="shrink-0 text-xs text-muted-foreground">
          {length} items (LLEN)
        </span>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button variant="outline" size="sm" onClick={() => pop("lpop")}>
          <ArrowUp className="h-4 w-4" /> LPOP
        </Button>
        <Button variant="outline" size="sm" onClick={() => pop("rpop")}>
          <ArrowDown className="h-4 w-4" /> RPOP
        </Button>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="list-push">Push value</Label>
        <div className="flex gap-2">
          <Input
            id="list-push"
            placeholder="value"
            value={pushValue}
            onChange={(e) => setPushValue(e.target.value)}
          />
          <Button variant="outline" onClick={() => push("lpush")} className="shrink-0 gap-2">
            <ArrowUp className="h-4 w-4" /> LPUSH
          </Button>
          <Button variant="outline" onClick={() => push("rpush")} className="shrink-0 gap-2">
            <ArrowDown className="h-4 w-4" /> RPUSH
          </Button>
        </div>
        {pushValue && (
          <CommandHint
            command={`LPUSH ${quote(keyName)} ${quote(pushValue)}  (or RPUSH ${quote(keyName)} ${quote(pushValue)})`}
          />
        )}
      </div>

      {loading ? (
        <Spinner label="Loading list range…" />
      ) : items.length === 0 ? (
        <EmptyState text="This list is empty." />
      ) : (
        <div className="overflow-hidden rounded-md border border-border">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-left text-[11px] uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="w-16 px-2 py-1.5">Index</th>
                <th className="px-2 py-1.5">Value</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {items.map((it) => (
                <tr key={it.index}>
                  <td className="px-2 py-1.5 font-mono text-xs text-muted-foreground">
                    {it.index}
                  </td>
                  <td className="break-all px-2 py-1.5 font-mono text-xs">{it.value}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground">
          {length === 0 ? "empty" : `Showing ${showingFrom}-${showingTo} of ${length}`}
        </span>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={start === 0 || loading}
            onClick={() => go(-1)}
            className="gap-1"
          >
            <ChevronLeft className="h-4 w-4" /> Prev
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={showingTo >= length || loading}
            onClick={() => go(1)}
            className="gap-1"
          >
            Next <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Set inspector (SSCAN — paginated, never SMEMBERS)
// ---------------------------------------------------------------------------

function SetInspector({ keyName }: { keyName: string }) {
  const [members, setMembers] = useState<string[]>([]);
  const [cursor, setCursor] = useState(0);
  const [scanComplete, setScanComplete] = useState(false);
  const [cardinality, setCardinality] = useState(0);
  const [loading, setLoading] = useState(true);
  const [moreLoading, setMoreLoading] = useState(false);
  const [match, setMatch] = useState("");
  const [newMember, setNewMember] = useState("");

  const fetchPage = useCallback(
    async (fromCursor: number, append: boolean) => {
      if (append) setMoreLoading(true);
      else setLoading(true);
      const res = await redisCommand({
        cmd: "sets",
        op: "sscan",
        key: keyName,
        cursor: fromCursor,
        count: PAGE,
        match: match || undefined,
      });
      if (append) setMoreLoading(false);
      else setLoading(false);
      if (!res.ok) {
        toast.error((res as any).error?.message ?? "Load failed");
        return;
      }
      const m: string[] = (res as any).members ?? [];
      setMembers((prev) =>
        append ? Array.from(new Set([...prev, ...m])) : Array.from(new Set(m)),
      );
      setCursor(Number((res as any).cursor ?? 0));
      setScanComplete(!!(res as any).scan_complete);
    },
    [keyName, match],
  );

  const loadCard = useCallback(async () => {
    const r = await redisCommand({ cmd: "sets", op: "scard", key: keyName });
    setCardinality(Number((r as any)?.cardinality ?? 0));
  }, [keyName]);

  useEffect(() => {
    fetchPage(0, false);
    loadCard();
  }, [fetchPage, loadCard]);

  const reload = () => {
    fetchPage(0, false);
    loadCard();
  };

  const addMember = async () => {
    if (!newMember) return;
    const res = await redisCommand({
      cmd: "sets",
      op: "sadd",
      key: keyName,
      members: [newMember],
    });
    if (res.ok) {
      toast.success("Member added");
      setNewMember("");
      reload();
    } else {
      toast.error((res as any).error?.message ?? "Add failed");
    }
  };

  const removeMember = async (m: string) => {
    const res = await redisCommand({
      cmd: "sets",
      op: "srem",
      key: keyName,
      members: [m],
    });
    if (res.ok) {
      toast.success("Member removed");
      reload();
    } else {
      toast.error((res as any).error?.message ?? "Remove failed");
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <CommandHint
          command={`SSCAN ${quote(keyName)} ${cursor} COUNT ${PAGE}${match ? ` MATCH ${quote(match)}` : ""}`}
        />
        <span className="shrink-0 text-xs text-muted-foreground">
          {cardinality} members (SCARD)
        </span>
      </div>

      <div className="flex gap-2">
        <Input
          id="set-match"
          aria-label="Filter members"
          placeholder="Filter members (glob)"
          value={match}
          onChange={(e) => setMatch(e.target.value)}
        />
        <Button variant="outline" onClick={() => fetchPage(0, false)} className="shrink-0">
          Filter
        </Button>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="set-newmember">Add member (SADD)</Label>
        <div className="flex gap-2">
          <Input
            id="set-newmember"
            placeholder="member"
            value={newMember}
            onChange={(e) => setNewMember(e.target.value)}
          />
          <Button onClick={addMember} className="shrink-0 gap-2">
            <Plus className="h-4 w-4" /> Add
          </Button>
        </div>
        {newMember && (
          <CommandHint command={`SADD ${quote(keyName)} ${quote(newMember)}`} />
        )}
      </div>

      {loading ? (
        <Spinner label="Scanning set…" />
      ) : members.length === 0 ? (
        <EmptyState text="This set has no members." />
      ) : (
        <ul className="divide-y divide-border overflow-hidden rounded-md border border-border">
          {members.map((m) => (
            <li key={m} className="flex items-center justify-between gap-2 px-2 py-1.5">
              <span className="break-all font-mono text-xs">{m}</span>
              <Button
                size="sm"
                variant="ghost"
                className="shrink-0 text-destructive"
                onClick={() => removeMember(m)}
              >
                Remove
              </Button>
            </li>
          ))}
        </ul>
      )}

      {!scanComplete && members.length > 0 && (
        <div className="flex justify-center">
          <Button
            variant="outline"
            onClick={() => fetchPage(cursor, true)}
            disabled={moreLoading}
            className="gap-2"
          >
            {moreLoading && <Loader2 className="h-4 w-4 animate-spin" />}
            Load more members (SSCAN)
          </Button>
        </div>
      )}
      {scanComplete && members.length > 0 && (
        <p className="text-center text-xs text-muted-foreground">
          SSCAN complete — all matching members loaded.
        </p>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sorted set inspector (ZRANGE — index-paginated with scores/ranks)
// ---------------------------------------------------------------------------

function SortedSetInspector({ keyName }: { keyName: string }) {
  const [members, setMembers] = useState<{ rank: number; member: string; score: number }[]>([]);
  const [cardinality, setCardinality] = useState(0);
  const [start, setStart] = useState(0);
  const [loading, setLoading] = useState(true);
  const [newMember, setNewMember] = useState("");
  const [newScore, setNewScore] = useState("0");

  const load = useCallback(
    async (fromStart: number) => {
      setLoading(true);
      const res = await redisCommand({
        cmd: "sorted-sets",
        op: "zrange",
        key: keyName,
        start: fromStart,
        stop: fromStart + PAGE - 1,
        withscores: true,
      });
      const arr: { member: string; score: number }[] = (res as any)?.members ?? [];
      setMembers(
        arr.map((m, i) => ({
          rank: fromStart + i,
          member: String(m.member),
          score: Number(m.score),
        })),
      );
      setLoading(false);
      const cr = await redisCommand({ cmd: "sorted-sets", op: "zcard", key: keyName });
      setCardinality(Number((cr as any)?.cardinality ?? 0));
    },
    [keyName],
  );

  useEffect(() => {
    load(0);
    setStart(0);
  }, [load]);

  const go = (delta: number) => {
    const n = Math.max(0, start + delta * PAGE);
    setStart(n);
    load(n);
  };

  const addOrUpdate = async () => {
    if (!newMember) {
      toast.error("Member required");
      return;
    }
    const res = await redisCommand({
      cmd: "sorted-sets",
      op: "zadd",
      key: keyName,
      member: newMember,
      score: Number(newScore),
    });
    if (res.ok) {
      toast.success("Member added/updated");
      setNewMember("");
      setNewScore("0");
      load(start);
    } else {
      toast.error((res as any).error?.message ?? "Update failed");
    }
  };

  const removeMember = async (m: string) => {
    const res = await redisCommand({
      cmd: "sorted-sets",
      op: "zrem",
      key: keyName,
      member: m,
    });
    if (res.ok) {
      toast.success("Member removed");
      load(start);
    } else {
      toast.error((res as any).error?.message ?? "Remove failed");
    }
  };

  const showingFrom = cardinality === 0 ? 0 : start + 1;
  const showingTo = Math.min(start + members.length, cardinality);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <CommandHint
          command={`ZRANGE ${quote(keyName)} ${start} ${start + PAGE - 1} WITHSCORES`}
        />
        <span className="shrink-0 text-xs text-muted-foreground">
          {cardinality} members (ZCARD)
        </span>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="zset-newmember">Add / update member (ZADD)</Label>
        <div className="flex gap-2">
          <Input
            id="zset-newmember"
            placeholder="member"
            value={newMember}
            onChange={(e) => setNewMember(e.target.value)}
          />
          <Input
            aria-label="Member score"
            type="number"
            placeholder="score"
            value={newScore}
            onChange={(e) => setNewScore(e.target.value)}
            className="w-32"
          />
          <Button onClick={addOrUpdate} className="shrink-0 gap-2">
            <Plus className="h-4 w-4" /> Add
          </Button>
        </div>
        {newMember && (
          <CommandHint
            command={`ZADD ${quote(keyName)} ${newScore || "0"} ${quote(newMember)}`}
          />
        )}
      </div>

      {loading ? (
        <Spinner label="Loading sorted set range…" />
      ) : members.length === 0 ? (
        <EmptyState text="This sorted set is empty." />
      ) : (
        <div className="overflow-hidden rounded-md border border-border">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-left text-[11px] uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="w-16 px-2 py-1.5">Rank</th>
                <th className="px-2 py-1.5">Member</th>
                <th className="w-24 px-2 py-1.5">Score</th>
                <th className="w-px px-2 py-1.5"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {members.map((m) => (
                <tr key={m.member}>
                  <td className="px-2 py-1.5 font-mono text-xs text-muted-foreground">
                    {m.rank}
                  </td>
                  <td className="break-all px-2 py-1.5 font-mono text-xs">{m.member}</td>
                  <td className="px-2 py-1.5 font-mono text-xs">{m.score}</td>
                  <td className="px-2 py-1.5">
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-destructive"
                      onClick={() => removeMember(m.member)}
                    >
                      Remove
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground">
          {cardinality === 0 ? "empty" : `Showing ${showingFrom}-${showingTo} of ${cardinality}`}
        </span>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={start === 0 || loading}
            onClick={() => go(-1)}
            className="gap-1"
          >
            <ChevronLeft className="h-4 w-4" /> Prev
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={showingTo >= cardinality || loading}
            onClick={() => go(1)}
            className="gap-1"
          >
            Next <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Stream inspector (XRANGE — count-bounded)
// ---------------------------------------------------------------------------

function StreamInspector({ keyName }: { keyName: string }) {
  const [entries, setEntries] = useState<{ id: string; fields: Record<string, string> }[]>([]);
  const [length, setLength] = useState(0);
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(false);
  const [lastId, setLastId] = useState("");
  const [newFields, setNewFields] = useState("");

  const loadFirst = useCallback(async () => {
    setLoading(true);
    const res = await redisCommand({
      cmd: "streams",
      op: "xrange",
      key: keyName,
      min: "-",
      max: "+",
      count: PAGE,
    });
    setLoading(false);
    if (!res.ok) {
      toast.error((res as any).error?.message ?? "Load failed");
      return;
    }
    const e: { id: string; fields: Record<string, string> }[] = (res as any).entries ?? [];
    setEntries(e.map((x) => ({ id: String(x.id), fields: x.fields ?? {} })));
    setHasMore(e.length === PAGE);
    setLastId(e.length ? String(e[e.length - 1].id) : "");
    const lr = await redisCommand({ cmd: "streams", op: "xlen", key: keyName });
    setLength(Number((lr as any)?.length ?? 0));
  }, [keyName]);

  useEffect(() => {
    loadFirst();
  }, [loadFirst]);

  const loadMore = async () => {
    if (!lastId) return;
    const res = await redisCommand({
      cmd: "streams",
      op: "xrange",
      key: keyName,
      min: `(${lastId}`,
      max: "+",
      count: PAGE,
    });
    if (!res.ok) {
      toast.error((res as any).error?.message ?? "Load failed");
      return;
    }
    const e: { id: string; fields: Record<string, string> }[] = (res as any).entries ?? [];
    setEntries((prev) => [
      ...prev,
      ...e.map((x) => ({ id: String(x.id), fields: x.fields ?? {} })),
    ]);
    setHasMore(e.length === PAGE);
    if (e.length) setLastId(String(e[e.length - 1].id));
  };

  const addEntry = async () => {
    let fields: Record<string, string> = {};
    try {
      const parsed = JSON.parse(newFields || "{}");
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        for (const k of Object.keys(parsed)) fields[k] = String(parsed[k]);
      } else {
        toast.error("Fields must be a JSON object, e.g. {\"field\":\"value\"}");
        return;
      }
    } catch {
      toast.error("Invalid JSON for stream fields");
      return;
    }
    if (Object.keys(fields).length === 0) {
      toast.error("Add at least one field");
      return;
    }
    const res = await redisCommand({
      cmd: "streams",
      op: "xadd",
      key: keyName,
      id: "*",
      fields,
    });
    if (res.ok) {
      toast.success("Entry added");
      setNewFields("");
      loadFirst();
    } else {
      toast.error((res as any).error?.message ?? "Add failed");
    }
  };

  const fieldsCmd = (f: Record<string, string>) =>
    Object.entries(f)
      .map(([k, v]) => `${quote(k)} ${quote(v)}`)
      .join(" ");

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <CommandHint command={`XRANGE ${quote(keyName)} - + COUNT ${PAGE}`} />
        <span className="shrink-0 text-xs text-muted-foreground">
          {length} entries (XLEN)
        </span>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="stream-fields">Add entry (XADD)</Label>
        <div className="flex gap-2">
          <Input
            id="stream-fields"
            placeholder='{"field":"value"}'
            value={newFields}
            onChange={(e) => setNewFields(e.target.value)}
            className="font-mono text-xs"
          />
          <Button onClick={addEntry} className="shrink-0 gap-2">
            <Plus className="h-4 w-4" /> Add
          </Button>
        </div>
        {newFields && (
          <CommandHint
            command={`XADD ${quote(keyName)} * ${fieldsCmd(
              (() => {
                try {
                  const p = JSON.parse(newFields || "{}");
                  return p && typeof p === "object" ? p : {};
                } catch {
                  return {};
                }
              })(),
            )}`}
          />
        )}
      </div>

      {loading ? (
        <Spinner label="Loading stream range…" />
      ) : entries.length === 0 ? (
        <EmptyState text="This stream is empty." />
      ) : (
        <div className="space-y-2">
          {entries.map((e) => (
            <div key={e.id} className="rounded-md border border-border p-2">
              <div className="font-mono text-xs font-semibold text-foreground">{e.id}</div>
              <pre className="mt-1 whitespace-pre-wrap break-all font-mono text-xs text-muted-foreground">
                {JSON.stringify(e.fields, null, 0)}
              </pre>
            </div>
          ))}
        </div>
      )}

      {hasMore && !loading && (
        <div className="flex justify-center">
          <Button variant="outline" onClick={loadMore} className="gap-2">
            Load more entries (XRANGE)
          </Button>
        </div>
      )}
      {!hasMore && entries.length > 0 && (
        <p className="text-center text-xs text-muted-foreground">
          End of stream reached.
        </p>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// KeyInspector — header (type, TTL, delete) + type-specific body
// ---------------------------------------------------------------------------

export function KeyInspector({ keyName, onDeleted, onMetaChanged }: KeyInspectorProps) {
  const [type, setType] = useState<string>("none");
  const [ttl, setTtl] = useState<number>(-1);
  const [metaLoading, setMetaLoading] = useState(true);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const loadMeta = useCallback(async () => {
    setMetaLoading(true);
    const t = await redisCommand({ cmd: "keys", op: "type", key: keyName });
    setType((t as any)?.type ?? "none");
    const tl = await redisCommand({ cmd: "ttl", op: "ttl", key: keyName });
    setTtl(Number((tl as any)?.ttl ?? -1));
    setMetaLoading(false);
  }, [keyName]);

  useEffect(() => {
    loadMeta();
  }, [loadMeta]);

  const refreshKey = () => {
    loadMeta();
    onMetaChanged();
  };

  const doDelete = async () => {
    setDeleting(true);
    const res = await redisCommand({ cmd: "keys", op: "del", key: keyName });
    setDeleting(false);
    setDeleteOpen(false);
    if (res.ok) {
      toast.success(`Deleted key "${keyName}"`);
      onDeleted();
    } else {
      toast.error((res as any).error?.message ?? "Delete failed");
    }
  };

  return (
    <div className="flex h-full flex-col overflow-hidden rounded-lg border border-border bg-card">
      <div className="border-b border-border p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
              Selected key
            </div>
            <div className="break-all font-mono text-sm font-semibold">{keyName}</div>
            <div className="mt-1.5 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              {metaLoading ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <>
                  <TypeBadge type={type} />
                  <span>·</span>
                  <span>TTL: {ttlText(ttl)}</span>
                </>
              )}
            </div>
          </div>
          <div className="flex shrink-0 gap-1">
            <Button
              variant="ghost"
              size="icon"
              aria-label="Refresh key"
              onClick={refreshKey}
            >
              <RefreshCw className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              aria-label="Delete key"
              className="text-destructive"
              onClick={() => setDeleteOpen(true)}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-4">
        {metaLoading ? (
          <Spinner label="Detecting key type…" />
        ) : type === "none" ? (
          <EmptyState text="This key no longer exists." />
        ) : (
          <>
            {type === "string" && <StringInspector keyName={keyName} />}
            {type === "hash" && <HashInspector keyName={keyName} />}
            {type === "list" && <ListInspector keyName={keyName} />}
            {type === "set" && <SetInspector keyName={keyName} />}
            {type === "zset" && <SortedSetInspector keyName={keyName} />}
            {type === "stream" && <StreamInspector keyName={keyName} />}
            {!["string", "hash", "list", "set", "zset", "stream"].includes(type) && (
              <EmptyState text={`Unsupported key type: ${type}`} />
            )}
          </>
        )}
      </div>

      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete key?</DialogTitle>
            <DialogDescription>
              This runs <code className="font-mono">DEL {quote(keyName)}</code> and
              removes the key and all its values permanently.
            </DialogDescription>
          </DialogHeader>
          <div className="rounded-md border border-border bg-muted/40 p-2 font-mono text-xs">
            DEL {quote(keyName)}
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Cancel</Button>
            </DialogClose>
            <Button variant="destructive" onClick={doDelete} disabled={deleting} className="gap-2">
              {deleting && <Loader2 className="h-4 w-4 animate-spin" />}
              Delete key
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

