"use client";

import { useState } from "react";
import type { Task } from "@/lib/types";
import { useBoardData } from "@/hooks/use-board-data";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ProjectBoard } from "./project-board";
import { AgentList } from "./agent-list";
import { AllTasksTable } from "./all-tasks-table";
import { TaskDetail } from "./task-detail";
import { GettingStarted } from "./getting-started";

interface BoardViewProps {
  boardId: string;
}

export function BoardView({ boardId }: BoardViewProps) {
  const { board, agents, projects, tasks, loading, error } = useBoardData(boardId);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">Loading board...</p>
      </div>
    );
  }

  if (error || !board) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-destructive">{error || "Board not found"}</p>
      </div>
    );
  }

  const isEmpty = agents.length === 0 && projects.length === 0 && tasks.length === 0;

  if (isEmpty) {
    return <GettingStarted boardId={boardId} />;
  }

  return (
    <>
      <Tabs defaultValue="projects" className="w-full">
        <TabsList>
          <TabsTrigger value="projects">
            Projects
            {projects.length > 0 && (
              <span className="ml-1.5 text-xs text-muted-foreground">{projects.length}</span>
            )}
          </TabsTrigger>
          <TabsTrigger value="agents">
            Agents
            {agents.length > 0 && (
              <span className="ml-1.5 text-xs text-muted-foreground">{agents.length}</span>
            )}
          </TabsTrigger>
          <TabsTrigger value="tasks">
            All Tasks
            {tasks.length > 0 && (
              <span className="ml-1.5 text-xs text-muted-foreground">{tasks.length}</span>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="projects" className="mt-4">
          <ProjectBoard
            projects={projects}
            tasks={tasks}
            agents={agents}
            onTaskClick={setSelectedTask}
          />
        </TabsContent>

        <TabsContent value="agents" className="mt-4">
          <AgentList agents={agents} tasks={tasks} />
        </TabsContent>

        <TabsContent value="tasks" className="mt-4">
          <AllTasksTable
            tasks={tasks}
            agents={agents}
            projects={projects}
            onTaskClick={setSelectedTask}
          />
        </TabsContent>
      </Tabs>

      <TaskDetail
        task={selectedTask}
        agents={agents}
        onClose={() => setSelectedTask(null)}
      />
    </>
  );
}
