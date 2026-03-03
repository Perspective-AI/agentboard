import { NextRequest, NextResponse } from "next/server";
import { getStorage } from "@/lib/storage/fs-storage";
import { sseHub } from "@/lib/sse/hub";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    if (!body.name) {
      return NextResponse.json({ ok: false, error: { code: "MISSING_NAME", message: "Board name is required" } }, { status: 400 });
    }
    const storage = getStorage();
    const board = await storage.createBoard({ name: body.name, description: body.description || "" });
    return NextResponse.json({ ok: true, data: board }, { status: 201 });
  } catch (err) {
    return NextResponse.json({ ok: false, error: { code: "INTERNAL_ERROR", message: String(err) } }, { status: 500 });
  }
}

export async function GET() {
  try {
    const storage = getStorage();
    const boards = await storage.listBoards();
    return NextResponse.json({ ok: true, data: boards });
  } catch (err) {
    return NextResponse.json({ ok: false, error: { code: "INTERNAL_ERROR", message: String(err) } }, { status: 500 });
  }
}
