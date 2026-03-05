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
    } catch {
      setError("Failed to load board data");
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
          setAgents((prev) => {
            const next = [...prev.filter((a) => a.id !== (data as Agent).id), data as Agent];
            setBoard((b) => b ? { ...b, agentCount: next.length } : b);
            return next;
          });
          break;
        case "agent:updated":
          setAgents((prev) => prev.map((a) => (a.id === (data as Agent).id ? (data as Agent) : a)));
          break;
        case "agent:removed":
          setAgents((prev) => {
            const next = prev.filter((a) => a.id !== (data as Agent).id);
            setBoard((b) => b ? { ...b, agentCount: next.length } : b);
            return next;
          });
          break;
        case "initiative:created":
        case "project:created":
          setInitiatives((prev) => {
            if (prev.some((i) => i.id === (data as Initiative).id)) return prev;
            const next = [...prev, data as Initiative];
            setBoard((b) => b ? { ...b, initiativeCount: next.length, projectCount: next.length } : b);
            return next;
          });
          break;
        case "initiative:updated":
        case "project:updated":
          setInitiatives((prev) => prev.map((i) => (i.id === (data as Initiative).id ? (data as Initiative) : i)));
          break;
        case "initiative:removed":
        case "project:removed":
          setInitiatives((prev) => {
            if (!prev.some((i) => i.id === (data as Initiative).id)) return prev;
            const next = prev.filter((i) => i.id !== (data as Initiative).id);
            setBoard((b) => b ? { ...b, initiativeCount: next.length, projectCount: next.length } : b);
            return next;
          });
          break;
        case "task:created":
          setTasks((prev) => {
            if (prev.some((t) => t.id === (data as Task).id)) return prev;
            const next = [...prev, data as Task];
            setBoard((b) => b ? { ...b, taskCount: next.length } : b);
            return next;
          });
          break;
        case "task:updated":
          setTasks((prev) => prev.map((t) => (t.id === (data as Task).id ? (data as Task) : t)));
          break;
        case "task:removed":
          setTasks((prev) => {
            if (!prev.some((t) => t.id === (data as Task).id)) return prev;
            const next = prev.filter((t) => t.id !== (data as Task).id);
            setBoard((b) => b ? { ...b, taskCount: next.length } : b);
            return next;
          });
          break;
        case "activity:logged":
          setActivity((prev) => [data as ActivityEvent, ...prev].slice(0, 200));
          break;
        case "plan:created":
        case "plan:updated":
        case "plan:removed":
        case "plan_step:created":
        case "plan_step:updated":
        case "plan_step:removed":
          // Plans aren't in top-level state — no-op for now
          break;
        case "board:updated":
          fetchData();
          return;
      }
    },
    [fetchData],
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
