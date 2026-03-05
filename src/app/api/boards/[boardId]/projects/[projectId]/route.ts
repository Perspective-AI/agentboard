import { NextRequest, NextResponse } from "next/server";
import { getStorage } from "@/lib/storage/fs-storage";
import { sseHub } from "@/lib/sse/hub";
import { parseJsonBody, internalError } from "@/lib/api-utils";

type Params = { params: Promise<{ boardId: string; projectId: string }> };

export async function GET(_request: NextRequest, { params }: Params) {
  try {
    const { boardId, projectId } = await params;
    const storage = getStorage();
    const project = await storage.getProject(boardId, projectId);
    if (!project) {
      return NextResponse.json({ ok: false, error: { code: "NOT_FOUND", message: "Project not found" } }, { status: 404 });
    }
    return NextResponse.json({ ok: true, data: project });
  } catch (err) {
    console.error("GET /projects/[projectId]:", err);
    return internalError();
  }
}

export async function PATCH(request: NextRequest, { params }: Params) {
  try {
    const { boardId, projectId } = await params;
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
    const project = await storage.updateProject(boardId, projectId, updates);
    if (!project) {
      return NextResponse.json({ ok: false, error: { code: "NOT_FOUND", message: "Project not found" } }, { status: 404 });
    }
    sseHub.broadcast(boardId, "initiative:updated", project);
    sseHub.broadcast(boardId, "project:updated", project);
    return NextResponse.json({ ok: true, data: project });
  } catch (err) {
    console.error("PATCH /projects/[projectId]:", err);
    return internalError();
  }
}

export async function DELETE(_request: NextRequest, { params }: Params) {
  try {
    const { boardId, projectId } = await params;
    const storage = getStorage();
    const project = await storage.getProject(boardId, projectId);
    const deleted = await storage.deleteProject(boardId, projectId);
    if (!deleted) {
      return NextResponse.json({ ok: false, error: { code: "NOT_FOUND", message: "Project not found" } }, { status: 404 });
    }
    if (project) {
      sseHub.broadcast(boardId, "initiative:removed", project);
      sseHub.broadcast(boardId, "project:removed", project);
    }
    return NextResponse.json({ ok: true, data: { deleted: true } });
  } catch (err) {
    console.error("DELETE /projects/[projectId]:", err);
    return internalError();
  }
}
