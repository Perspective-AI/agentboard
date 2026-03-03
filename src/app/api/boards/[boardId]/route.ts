import { NextRequest, NextResponse } from "next/server";
import { getStorage } from "@/lib/storage/fs-storage";
import { sseHub } from "@/lib/sse/hub";

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
    return NextResponse.json({ ok: false, error: { code: "INTERNAL_ERROR", message: String(err) } }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest, { params }: Params) {
  try {
    const { boardId } = await params;
    const body = await request.json();
    const storage = getStorage();
    const board = await storage.updateBoard(boardId, body);
    if (!board) {
      return NextResponse.json({ ok: false, error: { code: "NOT_FOUND", message: "Board not found" } }, { status: 404 });
    }
    sseHub.broadcast(boardId, "board:updated", board);
    return NextResponse.json({ ok: true, data: board });
  } catch (err) {
    return NextResponse.json({ ok: false, error: { code: "INTERNAL_ERROR", message: String(err) } }, { status: 500 });
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
    return NextResponse.json({ ok: false, error: { code: "INTERNAL_ERROR", message: String(err) } }, { status: 500 });
  }
}
