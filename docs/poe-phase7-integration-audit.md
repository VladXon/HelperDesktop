# Phase 7 — PoE Application Integration Layer: Audit

## Current State

### IPC Architecture

| # | Channel | Type | Handler | Status |
|---|---------|------|---------|--------|
| 1 | `poe:set-session` | invoke | `ipc/poe.ts` | Active (GGG auth) |
| 2 | `poe:get-session` | invoke | `ipc/poe.ts` | Active |
| 3 | `poe:clear-session` | invoke | `ipc/poe.ts` | Active |
| 4 | `poe:get-leagues` | invoke | `ipc/poe.ts` | Active |
| 5 | `poe:fetch-exchange-rate` | invoke | `ipc/poe.ts` | Active |
| 6 | `poe:search-items` | invoke | `ipc/poe.ts` | Active |
| 7 | `poe:fetch-characters` | invoke | `ipc/poe.ts` | Active |
| 8 | `poe:fetch-stash-items` | invoke | `ipc/poe.ts` | Active |
| 9 | `poe:fetch-exchange-history` | invoke | `ipc/poe.ts` | Active |
| — | PoB import / analysis | — | — | **Missing** |

### Old `main/poe/` module status

- **100% dead code** — 0 external imports
- Contains ~90 files: calculators, analyzers, parsers, data sources
- Already migrated to `@helper/poe-data` (Wave 1-3a)
- Safe to deprecate

### Preload bridge

- `window.api.poe` exposes 9 invoke methods
- All channels validated with regex `/^[a-z]+:[a-z][a-z0-9-]+$/`
- No type-safe IPC contracts — strings only

### Renderer

- `features/poe-assistant/` — 3-tab UI (Currency/PriceCheck/Characters)
- Uses React Query hooks wrapping `window.api.poe.*`
- No build analysis UI yet

---

## Migration Map

### Phase 7: New IPC Channels

```
Old (dead)                    → New Service                     → IPC Channel
────────────────────────────────────────────────────────────────────────────
main/poe/parsers/pob-xml      → poe-import.service.ts           → poe:import-url
main/poe/adapters/pob.adapter → poe-import.service.ts           → poe:import-xml
main/poe/factory/build-factory→ poe-import.service.ts           → (internal)
main/poe/engine/analyzer      → poe-analysis.service.ts         → poe:analyze
main/poe/calculators/*        → poe-analysis.service.ts         → (internal)
main/poe/explanation/*        → poe-analysis.service.ts         → (internal)
ipc/poe.ts (existing 9)       → poe-trade.service.ts            → poe:get-leagues etc.
ipc/poe.ts (existing 9)       → poe-account.service.ts          → poe:fetch-characters etc.
```

### Service Layer Architecture

```
apps/client/src/main/services/poe/
├── index.ts                  # Barrel
├── container.ts              # createPoeRuntime() — DI container
├── poe-import.service.ts     # PoB URL/XML → Build
├── poe-analysis.service.ts   # Build → AnalysisResult
├── poe-trade.service.ts      # GGG Trade API wrapper
├── poe-account.service.ts    # Session + character management
└── __tests__/
    ├── poe-import.integration.test.ts
    ├── poe-analysis.integration.test.ts
    └── helpers.ts
```

### Dependency Flow

```
Renderer (window.api.poe)
    ↓
Preload (ipcRenderer.invoke)
    ↓
IPC Handler (ipc/poe.ts — updated)
    ↓
PoE Service (services/poe/)
    ↓
@helper/poe-data (HTTP, PoB, data sources, AI providers)
    ↓
@helper/poe-engine (Calculator, ModDB, Explanation)
    ↓
@helper/shared (types)
```

### Compatibility Strategy

- Existing 9 IPC channels → route through new services (backward-compatible)
- Old `ipc/poe.ts` → refactored to delegate to `poe-trade.service.ts` + `poe-account.service.ts`
- Old `main/poe/` directory → can be deleted after phase complete
- Renderer unchanged — same `window.api.poe.*` interface

### What Changes

| Layer | Before | After |
|-------|--------|-------|
| IPC handler | Direct `electron.net.fetch` | Delegates to service |
| Services | None | `services/poe/*.ts` |
| Preload | 9 poe channels | 9 existing + 2 new (import, analyze) |
| Renderer types | `window.d.ts` 9 poe methods | Add `importUrl`, `importXml`, `analyze` |
| Runtime | Ad-hoc singletons | `createPoeRuntime()` container |
