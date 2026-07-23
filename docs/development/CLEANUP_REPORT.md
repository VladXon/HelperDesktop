# Repository Cleanup Report

Date: 2026-07-23

## Safe to Delete

| File | Action | Reason | Git History |
|---|---|---|---|
| `extract_3_16.log` | Delete | Temp extraction log | Untracked |
| `extract_3_25.log` | Delete | Temp extraction log | Untracked |
| `extract_3_27.log` | Delete | Temp extraction log | Untracked |
| `extract-3_16-warn.log` | Delete | Temp warning log | Untracked |
| `extract-3_25-warn.log` | Delete | Temp warning log | Untracked |
| `extract-3_27-warn.log` | Delete | Temp warning log | Untracked |
| `decode_test.js` | Delete | Standalone test, not referenced | Untracked |
| `decode_test.mjs` | Delete | Standalone test, not referenced | Untracked |
| `ssh_test.py` | Delete | Standalone test, not referenced | Untracked |
| `pobb_page.html` | Delete | Scraped HTML page | Untracked |
| `user_page.html` | Delete | Scraped HTML page | Untracked |
| `test_build.b64` | Delete | Binary test artifact | Untracked |
| `build_ids.txt` | Delete | Build list artifact | Untracked |
| `golden-builds/` | Delete | Empty directory | Untracked |
| `temp/` | Delete | Contains pob-ref artifacts (pob-ref-err.txt, pob-ref-out.json, pobb_raw.xml) | Untracked |
| `-p/` | Delete | Empty directory, weird name | Untracked |
| `.agent/` | Review first | Hidden directory — check if needed | Untracked |

## Move to testing/

### `test-data/` → `testing/golden/builds/`

| File/Dir | Target | Reason |
|---|---|---|
| `test-data/` | `testing/golden/builds/` | Golden test fixture data |

### `test-results/` → `testing/golden/` + `testing/logs/` + `testing/temp/`

| File/Dir | Target | Reason |
|---|---|---|
| `test-results/engine/` | `testing/golden/engine/` | Engine test outputs |
| `test-results/pob-reference/` | `testing/golden/pob/` | PoB reference outputs |
| `test-results/golden-tests/` | `testing/golden/reports/` | Golden test reports |
| `test-results/explain/` | `testing/golden/explain/` | Explain analysis outputs |
| `test-results/*.txt` (6 pob-debug files) | `testing/logs/` | Debug logs |
| `test-results/*.json` (9 pob-out + tree-data files) | `testing/temp/` | Intermediate temp data |
| `test-results/pob-ref/` | No action | Empty directory |

## Keep

### Configuration & Root Files

| File | Reason |
|---|---|
| `README.md` | Project documentation |
| `AGENTS.md` | AI agent instructions |
| `biome.json` | Linter/formatter config |
| `package.json` | Root package config |
| `tsconfig.json` | Root TypeScript config |
| `pnpm-workspace.yaml` | Workspace config |
| `.gitignore` | Git ignore rules |
| `.env.example` | Environment template |
| `turbo.json` | Turborepo config |

### CI/CD

| File | Reason |
|---|---|
| `.github/workflows/*` | CI/CD pipelines |
| `.github/renovate.json` | Dependency automation |

### Application Code

| Directory | Reason |
|---|---|
| `apps/` | All application code — keep as-is |
| `packages/` | All package code (except `legacy/` — separate review) |

### Scripts

| File | Reason |
|---|---|
| `golden-tests/` | Golden test runner |
| `stress-test/` | Stress test infra |
| `deploy.sh` | Deployment script |
| `backup.sh` | Backup script |
| `push-notify.mjs` | Push notification script |

### Documentation

| File/Dir | Reason |
|---|---|
| `docs/ai/*.md` | AI context docs |
| `docs/development/*.md` | Development guides |
| `docs/architecture/ARCHITECTURE.md` | System architecture |
| `docs/architecture/POE_AUTH_ARCHITECTURE.md` | Auth architecture |
| `docs/deployment/*.md` | Deployment guides |
| `docs/security/SECURITY.md` | Security docs |
| `docs/database/DATABASE.md` | Database docs |
| `docs/api.md` | API reference |
| `docs/testing.md` | Testing guide |
| `docs/ui/UI_GUIDELINES.md` | UI guidelines |
| `docs/validation/PRE_RELEASE_VALIDATION_PLAN.md` | Pre-release validation |
| `docs/superpowers/*` | Historical reference |
| `docs/validation/history/*` | Validation history |

## Needs Review

### Needs Update

| File | Issue |
|---|---|
| `docs/poe/phase1-core-engine.md` | May reference old paths/structure |
| `docs/poe/phase2-data-layer.md` | May reference old paths/structure |
| `docs/validation/MECHANICS_COVERAGE.md` | May reference old paths/structure |
| `docs/POE_AUTH.md` | May reference old paths/structure |
| `docs/POE_SESSION_AUTH_AUDIT.md` | May reference old paths/structure |
| `docs/poe-phase7-integration-audit.md` | May reference old paths/structure |
| `docs/architecture/POE_AUTH_INVENTORY.md` | May reference old paths/structure |

### Scripts Reorganization

| File | Action | Reason |
|---|---|---|
| `debug-log*.sh` | Move to `scripts/development/` | Development helper |
| `debug-token*.sh` | Move to `scripts/development/` | Development helper |
| `_debug.mts` | Move to `scripts/development/` | Debug utility |
| `fetch-*.js/.mjs/.ts` | Move to `scripts/tooling/` | Data fetching scripts |
| `extract-*.sh/.mjs` | Move to `scripts/tooling/` | Extraction scripts |
| `check-*.sh` | Move to `scripts/tooling/` | Validation scripts |
| `fetch-known-builds.js` | Delete | Duplicate of `.ts` version |
| `fetch-known-builds.mjs` | Delete | Duplicate of `.ts` version |
| `fetch-working-builds.mjs` | Delete | Duplicate of `.ts` version |
| One-off debug scripts | Delete | Temporary, no longer needed |

### Packages

| Directory | Action | Reason |
|---|---|---|
| `packages/legacy/` | Separate review | Unknown status, may contain dead code |
