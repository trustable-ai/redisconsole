import {
  LayoutDashboard,
  Key,
  Type,
  Hash,
  List,
  Boxes,
  BarChart3,
  Waves,
  Radio,
  Clock,
  GitBranch,
  Terminal,
  type LucideIcon,
} from "lucide-react";

export interface SectionDef {
  id: string;
  label: string;
  path: string;
  icon: LucideIcon;
  description: string;
}

export const SECTIONS: SectionDef[] = [
  {
    id: "overview",
    label: "Overview",
    path: "/overview",
    icon: LayoutDashboard,
    description: "Redis connection status, server info, and quick stats.",
  },
  {
    id: "keys",
    label: "Keys",
    path: "/keys",
    icon: Key,
    description: "Scan keys with a cursor, inspect any key by type, and delete keys — every visual operation shows its Redis command.",
  },
  {
    id: "strings",
    label: "Strings",
    path: "/strings",
    icon: Type,
    description: "SET, GET, INCR, APPEND and other string commands.",
  },
  {
    id: "hashes",
    label: "Hashes",
    path: "/hashes",
    icon: Hash,
    description: "HSET, HGET, HGETALL — field/value maps stored at a key.",
  },
  {
    id: "lists",
    label: "Lists",
    path: "/lists",
    icon: List,
    description: "LPUSH/RPUSH, LPOP/RPOP, LRANGE — linked lists.",
  },
  {
    id: "sets",
    label: "Sets",
    path: "/sets",
    icon: Boxes,
    description: "SADD, SREM, SMEMBERS — unordered unique collections.",
  },
  {
    id: "sorted-sets",
    label: "Sorted Sets",
    path: "/sorted-sets",
    icon: BarChart3,
    description: "ZADD, ZRANGE, ZRANGEBYSCORE — scored, ordered members.",
  },
  {
    id: "streams",
    label: "Streams",
    path: "/streams",
    icon: Waves,
    description: "XADD, XRANGE, XLEN — append-only log entries.",
  },
  {
    id: "pub-sub",
    label: "Pub/Sub",
    path: "/pub-sub",
    icon: Radio,
    description: "PUBLISH messages and list active channels.",
  },
  {
    id: "ttl",
    label: "TTL",
    path: "/ttl",
    icon: Clock,
    description: "EXPIRE, PERSIST, TTL — key expiration management.",
  },
  {
    id: "transactions",
    label: "Transactions",
    path: "/transactions",
    icon: GitBranch,
    description: "Run a sequence of commands atomically via MULTI/EXEC.",
  },
  {
    id: "raw",
    label: "Raw Commands",
    path: "/raw",
    icon: Terminal,
    description: "Execute arbitrary Redis commands directly.",
  },
];

export const SECTION_MAP: Record<string, SectionDef> = Object.fromEntries(
  SECTIONS.map((s) => [s.id, s]),
);