export interface Board {
  id: string;
  name: string;
  description: string;
  createdAt: string;
  updatedAt: string;
}

export type AgentStatus = "active" | "idle" | "error" | "offline" | "waiting";

export interface Agent {
  id: string;
  boardId: string;
  name: string;
  description: string;
  status: AgentStatus;
  statusMessage: string;
  currentTaskId: string | null;
  metadata: Record<string, unknown>;
  registeredAt: string;
  lastHeartbeat: string;
}

export interface Project {
  id: string;
  boardId: string;
  name: string;
  description: string;
  createdAt: string;
  updatedAt: string;
}

export type TaskStatus = "todo" | "in_progress" | "done" | "blocked";
export type TaskPriority = "low" | "medium" | "high";

export interface Task {
  id: string;
  projectId: string;
  boardId: string;
  title: string;
  description: string;
  status: TaskStatus;
  assigneeAgentId: string | null;
  priority: TaskPriority;
  tags: string[];
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
}

export interface ApiResponse<T = unknown> {
  ok: true;
  data: T;
}

export interface ApiError {
  ok: false;
  error: {
    code: string;
    message: string;
  };
}

export type ApiResult<T = unknown> = ApiResponse<T> | ApiError;

export interface BoardSummary extends Board {
  agentCount: number;
  projectCount: number;
  taskCount: number;
}

export type SSEEventType =
  | "agent:registered"
  | "agent:updated"
  | "agent:removed"
  | "project:created"
  | "project:updated"
  | "project:removed"
  | "task:created"
  | "task:updated"
  | "task:removed"
  | "board:updated";

export interface SSEEvent {
  type: SSEEventType;
  data: unknown;
  timestamp: string;
}
