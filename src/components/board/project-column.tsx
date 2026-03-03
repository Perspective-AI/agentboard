"use client";

import type { Project, Task, Agent, TaskStatus } from "@/lib/types";
import { TaskCard } from "./task-card";

const statusOrder: TaskStatus[] = ["in_progress", "todo", "blocked", "done"];
const statusLabels: Record<TaskStatus, string> = {
  todo: "To Do",
  in_progress: "In Progress",
  done: "Done",
  blocked: "Blocked",
};

interface ProjectColumnProps {
  project: Project;
  tasks: Task[];
  agents: Agent[];
  onTaskClick: (task: Task) => void;
}

export function ProjectColumn({ project, tasks, agents, onTaskClick }: ProjectColumnProps) {
  const tasksByStatus = statusOrder.map((status) => ({
    status,
    label: statusLabels[status],
    tasks: tasks.filter((t) => t.status === status),
  }));

  return (
    <div className="flex-shrink-0 w-80 bg-secondary/50 rounded-lg p-3">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-foreground">{project.name}</h3>
        <span className="text-xs text-muted-foreground">{tasks.length} tasks</span>
      </div>

      <div className="space-y-4">
        {tasksByStatus.map(
          (group) =>
            group.tasks.length > 0 && (
              <div key={group.status}>
                <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
                  {group.label}
                </h4>
                <div className="space-y-2">
                  {group.tasks.map((task) => (
                    <TaskCard
                      key={task.id}
                      task={task}
                      agents={agents}
                      onClick={onTaskClick}
                    />
                  ))}
                </div>
              </div>
            )
        )}
        {tasks.length === 0 && (
          <p className="text-xs text-muted-foreground text-center py-4">
            No tasks yet
          </p>
        )}
      </div>
    </div>
  );
}
