import { appendFile, mkdir, readdir, readFile, rm, writeFile } from "fs/promises";
import { existsSync } from "fs";
import path from "path";
import { randomUUID } from "crypto";
import type {
  ActivityEvent,
  Agent,
  Board,
  BoardSummary,
  Initiative,
  Plan,
  PlanStep,
  Project,
  Task,
  TaskStatus,
} from "@/lib/types";
import type { Storage } from "./index";
import { getDataDir, slugify, timestamp } from "@/lib/utils";

type AgentIntro = {
  runtime: string;
  sessionKey: string;
  model: string;
  thread: {
    id: string;
    name: string;
    source?: string;
  };
  workingDirectory: string;
  host?: {
    hostname: string;
    localIp: string;
  };
};

export class AgentRegistrationError extends Error {
  code: string;

  constructor(code: string, message: string) {
    super(message);
    this.name = "AgentRegistrationError";
    this.code = code;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function normalizeAgentName(name: string): string {
  return name.trim();
}

function canonicalAgentName(name: string): string {
  return normalizeAgentName(name).toLowerCase();
}

function normalizeText(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function inferModelFromRuntime(runtime: string): string {
  const key = runtime.toLowerCase();
  if (key.includes("codex") || key.includes("openai")) return "codex";
  if (key.includes("claude") || key.includes("anthropic")) return "claude";
  if (key.includes("cursor")) return "cursor";
  return "unknown-model";
}

function extractThreadContext(intro: Record<string, unknown>): AgentIntro["thread"] | null {
  const threadRaw = intro.thread;

  if (typeof threadRaw === "string") {
    const id = normalizeText(threadRaw);
    const name = normalizeText(intro.threadName) || id;
    if (!id) return null;
    return { id, name };
  }

  if (!isRecord(threadRaw)) return null;

  const id = normalizeText(threadRaw.id) || normalizeText(intro.threadId);
  const name = normalizeText(threadRaw.name) || normalizeText(intro.threadName) || id;
  const source = normalizeText(threadRaw.source);
  if (!id) return null;
  return source ? { id, name, source } : { id, name };
}

function extractAgentIntro(metadata: unknown): AgentIntro | null {
  if (!isRecord(metadata)) return null;
  const intro = metadata.intro;
  if (!isRecord(intro)) return null;

  const runtime = normalizeText(intro.runtime) || "unknown-runtime";
  const sessionKey = normalizeText(intro.sessionKey) || normalizeText(intro.instanceKey);
  const model = normalizeText(intro.model) || inferModelFromRuntime(runtime);
  const thread =
    extractThreadContext(intro) ||
    (() => {
      const fallbackId = normalizeText(intro.threadId) || "unknown-thread";
      const fallbackName = normalizeText(intro.threadName) || fallbackId;
      return { id: fallbackId, name: fallbackName, source: runtime };
    })();
  const workingDirectory = normalizeText(intro.workingDirectory) || "unknown-working-directory";
  const hostRaw = isRecord(intro.host) ? intro.host : {};
  const hostHostname = normalizeText(hostRaw.hostname);
  const hostLocalIp = normalizeText(hostRaw.localIp);
  const host =
    hostHostname || hostLocalIp
      ? {
          hostname: hostHostname || "unknown-host",
          localIp: hostLocalIp || "unknown-local-ip",
        }
      : undefined;

  if (!sessionKey) return null;
  return { runtime, sessionKey, model, thread, workingDirectory, host };
}

async function readJson<T>(filePath: string): Promise<T | null> {
  try {
    const content = await readFile(filePath, "utf-8");
    return JSON.parse(content) as T;
  } catch {
    return null;
  }
}

async function writeJson(filePath: string, data: unknown): Promise<void> {
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, JSON.stringify(data, null, 2), "utf-8");
}

async function listDir(dirPath: string): Promise<string[]> {
  try {
    return await readdir(dirPath);
  } catch {
    return [];
  }
}

function boardDir(boardId: string): string {
  return path.join(getDataDir(), "boards", boardId);
}

function agentsDir(boardId: string): string {
  return path.join(boardDir(boardId), "agents");
}

function initiativesDir(boardId: string): string {
  return path.join(boardDir(boardId), "initiatives");
}

function initiativeFile(boardId: string, initiativeId: string): string {
  return path.join(initiativesDir(boardId), `${initiativeId}.json`);
}

function tasksDir(boardId: string, initiativeId: string): string {
  return path.join(initiativesDir(boardId), initiativeId, "tasks");
}

function taskFile(boardId: string, initiativeId: string, taskId: string): string {
  return path.join(tasksDir(boardId, initiativeId), `${taskId}.json`);
}

function plansDir(boardId: string, initiativeId: string): string {
  return path.join(initiativesDir(boardId), initiativeId, "plans");
}

function planFile(boardId: string, initiativeId: string, planId: string): string {
  return path.join(plansDir(boardId, initiativeId), `${planId}.json`);
}

function planStepsDir(boardId: string, initiativeId: string, planId: string): string {
  return path.join(plansDir(boardId, initiativeId), planId, "steps");
}

function planStepFile(boardId: string, initiativeId: string, planId: string, stepId: string): string {
  return path.join(planStepsDir(boardId, initiativeId, planId), `${stepId}.json`);
}

function eventsDir(boardId: string): string {
  return path.join(boardDir(boardId), "events");
}

function legacyProjectsDir(boardId: string): string {
  return path.join(boardDir(boardId), "projects");
}

function migrationMarkerFile(boardId: string): string {
  return path.join(boardDir(boardId), ".migration-v2.json");
}

async function resolveUniqueId(filePathForId: (id: string) => string, desiredId: string): Promise<string> {
  let candidate = desiredId;
  let counter = 2;
  while (existsSync(filePathForId(candidate))) {
    candidate = `${desiredId}-${counter}`;
    counter += 1;
  }
  return candidate;
}

function normalizeAssignees(task: Partial<Task>): string[] {
  if (task.assigneeAgentIds && task.assigneeAgentIds.length > 0) {
    return Array.from(new Set(task.assigneeAgentIds.filter(Boolean)));
  }
  if (task.assigneeAgentId) {
    return [task.assigneeAgentId];
  }
  return [];
}

function normalizeTask(task: Task, fallbackInitiativeId?: string): Task {
  const initiativeId = task.initiativeId || task.projectId || fallbackInitiativeId || "general";
  const assigneeAgentIds = normalizeAssignees(task);
  const assigneeAgentId = task.assigneeAgentId || assigneeAgentIds[0] || null;

  return {
    ...task,
    initiativeId,
    projectId: task.projectId || initiativeId,
    planId: task.planId || null,
    planStepId: task.planStepId || null,
    assigneeAgentId,
    assigneeAgentIds,
    deliverables: task.deliverables || [],
  };
}

export class FsStorage implements Storage {
  private initializedBoards = new Set<string>();
  private initializingBoards = new Map<string, Promise<void>>();

  private async ensureBoardStructure(boardId: string): Promise<void> {
    if (this.initializedBoards.has(boardId)) return;
    const existingInit = this.initializingBoards.get(boardId);
    if (existingInit) {
      await existingInit;
      return;
    }

    const initPromise = (async () => {
      await mkdir(agentsDir(boardId), { recursive: true });
      await mkdir(initiativesDir(boardId), { recursive: true });
      await mkdir(eventsDir(boardId), { recursive: true });

      await this.migrateLegacyProjects(boardId);
      this.initializedBoards.add(boardId);
    })();

    this.initializingBoards.set(boardId, initPromise);
    try {
      await initPromise;
    } finally {
      this.initializingBoards.delete(boardId);
    }
  }

  private async migrateLegacyProjects(boardId: string): Promise<void> {
    if (existsSync(migrationMarkerFile(boardId))) return;

    const projectIds = await listDir(legacyProjectsDir(boardId));
    if (projectIds.length === 0) {
      await writeJson(migrationMarkerFile(boardId), { version: 2, migratedAt: timestamp(), migratedProjects: 0 });
      return;
    }

    let migratedProjects = 0;
    let migratedTasks = 0;

    for (const projectId of projectIds) {
      const legacyProjectPath = path.join(legacyProjectsDir(boardId), projectId, "project.json");
      const legacyProject = await readJson<Project>(legacyProjectPath);
      if (!legacyProject) continue;

      const nextInitiative: Initiative = {
        id: legacyProject.id,
        boardId,
        name: legacyProject.name,
        description: legacyProject.description || "",
        status: "active",
        kind: "general",
        assigneeAgentIds: [],
        createdAt: legacyProject.createdAt || timestamp(),
        updatedAt: legacyProject.updatedAt || legacyProject.createdAt || timestamp(),
      };

      if (!existsSync(initiativeFile(boardId, projectId))) {
        await writeJson(initiativeFile(boardId, projectId), nextInitiative);
      }

      const legacyTaskDir = path.join(legacyProjectsDir(boardId), projectId, "tasks");
      const taskFiles = await listDir(legacyTaskDir);

      for (const taskName of taskFiles) {
        if (!taskName.endsWith(".json")) continue;
        const legacyTask = await readJson<Task>(path.join(legacyTaskDir, taskName));
        if (!legacyTask) continue;

        const normalized = normalizeTask(legacyTask, projectId);
        const nextTaskPath = taskFile(boardId, projectId, normalized.id);
        if (!existsSync(nextTaskPath)) {
          await writeJson(nextTaskPath, normalized);
          migratedTasks += 1;
        }
      }

      migratedProjects += 1;
    }

    await writeJson(migrationMarkerFile(boardId), {
      version: 2,
      migratedAt: timestamp(),
      migratedProjects,
      migratedTasks,
    });

    await this.appendActivity(
      boardId,
      {
        type: "system.migration.v2",
        message: `Migrated ${migratedProjects} legacy project(s) and ${migratedTasks} task(s) to initiatives`,
        payload: { migratedProjects, migratedTasks },
      },
      { skipEnsure: true },
    );
  }

  private async appendActivity(
    boardId: string,
    event: Omit<ActivityEvent, "id" | "boardId" | "createdAt">,
    options?: { skipEnsure?: boolean },
  ): Promise<ActivityEvent> {
    if (!options?.skipEnsure) {
      await this.ensureBoardStructure(boardId);
    }

    const createdAt = timestamp();
    const activity: ActivityEvent = {
      id: randomUUID(),
      boardId,
      createdAt,
      ...event,
    };

    const dailyFile = path.join(eventsDir(boardId), `${createdAt.slice(0, 10)}.ndjson`);
    await mkdir(eventsDir(boardId), { recursive: true });
    await appendFile(dailyFile, `${JSON.stringify(activity)}\n`, "utf-8");

    return activity;
  }

  private async writeAgent(boardId: string, agent: Agent): Promise<void> {
    await writeJson(path.join(agentsDir(boardId), `${agent.id}.json`), agent);
  }

  private async requireRegisteredAgent(boardId: string, agentId: string): Promise<Agent> {
    const agent = await this.getAgent(boardId, agentId);
    if (!agent) {
      throw new Error(`Agent not registered: ${agentId}`);
    }
    return agent;
  }

  private async syncAgentPointersForTask(boardId: string, task: Task): Promise<void> {
    const assignees = normalizeAssignees(task);

    if (task.status === "in_progress") {
      for (const agentId of assignees) {
        const agent = await this.getAgent(boardId, agentId);
        if (!agent) continue;
        const updated: Agent = {
          ...agent,
          currentTaskId: task.id,
          currentInitiativeId: task.initiativeId,
          lastHeartbeat: timestamp(),
        };
        await this.writeAgent(boardId, updated);
      }
      return;
    }

    const agents = await this.listAgents(boardId);
    for (const agent of agents) {
      if (agent.currentTaskId !== task.id || agent.currentInitiativeId !== task.initiativeId) {
        continue;
      }
      const cleared: Agent = {
        ...agent,
        currentTaskId: null,
        currentInitiativeId: null,
        lastHeartbeat: timestamp(),
      };
      await this.writeAgent(boardId, cleared);
    }
  }

  // --- Boards ---

  async createBoard(data: Pick<Board, "name" | "description">): Promise<Board> {
    const id = slugify(data.name);
    const now = timestamp();
    const board: Board = {
      id,
      name: data.name,
      description: data.description || "",
      createdAt: now,
      updatedAt: now,
    };

    await mkdir(agentsDir(id), { recursive: true });
    await mkdir(initiativesDir(id), { recursive: true });
    await mkdir(eventsDir(id), { recursive: true });
    await writeJson(path.join(boardDir(id), "board.json"), board);

    return board;
  }

  async listBoards(): Promise<Board[]> {
    const boardsDir = path.join(getDataDir(), "boards");
    const dirs = await listDir(boardsDir);
    const boards: Board[] = [];

    for (const d of dirs) {
      const board = await readJson<Board>(path.join(boardsDir, d, "board.json"));
      if (board) boards.push(board);
    }

    return boards.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  async getBoard(boardId: string): Promise<Board | null> {
    return readJson<Board>(path.join(boardDir(boardId), "board.json"));
  }

  async getBoardSummary(boardId: string): Promise<BoardSummary | null> {
    await this.ensureBoardStructure(boardId);

    const board = await this.getBoard(boardId);
    if (!board) return null;

    const agents = await this.listAgents(boardId);
    const initiatives = await this.listInitiatives(boardId);
    const tasks = await this.listAllBoardTasks(boardId);
    let planCount = 0;
    let planStepCount = 0;
    for (const initiative of initiatives) {
      const plans = await this.listPlans(boardId, initiative.id);
      planCount += plans.length;
      for (const plan of plans) {
        const steps = await this.listPlanSteps(boardId, initiative.id, plan.id);
        planStepCount += steps.length;
      }
    }

    return {
      ...board,
      agentCount: agents.length,
      initiativeCount: initiatives.length,
      planCount,
      planStepCount,
      projectCount: initiatives.length,
      taskCount: tasks.length,
    };
  }

  async updateBoard(boardId: string, data: Partial<Pick<Board, "name" | "description">>): Promise<Board | null> {
    await this.ensureBoardStructure(boardId);

    const board = await this.getBoard(boardId);
    if (!board) return null;

    const updated = { ...board, ...data, updatedAt: timestamp() };
    await writeJson(path.join(boardDir(boardId), "board.json"), updated);

    await this.appendActivity(boardId, {
      type: "board.updated",
      message: "Board details updated",
      payload: { fields: Object.keys(data) },
    });

    return updated;
  }

  async deleteBoard(boardId: string): Promise<boolean> {
    const dir = boardDir(boardId);
    if (!existsSync(dir)) return false;
    await rm(dir, { recursive: true });
    this.initializedBoards.delete(boardId);
    return true;
  }

  // --- Agents ---

  async createAgent(boardId: string, data: Pick<Agent, "name" | "description" | "metadata">): Promise<Agent> {
    await this.ensureBoardStructure(boardId);

    const name = normalizeAgentName(data.name || "");
    if (!name) {
      throw new AgentRegistrationError("MISSING_NAME", "Agent name is required");
    }

    const id = slugify(name);
    if (!id) {
      throw new AgentRegistrationError("INVALID_NAME", "Agent name must contain at least one letter or number");
    }

    const metadata = isRecord(data.metadata) ? data.metadata : {};
    const intro = extractAgentIntro(metadata);
    if (!intro) {
      throw new AgentRegistrationError(
        "INVALID_AGENT_INTRO",
        "Agent intro metadata requires sessionKey (runtime/model/thread/workingDirectory are auto-detected or defaulted)",
      );
    }

    const existingById = await this.getAgent(boardId, id);
    if (existingById) {
      throw new AgentRegistrationError("AGENT_ID_CONFLICT", `Agent id already exists: ${id}`);
    }

    const existingAgents = await this.listAgents(boardId);
    const desiredName = canonicalAgentName(name);
    for (const existing of existingAgents) {
      if (canonicalAgentName(existing.name) === desiredName) {
        throw new AgentRegistrationError("AGENT_NAME_CONFLICT", `Agent name already exists: ${name}`);
      }
      const existingIntro = extractAgentIntro(existing.metadata);
      if (existingIntro?.sessionKey === intro.sessionKey) {
        throw new AgentRegistrationError("AGENT_KEY_CONFLICT", `Agent key already exists: ${intro.sessionKey}`);
      }
    }

    const now = timestamp();

    const agent: Agent = {
      id,
      boardId,
      name,
      description: data.description || "",
      status: "idle",
      statusMessage: "",
      currentTaskId: null,
      currentInitiativeId: null,
      metadata,
      registeredAt: now,
      lastHeartbeat: now,
    };

    await this.writeAgent(boardId, agent);

    await this.appendActivity(boardId, {
      type: "agent.registered",
      message: `Agent ${agent.name} registered`,
      agentId: agent.id,
    });

    return agent;
  }

  async listAgents(boardId: string): Promise<Agent[]> {
    await this.ensureBoardStructure(boardId);

    const files = await listDir(agentsDir(boardId));
    const agents: Agent[] = [];

    for (const f of files) {
      if (!f.endsWith(".json")) continue;
      const agent = await readJson<Agent>(path.join(agentsDir(boardId), f));
      if (!agent) continue;

      agents.push({
        ...agent,
        currentInitiativeId: agent.currentInitiativeId || null,
      });
    }

    return agents.sort((a, b) => a.name.localeCompare(b.name));
  }

  async getAgent(boardId: string, agentId: string): Promise<Agent | null> {
    await this.ensureBoardStructure(boardId);

    const agent = await readJson<Agent>(path.join(agentsDir(boardId), `${agentId}.json`));
    if (!agent) return null;

    return {
      ...agent,
      currentInitiativeId: agent.currentInitiativeId || null,
    };
  }

  async updateAgent(
    boardId: string,
    agentId: string,
    data: Partial<Pick<Agent, "name" | "description" | "status" | "statusMessage" | "currentTaskId" | "currentInitiativeId" | "metadata">>,
  ): Promise<Agent | null> {
    await this.ensureBoardStructure(boardId);

    const agent = await this.getAgent(boardId, agentId);
    if (!agent) return null;

    const updated: Agent = {
      ...agent,
      ...data,
      lastHeartbeat: timestamp(),
    };

    await this.writeAgent(boardId, updated);

    await this.appendActivity(boardId, {
      type: "agent.updated",
      message: `Agent ${updated.name} updated status to ${updated.status}`,
      agentId,
      payload: { fields: Object.keys(data) },
    });

    return updated;
  }

  async deleteAgent(boardId: string, agentId: string): Promise<boolean> {
    await this.ensureBoardStructure(boardId);

    const filePath = path.join(agentsDir(boardId), `${agentId}.json`);
    if (!existsSync(filePath)) return false;
    await rm(filePath);

    await this.appendActivity(boardId, {
      type: "agent.removed",
      message: `Agent ${agentId} removed`,
      agentId,
    });

    return true;
  }

  async heartbeatAgent(boardId: string, agentId: string, message?: string): Promise<Agent | null> {
    await this.ensureBoardStructure(boardId);

    const agent = await this.getAgent(boardId, agentId);
    if (!agent) return null;

    const updated: Agent = {
      ...agent,
      status: "active",
      lastHeartbeat: timestamp(),
      ...(message !== undefined ? { statusMessage: message } : {}),
    };

    await this.writeAgent(boardId, updated);

    await this.appendActivity(boardId, {
      type: "agent.heartbeat",
      message: message ? `Heartbeat: ${message}` : "Heartbeat",
      agentId,
      initiativeId: updated.currentInitiativeId || undefined,
      taskId: updated.currentTaskId || undefined,
    });

    return updated;
  }

  // --- Initiatives ---

  async createInitiative(
    boardId: string,
    data: Pick<Initiative, "name" | "description"> & Partial<Pick<Initiative, "status" | "kind" | "assigneeAgentIds">>,
  ): Promise<Initiative> {
    await this.ensureBoardStructure(boardId);

    const baseId = slugify(data.name);
    const id = await resolveUniqueId((candidate) => initiativeFile(boardId, candidate), baseId);
    const now = timestamp();

    const initiative: Initiative = {
      id,
      boardId,
      name: data.name,
      description: data.description || "",
      status: data.status || "active",
      kind: data.kind || "thread",
      assigneeAgentIds: data.assigneeAgentIds || [],
      createdAt: now,
      updatedAt: now,
    };

    await writeJson(initiativeFile(boardId, id), initiative);
    await mkdir(tasksDir(boardId, id), { recursive: true });
    await mkdir(plansDir(boardId, id), { recursive: true });

    await this.appendActivity(boardId, {
      type: "initiative.created",
      message: `Initiative ${initiative.name} created`,
      initiativeId: initiative.id,
      payload: { kind: initiative.kind },
    });

    return initiative;
  }

  async listInitiatives(boardId: string): Promise<Initiative[]> {
    await this.ensureBoardStructure(boardId);

    const files = await listDir(initiativesDir(boardId));
    const initiatives: Initiative[] = [];

    for (const f of files) {
      if (!f.endsWith(".json")) continue;
      const initiative = await readJson<Initiative>(path.join(initiativesDir(boardId), f));
      if (initiative) {
        initiatives.push({
          ...initiative,
          status: initiative.status || "active",
          kind: initiative.kind || "thread",
          assigneeAgentIds: initiative.assigneeAgentIds || [],
        });
      }
    }

    return initiatives.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  }

  async getInitiative(boardId: string, initiativeId: string): Promise<Initiative | null> {
    await this.ensureBoardStructure(boardId);

    const initiative = await readJson<Initiative>(initiativeFile(boardId, initiativeId));
    if (!initiative) return null;

    return {
      ...initiative,
      status: initiative.status || "active",
      kind: initiative.kind || "thread",
      assigneeAgentIds: initiative.assigneeAgentIds || [],
    };
  }

  async updateInitiative(
    boardId: string,
    initiativeId: string,
    data: Partial<Pick<Initiative, "name" | "description" | "status" | "kind" | "assigneeAgentIds">>,
  ): Promise<Initiative | null> {
    await this.ensureBoardStructure(boardId);

    const initiative = await this.getInitiative(boardId, initiativeId);
    if (!initiative) return null;

    const updated: Initiative = {
      ...initiative,
      ...data,
      updatedAt: timestamp(),
    };

    await writeJson(initiativeFile(boardId, initiativeId), updated);

    await this.appendActivity(boardId, {
      type: "initiative.updated",
      message: `Initiative ${updated.name} updated`,
      initiativeId,
      payload: { fields: Object.keys(data) },
    });

    return updated;
  }

  async deleteInitiative(boardId: string, initiativeId: string): Promise<boolean> {
    await this.ensureBoardStructure(boardId);

    const dir = path.join(initiativesDir(boardId), initiativeId);
    const dataFile = initiativeFile(boardId, initiativeId);

    if (!existsSync(dataFile) && !existsSync(dir)) return false;

    if (existsSync(dataFile)) await rm(dataFile);
    if (existsSync(dir)) await rm(dir, { recursive: true });

    await this.appendActivity(boardId, {
      type: "initiative.removed",
      message: `Initiative ${initiativeId} removed`,
      initiativeId,
    });

    return true;
  }

  // --- Plans ---

  async createPlan(
    boardId: string,
    initiativeId: string,
    data: Pick<Plan, "title" | "description"> &
      Partial<Pick<Plan, "status" | "ownerAgentId" | "tags">>,
  ): Promise<Plan> {
    await this.ensureBoardStructure(boardId);

    const initiative = await this.getInitiative(boardId, initiativeId);
    if (!initiative) {
      throw new Error(`Initiative not found: ${initiativeId}`);
    }

    const baseId = slugify(data.title);
    const id = await resolveUniqueId((candidate) => planFile(boardId, initiativeId, candidate), baseId);
    const now = timestamp();

    const plan: Plan = {
      id,
      boardId,
      initiativeId,
      title: data.title,
      description: data.description || "",
      status: data.status || "todo",
      ownerAgentId: data.ownerAgentId || null,
      tags: data.tags || [],
      createdAt: now,
      updatedAt: now,
      completedAt: null,
    };

    await writeJson(planFile(boardId, initiativeId, id), plan);
    await mkdir(planStepsDir(boardId, initiativeId, id), { recursive: true });

    await this.appendActivity(boardId, {
      type: "plan.created",
      message: `Plan ${plan.title} created`,
      initiativeId,
      payload: { planId: plan.id, status: plan.status },
      agentId: plan.ownerAgentId || undefined,
    });

    return plan;
  }

  async listPlans(boardId: string, initiativeId: string): Promise<Plan[]> {
    await this.ensureBoardStructure(boardId);

    const files = await listDir(plansDir(boardId, initiativeId));
    const plans: Plan[] = [];
    for (const fileName of files) {
      if (!fileName.endsWith(".json")) continue;
      const plan = await readJson<Plan>(path.join(plansDir(boardId, initiativeId), fileName));
      if (!plan) continue;
      plans.push({
        ...plan,
        status: plan.status || "todo",
        ownerAgentId: plan.ownerAgentId || null,
        tags: plan.tags || [],
        completedAt: plan.completedAt || null,
      });
    }

    return plans.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  }

  async getPlan(boardId: string, initiativeId: string, planId: string): Promise<Plan | null> {
    await this.ensureBoardStructure(boardId);

    const plan = await readJson<Plan>(planFile(boardId, initiativeId, planId));
    if (!plan) return null;

    return {
      ...plan,
      status: plan.status || "todo",
      ownerAgentId: plan.ownerAgentId || null,
      tags: plan.tags || [],
      completedAt: plan.completedAt || null,
    };
  }

  async updatePlan(
    boardId: string,
    initiativeId: string,
    planId: string,
    data: Partial<Pick<Plan, "title" | "description" | "status" | "ownerAgentId" | "tags">>,
  ): Promise<Plan | null> {
    await this.ensureBoardStructure(boardId);

    const current = await this.getPlan(boardId, initiativeId, planId);
    if (!current) return null;

    const now = timestamp();
    const nextStatus = data.status || current.status;
    const completedAt =
      nextStatus === "done" ? now : data.status && data.status !== "done" ? null : current.completedAt;

    const updated: Plan = {
      ...current,
      ...data,
      status: nextStatus,
      updatedAt: now,
      completedAt,
      ownerAgentId: data.ownerAgentId === undefined ? current.ownerAgentId : data.ownerAgentId,
      tags: data.tags || current.tags,
    };

    await writeJson(planFile(boardId, initiativeId, planId), updated);

    const statusChange = data.status && data.status !== current.status;
    await this.appendActivity(boardId, {
      type: statusChange ? "plan.status_changed" : "plan.updated",
      message: statusChange
        ? `Plan ${updated.title} moved ${current.status} -> ${updated.status}`
        : `Plan ${updated.title} updated`,
      initiativeId,
      payload: { planId, status: updated.status, fields: Object.keys(data) },
      agentId: updated.ownerAgentId || undefined,
    });

    return updated;
  }

  async deletePlan(boardId: string, initiativeId: string, planId: string): Promise<boolean> {
    await this.ensureBoardStructure(boardId);

    const filePath = planFile(boardId, initiativeId, planId);
    const dirPath = path.join(plansDir(boardId, initiativeId), planId);
    if (!existsSync(filePath) && !existsSync(dirPath)) return false;

    const tasks = await this.listTasks(boardId, initiativeId);
    for (const task of tasks) {
      if (task.planId !== planId) continue;
      const detached: Task = { ...task, planId: null, planStepId: null, updatedAt: timestamp() };
      await writeJson(taskFile(boardId, initiativeId, task.id), detached);
    }

    if (existsSync(filePath)) await rm(filePath);
    if (existsSync(dirPath)) await rm(dirPath, { recursive: true });

    await this.appendActivity(boardId, {
      type: "plan.removed",
      message: `Plan ${planId} removed`,
      initiativeId,
      payload: { planId },
    });

    return true;
  }

  // --- Plan steps ---

  async createPlanStep(
    boardId: string,
    initiativeId: string,
    planId: string,
    data: Pick<PlanStep, "title" | "description"> &
      Partial<Pick<PlanStep, "status" | "assigneeAgentId" | "order">>,
  ): Promise<PlanStep> {
    await this.ensureBoardStructure(boardId);

    const plan = await this.getPlan(boardId, initiativeId, planId);
    if (!plan) {
      throw new Error(`Plan not found: ${planId}`);
    }

    const baseId = slugify(data.title);
    const id = await resolveUniqueId(
      (candidate) => planStepFile(boardId, initiativeId, planId, candidate),
      baseId,
    );
    const now = timestamp();
    const existingSteps = await this.listPlanSteps(boardId, initiativeId, planId);
    const order = data.order ?? existingSteps.length + 1;

    const step: PlanStep = {
      id,
      boardId,
      initiativeId,
      planId,
      title: data.title,
      description: data.description || "",
      status: data.status || "todo",
      assigneeAgentId: data.assigneeAgentId || null,
      order,
      createdAt: now,
      updatedAt: now,
      completedAt: null,
    };

    await writeJson(planStepFile(boardId, initiativeId, planId, id), step);

    await this.appendActivity(boardId, {
      type: "plan_step.created",
      message: `Plan step ${step.title} created`,
      initiativeId,
      payload: { planId, stepId: step.id, status: step.status, order: step.order },
      agentId: step.assigneeAgentId || undefined,
    });

    return step;
  }

  async listPlanSteps(boardId: string, initiativeId: string, planId: string): Promise<PlanStep[]> {
    await this.ensureBoardStructure(boardId);

    const files = await listDir(planStepsDir(boardId, initiativeId, planId));
    const steps: PlanStep[] = [];
    for (const fileName of files) {
      if (!fileName.endsWith(".json")) continue;
      const step = await readJson<PlanStep>(path.join(planStepsDir(boardId, initiativeId, planId), fileName));
      if (!step) continue;
      steps.push({
        ...step,
        status: step.status || "todo",
        assigneeAgentId: step.assigneeAgentId || null,
        completedAt: step.completedAt || null,
      });
    }

    return steps.sort((a, b) => a.order - b.order || a.createdAt.localeCompare(b.createdAt));
  }

  async getPlanStep(
    boardId: string,
    initiativeId: string,
    planId: string,
    stepId: string,
  ): Promise<PlanStep | null> {
    await this.ensureBoardStructure(boardId);

    const step = await readJson<PlanStep>(planStepFile(boardId, initiativeId, planId, stepId));
    if (!step) return null;

    return {
      ...step,
      status: step.status || "todo",
      assigneeAgentId: step.assigneeAgentId || null,
      completedAt: step.completedAt || null,
    };
  }

  async updatePlanStep(
    boardId: string,
    initiativeId: string,
    planId: string,
    stepId: string,
    data: Partial<Pick<PlanStep, "title" | "description" | "status" | "assigneeAgentId" | "order">>,
  ): Promise<PlanStep | null> {
    await this.ensureBoardStructure(boardId);

    const current = await this.getPlanStep(boardId, initiativeId, planId, stepId);
    if (!current) return null;

    const now = timestamp();
    const nextStatus = data.status || current.status;
    const completedAt =
      nextStatus === "done" ? now : data.status && data.status !== "done" ? null : current.completedAt;

    const updated: PlanStep = {
      ...current,
      ...data,
      status: nextStatus,
      updatedAt: now,
      completedAt,
      assigneeAgentId:
        data.assigneeAgentId === undefined ? current.assigneeAgentId : data.assigneeAgentId,
      order: data.order ?? current.order,
    };

    await writeJson(planStepFile(boardId, initiativeId, planId, stepId), updated);

    const statusChange = data.status && data.status !== current.status;
    await this.appendActivity(boardId, {
      type: statusChange ? "plan_step.status_changed" : "plan_step.updated",
      message: statusChange
        ? `Plan step ${updated.title} moved ${current.status} -> ${updated.status}`
        : `Plan step ${updated.title} updated`,
      initiativeId,
      payload: { planId, stepId, status: updated.status, fields: Object.keys(data) },
      agentId: updated.assigneeAgentId || undefined,
    });

    return updated;
  }

  async deletePlanStep(boardId: string, initiativeId: string, planId: string, stepId: string): Promise<boolean> {
    await this.ensureBoardStructure(boardId);

    const filePath = planStepFile(boardId, initiativeId, planId, stepId);
    if (!existsSync(filePath)) return false;
    await rm(filePath);

    const tasks = await this.listTasks(boardId, initiativeId);
    for (const task of tasks) {
      if (task.planId === planId && task.planStepId === stepId) {
        const detached: Task = { ...task, planStepId: null, updatedAt: timestamp() };
        await writeJson(taskFile(boardId, initiativeId, task.id), detached);
      }
    }

    await this.appendActivity(boardId, {
      type: "plan_step.removed",
      message: `Plan step ${stepId} removed`,
      initiativeId,
      payload: { planId, stepId },
    });

    return true;
  }

  // --- Projects (legacy compatibility wrappers) ---

  async createProject(boardId: string, data: Pick<Project, "name" | "description">): Promise<Project> {
    return this.createInitiative(boardId, data);
  }

  async listProjects(boardId: string): Promise<Project[]> {
    return this.listInitiatives(boardId);
  }

  async getProject(boardId: string, projectId: string): Promise<Project | null> {
    return this.getInitiative(boardId, projectId);
  }

  async updateProject(
    boardId: string,
    projectId: string,
    data: Partial<Pick<Project, "name" | "description">>,
  ): Promise<Project | null> {
    return this.updateInitiative(boardId, projectId, data);
  }

  async deleteProject(boardId: string, projectId: string): Promise<boolean> {
    return this.deleteInitiative(boardId, projectId);
  }

  // --- Tasks ---

  async createTask(
    boardId: string,
    initiativeId: string,
    data: Pick<Task, "title" | "description" | "assigneeAgentId" | "priority" | "tags"> &
      Partial<Pick<Task, "planId" | "planStepId" | "assigneeAgentIds" | "deliverables">>,
    actorAgentId: string,
  ): Promise<Task> {
    await this.ensureBoardStructure(boardId);
    await this.requireRegisteredAgent(boardId, actorAgentId);

    const initiative = await this.getInitiative(boardId, initiativeId);
    if (!initiative) {
      throw new Error(`Initiative not found: ${initiativeId}`);
    }
    if (data.planId) {
      const plan = await this.getPlan(boardId, initiativeId, data.planId);
      if (!plan) {
        throw new Error(`Plan not found: ${data.planId}`);
      }
      if (data.planStepId) {
        const step = await this.getPlanStep(boardId, initiativeId, data.planId, data.planStepId);
        if (!step) {
          throw new Error(`Plan step not found: ${data.planStepId}`);
        }
      }
    } else if (data.planStepId) {
      throw new Error("planStepId requires a planId");
    }

    const baseId = slugify(data.title);
    const id = await resolveUniqueId((candidate) => taskFile(boardId, initiativeId, candidate), baseId);
    const now = timestamp();

    const task = normalizeTask(
      {
        id,
        initiativeId,
        projectId: initiativeId,
        planId: data.planId || null,
        planStepId: data.planStepId || null,
        boardId,
        title: data.title,
        description: data.description || "",
        status: "todo",
        assigneeAgentId: data.assigneeAgentId || null,
        assigneeAgentIds: data.assigneeAgentIds || [],
        deliverables: data.deliverables || [],
        priority: data.priority || "medium",
        tags: data.tags || [],
        createdAt: now,
        updatedAt: now,
        completedAt: null,
      },
      initiativeId,
    );

    await writeJson(taskFile(boardId, initiativeId, id), task);

    await this.appendActivity(boardId, {
      type: "task.created",
      message: `Task ${task.title} created`,
      initiativeId,
      taskId: task.id,
      agentId: actorAgentId,
      payload: {
        assignees: task.assigneeAgentIds,
        status: task.status,
      },
    });

    return task;
  }

  async listTasks(boardId: string, initiativeId: string, filters?: { status?: string; assignee?: string; tag?: string }): Promise<Task[]> {
    await this.ensureBoardStructure(boardId);

    const files = await listDir(tasksDir(boardId, initiativeId));
    let tasks: Task[] = [];

    for (const f of files) {
      if (!f.endsWith(".json")) continue;
      const task = await readJson<Task>(path.join(tasksDir(boardId, initiativeId), f));
      if (task) {
        tasks.push(normalizeTask(task, initiativeId));
      }
    }

    if (filters?.status) tasks = tasks.filter((t) => t.status === filters.status);
    if (filters?.assignee) {
      tasks = tasks.filter(
        (t) => t.assigneeAgentId === filters.assignee || t.assigneeAgentIds.includes(filters.assignee as string),
      );
    }
    if (filters?.tag) tasks = tasks.filter((t) => t.tags.includes(filters.tag as string));

    return tasks.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  }

  async listAllBoardTasks(boardId: string, filters?: { status?: string; assignee?: string; tag?: string }): Promise<Task[]> {
    const initiatives = await this.listInitiatives(boardId);
    const allTasks: Task[] = [];

    for (const initiative of initiatives) {
      const tasks = await this.listTasks(boardId, initiative.id, filters);
      allTasks.push(...tasks);
    }

    return allTasks.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }

  async getTask(boardId: string, initiativeId: string, taskId: string): Promise<Task | null> {
    await this.ensureBoardStructure(boardId);

    const task = await readJson<Task>(taskFile(boardId, initiativeId, taskId));
    if (!task) return null;

    return normalizeTask(task, initiativeId);
  }

  async updateTask(
    boardId: string,
    initiativeId: string,
    taskId: string,
    data: Partial<
      Pick<
        Task,
        "title" | "description" | "status" | "planId" | "planStepId" | "assigneeAgentId" | "assigneeAgentIds" | "deliverables" | "priority" | "tags"
      >
    >,
    actorAgentId: string,
  ): Promise<Task | null> {
    await this.ensureBoardStructure(boardId);
    await this.requireRegisteredAgent(boardId, actorAgentId);

    const current = await this.getTask(boardId, initiativeId, taskId);
    if (!current) return null;

    const nextPlanId = data.planId === undefined ? current.planId : data.planId;
    const nextPlanStepId = data.planStepId === undefined ? current.planStepId : data.planStepId;

    if (nextPlanId) {
      const plan = await this.getPlan(boardId, initiativeId, nextPlanId);
      if (!plan) {
        throw new Error(`Plan not found: ${nextPlanId}`);
      }
      if (nextPlanStepId) {
        const step = await this.getPlanStep(boardId, initiativeId, nextPlanId, nextPlanStepId);
        if (!step) {
          throw new Error(`Plan step not found: ${nextPlanStepId}`);
        }
      }
    } else if (nextPlanStepId) {
      throw new Error("planStepId requires a planId");
    }

    const now = timestamp();
    const nextStatus = data.status || current.status;
    const completedAt =
      nextStatus === "done" ? now : data.status && data.status !== "done" ? null : current.completedAt;

    const updated = normalizeTask(
      {
        ...current,
        ...data,
        status: nextStatus,
        updatedAt: now,
        completedAt,
      },
      initiativeId,
    );

    await writeJson(taskFile(boardId, initiativeId, taskId), updated);
    await this.syncAgentPointersForTask(boardId, updated);

    const changedFields = Object.keys(data);
    const statusChange = data.status && data.status !== current.status;

    await this.appendActivity(boardId, {
      type: statusChange ? "task.status_changed" : "task.updated",
      message: statusChange
        ? `Task ${updated.title} moved ${current.status} -> ${updated.status}`
        : `Task ${updated.title} updated`,
      initiativeId,
      taskId,
      agentId: actorAgentId,
      payload: { fields: changedFields, status: updated.status },
    });

    return updated;
  }

  async deleteTask(boardId: string, initiativeId: string, taskId: string, actorAgentId: string): Promise<boolean> {
    await this.ensureBoardStructure(boardId);
    await this.requireRegisteredAgent(boardId, actorAgentId);

    const filePath = taskFile(boardId, initiativeId, taskId);
    if (!existsSync(filePath)) return false;

    const task = await this.getTask(boardId, initiativeId, taskId);
    await rm(filePath);

    if (task) {
      await this.syncAgentPointersForTask(boardId, { ...task, status: "todo" as TaskStatus });
      await this.appendActivity(boardId, {
        type: "task.removed",
        message: `Task ${task.title} removed`,
        initiativeId,
        taskId,
        agentId: actorAgentId,
      });
    }

    return true;
  }

  // --- Activity ---

  async listActivity(
    boardId: string,
    options?: { limit?: number; initiativeId?: string; agentId?: string; taskId?: string },
  ): Promise<ActivityEvent[]> {
    await this.ensureBoardStructure(boardId);

    const files = (await listDir(eventsDir(boardId)))
      .filter((name) => name.endsWith(".ndjson"))
      .sort((a, b) => b.localeCompare(a));

    const events: ActivityEvent[] = [];

    for (const fileName of files) {
      const filePath = path.join(eventsDir(boardId), fileName);
      const content = await readFile(filePath, "utf-8").catch(() => "");
      if (!content) continue;

      const lines = content.split("\n").filter(Boolean);
      for (const line of lines) {
        try {
          const event = JSON.parse(line) as ActivityEvent;
          events.push(event);
        } catch {
          // Skip malformed lines and continue.
        }
      }
    }

    let filtered = events;
    if (options?.initiativeId) {
      filtered = filtered.filter((e) => e.initiativeId === options.initiativeId);
    }
    if (options?.agentId) {
      filtered = filtered.filter((e) => e.agentId === options.agentId);
    }
    if (options?.taskId) {
      filtered = filtered.filter((e) => e.taskId === options.taskId);
    }

    filtered.sort((a, b) => b.createdAt.localeCompare(a.createdAt));

    const limit = options?.limit ?? 200;
    return filtered.slice(0, limit);
  }
}

// Singleton
let storageInstance: FsStorage | null = null;

export function getStorage(): Storage {
  if (!storageInstance) {
    storageInstance = new FsStorage();
  }
  return storageInstance;
}
