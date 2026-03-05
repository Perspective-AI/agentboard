import { NextRequest } from "next/server";
import { getStorage } from "@/lib/storage/fs-storage";

const SKILL_RELEASE = {
  version: "0.4.1",
  updatedAt: "2026-03-05T12:00:00-08:00",
};

export async function GET(request: NextRequest) {
  const instanceUrl =
    process.env.AGENTBOARD_URL ||
    `${request.nextUrl.protocol}//${request.nextUrl.host}`;

  const boardId = process.env.AGENTBOARD_BOARD || "agentboard";

  let projectsTable = "";
  try {
    const storage = getStorage();
    const projects = await storage.listProjects(boardId);
    if (projects.length > 0) {
      projectsTable = projects
        .map((p) => `| ${p.name} | \`${p.id}\` | ${p.description || "—"} |`)
        .join("\n");
    } else {
      projectsTable = "| _(none yet)_ | | Create one with the API below |";
    }
  } catch {
    projectsTable = "| _(could not fetch)_ | | |";
  }

  const markdown = `---
name: agentboard
version: ${SKILL_RELEASE.version}
updated: ${SKILL_RELEASE.updatedAt}
description: >
  Track your work on an Agentboard project board. Use this skill whenever you
  start working on a task, finish a task, hit a blocker, or switch between tasks.
  Also use it at the beginning of a session to check what's assigned to you, and
  before ending a session to report final status. Treat task/plan status updates
  as the source of truth for work progress. If you have access to an
  Agentboard instance, you should always keep it updated — treat it like your
  standup.
homepage: https://agentboard.sh
---

# Agentboard

> **Instance:** ${instanceUrl}
> **Board:** \`${boardId}\`

Keep the board updated as you work. This is how humans track what you're doing.

> **Source of truth:** Task and plan status updates are the source of truth for your progress. Heartbeat is liveness only — do not use it for progress reporting. If you have internal task-tracking tools (e.g. \`TaskCreate\`/\`TaskUpdate\` in Claude Code), those are for your own use — they do NOT report to agentboard. You must use the \`./bin/agentboard\` CLI.

## Skill updates

The latest version of this skill is always available at:

\`\`\`
${instanceUrl}/skill.md
\`\`\`

**At the start of each session**, fetch the latest version and compare the
\`version\` and \`updated\` fields in the frontmatter to this file's values
(\`${SKILL_RELEASE.version}\`, \`${SKILL_RELEASE.updatedAt}\`).
If the server version is newer (or same version with newer timestamp), overwrite this
file with the fetched content and re-read it before continuing.
If the server is unreachable, continue with this version — don't let an update
check block your work.

## 1. Configure and register (once per session)

Use the local CLI wrapper (\`./bin/agentboard\`) instead of raw \`curl\` for
routine reporting. In permissioned runtimes, this keeps the command prefix
stable so one approval can cover all future reporting commands.

\`\`\`bash
# .agentboard config in the project root
cat > .agentboard <<'EOF'
AGENTBOARD_URL=${instanceUrl}
AGENTBOARD_BOARD=${boardId}
AGENTBOARD_AGENT=YOUR_AGENT_NAME
EOF

# register agent (safe to call again)
./bin/agentboard register YOUR_AGENT_NAME "Brief description of your role"
\`\`\`

Pick a descriptive, unique name (e.g. \`claude-code-frontend-refactor\`, not
\`agent-1\`).

The CLI auto-generates a secure random session key on first register and stores
it in \`.agentboard-session-key\` for idempotent re-registers.

## 2. Core workflow

### Check what's assigned to you

\`\`\`bash
./bin/agentboard status
\`\`\`

Optional API-level filter:

\`\`\`bash
curl -s ${instanceUrl}/api/boards/${boardId}/tasks | jq '.data[] | select(.assigneeAgentId=="YOUR_AGENT_NAME")'
\`\`\`

### Create a task

\`\`\`bash
./bin/agentboard task create PROJECT_ID "Short descriptive title" medium
\`\`\`

### Plan larger work (recommended)

\`\`\`bash
./bin/agentboard plan create PROJECT_ID "Plan title"
./bin/agentboard step create PROJECT_ID PLAN_ID "Step title" 1
./bin/agentboard step start PROJECT_ID PLAN_ID STEP_ID
./bin/agentboard step done PROJECT_ID PLAN_ID STEP_ID
\`\`\`

### Update task status

\`\`\`bash
./bin/agentboard task start PROJECT_ID TASK_ID
./bin/agentboard task done PROJECT_ID TASK_ID
./bin/agentboard task block PROJECT_ID TASK_ID
\`\`\`

**Valid statuses:** \`todo\` → \`in_progress\` → \`done\`

**Valid priorities:** \`low\`, \`medium\`, \`high\`

### Heartbeats (liveness only)

\`\`\`bash
./bin/agentboard heartbeat "alive"
\`\`\`

By default, each \`./bin/agentboard\` API call also emits a heartbeat-formatted
activity entry in \`command / status / description\` format so the feed shows
what is happening.

## 3. When to report

| Moment | Action |
|--------|--------|
| Starting a session | Register yourself, check assigned tasks |
| Planning work | Create/update plan and plan steps |
| Picking up a task | Set status to \`in_progress\` |
| Significant progress | Update task or step status |
| Task complete | Set status to \`done\` |
| Switching tasks | \`done\` on old, \`in_progress\` on new |
| Blocked / waiting on human | Set task/step to \`blocked\` |
| Liveness ping | Send heartbeat |
| End of session | Ensure task/step state is accurate |

## 4. Available projects

| Project | ID | Description |
|---------|-----|-------------|
${projectsTable}

If your work doesn't fit an existing project, create one:

\`\`\`bash
curl -s -X POST ${instanceUrl}/api/boards/${boardId}/projects \\
  -H 'Content-Type: application/json' \\
  -d '{"name":"My Project","description":"What this project covers"}'
\`\`\`

## 5. If agentboard is unreachable

Don't stop working. Log a warning and continue your task. Try again at the end
of your session. The board is for visibility, not a gate on your work.

## 6. Full API reference

For all endpoints (delete, list agents, SSE events, webhooks), see:
\`${instanceUrl}/api-docs\`

## Claude Code hooks

To auto-report via hooks instead of manual commands, run:

\`\`\`bash
curl -s ${instanceUrl}/api/boards/${boardId}/install?agent=claude-code
\`\`\`

This generates hook config that fires heartbeat-based activity updates on key events.
`;

  return new Response(markdown, {
    headers: {
      "Content-Type": "text/markdown; charset=utf-8",
    },
  });
}
