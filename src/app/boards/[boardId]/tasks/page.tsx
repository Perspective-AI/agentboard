"use client";

import { useState, useMemo } from "react";
import { useBoardContext } from "@/components/board/board-data-provider";
import { AllTasksTable } from "@/components/board/all-tasks-table";
import { TaskDetail } from "@/components/board/task-detail";

export default function TasksPage() {
  const { tasks, agents, initiatives } = useBoardContext();
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);

  const selectedTask = useMemo(
    () => (selectedTaskId ? tasks.find((t) => t.id === selectedTaskId) ?? null : null),
    [selectedTaskId, tasks],
  );

  return (
    <>
      <AllTasksTable
        tasks={tasks}
        agents={agents}
        initiatives={initiatives}
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
