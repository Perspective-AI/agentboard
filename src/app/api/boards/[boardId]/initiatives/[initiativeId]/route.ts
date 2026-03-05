import { NextRequest, NextResponse } from "next/server";
import { getStorage } from "@/lib/storage/fs-storage";
import { sseHub } from "@/lib/sse/hub";
import { parseJsonBody, internalError } from "@/lib/api-utils";

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
    console.error("GET /initiatives/[initiativeId]:", err);
    return internalError();
  }
}

export async function PATCH(request: NextRequest, { params }: Params) {
  try {
    const { boardId, initiativeId } = await params;
    const parsed = await parseJsonBody(request);
    if (!parsed.ok) return parsed.response;
    const body = parsed.data as Record<string, unknown>;

    const updates: Record<string, unknown> = {};
    if ("name" in body) updates.name = body.name;
    if ("description" in body) updates.description = body.description;
    if ("status" in body) updates.status = body.status;
    if ("kind" in body) updates.kind = body.kind;
    if ("assigneeAgentIds" in body) updates.assigneeAgentIds = body.assigneeAgentIds;

    const storage = getStorage();
    const initiative = await storage.updateInitiative(boardId, initiativeId, updates);

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
    console.error("PATCH /initiatives/[initiativeId]:", err);
    return internalError();
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

    if (initiative) {
      sseHub.broadcast(boardId, "initiative:removed", initiative);
      sseHub.broadcast(boardId, "project:removed", initiative);
    }

    return NextResponse.json({ ok: true, data: { deleted: true } });
  } catch (err) {
    console.error("DELETE /initiatives/[initiativeId]:", err);
    return internalError();
  }
}
