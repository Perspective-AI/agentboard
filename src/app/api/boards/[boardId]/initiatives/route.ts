import { NextRequest, NextResponse } from "next/server";
import { getStorage } from "@/lib/storage/fs-storage";
import { sseHub } from "@/lib/sse/hub";
import { parseJsonBody, internalError } from "@/lib/api-utils";
import type { Initiative } from "@/lib/types";

type Params = { params: Promise<{ boardId: string }> };

export async function POST(request: NextRequest, { params }: Params) {
  try {
    const { boardId } = await params;
    const parsed = await parseJsonBody(request);
    if (!parsed.ok) return parsed.response;
    const body = parsed.data as Record<string, unknown>;

    if (!body.name) {
      return NextResponse.json(
        { ok: false, error: { code: "MISSING_NAME", message: "Initiative name is required" } },
        { status: 400 },
      );
    }

    const storage = getStorage();
    const board = await storage.getBoard(boardId);
    if (!board) {
      return NextResponse.json(
        { ok: false, error: { code: "NOT_FOUND", message: "Board not found" } },
        { status: 404 },
      );
    }

    const initiative = await storage.createInitiative(boardId, {
      name: body.name as string,
      description: (body.description as string) || "",
      kind: body.kind as Initiative["kind"] | undefined,
      status: body.status as Initiative["status"] | undefined,
      assigneeAgentIds: (body.assigneeAgentIds as string[]) || [],
    });

    sseHub.broadcast(boardId, "initiative:created", initiative);
    sseHub.broadcast(boardId, "project:created", initiative);

    return NextResponse.json({ ok: true, data: initiative }, { status: 201 });
  } catch (err) {
    console.error("POST /initiatives:", err);
    return internalError();
  }
}

export async function GET(_request: NextRequest, { params }: Params) {
  try {
    const { boardId } = await params;
    const storage = getStorage();
    const initiatives = await storage.listInitiatives(boardId);
    return NextResponse.json({ ok: true, data: initiatives });
  } catch (err) {
    console.error("GET /initiatives:", err);
    return internalError();
  }
}
