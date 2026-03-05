import type { Agent, Task } from "@/lib/types";
import { Card } from "@/components/ui/card";
import { AgentStatusBadge } from "@/components/common/status-badge";
import { TimeAgo } from "@/components/common/time-ago";
import { Atom, Bot, Brain, Cpu, Sparkles } from "lucide-react";
import type { LucideIcon } from "lucide-react";

const statusDotColor: Record<string, string> = {
  active: "bg-status-active-dot",
  idle: "bg-status-idle-dot",
  error: "bg-status-error-dot",
  offline: "bg-status-offline-dot",
  waiting: "bg-status-waiting-dot animate-pulse",
};

interface AgentCardProps {
  agent: Agent;
  tasks: Task[];
}

interface MetadataEntry {
  key: string;
  value: string;
}

interface AgentIntroSummary {
  runtime: string;
  model: string;
  threadId: string;
  threadName: string;
  threadSource: string;
  workspace: string;
}

interface ModelVisual {
  Icon: LucideIcon;
  provider: string;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function normalizeText(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function extractIntroSummary(metadata: unknown): AgentIntroSummary | null {
  if (!isRecord(metadata)) return null;
  const intro = metadata.intro;
  if (!isRecord(intro)) return null;

  const runtime = normalizeText(intro.runtime);
  const model = normalizeText(intro.model);
  const workingDirectory = normalizeText(intro.workingDirectory);
  const workspaceName =
    workingDirectory.split(/[\\/]/).filter(Boolean).pop() || "unknown-workspace";

  let threadId = "";
  let threadName = "";
  let threadSource = "";
  if (typeof intro.thread === "string") {
    threadId = normalizeText(intro.thread);
    threadName = normalizeText(intro.threadName) || threadId;
  } else if (isRecord(intro.thread)) {
    threadId = normalizeText(intro.thread.id) || normalizeText(intro.threadId);
    threadName = normalizeText(intro.thread.name) || normalizeText(intro.threadName) || threadId;
    threadSource = normalizeText(intro.thread.source);
  }

  if (!runtime && !model && !threadId && !threadName) return null;
  return {
    runtime: runtime || "unknown-runtime",
    model: model || "unknown-model",
    threadId: threadId || "unknown-thread",
    threadName: threadName || threadId || "unknown-thread",
    threadSource: threadSource || runtime || "unknown-runtime",
    workspace: workspaceName,
  };
}

function modelVisual(model: string, runtime: string): ModelVisual {
  const token = `${model} ${runtime}`.toLowerCase();
  if (token.includes("claude") || token.includes("anthropic")) {
    return { Icon: Brain, provider: "Anthropic" };
  }
  if (token.includes("gemini") || token.includes("google")) {
    return { Icon: Atom, provider: "Google" };
  }
  if (
    token.includes("gpt") ||
    token.includes("codex") ||
    token.includes("openai") ||
    token.includes("o1") ||
    token.includes("o3") ||
    token.includes("o4")
  ) {
    return { Icon: Sparkles, provider: "OpenAI" };
  }
  if (token.includes("llama") || token.includes("mistral")) {
    return { Icon: Bot, provider: "OSS" };
  }
  return { Icon: Cpu, provider: "Model" };
}

function stringifyMetadataValue(value: unknown): string {
  if (value === null) return "null";
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

function flattenMetadata(value: unknown, keyPath = "", entries: MetadataEntry[] = []): MetadataEntry[] {
  if (Array.isArray(value)) {
    if (value.length === 0) {
      if (keyPath) entries.push({ key: keyPath, value: "[]" });
      return entries;
    }
    value.forEach((item, index) => {
      const nextPath = keyPath ? `${keyPath}[${index}]` : `[${index}]`;
      flattenMetadata(item, nextPath, entries);
    });
    return entries;
  }

  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>;
    const keys = Object.keys(record);
    if (keys.length === 0) {
      if (keyPath) entries.push({ key: keyPath, value: "{}" });
      return entries;
    }
    for (const key of keys) {
      const nextPath = keyPath ? `${keyPath}.${key}` : key;
      flattenMetadata(record[key], nextPath, entries);
    }
    return entries;
  }

  if (keyPath) {
    entries.push({ key: keyPath, value: stringifyMetadataValue(value) });
  }

  return entries;
}

export function AgentCard({ agent, tasks }: AgentCardProps) {
  const currentTask = agent.currentTaskId
    ? tasks.find(
        (t) =>
          t.id === agent.currentTaskId &&
          (!agent.currentInitiativeId || t.initiativeId === agent.currentInitiativeId),
      )
    : null;
  const metadataEntries = flattenMetadata(agent.metadata);
  const intro = extractIntroSummary(agent.metadata);
  const visual = intro ? modelVisual(intro.model, intro.runtime) : null;
  const ModelIcon = visual?.Icon;

  return (
    <Card className="p-4 gap-0">
      <div className="flex items-center gap-2 mb-2 flex-wrap">
        <div className={`w-2 h-2 rounded-full ${statusDotColor[agent.status]}`} />
        <h4 className="text-sm font-medium text-foreground truncate">{agent.name}</h4>
        {intro && ModelIcon ? (
          <span className="inline-flex items-center gap-1 rounded-full border border-border/80 bg-muted/40 px-2 py-0.5 text-[11px] text-foreground/90">
            <ModelIcon className="h-3 w-3" />
            <span className="font-medium">{visual?.provider}</span>
            <span className="text-muted-foreground">{intro.model}</span>
          </span>
        ) : null}
        <AgentStatusBadge status={agent.status} />
      </div>

      <p className="text-[11px] text-muted-foreground mb-2">
        id: <span className="font-mono text-foreground/80">{agent.id}</span>
      </p>

      {agent.description && (
        <p className="text-xs text-muted-foreground line-clamp-2 mb-2">
          {agent.description}
        </p>
      )}

      {agent.statusMessage && (
        <p className="text-xs text-muted-foreground italic mb-2 line-clamp-2">
          &ldquo;{agent.statusMessage}&rdquo;
        </p>
      )}

      {intro ? (
        <p className="text-[11px] text-muted-foreground mb-2 leading-4">
          thread: <span className="text-foreground/90">{intro.threadName}</span>{" "}
          <span className="font-mono text-foreground/70">({intro.threadId})</span> via{" "}
          <span className="text-foreground/80">{intro.threadSource}</span> · workspace{" "}
          <span className="text-foreground/90">{intro.workspace}</span>
        </p>
      ) : null}

      {currentTask && (
        <div className="text-xs bg-muted p-2 rounded-md mb-2">
          <span className="text-muted-foreground">Working on: </span>
          <span className="font-medium">{currentTask.title}</span>
          <span className="text-muted-foreground"> ({currentTask.initiativeId})</span>
        </div>
      )}

      <div className="mb-2">
        <p className="text-[11px] text-muted-foreground mb-1">Metadata</p>
        {metadataEntries.length > 0 ? (
          <div className="max-h-28 overflow-y-auto rounded-md border border-border/70 bg-muted/30 p-2 space-y-1">
            {metadataEntries.map((entry) => (
              <p key={`${agent.id}-${entry.key}`} className="text-[11px] leading-4 break-all">
                <span className="font-mono text-foreground/80">{entry.key}</span>
                <span className="text-muted-foreground">: </span>
                <span className="text-foreground/90">{entry.value}</span>
              </p>
            ))}
          </div>
        ) : (
          <p className="text-[11px] text-muted-foreground">No metadata</p>
        )}
      </div>

      <div className="flex items-center justify-between text-xs text-muted-foreground mt-auto pt-1">
        <span>Last heartbeat</span>
        <TimeAgo date={agent.lastHeartbeat} />
      </div>
    </Card>
  );
}
