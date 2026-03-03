import { NextRequest, NextResponse } from "next/server";
import { getStorage } from "@/lib/storage/fs-storage";
import { sseHub } from "@/lib/sse/hub";

type Params = { params: Promise<{ boardId: string }> };

/**
 * Webhook endpoint for Claude Code hooks.
 *
 * Accepts POST with:
 *   - agent: agent ID (from query param or body)
 *   - event: hook event type (SessionStart, PostToolUse, Stop, etc.)
 *   - message: optional status message
 *
 * On SessionStart: registers the agent if not exists, sends heartbeat
 * On PostToolUse: sends heartbeat with tool info
 * On Stop: sets agent to idle
 */
export async function POST(request: NextRequest, { params }: Params) {
  try {
    const { boardId } = await params;
    const url = new URL(request.url);
    const agentId = url.searchParams.get("agent") || "";

    let body: Record<string, unknown> = {};
    try {
      body = await request.json();
    } catch {
      // empty body is fine
    }

    const event = (body.event as string) || url.searchParams.get("event") || "heartbeat";
    const resolvedAgent = agentId || (body.agent as string) || "";

    if (!resolvedAgent) {
      return NextResponse.json(
        { ok: false, error: { code: "MISSING_AGENT", message: "agent query param or body field required" } },
        { status: 400 }
      );
    }

    const storage = getStorage();
    const board = await storage.getBoard(boardId);
    if (!board) {
      return NextResponse.json(
        { ok: false, error: { code: "NOT_FOUND", message: "Board not found" } },
        { status: 404 }
      );
    }

    let agent = await storage.getAgent(boardId, resolvedAgent);

    // Auto-register on first contact
    if (!agent) {
      agent = await storage.createAgent(boardId, {
        name: resolvedAgent,
        description: (body.description as string) || "AI agent (auto-registered via webhook)",
        metadata: (body.metadata as Record<string, unknown>) || {},
      });
      sseHub.broadcast(boardId, "agent:registered", agent);
    }

    // Determine status message from hook payload
    let message = (body.message as string) || "";
    let status: string = "active";

    switch (event) {
      case "SessionStart":
        message = message || "Session started";
        status = "active";
        break;
      case "PostToolUse": {
        const toolName = (body.tool_name as string) || (body.toolName as string) || "";
        const toolInput = body.tool_input || body.input || {};
        if (toolName === "Write" || toolName === "Edit") {
          const filePath = (toolInput as Record<string, string>).file_path || "";
          message = message || `Editing ${filePath.split("/").pop() || "file"}`;
        } else if (toolName === "Bash") {
          const cmd = (toolInput as Record<string, string>).command || "";
          message = message || `Running: ${cmd.slice(0, 80)}`;
        } else if (toolName) {
          message = message || `Using ${toolName}`;
        } else {
          message = message || "Working...";
        }
        status = "active";
        break;
      }
      case "Stop":
        message = message || "Session ended";
        status = "idle";
        break;
      case "waiting":
        message = message || "Waiting for human approval";
        status = "waiting";
        break;
      case "PermissionRequest":
        message = message || "Waiting for permission";
        status = "waiting";
        break;
      default:
        message = message || "Active";
        status = "active";
        break;
    }

    // Update agent
    const updated = await storage.updateAgent(boardId, resolvedAgent, {
      status: status as "active" | "idle" | "error" | "offline" | "waiting",
      statusMessage: message,
    });

    if (updated) {
      sseHub.broadcast(boardId, "agent:updated", updated);
    }

    return NextResponse.json({ ok: true, data: updated });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: { code: "INTERNAL_ERROR", message: String(err) } },
      { status: 500 }
    );
  }
}
