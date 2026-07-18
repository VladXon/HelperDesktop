# Progress

## Current Tasks

- None

## Completed

- **2026-07-17**: Initial documentation system audit and migration
  - Restructured flat `docs/` into organized `docs/{architecture,database,security,ui,deployment,roadmap,development}/`
  - Created dedicated doc files: ARCHITECTURE.md, DATABASE.md, SECURITY.md, UI_GUIDELINES.md, DEPLOYMENT.md, DEVELOPMENT.md, ROADMAP.md
  - Removed duplicate design specs (obsidian_glass_1 + obsidian_glass_2)
  - Pruned AGENTS.md from 212 lines to 150 lines (removed project docs, kept agent behavior)

- **2026-07-17**: Created AI memory system
  - `.agent/decisions.md` — architectural decision log
  - `.agent/progress.md` — task tracking
  - `.agent/known_issues.md` — bug and tech debt tracker
  - `.agent/architecture_notes.md` — system behavior notes
  - Added memory rules to AGENTS.md

- **2026-07-17**: Created specialized agent roles
  - `.agent/roles/architect.md` — planning, design, decisions
  - `.agent/roles/developer.md` — implementation, tests
  - `.agent/roles/reviewer.md` — code review, security, performance
  - `.agent/roles/debugger.md` — bug investigation, root cause analysis

- **2026-07-17**: Created CODE_STANDARDS.md (192 lines)
  - TypeScript, React, Electron, Backend, Database, Testing, Security rules
  - Derived from actual codebase conventions, not generic advice

- **2026-07-17**: Full architecture audit → TECH_DEBT.md (596 lines)
  - 89 issues ranked Critical(11) / High(22) / Medium(30) / Low(27)
  - Architecture, security, performance, duplication, testing, CI categories

- **2026-07-17**: AI agent system optimization
  - Added Investigation Rules (read-before-edit, verify-existence, pattern matching)
  - Added Context Management (budget limits, re-read prevention, search strategy)
  - Added Error Recovery table (typecheck/test/command/timeout failures)
  - Added Incremental Verification (verify-per-change, typecheck→test→lint order)
  - Added Blind Edit Prevention (verify imports, signatures, properties)
  - Added Memory Update triggers (when to update each .agent/ file)
  - Added Task Size Rules (when to todo/plan/subagent)
  - Added Subagent scope guidance (explore vs general)

- **2026-07-17**: AI agent system upgrade to professional engineering OS
  - Rewrote AGENTS.md with 15 focused sections (role identity, session protocol, thinking workflow, context management, investigation rules, tool/skill usage, coding standards, safety, anti-hallucination, self-review, testing, debugging, project memory, i18n, doc index)
  - Created `.agent/memory.md` — general project knowledge and system behavior (merged from `architecture_notes.md`)
  - Created `.agent/issues.md` — known bugs and technical debt (renamed from `known_issues.md`)
  - Created `.agent/current_task.md` — active task tracking template for large tasks
  - Deleted old `.agent/architecture_notes.md` and `.agent/known_issues.md`
  - Added Self-Review Mode section (review own changes like a senior engineer)
  - Added Debugging Mode section (reproduce → root cause → fix minimal → verify)
  - Added Error Recovery table (typecheck/test/command/timeout/unexpected)
  - Added escalation table for task sizing (direct execute → brief plan → todowrite → subagent)
  - Added explicit priorities: Correctness → Security → Stability → Maintainability → Performance → Developer Experience

- **2026-07-18**: Fixed auth:login "Network error" and "ERR_CONNECTION_RESET" bugs
  - Root cause: server URL was `https://` but Express runs plain HTTP on port 3001 (no TLS/nginx)
  - Changed `DEFAULT_SERVER_URL` and server list in `ServerStatusBadge` from `https://` → `http://`
  - Replaced global `fetch()` with Electron's `net.fetch()` for TLS cert event integration
  - Added `certificate-error` handler for known IPs (future HTTPS support)
  - Added request logging middleware for debugging
  - Fixed URL construction from string concat to `new URL(path, baseUrl)` (prevented double-slash `//api/auth/...`)
  - Deployed server to VPS, ran PostgreSQL migration (tables were missing), created user

## Backlog

- _(add planned work here)_
