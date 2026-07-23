# Repository Audit Report

**Date:** 2026-07-23
**Repo:** `D:\repos\ElectronHelper`
**Type:** pnpm workspace monorepo (7 packages, ~14,623 TS files)

---

## 1. Current Repository State

| Aspect | Status |
|--------|--------|
| Package manager | pnpm workspace monorepo |
| Apps (3) | `apps/client` (Electron), `apps/server` (Express), `apps/bot` (Telegram) |
| Libs (4) | `packages/shared`, `packages/poe-engine`, `packages/poe-data`, `packages/poe-backend` |
| TypeScript files | ~14,623 |
| Test files | ~65 (severely under-tested for ~14.6k TS files) |
| `.gitignore` | Present |
| CI/CD | Not configured |
| Linting | Not configured at root level |

The repository is a functional monorepo with clear package separation, but exhibits significant entropy from organic growth — accumulated debug artifacts, duplicate scripts, outdated docs, and untracked clutter.

---

## 2. Problem Areas

### 2.1 Root Clutter

The repo root contains 14+ non-standard files and directories that do not belong in a clean repository:

| Entry | Type | Problem |
|-------|------|---------|
| `extract_3_16.log` | Log | Debug extraction log |
| `extract_3_25.log` | Log | Debug extraction log |
| `extract_3_27.log` | Log | Debug extraction log |
| `extract-3_16-warn.log` | Log | Debug extraction log |
| `extract-3_25-warn.log` | Log | Debug extraction log |
| `extract-3_27-warn.log` | Log | Debug extraction log |
| `decode_test.js` | Script | One-off decode test |
| `decode_test.mjs` | Script | Duplicate of above (different format) |
| `ssh_test.py` | Script | One-off SSH connectivity test |
| `pobb_page.html` | HTML | Scraped page dump |
| `user_page.html` | HTML | Scraped page dump |
| `test_build.b64` | Data | Base64-encoded test build |
| `build_ids.txt` | Data | List of build IDs |
| `golden-builds/` | Directory | Empty directory |
| `temp/` | Directory | Temp working files |
| `-p/` | Directory | Empty dir with unusual name |
| `test-data/` | Directory | Test data at root instead of inside packages |
| `test-results/` | Directory | Test output at root instead of inside packages |
| `.agent/` | Hidden dir | Agent metadata (not project code) |
| `.superpowers/` | Hidden dir | Superpowers metadata (not project code) |

### 2.2 Scripts

**47 scripts** in `scripts/` root — far too many, with significant issues:

- **Duplicated scripts:** `fetch-known-builds` exists in 3 formats (`.js`, `.mjs`, `.ts`) doing the same thing
- **Duplicated scripts:** `fetch-working-builds` exists in 2 formats (`.mjs`, `.ts`)
- **Debug scripts (~12+):** `debug-*` scripts that were used once and abandoned
- **Language inconsistency:** Mix of `.js`, `.mjs`, `.ts`, `.py` with no standard
- **No organization:** All scripts flat in one directory with no categorization
- **Missing package.json scripts entry:** Most are not wired into `pnpm` commands

### 2.3 Packages

| Package | Issues |
|---------|--------|
| `packages/poe-data` | Contains `src/legacy/` with 18 subdirectories (~121 `.ts` files) of old code being migrated from. Dead code with no active imports. |
| `packages/poe-engine` | Missing `vitest.config.ts` — tests cannot run independently |
| `packages/poe-backend` | Missing `vitest.config.ts` — tests cannot run independently |
| `apps/server` | `.env` file is committed to Git — potential security exposure |

**Duplicate test fixtures:** Same `.pob.xml` build files exist in 3 separate locations, creating maintenance burden.

### 2.4 Documentation

**74 `.md` files total** — documentation sprawl:

| Issue | Details |
|-------|---------|
| **Stale docs** | `docs/poe/phase1-core-engine.md` and `phase2-data-layer.md` reference old/moved file paths |
| **Outdated validation data** | `docs/validation/MECHANICS_COVERAGE.md` last updated **2025-01-15** (18 months stale) |
| **TBD content** | `docs/architecture/POE_AUTH_BENCHMARK_RESULTS.md` — all values are "TBD" |
| **Superseded docs (not removed)** | `docs/POE_AUTH.md` and `docs/POE_SESSION_AUTH_AUDIT.md` replaced by `docs/architecture/POE_AUTH_ARCHITECTURE.md` |
| **Design specs in wrong place** | `docs/superpowers/` (8 files) — all are historical design specs, not current documentation |
| **Plan files in wrong place** | `superpowers/plans/` (4 files) and `superpowers/specs/` (4 files) — planning artifacts mixed with repo docs |
| **Auto-generated noise** | 17 auto-generated `explain` `.md` files in `test-results/explain/` that are test output, not documentation |

### 2.5 Tests

- **Severely under-tested:** ~65 test files for ~14,623 TS files (~0.44% test coverage)
- **No root test script:** No unified way to run all tests
- **Missing vitest configs:** 2 packages lack vitest configs entirely
- **Duplicate fixtures:** Same `.pob.xml` files repeated in 3 locations
- **Test output committed:** `test-results/` directory with engine results, golden test baselines, 17 explain reports, pob-debug files, and tree-data JSONs — these are generated artifacts, not source

---

## 3. Garbage Found

Items that should be **deleted immediately** (not source, not config, not documentation):

| Item | Reason |
|------|--------|
| `extract_3_16.log` | Debug log output |
| `extract_3_25.log` | Debug log output |
| `extract_3_27.log` | Debug log output |
| `extract-3_16-warn.log` | Debug log output |
| `extract-3_25-warn.log` | Debug log output |
| `extract-3_27-warn.log` | Debug log output |
| `decode_test.js` | One-off test script |
| `decode_test.mjs` | Duplicate one-off test script |
| `ssh_test.py` | One-off connectivity test |
| `pobb_page.html` | Scraped page dump |
| `user_page.html` | Scraped page dump |
| `test_build.b64` | Temporary test data |
| `build_ids.txt` | Temporary list |
| `golden-builds/` | Empty directory |
| `temp/` | Working directory with temp files |
| `-p/` | Empty directory, likely accidental |
| `.agent/` | Hidden agent metadata (not repo code) |
| `.superpowers/` | Hidden tool metadata (not repo code) |
| `test-results/explain/*.md` (17 files) | Auto-generated, not documentation |
| `test-results/` engine results, pob-debug files, tree-data JSONs | Generated artifacts |

---

## 4. Outdated Components

| Component | Age / Issue | Action |
|-----------|-------------|--------|
| `packages/poe-data/src/legacy/` | Migration artifact, ~121 files | Delete if migration complete, or document migration status |
| `docs/validation/MECHANICS_COVERAGE.md` | Last updated 2025-01-15 | Either update or replace with golden test progress tracking |
| `docs/poe/phase1-core-engine.md` | References old paths | Update or archive |
| `docs/poe/phase2-data-layer.md` | References old paths | Update or archive |
| `docs/architecture/POE_AUTH_BENCHMARK_RESULTS.md` | All "TBD" | Either populate or remove |
| `docs/POE_AUTH.md` | Superseded | Delete |
| `docs/POE_SESSION_AUTH_AUDIT.md` | Superseded | Delete |
| `docs/superpowers/` (8 files) | Historical design specs, not current docs | Move to archive or delete |

---

## 5. Duplicates Found

| What | Location 1 | Location 2 | Location 3 | Action |
|------|-----------|-----------|-----------|--------|
| `fetch-known-builds` | `scripts/fetch-known-builds.js` | `scripts/fetch-known-builds.mjs` | `scripts/fetch-known-builds.ts` | Keep one (`.ts`), delete others |
| `fetch-working-builds` | `scripts/fetch-working-builds.mjs` | `scripts/fetch-working-builds.ts` | — | Keep one (`.ts`), delete other |
| `.pob.xml` test fixtures | `test-data/pobb-builds/` | (inside packages) | (another inside packages) | Consolidate to one location |
| `decode_test` | `decode_test.js` | `decode_test.mjs` | — | Both are one-offs, delete both |

---

## 6. Documentation-Code Mismatches

| Doc | Reference | Actual State |
|-----|-----------|-------------|
| `docs/poe/phase1-core-engine.md` | Paths to engine files | Paths have changed since doc was written |
| `docs/poe/phase2-data-layer.md` | Paths to data layer files | Paths have changed since doc was written |
| `docs/architecture/POE_AUTH_ARCHITECTURE.md` | Auth layer | Current — this is the canonical doc |
| `docs/POE_AUTH.md` | Auth layer | Exists at root, superseded by architecture doc |
| `docs/validation/MECHANICS_COVERAGE.md` | Coverage metrics | 18 months stale, engine has evolved significantly |
| `AGENTS.md` | References `docs/development/CODE_STANDARDS.md` | File exists, but not verified for accuracy |

---

## 7. What to Delete / Move / Keep

### Delete (40+ items)

| Category | Items |
|----------|-------|
| Root logs | 6 `extract_*.log` files |
| Root debug scripts | `decode_test.js`, `decode_test.mjs`, `ssh_test.py` |
| Root scraped data | `pobb_page.html`, `user_page.html`, `test_build.b64`, `build_ids.txt` |
| Root empty dirs | `golden-builds/`, `-p/` |
| Root temp | `temp/` directory |
| Hidden metadata | `.agent/`, `.superpowers/` |
| Superseded docs | `docs/POE_AUTH.md`, `docs/POE_SESSION_AUTH_AUDIT.md` |
| Stale arch doc | `docs/architecture/POE_AUTH_BENCHMARK_RESULTS.md` |
| Test artifacts | `test-results/` entire directory (regeneratable) |
| Duplicate scripts | `scripts/fetch-known-builds.js`, `.mjs`; `scripts/fetch-working-builds.mjs` |
| Legacy migration code | `packages/poe-data/src/legacy/` (after confirming migration complete) |
| Historical specs | `docs/superpowers/` (8 files), `superpowers/plans/` (4 files), `superpowers/specs/` (4 files) |

### Move (6+ items)

| Item | From | To |
|------|------|----|
| Test fixtures (.pob.xml) | Root `test-data/pobb-builds/` | `packages/poe-engine/src/__tests__/fixtures/` |
| Stale phase docs | `docs/poe/` | `docs/archive/` or delete |
| Historical superpowers docs | `docs/superpowers/` | `docs/archive/` or delete |

### Keep (intact)

| Item | Reason |
|------|--------|
| `apps/client/` | Active Electron app |
| `apps/server/` | Active Express server (fix `.env` commitment) |
| `apps/bot/` | Active Telegram bot |
| `packages/shared/` | Active shared types |
| `packages/poe-engine/` | Active engine (add vitest config) |
| `packages/poe-data/` | Active data layer |
| `packages/poe-backend/` | Active backend services (add vitest config) |
| `docs/architecture/` (canonical files) | Current architecture docs |
| `docs/ai/` | AI context files |
| `docs/development/` | Development guides |
| `docs/security/` | Security docs |
| `AGENTS.md` | Active agent instructions |

### Fix (3 items)

| Item | Fix |
|------|-----|
| `apps/server/.env` | Remove from Git, add to `.gitignore`, document required vars |
| `packages/poe-engine/src/__tests__/` | Add `vitest.config.ts` |
| `packages/poe-backend/src/__tests__/` | Add `vitest.config.ts` |

---

## Summary

**Estimated cleanup effort:** 1-2 hours

**Files to delete:** ~40+ (logs, temp files, duplicates, superseded docs, generated artifacts)
**Files to move:** ~6 (test fixtures, archive docs)
**Files to fix:** ~3 (`.env` commitment, missing vitest configs)
**Files that need attention:** MECHANICS_COVERAGE.md (stale), phase docs (stale paths)

**Priority order:**
1. Delete garbage (root logs, temp files, hidden metadata) — zero risk, immediate benefit
2. Remove `.env` from Git — security
3. Consolidate duplicate scripts — reduce confusion
4. Clean up docs — remove superseded, archive historical
5. Add missing vitest configs — enable testing
6. Move test fixtures — centralize
7. Delete/review legacy code in `poe-data` — requires migration status check
