# PoE Authentication — Benchmark Results

> **Status**: PENDING — requires real POESESSID to execute
>
> Run with:
> ```bash
> pnpm --filter @helper/client run auth:benchmark -- --poesessid=YOUR_SESSION_ID
> pnpm --filter @helper/client run auth:compare -- --poesessid=YOUR_SESSION_ID
> pnpm --filter @helper/client run auth:stress -- --poesessid=YOUR_SESSION_ID --iterations=100
> pnpm --filter @helper/client run auth:verify -- --poesessid=YOUR_SESSION_ID --accountA=NAME1 [--accountB=NAME2 --poesessidB=SID2]
> ```
>
> Output: `benchmarks/report-*.json`, `benchmarks/report-*.md`, `benchmarks/results-*.csv`

---

## 1. Transport Comparison Matrix

| Rank | Transport | Success Rate | Avg Latency | CF Bypass | Session Expired | GGG Down | Verdict |
|------|-----------|-------------|-------------|-----------|-----------------|----------|---------|
| 1 | `default-session` | TBD | TBD ms | TBD % | TBD % | TBD % | — |
| 2 | `poesessid-header` | TBD | TBD ms | TBD % | TBD % | TBD % | — |
| 3 | `browserwindow-execjs` | TBD | TBD ms | TBD % | TBD % | TBD % | — |
| 4 | `node-fetch` | TBD | TBD ms | TBD % | TBD % | TBD % | — |

## 2. Endpoint Analysis

| Endpoint | Best Transport | Best Latency | Comment |
|----------|---------------|-------------|---------|
| `/character-window/get-account-name` | TBD | TBD ms | Primary validation |
| `/character-window/get-characters` | TBD | TBD ms | — |
| `/character-window/get-items` | TBD | TBD ms | — |
| `/character-window/get-stash-items` | TBD | TBD ms | — |
| `/api/profile` | TBD | TBD ms | | Web app endpoint |
| `/api/leagues` | TBD | TBD ms | Public |

## 3. Cookie Strategy Comparison

| Strategy | With `net.fetch` | With `net.request` | With BrowserWindow |
|----------|-----------------|-------------------|--------------------|
| `poesessid-header` | TBD | TBD | TBD |
| `chromium-session` | N/A | TBD | TBD |
| `cleared-cookies` | TBD | TBD | TBD |

## 4. Stress Test Results

| Scenario | Transport | Attempts | Success | Failures | Avg Latency | Error Distribution |
|----------|-----------|----------|---------|----------|-------------|--------------------|
| 50× get-account-name | TBD | 50 | TBD | TBD | TBD ms | TBD |
| 100× get-account-name | TBD | 100 | TBD | TBD | TBD ms | TBD |

## 5. Production Verification Results

### 5.1 Fresh Session Test

| Test | Result | Duration | Transport | Details |
|------|--------|----------|-----------|---------|
| Connect account | TBD | TBD ms | TBD | TBD |
| Validate account name | TBD | TBD ms | TBD | TBD |
| Simulated restart | TBD | TBD ms | TBD | TBD |

### 5.2 Persistence Test

| Test | Result | Details |
|------|--------|---------|
| Cookies exist in session | TBD | TBD |
| Session survives validation | TBD | TBD |
| POESESSID expiration date | TBD | TBD |

### 5.3 Cloudflare Test

| Test | Result | Details |
|------|--------|---------|
| Primary transport (no CF) | TBD | TBD |
| Fallback chain works | TBD | TBD |
| Last used transport | TBD | TBD |

### 5.4 Multi-Account Test

| Test | Result | Details |
|------|--------|---------|
| Account A connect | TBD | TBD |
| Account B connect | TBD | TBD |
| Cookie overwrite behavior | TBD | TBD |

### 5.5 Error Classification Test

| Test | Result | Details |
|------|--------|---------|
| Invalid POESESSID → no fallback | TBD | TBD |
| Valid POESESSID works | TBD | TBD |
| All errors have categories | TBD | TBD |

## 6. Recommendation

**Primary transport**: TBD (based on success rate + latency)

**Fallback chain order**: TBD → TBD → TBD

**Rationale**: TBD

## 7. Cookie Lifetime Observations

| Cookie | Observed Lifetime | Notes |
|--------|------------------|-------|
| `POESESSID` | TBD | From `expirationDate` in Chromium cookie store |
| `cf_clearance` | TBD | Cloudflare clearance |
| `__cf_bm` | TBD | Session-level |

**Observed invalidation scenarios**:
- After GGG logout on website: TBD
- After IP change: TBD
- After app restart: TBD
- After N days idle: TBD

## 8. Known Limitations After Verification

1. `DefaultSessionAuthenticator` shares one session per app — multi-account requires `session.fromPartition()`
2. Cookie lifetime is finite — expect `session_expired` after ~30 days idle
3. Cloudflare clearance may expire independently of POESESSID
4. BrowserWindow fallback is slow (~3-5s) but guaranteed to work when POESESSID is valid
5. OAuth registration closed — POESESSID remains the only viable auth for trade API
