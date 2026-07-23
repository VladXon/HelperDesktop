# Dead Code Detection Report

Date: 2026-07-23

## Summary

| Category | Count | Action |
|---|---|---|
| Legacy PoE codebase (`packages/poe-data/src/legacy/`) | ~121 .ts files in 18 subdirs | Keep for migration reference, remove when all consumers migrated |
| Duplicate test fixtures (`.pob.xml`) | 3 locations, same 2 files | Remove legacy duplicates |
| Removed duplicate scripts (already deleted) | 3 files | Confirmed deleted |
| Empty directories (placeholder) | 2 | Remove |
| Removed empty directories (already deleted) | 5 dirs | Confirmed deleted |
| Unused dependencies | Unknown | Requires manual verification |
| Debug scripts (one-off) | 16 files in `scripts/development/` | Keep in development/ |

## Found Dead Code

### `packages/poe-data/src/legacy/` — Old PoE Codebase Being Migrated

18 subdirectories: `__tests__/`, `adapters/`, `calculation/`, `calculators/`, `dto/`, `engine/`, `explanation/`, `factory/`, `items/`, `models/`, `parsers/`, `pob/`, `resolvers/`, `rules/`, `skills/`, `stats/`, `tree/`, plus sub-nested `__tests__/`

All ~121 .ts files are duplicates now superseded by `packages/poe-engine/src/` and `packages/poe-data/src/pob/`. Still exported from `packages/poe-data/src/index.ts`.

| File | Status | Action | Reason |
|---|---|---|---|
| `packages/poe-data/src/legacy/**/*.ts` | Exists | Keep during migration | Consumers still reference it; remove once all migrated to poe-engine, poe-data/pob |

### Duplicate Test Fixtures

Same 2 `.pob.xml` files exist in 3 locations:

| File | Status | Action | Reason |
|---|---|---|---|
| `packages/poe-data/src/__tests__/fixtures/*.pob.xml` | Exists | Keep | Primary location |
| `packages/poe-data/src/legacy/__tests__/fixtures/*.pob.xml` | Exists | Remove | Legacy duplicate |
| `packages/poe-data/src/legacy/pob/__tests__/fixtures/*.pob.xml` | Exists | Remove | Legacy duplicate |

### Empty Directories (Placeholders)

| Directory | Status | Action | Reason |
|---|---|---|---|
| `scripts/migration/` | Exists (empty) | Remove | Placeholder, no content |
| `testing/golden/baselines/` | Exists (empty) | Remove | Placeholder, no content |

### Debug Scripts — One-Off Tools

16 `debug-*` scripts in `scripts/development/`. Ad-hoc debugging tools, not part of any workflow. Not referenced from `package.json`.

| File | Status | Action | Reason |
|---|---|---|---|
| `scripts/development/debug-*` (16 files) | Exists | Keep in development/ | Might still be useful during active development |

## What to Keep

| Item | Reason |
|---|---|
| `packages/poe-data/src/legacy/` | Migration reference — consumers not yet fully migrated |
| `scripts/development/debug-*` | Useful during active development, harmless in development/ |

## Already Removed

| Item | When |
|---|---|
| `fetch-known-builds.js` (duplicate of `.ts`) | Prior to report |
| `fetch-known-builds.mjs` (duplicate of `.ts`) | Prior to report |
| `fetch-working-builds.mjs` (duplicate of `.ts`) | Prior to report |
| `golden-builds/` (empty directory) | Prior to report |
| `-p/` (empty, oddly-named directory) | Prior to report |
| `test-results/pob-ref/` (empty directory) | Prior to report |
| `test-data/` (moved to `testing/`) | Prior to report |
| `temp/` (moved to `testing/temp/`) | Prior to report |
