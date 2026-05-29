import { BlobNotFoundError, copy, del, get, head, list, put } from "@vercel/blob";
import { randomUUID } from "crypto";
import { timestamp } from "@/lib/utils";
import type { KvStore } from "./kv";

const ACCESS = "private" as const;
const QUARANTINE_PREFIX = ".quarantine";

function isNotFound(err: unknown): boolean {
  return err instanceof BlobNotFoundError;
}

/**
 * Vercel Blob-backed KvStore for production / serverless deployments, where the
 * filesystem is read-only. Keys map directly to blob pathnames.
 *
 * Consistency notes:
 * - Reads use `useCache: false` to avoid stale CDN responses after a write.
 * - `createIfAbsent` relies on `allowOverwrite: false` for atomic reservation.
 * - There is no cross-instance lock, so concurrent writers to the *same* key
 *   are last-write-wins (each write is itself atomic). Unique-id reservation
 *   prevents the common create collision; updates to one record assume a single
 *   logical writer, which matches the app's per-entity access pattern.
 */
export class BlobKvStore implements KvStore {
  private async readText(key: string): Promise<string | null> {
    let res;
    try {
      res = await get(key, { access: ACCESS, useCache: false });
    } catch (err) {
      if (isNotFound(err)) return null;
      throw err;
    }
    if (!res || res.statusCode !== 200 || !res.stream) return null;
    return await new Response(res.stream).text();
  }

  private async quarantine(key: string, reason: string): Promise<void> {
    try {
      const dest = `${QUARANTINE_PREFIX}/${timestamp().replace(/[:.]/g, "-")}-${randomUUID().slice(0, 8)}-${key.replace(/\//g, "_")}`;
      await copy(key, dest, { access: ACCESS });
      await del(key);
      console.error(`Quarantined corrupt blob ${key} -> ${dest} (${reason})`);
    } catch (err) {
      console.error(`Failed to quarantine blob ${key}:`, err);
    }
  }

  async get<T>(key: string, validate?: (value: unknown) => boolean): Promise<T | null> {
    const content = await this.readText(key);
    if (content === null) return null;

    let parsed: unknown;
    try {
      parsed = JSON.parse(content);
    } catch (err) {
      console.error(`Corrupted JSON in blob ${key}:`, (err as Error).message);
      await this.quarantine(key, "invalid JSON");
      return null;
    }

    if (validate && !validate(parsed)) {
      console.error(`Schema validation failed for blob ${key}; skipping`);
      return null;
    }

    return parsed as T;
  }

  async put(key: string, data: unknown): Promise<void> {
    await put(key, JSON.stringify(data, null, 2), {
      access: ACCESS,
      addRandomSuffix: false,
      allowOverwrite: true,
      contentType: "application/json",
    });
  }

  async createIfAbsent(key: string): Promise<boolean> {
    try {
      await put(key, "{}", {
        access: ACCESS,
        addRandomSuffix: false,
        allowOverwrite: false,
        contentType: "application/json",
      });
      return true;
    } catch (err) {
      // allowOverwrite:false rejects when the key exists. Disambiguate a real
      // conflict from a transient error by confirming the blob is present.
      if (await this.exists(key)) return false;
      throw err;
    }
  }

  async exists(key: string): Promise<boolean> {
    try {
      await head(key);
      return true;
    } catch (err) {
      if (isNotFound(err)) return false;
      throw err;
    }
  }

  async delete(key: string): Promise<void> {
    try {
      await del(key);
    } catch (err) {
      if (!isNotFound(err)) throw err;
    }
  }

  private async listPathnames(prefix: string): Promise<string[]> {
    const pathnames: string[] = [];
    let cursor: string | undefined;
    do {
      const res = await list({ prefix, cursor, limit: 1000 });
      for (const blob of res.blobs) pathnames.push(blob.pathname);
      cursor = res.hasMore ? res.cursor : undefined;
    } while (cursor);
    return pathnames;
  }

  async deletePrefix(prefix: string): Promise<void> {
    const p = prefix.endsWith("/") ? prefix : `${prefix}/`;
    const pathnames = await this.listPathnames(p);
    // del accepts up to 1000 urls/pathnames per call.
    for (let i = 0; i < pathnames.length; i += 1000) {
      await del(pathnames.slice(i, i + 1000));
    }
  }

  async listChildren(prefix: string): Promise<string[]> {
    const p = prefix.endsWith("/") ? prefix : `${prefix}/`;
    const names = new Set<string>();
    let cursor: string | undefined;
    do {
      const res = await list({ prefix: p, mode: "folded", cursor, limit: 1000 });
      for (const blob of res.blobs) {
        const rel = blob.pathname.slice(p.length);
        if (rel && !rel.includes("/")) names.add(rel);
      }
      for (const folder of res.folders) {
        const rel = folder.slice(p.length).replace(/\/$/, "");
        if (rel) names.add(rel);
      }
      cursor = res.hasMore ? res.cursor : undefined;
    } while (cursor);
    return [...names];
  }

  async appendEvent(eventsKey: string, bucket: string, record: unknown): Promise<void> {
    // One blob per event avoids the read-modify-write race an append-to-file
    // approach would suffer on object storage.
    await put(`${eventsKey}/${bucket}/${randomUUID()}.json`, JSON.stringify(record), {
      access: ACCESS,
      addRandomSuffix: false,
      allowOverwrite: true,
      contentType: "application/json",
    });
  }

  async listEventBuckets(eventsKey: string): Promise<string[]> {
    // Buckets are the immediate subfolders of the events collection.
    return this.listChildren(eventsKey);
  }

  async readEventBucket(eventsKey: string, bucket: string): Promise<unknown[]> {
    const pathnames = await this.listPathnames(`${eventsKey}/${bucket}/`);
    const records = await Promise.all(
      pathnames.map(async (pathname) => {
        const content = await this.readText(pathname);
        if (content === null) return null;
        try {
          return JSON.parse(content);
        } catch {
          return null;
        }
      }),
    );
    return records.filter((r) => r !== null);
  }
}
