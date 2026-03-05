import { NextRequest, NextResponse } from "next/server";
import { getStorage } from "@/lib/storage/fs-storage";
import { sseHub } from "@/lib/sse/hub";
import { parseJsonBody, internalError } from "@/lib/api-utils";
import type { PlanStatus } from "@/lib/types";

type Params = { params: Promise<{ boardId: string; initiativeId: string }> };

export async function POST(request: NextRequest, { params }: Params) {
  try {
    const { boardId, initiativeId } = await params;
    const parsed = await parseJsonBody(request);
    if (!parsed.ok) return parsed.response;
    const body = parsed.data as Record<string, unknown>;

    if (!body.title) {
      return NextResponse.json(
        { ok: false, error: { code: "MISSING_TITLE", message: "Plan title is required" } },
        { status: 400 },
      );
    }

    const storage = getStorage();
    const initiative = await storage.getInitiative(boardId, initiativeId);
    if (!initiative) {
      return NextResponse.json(
        { ok: false, error: { code: "NOT_FOUND", message: "Initiative not found" } },
        { status: 404 },
      );
    }

    const plan = await storage.createPlan(boardId, initiativeId, {
      title: body.title as string,
      description: (body.description as string) || "",
      status: body.status as PlanStatus | undefined,
      ownerAgentId: (body.ownerAgentId as string) || null,
      tags: (body.tags as string[]) || [],
    });

    sseHub.broadcast(boardId, "plan:created", plan);
    return NextResponse.json({ ok: true, data: plan }, { status: 201 });
  } catch (err) {
    console.error("POST /plans:", err);
    return internalError();
  }
}

export async function GET(_request: NextRequest, { params }: Params) {
  try {
    const { boardId, initiativeId } = await params;
    const storage = getStorage();
    const plans = await storage.listPlans(boardId, initiativeId);
    return NextResponse.json({ ok: true, data: plans });
  } catch (err) {
    console.error("GET /plans:", err);
    return internalError();
  }
}
