"use client";

import { useParams } from "next/navigation";
import { InstallAgents } from "@/components/board/install-agents";

export default function InstallPage() {
  const params = useParams<{ boardId: string }>();
  return <InstallAgents boardId={params.boardId} />;
}
