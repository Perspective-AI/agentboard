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
  const { board, agents, initiatives, tasks, loading, error } = useBoardContext();

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
    agents.length === 0 && initiatives.length === 0 && tasks.length === 0;

  return (
    <div className="flex flex-col h-full">
      <Header board={board} tabs={!isEmpty ? <BoardNav boardId={boardId} /> : undefined} />
      <div className="flex-1 p-4 overflow-y-auto">
        {isEmpty ? (
          <GettingStarted boardId={boardId} />
        ) : (
          <div className="w-full">{children}</div>
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
