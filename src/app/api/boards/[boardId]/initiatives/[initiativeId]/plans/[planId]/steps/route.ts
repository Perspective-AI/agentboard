import { NextRequest, NextResponse } from "next/server";
import { getStorage } from "@/lib/storage/fs-storage";
import { sseHub } from "@/lib/sse/hub";

type Params = { params: Promise<{ boardId: string; initiativeId: string; planId: string }> };

export async function POST(request: NextRequest, { params }: Params) {
  try {
    const { boardId, initiativeId, planId } = await params;
    const body = await request.json();

    if (!body.title) {
      return NextResponse.json(
        { ok: false, error: { code: "MISSING_TITLE", message: "Plan step title is required" } },
        { status: 400 },
      );
    }

    const storage = getStorage();
    const plan = await storage.getPlan(boardId, initiativeId, planId);
    if (!plan) {
      return NextResponse.json(
        { ok: false, error: { code: "NOT_FOUND", message: "Plan not found" } },
        { status: 404 },
      );
    }

    const step = await storage.createPlanStep(boardId, initiativeId, planId, {
      title: body.title,
      description: body.description || "",
      status: body.status,
      assigneeAgentId: body.assigneeAgentId || null,
      order: body.order,
    });

    sseHub.broadcast(boardId, "plan_step:created", step);
    return NextResponse.json({ ok: true, data: step }, { status: 201 });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: { code: "INTERNAL_ERROR", message: String(err) } },
      { status: 500 },
    );
  }
}

export async function GET(_request: NextRequest, { params }: Params) {
  try {
    const { boardId, initiativeId, planId } = await params;
    const storage = getStorage();
    const steps = await storage.listPlanSteps(boardId, initiativeId, planId);
    return NextResponse.json({ ok: true, data: steps });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: { code: "INTERNAL_ERROR", message: String(err) } },
      { status: 500 },
    );
  }
}
