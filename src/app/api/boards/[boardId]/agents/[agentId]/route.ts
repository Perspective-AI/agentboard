import { NextRequest, NextResponse } from "next/server";
import { getStorage } from "@/lib/storage/fs-storage";
import { sseHub } from "@/lib/sse/hub";

type Params = { params: Promise<{ boardId: string; agentId: string }> };

export async function GET(_request: NextRequest, { params }: Params) {
  try {
    const { boardId, agentId } = await params;
    const storage = getStorage();
    const agent = await storage.getAgent(boardId, agentId);
    if (!agent) {
      return NextResponse.json({ ok: false, error: { code: "NOT_FOUND", message: "Agent not found" } }, { status: 404 });
    }
    return NextResponse.json({ ok: true, data: agent });
  } catch (err) {
    return NextResponse.json({ ok: false, error: { code: "INTERNAL_ERROR", message: String(err) } }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest, { params }: Params) {
  try {
    const { boardId, agentId } = await params;
    const body = await request.json();
    const storage = getStorage();
    const agent = await storage.updateAgent(boardId, agentId, body);
    if (!agent) {
      return NextResponse.json({ ok: false, error: { code: "NOT_FOUND", message: "Agent not found" } }, { status: 404 });
    }
    sseHub.broadcast(boardId, "agent:updated", agent);
    return NextResponse.json({ ok: true, data: agent });
  } catch (err) {
    return NextResponse.json({ ok: false, error: { code: "INTERNAL_ERROR", message: String(err) } }, { status: 500 });
  }
}

export async function DELETE(_request: NextRequest, { params }: Params) {
  try {
    const { boardId, agentId } = await params;
    const storage = getStorage();
    const agent = await storage.getAgent(boardId, agentId);
    const deleted = await storage.deleteAgent(boardId, agentId);
    if (!deleted) {
      return NextResponse.json({ ok: false, error: { code: "NOT_FOUND", message: "Agent not found" } }, { status: 404 });
    }
    sseHub.broadcast(boardId, "agent:removed", agent);
    return NextResponse.json({ ok: true, data: { deleted: true } });
  } catch (err) {
    return NextResponse.json({ ok: false, error: { code: "INTERNAL_ERROR", message: String(err) } }, { status: 500 });
  }
}
