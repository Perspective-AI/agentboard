import { NextRequest, NextResponse } from "next/server";
import { AgentRegistrationError, getStorage } from "@/lib/storage/fs-storage";
import { sseHub } from "@/lib/sse/hub";
import { randomUUID } from "crypto";

type Params = { params: Promise<{ boardId: string }> };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

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
      const rawMetadata = isRecord(body.metadata) ? body.metadata : {};
      const rawIntro = isRecord(rawMetadata.intro) ? rawMetadata.intro : {};
      const introRuntime =
        typeof rawIntro.runtime === "string" && rawIntro.runtime.trim()
          ? rawIntro.runtime.trim()
          : "webhook";
      const introSessionKey =
        typeof rawIntro.sessionKey === "string" && rawIntro.sessionKey.trim()
          ? rawIntro.sessionKey.trim()
          : (typeof rawIntro.instanceKey === "string" && rawIntro.instanceKey.trim()
              ? rawIntro.instanceKey.trim()
              : randomUUID());
      const introModel =
        typeof rawIntro.model === "string" && rawIntro.model.trim()
          ? rawIntro.model.trim()
          : "unknown-model";
      let introThreadId = "";
      let introThreadName = "";
      let introThreadSource = "";
      if (typeof rawIntro.thread === "string" && rawIntro.thread.trim()) {
        introThreadId = rawIntro.thread.trim();
        introThreadName =
          typeof rawIntro.threadName === "string" && rawIntro.threadName.trim()
            ? rawIntro.threadName.trim()
            : introThreadId;
      } else if (isRecord(rawIntro.thread)) {
        introThreadId =
          typeof rawIntro.thread.id === "string" && rawIntro.thread.id.trim()
            ? rawIntro.thread.id.trim()
            : (typeof rawIntro.threadId === "string" && rawIntro.threadId.trim()
                ? rawIntro.threadId.trim()
                : "");
        introThreadName =
          typeof rawIntro.thread.name === "string" && rawIntro.thread.name.trim()
            ? rawIntro.thread.name.trim()
            : (typeof rawIntro.threadName === "string" && rawIntro.threadName.trim()
                ? rawIntro.threadName.trim()
                : introThreadId);
        introThreadSource =
          typeof rawIntro.thread.source === "string" && rawIntro.thread.source.trim()
            ? rawIntro.thread.source.trim()
            : "";
      }
      if (!introThreadId) {
        introThreadId = "unknown-thread";
        introThreadName = "unknown-thread";
      }
      if (!introThreadSource) {
        introThreadSource = introRuntime;
      }
      const introWorkingDirectory =
        typeof rawIntro.workingDirectory === "string" && rawIntro.workingDirectory.trim()
          ? rawIntro.workingDirectory.trim()
          : "unknown-working-directory";
      const rawHost = isRecord(rawIntro.host) ? rawIntro.host : {};
      const host = {
        hostname: typeof rawHost.hostname === "string" && rawHost.hostname.trim() ? rawHost.hostname.trim() : "unknown-host",
        localIp: typeof rawHost.localIp === "string" && rawHost.localIp.trim() ? rawHost.localIp.trim() : "unknown-local-ip",
        publicIp: typeof rawHost.publicIp === "string" && rawHost.publicIp.trim() ? rawHost.publicIp.trim() : "unknown-public-ip",
        location: typeof rawHost.location === "string" && rawHost.location.trim() ? rawHost.location.trim() : "unknown-location",
        timezone: typeof rawHost.timezone === "string" && rawHost.timezone.trim() ? rawHost.timezone.trim() : "unknown-timezone",
      };

      agent = await storage.createAgent(boardId, {
        name: resolvedAgent,
        description: (body.description as string) || "AI agent (auto-registered via webhook)",
        metadata: {
          ...rawMetadata,
          intro: {
            ...rawIntro,
            runtime: introRuntime,
            sessionKey: introSessionKey,
            model: introModel,
            thread: {
              id: introThreadId,
              name: introThreadName || introThreadId,
              source: introThreadSource,
            },
            workingDirectory: introWorkingDirectory,
            host,
          },
        },
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
    if (err instanceof AgentRegistrationError) {
      const status = err.code.endsWith("_CONFLICT") ? 409 : 400;
      return NextResponse.json(
        { ok: false, error: { code: err.code, message: err.message } },
        { status }
      );
    }
    console.error("POST /webhook:", err);
    return NextResponse.json(
      { ok: false, error: { code: "INTERNAL_ERROR", message: "An unexpected error occurred" } },
      { status: 500 }
    );
  }
}
