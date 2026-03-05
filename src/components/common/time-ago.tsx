"use client";

import { useSyncExternalStore } from "react";

function formatTimeAgo(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (seconds < 5) return "just now";
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return date.toLocaleDateString();
}

// Single shared timer — one interval for all TimeAgo instances
let tick = 0;
const listeners = new Set<() => void>();
let intervalId: ReturnType<typeof setInterval> | null = null;

function subscribe(callback: () => void): () => void {
  listeners.add(callback);
  if (listeners.size === 1 && !intervalId) {
    intervalId = setInterval(() => {
      tick += 1;
      for (const listener of listeners) listener();
    }, 10000);
  }
  return () => {
    listeners.delete(callback);
    if (listeners.size === 0 && intervalId) {
      clearInterval(intervalId);
      intervalId = null;
    }
  };
}

function getSnapshot(): number {
  return tick;
}

function getServerSnapshot(): number {
  return 0;
}

export function TimeAgo({ date }: { date: string }) {
  const currentTick = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  // currentTick triggers re-render on each interval tick
  void currentTick;
  const text = formatTimeAgo(date);

  return (
    <time dateTime={date} title={new Date(date).toLocaleString()} className="text-xs text-muted-foreground">
      {text}
    </time>
  );
}
