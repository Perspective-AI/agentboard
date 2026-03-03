"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useBoardContext } from "./board-data-provider";
import { cn } from "@/lib/utils";

const triggerBase =
  "relative inline-flex h-[calc(100%-1px)] flex-1 items-center justify-center gap-1.5 rounded-md border border-transparent px-2 py-1 text-sm font-medium whitespace-nowrap text-foreground/60 transition-all hover:text-foreground";
const triggerActive =
  "bg-background text-foreground shadow-sm dark:border-input dark:bg-input/30 dark:text-foreground";

interface Tab {
  value: string;
  label: string;
  countKey?: "projects" | "agents" | "tasks";
}

const tabs: Tab[] = [
  { value: "projects", label: "Projects", countKey: "projects" },
  { value: "agents", label: "Agents", countKey: "agents" },
  { value: "tasks", label: "All Tasks", countKey: "tasks" },
  { value: "install", label: "Install" },
];

export function BoardNav({ boardId }: { boardId: string }) {
  const pathname = usePathname();
  const { projects, agents, tasks } = useBoardContext();

  const counts: Record<string, number> = {
    projects: projects.length,
    agents: agents.length,
    tasks: tasks.length,
  };

  return (
    <div
      className="inline-flex w-fit items-center justify-center rounded-lg p-[3px] text-muted-foreground h-9 bg-muted"
      role="tablist"
    >
      {tabs.map((tab) => {
        const href = `/boards/${boardId}/${tab.value}`;
        const isActive = pathname === href || pathname.startsWith(href + "/");
        const count = tab.countKey ? counts[tab.countKey] : 0;

        return (
          <Link
            key={tab.value}
            href={href}
            role="tab"
            aria-selected={isActive}
            className={cn(triggerBase, isActive && triggerActive)}
          >
            {tab.label}
            {tab.countKey && count > 0 && (
              <span className="ml-1.5 text-xs text-muted-foreground">
                {count}
              </span>
            )}
          </Link>
        );
      })}
    </div>
  );
}
