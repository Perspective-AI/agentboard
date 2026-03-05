import { NextRequest, NextResponse } from "next/server";
import { getStorage } from "@/lib/storage/fs-storage";
import { sseHub } from "@/lib/sse/hub";

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
    return NextResponse.json(
      { ok: false, error: { code: "INTERNAL_ERROR", message: String(err) } },
      { status: 500 },
    );
  }
}

export async function PATCH(request: NextRequest, { params }: Params) {
  try {
    const { boardId, initiativeId, planId, stepId } = await params;
    const body = await request.json();
    const storage = getStorage();
    const step = await storage.updatePlanStep(boardId, initiativeId, planId, stepId, body);

    if (!step) {
      return NextResponse.json(
        { ok: false, error: { code: "NOT_FOUND", message: "Plan step not found" } },
        { status: 404 },
      );
    }

    sseHub.broadcast(boardId, "plan_step:updated", step);
    return NextResponse.json({ ok: true, data: step });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: { code: "INTERNAL_ERROR", message: String(err) } },
      { status: 500 },
    );
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

    sseHub.broadcast(boardId, "plan_step:removed", step);
    return NextResponse.json({ ok: true, data: { deleted: true } });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: { code: "INTERNAL_ERROR", message: String(err) } },
      { status: 500 },
    );
  }
}
