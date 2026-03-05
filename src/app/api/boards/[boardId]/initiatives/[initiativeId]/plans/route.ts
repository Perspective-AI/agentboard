import { NextRequest, NextResponse } from "next/server";
import { getStorage } from "@/lib/storage/fs-storage";
import { sseHub } from "@/lib/sse/hub";

type Params = { params: Promise<{ boardId: string; initiativeId: string }> };

export async function POST(request: NextRequest, { params }: Params) {
  try {
    const { boardId, initiativeId } = await params;
    const body = await request.json();

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
      title: body.title,
      description: body.description || "",
      status: body.status,
      ownerAgentId: body.ownerAgentId || null,
      tags: body.tags || [],
    });

    sseHub.broadcast(boardId, "plan:created", plan);
    return NextResponse.json({ ok: true, data: plan }, { status: 201 });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: { code: "INTERNAL_ERROR", message: String(err) } },
      { status: 500 },
    );
  }
}

export async function GET(_request: NextRequest, { params }: Params) {
  try {
    const { boardId, initiativeId } = await params;
    const storage = getStorage();
    const plans = await storage.listPlans(boardId, initiativeId);
    return NextResponse.json({ ok: true, data: plans });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: { code: "INTERNAL_ERROR", message: String(err) } },
      { status: 500 },
    );
  }
}
