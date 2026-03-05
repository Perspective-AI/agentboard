import { NextRequest, NextResponse } from "next/server";
import { getStorage } from "@/lib/storage/fs-storage";
import { sseHub } from "@/lib/sse/hub";
import { parseJsonBody, internalError } from "@/lib/api-utils";
import type { TaskPriority } from "@/lib/types";

type Params = { params: Promise<{ boardId: string; initiativeId: string }> };

export async function POST(request: NextRequest, { params }: Params) {
  try {
    const { boardId, initiativeId } = await params;
    const parsed = await parseJsonBody(request);
    if (!parsed.ok) return parsed.response;
    const body = parsed.data as Record<string, unknown>;
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
      title: body.title as string,
      description: (body.description as string) || "",
      planId: (body.planId as string) || null,
      planStepId: (body.planStepId as string) || null,
      assigneeAgentId: (body.assigneeAgentId as string) || null,
      assigneeAgentIds: (body.assigneeAgentIds as string[]) || [],
      deliverables: (body.deliverables as string[]) || [],
      priority: (body.priority as TaskPriority) || "medium",
      tags: (body.tags as string[]) || [],
    }, actor.id);

    sseHub.broadcast(boardId, "task:created", task);
    return NextResponse.json({ ok: true, data: task }, { status: 201 });
  } catch (err) {
    console.error("POST /tasks:", err);
    return internalError();
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
    console.error("GET /tasks:", err);
    return internalError();
  }
}
