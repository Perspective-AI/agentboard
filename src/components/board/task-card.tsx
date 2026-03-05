"use client";

import type { Task, Agent } from "@/lib/types";
import { Card } from "@/components/ui/card";
import { TaskStatusBadge, PriorityBadge } from "@/components/common/status-badge";
import { TimeAgo } from "@/components/common/time-ago";

interface TaskCardProps {
  task: Task;
  agents: Agent[];
  onClick: (task: Task) => void;
}

export function TaskCard({ task, agents, onClick }: TaskCardProps) {
  const assigneeIds = task.assigneeAgentIds?.length
    ? task.assigneeAgentIds
    : task.assigneeAgentId
      ? [task.assigneeAgentId]
      : [];
  const assignees = assigneeIds
    .map((id) => agents.find((a) => a.id === id))
    .filter((agent): agent is Agent => Boolean(agent));

  return (
    <Card
      className="p-3 cursor-pointer hover:shadow-md transition-shadow border-border gap-0"
      onClick={() => onClick(task)}
    >
      <div className="flex items-start justify-between gap-2 mb-1.5">
        <h4 className="text-sm font-medium text-foreground leading-snug line-clamp-2">
          {task.title}
        </h4>
        <PriorityBadge priority={task.priority} />
      </div>

      {task.description && (
        <p className="text-xs text-muted-foreground line-clamp-2 mb-2">
          {task.description}
        </p>
      )}

      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <TaskStatusBadge status={task.status} />
          {task.tags.map((tag) => (
            <span
              key={tag}
              className="text-xs px-1.5 py-0.5 rounded bg-secondary text-secondary-foreground"
            >
              {tag}
            </span>
          ))}
        </div>
        <div className="flex items-center gap-2">
          {assignees.length > 0 && (
            <span className="text-xs text-muted-foreground truncate max-w-[100px]">
              {assignees.map((agent) => agent.name).join(", ")}
            </span>
          )}
          <TimeAgo date={task.updatedAt} />
        </div>
      </div>
    </Card>
  );
}
