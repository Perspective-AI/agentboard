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

Use \`./bin/agentboard\` for reporting (not raw \`curl\`) so Claude Code can
approve one stable command prefix once and run future updates without repeated
prompts.

### How to report

\`\`\`bash
# .agentboard config
cat > .agentboard <<'EOF'
AGENTBOARD_URL=${url}
AGENTBOARD_BOARD=${boardId}
AGENTBOARD_AGENT=${agentName}
EOF

# Register once per session
./bin/agentboard register ${agentName} "Claude Code agent"

# Plan larger work
./bin/agentboard plan create {PROJECT_ID} "Plan title"
./bin/agentboard step create {PROJECT_ID} {PLAN_ID} "Step title" 1

# Create task
./bin/agentboard task create {PROJECT_ID} "..." medium

# Update task status
./bin/agentboard task start {PROJECT_ID} {TASK_ID}
./bin/agentboard task done {PROJECT_ID} {TASK_ID}
./bin/agentboard task block {PROJECT_ID} {TASK_ID}

# Heartbeat (liveness only)
./bin/agentboard heartbeat "alive"
\`\`\`

Task + plan status are the source of truth for work progress.
By default, each CLI API call emits a \`command/status/description\` activity event.
`,
  },

  cursor: {
    filename: ".cursorrules",
    contentType: "text/plain",
    generate: (url, boardId, agentName) => `# Agentboard Status Reporting

You are an AI agent reporting progress to Agentboard.
Use ./bin/agentboard for reporting (not raw curl) so your runtime can approve
one stable command prefix once and run future updates without repeated prompts.

- Agentboard URL: ${url}
- Board: ${boardId}
- Agent: ${agentName}

Create a .agentboard file:
cat > .agentboard <<'EOF'
AGENTBOARD_URL=${url}
AGENTBOARD_BOARD=${boardId}
AGENTBOARD_AGENT=${agentName}
EOF

At the start of every session, register yourself (idempotent):
./bin/agentboard register ${agentName} "Cursor AI agent"

Create plans for larger work:
./bin/agentboard plan create {PROJECT_ID} "Plan title"
./bin/agentboard step create {PROJECT_ID} {PLAN_ID} "Step title" 1

Create tasks when starting execution:
./bin/agentboard task create {PROJECT_ID} "task title" medium

Update task status as you work (statuses: todo, in_progress, done, blocked):
./bin/agentboard task start {PROJECT_ID} {TASK_ID}
./bin/agentboard task done {PROJECT_ID} {TASK_ID}
./bin/agentboard task block {PROJECT_ID} {TASK_ID}

Heartbeat is liveness only:
./bin/agentboard heartbeat "alive"

Task + plan status are the source of truth for work progress.
CLI calls emit \`command/status/description\` activity events by default.
`,
  },

  codex: {
    filename: "AGENTS.md",
    contentType: "text/markdown",
    generate: (url, boardId, agentName) => `## Agentboard Status Reporting

You are an AI agent reporting progress to Agentboard at \`${url}\`.

Board: \`${boardId}\` | Agent: \`${agentName}\`

Use \`./bin/agentboard\` for reporting (not raw \`curl\`) so Codex can approve
one stable command prefix once and run future updates without repeated prompts.

### Register (once per session)
\`\`\`bash
cat > .agentboard <<'EOF'
AGENTBOARD_URL=${url}
AGENTBOARD_BOARD=${boardId}
AGENTBOARD_AGENT=${agentName}
EOF
./bin/agentboard register ${agentName} "OpenAI Codex agent"
\`\`\`

### Plan work
\`\`\`bash
./bin/agentboard plan create {PROJECT_ID} "Plan title"
./bin/agentboard step create {PROJECT_ID} {PLAN_ID} "Step title" 1
\`\`\`

### Create task
\`\`\`bash
./bin/agentboard task create {PROJECT_ID} "..." medium
\`\`\`

### Update task (todo | in_progress | done | blocked)
\`\`\`bash
./bin/agentboard task start {PROJECT_ID} {TASK_ID}
./bin/agentboard task done {PROJECT_ID} {TASK_ID}
./bin/agentboard task block {PROJECT_ID} {TASK_ID}
\`\`\`

### Heartbeat (liveness only)
\`\`\`bash
./bin/agentboard heartbeat "alive"
\`\`\`

Task + plan status are the source of truth for work progress.
CLI calls emit \`command/status/description\` activity events by default.
`,
  },

  generic: {
    filename: "agentboard-instructions.md",
    contentType: "text/markdown",
    generate: (url, boardId, agentName) => `# Agentboard Status Reporting

You are an AI agent reporting progress to Agentboard at \`${url}\`.

Board: \`${boardId}\` | Agent: \`${agentName}\`

Use \`./bin/agentboard\` for reporting (not raw \`curl\`) when your runtime has
permission prompts. A single approved command prefix can then cover all updates.

## Register (once per session)
cat > .agentboard <<'EOF'
AGENTBOARD_URL=${url}
AGENTBOARD_BOARD=${boardId}
AGENTBOARD_AGENT=${agentName}
EOF
./bin/agentboard register ${agentName} "AI agent"

## Plan work
./bin/agentboard plan create {PROJECT_ID} "Plan title"
./bin/agentboard step create {PROJECT_ID} {PLAN_ID} "Step title" 1

## Create task
./bin/agentboard task create {PROJECT_ID} "..." medium

## Update task (todo | in_progress | done | blocked)
./bin/agentboard task start {PROJECT_ID} {TASK_ID}
./bin/agentboard task done {PROJECT_ID} {TASK_ID}
./bin/agentboard task block {PROJECT_ID} {TASK_ID}

## Heartbeat (liveness only)
./bin/agentboard heartbeat "alive"

Task + plan status are the source of truth for work progress.
CLI calls emit \`command/status/description\` activity events by default.
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
    console.error("GET /install:", err);
    return NextResponse.json(
      { ok: false, error: { code: "INTERNAL_ERROR", message: "An unexpected error occurred" } },
      { status: 500 }
    );
  }
}
