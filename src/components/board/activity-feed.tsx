"use client";

import type { ActivityEvent } from "@/lib/types";
import { EmptyState } from "@/components/common/empty-state";
import { TimeAgo } from "@/components/common/time-ago";

interface ActivityFeedProps {
  activity: ActivityEvent[];
}

function getReporter(event: ActivityEvent): string {
  if (event.agentId) return event.agentId;
  if (event.type.startsWith("system.")) return "system";
  if (event.type.startsWith("task.")) return "missing-agent";
  return "unknown";
}

export function ActivityFeed({ activity }: ActivityFeedProps) {
  if (activity.length === 0) {
    return (
      <EmptyState
        title="No activity yet"
        description="As agents report progress, events will appear here."
      />
    );
  }

  return (
    <div className="border rounded-md">
      <div className="px-3 py-2 border-b bg-muted/25 text-[11px] text-muted-foreground">
        Activity Feed
      </div>
      <div className="px-3 py-1.5">
        <div className="space-y-0.5">
          {activity.map((event) => (
            <article
              key={event.id}
              className="relative pl-4 py-1.5 border-b border-border/50 last:border-b-0"
              title={event.message}
            >
              <span className="absolute left-0 top-[13px] h-1.5 w-1.5 rounded-full bg-foreground/50" />
              <p className="text-[11px] text-muted-foreground leading-4">
                <span className="font-mono text-foreground/80">{getReporter(event)}</span>
                <span className="mx-1.5">•</span>
                <TimeAgo date={event.createdAt} />
              </p>
              <p className="text-xs leading-5">
                {event.message}
                <span className="text-muted-foreground"> ({event.type})</span>
              </p>
            </article>
          ))}
        </div>
      </div>
    </div>
  );
}
