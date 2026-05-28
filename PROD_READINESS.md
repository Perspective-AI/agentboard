# Agentboard — Production Readiness

A running assessment of what stands between agentboard and a dependable
production deployment. Items are graded by severity. **CRITICAL** blockers can
cause data loss or crashes under normal multi-agent load and must be resolved
before production use.

Storage is the file-system JSON layer in `src/lib/storage/fs-storage.ts`. Because
multiple agents write concurrently through the same process, the durability of
that layer is the dominant risk.

## CRITICAL blockers

### 1. Storage concurrency safety — ✅ resolved

Concurrent writers could corrupt data and lose writes.

- **Shared temp path.** Every write used a single `${filePath}.tmp` staging
  file. Two concurrent writers to the same record raced on that path, so the
  `rename` could publish a torn/garbage file.
- **No write serialization.** Nothing ordered concurrent write+rename sequences
  to the same logical file, so interleaved operations could clobber each other.
- **Blind reads.** `readJson` trusted whatever `JSON.parse` returned; a
  structurally wrong object flowed straight into the app.

Resolved by:
- **Unique temp paths** — each write stages to `${filePath}.${pid}.${uuid}.tmp`,
  cleaned up on failure, so stagers never collide.
- **Per-file write serialization** — `withFileLock(path, fn)` chains operations
  per absolute path (writes and activity-log appends), so they cannot interleave.
- **Validate-on-read** — `readJson` takes a validator; records that parse but
  fail validation (e.g. missing `id`, or an in-flight reservation placeholder)
  are skipped rather than surfaced.

### 2. Crash resilience — ✅ resolved

A single bad file or partially written record could take down a whole endpoint.

- **Fragile sorts.** List endpoints sorted on `createdAt`/`updatedAt` via
  `localeCompare`; a record missing that key threw and failed the entire list.
- **Corrupt files re-read forever.** Unparseable JSON returned `null` but stayed
  on disk, failing on every subsequent read.
- **No section isolation.** `getBoardSummary` fanned out with `Promise.all`; one
  failing section rejected the whole summary.

Resolved by:
- **Defensive sort/defaults** — `compareStr` tolerates missing sort keys; order
  comparisons default to `0`.
- **Quarantine corrupt files** — unparseable files are moved to
  `<dataDir>/.quarantine/` so the system keeps running and the bad data can be
  inspected. (Schema mismatches are skipped, not quarantined, to avoid
  destroying newer-schema or transient files.)
- **Section error isolation** — `getBoardSummary` wraps each section so a
  failure falls back to an empty count instead of blanking the whole board.

Covered by `src/lib/storage/fs-storage.test.ts` (`bun test`): concurrent
identical-title creates, concurrent updates to one file, corrupt-file
quarantine, invalid-but-parseable skip, missing-sort-key resilience, and
summary section isolation.

## Remaining work (not yet addressed)

These are known gaps tracked for follow-up; they are not addressed by the
current change.

- **Cross-process locking.** The write lock is in-process only. Running multiple
  server processes against one data dir is still unsafe.
- **Activity-log append atomicity.** Appends are serialized in-process and the
  reader tolerates torn lines, but very large concurrent lines across processes
  could still tear.
- **Backups / retention.** No snapshotting or pruning of activity logs.
- **Auth & multi-tenancy.** Out of scope for this assessment.
