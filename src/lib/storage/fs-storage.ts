import type { Storage } from "./index";
import type { ObjectStore } from "./object-store";
import { DocumentStorage, AgentRegistrationError } from "./document-storage";
import { FsObjectStore } from "./fs-object-store";

export { AgentRegistrationError };

/**
 * Filesystem-backed storage (local / self-hosted). Retained as a named export
 * for direct construction (e.g. tests) and backward compatibility.
 */
export class FsStorage extends DocumentStorage {
  constructor() {
    super(new FsObjectStore());
  }
}

/**
 * Picks the storage backend:
 * - `AGENTBOARD_STORAGE=blob|fs` forces a backend explicitly.
 * - Otherwise, a present `BLOB_READ_WRITE_TOKEN` (the Vercel Blob env var)
 *   selects Blob, since the filesystem is read-only on serverless.
 * - Falls back to the filesystem for local development.
 */
async function selectObjectStore(): Promise<ObjectStore> {
  const mode = process.env.AGENTBOARD_STORAGE?.toLowerCase();
  if (mode === "blob") {
    const { BlobObjectStore } = await import("./blob-object-store");
    return new BlobObjectStore();
  }
  if (mode === "fs") return new FsObjectStore();
  if (process.env.BLOB_READ_WRITE_TOKEN) {
    const { BlobObjectStore } = await import("./blob-object-store");
    return new BlobObjectStore();
  }
  return new FsObjectStore();
}

// Singleton — use globalThis to survive Next.js HMR in development.
const globalForStorage = globalThis as unknown as {
  _agentboardStorage?: Storage;
  _agentboardStoragePromise?: Promise<Storage>;
};

export async function getStorage(): Promise<Storage> {
  if (globalForStorage._agentboardStorage) {
    return globalForStorage._agentboardStorage;
  }
  if (!globalForStorage._agentboardStoragePromise) {
    globalForStorage._agentboardStoragePromise = (async () => {
      const storage = new DocumentStorage(await selectObjectStore());
      globalForStorage._agentboardStorage = storage;
      return storage;
    })().catch((err) => {
      globalForStorage._agentboardStoragePromise = undefined;
      throw err;
    });
  }
  return globalForStorage._agentboardStoragePromise;
}
