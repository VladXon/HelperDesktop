# Architectural Decisions

### 2026-07-17: AI agent system architecture

- **Context**: The repo needed a structured AI agent operating system to enable consistent task execution across sessions.
- **Decision**: Created layered system: AGENTS.md (behavior rules) → docs/ (reference knowledge) → .agent/ (memory) → .agent/roles/ (specialized agents). AGENTS.md kept lightweight with only agent behavior rules; all project documentation moved to `docs/`.
- **Alternatives**: Single large AGENTS.md with everything inside. Rejected because context would be wasted on irrelevant sections.
- **Consequences**: Agent loads only AGENTS.md initially, then loads specific docs as needed. Memory persists across sessions via .agent/ files. New system cut AGENTS.md from 212→173 lines and removed 331 lines of duplicate design specs.

### 2026-07-17: Agent role separation

- **Context**: Complex tasks require different skills (planning vs coding vs reviewing vs debugging).
- **Decision**: Created 4 role files in `.agent/roles/` with distinct responsibilities, workflows, restrictions, and output formats. Roles are strict about boundaries — architect doesn't code, debugger doesn't fix, reviewer doesn't rewrite.
- **Alternatives**: Single agent handles everything. Rejected because role boundaries prevent context mixing and enforce discipline.
- **Consequences**: Agent can delegate subtasks to appropriate role. Role restrictions prevent common failure modes (e.g., fixing without diagnosing).

### 2026-07-17: Agent system upgrade to professional engineering OS

- **Context**: The agent system needed to match Claude Code-style behavior: clear roles, strict workflows, context discipline, memory persistence, and professional engineering culture.
- **Decision**: Redesigned AGENTS.md with 15 focused sections covering role identity, session protocol, thinking workflow, context management, investigation rules, tool/skill usage, coding standards, safety, anti-hallucination, self-review, testing, debugging, project memory, i18n, and doc index. Created `.agent/memory.md` (merged from `architecture_notes.md`), `.agent/issues.md` (renamed from `known_issues.md`), and `.agent/current_task.md` for active task tracking.
- **Alternatives**: Incremental edits to existing AGENTS.md. Rejected because the structure and emphasis needed fundamental changes.
- **Consequences**: Agent now has a professional engineering identity with clear accountability. Memory system is more intuitive (`memory.md` for project knowledge, `issues.md` for bugs, `current_task.md` for active work). AGENTS.md at 230 lines balances completeness with conciseness.

### 2026-07-17: Pin grammy to exact version 1.44.0, fix transformer signature

- **Context**: Bot crashed because grammy resolved from `^1.34.0` to 1.44.0, which changed the `Transformer` type from `(prev) => NextFn` to `(prev, method, payload, signal) => Promise<ApiResponse>`. The `bot.api.config.use(transformer)` code used the old curried signature, causing all API calls to fail with `"Call to 'getMe' failed! (undefined: undefined)"`.
- **Decision**: Pinned grammy to exact `1.44.0` in `apps/bot/package.json`. Fixed transformer signature to match new API. Removed `as any` cast so TypeScript catches future API mismatches.
- **Alternatives**: Keep `^` range and add tests. Rejected because lockfile regeneration on different machines could silently pick up a breaking version.
- **Consequences**: grammy will never auto-upgrade beyond 1.44.0. Bumping grammy requires explicit change + typecheck verification. The transformer code now has proper typing.

## Format

```
### YYYY-MM-DD: Title

- **Context**: What prompted this decision.
- **Decision**: What was chosen and why.
- **Alternatives**: What was considered but rejected.
- **Consequences**: What this decision impacts.
```

---
