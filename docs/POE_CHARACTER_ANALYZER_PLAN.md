# PoE Character Analyzer — Architecture Plan

**Status: PLANNING** | Phase 1 of Character Analyzer

---

## 1. Current State

### What exists

| Layer | Component | Status |
|-------|-----------|--------|
| GGG API | `ggg-client.ts` — `getCharacters()`, `getCharacterDetail()` | Working |
| Auth | Session + OAuth providers | Working |
| Converter | `poe-character.service.ts` — GGG JSON → Build + Modifier[] | Working (client-side) |
| Analysis | `poe-analysis.service.ts` — build → analysis | Working |
| Modifier parsers | `pob-converter.ts` — 5 parser functions | Working |
| Build storage | `poeBuilds` + `poeBuildAnalyses` tables | Working |

### What's missing

| Gap | Current |
|-----|---------|
| Character persistence | Characters fetched live, never stored |
| Character database | No `poe_characters` table |
| Snapshot history | No way to track character changes over time |
| Server-side analysis | Conversion runs in Electron, not server |
| Passive tree data | Always empty for API-fetched characters |
| Equipment persistence | Items from GGG not stored |

---

## 2. Architecture

### New service layer

```
Electron (renderer)
    │
    ▼
Electron (main) → IPC → backend-client.ts
    │
    ▼
Server API (new routes)
    │
    ▼
PoeCharacterProvider (abstraction)
    ├── SessionCharacterProvider (POESESSID)
    └── OAuthCharacterProvider (Bearer token)
    │
    ▼
GGGClient (existing, single GGG abstraction)
    │
    ▼
PostgreSQL (new tables + existing)
```

### New database tables

#### `poe_characters`

```sql
CREATE TABLE poe_characters (
  id            serial PRIMARY KEY,
  account_id    integer NOT NULL REFERENCES poe_accounts(id) ON DELETE CASCADE,
  name          text NOT NULL,
  league        text NOT NULL,
  class         text NOT NULL,
  ascendancy    text,
  level         integer NOT NULL,
  experience    bigint,
  raw_json      jsonb NOT NULL DEFAULT '{}',
  fetched_at    timestamp NOT NULL DEFAULT now(),
  UNIQUE(account_id, name)
);

CREATE INDEX idx_char_account ON poe_characters(account_id);
CREATE INDEX idx_char_league ON poe_characters(league);
```

`raw_json` stores the full GGG `/character-window/get-items` response. PostgreSQL JSONB allows querying nested fields without schema changes when GGG adds new fields.

#### `poe_character_snapshots`

```sql
CREATE TABLE poe_character_snapshots (
  id            serial PRIMARY KEY,
  character_id  integer NOT NULL REFERENCES poe_characters(id) ON DELETE CASCADE,
  level         integer NOT NULL,
  raw_json      jsonb NOT NULL,
  change_summary jsonb,
  created_at    timestamp NOT NULL DEFAULT now()
);

CREATE INDEX idx_snap_character ON poe_character_snapshots(character_id, created_at DESC);
```

Tracks character changes over time. `change_summary` stores computed deltas (level changes, item changes, passive tree changes).

#### `poe_item_cache`

```sql
CREATE TABLE poe_item_cache (
  id            serial PRIMARY KEY,
  item_hash     text UNIQUE NOT NULL,
  name          text NOT NULL,
  type_line     text NOT NULL,
  inventory_id  text NOT NULL,
  frame_type    integer NOT NULL,
  raw_json      jsonb NOT NULL,
  cached_at     timestamp NOT NULL DEFAULT now(),
  expires_at    timestamp NOT NULL
);

CREATE INDEX idx_item_hash ON poe_item_cache(item_hash);
```

Caches individual items across characters to avoid redundant storage and enable cross-character item analysis.

### New service: PoeCharacterProvider

```ts
interface PoeCharacterProvider {
  fetchCharacterList(accountId: string): Promise<CharacterSummary[]>;
  fetchCharacter(name: string): Promise<CharacterDetail>;
  saveCharacter(accountId: string, detail: CharacterDetail): Promise<CharacterRecord>;
  getSnapshotHistory(characterId: number): Promise<CharacterSnapshot[]>;
  compareSnapshots(id1: number, id2: number): Promise<SnapshotDiff>;
}
```

### Server routes

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/poe/characters` | List characters for connected account |
| `GET` | `/api/poe/characters/:id` | Get character detail |
| `POST` | `/api/poe/characters/:id/refresh` | Re-fetch from GGG + create snapshot |
| `GET` | `/api/poe/characters/:id/snapshots` | Get snapshot history |
| `POST` | `/api/poe/characters/:id/analyze` | Run analysis on character |

---

## 3. Migration Plan

### Migration 0003 — Character Tables

Apply additive migration (no destructive changes):

```sql
-- poe_characters table
CREATE TABLE IF NOT EXISTS poe_characters (
  id serial PRIMARY KEY,
  account_id integer NOT NULL,
  name text NOT NULL,
  league text NOT NULL,
  class text NOT NULL,
  ascendancy text,
  level integer NOT NULL,
  experience bigint,
  raw_json jsonb NOT NULL DEFAULT '{}',
  fetched_at timestamp NOT NULL DEFAULT now(),
  CONSTRAINT poe_characters_account_name_unique UNIQUE(account_id, name)
);

-- poe_character_snapshots table
CREATE TABLE IF NOT EXISTS poe_character_snapshots (
  id serial PRIMARY KEY,
  character_id integer NOT NULL,
  level integer NOT NULL,
  raw_json jsonb NOT NULL,
  change_summary jsonb,
  created_at timestamp NOT NULL DEFAULT now()
);

-- poe_item_cache table
CREATE TABLE IF NOT EXISTS poe_item_cache (
  id serial PRIMARY KEY,
  item_hash text UNIQUE NOT NULL,
  name text NOT NULL,
  type_line text NOT NULL,
  inventory_id text NOT NULL,
  frame_type integer NOT NULL,
  raw_json jsonb NOT NULL,
  cached_at timestamp NOT NULL DEFAULT now(),
  expires_at timestamp NOT NULL
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_char_account ON poe_characters(account_id);
CREATE INDEX IF NOT EXISTS idx_char_league ON poe_characters(league);
CREATE INDEX IF NOT EXISTS idx_snap_character ON poe_character_snapshots(character_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_item_hash ON poe_item_cache(item_hash);

-- Foreign keys
ALTER TABLE poe_characters ADD CONSTRAINT fk_char_account 
  FOREIGN KEY (account_id) REFERENCES poe_accounts(id) ON DELETE CASCADE;
ALTER TABLE poe_character_snapshots ADD CONSTRAINT fk_snap_character 
  FOREIGN KEY (character_id) REFERENCES poe_characters(id) ON DELETE CASCADE;
```

---

## 4. Implementation Phases

### Phase 1a — Database (migration 0003)
- Create migration SQL file
- Add Drizzle schema definitions to `apps/server/src/db/schema.ts`
- Add `auth_type` to poe-backend schema for consistency
- Run migration on VPS PostgreSQL

### Phase 1b — Character Provider
- Create `PoeCharacterProvider` interface in `services/poe/`
- Create `SessionCharacterProvider` implementation (uses GGGClient + DB)
- Add `OAuthCharacterProvider` placeholder (future OAuth mode)
- Create character repo in `packages/poe-backend/src/repositories/`
- Wire into dependency injection

### Phase 1c — Server Routes
- Create `routes/poe-characters.ts`
- `GET /api/poe/characters` — list from DB (refresh from GGG if stale)
- `GET /api/poe/characters/:id` — detail with JSONB equipment
- `POST /api/poe/characters/:id/refresh` — re-fetch from GGG
- Mount in `apps/server/src/index.ts`

### Phase 1d — Electron Integration
- Add `fetchCharacters()`, `fetchCharacter(id)`, `refreshCharacter(id)` to backend-client
- Add IPC handlers
- Update preload + types
- No UI changes in this phase (API ready for future UI)

### Phase 1e — Passive Tree Data
- Add `passive_tree_json` column to `poe_characters` (JSONB, nullable)
- Parse GGG passive tree hashes → node IDs
- Populate `CharacterPassiveTree` struct

### Phase 1f — Analysis Pipeline
- Move `convertCharacterToBuild()` to server side
- Store analysis results in `poeBuildAnalyses`
- Wire into existing build comparison

---

## 5. Testing Strategy

| Area | Tests |
|------|-------|
| Migration | Verify tables created, FK constraints, indexes |
| Character provider | Mock GGGClient, test fetch/save/snapshot |
| Routes | supertest: 200 on fetch, 404 on missing, 401 without auth |
| JSONB queries | Query nested fields (items, mods) |
| Snapshots | Create snapshot, verify diff computation |
| Integration | Full flow: GGG API → save → snapshot → analyze |

---

## 6. Compatibility

### PoB Import
- `poe_characters.raw_json` contains equipment data in GGG format
- Same `convertCharacterToBuild()` path used for analysis
- PoB import uses `parsePobXml()` → same `Build` type

### Passive Tree Analysis
- `passive_tree_json` column (Phase 1e) stores tree hashes
- Future: decode hashes → `PassiveTreeSnapshot` → modifiers → engine

### AI Build Review
- Character data stored in JSONB allows AI to query full equipment context
- Analysis pipeline feeds `AnalysisResult` → AI explanation

---

## 7. Non-Goals (excluded from Phase 1)

- Character comparison UI (backend comparison API ready, UI deferred)
- Passive tree full decode (JSONB placeholder ready, decode algorithm deferred)
- Item market valuation (table ready, pricing engine deferred)
- Character import from PoB (separate path, already working)
