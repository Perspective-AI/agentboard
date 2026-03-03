import type { Board, BoardSummary, Agent, Project, Task } from "@/lib/types";

export interface Storage {
  // Boards
  createBoard(data: Pick<Board, "name" | "description">): Promise<Board>;
  listBoards(): Promise<Board[]>;
  getBoard(boardId: string): Promise<Board | null>;
  getBoardSummary(boardId: string): Promise<BoardSummary | null>;
  updateBoard(boardId: string, data: Partial<Pick<Board, "name" | "description">>): Promise<Board | null>;
  deleteBoard(boardId: string): Promise<boolean>;

  // Agents
  createAgent(boardId: string, data: Pick<Agent, "name" | "description" | "metadata">): Promise<Agent>;
  listAgents(boardId: string): Promise<Agent[]>;
  getAgent(boardId: string, agentId: string): Promise<Agent | null>;
  updateAgent(boardId: string, agentId: string, data: Partial<Pick<Agent, "name" | "description" | "status" | "statusMessage" | "currentTaskId" | "metadata">>): Promise<Agent | null>;
  deleteAgent(boardId: string, agentId: string): Promise<boolean>;
  heartbeatAgent(boardId: string, agentId: string, message?: string): Promise<Agent | null>;

  // Projects
  createProject(boardId: string, data: Pick<Project, "name" | "description">): Promise<Project>;
  listProjects(boardId: string): Promise<Project[]>;
  getProject(boardId: string, projectId: string): Promise<Project | null>;
  updateProject(boardId: string, projectId: string, data: Partial<Pick<Project, "name" | "description">>): Promise<Project | null>;
  deleteProject(boardId: string, projectId: string): Promise<boolean>;

  // Tasks
  createTask(boardId: string, projectId: string, data: Pick<Task, "title" | "description" | "assigneeAgentId" | "priority" | "tags">): Promise<Task>;
  listTasks(boardId: string, projectId: string, filters?: { status?: string; assignee?: string; tag?: string }): Promise<Task[]>;
  listAllBoardTasks(boardId: string, filters?: { status?: string; assignee?: string; tag?: string }): Promise<Task[]>;
  getTask(boardId: string, projectId: string, taskId: string): Promise<Task | null>;
  updateTask(boardId: string, projectId: string, taskId: string, data: Partial<Pick<Task, "title" | "description" | "status" | "assigneeAgentId" | "priority" | "tags">>): Promise<Task | null>;
  deleteTask(boardId: string, projectId: string, taskId: string): Promise<boolean>;
}
