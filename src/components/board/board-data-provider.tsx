"use client";

import { createContext, useContext, type ReactNode } from "react";
import type { BoardSummary, Agent, Project, Task } from "@/lib/types";
import { useBoardData } from "@/hooks/use-board-data";

interface BoardDataContextValue {
  board: BoardSummary | null;
  agents: Agent[];
  projects: Project[];
  tasks: Task[];
  loading: boolean;
  error: string | null;
  refresh: () => void;
}

const BoardDataContext = createContext<BoardDataContextValue | null>(null);

export function BoardDataProvider({
  boardId,
  children,
}: {
  boardId: string;
  children: ReactNode;
}) {
  const data = useBoardData(boardId);
  return (
    <BoardDataContext.Provider value={data}>
      {children}
    </BoardDataContext.Provider>
  );
}

export function useBoardContext() {
  const ctx = useContext(BoardDataContext);
  if (!ctx) {
    throw new Error("useBoardContext must be used within a BoardDataProvider");
  }
  return ctx;
}
