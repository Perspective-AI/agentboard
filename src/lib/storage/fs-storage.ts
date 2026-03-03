import { readdir, readFile, writeFile, mkdir, rm } from "fs/promises";
import { existsSync } from "fs";
import path from "path";
import type { Board, BoardSummary, Agent, Project, Task } from "@/lib/types";
import type { Storage } from "./index";
import { slugify, timestamp, getDataDir } from "@/lib/utils";

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

export class FsStorage implements Storage {
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
    const dir = boardDir(id);
    await mkdir(path.join(dir, "agents"), { recursive: true });
    await mkdir(path.join(dir, "projects"), { recursive: true });
    await writeJson(path.join(dir, "board.json"), board);
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
    const board = await this.getBoard(boardId);
    if (!board) return null;
    const agents = await this.listAgents(boardId);
    const projects = await this.listProjects(boardId);
    let taskCount = 0;
    for (const p of projects) {
      const tasks = await this.listTasks(boardId, p.id);
      taskCount += tasks.length;
    }
    return { ...board, agentCount: agents.length, projectCount: projects.length, taskCount };
  }

  async updateBoard(boardId: string, data: Partial<Pick<Board, "name" | "description">>): Promise<Board | null> {
    const board = await this.getBoard(boardId);
    if (!board) return null;
    const updated = { ...board, ...data, updatedAt: timestamp() };
    await writeJson(path.join(boardDir(boardId), "board.json"), updated);
    return updated;
  }

  async deleteBoard(boardId: string): Promise<boolean> {
    const dir = boardDir(boardId);
    if (!existsSync(dir)) return false;
    await rm(dir, { recursive: true });
    return true;
  }

  // --- Agents ---

  async createAgent(boardId: string, data: Pick<Agent, "name" | "description" | "metadata">): Promise<Agent> {
    const id = slugify(data.name);
    const now = timestamp();
    const agent: Agent = {
      id,
      boardId,
      name: data.name,
      description: data.description || "",
      status: "idle",
      statusMessage: "",
      currentTaskId: null,
      metadata: data.metadata || {},
      registeredAt: now,
      lastHeartbeat: now,
    };
    await writeJson(path.join(boardDir(boardId), "agents", `${id}.json`), agent);
    return agent;
  }

  async listAgents(boardId: string): Promise<Agent[]> {
    const dir = path.join(boardDir(boardId), "agents");
    const files = await listDir(dir);
    const agents: Agent[] = [];
    for (const f of files) {
      if (!f.endsWith(".json")) continue;
      const agent = await readJson<Agent>(path.join(dir, f));
      if (agent) agents.push(agent);
    }
    return agents.sort((a, b) => a.name.localeCompare(b.name));
  }

  async getAgent(boardId: string, agentId: string): Promise<Agent | null> {
    return readJson<Agent>(path.join(boardDir(boardId), "agents", `${agentId}.json`));
  }

  async updateAgent(boardId: string, agentId: string, data: Partial<Pick<Agent, "name" | "description" | "status" | "statusMessage" | "currentTaskId" | "metadata">>): Promise<Agent | null> {
    const agent = await this.getAgent(boardId, agentId);
    if (!agent) return null;
    const updated = { ...agent, ...data, lastHeartbeat: timestamp() };
    await writeJson(path.join(boardDir(boardId), "agents", `${agentId}.json`), updated);
    return updated;
  }

  async deleteAgent(boardId: string, agentId: string): Promise<boolean> {
    const filePath = path.join(boardDir(boardId), "agents", `${agentId}.json`);
    if (!existsSync(filePath)) return false;
    await rm(filePath);
    return true;
  }

  async heartbeatAgent(boardId: string, agentId: string, message?: string): Promise<Agent | null> {
    const agent = await this.getAgent(boardId, agentId);
    if (!agent) return null;
    const updated: Agent = {
      ...agent,
      status: "active",
      lastHeartbeat: timestamp(),
      ...(message !== undefined ? { statusMessage: message } : {}),
    };
    await writeJson(path.join(boardDir(boardId), "agents", `${agentId}.json`), updated);
    return updated;
  }

  // --- Projects ---

  async createProject(boardId: string, data: Pick<Project, "name" | "description">): Promise<Project> {
    const id = slugify(data.name);
    const now = timestamp();
    const project: Project = {
      id,
      boardId,
      name: data.name,
      description: data.description || "",
      createdAt: now,
      updatedAt: now,
    };
    const dir = path.join(boardDir(boardId), "projects", id);
    await mkdir(path.join(dir, "tasks"), { recursive: true });
    await writeJson(path.join(dir, "project.json"), project);
    return project;
  }

  async listProjects(boardId: string): Promise<Project[]> {
    const dir = path.join(boardDir(boardId), "projects");
    const dirs = await listDir(dir);
    const projects: Project[] = [];
    for (const d of dirs) {
      const project = await readJson<Project>(path.join(dir, d, "project.json"));
      if (project) projects.push(project);
    }
    return projects.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  }

  async getProject(boardId: string, projectId: string): Promise<Project | null> {
    return readJson<Project>(path.join(boardDir(boardId), "projects", projectId, "project.json"));
  }

  async updateProject(boardId: string, projectId: string, data: Partial<Pick<Project, "name" | "description">>): Promise<Project | null> {
    const project = await this.getProject(boardId, projectId);
    if (!project) return null;
    const updated = { ...project, ...data, updatedAt: timestamp() };
    await writeJson(path.join(boardDir(boardId), "projects", projectId, "project.json"), updated);
    return updated;
  }

  async deleteProject(boardId: string, projectId: string): Promise<boolean> {
    const dir = path.join(boardDir(boardId), "projects", projectId);
    if (!existsSync(dir)) return false;
    await rm(dir, { recursive: true });
    return true;
  }

  // --- Tasks ---

  async createTask(boardId: string, projectId: string, data: Pick<Task, "title" | "description" | "assigneeAgentId" | "priority" | "tags">): Promise<Task> {
    const id = slugify(data.title);
    const now = timestamp();
    const task: Task = {
      id,
      projectId,
      boardId,
      title: data.title,
      description: data.description || "",
      status: "todo",
      assigneeAgentId: data.assigneeAgentId || null,
      priority: data.priority || "medium",
      tags: data.tags || [],
      createdAt: now,
      updatedAt: now,
      completedAt: null,
    };
    await writeJson(path.join(boardDir(boardId), "projects", projectId, "tasks", `${id}.json`), task);
    return task;
  }

  async listTasks(boardId: string, projectId: string, filters?: { status?: string; assignee?: string; tag?: string }): Promise<Task[]> {
    const dir = path.join(boardDir(boardId), "projects", projectId, "tasks");
    const files = await listDir(dir);
    let tasks: Task[] = [];
    for (const f of files) {
      if (!f.endsWith(".json")) continue;
      const task = await readJson<Task>(path.join(dir, f));
      if (task) tasks.push(task);
    }
    if (filters?.status) tasks = tasks.filter((t) => t.status === filters.status);
    if (filters?.assignee) tasks = tasks.filter((t) => t.assigneeAgentId === filters.assignee);
    if (filters?.tag) tasks = tasks.filter((t) => t.tags.includes(filters.tag!));
    return tasks.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  }

  async listAllBoardTasks(boardId: string, filters?: { status?: string; assignee?: string; tag?: string }): Promise<Task[]> {
    const projects = await this.listProjects(boardId);
    const allTasks: Task[] = [];
    for (const p of projects) {
      const tasks = await this.listTasks(boardId, p.id, filters);
      allTasks.push(...tasks);
    }
    return allTasks.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }

  async getTask(boardId: string, projectId: string, taskId: string): Promise<Task | null> {
    return readJson<Task>(path.join(boardDir(boardId), "projects", projectId, "tasks", `${taskId}.json`));
  }

  async updateTask(boardId: string, projectId: string, taskId: string, data: Partial<Pick<Task, "title" | "description" | "status" | "assigneeAgentId" | "priority" | "tags">>): Promise<Task | null> {
    const task = await this.getTask(boardId, projectId, taskId);
    if (!task) return null;
    const now = timestamp();
    const updated: Task = {
      ...task,
      ...data,
      updatedAt: now,
      completedAt: data.status === "done" ? now : data.status ? null : task.completedAt,
    };
    await writeJson(path.join(boardDir(boardId), "projects", projectId, "tasks", `${taskId}.json`), updated);
    return updated;
  }

  async deleteTask(boardId: string, projectId: string, taskId: string): Promise<boolean> {
    const filePath = path.join(boardDir(boardId), "projects", projectId, "tasks", `${taskId}.json`);
    if (!existsSync(filePath)) return false;
    await rm(filePath);
    return true;
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
