import { NextRequest, NextResponse } from "next/server";
import { getStorage } from "@/lib/storage/fs-storage";
import { sseHub } from "@/lib/sse/hub";
import { parseJsonBody, internalError } from "@/lib/api-utils";

type Params = {
  params: Promise<{ boardId: string; initiativeId: string; planId: string; stepId: string }>;
};

export async function GET(_request: NextRequest, { params }: Params) {
  try {
    const { boardId, initiativeId, planId, stepId } = await params;
    const storage = getStorage();
    const step = await storage.getPlanStep(boardId, initiativeId, planId, stepId);

    if (!step) {
      return NextResponse.json(
        { ok: false, error: { code: "NOT_FOUND", message: "Plan step not found" } },
        { status: 404 },
      );
    }

    return NextResponse.json({ ok: true, data: step });
  } catch (err) {
    console.error("GET /steps/[stepId]:", err);
    return internalError();
  }
}

export async function PATCH(request: NextRequest, { params }: Params) {
  try {
    const { boardId, initiativeId, planId, stepId } = await params;
    const parsed = await parseJsonBody(request);
    if (!parsed.ok) return parsed.response;
    const body = parsed.data as Record<string, unknown>;

    const updates: Record<string, unknown> = {};
    if ("title" in body) updates.title = body.title;
    if ("description" in body) updates.description = body.description;
    if ("status" in body) updates.status = body.status;
    if ("assigneeAgentId" in body) updates.assigneeAgentId = body.assigneeAgentId;
    if ("order" in body) updates.order = body.order;

    const storage = getStorage();
    const step = await storage.updatePlanStep(boardId, initiativeId, planId, stepId, updates);

    if (!step) {
      return NextResponse.json(
        { ok: false, error: { code: "NOT_FOUND", message: "Plan step not found" } },
        { status: 404 },
      );
    }

    sseHub.broadcast(boardId, "plan_step:updated", step);
    return NextResponse.json({ ok: true, data: step });
  } catch (err) {
    console.error("PATCH /steps/[stepId]:", err);
    return internalError();
  }
}

export async function DELETE(_request: NextRequest, { params }: Params) {
  try {
    const { boardId, initiativeId, planId, stepId } = await params;
    const storage = getStorage();
    const step = await storage.getPlanStep(boardId, initiativeId, planId, stepId);
    const deleted = await storage.deletePlanStep(boardId, initiativeId, planId, stepId);

    if (!deleted) {
      return NextResponse.json(
        { ok: false, error: { code: "NOT_FOUND", message: "Plan step not found" } },
        { status: 404 },
      );
    }

    if (step) {
      sseHub.broadcast(boardId, "plan_step:removed", step);
    }
    return NextResponse.json({ ok: true, data: { deleted: true } });
  } catch (err) {
    console.error("DELETE /steps/[stepId]:", err);
    return internalError();
  }
}
