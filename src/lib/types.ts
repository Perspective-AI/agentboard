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
  currentInitiativeId: string | null;
  metadata: Record<string, unknown>;
  registeredAt: string;
  lastHeartbeat: string;
}

export type InitiativeStatus = "active" | "paused" | "done";

export interface Initiative {
  id: string;
  boardId: string;
  name: string;
  description: string;
  status: InitiativeStatus;
  kind: "thread" | "session" | "tab" | "general";
  assigneeAgentIds: string[];
  createdAt: string;
  updatedAt: string;
}

export type Project = Initiative;

export type TaskStatus = "todo" | "in_progress" | "done" | "blocked";
export type TaskPriority = "low" | "medium" | "high";
export type PlanStatus = "todo" | "in_progress" | "done" | "blocked";
export type PlanStepStatus = "todo" | "in_progress" | "done" | "blocked";

export interface Plan {
  id: string;
  boardId: string;
  initiativeId: string;
  title: string;
  description: string;
  status: PlanStatus;
  ownerAgentId: string | null;
  tags: string[];
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
}

export interface PlanStep {
  id: string;
  boardId: string;
  initiativeId: string;
  planId: string;
  title: string;
  description: string;
  status: PlanStepStatus;
  assigneeAgentId: string | null;
  order: number;
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
}

export interface Task {
  id: string;
  initiativeId: string;
  projectId: string;
  planId: string | null;
  planStepId: string | null;
  boardId: string;
  title: string;
  description: string;
  status: TaskStatus;
  assigneeAgentId: string | null;
  assigneeAgentIds: string[];
  deliverables: string[];
  priority: TaskPriority;
  tags: string[];
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
}

export interface ActivityEvent {
  id: string;
  boardId: string;
  type: string;
  message: string;
  initiativeId?: string;
  taskId?: string;
  agentId?: string;
  payload?: Record<string, unknown>;
  createdAt: string;
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
  initiativeCount: number;
  planCount: number;
  planStepCount: number;
  projectCount: number;
  taskCount: number;
}

export type SSEEventType =
  | "agent:registered"
  | "agent:updated"
  | "agent:removed"
  | "initiative:created"
  | "initiative:updated"
  | "initiative:removed"
  | "project:created"
  | "project:updated"
  | "project:removed"
  | "plan:created"
  | "plan:updated"
  | "plan:removed"
  | "plan_step:created"
  | "plan_step:updated"
  | "plan_step:removed"
  | "task:created"
  | "task:updated"
  | "task:removed"
  | "activity:logged"
  | "board:updated";

export interface SSEEvent {
  type: SSEEventType;
  data: unknown;
  timestamp: string;
}
