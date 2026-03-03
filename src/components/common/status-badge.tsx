import { Badge } from "@/components/ui/badge";
import type { AgentStatus, TaskStatus } from "@/lib/types";

const agentStatusStyles: Record<AgentStatus, string> = {
  active: "bg-status-active-bg text-status-active-text",
  idle: "bg-status-idle-bg text-status-idle-text",
  error: "bg-status-error-bg text-status-error-text",
  offline: "bg-status-offline-bg text-status-offline-text",
  waiting: "bg-status-waiting-bg text-status-waiting-text",
};

const agentStatusLabels: Record<AgentStatus, string> = {
  active: "active",
  idle: "idle",
  error: "error",
  offline: "offline",
  waiting: "waiting for approval",
};

const taskStatusStyles: Record<TaskStatus, string> = {
  todo: "bg-task-todo-bg text-task-todo-text",
  in_progress: "bg-task-in-progress-bg text-task-in-progress-text",
  done: "bg-task-done-bg text-task-done-text",
  blocked: "bg-task-blocked-bg text-task-blocked-text",
};

const taskStatusLabels: Record<TaskStatus, string> = {
  todo: "To Do",
  in_progress: "In Progress",
  done: "Done",
  blocked: "Blocked",
};

const priorityStyles: Record<string, string> = {
  high: "bg-priority-high-bg text-priority-high-text",
  medium: "bg-priority-medium-bg text-priority-medium-text",
  low: "bg-priority-low-bg text-priority-low-text",
};

export function AgentStatusBadge({ status }: { status: AgentStatus }) {
  return (
    <Badge variant="secondary" className={`${agentStatusStyles[status]} border-0 font-medium text-xs`}>
      {agentStatusLabels[status]}
    </Badge>
  );
}

export function TaskStatusBadge({ status }: { status: TaskStatus }) {
  return (
    <Badge variant="secondary" className={`${taskStatusStyles[status]} border-0 font-medium text-xs`}>
      {taskStatusLabels[status]}
    </Badge>
  );
}

export function PriorityBadge({ priority }: { priority: string }) {
  return (
    <Badge variant="secondary" className={`${priorityStyles[priority] || priorityStyles.medium} border-0 font-medium text-xs`}>
      {priority}
    </Badge>
  );
}
