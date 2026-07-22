# Documentation Changelog

> Date: 2026-07-22 | Audit + Refactor Complete

## Files Created

| File | Purpose |
|------|---------|
| `docs/DOCUMENTATION_AUDIT.md` | Full audit report — 38 files, 14 issues found |
| `docs/ai/AI_CONTEXT.md` | Architecture context, data flows, common mistakes, verification checklist |
| `docs/ai/CODEBASE_MAP.md` | Map of every important directory and file |
| `docs/ai/TASK_GUIDELINES.md` | Workflow patterns: add feature, API endpoint, IPC, DB schema |
| `docs/DOCUMENTATION_CHANGELOG.md` | This file |

## Files Rewritten

| File | Changes |
|------|---------|
| `README.md` | Added PoE features, PoE packages, tech stack table, env vars, full doc index |
| `AGENTS.md` | Removed `.agent/` references (directory doesn't exist). Added forbidden actions, common workflows. Simplified to 150 lines (was 603). |
| `docs/architecture/ARCHITECTURE.md` | Fixed SQLite→PostgreSQL. Added PoE packages. Updated system diagram. |
| `docs/database/DATABASE.md` | Complete PostgreSQL rewrite. Removed all SQLite references. Added backup commands. |
| `docs/development/DEVELOPMENT.md` | Replaced `DB_PATH` with `DATABASE_URL`. Added PoE auth env vars. |
| `docs/development/CODE_STANDARDS.md` | Updated DB section for PostgreSQL + SQLite dual support. |
| `docs/deployment/DEPLOYMENT.md` | Replaced `sqlite3 .backup` with `pg_dump`. Added build order, common issues. |

## Files Updated

| File | Changes |
|------|---------|
| `apps/server/package.json` | Added description |
| `apps/bot/package.json` | Added description |
| `packages/shared/package.json` | Added description |

## Issues Fixed

| # | Issue | Status |
|---|-------|--------|
| C1 | `.agent/` references in AGENTS.md (9 files, none exist) | Removed from AGENTS.md |
| C2 | 6 files referenced SQLite instead of PostgreSQL | All fixed |
| C3 | README missing PoE packages/features | Rewritten |
| C4 | Package migration paths outdated in phase docs | Noted for future update |
| D1 | 4 overlapping PoE auth docs | Architecture doc identified as authoritative |
| M3 | 3 packages missing descriptions | Added |

## Remaining Cleanup (Low Priority)

- Archive implemented superpowers specs (2 files)
- Consolidate PoE auth docs into one (4→1)
- Update `docs/poe/phase1-core-engine.md` paths (old `apps/client/src/main/poe/` → new `packages/poe-engine/`)
- Update `docs/poe/phase2-data-layer.md` paths (same issue)
- Fill `docs/architecture/POE_AUTH_BENCHMARK_RESULTS.md` with real benchmark data
