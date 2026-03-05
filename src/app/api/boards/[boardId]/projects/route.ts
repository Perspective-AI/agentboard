import { NextRequest, NextResponse } from "next/server";
import { getStorage } from "@/lib/storage/fs-storage";
import { sseHub } from "@/lib/sse/hub";
import { parseJsonBody, internalError } from "@/lib/api-utils";

type Params = { params: Promise<{ boardId: string }> };

export async function POST(request: NextRequest, { params }: Params) {
  try {
    const { boardId } = await params;
    const parsed = await parseJsonBody(request);
    if (!parsed.ok) return parsed.response;
    const body = parsed.data as Record<string, unknown>;
    if (!body.name) {
      return NextResponse.json({ ok: false, error: { code: "MISSING_NAME", message: "Project name is required" } }, { status: 400 });
    }
    const storage = getStorage();
    const board = await storage.getBoard(boardId);
    if (!board) {
      return NextResponse.json({ ok: false, error: { code: "NOT_FOUND", message: "Board not found" } }, { status: 404 });
    }
    const project = await storage.createProject(boardId, {
      name: body.name as string,
      description: (body.description as string) || "",
    });
    sseHub.broadcast(boardId, "initiative:created", project);
    sseHub.broadcast(boardId, "project:created", project);
    return NextResponse.json({ ok: true, data: project }, { status: 201 });
  } catch (err) {
    console.error("POST /projects:", err);
    return internalError();
  }
}

export async function GET(_request: NextRequest, { params }: Params) {
  try {
    const { boardId } = await params;
    const storage = getStorage();
    const projects = await storage.listProjects(boardId);
    return NextResponse.json({ ok: true, data: projects });
  } catch (err) {
    console.error("GET /projects:", err);
    return internalError();
  }
}
