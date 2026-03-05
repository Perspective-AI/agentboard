"use client";

import { useState } from "react";
import type { Task } from "@/lib/types";
import { useBoardContext } from "@/components/board/board-data-provider";
import { ProjectBoard } from "@/components/board/project-board";
import { TaskDetail } from "@/components/board/task-detail";

export default function InitiativesPage() {
  const { initiatives, tasks, agents } = useBoardContext();
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);

  return (
    <>
      <ProjectBoard
        projects={initiatives}
        tasks={tasks}
        agents={agents}
        onTaskClick={setSelectedTask}
      />
      <TaskDetail
        task={selectedTask}
        agents={agents}
        onClose={() => setSelectedTask(null)}
      />
    </>
  );
}
