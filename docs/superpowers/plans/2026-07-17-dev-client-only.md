# Dev Client-Only Mode Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Change `pnpm dev` to start only the Electron client (server+bot already run on VPS).

**Architecture:** Single change to root `package.json` — modify `dev` script, add `dev:all` for the old behavior.

**Tech Stack:** pnpm workspace, concurrently

## Global Constraints

- Follow existing script naming conventions (`dev:*`)
- Keep existing `dev:server`, `dev:bot`, `dev:client` scripts unchanged

---

### Task 1: Update root scripts

**Files:**
- Modify: `package.json:34-35`

- [ ] **Step 1: Replace `dev` script and add `dev:all`**

Change `package.json`:
- `dev` → `pnpm dev:client`
- Add `dev:all` with the old `dev` value

- [ ] **Step 2: Verify**

Run: `pnpm dev` — should only start the client
Run: `pnpm dev:all` — should start server, bot, client concurrently
Run: `pnpm typecheck` — no errors
