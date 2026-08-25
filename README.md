# Redis Console

An interactive Redis console for **learning, exploring, and testing** Redis
functionality, built with React + Tailwind on the frontend and Nuvolaris /
Apache OpenServerless actions on the backend. All Redis operations go through a
single public action, `v1/console`, that uses the generated Redis wiring
(`ctx.REDIS` / `ctx.REDIS_PREFIX`).

## Architecture

- **Frontend** (`src/`): React + TypeScript + Tailwind, HashRouter, shadcn/ui.
  - `src/lib/api.ts` — fetch helper that unwraps the OpenServerless `{body}`
    envelope.
  - `src/lib/sections.tsx` — the sidebar section registry (add a section here +
    a page + a route + a dispatch handler to extend the console).
  - `src/components/` — `AppLayout`, `Sidebar`, `Header`, `ConnectionBadge`,
    `SectionShell` (shared command-area + output-panel layout), `OutputPanel`.
  - `src/pages/sections/` — one page per Redis feature area.
- **Backend** (`packages/v1/console/console.py`): a single dispatch action that
  routes on a `cmd` field to handlers grouped by Redis data structure. Every
  key is built from `ctx.REDIS_PREFIX`; the generated `__main__.py` wrapper is
  left untouched.

## Sections

Overview · Keys · Strings · Hashes · Lists · Sets · Sorted Sets · Streams ·
Pub/Sub · TTL · Transactions · Raw Commands

### Keys — Visual Key Explorer

The Keys section is a visual browser, not a command form:

- Search/filter by a glob `pattern` with quick chips (`*`, `user:*`, `session:*`,
  `cache:*`), a refresh button, and a live key count (loaded so far + DB size).
- Keys are loaded with a cursor-based `SCAN` (never `KEYS *`), `count` per page,
  with a **Load more** button that continues the cursor. Each row shows the
  key name, Redis `TYPE`, and `TTL`.
- Selecting a key detects its type and opens a type-aware inspector with safe,
  bounded reads (never the whole huge structure at once):
  - **String**: value, length, edit (`SET`).
  - **Hash**: fields via `HSCAN` (paginated), field count (`HLEN`), add/edit/remove
    field (`HSET`/`HDEL`).
  - **List**: index/value via `LRANGE` (pageable), length (`LLEN`), `LPUSH`/
    `RPUSH`/`LPOP`/`RPOP`.
  - **Set**: members via `SSCAN` (paginated), cardinality (`SCARD`), add/remove
    member (`SADD`/`SREM`).
  - **Sorted Set**: rank/member/score via `ZRANGE ... WITHSCORES` (pageable),
    cardinality (`ZCARD`), add/update (`ZADD`), remove (`ZREM`).
  - **Stream**: entry id/fields via `XRANGE` (count-bounded), length (`XLEN`),
    add entry (`XADD`).
- Every visual operation displays the equivalent raw Redis command so the
  console doubles as a Redis learning tool.
- Deleting a key asks for confirmation and runs `DEL`.

The backend gained three ops on `v1/console`: `keys.scan` accepts `withmeta`
to return `{name,type,ttl}` per key, and `hashes.hscan` / `sets.sscan` provide
cursor-based, bounded iteration over large hashes/sets instead of `HGETALL` /
`SMEMBERS`.

The UI is responsive (desktop sidebar, mobile drawer) and includes a Redis
connection/status indicator, a command execution area, and an output/result
panel for each section.

## Notes / limitations

- All keys are automatically namespaced with the app's Redis prefix
  (`redisconsole2:`).
- Pub/Sub `PUBLISH` may be restricted by the platform Redis ACL; `SUBSCRIBE`
  requires a long-lived connection that serverless actions cannot hold, so only
  publish + channel discovery are exposed.
- Application `.env` / `.env.production` are managed by Trustable, not by this
  code.