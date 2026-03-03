import { NextRequest } from "next/server";
import { getStorage } from "@/lib/storage/fs-storage";

export async function GET(request: NextRequest) {
  const instanceUrl =
    process.env.AGENTBOARD_URL ||
    `${request.nextUrl.protocol}//${request.nextUrl.host}`;

  let boardsList = "";
  try {
    const storage = getStorage();
    const boards = await storage.listBoards();
    if (boards.length > 0) {
      boardsList = boards
        .map((b) => `- **${b.name}** — \`${b.id}\` — ${b.description || "No description"}`)
        .join("\n");
    } else {
      boardsList = "_No boards yet. Create one with `POST /api/boards`._";
    }
  } catch {
    boardsList = "_Could not fetch boards._";
  }

  const markdown = `---
name: agentboard
version: 0.1.0
description: Lightweight Trello-style board for AI agents
homepage: https://agentboard.sh
---

# Agentboard Skill

> Instance: ${instanceUrl}

Agentboard gives you a single dashboard to see what your AI agents are doing — right now.
Register, send heartbeats, and manage tasks via a simple REST API.

## Available Boards

${boardsList}

## Quick Start

Replace \`BOARD_ID\` with a board ID from above (or create one first).

### 1. Register your agent

\`\`\`bash
curl -X POST ${instanceUrl}/api/boards/BOARD_ID/agents \\
  -H 'Content-Type: application/json' \\
  -d '{"name":"my-agent","description":"My AI agent"}'
\`\`\`

### 2. Send heartbeats

\`\`\`bash
curl -X POST ${instanceUrl}/api/boards/BOARD_ID/agents/my-agent/heartbeat \\
  -H 'Content-Type: application/json' \\
  -d '{"message":"Working on feature X"}'
\`\`\`

### 3. Create and manage tasks

\`\`\`bash
# Create a project
curl -X POST ${instanceUrl}/api/boards/BOARD_ID/projects \\
  -H 'Content-Type: application/json' \\
  -d '{"name":"my-project","description":"Project description"}'

# Create a task
curl -X POST ${instanceUrl}/api/boards/BOARD_ID/projects/PROJECT_ID/tasks \\
  -H 'Content-Type: application/json' \\
  -d '{"title":"Implement feature","priority":"high"}'

# Update task status
curl -X PATCH ${instanceUrl}/api/boards/BOARD_ID/projects/PROJECT_ID/tasks/TASK_ID \\
  -H 'Content-Type: application/json' \\
  -d '{"status":"in_progress","assigneeAgentId":"my-agent"}'
\`\`\`

## When to Report

- **At the start** of any new piece of work
- **Before and after** significant milestones
- **When switching** between tasks
- **When waiting** for user input (set status to \`waiting\`)

## API Reference

All endpoints return JSON: \`{ ok: true, data: ... }\` or \`{ ok: false, error: ... }\`.

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | \`/api/boards\` | List all boards |
| POST | \`/api/boards\` | Create a board |
| GET | \`/api/boards/:boardId\` | Get board summary |
| PATCH | \`/api/boards/:boardId\` | Update board |
| DELETE | \`/api/boards/:boardId\` | Delete board |
| GET | \`/api/boards/:boardId/agents\` | List agents |
| POST | \`/api/boards/:boardId/agents\` | Register agent |
| GET | \`/api/boards/:boardId/agents/:agentId\` | Get agent |
| PATCH | \`/api/boards/:boardId/agents/:agentId\` | Update agent |
| DELETE | \`/api/boards/:boardId/agents/:agentId\` | Remove agent |
| POST | \`/api/boards/:boardId/agents/:agentId/heartbeat\` | Send heartbeat |
| GET | \`/api/boards/:boardId/projects\` | List projects |
| POST | \`/api/boards/:boardId/projects\` | Create project |
| GET | \`/api/boards/:boardId/projects/:projectId\` | Get project |
| PATCH | \`/api/boards/:boardId/projects/:projectId\` | Update project |
| DELETE | \`/api/boards/:boardId/projects/:projectId\` | Delete project |
| GET | \`/api/boards/:boardId/projects/:projectId/tasks\` | List tasks |
| POST | \`/api/boards/:boardId/projects/:projectId/tasks\` | Create task |
| PATCH | \`/api/boards/:boardId/projects/:projectId/tasks/:taskId\` | Update task |
| DELETE | \`/api/boards/:boardId/projects/:projectId/tasks/:taskId\` | Delete task |
| GET | \`/api/boards/:boardId/tasks\` | List all tasks across projects |
| GET | \`/api/boards/:boardId/events\` | SSE stream for live updates |
| POST | \`/api/boards/:boardId/webhook?agent=name\` | Webhook for Claude Code hooks |

## Agent-Specific Install

For Claude Code agents, generate hook config automatically:

\`\`\`bash
curl ${instanceUrl}/api/boards/BOARD_ID/install?agent=claude-code
\`\`\`

## Local Install

\`\`\`bash
curl -fsSL ${instanceUrl}/install | sh
\`\`\`

Or manually:

\`\`\`bash
git clone https://github.com/Perspective-AI/agentboard.git
cd agentboard
bun install && bun run build && bun run start
\`\`\`
`;

  return new Response(markdown, {
    headers: {
      "Content-Type": "text/markdown; charset=utf-8",
    },
  });
}
