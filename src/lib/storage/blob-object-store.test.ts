import { beforeEach, describe, expect, mock, test } from "bun:test";
import type { Agent, Initiative } from "@/lib/types";

// In-memory fake of the @vercel/blob SDK surface that BlobObjectStore uses. It
// faithfully models the behaviors the code depends on: not-found semantics,
// conditional create (allowOverwrite:false), and folded prefix listing. This
// lets us validate BlobObjectStore's key/prefix translation end-to-end without a
// live Blob store.
const blobs = new Map<string, string>();

class FakeBlobNotFoundError extends Error {
  constructor() {
    super("Blob not found");
    this.name = "BlobNotFoundError";
  }
}

function toBlob(pathname: string) {
  return {
    pathname,
    url: `https://fake.blob/${pathname}`,
    downloadUrl: `https://fake.blob/${pathname}?download=1`,
    size: (blobs.get(pathname) ?? "").length,
    uploadedAt: new Date(),
    etag: "etag",
  };
}

mock.module("@vercel/blob", () => ({
  BlobNotFoundError: FakeBlobNotFoundError,
  async put(pathname: string, body: string, opts: { allowOverwrite?: boolean }) {
    if (opts?.allowOverwrite === false && blobs.has(pathname)) {
      throw new Error(`blob already exists: ${pathname}`);
    }
    blobs.set(pathname, typeof body === "string" ? body : String(body));
    return toBlob(pathname);
  },
  async get(pathname: string) {
    if (!blobs.has(pathname)) return null;
    return { statusCode: 200, stream: new Response(blobs.get(pathname)).body, headers: new Headers(), blob: toBlob(pathname) };
  },
  async head(pathname: string) {
    if (!blobs.has(pathname)) throw new FakeBlobNotFoundError();
    return toBlob(pathname);
  },
  async del(target: string | string[]) {
    for (const t of Array.isArray(target) ? target : [target]) blobs.delete(t);
  },
  async copy(from: string, to: string) {
    blobs.set(to, blobs.get(from) ?? "");
    return toBlob(to);
  },
  async list(opts: { prefix?: string; mode?: "expanded" | "folded" } = {}) {
    const prefix = opts.prefix ?? "";
    const keys = [...blobs.keys()].filter((k) => k.startsWith(prefix));
    if (opts.mode === "folded") {
      const direct: string[] = [];
      const folders = new Set<string>();
      for (const k of keys) {
        const rest = k.slice(prefix.length);
        if (rest.includes("/")) folders.add(`${prefix}${rest.split("/")[0]}/`);
        else direct.push(k);
      }
      return { blobs: direct.map(toBlob), folders: [...folders], hasMore: false, cursor: undefined };
    }
    return { blobs: keys.map(toBlob), hasMore: false, cursor: undefined };
  },
}));

const { BlobObjectStore } = await import("./blob-object-store");
const { DocumentStorage } = await import("./document-storage");

let storage: InstanceType<typeof DocumentStorage>;

beforeEach(() => {
  blobs.clear();
  storage = new DocumentStorage(new BlobObjectStore());
});

function intro(sessionKey: string) {
  return { intro: { runtime: "claude-code", sessionKey, thread: { id: sessionKey, name: sessionKey }, workingDirectory: "/tmp" } };
}

async function seed(): Promise<{ boardId: string; agent: Agent; initiative: Initiative }> {
  const board = await storage.createBoard({ name: "Board", description: "" });
  const agent = await storage.createAgent(board.id, { name: "Worker", description: "", metadata: intro("s1") });
  const initiative = await storage.createInitiative(board.id, { name: "Init", description: "" });
  return { boardId: board.id, agent, initiative };
}

describe("BlobObjectStore via DocumentStorage", () => {
  test("create/list/get round-trip through blob keys", async () => {
    const { boardId, agent, initiative } = await seed();
    const task = await storage.createTask(
      boardId,
      initiative.id,
      { title: "Do thing", description: "", assigneeAgentId: agent.id, priority: "medium", tags: [] },
      agent.id,
    );

    expect(await storage.getTask(boardId, initiative.id, task.id)).not.toBeNull();
    expect((await storage.listTasks(boardId, initiative.id)).length).toBe(1);
    expect((await storage.listInitiatives(boardId)).map((i) => i.id)).toContain(initiative.id);
    expect((await storage.listAgents(boardId)).length).toBe(1);
    // Deterministic pathname (no random suffix) at the expected key.
    expect(blobs.has(`boards/${boardId}/initiatives/${initiative.id}/tasks/${task.id}.json`)).toBe(true);
  });

  test("listChildren folding: initiatives dir yields only the .json entities", async () => {
    const { boardId, initiative } = await seed();
    // The initiative file and its subtree (tasks/plans) coexist under initiatives/.
    const initiatives = await storage.listInitiatives(boardId);
    expect(initiatives.map((i) => i.id)).toEqual([initiative.id]);
  });

  test("unique-id reservation handles colliding slugs", async () => {
    const { boardId, agent, initiative } = await seed();
    const results = await Promise.all(
      Array.from({ length: 10 }, () =>
        storage.createTask(
          boardId,
          initiative.id,
          { title: "Same", description: "", assigneeAgentId: null, priority: "medium", tags: [] },
          agent.id,
        ),
      ),
    );
    expect(new Set(results.map((t) => t.id)).size).toBe(10);
  });

  test("deleteInitiative removes the file and the whole subtree", async () => {
    const { boardId, agent, initiative } = await seed();
    await storage.createTask(
      boardId,
      initiative.id,
      { title: "T", description: "", assigneeAgentId: null, priority: "medium", tags: [] },
      agent.id,
    );
    expect(await storage.deleteInitiative(boardId, initiative.id)).toBe(true);
    const leftover = [...blobs.keys()].filter((k) => k.includes(`/initiatives/${initiative.id}`));
    expect(leftover).toEqual([]);
  });

  test("activity events are stored and listed", async () => {
    const { boardId, agent, initiative } = await seed();
    await storage.createTask(
      boardId,
      initiative.id,
      { title: "T", description: "", assigneeAgentId: null, priority: "medium", tags: [] },
      agent.id,
    );
    const activity = await storage.listActivity(boardId);
    expect(activity.map((e) => e.type)).toContain("task.created");
  });

  test("corrupt blob is quarantined and skipped on list", async () => {
    const { boardId, agent, initiative } = await seed();
    const bad = await storage.createTask(
      boardId,
      initiative.id,
      { title: "Bad", description: "", assigneeAgentId: null, priority: "medium", tags: [] },
      agent.id,
    );
    const key = `boards/${boardId}/initiatives/${initiative.id}/tasks/${bad.id}.json`;
    blobs.set(key, "{ not valid json");

    const tasks = await storage.listTasks(boardId, initiative.id);
    expect(tasks.map((t) => t.id)).not.toContain(bad.id);
    // Moved out of the tasks dir into the quarantine prefix.
    expect(blobs.has(key)).toBe(false);
    expect([...blobs.keys()].some((k) => k.startsWith(".quarantine/"))).toBe(true);
  });

  test("getBoardSummary counts via blob backend", async () => {
    const { boardId } = await seed();
    const summary = await storage.getBoardSummary(boardId);
    expect(summary?.agentCount).toBe(1);
    expect(summary?.initiativeCount).toBe(1);
  });
});
