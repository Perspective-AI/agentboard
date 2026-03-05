import { NextRequest, NextResponse } from "next/server";
import { getStorage } from "@/lib/storage/fs-storage";
import { sseHub } from "@/lib/sse/hub";
import { parseJsonBody, internalError } from "@/lib/api-utils";
import type { Task } from "@/lib/types";

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
    console.error("GET /projects/[projectId]/tasks/[taskId]:", err);
    return internalError();
  }
}

export async function PATCH(request: NextRequest, { params }: Params) {
  try {
    const { boardId, projectId, taskId } = await params;
    const parsed = await parseJsonBody(request);
    if (!parsed.ok) return parsed.response;
    const body = parsed.data as Record<string, unknown>;
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
    if ("title" in body) updates.title = body.title as string;
    if ("description" in body) updates.description = body.description as string;
    if ("status" in body) updates.status = body.status as Task["status"];
    if ("planId" in body) updates.planId = body.planId as string;
    if ("planStepId" in body) updates.planStepId = body.planStepId as string;
    if ("assigneeAgentId" in body) updates.assigneeAgentId = body.assigneeAgentId as string;
    if ("assigneeAgentIds" in body) updates.assigneeAgentIds = body.assigneeAgentIds as string[];
    if ("deliverables" in body) updates.deliverables = body.deliverables as string[];
    if ("priority" in body) updates.priority = body.priority as Task["priority"];
    if ("tags" in body) updates.tags = body.tags as string[];

    const task = await storage.updateTask(boardId, projectId, taskId, updates, actor.id);
    if (!task) {
      return NextResponse.json({ ok: false, error: { code: "NOT_FOUND", message: "Task not found" } }, { status: 404 });
    }
    sseHub.broadcast(boardId, "task:updated", task);
    return NextResponse.json({ ok: true, data: task });
  } catch (err) {
    console.error("PATCH /projects/[projectId]/tasks/[taskId]:", err);
    return internalError();
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

    const { boardId, projectId, taskId } = await params;
    const storage = getStorage();
    const actor = await storage.getAgent(boardId, actorAgentId);
    if (!actor) {
      return NextResponse.json(
        { ok: false, error: { code: "ACTOR_NOT_REGISTERED", message: `Agent not registered: ${actorAgentId}` } },
        { status: 400 },
      );
    }
    const task = await storage.getTask(boardId, projectId, taskId);
    const deleted = await storage.deleteTask(boardId, projectId, taskId, actor.id);
    if (!deleted) {
      return NextResponse.json({ ok: false, error: { code: "NOT_FOUND", message: "Task not found" } }, { status: 404 });
    }
    if (task) {
      sseHub.broadcast(boardId, "task:removed", task);
    }
    return NextResponse.json({ ok: true, data: { deleted: true } });
  } catch (err) {
    console.error("DELETE /projects/[projectId]/tasks/[taskId]:", err);
    return internalError();
  }
}
