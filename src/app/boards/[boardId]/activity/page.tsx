"use client";

import { useBoardContext } from "@/components/board/board-data-provider";
import { ActivityFeed } from "@/components/board/activity-feed";

export default function ActivityPage() {
  const { activity } = useBoardContext();
  return <ActivityFeed activity={activity} />;
}
