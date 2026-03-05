import { NextRequest, NextResponse } from "next/server";
import { getStorage } from "@/lib/storage/fs-storage";
import { parseJsonBody, internalError } from "@/lib/api-utils";

export async function POST(request: NextRequest) {
  try {
    const parsed = await parseJsonBody(request);
    if (!parsed.ok) return parsed.response;
    const body = parsed.data as Record<string, unknown>;
    if (!body.name) {
      return NextResponse.json({ ok: false, error: { code: "MISSING_NAME", message: "Board name is required" } }, { status: 400 });
    }
    const storage = getStorage();
    const board = await storage.createBoard({ name: body.name as string, description: (body.description as string) || "" });
    return NextResponse.json({ ok: true, data: board }, { status: 201 });
  } catch (err) {
    console.error("POST /boards:", err);
    return internalError();
  }
}

export async function GET() {
  try {
    const storage = getStorage();
    const boards = await storage.listBoards();
    return NextResponse.json({ ok: true, data: boards });
  } catch (err) {
    console.error("GET /boards:", err);
    return internalError();
  }
}
