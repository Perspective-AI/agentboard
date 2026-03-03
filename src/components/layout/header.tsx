"use client";

import type { BoardSummary } from "@/lib/types";
import { ThemeToggle } from "@/components/theme-toggle";
import { Separator } from "@/components/ui/separator";

interface HeaderProps {
  board?: BoardSummary | null;
}

export function Header({ board }: HeaderProps) {
  return (
    <header className="h-12 border-b border-border bg-background flex items-center justify-between px-4 shrink-0">
      <div className="flex items-center gap-3">
        {board ? (
          <>
            <h1 className="text-sm font-semibold text-foreground">{board.name}</h1>
            <Separator orientation="vertical" className="h-4" />
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              <span>{board.projectCount} projects</span>
              <span>{board.agentCount} agents</span>
              <span>{board.taskCount} tasks</span>
            </div>
          </>
        ) : (
          <h1 className="text-sm font-semibold text-foreground">Agentboard</h1>
        )}
      </div>
      <ThemeToggle />
    </header>
  );
}
