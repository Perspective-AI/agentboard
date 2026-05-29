/**
 * Low-level key/value primitives that back the high-level document storage.
 *
 * Keys are POSIX-style relative paths (e.g. `boards/foo/agents/bar.json`).
 * The filesystem backend maps them under the data dir; the Vercel Blob backend
 * maps them to blob pathnames. All business logic lives in DocumentStorage and
 * speaks only this interface, so swapping the backend (local FS vs. serverless
 * Blob) requires no changes to the storage semantics.
 */
export interface KvStore {
  /**
   * Reads and parses the JSON value at `key`.
   * - Missing key -> null.
   * - Unparseable content -> null (backend may quarantine it).
   * - When `validate` is supplied and returns false -> null (value skipped).
   */
  get<T>(key: string, validate?: (value: unknown) => boolean): Promise<T | null>;

  /** Writes `data` as JSON at `key`, creating any parent containers. */
  put(key: string, data: unknown): Promise<void>;

  /**
   * Atomically creates a placeholder at `key` only if it does not already
   * exist. Returns true if it was created, false if the key was already taken.
   * Used to reserve unique ids without a TOCTOU race.
   */
  createIfAbsent(key: string): Promise<boolean>;

  /** Whether a value exists at `key`. */
  exists(key: string): Promise<boolean>;

  /** Deletes the value at `key`. No-op if it does not exist. */
  delete(key: string): Promise<void>;

  /** Recursively deletes every key under `prefix`. No-op if empty. */
  deletePrefix(prefix: string): Promise<void>;

  /**
   * Lists the direct child entry names under the directory `prefix` — both
   * leaf files (e.g. `bar.json`) and subdirectory names (e.g. `bar`), matching
   * `fs.readdir` semantics. Does not recurse.
   */
  listChildren(prefix: string): Promise<string[]>;

  /**
   * Appends an event record to an append-only collection rooted at `eventsKey`,
   * partitioned into `bucket` (e.g. a date). Concurrent appends are safe.
   */
  appendEvent(eventsKey: string, bucket: string, record: unknown): Promise<void>;

  /** Lists the bucket names under an events collection. */
  listEventBuckets(eventsKey: string): Promise<string[]>;

  /** Reads every event record in a bucket, skipping unparseable ones. */
  readEventBucket(eventsKey: string, bucket: string): Promise<unknown[]>;
}
