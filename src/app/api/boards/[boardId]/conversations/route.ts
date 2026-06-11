import { NextRequest, NextResponse } from "next/server";
import { getStorage } from "@/lib/storage/fs-storage";
import { sseHub } from "@/lib/sse/hub";
import { parseJsonBody, internalError } from "@/lib/api-utils";
import type { Conversation } from "@/lib/types";

type Params = { params: Promise<{ boardId: string }> };

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string").map((item) => item.trim()).filter(Boolean);
}

function asOptionalString(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export async function GET(_request: NextRequest, { params }: Params) {
  try {
    const { boardId } = await params;
    const storage = getStorage();
    const conversations = await storage.listConversations(boardId);
    return NextResponse.json({ ok: true, data: conversations });
  } catch (err) {
    console.error("GET /conversations:", err);
    return internalError();
  }
}

export async function POST(request: NextRequest, { params }: Params) {
  try {
    const { boardId } = await params;
    const parsed = await parseJsonBody(request);
    if (!parsed.ok) return parsed.response;
    const body = parsed.data as Record<string, unknown>;

    const title = typeof body.title === "string" ? body.title.trim() : "";
    if (!title) {
      return NextResponse.json(
        { ok: false, error: { code: "MISSING_TITLE", message: "Conversation title is required" } },
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

    const conversation = await storage.createConversation(boardId, {
      title,
      description: typeof body.description === "string" ? body.description : "",
      sourceType: (body.sourceType as Conversation["sourceType"]) || "imported",
      importType: (body.importType as Conversation["importType"]) || "transcript",
      sourceSystem: typeof body.sourceSystem === "string" ? body.sourceSystem : "unknown",
      sourceReference: asOptionalString(body.sourceReference),
      transcript: typeof body.transcript === "string" ? body.transcript : "",
      recordingUrls: asStringArray(body.recordingUrls),
      attachments: asStringArray(body.attachments),
      tags: asStringArray(body.tags),
      metadata:
        body.metadata && typeof body.metadata === "object" && !Array.isArray(body.metadata)
          ? (body.metadata as Record<string, unknown>)
          : {},
      importedAt: asOptionalString(body.importedAt),
      occurredAt: asOptionalString(body.occurredAt),
      startedAt: asOptionalString(body.startedAt),
      endedAt: asOptionalString(body.endedAt),
    });

    sseHub.broadcast(boardId, "conversation:created", conversation);
    return NextResponse.json({ ok: true, data: conversation }, { status: 201 });
  } catch (err) {
    console.error("POST /conversations:", err);
    return internalError();
  }
}
