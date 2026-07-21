# PoE Architecture — Decision Record

**Last updated**: 2026-07-21

## Phase 0: Database Decision Change

**Initial design** (Phase 0 plan): Local SQLite database at `userData/poe-analyzer.db` via `better-sqlite3`.

**Final implementation** (committed): All PoE tables live in the server PostgreSQL database at `apps/server/src/db/schema.ts`.

**Rationale**:
- Centralized data — all PoE tables in one database for sync, backup, and querying
- Standardized migrations — same Drizzle pipeline as server tables
- No client-side native module dependencies (no better-sqlite3 in Electron)
- Server API serves as the single source of truth; client consumes through IPC/API

**Architecture**:

```
Electron client (apps/client)
    │
    │  IPC / HTTP
    ▼
Express server (apps/server)
    │
    │  Drizzle ORM, node-postgres
    ▼
PostgreSQL on VPS
    │
    poe_currency_snapshots   poe_builds            poe_items
    poe_market_snapshots      poe_build_analyses    poe_skills
    poe_trade_search_cache   poe_item_valuations   poe_meta_builds
    poe_crafting_methods      poe_league_info       poe_economic_events
    poe_ai_requests           poe_ai_provider_settings
    poe_sync_history
```

**Client responsibilities**:
- Core engine (pure TS, no IO) — Phase 1
- Data layer (sources, normalizers, loaders) — Phase 2
- Encrypted secrets via `safeStorage` (POESESSID, AI keys, OAuth tokens)
- Client preferences and temporary cache

**Server responsibilities**:
- Drizzle schema and migrations
- Drizzle repositories (CRUD)
- API endpoints serving PoE data to client
