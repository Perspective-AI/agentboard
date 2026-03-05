import { NextRequest, NextResponse } from "next/server";
import { AgentRegistrationError, getStorage } from "@/lib/storage/fs-storage";
import { sseHub } from "@/lib/sse/hub";
import { slugify } from "@/lib/utils";

type Params = { params: Promise<{ boardId: string }> };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

type AgentThreadPayload = {
  id: string;
  name: string;
  source?: string;
};

type AgentIntroPayload = {
  runtime: string;
  sessionKey: string;
  model: string;
  thread: AgentThreadPayload;
  workingDirectory: string;
  host?: {
    hostname: string;
    localIp: string;
  };
};

type NetworkContext = {
  clientIp: string;
  forwardedFor: string;
  realIp: string;
  userAgent: string;
  location: string;
  timezone: string;
  country: string;
  region: string;
  city: string;
  latitude: string;
  longitude: string;
};

function normalizeText(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function inferModelFromRuntime(runtime: string): string {
  const key = runtime.toLowerCase();
  if (key.includes("codex") || key.includes("openai")) return "codex";
  if (key.includes("claude") || key.includes("anthropic")) return "claude";
  if (key.includes("cursor")) return "cursor";
  return "unknown-model";
}

function extractThread(intro: Record<string, unknown>): AgentThreadPayload | null {
  const threadRaw = intro.thread;

  if (typeof threadRaw === "string") {
    const id = normalizeText(threadRaw);
    const name = normalizeText(intro.threadName) || id;
    if (!id) return null;
    return { id, name };
  }

  if (!isRecord(threadRaw)) {
    return null;
  }

  const id = normalizeText(threadRaw.id) || normalizeText(intro.threadId);
  const name = normalizeText(threadRaw.name) || normalizeText(intro.threadName) || id;
  const source = normalizeText(threadRaw.source);
  if (!id) return null;
  return source ? { id, name, source } : { id, name };
}

function extractIntro(metadata: unknown): AgentIntroPayload | null {
  if (!isRecord(metadata)) return null;
  const intro = metadata.intro;
  if (!isRecord(intro)) return null;

  const runtime = normalizeText(intro.runtime) || "unknown-runtime";
  const sessionKey = normalizeText(intro.sessionKey) || normalizeText(intro.instanceKey);
  const model = normalizeText(intro.model) || inferModelFromRuntime(runtime);
  const thread =
    extractThread(intro) ||
    (() => {
      const fallbackId = normalizeText(intro.threadId) || "unknown-thread";
      const fallbackName = normalizeText(intro.threadName) || fallbackId;
      return {
        id: fallbackId,
        name: fallbackName,
        source: runtime,
      };
    })();
  const workingDirectory = normalizeText(intro.workingDirectory) || "unknown-working-directory";

  const hostRaw = isRecord(intro.host) ? intro.host : {};
  const hostHostname = normalizeText(hostRaw.hostname);
  const hostLocalIp = normalizeText(hostRaw.localIp);
  const host =
    hostHostname || hostLocalIp
      ? {
          hostname: hostHostname || "unknown-host",
          localIp: hostLocalIp || "unknown-local-ip",
        }
      : undefined;

  if (!sessionKey) return null;

  return { runtime, sessionKey, model, thread, workingDirectory, host };
}

function canonicalName(name: string): string {
  return name.trim().toLowerCase();
}

function getHeader(request: NextRequest, name: string): string {
  return normalizeText(request.headers.get(name));
}

function firstForwardedIp(forwardedFor: string): string {
  if (!forwardedFor) return "";
  const [first] = forwardedFor.split(",");
  return normalizeText(first);
}

function extractIncomingNetworkContext(request: NextRequest): NetworkContext {
  const forwardedFor = getHeader(request, "x-forwarded-for");
  const realIp = getHeader(request, "x-real-ip");
  const cfIp = getHeader(request, "cf-connecting-ip");
  const vercelForwarded = getHeader(request, "x-vercel-forwarded-for");
  const candidateIp =
    realIp ||
    cfIp ||
    firstForwardedIp(forwardedFor) ||
    firstForwardedIp(vercelForwarded) ||
    "unknown-client-ip";

  const city = getHeader(request, "x-vercel-ip-city");
  const region = getHeader(request, "x-vercel-ip-country-region");
  const country = getHeader(request, "x-vercel-ip-country");
  const latitude = getHeader(request, "x-vercel-ip-latitude");
  const longitude = getHeader(request, "x-vercel-ip-longitude");
  const timezone = getHeader(request, "x-vercel-ip-timezone") || "unknown-timezone";
  const locationParts = [city, region, country].filter(Boolean);
  const location = locationParts.length > 0 ? locationParts.join(", ") : "unknown-location";

  return {
    clientIp: candidateIp,
    forwardedFor: forwardedFor || vercelForwarded || "",
    realIp,
    userAgent: getHeader(request, "user-agent"),
    location,
    timezone,
    country,
    region,
    city,
    latitude,
    longitude,
  };
}

function mergeRegistrationMetadata(
  base: Record<string, unknown>,
  incoming: Record<string, unknown>,
  intro: AgentIntroPayload,
  network: NetworkContext,
): Record<string, unknown> {
  const incomingWithoutIntro: Record<string, unknown> = { ...incoming };
  delete incomingWithoutIntro.intro;

  const baseIntro = isRecord(base.intro) ? base.intro : {};
  const incomingIntro = isRecord(incoming.intro) ? incoming.intro : {};

  const mergedIntro = {
    ...baseIntro,
    ...incomingIntro,
    ...intro,
    network,
  };

  return {
    ...base,
    ...incomingWithoutIntro,
    intro: mergedIntro,
  };
}

export async function POST(request: NextRequest, { params }: Params) {
  try {
    const { boardId } = await params;

    let body: Record<string, unknown>;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { ok: false, error: { code: "INVALID_JSON", message: "Request body must be valid JSON" } },
        { status: 400 },
      );
    }

    const name = typeof body.name === "string" ? body.name.trim() : "";
    if (!name) {
      return NextResponse.json(
        { ok: false, error: { code: "MISSING_NAME", message: "Agent name is required" } },
        { status: 400 },
      );
    }

    const description = typeof body.description === "string" ? body.description.trim() : "";
    if (!description) {
      return NextResponse.json(
        { ok: false, error: { code: "MISSING_DESCRIPTION", message: "Agent description is required" } },
        { status: 400 },
      );
    }

    const metadata = isRecord(body.metadata) ? body.metadata : {};
    const intro = extractIntro(metadata);
    if (!intro) {
      return NextResponse.json(
        {
          ok: false,
          error: {
            code: "INVALID_AGENT_INTRO",
            message:
              "metadata.intro.sessionKey is required (runtime/model/thread/workingDirectory are auto-detected or defaulted)",
          },
        },
        { status: 400 },
      );
    }
    const network = extractIncomingNetworkContext(request);

    const desiredId = slugify(name);
    if (!desiredId) {
      return NextResponse.json(
        { ok: false, error: { code: "INVALID_NAME", message: "Agent name must contain at least one letter or number" } },
        { status: 400 },
      );
    }

    const storage = getStorage();
    const board = await storage.getBoard(boardId);
    if (!board) {
      return NextResponse.json({ ok: false, error: { code: "NOT_FOUND", message: "Board not found" } }, { status: 404 });
    }

    // Idempotent re-register: same name/id and same instance key refreshes metadata.
    const existing = await storage.getAgent(boardId, desiredId);
    if (existing) {
      if (canonicalName(existing.name) !== canonicalName(name)) {
        return NextResponse.json(
          { ok: false, error: { code: "AGENT_ID_CONFLICT", message: `Agent id already exists: ${desiredId}` } },
          { status: 409 },
        );
      }
      const existingIntro = extractIntro(existing.metadata);
      if (existingIntro?.sessionKey && existingIntro.sessionKey !== intro.sessionKey) {
        return NextResponse.json(
          {
            ok: false,
            error: {
              code: "AGENT_ID_CONFLICT",
              message: `Agent id already exists with a different session key: ${desiredId}`,
            },
          },
          { status: 409 },
        );
      }

      const existingMetadata = isRecord(existing.metadata) ? existing.metadata : {};
      const updatedMetadata = mergeRegistrationMetadata(existingMetadata, metadata, intro, network);

      const updated = await storage.updateAgent(boardId, desiredId, {
        description,
        metadata: updatedMetadata,
      });

      if (!updated) {
        return NextResponse.json(
          { ok: false, error: { code: "INTERNAL_ERROR", message: "Failed to refresh existing agent registration" } },
          { status: 500 },
        );
      }

      sseHub.broadcast(boardId, "agent:updated", updated);
      return NextResponse.json({ ok: true, data: updated });
    }

    const normalizedMetadata = mergeRegistrationMetadata({}, metadata, intro, network);
    const agent = await storage.createAgent(boardId, { name, description, metadata: normalizedMetadata });
    sseHub.broadcast(boardId, "agent:registered", agent);
    return NextResponse.json({ ok: true, data: agent }, { status: 201 });
  } catch (err) {
    if (err instanceof AgentRegistrationError) {
      const status = err.code.endsWith("_CONFLICT") ? 409 : 400;
      return NextResponse.json(
        { ok: false, error: { code: err.code, message: err.message } },
        { status },
      );
    }
    console.error("POST /agents:", err);
    return NextResponse.json({ ok: false, error: { code: "INTERNAL_ERROR", message: "An unexpected error occurred" } }, { status: 500 });
  }
}

export async function GET(_request: NextRequest, { params }: Params) {
  try {
    const { boardId } = await params;
    const storage = getStorage();
    const agents = await storage.listAgents(boardId);
    return NextResponse.json({ ok: true, data: agents });
  } catch (err) {
    console.error("GET /agents:", err);
    return NextResponse.json({ ok: false, error: { code: "INTERNAL_ERROR", message: "An unexpected error occurred" } }, { status: 500 });
  }
}
