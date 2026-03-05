import { NextRequest, NextResponse } from "next/server";
import { getStorage } from "@/lib/storage/fs-storage";
import { sseHub } from "@/lib/sse/hub";
import { parseJsonBody, internalError } from "@/lib/api-utils";
import type { PlanStepStatus } from "@/lib/types";

type Params = { params: Promise<{ boardId: string; initiativeId: string; planId: string }> };

export async function POST(request: NextRequest, { params }: Params) {
  try {
    const { boardId, initiativeId, planId } = await params;
    const parsed = await parseJsonBody(request);
    if (!parsed.ok) return parsed.response;
    const body = parsed.data as Record<string, unknown>;

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
      title: body.title as string,
      description: (body.description as string) || "",
      status: body.status as PlanStepStatus | undefined,
      assigneeAgentId: (body.assigneeAgentId as string) || null,
      order: body.order as number | undefined,
    });

    sseHub.broadcast(boardId, "plan_step:created", step);
    return NextResponse.json({ ok: true, data: step }, { status: 201 });
  } catch (err) {
    console.error("POST /steps:", err);
    return internalError();
  }
}

export async function GET(_request: NextRequest, { params }: Params) {
  try {
    const { boardId, initiativeId, planId } = await params;
    const storage = getStorage();
    const steps = await storage.listPlanSteps(boardId, initiativeId, planId);
    return NextResponse.json({ ok: true, data: steps });
  } catch (err) {
    console.error("GET /steps:", err);
    return internalError();
  }
}
