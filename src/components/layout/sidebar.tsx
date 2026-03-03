"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { Board } from "@/lib/types";
import { LayoutDashboard } from "lucide-react";

export function Sidebar() {
  const pathname = usePathname();
  const [boards, setBoards] = useState<Board[]>([]);

  useEffect(() => {
    fetch("/api/boards")
      .then((r) => r.json())
      .then((data) => {
        if (data.ok) setBoards(data.data);
      })
      .catch(() => {});
  }, [pathname]);

  return (
    <aside className="w-56 border-r border-border bg-sidebar flex flex-col h-screen shrink-0">
      <div className="p-4 border-b border-border">
        <Link href="/" className="flex items-center gap-2 text-sidebar-foreground font-semibold text-sm">
          <LayoutDashboard className="h-4 w-4" />
          Agentboard
        </Link>
      </div>

      <nav className="flex-1 p-2 space-y-0.5 overflow-y-auto">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide px-2 py-1.5">
          Boards
        </p>
        {boards.map((board) => {
          const isActive = pathname.startsWith(`/boards/${board.id}`);
          return (
            <Link
              key={board.id}
              href={`/boards/${board.id}`}
              className={`block px-2 py-1.5 text-sm rounded-md transition-colors ${
                isActive
                  ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                  : "text-sidebar-foreground hover:bg-sidebar-accent/50"
              }`}
            >
              {board.name}
            </Link>
          );
        })}
        {boards.length === 0 && (
          <p className="text-xs text-muted-foreground px-2 py-4">No boards yet</p>
        )}
      </nav>
    </aside>
  );
}
