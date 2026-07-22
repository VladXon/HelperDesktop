# Documentation Audit Report

> Date: 2026-07-22 | Status: COMPLETE

## 1. Files Found: 38

- 30 in `docs/`
- 2 root-level (`README.md`, `AGENTS.md`)
- 8 `package.json` files with descriptions

---

## 2. Critical Issues

### C1: `.agent/` directory entirely missing
AGENTS.md references 9 files in `.agent/` — **none exist** on disk.
- `.agent/memory.md`, `decisions.md`, `progress.md`, `issues.md`, `current_task.md`
- `.agent/roles/architect.md`, `developer.md`, `reviewer.md`, `debugger.md`

**Fix**: Remove `.agent/` references from AGENTS.md or create the directory.

### C2: SQLite → PostgreSQL migration NOT reflected in 6 files

| File | Issue |
|------|-------|
| `docs/architecture/ARCHITECTURE.md` | Says SQLite, shows SQLite in system diagram |
| `docs/database/DATABASE.md` | Entire document is SQLite-only |
| `docs/development/DEVELOPMENT.md` | `DB_PATH` env var, `sqlite3 .backup` |
| `docs/development/CODE_STANDARDS.md` | Drizzle+SQLite schema patterns, WAL mode |
| `docs/deployment/DEPLOYMENT.md` | `SQLite .backup` command |
| `docs/superpowers/specs/2026-07-21-poe-analyzer-v2-design.md` | References SQLite |

### C3: README.md outdated
- Package list only shows `packages/shared` — missing `poe-engine`, `poe-data`, `poe-backend`
- Features list missing PoE Analyzer entirely
- Project structure diagram missing PoE packages

### C4: Package migration paths not updated in phase docs
- `docs/poe/phase1-core-engine.md` → references `apps/client/src/main/poe/core/` (code moved to `packages/poe-engine`)
- `docs/poe/phase2-data-layer.md` → references `apps/client/src/main/poe/data/` (code moved to `packages/poe-data`)

---

## 3. High-Priority Duplication

### D1: PoE Auth — 4 overlapping documents
`POE_AUTH.md`, `POE_SESSION_AUTH_AUDIT.md`, `POE_AUTH_ARCHITECTURE.md`, `POE_AUTH_INVENTORY.md`

**Fix**: `POE_AUTH_ARCHITECTURE.md` is the authoritative document. Archive the others or merge into it.

### D2: PoE Analyzer architecture — 3 overlapping documents
`poe-analyzer-v2-design.md`, `poe-analyzer-final-architecture.md`, `poe-analyzer-final-architecture-review.md`

**Fix**: The `final-architecture-review.md` (1122 lines) is the most detailed. Keep as source of truth.

### D3: VPS/deployment — 2 overlapping documents
`DEPLOYMENT.md` and `PRODUCTION_TWO_VPS_ARCHITECTURE.md`

**Fix**: Merge deployment commands into one document. `PRODUCTION_TWO_VPS_ARCHITECTURE.md` is more current.

---

## 4. Medium Priority

### M1: Implemented specs not archived
- `docs/superpowers/specs/2026-07-17-dev-client-only-design.md` → IMPLEMENTED, archive
- `docs/superpowers/plans/2026-07-17-dev-client-only.md` → IMPLEMENTED, archive

### M2: No CHANGELOG, CONTRIBUTING, or CODE_OF_CONDUCT

### M3: 3 packages lack descriptions in package.json
- `@helper/server` — no description
- `@helper/bot` — no description
- `@helper/shared` — no description

### M4: No per-package README files

### M5: Benchmark results document all TBD
`docs/architecture/POE_AUTH_BENCHMARK_RESULTS.md` — all values are "TBD"

---

## 5. Summary of Changes Needed

| # | File | Action | Priority |
|---|------|--------|----------|
| 1 | README.md | Complete rewrite | CRITICAL |
| 2 | AGENTS.md | Remove `.agent/` refs, add forbidden actions, workflows | CRITICAL |
| 3 | `docs/architecture/ARCHITECTURE.md` | PostgreSQL + PoE packages | CRITICAL |
| 4 | `docs/database/DATABASE.md` | Complete rewrite for PostgreSQL | CRITICAL |
| 5 | `docs/development/DEVELOPMENT.md` | PostgreSQL env vars | HIGH |
| 6 | `docs/development/CODE_STANDARDS.md` | PostgreSQL DB section | HIGH |
| 7 | `docs/deployment/DEPLOYMENT.md` | `pg_dump`, PoE package build | HIGH |
| 8 | `docs/poe/phase1-core-engine.md` | Update package paths | HIGH |
| 9 | `docs/poe/phase2-data-layer.md` | Update package paths | HIGH |
| 10 | Merge auth docs → `POE_AUTH_ARCHITECTURE.md` | Consolidation | MEDIUM |
| 11 | Archive implemented specs | Move to archive | MEDIUM |
| 12 | Create `docs/ai/` directory | New files | MEDIUM |
| 13 | Add package descriptions | `package.json` | LOW |
| 14 | Create CHANGELOG | New file | LOW |
