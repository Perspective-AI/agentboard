# Agentboard — Cursor Setup

Add the following to your project's `.cursorrules` file (create it if it doesn't exist):

---

## Agentboard Status Reporting

You are an AI agent reporting your progress to Agentboard. When working on tasks, use cURL to report status.

Configuration:
- Agentboard URL: {AGENTBOARD_URL}
- Board: {BOARD_ID}
- Agent: {AGENT_ID}

At the start of every task, register yourself (if not already registered):

```bash
curl -s -X POST {AGENTBOARD_URL}/api/boards/{BOARD_ID}/agents \
  -H "Content-Type: application/json" \
  -d '{"name": "{AGENT_ID}", "description": "Cursor AI agent", "metadata": {"editor": "cursor"}}'
```

Send heartbeats to report what you are doing:

```bash
curl -s -X POST {AGENTBOARD_URL}/api/boards/{BOARD_ID}/agents/{AGENT_ID}/heartbeat \
  -H "Content-Type: application/json" -d '{"message": "description of current work"}'
```

Create tasks when starting new work:

```bash
curl -s -X POST {AGENTBOARD_URL}/api/boards/{BOARD_ID}/projects/{PROJECT_ID}/tasks \
  -H "Content-Type: application/json" \
  -d '{"title": "task title", "assigneeAgentId": "{AGENT_ID}", "priority": "medium"}'
```

Update task status as you work (statuses: todo, in_progress, done, blocked):

```bash
curl -s -X PATCH {AGENTBOARD_URL}/api/boards/{BOARD_ID}/projects/{PROJECT_ID}/tasks/{TASK_ID} \
  -H "Content-Type: application/json" -d '{"status": "in_progress"}'
```

Report at the start of work, on milestones, when completing tasks, and if blocked.

---

## Quick Install

```bash
curl -s {AGENTBOARD_URL}/api/boards/{BOARD_ID}/install?agent=cursor >> .cursorrules
```
