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