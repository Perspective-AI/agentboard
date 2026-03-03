"use client";

import type { Agent, Task } from "@/lib/types";
import { AgentCard } from "./agent-card";
import { EmptyState } from "@/components/common/empty-state";

interface AgentListProps {
  agents: Agent[];
  tasks: Task[];
}

export function AgentList({ agents, tasks }: AgentListProps) {
  if (agents.length === 0) {
    return (
      <EmptyState
        title="No agents registered"
        description="Agents register themselves via the API. Share the board URL with your agents to get started."
      />
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {agents.map((agent) => (
        <AgentCard key={agent.id} agent={agent} tasks={tasks} />
      ))}
    </div>
  );
}
