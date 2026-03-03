import { NextRequest, NextResponse } from "next/server";
import { getStorage } from "@/lib/storage/fs-storage";
import { sseHub } from "@/lib/sse/hub";

type Params = { params: Promise<{ boardId: string }> };

export async function POST(request: NextRequest, { params }: Params) {
  try {
    const { boardId } = await params;
    const body = await request.json();
    if (!body.name) {
      return NextResponse.json({ ok: false, error: { code: "MISSING_NAME", message: "Project name is required" } }, { status: 400 });
    }
    const storage = getStorage();
    const board = await storage.getBoard(boardId);
    if (!board) {
      return NextResponse.json({ ok: false, error: { code: "NOT_FOUND", message: "Board not found" } }, { status: 404 });
    }
    const project = await storage.createProject(boardId, {
      name: body.name,
      description: body.description || "",
    });
    sseHub.broadcast(boardId, "project:created", project);
    return NextResponse.json({ ok: true, data: project }, { status: 201 });
  } catch (err) {
    return NextResponse.json({ ok: false, error: { code: "INTERNAL_ERROR", message: String(err) } }, { status: 500 });
  }
}

export async function GET(_request: NextRequest, { params }: Params) {
  try {
    const { boardId } = await params;
    const storage = getStorage();
    const projects = await storage.listProjects(boardId);
    return NextResponse.json({ ok: true, data: projects });
  } catch (err) {
    return NextResponse.json({ ok: false, error: { code: "INTERNAL_ERROR", message: String(err) } }, { status: 500 });
  }
}
