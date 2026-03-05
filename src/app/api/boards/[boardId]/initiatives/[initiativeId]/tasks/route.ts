import { NextRequest, NextResponse } from "next/server";
import { getStorage } from "@/lib/storage/fs-storage";
import { sseHub } from "@/lib/sse/hub";

type Params = { params: Promise<{ boardId: string; initiativeId: string }> };

export async function POST(request: NextRequest, { params }: Params) {
  try {
    const { boardId, initiativeId } = await params;
    const body = await request.json();
    const actorAgentId = typeof body.actorAgentId === "string" ? body.actorAgentId.trim() : "";

    if (!body.title) {
      return NextResponse.json(
        { ok: false, error: { code: "MISSING_TITLE", message: "Task title is required" } },
        { status: 400 },
      );
    }
    if (!actorAgentId) {
      return NextResponse.json(
        { ok: false, error: { code: "MISSING_ACTOR", message: "actorAgentId is required" } },
        { status: 400 },
      );
    }

    const storage = getStorage();
    const actor = await storage.getAgent(boardId, actorAgentId);
    if (!actor) {
      return NextResponse.json(
        { ok: false, error: { code: "ACTOR_NOT_REGISTERED", message: `Agent not registered: ${actorAgentId}` } },
        { status: 400 },
      );
    }
    const initiative = await storage.getInitiative(boardId, initiativeId);
    if (!initiative) {
      return NextResponse.json(
        { ok: false, error: { code: "NOT_FOUND", message: "Initiative not found" } },
        { status: 404 },
      );
    }

    const task = await storage.createTask(boardId, initiativeId, {
      title: body.title,
      description: body.description || "",
      planId: body.planId || null,
      planStepId: body.planStepId || null,
      assigneeAgentId: body.assigneeAgentId || null,
      assigneeAgentIds: body.assigneeAgentIds || [],
      deliverables: body.deliverables || [],
      priority: body.priority || "medium",
      tags: body.tags || [],
    }, actor.id);

    sseHub.broadcast(boardId, "task:created", task);
    return NextResponse.json({ ok: true, data: task }, { status: 201 });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: { code: "INTERNAL_ERROR", message: String(err) } },
      { status: 500 },
    );
  }
}

export async function GET(request: NextRequest, { params }: Params) {
  try {
    const { boardId, initiativeId } = await params;
    const url = new URL(request.url);

    const storage = getStorage();
    const tasks = await storage.listTasks(boardId, initiativeId, {
      status: url.searchParams.get("status") || undefined,
      assignee: url.searchParams.get("assignee") || undefined,
      tag: url.searchParams.get("tag") || undefined,
    });

    return NextResponse.json({ ok: true, data: tasks });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: { code: "INTERNAL_ERROR", message: String(err) } },
      { status: 500 },
    );
  }
}
