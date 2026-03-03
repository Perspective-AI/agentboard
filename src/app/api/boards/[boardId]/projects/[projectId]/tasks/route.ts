import { NextRequest, NextResponse } from "next/server";
import { getStorage } from "@/lib/storage/fs-storage";
import { sseHub } from "@/lib/sse/hub";

type Params = { params: Promise<{ boardId: string; projectId: string }> };

export async function POST(request: NextRequest, { params }: Params) {
  try {
    const { boardId, projectId } = await params;
    const body = await request.json();
    if (!body.title) {
      return NextResponse.json({ ok: false, error: { code: "MISSING_TITLE", message: "Task title is required" } }, { status: 400 });
    }
    const storage = getStorage();
    const project = await storage.getProject(boardId, projectId);
    if (!project) {
      return NextResponse.json({ ok: false, error: { code: "NOT_FOUND", message: "Project not found" } }, { status: 404 });
    }
    const task = await storage.createTask(boardId, projectId, {
      title: body.title,
      description: body.description || "",
      assigneeAgentId: body.assigneeAgentId || null,
      priority: body.priority || "medium",
      tags: body.tags || [],
    });
    sseHub.broadcast(boardId, "task:created", task);
    return NextResponse.json({ ok: true, data: task }, { status: 201 });
  } catch (err) {
    return NextResponse.json({ ok: false, error: { code: "INTERNAL_ERROR", message: String(err) } }, { status: 500 });
  }
}

export async function GET(request: NextRequest, { params }: Params) {
  try {
    const { boardId, projectId } = await params;
    const url = new URL(request.url);
    const filters = {
      status: url.searchParams.get("status") || undefined,
      assignee: url.searchParams.get("assignee") || undefined,
      tag: url.searchParams.get("tag") || undefined,
    };
    const storage = getStorage();
    const tasks = await storage.listTasks(boardId, projectId, filters);
    return NextResponse.json({ ok: true, data: tasks });
  } catch (err) {
    return NextResponse.json({ ok: false, error: { code: "INTERNAL_ERROR", message: String(err) } }, { status: 500 });
  }
}
