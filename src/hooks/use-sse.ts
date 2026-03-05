"use client";

import { useEffect, useRef, useCallback } from "react";
import type { SSEEvent } from "@/lib/types";

export function useSSE(
  boardId: string | null,
  onEvent: (event: SSEEvent) => void
) {
  const onEventRef = useRef(onEvent);
  onEventRef.current = onEvent;

  useEffect(() => {
    if (!boardId) return;

    const es = new EventSource(`/api/boards/${boardId}/events`);

    const handleMessage = (e: MessageEvent) => {
      try {
        const event = JSON.parse(e.data) as SSEEvent;
        onEventRef.current(event);
      } catch {
        // ignore parse errors
      }
    };

    // Listen to all event types
    const eventTypes = [
      "agent:registered", "agent:updated", "agent:removed",
      "initiative:created", "initiative:updated", "initiative:removed",
      "project:created", "project:updated", "project:removed",
      "plan:created", "plan:updated", "plan:removed",
      "plan_step:created", "plan_step:updated", "plan_step:removed",
      "task:created", "task:updated", "task:removed",
      "activity:logged",
      "board:updated",
    ];

    for (const type of eventTypes) {
      es.addEventListener(type, handleMessage);
    }

    return () => {
      es.close();
    };
  }, [boardId]);
}
