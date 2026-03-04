"use client";

import { use, type ReactNode } from "react";
import { Header } from "@/components/layout/header";
import { BoardDataProvider, useBoardContext } from "@/components/board/board-data-provider";
import { BoardNav } from "@/components/board/board-nav";
import { GettingStarted } from "@/components/board/getting-started";

function BoardLayoutInner({
  boardId,
  children,
}: {
  boardId: string;
  children: ReactNode;
}) {
  const { board, agents, projects, tasks, loading, error } = useBoardContext();

  if (loading) {
    return (
      <div className="flex flex-col h-full">
        <Header board={null} />
        <div className="flex items-center justify-center h-64">
          <p className="text-muted-foreground">Loading board...</p>
        </div>
      </div>
    );
  }

  if (error || !board) {
    return (
      <div className="flex flex-col h-full">
        <Header board={null} />
        <div className="flex items-center justify-center h-64">
          <p className="text-destructive">{error || "Board not found"}</p>
        </div>
      </div>
    );
  }

  const isEmpty =
    agents.length === 0 && projects.length === 0 && tasks.length === 0;

  return (
    <div className="flex flex-col h-full">
      <Header board={board} />
      <div className="flex-1 p-6 overflow-y-auto">
        {isEmpty ? (
          <GettingStarted boardId={boardId} />
        ) : (
          <div className="w-full">
            <BoardNav boardId={boardId} />
            <div className="mt-4">{children}</div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function BoardLayout({
  params,
  children,
}: {
  params: Promise<{ boardId: string }>;
  children: ReactNode;
}) {
  const { boardId } = use(params);
  return (
    <BoardDataProvider boardId={boardId}>
      <BoardLayoutInner boardId={boardId}>{children}</BoardLayoutInner>
    </BoardDataProvider>
  );
}
