import { NextRequest, NextResponse } from "next/server";
import { getStorage } from "@/lib/storage/fs-storage";
import { sseHub } from "@/lib/sse/hub";

type Params = { params: Promise<{ boardId: string }> };

export async function POST(request: NextRequest, { params }: Params) {
  try {
    const { boardId } = await params;
    const body = await request.json();
    if (!body.name) {
      return NextResponse.json({ ok: false, error: { code: "MISSING_NAME", message: "Agent name is required" } }, { status: 400 });
    }
    const storage = getStorage();
    const board = await storage.getBoard(boardId);
    if (!board) {
      return NextResponse.json({ ok: false, error: { code: "NOT_FOUND", message: "Board not found" } }, { status: 404 });
    }
    const agent = await storage.createAgent(boardId, {
      name: body.name,
      description: body.description || "",
      metadata: body.metadata || {},
    });
    sseHub.broadcast(boardId, "agent:registered", agent);
    return NextResponse.json({ ok: true, data: agent }, { status: 201 });
  } catch (err) {
    return NextResponse.json({ ok: false, error: { code: "INTERNAL_ERROR", message: String(err) } }, { status: 500 });
  }
}

export async function GET(_request: NextRequest, { params }: Params) {
  try {
    const { boardId } = await params;
    const storage = getStorage();
    const agents = await storage.listAgents(boardId);
    return NextResponse.json({ ok: true, data: agents });
  } catch (err) {
    return NextResponse.json({ ok: false, error: { code: "INTERNAL_ERROR", message: String(err) } }, { status: 500 });
  }
}
