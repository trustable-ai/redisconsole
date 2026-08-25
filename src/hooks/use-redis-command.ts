import { useState } from "react";
import { redisCommand, type RedisResponse } from "@/lib/api";

interface CommandState {
  loading: boolean;
  result: RedisResponse | null;
  error: string | null;
}

/**
 * Shared hook that every section page uses to run a Redis operation and
 * surface loading / result / error state to a single OutputPanel.
 */
export function useRedisCommand() {
  const [state, setState] = useState<CommandState>({
    loading: false,
    result: null,
    error: null,
  });

  const run = async (payload: Record<string, unknown>) => {
    setState({ loading: true, result: null, error: null });
    try {
      const result = await redisCommand(payload);
      setState({ loading: false, result, error: null });
      return result;
    } catch (e: any) {
      setState({ loading: false, result: null, error: e?.message ?? "Request failed" });
      return { ok: false, error: e?.message ?? "Request failed" };
    }
  };

  return { ...state, run };
}