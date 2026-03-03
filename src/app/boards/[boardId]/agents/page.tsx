"use client";

import { useBoardContext } from "@/components/board/board-data-provider";
import { AgentList } from "@/components/board/agent-list";

export default function AgentsPage() {
  const { agents, tasks } = useBoardContext();
  return <AgentList agents={agents} tasks={tasks} />;
}
