"use client";

import { useState, useMemo } from "react";
import { useBoardContext } from "@/components/board/board-data-provider";
import { ProjectBoard } from "@/components/board/project-board";
import { TaskDetail } from "@/components/board/task-detail";

export default function InitiativesPage() {
  const { initiatives, tasks, agents } = useBoardContext();
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);

  const selectedTask = useMemo(
    () => (selectedTaskId ? tasks.find((t) => t.id === selectedTaskId) ?? null : null),
    [selectedTaskId, tasks],
  );

  return (
    <>
      <ProjectBoard
        projects={initiatives}
        tasks={tasks}
        agents={agents}
        onTaskClick={(task) => setSelectedTaskId(task.id)}
      />
      <TaskDetail
        task={selectedTask}
        agents={agents}
        onClose={() => setSelectedTaskId(null)}
      />
    </>
  );
}
