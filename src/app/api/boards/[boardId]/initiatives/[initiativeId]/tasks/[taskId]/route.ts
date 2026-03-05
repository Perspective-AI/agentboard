import { NextRequest, NextResponse } from "next/server";
import { getStorage } from "@/lib/storage/fs-storage";
import { sseHub } from "@/lib/sse/hub";
import type { Task } from "@/lib/types";

type Params = { params: Promise<{ boardId: string; initiativeId: string; taskId: string }> };

export async function GET(_request: NextRequest, { params }: Params) {
  try {
    const { boardId, initiativeId, taskId } = await params;
    const storage = getStorage();
    const task = await storage.getTask(boardId, initiativeId, taskId);

    if (!task) {
      return NextResponse.json(
        { ok: false, error: { code: "NOT_FOUND", message: "Task not found" } },
        { status: 404 },
      );
    }

    return NextResponse.json({ ok: true, data: task });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: { code: "INTERNAL_ERROR", message: String(err) } },
      { status: 500 },
    );
  }
}

export async function PATCH(request: NextRequest, { params }: Params) {
  try {
    const { boardId, initiativeId, taskId } = await params;
    const body = await request.json();
    const actorAgentId = typeof body.actorAgentId === "string" ? body.actorAgentId.trim() : "";
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

    const updates: Partial<
      Pick<
        Task,
        "title" | "description" | "status" | "planId" | "planStepId" | "assigneeAgentId" | "assigneeAgentIds" | "deliverables" | "priority" | "tags"
      >
    > = {};
    if ("title" in body) updates.title = body.title;
    if ("description" in body) updates.description = body.description;
    if ("status" in body) updates.status = body.status;
    if ("planId" in body) updates.planId = body.planId;
    if ("planStepId" in body) updates.planStepId = body.planStepId;
    if ("assigneeAgentId" in body) updates.assigneeAgentId = body.assigneeAgentId;
    if ("assigneeAgentIds" in body) updates.assigneeAgentIds = body.assigneeAgentIds;
    if ("deliverables" in body) updates.deliverables = body.deliverables;
    if ("priority" in body) updates.priority = body.priority;
    if ("tags" in body) updates.tags = body.tags;

    const task = await storage.updateTask(boardId, initiativeId, taskId, updates, actor.id);

    if (!task) {
      return NextResponse.json(
        { ok: false, error: { code: "NOT_FOUND", message: "Task not found" } },
        { status: 404 },
      );
    }

    sseHub.broadcast(boardId, "task:updated", task);
    return NextResponse.json({ ok: true, data: task });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: { code: "INTERNAL_ERROR", message: String(err) } },
      { status: 500 },
    );
  }
}

export async function DELETE(_request: NextRequest, { params }: Params) {
  try {
    const actorAgentId =
      _request.headers.get("x-agent-id")?.trim() ||
      _request.nextUrl.searchParams.get("actorAgentId")?.trim() ||
      "";
    if (!actorAgentId) {
      return NextResponse.json(
        { ok: false, error: { code: "MISSING_ACTOR", message: "actorAgentId is required (query or x-agent-id header)" } },
        { status: 400 },
      );
    }

    const { boardId, initiativeId, taskId } = await params;
    const storage = getStorage();
    const actor = await storage.getAgent(boardId, actorAgentId);
    if (!actor) {
      return NextResponse.json(
        { ok: false, error: { code: "ACTOR_NOT_REGISTERED", message: `Agent not registered: ${actorAgentId}` } },
        { status: 400 },
      );
    }
    const task = await storage.getTask(boardId, initiativeId, taskId);
    const deleted = await storage.deleteTask(boardId, initiativeId, taskId, actor.id);

    if (!deleted) {
      return NextResponse.json(
        { ok: false, error: { code: "NOT_FOUND", message: "Task not found" } },
        { status: 404 },
      );
    }

    sseHub.broadcast(boardId, "task:removed", task);
    return NextResponse.json({ ok: true, data: { deleted: true } });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: { code: "INTERNAL_ERROR", message: String(err) } },
      { status: 500 },
    );
  }
}
