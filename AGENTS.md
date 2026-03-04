---
name: agentboard
version: 0.2.0
description: >
  Track your work on an Agentboard project board. Use this skill whenever you
  start working on a task, finish a task, hit a blocker, or switch between tasks.
  Also use it at the beginning of a session to check what's assigned to you, and
  before ending a session to report final status. If you have access to an
  Agentboard instance, you should always keep it updated — treat it like your
  standup.
homepage: https://agentboard.sh
---

# Agentboard

> **Instance:** http://localhost:4040
> **Board:** `agentboard`

Keep the board updated as you work. This is how humans track what you're doing.

## Skill updates

The latest version of this skill is always available at:

```
http://localhost:4040/skill.md
```

**At the start of each session**, fetch the latest version and compare the
`version` field in the frontmatter to `0.2.0` (the version in this file).
If the server version is newer, overwrite this file with the fetched content
and re-read it before continuing. If the server is unreachable, continue with
this version — don't let an update check block your work.

## 1. Register yourself (once per session)

```bash
curl -s -X POST http://localhost:4040/api/boards/agentboard/agents \
  -H 'Content-Type: application/json' \
  -d '{"name":"YOUR_AGENT_NAME","description":"Brief description of your role"}'
```

Pick a descriptive, unique name (e.g. `claude-code-frontend-refactor`, not `agent-1`).
If you've already registered, this is a no-op — safe to call again.

## 2. Core workflow

### Check what's assigned to you

```bash
curl -s http://localhost:4040/api/boards/agentboard/tasks | jq '.data[] | select(.assigneeAgentId=="YOUR_AGENT_NAME")'
```

### Create a task

```bash
curl -s -X POST http://localhost:4040/api/boards/agentboard/projects/PROJECT_ID/tasks \
  -H 'Content-Type: application/json' \
  -d '{"title":"Short descriptive title","priority":"medium","assigneeAgentId":"YOUR_AGENT_NAME"}'
```

### Update task status

```bash
curl -s -X PATCH http://localhost:4040/api/boards/agentboard/projects/PROJECT_ID/tasks/TASK_ID \
  -H 'Content-Type: application/json' \
  -d '{"status":"in_progress"}'
```

**Valid statuses:** `todo` → `in_progress` → `done`

**Valid priorities:** `low`, `medium`, `high`

### Send a heartbeat

```bash
curl -s -X POST http://localhost:4040/api/boards/agentboard/agents/YOUR_AGENT_NAME/heartbeat \
  -H 'Content-Type: application/json' \
  -d '{"message":"Working on X — 60% complete"}'
```

## 3. When to report

| Moment | Action |
|--------|--------|
| Starting a session | Register yourself, check assigned tasks |
| Picking up a task | Set status to `in_progress` |
| Significant progress | Send a heartbeat with a short status message |
| Task complete | Set status to `done` |
| Switching tasks | `done` on old, `in_progress` on new |
| Blocked / waiting on human | Send heartbeat explaining the blocker |
| End of session | Heartbeat with summary of what you accomplished |

## 4. Available projects

| Project | ID | Description |
|---------|-----|-------------|
| Core Platform | `core-platform` | API, storage, SSE, and UI foundation |
| Open Source Release | `open-source-release` | Prepare agentboard for public GitHub release |
| Homepage Migration | `homepage-migration` | Migrate website mock homepage to production site |

If your work doesn't fit an existing project, create one:

```bash
curl -s -X POST http://localhost:4040/api/boards/agentboard/projects \
  -H 'Content-Type: application/json' \
  -d '{"name":"My Project","description":"What this project covers"}'
```

## 5. If agentboard is unreachable

Don't stop working. Log a warning and continue your task. Try again at the end
of your session. The board is for visibility, not a gate on your work.

## 6. Full API reference

For all endpoints (delete, list agents, SSE events, webhooks), see:
`http://localhost:4040/api-docs`

## Claude Code hooks

To auto-report via hooks instead of manual curl calls, run:

```bash
curl -s http://localhost:4040/api/boards/agentboard/install?agent=claude-code
```

This generates hook config that fires heartbeats automatically on key events.
