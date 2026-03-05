"use client";

import { useState, useMemo } from "react";
import type { Agent, Initiative, Task } from "@/lib/types";
import { TaskStatusBadge, PriorityBadge } from "@/components/common/status-badge";
import { TimeAgo } from "@/components/common/time-ago";
import { EmptyState } from "@/components/common/empty-state";

interface AllTasksTableProps {
  tasks: Task[];
  agents: Agent[];
  initiatives: Initiative[];
  onTaskClick: (task: Task) => void;
}

const statusFilter: Array<{ value: string; label: string }> = [
  { value: "all", label: "All" },
  { value: "todo", label: "To Do" },
  { value: "in_progress", label: "In Progress" },
  { value: "done", label: "Done" },
  { value: "blocked", label: "Blocked" },
];

const priorityOrder: Record<string, number> = { high: 0, medium: 1, low: 2 };
const statusOrder: Record<string, number> = { in_progress: 0, todo: 1, blocked: 2, done: 3 };

export function AllTasksTable({ tasks, agents, initiatives, onTaskClick }: AllTasksTableProps) {
  const [filter, setFilter] = useState("all");
  const [sortBy, setSortBy] = useState<"updatedAt" | "priority" | "status">("updatedAt");

  const agentsById = useMemo(
    () => new Map(agents.map((a) => [a.id, a])),
    [agents],
  );

  const sorted = useMemo(() => {
    const filtered = filter === "all" ? tasks : tasks.filter((t) => t.status === filter);
    return [...filtered].sort((a, b) => {
      if (sortBy === "priority") return (priorityOrder[a.priority] ?? 1) - (priorityOrder[b.priority] ?? 1);
      if (sortBy === "status") return (statusOrder[a.status] ?? 1) - (statusOrder[b.status] ?? 1);
      return b.updatedAt.localeCompare(a.updatedAt);
    });
  }, [tasks, filter, sortBy]);

  if (tasks.length === 0) {
    return (
      <EmptyState
        title="No tasks yet"
        description="Create tasks via the API to see them listed here."
      />
    );
  }

  return (
    <div>
      <div className="flex items-center gap-2 mb-4">
        {statusFilter.map((sf) => (
          <button
            key={sf.value}
            onClick={() => setFilter(sf.value)}
            className={`text-xs px-2.5 py-1 rounded-md transition-colors ${
              filter === sf.value
                ? "bg-foreground text-background"
                : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
            }`}
          >
            {sf.label}
          </button>
        ))}
        <div className="ml-auto flex items-center gap-1 text-xs text-muted-foreground">
          Sort:
          {(["updatedAt", "priority", "status"] as const).map((s) => (
            <button
              key={s}
              onClick={() => setSortBy(s)}
              className={`px-2 py-1 rounded-md transition-colors ${
                sortBy === s ? "bg-secondary font-medium" : "hover:bg-secondary/50"
              }`}
            >
              {s === "updatedAt" ? "Recent" : s === "priority" ? "Priority" : "Status"}
            </button>
          ))}
        </div>
      </div>

      <div className="border rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="text-left p-3 font-medium text-muted-foreground">Task</th>
              <th className="text-left p-3 font-medium text-muted-foreground">Initiative</th>
              <th className="text-left p-3 font-medium text-muted-foreground">Status</th>
              <th className="text-left p-3 font-medium text-muted-foreground">Priority</th>
              <th className="text-left p-3 font-medium text-muted-foreground">Assignee</th>
              <th className="text-left p-3 font-medium text-muted-foreground">Updated</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((task) => {
              const initiative = initiatives.find(
                (item) => item.id === task.initiativeId || item.id === task.projectId,
              );
              const assigneeIds = task.assigneeAgentIds?.length
                ? task.assigneeAgentIds
                : task.assigneeAgentId
                  ? [task.assigneeAgentId]
                  : [];
              const assignees = assigneeIds
                .map((id) => agentsById.get(id))
                .filter((agent): agent is Agent => Boolean(agent));
              return (
                <tr
                  key={task.id}
                  tabIndex={0}
                  role="button"
                  onClick={() => onTaskClick(task)}
                  onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onTaskClick(task); } }}
                  className="border-b last:border-0 hover:bg-muted/30 cursor-pointer transition-colors"
                >
                  <td className="p-3">
                    <span className="font-medium">{task.title}</span>
                  </td>
                  <td className="p-3 text-muted-foreground">
                    {initiative?.name || task.initiativeId || task.projectId}
                  </td>
                  <td className="p-3">
                    <TaskStatusBadge status={task.status} />
                  </td>
                  <td className="p-3">
                    <PriorityBadge priority={task.priority} />
                  </td>
                  <td className="p-3 text-muted-foreground">
                    {assignees.length > 0
                      ? assignees.map((agent) => agent.name).join(", ")
                      : assigneeIds.length > 0
                        ? assigneeIds.join(", ")
                        : "—"}
                  </td>
                  <td className="p-3">
                    <TimeAgo date={task.updatedAt} />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
