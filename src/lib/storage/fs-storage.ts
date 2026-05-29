import type { Storage } from "./index";
import type { KvStore } from "./kv";
import { DocumentStorage, AgentRegistrationError } from "./document-storage";
import { FsKvStore } from "./fs-kv";
import { BlobKvStore } from "./blob-kv";

export { AgentRegistrationError };

/**
 * Filesystem-backed storage (local / self-hosted). Retained as a named export
 * for direct construction (e.g. tests) and backward compatibility.
 */
export class FsStorage extends DocumentStorage {
  constructor() {
    super(new FsKvStore());
  }
}

/**
 * Picks the storage backend:
 * - `AGENTBOARD_STORAGE=blob|fs` forces a backend explicitly.
 * - Otherwise, a present `BLOB_READ_WRITE_TOKEN` (the Vercel Blob env var)
 *   selects Blob, since the filesystem is read-only on serverless.
 * - Falls back to the filesystem for local development.
 */
function selectKvStore(): KvStore {
  const mode = process.env.AGENTBOARD_STORAGE?.toLowerCase();
  if (mode === "blob") return new BlobKvStore();
  if (mode === "fs") return new FsKvStore();
  if (process.env.BLOB_READ_WRITE_TOKEN) return new BlobKvStore();
  return new FsKvStore();
}

// Singleton — use globalThis to survive Next.js HMR in development.
const globalForStorage = globalThis as unknown as { _agentboardStorage?: Storage };

export function getStorage(): Storage {
  if (!globalForStorage._agentboardStorage) {
    globalForStorage._agentboardStorage = new DocumentStorage(selectKvStore());
  }
  return globalForStorage._agentboardStorage;
}
