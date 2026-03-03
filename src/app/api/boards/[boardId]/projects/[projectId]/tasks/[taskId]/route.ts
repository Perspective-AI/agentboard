import { NextRequest, NextResponse } from "next/server";
import { getStorage } from "@/lib/storage/fs-storage";
import { sseHub } from "@/lib/sse/hub";

type Params = { params: Promise<{ boardId: string; projectId: string; taskId: string }> };

export async function GET(_request: NextRequest, { params }: Params) {
  try {
    const { boardId, projectId, taskId } = await params;
    const storage = getStorage();
    const task = await storage.getTask(boardId, projectId, taskId);
    if (!task) {
      return NextResponse.json({ ok: false, error: { code: "NOT_FOUND", message: "Task not found" } }, { status: 404 });
    }
    return NextResponse.json({ ok: true, data: task });
  } catch (err) {
    return NextResponse.json({ ok: false, error: { code: "INTERNAL_ERROR", message: String(err) } }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest, { params }: Params) {
  try {
    const { boardId, projectId, taskId } = await params;
    const body = await request.json();
    const storage = getStorage();
    const task = await storage.updateTask(boardId, projectId, taskId, body);
    if (!task) {
      return NextResponse.json({ ok: false, error: { code: "NOT_FOUND", message: "Task not found" } }, { status: 404 });
    }
    sseHub.broadcast(boardId, "task:updated", task);
    return NextResponse.json({ ok: true, data: task });
  } catch (err) {
    return NextResponse.json({ ok: false, error: { code: "INTERNAL_ERROR", message: String(err) } }, { status: 500 });
  }
}

export async function DELETE(_request: NextRequest, { params }: Params) {
  try {
    const { boardId, projectId, taskId } = await params;
    const storage = getStorage();
    const task = await storage.getTask(boardId, projectId, taskId);
    const deleted = await storage.deleteTask(boardId, projectId, taskId);
    if (!deleted) {
      return NextResponse.json({ ok: false, error: { code: "NOT_FOUND", message: "Task not found" } }, { status: 404 });
    }
    sseHub.broadcast(boardId, "task:removed", task);
    return NextResponse.json({ ok: true, data: { deleted: true } });
  } catch (err) {
    return NextResponse.json({ ok: false, error: { code: "INTERNAL_ERROR", message: String(err) } }, { status: 500 });
  }
}
