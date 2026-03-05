import { NextRequest, NextResponse } from "next/server";
import { getStorage } from "@/lib/storage/fs-storage";
import { internalError } from "@/lib/api-utils";

type Params = { params: Promise<{ boardId: string }> };

export async function GET(request: NextRequest, { params }: Params) {
  try {
    const { boardId } = await params;
    const url = new URL(request.url);

    const limitRaw = url.searchParams.get("limit");
    const limit = limitRaw ? Number.parseInt(limitRaw, 10) : undefined;

    const storage = getStorage();
    const events = await storage.listActivity(boardId, {
      limit: Number.isFinite(limit) ? limit : undefined,
      initiativeId: url.searchParams.get("initiativeId") || undefined,
      agentId: url.searchParams.get("agentId") || undefined,
      taskId: url.searchParams.get("taskId") || undefined,
    });

    return NextResponse.json({ ok: true, data: events });
  } catch (err) {
    console.error("GET /activity:", err);
    return internalError();
  }
}
