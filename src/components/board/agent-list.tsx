"use client";

import { useEffect, useState, useMemo } from "react";
import type { Agent, Task } from "@/lib/types";
import { AgentCard } from "./agent-card";
import { EmptyState } from "@/components/common/empty-state";

interface AgentListProps {
  agents: Agent[];
  tasks: Task[];
}

const ACTIVE_SESSION_TIMEOUT_MINUTES = 3;
const ACTIVE_SESSION_TIMEOUT_MS = ACTIVE_SESSION_TIMEOUT_MINUTES * 60 * 1000;
const ACTIVE_STATUSES = new Set(["active", "waiting"]);

function isActivelyReporting(agent: Agent, nowMs: number): boolean {
  if (!ACTIVE_STATUSES.has(agent.status)) return false;
  const heartbeatMs = Date.parse(agent.lastHeartbeat);
  if (!Number.isFinite(heartbeatMs)) return false;
  return nowMs - heartbeatMs <= ACTIVE_SESSION_TIMEOUT_MS;
}

export function AgentList({ agents, tasks }: AgentListProps) {
  const [nowMs, setNowMs] = useState(() => Date.now());

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      setNowMs(Date.now());
    }, 15000);

    return () => window.clearInterval(intervalId);
  }, []);

  const { activeAgents, pastAgents } = useMemo(() => {
    const sorted = [...agents].sort((a, b) => b.lastHeartbeat.localeCompare(a.lastHeartbeat));
    const active: Agent[] = [];
    const past: Agent[] = [];
    for (const agent of sorted) {
      if (isActivelyReporting(agent, nowMs)) {
        active.push(agent);
      } else {
        past.push(agent);
      }
    }
    return { activeAgents: active, pastAgents: past };
  }, [agents, nowMs]);

  if (agents.length === 0) {
    return (
      <EmptyState
        title="No agents registered"
        description="Agents register themselves via the API. Share the board URL with your agents to get started."
      />
    );
  }

  return (
    <div className="space-y-6">
      <section>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-medium text-foreground">Active Agents ({activeAgents.length})</h3>
          <p className="text-xs text-muted-foreground">
            heartbeat within {ACTIVE_SESSION_TIMEOUT_MINUTES} minutes
          </p>
        </div>
        {activeAgents.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {activeAgents.map((agent) => (
              <AgentCard key={agent.id} agent={agent} tasks={tasks} />
            ))}
          </div>
        ) : (
          <div className="rounded-md border border-border/70 bg-muted/20 px-3 py-2 text-xs text-muted-foreground">
            No actively reporting agents in the last {ACTIVE_SESSION_TIMEOUT_MINUTES} minutes.
          </div>
        )}
      </section>

      <section>
        <h3 className="text-sm font-medium text-muted-foreground mb-3">Past Agents ({pastAgents.length})</h3>
        {pastAgents.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {pastAgents.map((agent) => (
              <AgentCard key={agent.id} agent={agent} tasks={tasks} />
            ))}
          </div>
        ) : (
          <div className="rounded-md border border-border/70 bg-muted/20 px-3 py-2 text-xs text-muted-foreground">
            No past agents.
          </div>
        )}
      </section>
    </div>
  );
}
