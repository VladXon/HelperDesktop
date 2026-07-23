# Documentation Audit Report

Date: 2026-07-23

## Summary

| Metric | Count |
|--------|-------|
| Total .md files | 74 |
| Accurate | 19 |
| Needs update | 8 |
| Historical reference | 18 |
| Auto-generated artifacts | 15 |
| Deleted/removed | 0 |

## Accurate

| File | Status | Notes |
|---|---|---|
| `AGENTS.md` | Accurate | Active agent instructions, very current |
| `docs/ai/AI_CONTEXT.md` | Accurate | Current AI agent orientation |
| `docs/ai/CODEBASE_MAP.md` | Accurate | Current navigation reference |
| `docs/ai/TASK_GUIDELINES.md` | Accurate | Current workflow reference |
| `docs/development/DEVELOPMENT.md` | Accurate | Current dev setup |
| `docs/development/CODE_STANDARDS.md` | Accurate | Current code standards |
| `docs/development/TECH_DEBT.md` | Accurate | Current debt register |
| `docs/architecture/ARCHITECTURE.md` | Accurate | Current architecture overview |
| `docs/architecture/POE_AUTH_ARCHITECTURE.md` | Accurate | Current auth architecture |
| `docs/deployment/DEPLOYMENT.md` | Accurate | Current ops reference |
| `docs/deployment/RELEASE_CHECKLIST.md` | Accurate | Current QA checklist |
| `docs/security/SECURITY.md` | Accurate | Current security reference |
| `docs/database/DATABASE.md` | Accurate | Current DB reference |
| `docs/api.md` | Accurate | Current API reference |
| `docs/testing.md` | Accurate | Current testing reference |
| `docs/ui/UI_GUIDELINES.md` | Accurate | Current UI design guide |
| `docs/validation/PRE_RELEASE_VALIDATION_PLAN.md` | Accurate | Current validation plan |
| `docs/poe/path-of-building-analysis.md` | Accurate | Very valuable PoB reference |
| `docs/poe/phase3-build-intelligence-plan.md` | Accurate | Current plan |

## Needs Update

| File | Status | Problems | Action |
|---|---|---|---|
| `docs/poe/phase1-core-engine.md` | Needs update | Old package paths (`@helper/client` → `@helper/poe-engine`) | Update paths, add migration note |
| `docs/poe/phase2-data-layer.md` | Needs update | Old package paths (`@helper/client` → `@helper/poe-data`) | Update paths, add migration note |
| `docs/validation/MECHANICS_COVERAGE.md` | Needs update | Last updated 2025-01-15, statuses likely stale | Review and update mechanic coverage statuses |
| `docs/POE_AUTH.md` | Needs update | Superseded by `POE_AUTH_ARCHITECTURE.md` | Add deprecation notice pointing to current doc |
| `docs/POE_SESSION_AUTH_AUDIT.md` | Needs update | Superseded by `POE_AUTH_ARCHITECTURE.md` | Add deprecation notice pointing to current doc |
| `docs/poe-phase7-integration-audit.md` | Needs update | Migration has progressed since doc was written | Review and update migration status |
| `docs/architecture/POE_AUTH_INVENTORY.md` | Needs update | Historical reference for pre-refactoring state | Add note about historical context |
| `docs/architecture/POE_AUTH_BENCHMARK_RESULTS.md` | Needs update | Values still "TBD" | Fill in benchmark results or mark as incomplete |

## Historical Reference (kept for context)

| File | Reason |
|---|---|
| `docs/validation/history/2026-07-23-baseline-v0.1.md` | Golden test baseline record |
| `docs/validation/history/2026-07-23-passive-tree-phase-1.md` | Sequential progress record |
| `docs/validation/history/2026-07-24-item-parser-phase-2.md` | Sequential progress record |
| `docs/validation/history/2026-07-26-skills-phase-3.md` | Sequential progress record |
| `docs/validation/history/2026-07-27-config-phase-4.md` | Sequential progress record |
| `docs/validation/history/2026-07-28-mechanics-phase-5.md` | Sequential progress record |
| `docs/validation/history/2026-07-29-mechanics-phase-6.md` | Sequential progress record |
| `docs/validation/history/2026-07-30-mechanics-phase-7.md` | Sequential progress record |
| `docs/validation/history/2026-07-31-mechanics-phase-8.md` | Sequential progress record |
| `docs/validation/history/2026-08-01-mechanics-phase-9.md` | Sequential progress record |
| `docs/validation/history/2026-08-02-mechanics-phase-10.md` | Sequential progress record |
| `docs/superpowers/specs/*` (4 files) | Design specs, documented decisions |
| `docs/superpowers/plans/*` (4 files) | Implementation plans |
| `docs/POE_PHASE1_READY.md` | Phase 1 completion declaration |
| `docs/POE_CHARACTER_DOMAIN_MODEL.md` | Domain model spec |
| `docs/POE_CHARACTER_ANALYZER_PLAN.md` | Character analyzer plan |
| `docs/PRODUCTION_TWO_VPS_ARCHITECTURE.md` | Production architecture doc |
| `docs/DOCUMENTATION_CHANGELOG.md` | Previous audit changelog |
| `docs/DOCUMENTATION_AUDIT.md` | Previous audit report |

## Auto-generated Artifacts (not manually authored docs)

| Pattern | Description |
|---|---|
| `testing/golden/explain/*.md` (15 files) | Generated golden test explain reports |

## Deleted/Removed

None.

## Recommendations

1. **Update stale phase docs** — `phase1-core-engine.md` and `phase2-data-layer.md` reference deprecated package names. Fix paths and add a note at the top directing readers to current docs.
2. **Deprecate superseded auth docs** — `POE_AUTH.md` and `POE_SESSION_AUTH_AUDIT.md` should get deprecation banners linking to `docs/architecture/POE_AUTH_ARCHITECTURE.md`.
3. **Review MECHANICS_COVERAGE.md** — Statuses haven't been reviewed since Jan 2025. This should be checked against current golden test results.
4. **Fill or remove POE_AUTH_BENCHMARK_RESULTS.md** — "TBD" values should be resolved or the doc marked as incomplete.
5. **Keep historical docs** — All historical reference docs serve valuable context and should remain. Do not delete unless explicitly requested.
6. **Auto-generated artifacts** — These are outputs of the golden test pipeline. They should not be manually edited but may need cleanup if the pipeline changes.
7. **No deletions needed** — Every file serves a purpose (current reference, historical context, or artifact). No documentation should be deleted at this time.
