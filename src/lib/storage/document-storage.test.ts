import { beforeEach, describe, expect, test } from "bun:test";
import { DocumentStorage } from "./document-storage";
import { InMemoryObjectStore } from "./memory-object-store";
import type { Agent, Initiative } from "@/lib/types";

// Exercises the backend-agnostic business logic against an in-memory ObjectStore.
// The same DocumentStorage runs on FsObjectStore (local) and BlobObjectStore (prod), so
// these guarantees hold for every backend.
let storage: DocumentStorage;

beforeEach(() => {
  storage = new DocumentStorage(new InMemoryObjectStore());
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

describe("DocumentStorage core flow", () => {
  test("create/list/get board, initiative, task round-trip", async () => {
    const { boardId, agent, initiative } = await seed();
    const task = await storage.createTask(
      boardId,
      initiative.id,
      { title: "Do thing", description: "", assigneeAgentId: agent.id, priority: "high", tags: ["x"] },
      agent.id,
    );
    expect(task.assigneeAgentIds).toEqual([agent.id]);

    const fetched = await storage.getTask(boardId, initiative.id, task.id);
    expect(fetched?.title).toBe("Do thing");

    const boards = await storage.listBoards();
    expect(boards.map((b) => b.id)).toContain(boardId);

    const tasks = await storage.listTasks(boardId, initiative.id);
    expect(tasks.length).toBe(1);
  });

  test("concurrent identical-title creates get unique ids", async () => {
    const { boardId, agent, initiative } = await seed();
    const results = await Promise.all(
      Array.from({ length: 20 }, () =>
        storage.createTask(
          boardId,
          initiative.id,
          { title: "Same", description: "", assigneeAgentId: null, priority: "medium", tags: [] },
          agent.id,
        ),
      ),
    );
    expect(new Set(results.map((t) => t.id)).size).toBe(20);
    expect((await storage.listTasks(boardId, initiative.id)).length).toBe(20);
  });

  test("status change to in_progress wires up the agent pointer", async () => {
    const { boardId, agent, initiative } = await seed();
    const task = await storage.createTask(
      boardId,
      initiative.id,
      { title: "T", description: "", assigneeAgentId: agent.id, priority: "medium", tags: [] },
      agent.id,
    );
    await storage.updateTask(boardId, initiative.id, task.id, { status: "in_progress" }, agent.id);
    const after = await storage.getAgent(boardId, agent.id);
    expect(after?.currentTaskId).toBe(task.id);
    expect(after?.currentInitiativeId).toBe(initiative.id);
  });

  test("deleting an initiative removes its task subtree", async () => {
    const { boardId, agent, initiative } = await seed();
    await storage.createTask(
      boardId,
      initiative.id,
      { title: "T", description: "", assigneeAgentId: null, priority: "medium", tags: [] },
      agent.id,
    );
    expect(await storage.deleteInitiative(boardId, initiative.id)).toBe(true);
    expect(await storage.getInitiative(boardId, initiative.id)).toBeNull();
    expect(await storage.listTasks(boardId, initiative.id)).toEqual([]);
  });

  test("duplicate agent name/session are rejected", async () => {
    const board = await storage.createBoard({ name: "B", description: "" });
    await storage.createAgent(board.id, { name: "Dup", description: "", metadata: intro("k1") });
    await expect(
      storage.createAgent(board.id, { name: "Dup", description: "", metadata: intro("k2") }),
    ).rejects.toThrow(/already exists/);
  });

  test("activity log records and lists events newest-first", async () => {
    const { boardId, agent, initiative } = await seed();
    await storage.createTask(
      boardId,
      initiative.id,
      { title: "T", description: "", assigneeAgentId: null, priority: "medium", tags: [] },
      agent.id,
    );
    const activity = await storage.listActivity(boardId);
    const types = activity.map((e) => e.type);
    expect(types).toContain("task.created");
    expect(types).toContain("agent.registered");
  });

  test("getBoardSummary counts entities and isolates a failing section", async () => {
    const { boardId } = await seed();

    const summary = await storage.getBoardSummary(boardId);
    expect(summary?.agentCount).toBe(1);
    expect(summary?.initiativeCount).toBe(1);

    class Broken extends DocumentStorage {
      async listAllBoardTasks(): Promise<never> {
        throw new Error("boom");
      }
    }
    const broken = new Broken(new InMemoryObjectStore());
    const b = await broken.createBoard({ name: "B2", description: "" });
    const brokenSummary = await broken.getBoardSummary(b.id);
    expect(brokenSummary).not.toBeNull();
    expect(brokenSummary!.taskCount).toBe(0);
  });
});
