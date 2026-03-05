import { NextRequest, NextResponse } from "next/server";
import { getStorage } from "@/lib/storage/fs-storage";
import { internalError } from "@/lib/api-utils";

type Params = { params: Promise<{ boardId: string }> };

export async function GET(request: NextRequest, { params }: Params) {
  try {
    const { boardId } = await params;
    const url = new URL(request.url);
    const filters = {
      status: url.searchParams.get("status") || undefined,
      assignee: url.searchParams.get("assignee") || undefined,
      tag: url.searchParams.get("tag") || undefined,
    };
    const storage = getStorage();
    const tasks = await storage.listAllBoardTasks(boardId, filters);
    return NextResponse.json({ ok: true, data: tasks });
  } catch (err) {
    console.error("GET /tasks:", err);
    return internalError();
  }
}
