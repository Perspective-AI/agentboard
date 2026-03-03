"use client";

import { useState } from "react";
import type { Task } from "@/lib/types";
import { useBoardContext } from "@/components/board/board-data-provider";
import { AllTasksTable } from "@/components/board/all-tasks-table";
import { TaskDetail } from "@/components/board/task-detail";

export default function TasksPage() {
  const { tasks, agents, projects } = useBoardContext();
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);

  return (
    <>
      <AllTasksTable
        tasks={tasks}
        agents={agents}
        projects={projects}
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
