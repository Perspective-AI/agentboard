import type { Agent, Task } from "@/lib/types";
import { Card } from "@/components/ui/card";
import { AgentStatusBadge } from "@/components/common/status-badge";
import { TimeAgo } from "@/components/common/time-ago";

const statusDotColor: Record<string, string> = {
  active: "bg-status-active-dot",
  idle: "bg-status-idle-dot",
  error: "bg-status-error-dot",
  offline: "bg-status-offline-dot",
  waiting: "bg-status-waiting-dot animate-pulse",
};

interface AgentCardProps {
  agent: Agent;
  tasks: Task[];
}

export function AgentCard({ agent, tasks }: AgentCardProps) {
  const currentTask = agent.currentTaskId
    ? tasks.find((t) => t.id === agent.currentTaskId)
    : null;

  return (
    <Card className="p-4 gap-0">
      <div className="flex items-center gap-2 mb-2">
        <div className={`w-2 h-2 rounded-full ${statusDotColor[agent.status]}`} />
        <h4 className="text-sm font-medium text-foreground truncate">{agent.name}</h4>
        <AgentStatusBadge status={agent.status} />
      </div>

      {agent.description && (
        <p className="text-xs text-muted-foreground line-clamp-2 mb-2">
          {agent.description}
        </p>
      )}

      {agent.statusMessage && (
        <p className="text-xs text-muted-foreground italic mb-2 line-clamp-2">
          &ldquo;{agent.statusMessage}&rdquo;
        </p>
      )}

      {currentTask && (
        <div className="text-xs bg-muted p-2 rounded-md mb-2">
          <span className="text-muted-foreground">Working on: </span>
          <span className="font-medium">{currentTask.title}</span>
        </div>
      )}

      <div className="flex items-center justify-between text-xs text-muted-foreground mt-auto pt-1">
        <span>Last heartbeat</span>
        <TimeAgo date={agent.lastHeartbeat} />
      </div>
    </Card>
  );
}
