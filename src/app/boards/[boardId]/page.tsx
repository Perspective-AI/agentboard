"use client";

import { use } from "react";
import { BoardView } from "@/components/board/board-view";
import { Header } from "@/components/layout/header";
import { useBoardData } from "@/hooks/use-board-data";

function BoardPageInner({ boardId }: { boardId: string }) {
  const { board } = useBoardData(boardId);

  return (
    <div className="flex flex-col h-full">
      <Header board={board} />
      <div className="flex-1 p-6 overflow-y-auto">
        <BoardView boardId={boardId} />
      </div>
    </div>
  );
}

export default function BoardPage({ params }: { params: Promise<{ boardId: string }> }) {
  const { boardId } = use(params);
  return <BoardPageInner boardId={boardId} />;
}
