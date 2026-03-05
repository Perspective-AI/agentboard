"use client";

import type { Task, Agent } from "@/lib/types";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { TaskStatusBadge, PriorityBadge } from "@/components/common/status-badge";
import { TimeAgo } from "@/components/common/time-ago";
import { Separator } from "@/components/ui/separator";

interface TaskDetailProps {
  task: Task | null;
  agents: Agent[];
  onClose: () => void;
}

export function TaskDetail({ task, agents, onClose }: TaskDetailProps) {
  if (!task) return null;

  const assigneeIds = task.assigneeAgentIds?.length
    ? task.assigneeAgentIds
    : task.assigneeAgentId
      ? [task.assigneeAgentId]
      : [];
  const assigneeNames = assigneeIds.map((id) => {
    const found = agents.find((agent) => agent.id === id);
    return found ? found.name : id;
  });

  return (
    <Sheet open={!!task} onOpenChange={() => onClose()}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="text-lg text-left">{task.title}</SheetTitle>
        </SheetHeader>

        <div className="mt-4 space-y-4">
          <div className="flex items-center gap-2">
            <TaskStatusBadge status={task.status} />
            <PriorityBadge priority={task.priority} />
            {task.tags.map((tag) => (
              <span
                key={tag}
                className="text-xs px-1.5 py-0.5 rounded bg-secondary text-secondary-foreground"
              >
                {tag}
              </span>
            ))}
          </div>

          <Separator />

          {task.description && (
            <div>
              <h4 className="text-sm font-medium mb-1">Description</h4>
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                {task.description}
              </p>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-muted-foreground">Initiative</span>
              <p className="font-medium">{task.initiativeId || task.projectId}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Assignee</span>
              <p className="font-medium">{assigneeNames.length > 0 ? assigneeNames.join(", ") : "Unassigned"}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Created</span>
              <p><TimeAgo date={task.createdAt} /></p>
            </div>
            <div>
              <span className="text-muted-foreground">Updated</span>
              <p><TimeAgo date={task.updatedAt} /></p>
            </div>
            {task.completedAt && (
              <div>
                <span className="text-muted-foreground">Completed</span>
                <p><TimeAgo date={task.completedAt} /></p>
              </div>
            )}
          </div>

          {task.deliverables.length > 0 && (
            <div>
              <h4 className="text-sm font-medium mb-1">Deliverables</h4>
              <div className="space-y-1">
                {task.deliverables.map((item) => (
                  <p key={item} className="text-sm text-muted-foreground">
                    {item}
                  </p>
                ))}
              </div>
            </div>
          )}

          <Separator />

          <div>
            <h4 className="text-sm font-medium mb-1">API</h4>
            <code className="text-xs block bg-muted p-2 rounded-md overflow-x-auto">
              PATCH /api/boards/{task.boardId}/initiatives/{task.initiativeId || task.projectId}/tasks/{task.id}
            </code>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
