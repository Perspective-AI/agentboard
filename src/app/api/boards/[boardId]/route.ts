import { NextRequest, NextResponse } from "next/server";
import { getStorage } from "@/lib/storage/fs-storage";
import { sseHub } from "@/lib/sse/hub";
import { parseJsonBody, internalError } from "@/lib/api-utils";

type Params = { params: Promise<{ boardId: string }> };

export async function GET(_request: NextRequest, { params }: Params) {
  try {
    const { boardId } = await params;
    const storage = getStorage();
    const summary = await storage.getBoardSummary(boardId);
    if (!summary) {
      return NextResponse.json({ ok: false, error: { code: "NOT_FOUND", message: "Board not found" } }, { status: 404 });
    }
    return NextResponse.json({ ok: true, data: summary });
  } catch (err) {
    console.error("GET /boards/[boardId]:", err);
    return internalError();
  }
}

export async function PATCH(request: NextRequest, { params }: Params) {
  try {
    const { boardId } = await params;
    const parsed = await parseJsonBody(request);
    if (!parsed.ok) return parsed.response;
    const body = parsed.data as Record<string, unknown>;

    const updates: Record<string, unknown> = {};
    if ("name" in body) updates.name = body.name;
    if ("description" in body) updates.description = body.description;

    const storage = getStorage();
    const board = await storage.updateBoard(boardId, updates);
    if (!board) {
      return NextResponse.json({ ok: false, error: { code: "NOT_FOUND", message: "Board not found" } }, { status: 404 });
    }
    sseHub.broadcast(boardId, "board:updated", board);
    return NextResponse.json({ ok: true, data: board });
  } catch (err) {
    console.error("PATCH /boards/[boardId]:", err);
    return internalError();
  }
}

export async function DELETE(_request: NextRequest, { params }: Params) {
  try {
    const { boardId } = await params;
    const storage = getStorage();
    const deleted = await storage.deleteBoard(boardId);
    if (!deleted) {
      return NextResponse.json({ ok: false, error: { code: "NOT_FOUND", message: "Board not found" } }, { status: 404 });
    }
    return NextResponse.json({ ok: true, data: { deleted: true } });
  } catch (err) {
    console.error("DELETE /boards/[boardId]:", err);
    return internalError();
  }
}
