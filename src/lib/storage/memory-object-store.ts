import type { ObjectStore } from "./object-store";

/**
 * In-memory ObjectStore. Not for production — used to exercise DocumentStorage's
 * business logic independently of any real backend.
 */
export class InMemoryObjectStore implements ObjectStore {
  private store = new Map<string, string>();

  async get<T>(key: string, validate?: (value: unknown) => boolean): Promise<T | null> {
    const raw = this.store.get(key);
    if (raw === undefined) return null;
    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      this.store.delete(key);
      return null;
    }
    if (validate && !validate(parsed)) return null;
    return parsed as T;
  }

  async put(key: string, data: unknown): Promise<void> {
    this.store.set(key, JSON.stringify(data));
  }

  async createIfAbsent(key: string): Promise<boolean> {
    if (this.store.has(key)) return false;
    this.store.set(key, "{}");
    return true;
  }

  async exists(key: string): Promise<boolean> {
    return this.store.has(key);
  }

  async delete(key: string): Promise<void> {
    this.store.delete(key);
  }

  async deletePrefix(prefix: string): Promise<void> {
    const p = prefix.endsWith("/") ? prefix : `${prefix}/`;
    for (const key of [...this.store.keys()]) {
      if (key.startsWith(p)) this.store.delete(key);
    }
  }

  async listChildren(prefix: string): Promise<string[]> {
    const p = prefix.endsWith("/") ? prefix : `${prefix}/`;
    const names = new Set<string>();
    for (const key of this.store.keys()) {
      if (!key.startsWith(p)) continue;
      const segment = key.slice(p.length).split("/")[0];
      if (segment) names.add(segment);
    }
    return [...names];
  }

  async appendEvent(eventsKey: string, bucket: string, record: unknown): Promise<void> {
    this.store.set(`${eventsKey}/${bucket}/${this.store.size}-${Math.random().toString(36).slice(2)}`, JSON.stringify(record));
  }

  async listEventBuckets(eventsKey: string): Promise<string[]> {
    return this.listChildren(eventsKey);
  }

  async readEventBucket(eventsKey: string, bucket: string): Promise<unknown[]> {
    const p = `${eventsKey}/${bucket}/`;
    const records: unknown[] = [];
    for (const [key, raw] of this.store.entries()) {
      if (!key.startsWith(p)) continue;
      try {
        records.push(JSON.parse(raw));
      } catch {
        // skip
      }
    }
    return records;
  }
}
