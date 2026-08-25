/**
 * Shared helpers for the interactive Redis Laboratories.
 *
 * Each laboratory is a self-contained component with independent state. These
 * helpers build human-readable Redis command strings (with parameter
 * highlighting) and run commands through the existing /api/my/v1/console
 * endpoint, capturing optional "before" / "after" snapshots for visualization.
 */

import { redisCommand, type RedisResponse } from "@/lib/api";

export interface DemoKind {
  cmd: string;
  kind: string;
}

/**
 * Quote a Redis argument for the human-readable command display, following
 * the redis-cli convention: simple tokens need no quotes; values containing
 * spaces or special characters are double-quoted.
 */
export function quoteArg(value: unknown): string {
  if (value === null || value === undefined) return "";
  const s = String(value);
  if (s === "") return '""';
  if (/^[\w.:+/-]+$/.test(s)) return s;
  return `"${s.replace(/"/g, '\\"')}"`;
}

/** Join command tokens into a single display line. */
export function formatCommand(tokens: (string | number | undefined | null)[]): string {
  return tokens
    .filter((t) => t !== undefined && t !== null && t !== "")
    .map((t) => quoteArg(t))
    .join(" ");
}

/**
 * Run a lab command. `payload` is sent to /api/my/v1/console. When
 * `before`/`after` payloads are provided they are run (read ops) to capture a
 * before/after snapshot for visualization; failures there are non-fatal.
 */
export interface LabRunResult {
  result: RedisResponse;
  before: RedisResponse | null;
  after: RedisResponse | null;
}

export async function runLabCommand(
  payload: Record<string, unknown>,
  opts: {
    before?: Record<string, unknown>;
    after?: Record<string, unknown>;
  } = {},
): Promise<LabRunResult> {
  let before: RedisResponse | null = null;
  if (opts.before) {
    try {
      before = await redisCommand(opts.before);
    } catch {
      before = { ok: false, error: "before-snapshot failed" };
    }
  }
  const result = await redisCommand(payload);
  let after: RedisResponse | null = null;
  if (opts.after) {
    try {
      after = await redisCommand(opts.after);
    } catch {
      after = { ok: false, error: "after-snapshot failed" };
    }
  }
  return { result, before, after };
}

/** Seed disposable demo data for a structure kind. */
export function seedDemoPayload(kind: string): Record<string, unknown> {
  return { cmd: "demo", op: "seed", kind };
}

/** Delete every key under the redis-console:demo: namespace (within prefix). */
export function cleanDemoPayload(): Record<string, unknown> {
  return { cmd: "demo", op: "clean" };
}

/** List existing demo keys. */
export function scanDemoPayload(): Record<string, unknown> {
  return { cmd: "demo", op: "scan" };
}

/** Build a demo-key name under the redis-console:demo: namespace. */
export function demoKey(suffix: string): string {
  const s = String(suffix).replace(/^\/+/, "");
  return `redis-console:demo:${s}`;
}

/** The shared demo namespace prefix (shown in the UI for clarity). */
export const DEMO_NAMESPACE = "redis-console:demo:";