import { useState, useCallback } from "react";
import { runLabCommand, type LabRunResult } from "@/lib/labs";
import { redisCommand, type RedisResponse } from "@/lib/api";
import { toast } from "sonner";

interface LabState {
  loading: boolean;
  result: RedisResponse | null;
  before: RedisResponse | null;
  after: RedisResponse | null;
  error: string | null;
}

/**
 * Shared execution hook for the interactive laboratories. Each lab uses its
 * own instance, so state stays independent between sections. Returns a `run`
 * that takes the command payload plus optional before/after snapshot payloads.
 */
export function useLabExecution() {
  const [state, setState] = useState<LabState>({
    loading: false,
    result: null,
    before: null,
    after: null,
    error: null,
  });

  const run = useCallback(
    async (
      payload: Record<string, unknown>,
      opts?: { before?: Record<string, unknown>; after?: Record<string, unknown> },
    ): Promise<LabRunResult | null> => {
      setState((s) => ({ ...s, loading: true, error: null }));
      try {
        const out = await runLabCommand(payload, opts);
        setState({
          loading: false,
          result: out.result,
          before: out.before,
          after: out.after,
          error: null,
        });
        return out;
      } catch (e: any) {
        const msg = e?.message ?? "Request failed";
        setState({
          loading: false,
          result: null,
          before: null,
          after: null,
          error: msg,
        });
        toast.error(msg);
        return null;
      }
    },
    [],
  );

  const clear = useCallback(() => {
    setState({
      loading: false,
      result: null,
      before: null,
      after: null,
      error: null,
    });
  }, []);

  return { ...state, run, clear };
}

/**
 * Small hook for the "Create example data" / "Delete demo data" buttons.
 * It keeps its own busy state and can seed / clean demo data and refresh a
 * scan of existing demo keys.
 */
export function useDemoData(onChanged?: () => void) {
  const [seeding, setSeeding] = useState<string | null>(null);
  const [demoKeys, setDemoKeys] = useState<string[] | null>(null);

  const seed = useCallback(
    async (kind: string): Promise<boolean> => {
      setSeeding(kind);
      try {
        const res = await redisCommand({ cmd: "demo", op: "seed", kind });
        if (res?.ok === false) {
          toast.error(res.error ? String(res.error) : "Seed failed");
          return false;
        }
        toast.success(`Demo ${kind} data created`);
        onChanged?.();
        return true;
      } catch (e: any) {
        toast.error(e?.message ?? "Seed failed");
        return false;
      } finally {
        setSeeding(null);
      }
    },
    [onChanged],
  );

  const clean = useCallback(async (): Promise<boolean> => {
    setSeeding("clean");
    try {
      const res = await redisCommand({ cmd: "demo", op: "clean" });
      if (res?.ok === false) {
        toast.error(res.error ? String(res.error) : "Clean failed");
        return false;
      }
      toast.success("Demo data deleted");
      setDemoKeys([]);
      onChanged?.();
      return true;
    } catch (e: any) {
      toast.error(e?.message ?? "Clean failed");
      return false;
    } finally {
      setSeeding(null);
    }
  }, [onChanged]);

  const scan = useCallback(async () => {
    try {
      const res = await redisCommand({ cmd: "demo", op: "scan" });
      if (res?.ok !== false && Array.isArray((res as any).keys)) {
        setDemoKeys((res as any).keys as string[]);
      }
      return res;
    } catch (e: any) {
      toast.error(e?.message ?? "Scan failed");
      return null;
    }
  }, []);

  return { seeding, demoKeys, seed, clean, scan };
}