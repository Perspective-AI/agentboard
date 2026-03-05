import { NextRequest, NextResponse } from "next/server";
import { getStorage } from "@/lib/storage/fs-storage";
import { sseHub } from "@/lib/sse/hub";

type Params = { params: Promise<{ boardId: string; agentId: string }> };

export async function POST(request: NextRequest, { params }: Params) {
  try {
    const { boardId, agentId } = await params;
    let message: string | undefined;
    try {
      const body = await request.json();
      message = body.message;
    } catch {
      // empty body is fine
    }
    const storage = getStorage();
    const agent = await storage.heartbeatAgent(boardId, agentId, message);
    if (!agent) {
      return NextResponse.json({ ok: false, error: { code: "NOT_FOUND", message: "Agent not found" } }, { status: 404 });
    }
    const [latestHeartbeatEvent] = await storage.listActivity(boardId, { limit: 1, agentId });
    sseHub.broadcast(boardId, "agent:updated", agent);
    if (latestHeartbeatEvent?.type === "agent.heartbeat") {
      sseHub.broadcast(boardId, "activity:logged", latestHeartbeatEvent);
    }
    return NextResponse.json({ ok: true, data: agent });
  } catch (err) {
    console.error("POST /heartbeat:", err);
    return NextResponse.json({ ok: false, error: { code: "INTERNAL_ERROR", message: "An unexpected error occurred" } }, { status: 500 });
  }
}
