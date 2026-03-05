import { NextRequest, NextResponse } from "next/server";
import { getStorage } from "@/lib/storage/fs-storage";
import { sseHub } from "@/lib/sse/hub";
import { parseJsonBody, internalError } from "@/lib/api-utils";

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
    console.error("GET /agents/[agentId]:", err);
    return internalError();
  }
}

export async function PATCH(request: NextRequest, { params }: Params) {
  try {
    const { boardId, agentId } = await params;
    const parsed = await parseJsonBody(request);
    if (!parsed.ok) return parsed.response;
    const body = parsed.data as Record<string, unknown>;

    const updates: Record<string, unknown> = {};
    if ("name" in body) updates.name = body.name;
    if ("description" in body) updates.description = body.description;
    if ("status" in body) updates.status = body.status;
    if ("statusMessage" in body) updates.statusMessage = body.statusMessage;
    if ("currentTaskId" in body) updates.currentTaskId = body.currentTaskId;
    if ("currentInitiativeId" in body) updates.currentInitiativeId = body.currentInitiativeId;
    if ("metadata" in body) updates.metadata = body.metadata;

    const storage = getStorage();
    const agent = await storage.updateAgent(boardId, agentId, updates);
    if (!agent) {
      return NextResponse.json({ ok: false, error: { code: "NOT_FOUND", message: "Agent not found" } }, { status: 404 });
    }
    sseHub.broadcast(boardId, "agent:updated", agent);
    return NextResponse.json({ ok: true, data: agent });
  } catch (err) {
    console.error("PATCH /agents/[agentId]:", err);
    return internalError();
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
    if (agent) {
      sseHub.broadcast(boardId, "agent:removed", agent);
    }
    return NextResponse.json({ ok: true, data: { deleted: true } });
  } catch (err) {
    console.error("DELETE /agents/[agentId]:", err);
    return internalError();
  }
}
