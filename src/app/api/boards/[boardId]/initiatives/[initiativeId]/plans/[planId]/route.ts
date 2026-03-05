import { NextRequest, NextResponse } from "next/server";
import { getStorage } from "@/lib/storage/fs-storage";
import { sseHub } from "@/lib/sse/hub";

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
    return NextResponse.json(
      { ok: false, error: { code: "INTERNAL_ERROR", message: String(err) } },
      { status: 500 },
    );
  }
}

export async function PATCH(request: NextRequest, { params }: Params) {
  try {
    const { boardId, initiativeId, planId } = await params;
    const body = await request.json();
    const storage = getStorage();
    const plan = await storage.updatePlan(boardId, initiativeId, planId, body);

    if (!plan) {
      return NextResponse.json(
        { ok: false, error: { code: "NOT_FOUND", message: "Plan not found" } },
        { status: 404 },
      );
    }

    sseHub.broadcast(boardId, "plan:updated", plan);
    return NextResponse.json({ ok: true, data: plan });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: { code: "INTERNAL_ERROR", message: String(err) } },
      { status: 500 },
    );
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

    sseHub.broadcast(boardId, "plan:removed", plan);
    return NextResponse.json({ ok: true, data: { deleted: true } });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: { code: "INTERNAL_ERROR", message: String(err) } },
      { status: 500 },
    );
  }
}
