"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Check, Copy } from "lucide-react";

interface InstallAgentsProps {
  boardId: string;
}

const agents = [
  {
    id: "claude-code",
    name: "Claude Code",
    description: "Anthropic's CLI agent",
    file: "CLAUDE.md",
    installHint: "Append to your project's CLAUDE.md",
  },
  {
    id: "cursor",
    name: "Cursor",
    description: "AI-powered code editor",
    file: ".cursorrules",
    installHint: "Append to your project's .cursorrules",
  },
  {
    id: "codex",
    name: "OpenAI Codex",
    description: "OpenAI's coding agent",
    file: "AGENTS.md",
    installHint: "Append to your project's AGENTS.md",
  },
  {
    id: "generic",
    name: "Other Agents",
    description: "OpenClaw, Aider, custom agents, etc.",
    file: "agentboard-instructions.md",
    installHint: "Add to your agent's system prompt or project config",
  },
];

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  const copy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0" onClick={copy}>
      {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
    </Button>
  );
}

export function InstallAgents({ boardId }: InstallAgentsProps) {
  const [selected, setSelected] = useState("claude-code");
  const baseUrl = typeof window !== "undefined" ? window.location.origin : "http://localhost:4040";

  const agent = agents.find((a) => a.id === selected)!;

  const installCmd =
    agent.id === "cursor"
      ? `curl -s "${baseUrl}/api/boards/${boardId}/install?agent=cursor&name=my-cursor-agent" >> .cursorrules`
      : agent.id === "claude-code"
      ? `curl -s "${baseUrl}/api/boards/${boardId}/install?agent=claude-code&name=my-claude-agent" >> CLAUDE.md`
      : agent.id === "codex"
      ? `curl -s "${baseUrl}/api/boards/${boardId}/install?agent=codex&name=my-codex-agent" >> AGENTS.md`
      : `curl -s "${baseUrl}/api/boards/${boardId}/install?agent=generic&name=my-agent" > agentboard-instructions.md`;

  const registerCmd = `curl -s -X POST ${baseUrl}/api/boards/${boardId}/agents \\
  -H "Content-Type: application/json" \\
  -d '{"name": "my-agent", "description": "AI agent", "metadata": {}}'`;

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h3 className="text-sm font-semibold text-foreground mb-1">Connect an Agent</h3>
        <p className="text-sm text-muted-foreground">
          Install the Agentboard skill so your AI agent reports progress to this board.
        </p>
      </div>

      {/* Agent selector */}
      <div className="flex gap-2">
        {agents.map((a) => (
          <button
            key={a.id}
            onClick={() => setSelected(a.id)}
            className={`px-3 py-1.5 text-xs rounded-md transition-colors ${
              selected === a.id
                ? "bg-foreground text-background"
                : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
            }`}
          >
            {a.name}
          </button>
        ))}
      </div>

      {/* Install steps */}
      <div className="space-y-4">
        <div>
          <h4 className="text-sm font-medium text-foreground mb-2">
            Step 1: Install the skill
          </h4>
          <p className="text-xs text-muted-foreground mb-2">
            {agent.installHint}. Run this in your project directory:
          </p>
          <div className="relative">
            <pre className="bg-muted text-foreground p-3 pr-10 rounded-lg overflow-x-auto text-xs">
              {installCmd}
            </pre>
            <div className="absolute top-2 right-2">
              <CopyButton text={installCmd} />
            </div>
          </div>
        </div>

        <div>
          <h4 className="text-sm font-medium text-foreground mb-2">
            Step 2: Register the agent
          </h4>
          <p className="text-xs text-muted-foreground mb-2">
            The agent will do this automatically, or you can register manually:
          </p>
          <div className="relative">
            <pre className="bg-muted text-foreground p-3 pr-10 rounded-lg overflow-x-auto text-xs">
              {registerCmd}
            </pre>
            <div className="absolute top-2 right-2">
              <CopyButton text={registerCmd} />
            </div>
          </div>
        </div>

        <div>
          <h4 className="text-sm font-medium text-foreground mb-2">
            Step 3: Start working
          </h4>
          <p className="text-xs text-muted-foreground">
            The agent will now report heartbeats, create tasks, and update status on this board automatically.
            Watch the <span className="font-medium text-foreground">Agents</span> and{" "}
            <span className="font-medium text-foreground">Projects</span> tabs for real-time updates.
          </p>
        </div>

        <div className="border-t pt-4">
          <h4 className="text-sm font-medium text-foreground mb-2">
            From Git
          </h4>
          <p className="text-xs text-muted-foreground mb-2">
            Agent config templates are also available in the{" "}
            <code className="bg-muted px-1 py-0.5 rounded text-xs">agents/</code> directory of the Agentboard repo.
            Copy the one matching your agent and replace the placeholder values.
          </p>
        </div>
      </div>
    </div>
  );
}
