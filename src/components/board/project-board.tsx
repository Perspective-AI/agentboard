"use client";

import type { Project, Task, Agent } from "@/lib/types";
import { ProjectColumn } from "./project-column";
import { EmptyState } from "@/components/common/empty-state";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";

interface ProjectBoardProps {
  projects: Project[];
  tasks: Task[];
  agents: Agent[];
  onTaskClick: (task: Task) => void;
}

export function ProjectBoard({ projects, tasks, agents, onTaskClick }: ProjectBoardProps) {
  if (projects.length === 0) {
    return (
      <EmptyState
        title="No projects yet"
        description="Create your first project via the API to see tasks in a kanban view."
      />
    );
  }

  return (
    <ScrollArea className="w-full">
      <div className="flex gap-4 pb-4 min-w-max">
        {projects.map((project) => (
          <ProjectColumn
            key={project.id}
            project={project}
            tasks={tasks.filter((t) => t.projectId === project.id)}
            agents={agents}
            onTaskClick={onTaskClick}
          />
        ))}
      </div>
      <ScrollBar orientation="horizontal" />
    </ScrollArea>
  );
}
