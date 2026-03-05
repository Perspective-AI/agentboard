"use client";

import type { Project, Task, Agent } from "@/lib/types";
import { EmptyState } from "@/components/common/empty-state";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Card } from "@/components/ui/card";
import { PriorityBadge, TaskStatusBadge } from "@/components/common/status-badge";
import { TimeAgo } from "@/components/common/time-ago";

interface ProjectBoardProps {
  projects: Project[];
  tasks: Task[];
  agents: Agent[];
  onTaskClick: (task: Task) => void;
}

type LaneId = "backlog" | "planned" | "in_progress" | "done";

const laneMeta: Array<{
  id: LaneId;
  label: string;
  subtitle: string;
  cardInClass: string;
}> = [
  {
    id: "backlog",
    label: "Backlog",
    subtitle: "Unplanned",
    cardInClass: "slide-in-from-left-2",
  },
  {
    id: "planned",
    label: "Planned",
    subtitle: "Ready to start",
    cardInClass: "slide-in-from-left-4",
  },
  {
    id: "in_progress",
    label: "In Progress",
    subtitle: "Active work",
    cardInClass: "slide-in-from-left-6",
  },
  {
    id: "done",
    label: "Done",
    subtitle: "Completed",
    cardInClass: "slide-in-from-left-8",
  },
];

function laneForTask(task: Task): LaneId {
  if (task.status === "done") return "done";
  if (task.status === "in_progress" || task.status === "blocked") return "in_progress";
  if (task.status === "todo" && task.planId) return "planned";
  return "backlog";
}

export function ProjectBoard({ projects, tasks, agents, onTaskClick }: ProjectBoardProps) {
  if (projects.length === 0) {
    return (
      <EmptyState
        title="No initiatives yet"
        description="Create your first initiative via the API to see tasks in a kanban view."
      />
    );
  }

  const initiativeNames = new Map<string, string>(projects.map((project) => [project.id, project.name]));
  const agentsById = new Map<string, Agent>(agents.map((agent) => [agent.id, agent]));
  const tasksByLane = new Map<LaneId, Task[]>(
    laneMeta.map((lane) => [lane.id, [] as Task[]]),
  );

  for (const task of tasks) {
    tasksByLane.get(laneForTask(task))?.push(task);
  }
  for (const lane of laneMeta) {
    tasksByLane
      .get(lane.id)
      ?.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }

  return (
    <ScrollArea className="w-full">
      <div className="flex min-w-max gap-3 pb-2">
        {laneMeta.map((lane) => {
          const laneTasks = tasksByLane.get(lane.id) || [];
          return (
            <section
              key={lane.id}
              className="w-[320px] rounded-lg border bg-card/40 p-3"
            >
              <header className="mb-3 flex items-baseline justify-between gap-2">
                <div>
                  <h3 className="text-sm font-semibold text-foreground">{lane.label}</h3>
                  <p className="text-[11px] text-muted-foreground">{lane.subtitle}</p>
                </div>
                <span className="text-xs text-muted-foreground">{laneTasks.length}</span>
              </header>

              <div className="space-y-2.5">
                {laneTasks.map((task) => {
                  const assigneeIds = task.assigneeAgentIds?.length
                    ? task.assigneeAgentIds
                    : task.assigneeAgentId
                      ? [task.assigneeAgentId]
                      : [];
                  const assigneeNames = assigneeIds
                    .map((id) => agentsById.get(id)?.name)
                    .filter((name): name is string => Boolean(name))
                    .join(", ");
                  const initiativeName =
                    initiativeNames.get(task.initiativeId) ||
                    initiativeNames.get(task.projectId) ||
                    task.initiativeId ||
                    task.projectId;

                  return (
                    <Card
                      key={task.id}
                      className={`cursor-pointer border-border p-3 gap-0 animate-in fade-in-0 ${lane.cardInClass} duration-300`}
                      onClick={() => onTaskClick(task)}
                    >
                      <div className="mb-1.5 flex items-start justify-between gap-2">
                        <h4 className="line-clamp-2 text-sm font-medium leading-snug text-foreground">
                          {task.title}
                        </h4>
                        <PriorityBadge priority={task.priority} />
                      </div>

                      {task.description ? (
                        <p className="mb-2 text-xs text-muted-foreground line-clamp-2">
                          {task.description}
                        </p>
                      ) : null}

                      <div className="mb-2 flex items-center justify-between gap-2 text-[11px] text-muted-foreground">
                        <span className="truncate rounded bg-secondary px-1.5 py-0.5 text-secondary-foreground">
                          {initiativeName}
                        </span>
                        <TimeAgo date={task.updatedAt} />
                      </div>

                      <div className="flex items-center justify-between gap-2">
                        <TaskStatusBadge status={task.status} />
                        {assigneeNames ? (
                          <span className="max-w-[160px] truncate text-xs text-muted-foreground">
                            {assigneeNames}
                          </span>
                        ) : (
                          <span className="text-xs text-muted-foreground">Unassigned</span>
                        )}
                      </div>
                    </Card>
                  );
                })}

                {laneTasks.length === 0 ? (
                  <p className="py-6 text-center text-xs text-muted-foreground">
                    No tasks
                  </p>
                ) : null}
              </div>
            </section>
          );
        })}
      </div>
      <ScrollBar orientation="horizontal" />
    </ScrollArea>
  );
}
