/**
 * API helper for the Redis Console backend action.
 *
 * The OpenServerless generated wrapper nests the module return value under
 * {"body": ...}, so responses are unwrapped here. Frontend code always uses
 * relative /api/my/... URLs so the browser keeps its origin.
 */

export interface RedisResponse {
  ok: boolean;
  error?: string;
  [key: string]: unknown;
}

export async function redisCommand(payload: Record<string, unknown>): Promise<RedisResponse> {
  const res = await fetch("/api/my/v1/console", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  let raw: unknown = null;
  const text = await res.text();
  if (text) {
    try {
      raw = JSON.parse(text);
    } catch {
      raw = { error: text };
    }
  }

  const data: any =
    raw && typeof raw === "object" && "body" in (raw as object)
      ? (raw as { body: any }).body
      : raw;

  return (data ?? { ok: false, error: "Empty response" }) as RedisResponse;
}