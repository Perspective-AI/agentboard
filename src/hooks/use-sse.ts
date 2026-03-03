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
      "project:created", "project:updated", "project:removed",
      "task:created", "task:updated", "task:removed",
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
