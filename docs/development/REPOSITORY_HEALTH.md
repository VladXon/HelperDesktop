# Repository Health Report

**Generated:** 2026-07-23

---

## 1. Repository Structure

| Category | Count |
|----------|-------|
| Applications | 3: client (Electron), server (Express), bot (Telegram) |
| Packages | 4: shared, poe-engine, poe-data, poe-backend |
| Config directories | 1 |
| Scripts | Organized subdirectories |
| Testing infrastructure | Golden test suite with compare-pob runner |
| Documentation | ~50 active `.md` files |

Structure is clean and follows the monorepo conventions defined in `AGENTS.md`. The pnpm workspace layout separates applications from shared libraries appropriately.

---

## 2. Tests

| Area | Test Files |
|------|-----------|
| Engine | ~9 unit test files |
| Data | ~31 (11 new + 20 legacy) |
| Shared | 1 |
| Server | 18 |
| Client | 3 |
| Bot | 4 |
| **Golden test builds** | 15 `.pob.xml` fixtures |

**Golden Test Infrastructure:**
- `compare-pob.ts` — reference comparison
- `run-engine.ts` — engine result generation
- `run-pob-reference.ts` — PoB reference generation

Test coverage is concentrated in data and server layers. Client and bot have minimal coverage. The golden test pipeline provides validation against Path of Building Community reference output, which is the primary correctness metric for calculation changes.

---

## 3. Quality

### Dead Code
- `packages/poe-data/src/legacy/` (~121 files) is the largest dead/deprecated area. This represents significant technical debt — approximately 80% of the package's file count is legacy.

### Duplicates
- `fetch-known-builds` existed in 3 formats; now consolidated to 1 `.ts` file
- Duplicate PoB XML fixtures exist in the legacy tree — should be consolidated

### Documentation Accuracy
- 19 accurate, 8 updated, 18 historical, 15 auto-generated artifacts
- 27/60 documents (45%) are current; 18 are explicitly historical
- 15 auto-generated explanation artifacts are low-maintenance

### Circular Dependencies
- Not detected in current package dependency graph ✅

### Root Cleanliness
- Temporary files: 0 ✅
- Garbage files: all deleted ✅
- Orphan directories: removed ✅

---

## 4. Performance

| Operation | Throughput |
|-----------|-----------|
| PoB Import | 38,000 ops/sec |
| Full Calculation | 4,900 ops/sec |

Calculation throughput (4.9k ops/sec) is the bottleneck, as expected for a complex PoE engine. Import performance is healthy at 38k ops/sec.

---

## 5. Documentation

| Status | Count | Notes |
|--------|-------|-------|
| Accurate | 19 | Actively maintained |
| Updated | 8 | Recently revised |
| Historical | 18 | Reference only, not current |
| Auto-generated | 15 | Low maintenance burden |

**Total: 60 documents**, of which 27 (45%) are actively current. The 18 historical documents should be reviewed for archival or deletion.

---

## 6. Root Cleanliness

| Check | Status |
|-------|--------|
| Temporary files | None ✅ |
| Garbage files | Deleted ✅ |
| Orphan directories | Removed ✅ |
| Build artifacts | Not present ✅ |

Root directory is clean and well-maintained.

---

## 7. Overall Health Assessment

**Rating: GOOD — with notable technical debt**

| Dimension | Grade | Rationale |
|-----------|-------|-----------|
| Structure | 🟢 A | Clear monorepo layout, well-organized packages |
| Tests | 🟡 B | Strong data + server coverage; client/bot under-tested; golden test pipeline is a differentiator |
| Code Quality | 🟡 C | ~121 dead files in legacy/ is substantial tech debt; duplication largely resolved |
| Performance | 🟢 B | Acceptable for current phase; optimization not yet a priority per AGENTS.md |
| Documentation | 🟡 C | Only 45% of documents are current; 18 historical docs need triage |
| Root Cleanliness | 🟢 A | Spotless |

**Priority Actions:**
1. **Legacy cleanup** — assess and remove `packages/poe-data/src/legacy/` (~121 files)
2. **Documentation triage** — review 18 historical documents for archival or deletion
3. **Client/bot tests** — increase coverage beyond current minimal levels
4. **Fixture deduplication** — consolidate duplicate PoB XML files in legacy tree

**Secondary Recommendations:**
- Establish a documentation freshness review cadence
- Monitor calculation performance as more mechanics are added
- Ensure golden test diffs remain the driver for implementation priority
