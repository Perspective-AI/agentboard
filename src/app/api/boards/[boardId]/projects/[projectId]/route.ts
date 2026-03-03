import { NextRequest, NextResponse } from "next/server";
import { getStorage } from "@/lib/storage/fs-storage";
import { sseHub } from "@/lib/sse/hub";

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
    return NextResponse.json({ ok: false, error: { code: "INTERNAL_ERROR", message: String(err) } }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest, { params }: Params) {
  try {
    const { boardId, projectId } = await params;
    const body = await request.json();
    const storage = getStorage();
    const project = await storage.updateProject(boardId, projectId, body);
    if (!project) {
      return NextResponse.json({ ok: false, error: { code: "NOT_FOUND", message: "Project not found" } }, { status: 404 });
    }
    sseHub.broadcast(boardId, "project:updated", project);
    return NextResponse.json({ ok: true, data: project });
  } catch (err) {
    return NextResponse.json({ ok: false, error: { code: "INTERNAL_ERROR", message: String(err) } }, { status: 500 });
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
    sseHub.broadcast(boardId, "project:removed", project);
    return NextResponse.json({ ok: true, data: { deleted: true } });
  } catch (err) {
    return NextResponse.json({ ok: false, error: { code: "INTERNAL_ERROR", message: String(err) } }, { status: 500 });
  }
}
