import { NextRequest, NextResponse } from "next/server";
import { getStorage } from "@/lib/storage/fs-storage";

type Params = { params: Promise<{ boardId: string }> };

const agentConfigs: Record<string, { filename: string; contentType: string; generate: (url: string, boardId: string, agentName: string) => string }> = {
  "claude-code": {
    filename: "CLAUDE.md",
    contentType: "text/markdown",
    generate: (url, boardId, agentName) => `## Agentboard Status Reporting

When working on this project, report your progress to Agentboard:

- **URL**: \`${url}\`
- **Board**: \`${boardId}\`
- **Agent**: \`${agentName}\`

### How to report

\`\`\`bash
# Heartbeat — send frequently
curl -s -X POST ${url}/api/boards/${boardId}/agents/${agentName}/heartbeat \\
  -H "Content-Type: application/json" -d '{"message": "what you are doing"}'

# Create task
curl -s -X POST ${url}/api/boards/${boardId}/projects/{PROJECT_ID}/tasks \\
  -H "Content-Type: application/json" \\
  -d '{"title": "...", "assigneeAgentId": "${agentName}", "priority": "medium"}'

# Update task status (in_progress | done | blocked)
curl -s -X PATCH ${url}/api/boards/${boardId}/projects/{PROJECT_ID}/tasks/{TASK_ID} \\
  -H "Content-Type: application/json" -d '{"status": "in_progress"}'
\`\`\`

Report at the start of work, on milestones, and when completing tasks.
`,
  },

  cursor: {
    filename: ".cursorrules",
    contentType: "text/plain",
    generate: (url, boardId, agentName) => `# Agentboard Status Reporting

You are an AI agent reporting progress to Agentboard. Use cURL to report status.

- Agentboard URL: ${url}
- Board: ${boardId}
- Agent: ${agentName}

At the start of every session, register yourself (idempotent):
curl -s -X POST ${url}/api/boards/${boardId}/agents -H "Content-Type: application/json" -d '{"name": "${agentName}", "description": "Cursor AI agent", "metadata": {"editor": "cursor"}}'

Send heartbeats to report what you are doing:
curl -s -X POST ${url}/api/boards/${boardId}/agents/${agentName}/heartbeat -H "Content-Type: application/json" -d '{"message": "description of current work"}'

Create tasks when starting new work:
curl -s -X POST ${url}/api/boards/${boardId}/projects/{PROJECT_ID}/tasks -H "Content-Type: application/json" -d '{"title": "task title", "assigneeAgentId": "${agentName}", "priority": "medium"}'

Update task status as you work (statuses: todo, in_progress, done, blocked):
curl -s -X PATCH ${url}/api/boards/${boardId}/projects/{PROJECT_ID}/tasks/{TASK_ID} -H "Content-Type: application/json" -d '{"status": "in_progress"}'

Report at the start of work, on milestones, when completing tasks, and if blocked.
`,
  },

  codex: {
    filename: "AGENTS.md",
    contentType: "text/markdown",
    generate: (url, boardId, agentName) => `## Agentboard Status Reporting

You are an AI agent reporting progress to Agentboard at \`${url}\`.

Board: \`${boardId}\` | Agent: \`${agentName}\`

### Register (once per session)
\`\`\`bash
curl -s -X POST ${url}/api/boards/${boardId}/agents \\
  -H "Content-Type: application/json" \\
  -d '{"name": "${agentName}", "description": "OpenAI Codex agent", "metadata": {"runtime": "codex"}}'
\`\`\`

### Heartbeat (frequently)
\`\`\`bash
curl -s -X POST ${url}/api/boards/${boardId}/agents/${agentName}/heartbeat \\
  -H "Content-Type: application/json" -d '{"message": "what you are doing"}'
\`\`\`

### Create task
\`\`\`bash
curl -s -X POST ${url}/api/boards/${boardId}/projects/{PROJECT_ID}/tasks \\
  -H "Content-Type: application/json" \\
  -d '{"title": "...", "assigneeAgentId": "${agentName}", "priority": "medium"}'
\`\`\`

### Update task (todo | in_progress | done | blocked)
\`\`\`bash
curl -s -X PATCH ${url}/api/boards/${boardId}/projects/{PROJECT_ID}/tasks/{TASK_ID} \\
  -H "Content-Type: application/json" -d '{"status": "in_progress"}'
\`\`\`

Report at start of work, on milestones, when done, and if blocked.
`,
  },

  generic: {
    filename: "agentboard-instructions.md",
    contentType: "text/markdown",
    generate: (url, boardId, agentName) => `# Agentboard Status Reporting

You are an AI agent reporting progress to Agentboard at \`${url}\`.

Board: \`${boardId}\` | Agent: \`${agentName}\`

## Register (once per session)
curl -s -X POST ${url}/api/boards/${boardId}/agents -H "Content-Type: application/json" -d '{"name": "${agentName}", "description": "AI agent", "metadata": {}}'

## Heartbeat (frequently)
curl -s -X POST ${url}/api/boards/${boardId}/agents/${agentName}/heartbeat -H "Content-Type: application/json" -d '{"message": "what you are doing"}'

## Create task
curl -s -X POST ${url}/api/boards/${boardId}/projects/{PROJECT_ID}/tasks -H "Content-Type: application/json" -d '{"title": "...", "assigneeAgentId": "${agentName}", "priority": "medium"}'

## Update task (todo | in_progress | done | blocked)
curl -s -X PATCH ${url}/api/boards/${boardId}/projects/{PROJECT_ID}/tasks/{TASK_ID} -H "Content-Type: application/json" -d '{"status": "in_progress"}'

Report at start of work, on milestones, when done, and if blocked.
`,
  },
};

export async function GET(request: NextRequest, { params }: Params) {
  try {
    const { boardId } = await params;
    const url = new URL(request.url);
    const agentType = url.searchParams.get("agent") || "generic";
    const agentName = url.searchParams.get("name") || agentType + "-agent";
    const baseUrl = url.searchParams.get("url") || `${url.protocol}//${url.host}`;

    const storage = getStorage();
    const board = await storage.getBoard(boardId);
    if (!board) {
      return NextResponse.json(
        { ok: false, error: { code: "NOT_FOUND", message: "Board not found" } },
        { status: 404 }
      );
    }

    const config = agentConfigs[agentType] || agentConfigs.generic;
    const content = config.generate(baseUrl, boardId, agentName);

    // If ?format=json, return structured data
    if (url.searchParams.get("format") === "json") {
      return NextResponse.json({
        ok: true,
        data: {
          agent: agentType,
          filename: config.filename,
          content,
          installCommand: agentType === "cursor"
            ? `curl -s "${baseUrl}/api/boards/${boardId}/install?agent=cursor&name=${agentName}" >> .cursorrules`
            : agentType === "claude-code"
            ? `curl -s "${baseUrl}/api/boards/${boardId}/install?agent=claude-code&name=${agentName}" >> CLAUDE.md`
            : agentType === "codex"
            ? `curl -s "${baseUrl}/api/boards/${boardId}/install?agent=codex&name=${agentName}" >> AGENTS.md`
            : `curl -s "${baseUrl}/api/boards/${boardId}/install?agent=generic&name=${agentName}" > agentboard-instructions.md`,
        },
      });
    }

    // Raw text output — pipe-friendly
    return new Response(content, {
      headers: {
        "Content-Type": config.contentType,
        "Content-Disposition": `inline; filename="${config.filename}"`,
      },
    });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: { code: "INTERNAL_ERROR", message: String(err) } },
      { status: 500 }
    );
  }
}
