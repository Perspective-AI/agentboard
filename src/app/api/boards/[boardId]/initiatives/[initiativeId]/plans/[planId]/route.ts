import { NextRequest, NextResponse } from "next/server";
import { getStorage } from "@/lib/storage/fs-storage";
import { sseHub } from "@/lib/sse/hub";
import { parseJsonBody, internalError } from "@/lib/api-utils";

type Params = { params: Promise<{ boardId: string; initiativeId: string; planId: string }> };

export async function GET(_request: NextRequest, { params }: Params) {
  try {
    const { boardId, initiativeId, planId } = await params;
    const storage = getStorage();
    const plan = await storage.getPlan(boardId, initiativeId, planId);

    if (!plan) {
      return NextResponse.json(
        { ok: false, error: { code: "NOT_FOUND", message: "Plan not found" } },
        { status: 404 },
      );
    }

    return NextResponse.json({ ok: true, data: plan });
  } catch (err) {
    console.error("GET /plans/[planId]:", err);
    return internalError();
  }
}

export async function PATCH(request: NextRequest, { params }: Params) {
  try {
    const { boardId, initiativeId, planId } = await params;
    const parsed = await parseJsonBody(request);
    if (!parsed.ok) return parsed.response;
    const body = parsed.data as Record<string, unknown>;

    const updates: Record<string, unknown> = {};
    if ("title" in body) updates.title = body.title;
    if ("description" in body) updates.description = body.description;
    if ("status" in body) updates.status = body.status;
    if ("ownerAgentId" in body) updates.ownerAgentId = body.ownerAgentId;
    if ("tags" in body) updates.tags = body.tags;

    const storage = getStorage();
    const plan = await storage.updatePlan(boardId, initiativeId, planId, updates);

    if (!plan) {
      return NextResponse.json(
        { ok: false, error: { code: "NOT_FOUND", message: "Plan not found" } },
        { status: 404 },
      );
    }

    sseHub.broadcast(boardId, "plan:updated", plan);
    return NextResponse.json({ ok: true, data: plan });
  } catch (err) {
    console.error("PATCH /plans/[planId]:", err);
    return internalError();
  }
}

export async function DELETE(_request: NextRequest, { params }: Params) {
  try {
    const { boardId, initiativeId, planId } = await params;
    const storage = getStorage();
    const plan = await storage.getPlan(boardId, initiativeId, planId);
    const deleted = await storage.deletePlan(boardId, initiativeId, planId);

    if (!deleted) {
      return NextResponse.json(
        { ok: false, error: { code: "NOT_FOUND", message: "Plan not found" } },
        { status: 404 },
      );
    }

    if (plan) {
      sseHub.broadcast(boardId, "plan:removed", plan);
    }
    return NextResponse.json({ ok: true, data: { deleted: true } });
  } catch (err) {
    console.error("DELETE /plans/[planId]:", err);
    return internalError();
  }
}
