"use client";

import { useState, useEffect, useCallback } from "react";
import type {
  ActivityEvent,
  Agent,
  BoardSummary,
  Initiative,
  Project,
  SSEEvent,
  Task,
} from "@/lib/types";
import { useSSE } from "./use-sse";

interface BoardData {
  board: BoardSummary | null;
  agents: Agent[];
  initiatives: Initiative[];
  projects: Project[];
  tasks: Task[];
  activity: ActivityEvent[];
  loading: boolean;
  error: string | null;
  refresh: () => void;
}

export function useBoardData(boardId: string): BoardData {
  const [board, setBoard] = useState<BoardSummary | null>(null);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [initiatives, setInitiatives] = useState<Initiative[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [activity, setActivity] = useState<ActivityEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchActivity = useCallback(async () => {
    try {
      const res = await fetch(`/api/boards/${boardId}/activity?limit=200`);
      const data = await res.json();
      if (data.ok) setActivity(data.data);
    } catch {
      // Activity feed is best-effort.
    }
  }, [boardId]);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const [boardRes, agentsRes, initiativesRes, tasksRes, activityRes] = await Promise.all([
        fetch(`/api/boards/${boardId}`),
        fetch(`/api/boards/${boardId}/agents`),
        fetch(`/api/boards/${boardId}/initiatives`),
        fetch(`/api/boards/${boardId}/tasks`),
        fetch(`/api/boards/${boardId}/activity?limit=200`),
      ]);

      const [boardData, agentsData, initiativesData, tasksData, activityData] = await Promise.all([
        boardRes.json(),
        agentsRes.json(),
        initiativesRes.json(),
        tasksRes.json(),
        activityRes.json(),
      ]);

      if (boardData.ok) setBoard(boardData.data);
      else setError(boardData.error?.message || "Failed to load board");

      if (agentsData.ok) setAgents(agentsData.data);
      if (initiativesData.ok) setInitiatives(initiativesData.data);
      if (tasksData.ok) setTasks(tasksData.data);
      if (activityData.ok) setActivity(activityData.data);
    } catch (err) {
      setError(String(err));
    } finally {
      setLoading(false);
    }
  }, [boardId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleSSE = useCallback(
    (event: SSEEvent) => {
      const { type, data } = event;

      switch (type) {
        case "agent:registered":
          setAgents((prev) => [...prev.filter((a) => a.id !== (data as Agent).id), data as Agent]);
          setBoard((prev) =>
            prev
              ? {
                  ...prev,
                  agentCount: prev.agentCount + 1,
                }
              : prev,
          );
          break;
        case "agent:updated":
          setAgents((prev) => prev.map((a) => (a.id === (data as Agent).id ? (data as Agent) : a)));
          break;
        case "agent:removed":
          setAgents((prev) => prev.filter((a) => a.id !== (data as Agent).id));
          setBoard((prev) =>
            prev
              ? {
                  ...prev,
                  agentCount: Math.max(0, prev.agentCount - 1),
                }
              : prev,
          );
          break;
        case "initiative:created":
        case "project:created":
          setInitiatives((prev) => [...prev.filter((i) => i.id !== (data as Initiative).id), data as Initiative]);
          setBoard((prev) =>
            prev
              ? {
                  ...prev,
                  initiativeCount: prev.initiativeCount + 1,
                  projectCount: prev.projectCount + 1,
                }
              : prev,
          );
          break;
        case "initiative:updated":
        case "project:updated":
          setInitiatives((prev) => prev.map((i) => (i.id === (data as Initiative).id ? (data as Initiative) : i)));
          break;
        case "initiative:removed":
        case "project:removed":
          setInitiatives((prev) => prev.filter((i) => i.id !== (data as Initiative).id));
          setBoard((prev) =>
            prev
              ? {
                  ...prev,
                  initiativeCount: Math.max(0, prev.initiativeCount - 1),
                  projectCount: Math.max(0, prev.projectCount - 1),
                }
              : prev,
          );
          break;
        case "task:created":
          setTasks((prev) => [...prev, data as Task]);
          setBoard((prev) =>
            prev
              ? {
                  ...prev,
                  taskCount: prev.taskCount + 1,
                }
              : prev,
          );
          break;
        case "task:updated":
          setTasks((prev) => prev.map((t) => (t.id === (data as Task).id ? (data as Task) : t)));
          break;
        case "task:removed":
          setTasks((prev) => prev.filter((t) => t.id !== (data as Task).id));
          setBoard((prev) =>
            prev
              ? {
                  ...prev,
                  taskCount: Math.max(0, prev.taskCount - 1),
                }
              : prev,
          );
          break;
        case "activity:logged":
          setActivity((prev) => [data as ActivityEvent, ...prev].slice(0, 200));
          break;
        case "board:updated":
          fetchData();
          return;
      }

      // Keep behavior trace fresh after any state mutation.
      fetchActivity();
    },
    [fetchActivity, fetchData],
  );

  useSSE(boardId, handleSSE);

  return {
    board,
    agents,
    initiatives,
    projects: initiatives,
    tasks,
    activity,
    loading,
    error,
    refresh: fetchData,
  };
}
