/**
 * Educational Redis command reference.
 *
 * A static, curated dataset powering the Reference section. Each entry lists
 * the command name, a short description, the canonical syntax, an argument
 * explanation, and a worked example. Grouped by category so the UI can filter.
 *
 * This is reference-only data; it never talks to Redis. Examples use the
 * `redis-console:demo:` namespace where a key is shown, matching the
 * interactive laboratories.
 */

export type RedisCategory =
  | "Generic"
  | "String"
  | "Hash"
  | "List"
  | "Set"
  | "Sorted Set"
  | "Stream"
  | "Pub/Sub"
  | "Transactions"
  | "Server";

export interface ArgDoc {
  /** Argument token as it appears in the syntax, e.g. "key" or "[EX seconds]". */
  token: string;
  /** Human explanation of what this argument does. */
  desc: string;
  /** Whether this argument is optional. */
  optional?: boolean;
}

export interface CommandDoc {
  command: string;
  category: RedisCategory;
  description: string;
  syntax: string;
  args: ArgDoc[];
  example: string;
  /** What the example returns, shown as the example output. */
  exampleOutput?: string;
}

export const CATEGORIES: RedisCategory[] = [
  "Generic",
  "String",
  "Hash",
  "List",
  "Set",
  "Sorted Set",
  "Stream",
  "Pub/Sub",
  "Transactions",
  "Server",
];

export const COMMANDS: CommandDoc[] = [
  // ---------------------------------------------------------------- Generic
  {
    command: "DEL",
    category: "Generic",
    description: "Delete one or more keys. Returns the number of keys removed.",
    syntax: "DEL key [key ...]",
    args: [
      { token: "key", desc: "A key to delete. Multiple keys may be given." },
    ],
    example: 'DEL "redis-console:demo:strings:counter"',
    exampleOutput: "(integer) 1",
  },
  {
    command: "EXISTS",
    category: "Generic",
    description: "Return the number of the given keys that exist.",
    syntax: "EXISTS key [key ...]",
    args: [{ token: "key", desc: "A key to test for existence." }],
    example: 'EXISTS "redis-console:demo:strings:counter"',
    exampleOutput: "(integer) 1",
  },
  {
    command: "EXPIRE",
    category: "Generic",
    description: "Set a timeout (in seconds) on a key. Returns 1 if set, 0 if the key does not exist.",
    syntax: "EXPIRE key seconds [NX | XX | GT | LT]",
    args: [
      { token: "key", desc: "The key to expire." },
      { token: "seconds", desc: "Time-to-live in seconds." },
      { token: "NX", desc: "Only set when the key has no expiry.", optional: true },
      { token: "XX", desc: "Only set when the key already has an expiry.", optional: true },
      { token: "GT", desc: "Only set when the new TTL is greater than the current one.", optional: true },
      { token: "LT", desc: "Only set when the new TTL is less than the current one.", optional: true },
    ],
    example: 'EXPIRE "redis-console:demo:ttl:session" 60',
    exampleOutput: "(integer) 1",
  },
  {
    command: "TTL",
    category: "Generic",
    description: "Return the remaining time-to-live in seconds, -1 if the key has no expiry, -2 if the key does not exist.",
    syntax: "TTL key",
    args: [{ token: "key", desc: "The key to inspect." }],
    example: 'TTL "redis-console:demo:ttl:session"',
    exampleOutput: "(integer) 58",
  },
  {
    command: "PERSIST",
    category: "Generic",
    description: "Remove the expiry from a key. Returns 1 if the expiry was removed, 0 otherwise.",
    syntax: "PERSIST key",
    args: [{ token: "key", desc: "The key whose expiry to remove." }],
    example: 'PERSIST "redis-console:demo:ttl:session"',
    exampleOutput: "(integer) 1",
  },
  {
    command: "TYPE",
    category: "Generic",
    description: "Return the string representation of the type of the value stored at a key.",
    syntax: "TYPE key",
    args: [{ token: "key", desc: "The key to inspect." }],
    example: 'TYPE "redis-console:demo:strings:counter"',
    exampleOutput: "string",
  },
  {
    command: "RENAME",
    category: "Generic",
    description: "Rename a key. Overwrites the destination if it already exists.",
    syntax: "RENAME key newkey",
    args: [
      { token: "key", desc: "The source key." },
      { token: "newkey", desc: "The destination key name." },
    ],
    example: 'RENAME "redis-console:demo:strings:counter" "redis-console:demo:strings:hits"',
    exampleOutput: "OK",
  },
  {
    command: "SCAN",
    category: "Generic",
    description: "Cursor-based iteration over the keyspace. Avoids blocking the server the way KEYS would.",
    syntax: "SCAN cursor [MATCH pattern] [COUNT count] [TYPE type]",
    args: [
      { token: "cursor", desc: "Iteration cursor (start at 0)." },
      { token: "MATCH pattern", desc: "Glob pattern to filter keys.", optional: true },
      { token: "COUNT count", desc: "Hint for the number of elements per batch.", optional: true },
      { token: "TYPE type", desc: "Filter by value type (string, hash, list, set, zset, stream).", optional: true },
    ],
    example: 'SCAN 0 MATCH "redis-console:demo:*" COUNT 100',
    exampleOutput: '1) "42"\n2) 1) "redis-console:demo:strings:counter"\n   2) "redis-console:demo:hashes:user:1"',
  },
  {
    command: "RANDOMKEY",
    category: "Generic",
    description: "Return a random key from the current database, or nil if the database is empty.",
    syntax: "RANDOMKEY",
    args: [],
    example: "RANDOMKEY",
    exampleOutput: '"redis-console:demo:strings:counter"',
  },

  // ----------------------------------------------------------------- String
  {
    command: "SET",
    category: "String",
    description: "Set a string value at a key, with optional expiry and conditional flags.",
    syntax: "SET key value [EX seconds | PX ms | KEEPTTL] [NX | XX]",
    args: [
      { token: "key", desc: "The key to set." },
      { token: "value", desc: "The string value to store." },
      { token: "EX seconds", desc: "Expire after this many seconds.", optional: true },
      { token: "PX ms", desc: "Expire after this many milliseconds.", optional: true },
      { token: "KEEPTTL", desc: "Retain the existing TTL of the key.", optional: true },
      { token: "NX", desc: "Only set if the key does not exist.", optional: true },
      { token: "XX", desc: "Only set if the key already exists.", optional: true },
    ],
    example: 'SET "redis-console:demo:strings:greeting" "Hello, Redis!"',
    exampleOutput: "OK",
  },
  {
    command: "GET",
    category: "String",
    description: "Return the string value at a key, or nil if the key does not exist.",
    syntax: "GET key",
    args: [{ token: "key", desc: "The key to read." }],
    example: 'GET "redis-console:demo:strings:greeting"',
    exampleOutput: '"Hello, Redis!"',
  },
  {
    command: "INCR",
    category: "String",
    description: "Atomically increment the integer stored at a key by 1. Creates the key at 0 if missing.",
    syntax: "INCR key",
    args: [{ token: "key", desc: "The key holding the integer to increment." }],
    example: 'INCR "redis-console:demo:strings:counter"',
    exampleOutput: "(integer) 1",
  },
  {
    command: "INCRBY",
    category: "String",
    description: "Increment the integer at a key by the given amount.",
    syntax: "INCRBY key increment",
    args: [
      { token: "key", desc: "The key to increment." },
      { token: "increment", desc: "The integer amount to add (may be negative)." },
    ],
    example: 'INCRBY "redis-console:demo:strings:counter" 10',
    exampleOutput: "(integer) 11",
  },
  {
    command: "APPEND",
    category: "String",
    description: "Append a value to the string at a key. Returns the new length.",
    syntax: "APPEND key value",
    args: [
      { token: "key", desc: "The key to append to." },
      { token: "value", desc: "The value to append." },
    ],
    example: 'APPEND "redis-console:demo:strings:greeting" "!!!"',
    exampleOutput: "(integer) 15",
  },
  {
    command: "STRLEN",
    category: "String",
    description: "Return the length of the string stored at a key.",
    syntax: "STRLEN key",
    args: [{ token: "key", desc: "The key to measure." }],
    example: 'STRLEN "redis-console:demo:strings:greeting"',
    exampleOutput: "(integer) 12",
  },
  {
    command: "MSET",
    category: "String",
    description: "Set multiple key/value pairs atomically.",
    syntax: "MSET key value [key value ...]",
    args: [
      { token: "key value", desc: "Alternating key/value pairs." },
    ],
    example: 'MSET "redis-console:demo:strings:a" "1" "redis-console:demo:strings:b" "2"',
    exampleOutput: "OK",
  },
  {
    command: "MGET",
    category: "String",
    description: "Return the values of all the given keys.",
    syntax: "MGET key [key ...]",
    args: [{ token: "key", desc: "One or more keys to read." }],
    example: 'MGET "redis-console:demo:strings:a" "redis-console:demo:strings:b"',
    exampleOutput: '1) "1"\n2) "2"',
  },

  // ------------------------------------------------------------------ Hash
  {
    command: "HSET",
    category: "Hash",
    description: "Set one or more fields in a hash. Creates the hash if it does not exist.",
    syntax: "HSET key field value [field value ...]",
    args: [
      { token: "key", desc: "The hash key." },
      { token: "field value", desc: "One or more field/value pairs." },
    ],
    example: 'HSET "redis-console:demo:hashes:user:1" name "Ada" role "admin"',
    exampleOutput: "(integer) 2",
  },
  {
    command: "HGET",
    category: "Hash",
    description: "Return the value of a single field in a hash.",
    syntax: "HGET key field",
    args: [
      { token: "key", desc: "The hash key." },
      { token: "field", desc: "The field to read." },
    ],
    example: 'HGET "redis-console:demo:hashes:user:1" name',
    exampleOutput: '"Ada"',
  },
  {
    command: "HGETALL",
    category: "Hash",
    description: "Return all fields and values of a hash. Avoid on very large hashes — use HSCAN.",
    syntax: "HGETALL key",
    args: [{ token: "key", desc: "The hash key." }],
    example: 'HGETALL "redis-console:demo:hashes:user:1"',
    exampleOutput: '1) "name"\n2) "Ada"\n3) "role"\n4) "admin"',
  },
  {
    command: "HDEL",
    category: "Hash",
    description: "Delete one or more fields from a hash. Returns the number removed.",
    syntax: "HDEL key field [field ...]",
    args: [
      { token: "key", desc: "The hash key." },
      { token: "field", desc: "One or more fields to delete." },
    ],
    example: 'HDEL "redis-console:demo:hashes:user:1" role',
    exampleOutput: "(integer) 1",
  },
  {
    command: "HLEN",
    category: "Hash",
    description: "Return the number of fields in a hash.",
    syntax: "HLEN key",
    args: [{ token: "key", desc: "The hash key." }],
    example: 'HLEN "redis-console:demo:hashes:user:1"',
    exampleOutput: "(integer) 1",
  },
  {
    command: "HSCAN",
    category: "Hash",
    description: "Cursor-based iteration over a (possibly huge) hash's fields.",
    syntax: "HSCAN key cursor [MATCH pattern] [COUNT count]",
    args: [
      { token: "key", desc: "The hash key." },
      { token: "cursor", desc: "Iteration cursor (start at 0)." },
      { token: "MATCH pattern", desc: "Glob pattern to filter fields.", optional: true },
      { token: "COUNT count", desc: "Hint for the number of elements per batch.", optional: true },
    ],
    example: 'HSCAN "redis-console:demo:hashes:user:1" 0 COUNT 100',
    exampleOutput: '1) "0"\n2) 1) "name"\n   2) "Ada"',
  },

  // ------------------------------------------------------------------ List
  {
    command: "LPUSH",
    category: "List",
    description: "Insert one or more values at the head of a list. Returns the new length.",
    syntax: "LPUSH key value [value ...]",
    args: [
      { token: "key", desc: "The list key." },
      { token: "value", desc: "One or more values to prepend." },
    ],
    example: 'LPUSH "redis-console:demo:lists:queue" "first" "second"',
    exampleOutput: "(integer) 2",
  },
  {
    command: "RPUSH",
    category: "List",
    description: "Insert one or more values at the tail of a list. Returns the new length.",
    syntax: "RPUSH key value [value ...]",
    args: [
      { token: "key", desc: "The list key." },
      { token: "value", desc: "One or more values to append." },
    ],
    example: 'RPUSH "redis-console:demo:lists:queue" "third"',
    exampleOutput: "(integer) 3",
  },
  {
    command: "LPOP",
    category: "List",
    description: "Remove and return the first element(s) of a list.",
    syntax: "LPOP key [count]",
    args: [
      { token: "key", desc: "The list key." },
      { token: "count", desc: "Number of elements to pop.", optional: true },
    ],
    example: 'LPOP "redis-console:demo:lists:queue"',
    exampleOutput: '"second"',
  },
  {
    command: "LRANGE",
    category: "List",
    description: "Return a range of elements from a list. Negative indices count from the end.",
    syntax: "LRANGE key start stop",
    args: [
      { token: "key", desc: "The list key." },
      { token: "start", desc: "Start index (0-based)." },
      { token: "stop", desc: "Stop index (inclusive; -1 means to the end)." },
    ],
    example: 'LRANGE "redis-console:demo:lists:queue" 0 -1',
    exampleOutput: '1) "first"\n2) "third"',
  },
  {
    command: "LLEN",
    category: "List",
    description: "Return the length of a list.",
    syntax: "LLEN key",
    args: [{ token: "key", desc: "The list key." }],
    example: 'LLEN "redis-console:demo:lists:queue"',
    exampleOutput: "(integer) 2",
  },
  {
    command: "LREM",
    category: "List",
    description: "Remove the first/last count occurrences of value from a list.",
    syntax: "LREM key count value",
    args: [
      { token: "key", desc: "The list key." },
      { token: "count", desc: ">0 head to tail, <0 tail to head, 0 all occurrences." },
      { token: "value", desc: "The value to remove." },
    ],
    example: 'LREM "redis-console:demo:lists:queue" 1 "third"',
    exampleOutput: "(integer) 1",
  },

  // ------------------------------------------------------------------- Set
  {
    command: "SADD",
    category: "Set",
    description: "Add one or more members to a set. Returns the number added (excluding duplicates).",
    syntax: "SADD key member [member ...]",
    args: [
      { token: "key", desc: "The set key." },
      { token: "member", desc: "One or more members to add." },
    ],
    example: 'SADD "redis-console:demo:sets:tags" "redis" "streams"',
    exampleOutput: "(integer) 2",
  },
  {
    command: "SREM",
    category: "Set",
    description: "Remove one or more members from a set. Returns the number removed.",
    syntax: "SREM key member [member ...]",
    args: [
      { token: "key", desc: "The set key." },
      { token: "member", desc: "One or more members to remove." },
    ],
    example: 'SREM "redis-console:demo:sets:tags" "streams"',
    exampleOutput: "(integer) 1",
  },
  {
    command: "SMEMBERS",
    category: "Set",
    description: "Return all members of a set. Avoid on very large sets — use SSCAN.",
    syntax: "SMEMBERS key",
    args: [{ token: "key", desc: "The set key." }],
    example: 'SMEMBERS "redis-console:demo:sets:tags"',
    exampleOutput: '1) "redis"',
  },
  {
    command: "SISMEMBER",
    category: "Set",
    description: "Return 1 if the member is in the set, 0 otherwise.",
    syntax: "SISMEMBER key member",
    args: [
      { token: "key", desc: "The set key." },
      { token: "member", desc: "The member to test." },
    ],
    example: 'SISMEMBER "redis-console:demo:sets:tags" "redis"',
    exampleOutput: "(integer) 1",
  },
  {
    command: "SCARD",
    category: "Set",
    description: "Return the number of members (cardinality) of a set.",
    syntax: "SCARD key",
    args: [{ token: "key", desc: "The set key." }],
    example: 'SCARD "redis-console:demo:sets:tags"',
    exampleOutput: "(integer) 1",
  },
  {
    command: "SSCAN",
    category: "Set",
    description: "Cursor-based iteration over a (possibly huge) set's members.",
    syntax: "SSCAN key cursor [MATCH pattern] [COUNT count]",
    args: [
      { token: "key", desc: "The set key." },
      { token: "cursor", desc: "Iteration cursor (start at 0)." },
      { token: "MATCH pattern", desc: "Glob pattern to filter members.", optional: true },
      { token: "COUNT count", desc: "Hint for the number of elements per batch.", optional: true },
    ],
    example: 'SSCAN "redis-console:demo:sets:tags" 0',
    exampleOutput: '1) "0"\n2) 1) "redis"',
  },

  // ----------------------------------------------------------- Sorted Set
  {
    command: "ZADD",
    category: "Sorted Set",
    description: "Add a member with a score to a sorted set, or update the member's score if it exists.",
    syntax: "ZADD key [NX | XX] [GT | LT] score member [score member ...]",
    args: [
      { token: "key", desc: "The sorted set key." },
      { token: "score member", desc: "One or more score/member pairs." },
      { token: "NX", desc: "Only add new members, never update existing.", optional: true },
      { token: "XX", desc: "Only update existing members, never add new.", optional: true },
      { token: "GT", desc: "Only update when the new score is greater.", optional: true },
      { token: "LT", desc: "Only update when the new score is less.", optional: true },
    ],
    example: 'ZADD "redis-console:demo:zset:leaderboard" 100 "ada" 92 "alan"',
    exampleOutput: "(integer) 2",
  },
  {
    command: "ZRANGE",
    category: "Sorted Set",
    description: "Return members in a range of ranks. Add WITHSCORES to include scores.",
    syntax: "ZRANGE key start stop [WITHSCORES] [BYSCORE | BYRANK] [REV] [LIMIT offset count]",
    args: [
      { token: "key", desc: "The sorted set key." },
      { token: "start stop", desc: "Rank range (0-based; -1 = last)." },
      { token: "WITHSCORES", desc: "Also return each member's score.", optional: true },
      { token: "BYSCORE", desc: "Treat start/stop as scores instead of ranks.", optional: true },
      { token: "REV", desc: "Return results in reverse order.", optional: true },
    ],
    example: 'ZRANGE "redis-console:demo:zset:leaderboard" 0 -1 WITHSCORES',
    exampleOutput: '1) "alan"\n2) "92"\n3) "ada"\n4) "100"',
  },
  {
    command: "ZREVRANGE",
    category: "Sorted Set",
    description: "Return members in a range of ranks, highest score first.",
    syntax: "ZREVRANGE key start stop [WITHSCORES]",
    args: [
      { token: "key", desc: "The sorted set key." },
      { token: "start stop", desc: "Rank range in descending order." },
      { token: "WITHSCORES", desc: "Also return each member's score.", optional: true },
    ],
    example: 'ZREVRANGE "redis-console:demo:zset:leaderboard" 0 -1 WITHSCORES',
    exampleOutput: '1) "ada"\n2) "100"\n3) "alan"\n4) "92"',
  },
  {
    command: "ZRANGEBYSCORE",
    category: "Sorted Set",
    description: "Return members whose scores fall in the given interval.",
    syntax: "ZRANGEBYSCORE key min max [WITHSCORES] [LIMIT offset count]",
    args: [
      { token: "key", desc: "The sorted set key." },
      { token: "min max", desc: "Score interval; -inf / +inf are valid bounds." },
      { token: "WITHSCORES", desc: "Also return each member's score.", optional: true },
      { token: "LIMIT", desc: "Pagination of the results.", optional: true },
    ],
    example: 'ZRANGEBYSCORE "redis-console:demo:zset:leaderboard" 90 100',
    exampleOutput: '1) "alan"\n2) "ada"',
  },
  {
    command: "ZREM",
    category: "Sorted Set",
    description: "Remove one or more members from a sorted set. Returns the number removed.",
    syntax: "ZREM key member [member ...]",
    args: [
      { token: "key", desc: "The sorted set key." },
      { token: "member", desc: "One or more members to remove." },
    ],
    example: 'ZREM "redis-console:demo:zset:leaderboard" "alan"',
    exampleOutput: "(integer) 1",
  },
  {
    command: "ZSCORE",
    category: "Sorted Set",
    description: "Return the score of a member, or nil if the member does not exist.",
    syntax: "ZSCORE key member",
    args: [
      { token: "key", desc: "The sorted set key." },
      { token: "member", desc: "The member to look up." },
    ],
    example: 'ZSCORE "redis-console:demo:zset:leaderboard" "ada"',
    exampleOutput: '"100"',
  },
  {
    command: "ZCARD",
    category: "Sorted Set",
    description: "Return the number of members in a sorted set.",
    syntax: "ZCARD key",
    args: [{ token: "key", desc: "The sorted set key." }],
    example: 'ZCARD "redis-console:demo:zset:leaderboard"',
    exampleOutput: "(integer) 1",
  },

  // ---------------------------------------------------------------- Stream
  {
    command: "XADD",
    category: "Stream",
    description: "Append a new entry to a stream. Use * for an auto-generated id.",
    syntax: "XADD key [NOMKSTREAM] id field value [field value ...]",
    args: [
      { token: "key", desc: "The stream key." },
      { token: "id", desc: "Entry id, or * to auto-generate a timestamp id." },
      { token: "field value", desc: "One or more field/value pairs for the entry." },
      { token: "NOMKSTREAM", desc: "Do not create the stream if it does not exist.", optional: true },
    ],
    example: 'XADD "redis-console:demo:streams:events" * event "login" user "ada"',
    exampleOutput: '"1693000000123-0"',
  },
  {
    command: "XRANGE",
    category: "Stream",
    description: "Return stream entries within an id range. - and + mean lowest/highest id.",
    syntax: "XRANGE key start end [COUNT count]",
    args: [
      { token: "key", desc: "The stream key." },
      { token: "start end", desc: "Id range; use - and + for the full stream." },
      { token: "COUNT count", desc: "Limit the number of returned entries.", optional: true },
    ],
    example: 'XRANGE "redis-console:demo:streams:events" - + COUNT 10',
    exampleOutput: '1) 1) "1693000000123-0"\n   2) 1) "event"\n      2) "login"',
  },
  {
    command: "XLEN",
    category: "Stream",
    description: "Return the number of entries in a stream.",
    syntax: "XLEN key",
    args: [{ token: "key", desc: "The stream key." }],
    example: 'XLEN "redis-console:demo:streams:events"',
    exampleOutput: "(integer) 1",
  },
  {
    command: "XDEL",
    category: "Stream",
    description: "Delete one or more entries from a stream. Returns the number deleted.",
    syntax: "XDEL key id [id ...]",
    args: [
      { token: "key", desc: "The stream key." },
      { token: "id", desc: "One or more entry ids to delete." },
    ],
    example: 'XDEL "redis-console:demo:streams:events" "1693000000123-0"',
    exampleOutput: "(integer) 1",
  },

  // --------------------------------------------------------------- Pub/Sub
  {
    command: "PUBLISH",
    category: "Pub/Sub",
    description: "Post a message to a channel. Returns the number of clients that received it.",
    syntax: "PUBLISH channel message",
    args: [
      { token: "channel", desc: "The channel to publish to." },
      { token: "message", desc: "The message body to send." },
    ],
    example: 'PUBLISH "redis-console:demo:news" "hello world"',
    exampleOutput: "(integer) 0",
  },
  {
    command: "PUBSUB CHANNELS",
    category: "Pub/Sub",
    description: "List the active channels that have at least one subscriber.",
    syntax: "PUBSUB CHANNELS [pattern]",
    args: [{ token: "pattern", desc: "Optional glob pattern to filter channels.", optional: true }],
    example: 'PUBSUB CHANNELS "redis-console:*"',
    exampleOutput: "(empty array)",
  },
  {
    command: "PUBSUB NUMSUB",
    category: "Pub/Sub",
    description: "Return the number of subscribers for the given channels.",
    syntax: "PUBSUB NUMSUB [channel ...]",
    args: [{ token: "channel", desc: "One or more channels to query.", optional: true }],
    example: 'PUBSUB NUMSUB "redis-console:demo:news"',
    exampleOutput: '1) "redis-console:demo:news"\n2) (integer) 0',
  },
  {
    command: "SUBSCRIBE",
    category: "Pub/Sub",
    description: "Listen for messages published to the given channels. Requires a long-lived, blocking connection.",
    syntax: "SUBSCRIBE channel [channel ...]",
    args: [{ token: "channel", desc: "One or more channels to subscribe to." }],
    example: "SUBSCRIBE redis-console:demo:news",
    exampleOutput: "Not usable from a serverless action — see the Pub/Sub section note.",
  },

  // ---------------------------------------------------------- Transactions
  {
    command: "MULTI",
    category: "Transactions",
    description: "Mark the start of a transaction. Subsequent commands are queued and run atomically by EXEC.",
    syntax: "MULTI",
    args: [],
    example: "MULTI",
    exampleOutput: "OK",
  },
  {
    command: "EXEC",
    category: "Transactions",
    description: "Run all queued commands from a MULTI block atomically and return their results as an array.",
    syntax: "EXEC",
    args: [],
    example: "EXEC",
    exampleOutput: '1) (integer) 1\n2) "OK"',
  },
  {
    command: "DISCARD",
    category: "Transactions",
    description: "Abort a transaction, discarding every queued command and leaving the connection ready for new commands.",
    syntax: "DISCARD",
    args: [],
    example: "DISCARD",
    exampleOutput: "OK",
  },
  {
    command: "WATCH",
    category: "Transactions",
    description: "Optimistically lock keys before MULTI. EXEC aborts (returns nil) if any watched key changed.",
    syntax: "WATCH key [key ...]",
    args: [{ token: "key", desc: "One or more keys to watch for modification." }],
    example: 'WATCH "redis-console:demo:strings:counter"',
    exampleOutput: "OK",
  },

  // ----------------------------------------------------------------- Server
  {
    command: "INFO",
    category: "Server",
    description: "Return server information and statistics. A section name can narrow the output.",
    syntax: "INFO [section ...]",
    args: [{ token: "section", desc: "Optional section name: server, clients, memory, stats, keyspace, ...", optional: true }],
    example: "INFO server",
    exampleOutput: '# Server\nredis_version: 7.0.0\n...',
  },
  {
    command: "DBSIZE",
    category: "Server",
    description: "Return the number of keys in the currently selected database.",
    syntax: "DBSIZE",
    args: [],
    example: "DBSIZE",
    exampleOutput: "(integer) 42",
  },
  {
    command: "PING",
    category: "Server",
    description: "Test the connection. Returns PONG, or an optional message.",
    syntax: "PING [message]",
    args: [{ token: "message", desc: "Optional message to echo back.", optional: true }],
    example: "PING",
    exampleOutput: "PONG",
  },
  {
    command: "CLIENT LIST",
    category: "Server",
    description: "Return information about connected clients.",
    syntax: "CLIENT LIST",
    args: [],
    example: "CLIENT LIST",
    exampleOutput: "id=1 addr=127.0.0.1:... ...",
  },
  {
    command: "CONFIG GET",
    category: "Server",
    description: "Return the value of a configuration parameter matching a pattern.",
    syntax: "CONFIG GET parameter",
    args: [{ token: "parameter", desc: "A configuration parameter name or glob pattern." }],
    example: "CONFIG GET maxmemory",
    exampleOutput: "1) \"maxmemory\"\n2) \"0\"",
  },
  {
    command: "TIME",
    category: "Server",
    description: "Return the server time as seconds and microseconds.",
    syntax: "TIME",
    args: [],
    example: "TIME",
    exampleOutput: '1) "1693000000"\n2) "123456"',
  },
];