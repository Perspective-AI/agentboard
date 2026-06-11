import { NextRequest, NextResponse } from "next/server";
import { getStorage } from "@/lib/storage/fs-storage";
import { sseHub } from "@/lib/sse/hub";
import { parseJsonBody, internalError } from "@/lib/api-utils";

type Params = { params: Promise<{ boardId: string; conversationId: string }> };

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
    const { boardId, conversationId } = await params;
    const storage = getStorage();
    const conversation = await storage.getConversation(boardId, conversationId);
    if (!conversation) {
      return NextResponse.json(
        { ok: false, error: { code: "NOT_FOUND", message: "Conversation not found" } },
        { status: 404 },
      );
    }

    return NextResponse.json({ ok: true, data: conversation });
  } catch (err) {
    console.error("GET /conversations/[conversationId]:", err);
    return internalError();
  }
}

export async function PATCH(request: NextRequest, { params }: Params) {
  try {
    const { boardId, conversationId } = await params;
    const parsed = await parseJsonBody(request);
    if (!parsed.ok) return parsed.response;
    const body = parsed.data as Record<string, unknown>;

    const updates: Record<string, unknown> = {};
    if ("title" in body && typeof body.title === "string") updates.title = body.title.trim();
    if ("description" in body && typeof body.description === "string") updates.description = body.description;
    if ("importType" in body && typeof body.importType === "string") updates.importType = body.importType;
    if ("sourceSystem" in body && typeof body.sourceSystem === "string") updates.sourceSystem = body.sourceSystem;
    if ("sourceReference" in body) updates.sourceReference = asOptionalString(body.sourceReference);
    if ("transcript" in body && typeof body.transcript === "string") updates.transcript = body.transcript;
    if ("recordingUrls" in body) updates.recordingUrls = asStringArray(body.recordingUrls);
    if ("attachments" in body) updates.attachments = asStringArray(body.attachments);
    if ("tags" in body) updates.tags = asStringArray(body.tags);
    if ("metadata" in body && body.metadata && typeof body.metadata === "object" && !Array.isArray(body.metadata)) {
      updates.metadata = body.metadata;
    }
    if ("importedAt" in body) updates.importedAt = asOptionalString(body.importedAt);
    if ("occurredAt" in body) updates.occurredAt = asOptionalString(body.occurredAt);
    if ("startedAt" in body) updates.startedAt = asOptionalString(body.startedAt);
    if ("endedAt" in body) updates.endedAt = asOptionalString(body.endedAt);

    const storage = getStorage();
    const conversation = await storage.updateConversation(boardId, conversationId, updates);
    if (!conversation) {
      return NextResponse.json(
        { ok: false, error: { code: "NOT_FOUND", message: "Conversation not found" } },
        { status: 404 },
      );
    }

    sseHub.broadcast(boardId, "conversation:updated", conversation);
    return NextResponse.json({ ok: true, data: conversation });
  } catch (err) {
    console.error("PATCH /conversations/[conversationId]:", err);
    return internalError();
  }
}

export async function DELETE(_request: NextRequest, { params }: Params) {
  try {
    const { boardId, conversationId } = await params;
    const storage = getStorage();
    const conversation = await storage.getConversation(boardId, conversationId);
    const deleted = await storage.deleteConversation(boardId, conversationId);
    if (!deleted) {
      return NextResponse.json(
        { ok: false, error: { code: "NOT_FOUND", message: "Conversation not found" } },
        { status: 404 },
      );
    }

    if (conversation) {
      sseHub.broadcast(boardId, "conversation:removed", conversation);
    }

    return NextResponse.json({ ok: true, data: { deleted: true } });
  } catch (err) {
    console.error("DELETE /conversations/[conversationId]:", err);
    return internalError();
  }
}
