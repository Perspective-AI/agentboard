# Agentboard — Production Readiness Review & Handoff

> Handoff doc for continuing the prod-readiness work in another session (e.g. Claude Code on the web).
> Branch: `prod-readiness-review`. Findings below were verified by reading the code **and** driving the
> live board in a real browser.

## Scope & deployment assumption

- **v1 deployment target:** internal network, access gated by **VPN**. App-level auth is therefore
  *deferred* to v1.1 (see "If hosted on cloud infra later" for what changes if that assumption changes).
- The review covers: security, storage robustness, error handling, functional completeness, code quality,
  config/deploy, testing.

## TL;DR

- **The live board is currently DOWN.** Every view ("board", "tasks", "agents") renders
  *"An unexpected error occurred"*.
- **Root cause is data integrity, not the network.** A handful of corrupt records crash a global query
  that takes down the whole UI. This is independent of VPN/cloud and is the #1 v1 blocker.
- The UI itself is **well-built and works fine on healthy data** (verified on a seeded clean board).
- **No tests, no CI.** The two crash bugs are exactly what tests would have caught.

## Are we functionally / code complete?

- **Functionally complete?** Mostly, *for the intended scope* — this is an **observability dashboard**:
  the web UI is **read-only** (task drawer shows fields + the API endpoint to call; no edit/move/delete/DnD).
  All mutation is agents calling the REST API. Gaps: **Plans/Plan-Steps have a full API but no UI**
  (and are what crashed the board); activity has no clear/retention; task creation ignores the `status` field.
- **Code complete?** **No.** Clean, readable code (strict TS, no TODOs/console.logs), but it crashes on its
  own real data, has zero tests, and no auth.

---

## CRITICAL — blockers for v1 (deployment-independent)

### 1. Storage is not concurrency-safe → data corruption  *(root cause of the outage)*
The core use case is *multiple agents writing to one board concurrently*, and the storage layer corrupts
under exactly that load. Evidence: real corrupt files already exist in the live data dir
(`~/.agentboard/data`): six plan-step files are empty `{}`, and one task file is truncated to invalid JSON.

- `writeJson` uses a **fixed temp path** (`filePath + ".tmp"`) — concurrent writes to the same file clobber
  each other's temp file. `src/lib/storage/fs-storage.ts:137-142`
- Every update is a non-atomic **read-modify-write** with no locking, e.g.
  `updateTask` `src/lib/storage/fs-storage.ts` (~:1277), `updateAgent` (~:623),
  `updatePlanStep` `src/lib/storage/fs-storage.ts:1059`. Concurrent updates lose writes (last-writer-wins).
- **Fix:** unique temp filenames (pid + counter/uuid), per-file write serialization / advisory locking,
  and validate-on-read. On a shared deployment this is *more* important, not less.

### 2. One bad record 500s the entire board
- `listPlanSteps` sorts with `a.createdAt.localeCompare(...)` assuming the field exists; the `{}` files have
  no `createdAt`/`order`, so it throws. `src/lib/storage/fs-storage.ts:1037`
- `getBoardSummary` calls it, so the summary endpoint 500s. `src/lib/storage/fs-storage.ts:478`,
  `src/app/api/boards/[boardId]/route.ts:12`
- `readJson` silently returns `null` for corrupt files (data just disappears). `src/lib/storage/fs-storage.ts:121-135`
- The client data provider blocks **all** child pages on that one failing call, so the whole board is unreachable.
  `src/components/board/board-data-provider.tsx`, `src/hooks/use-board-data.ts`
- **Fix:** defensive sort/defaults, schema-validate on read, quarantine corrupt files instead of nulling them,
  and isolate section errors so one failure can't take down the whole board.

### 3. Silent data loss + no backups
- Corrupt files vanish with only a `console.error`; there is no alerting, quarantine, or recovery path, and
  **no backup mechanism** anywhere in the codebase.
- **Fix:** quarantine + log/alert on corrupt reads; document a backup/snapshot procedure for the data dir.

---

## HIGH

- **No tests, no CI.** Start with: concurrent writes, corrupt-file handling, SSE cleanup, ID validation.
- **No input/ID validation.** Board/task/initiative IDs flow straight into file paths with no sanitization
  on the read path — path-traversal surface even from a *buggy* (not malicious) client.
  `src/lib/storage/fs-storage.ts` path helpers (~:152+).
- **SSE hub robustness.** In-memory only; broken connections may not unsubscribe; no subscription timeout.
  `src/lib/sse/hub.ts`. (Also see cloud note below — it does not work across multiple instances.)
- **No pagination.** Lists load every file into memory; activity caps at 200 and silently drops older.
  `src/lib/storage/fs-storage.ts:1375-1422`.

## MEDIUM / LOW

- **Task creation ignores `status`** — observed live: tasks created as `done`/`blocked` come out `todo`.
  Requires a follow-up PATCH. `src/app/api/boards/[boardId]/initiatives/[initiativeId]/tasks/route.ts`.
- **`sessionKey` rendered in plaintext** in the Agents UI — it's the only identity token; don't print it.
  `src/components/board/agent-card.tsx` (metadata block).
- **Config/deploy gaps:** `next.config.ts` empty; no Dockerfile, no `.env.example`, no deploy/backup docs;
  port hardcoded to 4040.
- **Unstructured logging** (`console.error`, no levels/correlation IDs).
- **Code duplication:** agent-intro parsing in 3 places — `src/lib/storage/fs-storage.ts:71-119`,
  `src/app/api/boards/[boardId]/agents/route.ts`, `src/app/api/boards/[boardId]/webhook/route.ts`.

## Deferred to v1.1 (mitigated by VPN for v1)

- No authentication/authorization on the API (VPN is the access control for v1).
- `actorAgentId` is self-asserted → impersonation (acceptable among cooperative internal agents).
- No rate limiting; no CORS hardening; SSRF surface in the install route.
- Revisit all of these **immediately** if access ever widens beyond the VPN.

---

## If hosted on cloud infra later (not just VPN'd internal box)

The current architecture assumes **a single process with a local disk**. Two things break on typical cloud hosting:

1. **File-system JSON storage** (`AGENTBOARD_DATA_DIR`) — fails on ephemeral/serverless disks (data lost on
   restart) and on multi-instance setups (each replica has its own disk → split-brain; cross-machine
   concurrency can't be locked). The `Storage` interface is clean (`src/lib/storage/index.ts`), so a Postgres
   (or SQLite-on-volume, single instance) adapter can slot in behind it.
2. **In-memory SSE hub** (`globalThis.sseHub`, `src/lib/sse/hub.ts`) — a client on instance A won't receive
   events broadcast on instance B. Needs a pub/sub backplane (Redis / Postgres LISTEN-NOTIFY) or pin to a
   single instance.

**Minimal cloud path:** one container + persistent volume for the data dir, pinned to exactly one instance,
plus the CRITICAL fixes above. **Scalable path:** Postgres adapter + SSE backplane.

---

## Recommended order of work

1. **Storage hardening** (CRITICAL #1): unique temp paths + per-file write serialization + validate-on-read.
2. **Crash resilience** (CRITICAL #2): defensive sort/defaults, quarantine corrupt files, isolate section errors.
3. **Backups + cheap hygiene** (CRITICAL #3, MEDIUM): backup docs, ID validation, stop rendering `sessionKey`.
4. **Tests + CI** covering the above.
5. Decide on **Plans/Steps**: build the UI or remove the routes (don't ship unreachable, crash-prone surface).
6. Config/deploy hardening (Dockerfile, env config, structured logs).

## Notes for whoever picks this up

- The crash and the corrupt records live in `~/.agentboard/data` on the **original local machine** — they are
  **not in this repo**, so a cloud sandbox can't reproduce the live outage from the data. The fixes are all
  code-level, so that's fine; just don't expect to *see* the broken board in a fresh environment.
- To reproduce a working board: `bun run dev`, create a board, register an agent with
  `metadata.intro.sessionKey` (required), then create tasks via the API.
- Verified UI views that work on healthy data: board (Kanban), agents, activity, task detail drawer.
