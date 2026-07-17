# Dev Workflow: Client-Only Mode

## Problem

`pnpm dev` starts server, bot, and client all locally. The user has a VPS where server+bot are already running in production. Running everything locally is redundant and causes confusion (client connects to VPS by default, local server is idle).

## Goal

`pnpm dev` should start only the Electron client (which connects to the VPS). The full local stack should remain available for debugging.

## Changes

### 1. Root `package.json`

- `dev` → only runs `pnpm dev:client`
- `dev:all` → new script with the old `dev` behavior (server + bot + client concurrently)
- `dev:server`, `dev:bot`, `dev:client` — unchanged

### 2. `start-dev.bat`

Update if it references `pnpm dev` — verify it still works as intended.

## Affected Files

| File | Change |
|------|--------|
| `package.json` | `dev` script → `pnpm dev:client`; add `dev:all` |
| `start-dev.bat` | Possibly — verify after main change |

## Non-Goals

- Not changing how the client resolves the server URL (already defaults to VPS)
- Not changing deploy, build, or production scripts
- Not changing PM2 or VPS configuration

## Validation

- Run `pnpm dev` — only client should start
- Run `pnpm dev:all` — all three should start (old behavior)
- Run `pnpm typecheck` — no type errors
