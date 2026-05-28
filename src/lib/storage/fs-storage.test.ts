import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { mkdtemp, readdir, readFile, rm, writeFile } from "fs/promises";
import os from "os";
import path from "path";
import { FsStorage } from "./fs-storage";
import type { Agent, Initiative } from "@/lib/types";

// Each test runs against a throwaway data dir. getDataDir() reads the env var
// lazily on every call, so setting it here fully isolates the storage tree.
let dataDir: string;
let storage: FsStorage;

beforeEach(async () => {
  dataDir = await mkdtemp(path.join(os.tmpdir(), "agentboard-test-"));
  process.env.AGENTBOARD_DATA_DIR = dataDir;
  storage = new FsStorage();
});

afterEach(async () => {
  delete process.env.AGENTBOARD_DATA_DIR;
  await rm(dataDir, { recursive: true, force: true });
});

function agentIntro(sessionKey: string) {
  return {
    intro: {
      runtime: "claude-code",
      sessionKey,
      thread: { id: `thread-${sessionKey}`, name: `thread-${sessionKey}` },
      workingDirectory: "/tmp",
    },
  };
}

async function seedBoard(): Promise<{ boardId: string; agent: Agent; initiative: Initiative }> {
  const board = await storage.createBoard({ name: "Concurrency Board", description: "" });
  const agent = await storage.createAgent(board.id, {
    name: "Worker Agent",
    description: "",
    metadata: agentIntro("session-1"),
  });
  const initiative = await storage.createInitiative(board.id, { name: "Initiative", description: "" });
  return { boardId: board.id, agent, initiative };
}

function tasksDirPath(boardId: string, initiativeId: string): string {
  return path.join(dataDir, "boards", boardId, "initiatives", initiativeId, "tasks");
}

describe("concurrent writes", () => {
  test("concurrent creates with identical titles produce unique ids and valid files", async () => {
    const { boardId, agent, initiative } = await seedBoard();

    const count = 30;
    const results = await Promise.all(
      Array.from({ length: count }, () =>
        storage.createTask(
          boardId,
          initiative.id,
          { title: "Same Title", description: "", assigneeAgentId: null, priority: "medium", tags: [] },
          agent.id,
        ),
      ),
    );

    // Every concurrent create resolved to a distinct id despite colliding slugs.
    const ids = new Set(results.map((t) => t.id));
    expect(ids.size).toBe(count);

    // All files are present, valid JSON, and round-trip through listTasks.
    const tasks = await storage.listTasks(boardId, initiative.id);
    expect(tasks.length).toBe(count);

    // No torn temp files left behind by the unique-temp-path write protocol.
    const dirEntries = await readdir(tasksDirPath(boardId, initiative.id));
    expect(dirEntries.every((name) => name.endsWith(".json"))).toBe(true);
    expect(dirEntries.some((name) => name.includes(".tmp"))).toBe(false);

    // Each file parses cleanly — no interleaved/corrupt writes.
    for (const name of dirEntries) {
      const raw = await readFile(path.join(tasksDirPath(boardId, initiative.id), name), "utf-8");
      expect(() => JSON.parse(raw)).not.toThrow();
    }
  });

  test("concurrent updates to the same file never corrupt it", async () => {
    const { boardId, agent, initiative } = await seedBoard();
    const task = await storage.createTask(
      boardId,
      initiative.id,
      { title: "Hot Task", description: "v0", assigneeAgentId: null, priority: "medium", tags: [] },
      agent.id,
    );

    const updates = 40;
    await Promise.all(
      Array.from({ length: updates }, (_, i) =>
        storage.updateTask(boardId, initiative.id, task.id, { description: `v${i}` }, agent.id),
      ),
    );

    // The serialized writes leave a single, valid, parseable final state.
    const filePath = path.join(tasksDirPath(boardId, initiative.id), `${task.id}.json`);
    const raw = await readFile(filePath, "utf-8");
    const parsed = JSON.parse(raw);
    expect(parsed.id).toBe(task.id);
    expect(String(parsed.description)).toMatch(/^v\d+$/);

    const final = await storage.getTask(boardId, initiative.id, task.id);
    expect(final).not.toBeNull();

    // No leftover temp files for the contended path.
    const dirEntries = await readdir(tasksDirPath(boardId, initiative.id));
    expect(dirEntries.some((name) => name.includes(".tmp"))).toBe(false);
  });
});

describe("corrupt-file handling", () => {
  test("unparseable file is quarantined and excluded, list still works", async () => {
    const { boardId, agent, initiative } = await seedBoard();
    const good = await storage.createTask(
      boardId,
      initiative.id,
      { title: "Good", description: "", assigneeAgentId: null, priority: "medium", tags: [] },
      agent.id,
    );

    // Corrupt a second task file with non-JSON bytes.
    const bad = await storage.createTask(
      boardId,
      initiative.id,
      { title: "Bad", description: "", assigneeAgentId: null, priority: "medium", tags: [] },
      agent.id,
    );
    const badPath = path.join(tasksDirPath(boardId, initiative.id), `${bad.id}.json`);
    await writeFile(badPath, "{ this is : not valid json", "utf-8");

    // Listing must not throw and must skip the corrupt entry.
    const tasks = await storage.listTasks(boardId, initiative.id);
    const listedIds = tasks.map((t) => t.id);
    expect(listedIds).toContain(good.id);
    expect(listedIds).not.toContain(bad.id);

    // The corrupt file was moved out of the tasks dir into quarantine.
    const remaining = await readdir(tasksDirPath(boardId, initiative.id));
    expect(remaining).not.toContain(`${bad.id}.json`);

    const quarantined = await readdir(path.join(dataDir, ".quarantine"));
    expect(quarantined.length).toBeGreaterThan(0);
    expect(quarantined.some((name) => name.includes(`${bad.id}.json`))).toBe(true);
  });

  test("parseable-but-invalid record is skipped without quarantine", async () => {
    const { boardId, agent, initiative } = await seedBoard();
    await storage.createTask(
      boardId,
      initiative.id,
      { title: "Keeper", description: "", assigneeAgentId: null, priority: "medium", tags: [] },
      agent.id,
    );

    // Valid JSON but missing the `id` field — e.g. an in-flight reservation
    // placeholder. It should be skipped, not destroyed.
    const strayPath = path.join(tasksDirPath(boardId, initiative.id), "stray.json");
    await writeFile(strayPath, JSON.stringify({ description: "no id here" }), "utf-8");

    const tasks = await storage.listTasks(boardId, initiative.id);
    expect(tasks.length).toBe(1);

    // The stray file is left in place (no quarantine for schema mismatches).
    const remaining = await readdir(tasksDirPath(boardId, initiative.id));
    expect(remaining).toContain("stray.json");
  });

  test("record missing sort key (createdAt) does not crash listing", async () => {
    const { boardId, agent, initiative } = await seedBoard();
    const real = await storage.createTask(
      boardId,
      initiative.id,
      { title: "Real", description: "", assigneeAgentId: null, priority: "medium", tags: [] },
      agent.id,
    );

    // A record with an id but no createdAt would break a naive localeCompare sort.
    const partialPath = path.join(tasksDirPath(boardId, initiative.id), "partial.json");
    await writeFile(partialPath, JSON.stringify({ id: "partial", title: "Partial" }), "utf-8");

    const tasks = await storage.listTasks(boardId, initiative.id);
    const ids = tasks.map((t) => t.id);
    expect(ids).toContain(real.id);
    expect(ids).toContain("partial");
  });
});

describe("crash resilience — section isolation", () => {
  test("getBoardSummary survives a failing section", async () => {
    const { boardId } = await seedBoard();

    // Subclass that simulates a section blowing up at read time.
    class BrokenStorage extends FsStorage {
      async listAllBoardTasks(): Promise<never> {
        throw new Error("simulated tasks-section failure");
      }
    }
    const broken = new BrokenStorage();

    const summary = await broken.getBoardSummary(boardId);
    expect(summary).not.toBeNull();
    // The failing section falls back to 0 while the rest is still computed.
    expect(summary!.taskCount).toBe(0);
    expect(summary!.agentCount).toBe(1);
    expect(summary!.initiativeCount).toBe(1);
  });
});
