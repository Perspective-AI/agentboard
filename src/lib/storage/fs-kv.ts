import { appendFile, mkdir, readdir, readFile, rename, rm, writeFile } from "fs/promises";
import { existsSync } from "fs";
import path from "path";
import { randomUUID } from "crypto";
import { getDataDir } from "@/lib/server-utils";
import { timestamp } from "@/lib/utils";
import type { KvStore } from "./kv";

function hasErrnoCode(err: unknown, code: string): boolean {
  return typeof err === "object" && err !== null && "code" in err && (err as { code: string }).code === code;
}

// --- Per-file write serialization ---
// Concurrent writers to the same path must not interleave their write+rename
// sequences. We chain operations per absolute path so each observes a
// consistent on-disk state; stale entries are pruned once their tail settles.
const fileWriteQueues = new Map<string, Promise<unknown>>();

function withFileLock<T>(key: string, fn: () => Promise<T>): Promise<T> {
  const previous = fileWriteQueues.get(key) ?? Promise.resolve();
  const run = previous.then(fn, fn);
  const settled = run.then(
    () => undefined,
    () => undefined,
  );
  fileWriteQueues.set(key, settled);
  void settled.then(() => {
    if (fileWriteQueues.get(key) === settled) {
      fileWriteQueues.delete(key);
    }
  });
  return run;
}

function quarantineDir(): string {
  return path.join(getDataDir(), ".quarantine");
}

async function quarantineFile(filePath: string, reason: string): Promise<void> {
  try {
    const dir = quarantineDir();
    await mkdir(dir, { recursive: true });
    const stamp = timestamp().replace(/[:.]/g, "-");
    const dest = path.join(dir, `${stamp}-${randomUUID().slice(0, 8)}-${path.basename(filePath)}`);
    await rename(filePath, dest);
    console.error(`Quarantined corrupt file ${filePath} -> ${dest} (${reason})`);
  } catch (err) {
    console.error(`Failed to quarantine ${filePath}:`, err);
  }
}

/**
 * Filesystem-backed KvStore. Keys are POSIX-relative paths mapped under the
 * configured data dir. Suitable for local / self-hosted use; provides atomic
 * writes, per-path serialization, and corrupt-file quarantine.
 */
export class FsKvStore implements KvStore {
  private abs(key: string): string {
    return path.join(getDataDir(), key);
  }

  async get<T>(key: string, validate?: (value: unknown) => boolean): Promise<T | null> {
    const filePath = this.abs(key);
    let content: string;
    try {
      content = await readFile(filePath, "utf-8");
    } catch (err: unknown) {
      if (hasErrnoCode(err, "ENOENT")) return null;
      throw err;
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(content);
    } catch (err) {
      console.error(`Corrupted JSON in ${filePath}:`, (err as Error).message);
      await quarantineFile(filePath, "invalid JSON");
      return null;
    }

    if (validate && !validate(parsed)) {
      console.error(`Schema validation failed for ${filePath}; skipping`);
      return null;
    }

    return parsed as T;
  }

  async put(key: string, data: unknown): Promise<void> {
    const filePath = this.abs(key);
    await withFileLock(filePath, async () => {
      await mkdir(path.dirname(filePath), { recursive: true });
      // Unique temp path per write so concurrent writers never share a stager.
      const tmpPath = `${filePath}.${process.pid}.${randomUUID()}.tmp`;
      try {
        await writeFile(tmpPath, JSON.stringify(data, null, 2), "utf-8");
        await rename(tmpPath, filePath);
      } catch (err) {
        await rm(tmpPath, { force: true }).catch(() => {});
        throw err;
      }
    });
  }

  async createIfAbsent(key: string): Promise<boolean> {
    const filePath = this.abs(key);
    await mkdir(path.dirname(filePath), { recursive: true });
    try {
      // O_CREAT|O_EXCL: fail if the file already exists — eliminates TOCTOU race.
      await writeFile(filePath, "{}", { flag: "wx" });
      return true;
    } catch (err: unknown) {
      if (hasErrnoCode(err, "EEXIST")) return false;
      throw err;
    }
  }

  async exists(key: string): Promise<boolean> {
    return existsSync(this.abs(key));
  }

  async delete(key: string): Promise<void> {
    await rm(this.abs(key), { force: true });
  }

  async deletePrefix(prefix: string): Promise<void> {
    await rm(this.abs(prefix), { recursive: true, force: true });
  }

  async listChildren(prefix: string): Promise<string[]> {
    try {
      return await readdir(this.abs(prefix));
    } catch {
      return [];
    }
  }

  private eventFile(eventsKey: string, bucket: string): string {
    return this.abs(`${eventsKey}/${bucket}.ndjson`);
  }

  async appendEvent(eventsKey: string, bucket: string, record: unknown): Promise<void> {
    const filePath = this.eventFile(eventsKey, bucket);
    // Serialize appends to the same daily file so concurrent events cannot
    // interleave partial lines.
    await withFileLock(filePath, async () => {
      await mkdir(path.dirname(filePath), { recursive: true });
      await appendFile(filePath, `${JSON.stringify(record)}\n`, "utf-8");
    });
  }

  async listEventBuckets(eventsKey: string): Promise<string[]> {
    const files = await this.listChildren(eventsKey);
    return files.filter((name) => name.endsWith(".ndjson")).map((name) => name.slice(0, -".ndjson".length));
  }

  async readEventBucket(eventsKey: string, bucket: string): Promise<unknown[]> {
    const content = await readFile(this.eventFile(eventsKey, bucket), "utf-8").catch(() => "");
    if (!content) return [];
    const records: unknown[] = [];
    for (const line of content.split("\n").filter(Boolean)) {
      try {
        records.push(JSON.parse(line));
      } catch {
        // Skip malformed lines and continue.
      }
    }
    return records;
  }
}
