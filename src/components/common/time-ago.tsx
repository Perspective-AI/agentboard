"use client";

import { useState, useEffect } from "react";

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

export function TimeAgo({ date }: { date: string }) {
  const [text, setText] = useState(() => formatTimeAgo(date));

  useEffect(() => {
    const interval = setInterval(() => {
      setText(formatTimeAgo(date));
    }, 10000);
    return () => clearInterval(interval);
  }, [date]);

  return (
    <time dateTime={date} title={new Date(date).toLocaleString()} className="text-xs text-muted-foreground">
      {text}
    </time>
  );
}
