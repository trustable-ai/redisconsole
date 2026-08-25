import { RedisConsole } from "@/components/RedisConsole";

/**
 * Raw Commands section — a terminal-like Redis console.
 *
 * The actual terminal UI (history, Up/Down navigation, multiline output,
 * execution duration, errors, clear) lives in <RedisConsole>. This page just
 * mounts it inside the section layout so it shares the sidebar/routing of the
 * rest of the console.
 */
export default function RawPage() {
  return <RedisConsole />;
}