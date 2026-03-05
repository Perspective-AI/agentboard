import { NextRequest, NextResponse } from "next/server";
import { getStorage } from "@/lib/storage/fs-storage";
import { sseHub } from "@/lib/sse/hub";

type Params = { params: Promise<{ boardId: string; initiativeId: string }> };

export async function GET(_request: NextRequest, { params }: Params) {
  try {
    const { boardId, initiativeId } = await params;
    const storage = getStorage();
    const initiative = await storage.getInitiative(boardId, initiativeId);

    if (!initiative) {
      return NextResponse.json(
        { ok: false, error: { code: "NOT_FOUND", message: "Initiative not found" } },
        { status: 404 },
      );
    }

    return NextResponse.json({ ok: true, data: initiative });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: { code: "INTERNAL_ERROR", message: String(err) } },
      { status: 500 },
    );
  }
}

export async function PATCH(request: NextRequest, { params }: Params) {
  try {
    const { boardId, initiativeId } = await params;
    const body = await request.json();
    const storage = getStorage();
    const initiative = await storage.updateInitiative(boardId, initiativeId, body);

    if (!initiative) {
      return NextResponse.json(
        { ok: false, error: { code: "NOT_FOUND", message: "Initiative not found" } },
        { status: 404 },
      );
    }

    sseHub.broadcast(boardId, "initiative:updated", initiative);
    sseHub.broadcast(boardId, "project:updated", initiative);

    return NextResponse.json({ ok: true, data: initiative });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: { code: "INTERNAL_ERROR", message: String(err) } },
      { status: 500 },
    );
  }
}

export async function DELETE(_request: NextRequest, { params }: Params) {
  try {
    const { boardId, initiativeId } = await params;
    const storage = getStorage();
    const initiative = await storage.getInitiative(boardId, initiativeId);
    const deleted = await storage.deleteInitiative(boardId, initiativeId);

    if (!deleted) {
      return NextResponse.json(
        { ok: false, error: { code: "NOT_FOUND", message: "Initiative not found" } },
        { status: 404 },
      );
    }

    sseHub.broadcast(boardId, "initiative:removed", initiative);
    sseHub.broadcast(boardId, "project:removed", initiative);

    return NextResponse.json({ ok: true, data: { deleted: true } });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: { code: "INTERNAL_ERROR", message: String(err) } },
      { status: 500 },
    );
  }
}
