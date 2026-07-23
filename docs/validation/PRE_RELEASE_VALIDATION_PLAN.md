# Pre-Release Validation Plan — PoE Engine Trustworthiness

**Goal**: Prove the calculation engine matches PoB Community (pobb.in) within <1% tolerance on all major stats before production release.

---

## 1. Golden Tests Against PoB Community (Highest Priority)

### 1.1 Data Source: pobb.in Build Collection
- Target: **200–500 real builds** from pobb.in (latest patch 3.25)
- Filter: Only builds with `lastUpdated` within last 30 days, level ≥ 90
- Categories: Attack, Spell, Minion, DoT, Crit, Non-Crit, Hybrid, CI, LL

### Comparison Metrics (per build)
| Category | Metrics | Tolerance |
|----------|---------|-----------|
| **Defense** | Life, ES, Armour, Evasion, Block (Attack/Spell), Spell Suppression | ±0.5% |
| **Resistances** | Fire/Cold/Lightning/Chaos (capped & uncapped) | ±0.5% |
| **Offense** | Total DPS, Hit DPS, DoT DPS, Crit Chance, Crit Multiplier | ±1% |
| **Speed** | Attack Speed, Cast Speed | ±1% |
| **Resources** | Mana, Reservation %, Life Regen | ±1% |

### Output Report Format
```
========================================
BUILD #42: "Boneshatter Juggernaut" (pobb.in/abc123)
========================================
PoB Community (Reference)          | Engine (Ours)      | Delta
-----------------------------------|--------------------|--------
Life:              5,123           | Life:       5,122  | -0.02%
Energy Shield:       0             | ES:             0  |  0.00%
Armour:         45,670             | Armour:    45,668  | -0.00%
Evasion:          1,234             | Evasion:    1,234  |  0.00%
Block:           42% / 0%           | Block:     42% / 0%|  0.00%
Spell Suppression:   50%            | Supp:        50%   |  0.00%
Fire Res (capped):   75%            | Fire Res:    75%   |  0.00%
Cold Res (capped):   75%            | Cold Res:    75%   |  0.00%
Light Res (capped):  75%            | Light Res:   75%   |  0.00%
Chaos Res (capped):   0%            | Chaos Res:    0%   |  0.00%
Total DPS:      4,234,567           | Total DPS: 4,211,234| -0.55%
Hit DPS:        3,890,123           | Hit DPS:   3,872,101| -0.46%
DoT DPS:          344,444           | DoT DPS:     339,133| -1.54%
Crit Chance:        85%             | Crit:         85%  |  0.00%
Crit Multiplier:   345%             | Multi:      344%   | -0.29%
Attack Speed:      5.12             | Atk Spd:     5.11  | -0.20%
Cast Speed:         —               | Cast Spd:      —   |   —
Mana:            1,234              | Mana:      1,233   | -0.08%
Reservation:        74%             | Res:         74%   |  0.00%
========================================
MAX DELTA: 1.54% (DoT DPS) — PASS (threshold 2%)
```

### Aggregation Report
```
SUMMARY (N=247 builds)
======================
Life:            99.8% within 0.5% | 0.2% > 1%
ES:              99.1% within 0.5% | 0.4% > 1%
Armour:          99.9% within 0.5% | 0.0% > 1%
Evasion:         99.7% within 0.5% | 0.1% > 1%
Total DPS:       96.3% within 1%   | 2.1% > 2%
Hit DPS:         97.1% within 1%   | 1.8% > 2%
DoT DPS:         89.2% within 2%   | 5.4% > 5%
Crit Chance:     100% within 0.5%  | 0.0% > 1%
Crit Multiplier: 98.8% within 1%   | 0.8% > 2%
Attack Speed:    99.2% within 1%   | 0.3% > 2%
Cast Speed:      98.5% within 1%   | 0.6% > 2%

BLOCKERS: 3 builds exceed 2% on Total DPS — investigate conversion chains
```

### Implementation Plan
```
scripts/golden-tests/
├── fetch-pobb-builds.ts      # Scrape pobb.in API / download 500 builds
├── parse-pobb-xml.ts         # Parse pobb.in format (already exists)
├── run-engine.ts             # Import → calculate via poe-engine
├── run-pob-reference.ts      # Run via PoB Community CLI (headless)
├── compare.ts                # Diff engine vs PoB, generate report
├── report.html               # Visual diff report
└── ci-integration.yml        # GitHub Action: run on every PR
```

**Key Integration**: Use `pobc` (PoB Community CLI) headless mode for reference values:
```bash
pobc --build=pastebin.com/abc123 --output=json --calc=all
```

### Acceptance Criteria
- ✅ **≥95% of builds** within **1% tolerance** on Life/ES/Armour/Evasion/Resistances
- ✅ **≥90% of builds** within **2% tolerance** on Total DPS / Hit DPS
- ✅ **0 builds** with >5% delta on core defenses (Life, ES, Resistances)
- ✅ **DoT DPS** documented separately (known approximation gap)

---

## 2. Long-Running Stress Test (Memory & Performance)

### Test: `scripts/stress-test/engine-soak.ts`

```typescript
// Run for 4+ hours (CI: 30 min; Local: 4 hours)
const ITERATIONS = 10000;  // ~4 hours at 1.5s/iter
const BUILDS = loadFixtures(50); // 50 different PoB XMLs

for (let i = 0; i < ITERATIONS; i++) {
  const build = BUILDS[i % BUILDS.length];
  
  const memBefore = process.memoryUsage().heapUsed;
  const start = performance.now();
  
  const dto = parsePobXml(build.xml);
  const mods = convertPobDto(dto);
  const modDB = createModDB();
  modDB.addMany(mods);
  const snap = modDB.snapshot();
  
  calculateBuild({ baseStats: {}, modSnapshot: snap, conditionState: defaultState() });
  
  // Force cleanup
  global.gc?.();
  
  const memAfter = process.memoryUsage().heapUsed;
  const duration = performance.now() - start;
  
  log({ iter: i, memDelta: memAfter - memBefore, duration, build: dto.build.buildName });
}
```

### Metrics to Monitor
| Metric | Alert Threshold |
|--------|-----------------|
| Heap growth per 1000 iterations | > 50 MB |
| GC pause time (p99) | > 50 ms |
| Active listeners (EventEmitter) | > 100 |
| Calculation time (p99) | > 2× baseline |
| Memory after GC | Not returning to baseline |

### Visualization
- Real-time dashboard: `node --inspect scripts/stress-test/engine-soak.ts` + Chrome DevTools
- Export JSONL → Grafana / local plot

---

## 3. Real Network Scenario Tests

### Test Matrix: `packages/poe-data/src/__tests__/network-scenarios.test.ts`

| Scenario | Simulation | Expected Behavior |
|----------|------------|-------------------|
| **POESESSID rotation** | Swap cookie mid-session | Auto-reauth via `poe:connect-session` |
| **cf_clearance expiry** | Mock Cloudflare 403 after N requests | Retry with fresh session |
| **Re-auth after logout** | Server returns 401 on validated session | Clear local storage, show modal |
| **Network loss** | AbortController.signal.abort() | Graceful cancel, no unhandled rejection |
| **HTTP 429 (Rate limit)** | Mock 429 with `Retry-After` header | Exponential backoff + jitter |
| **HTTP 403 (Forbidden)** | Cloudflare challenge / banned IP | Surface to UI: "Check VPN/region" |
| **HTTP 500/502/503** | GGG API errors | Retry 3× with backoff, then fail gracefully |
| **Timeout (15s)** | Delayed response > timeout | Abort, show "Request timed out" |
| **Request cancellation** | User switches tab mid-fetch | `AbortController` cleanup, no memory leak |
| **Concurrent 401s** | 5 parallel requests all 401 | Single refresh via mutex (`doRefresh`) |

### Implementation
```typescript
// packages/poe-data/src/http/http-client.test.ts
describe('HTTP Client — Network Resilience', () => {
  it('serializes concurrent 401 refreshes', async () => {
    let refreshCount = 0;
    server.use(http.get('*/api/*', async () => {
      if (refreshCount === 0) {
        refreshCount++;
        return HttpResponse.json({ error: 'unauthorized' }, { status: 401 });
      }
      return HttpResponse.json({ data: 'ok' });
    }));

    // Fire 10 concurrent requests
    const results = await Promise.all(Array(10).fill(null).map(() => client.get('/api/test')));
    expect(refreshCount).toBe(1); // Only ONE refresh
    expect(results.every(r => r.ok)).toBe(true);
  });

  it('respects Retry-After on 429', async () => {
    server.use(http.get('/api/rate', () => 
      new HttpResponse(null, { status: 429, headers: { 'Retry-After': '2' } })
    ));
    const start = Date.now();
    await client.get('/api/rate');
    expect(Date.now() - start).toBeGreaterThanOrEqual(1900);
  });

  it('aborts cleanly on signal', async () => {
    const controller = new AbortController();
    setTimeout(() => controller.abort(), 50);
    await expect(client.get('/slow', { signal: controller.signal })).rejects.toThrow('Aborted');
  });
});
```

### Manual E2E Checklist (VPS2)
- [ ] Login with POESESSID → fetch chars → analyze → logout
- [ ] Expire cookie → verify re-auth modal appears
- [ ] Toggle VPN (DE ↔ BY) → verify 403 handling
- [ ] Spam "Analyze" button → verify no duplicate requests

---

## 4. Complex Mechanics Coverage Checklist

> Even if not needed today, document gaps so they're not forgotten.

| Mechanic | Status | Engine Support | PoB Reference | Notes |
|----------|--------|----------------|---------------|-------|
| **Ailment Stacking** | ❌ | Not modeled | `ailments.{ignite,poison,bleed}.stacks` | DoT DPS inaccurate |
| **Poison** | ❌ | STUB (`dotDps: 0`) | Full stack tracking | Needs `poisonDuration`, `poisonStacks` |
| **Ignite** | ❌ | STUB | Base damage × ignite chance × duration | Requires enemy fire resist |
| **Bleed** | ❌ | STUB | Physical hit → bleed stacks | Cruelty interaction |
| **Impale** | ❌ | Missing | Phys reduction per stack | 5 stacks max |
| **Overwhelm** | ❌ | Missing | Phys reduction penetration | `overwhelmPhysReduction` |
| **Exposure** | ❌ | Missing | -% res per hit | `exposureEffect` |
| **Taken As** | ⚠️ | Partial | `conversionTakenAs` | Gain-as-extra ≠ conversion |
| **Conversion Chains** | ⚠️ | Partial (fixed) | `physical→fire→lightning` | Order matters |
| **Minions** | ❌ | Not modeled | `minion.*` stats | Separate entity |
| **Traps** | ❌ | Not modeled | `trapThrowingTime`, `cooldownRecovery` | |
| **Mines** | ❌ | Not modeled | `mineDetonationTime`, `detonationRadius` | |
| **Totems** | ❌ | Not modeled | `totem.*` stats, placement limit | |
| **Brands** | ❌ | Not modeled | `brand.*`, attachment, recall | |
| **Timeless Jewels** | ❌ | Not parsed | Seed → notable transform | Needs `PassiveTree` expansion |
| **Cluster Jewels** | ⚠️ | Partial | Notable + small passives | Jewel socket parsing exists |

### Tracking Issue
Create `docs/development/MECHANICS_GAPS.md` with:
- [ ] Issue per mechanic
- [ ] PoB reference implementation link
- [ ] Priority (P0=blocker for meta builds, P1=nice-to-have)

---

## 5. CI Integration

### GitHub Actions: `.github/workflows/pre-release-validation.yml`

```yaml
name: Pre-Release Validation
on:
  workflow_dispatch:
  pull_request:
    branches: [main]
    paths:
      - 'packages/poe-engine/**'
      - 'packages/poe-data/**'

jobs:
  golden-tests:
    runs-on: ubuntu-latest
    timeout-minutes: 60
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: '20', cache: 'pnpm' }
      - run: pnpm install --frozen-lockfile
      - run: pnpm build
      - name: Fetch pobb.in builds (500)
        run: node scripts/golden-tests/fetch-pobb-builds.ts
      - name: Run engine calculations
        run: node scripts/golden-tests/run-engine.ts
      - name: Run PoB Community reference
        run: node scripts/golden-tests/run-pob-reference.ts
      - name: Compare & report
        run: node scripts/golden-tests/compare.ts
      - name: Upload diff report
        uses: actions/upload-artifact@v4
        with: { name: golden-diff-report, path: reports/golden-diff.html }

  stress-test:
    runs-on: ubuntu-latest
    timeout-minutes: 45
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: '20', cache: 'pnpm' }
      - run: pnpm install --frozen-lockfile
      - run: pnpm build
      - name: Run soak test (30 min)
        run: timeout 1800 node --expose-gc scripts/stress-test/engine-soak.ts

  network-scenarios:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: '20', cache: 'pnpm' }
      - run: pnpm install --frozen-lockfile
      - run: pnpm test packages/poe-data/src/__tests__/network-scenarios.test.ts

  typecheck-and-test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: '20', cache: 'pnpm' }
      - run: pnpm install --frozen-lockfile
      - run: pnpm typecheck
      - run: pnpm test
```

---

## 6. Release Gate Checklist

Before tagging `v1.0.0`:

- [ ] **Golden Tests**: ≥95% builds within 1% on defenses, ≥90% within 2% on DPS
- [ ] **Stress Test**: 4-hour soak — no memory leak, no perf degradation
- [ ] **Network Tests**: All 10 scenarios pass in CI + manual VPS2 verification
- [ ] **Mechanics Gap Doc**: Published, prioritized, linked to issues
- [ ] **TypeCheck**: `pnpm typecheck` — 0 errors
- [ ] **Test Suite**: `pnpm test` — 100% pass (excluding known flaky)
- [ ] **Build**: `pnpm build` — all 7 packages compile
- [ ] **VPS2 Deploy**: Client + Server + Bot deployed, smoke test passes
- [ ] **Rollback Plan**: Documented in `docs/deployment/ROLLBACK.md`

---

## 7. Immediate Next Steps (This Week)

| Task | Owner | Effort | Dependencies |
|------|-------|--------|--------------|
| Scaffold `scripts/golden-tests/` | You | 4h | pobb.in API access |
| Implement `fetch-pobb-builds.ts` | You | 2h | — |
| Wire `pobc` CLI for reference | You | 2h | PoB Community installed |
| Write `compare.ts` diff engine | You | 3h | — |
| Scaffold stress test harness | You | 2h | — |
| Add network scenario tests | You | 3h | MSW setup exists |
| Publish MECHANICS_GAPS.md | You | 1h | — |

---

**Bottom Line**: Golden Tests are the single highest-leverage activity. If engine matches PoB Community on 200+ real builds within 1%, that's stronger evidence than any unit test suite.