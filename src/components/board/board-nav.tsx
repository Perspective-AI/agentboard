"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useBoardContext } from "./board-data-provider";
import { cn } from "@/lib/utils";
import { Activity, LayoutGrid, List, Users } from "lucide-react";
import type { LucideIcon } from "lucide-react";

const triggerBase =
  "relative inline-flex h-7 items-center justify-center gap-1.5 rounded-md border border-transparent px-2.5 text-xs font-medium whitespace-nowrap text-foreground/70 transition-colors hover:text-foreground";
const triggerActive =
  "bg-background text-foreground shadow-sm dark:border-input dark:bg-input/30 dark:text-foreground";

interface Tab {
  value: string;
  label: string;
  icon: LucideIcon;
  countKey?: "initiatives" | "agents" | "tasks" | "activity";
}

const tabs: Tab[] = [
  { value: "initiatives", label: "Board", icon: LayoutGrid, countKey: "initiatives" },
  { value: "tasks", label: "List", icon: List, countKey: "tasks" },
  { value: "agents", label: "Agents", icon: Users, countKey: "agents" },
  { value: "activity", label: "Activity", icon: Activity, countKey: "activity" },
];

export function BoardNav({ boardId }: { boardId: string }) {
  const pathname = usePathname();
  const { initiatives, agents, tasks, activity } = useBoardContext();

  const counts: Record<string, number> = {
    initiatives: initiatives.length,
    agents: agents.length,
    tasks: tasks.length,
    activity: activity.length,
  };

  return (
    <div
      className="inline-flex w-fit max-w-full items-center rounded-md bg-muted p-1 text-muted-foreground overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      role="tablist"
    >
      {tabs.map((tab) => {
        const href = `/boards/${boardId}/${tab.value}`;
        const isActive = pathname === href || pathname.startsWith(href + "/");
        const count = tab.countKey ? counts[tab.countKey] : 0;
        const Icon = tab.icon;

        return (
          <Link
            key={tab.value}
            href={href}
            role="tab"
            aria-selected={isActive}
            className={cn(triggerBase, isActive && triggerActive)}
          >
            <Icon className="h-3.5 w-3.5" aria-hidden="true" />
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
