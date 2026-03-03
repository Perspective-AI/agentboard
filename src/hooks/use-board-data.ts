"use client";

import { useState, useEffect, useCallback } from "react";
import type { BoardSummary, Agent, Project, Task, SSEEvent } from "@/lib/types";
import { useSSE } from "./use-sse";

interface BoardData {
  board: BoardSummary | null;
  agents: Agent[];
  projects: Project[];
  tasks: Task[];
  loading: boolean;
  error: string | null;
  refresh: () => void;
}

export function useBoardData(boardId: string): BoardData {
  const [board, setBoard] = useState<BoardSummary | null>(null);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const [boardRes, agentsRes, projectsRes, tasksRes] = await Promise.all([
        fetch(`/api/boards/${boardId}`),
        fetch(`/api/boards/${boardId}/agents`),
        fetch(`/api/boards/${boardId}/projects`),
        fetch(`/api/boards/${boardId}/tasks`),
      ]);

      const [boardData, agentsData, projectsData, tasksData] = await Promise.all([
        boardRes.json(),
        agentsRes.json(),
        projectsRes.json(),
        tasksRes.json(),
      ]);

      if (boardData.ok) setBoard(boardData.data);
      else setError(boardData.error?.message || "Failed to load board");
      if (agentsData.ok) setAgents(agentsData.data);
      if (projectsData.ok) setProjects(projectsData.data);
      if (tasksData.ok) setTasks(tasksData.data);
    } catch (err) {
      setError(String(err));
    } finally {
      setLoading(false);
    }
  }, [boardId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleSSE = useCallback((event: SSEEvent) => {
    const { type, data } = event;
    switch (type) {
      case "agent:registered":
        setAgents((prev) => [...prev.filter((a) => a.id !== (data as Agent).id), data as Agent]);
        setBoard((prev) => prev ? { ...prev, agentCount: prev.agentCount + 1 } : prev);
        break;
      case "agent:updated":
        setAgents((prev) => prev.map((a) => (a.id === (data as Agent).id ? (data as Agent) : a)));
        break;
      case "agent:removed":
        setAgents((prev) => prev.filter((a) => a.id !== (data as Agent).id));
        setBoard((prev) => prev ? { ...prev, agentCount: Math.max(0, prev.agentCount - 1) } : prev);
        break;
      case "project:created":
        setProjects((prev) => [...prev, data as Project]);
        setBoard((prev) => prev ? { ...prev, projectCount: prev.projectCount + 1 } : prev);
        break;
      case "project:updated":
        setProjects((prev) => prev.map((p) => (p.id === (data as Project).id ? (data as Project) : p)));
        break;
      case "project:removed":
        setProjects((prev) => prev.filter((p) => p.id !== (data as Project).id));
        setBoard((prev) => prev ? { ...prev, projectCount: Math.max(0, prev.projectCount - 1) } : prev);
        break;
      case "task:created":
        setTasks((prev) => [...prev, data as Task]);
        setBoard((prev) => prev ? { ...prev, taskCount: prev.taskCount + 1 } : prev);
        break;
      case "task:updated":
        setTasks((prev) => prev.map((t) => (t.id === (data as Task).id ? (data as Task) : t)));
        break;
      case "task:removed":
        setTasks((prev) => prev.filter((t) => t.id !== (data as Task).id));
        setBoard((prev) => prev ? { ...prev, taskCount: Math.max(0, prev.taskCount - 1) } : prev);
        break;
      case "board:updated":
        fetchData();
        break;
    }
  }, [fetchData]);

  useSSE(boardId, handleSSE);

  return { board, agents, projects, tasks, loading, error, refresh: fetchData };
}
