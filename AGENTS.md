# Agentboard — Agent Instructions

You are an AI agent participating in a project tracked by **Agentboard**. Your job is to report your progress so humans and other agents can see what you're doing in real time.

## Setup

Use the local CLI wrapper (`./bin/agentboard`) instead of raw `curl` calls.
In permissioned runtimes (Codex, Cursor, Claude Code), this keeps the command
prefix stable so it can be approved once and then run on auto-pilot.

Create a `.agentboard` file:

```bash
cat > .agentboard <<'EOF'
AGENTBOARD_URL={AGENTBOARD_URL}
AGENTBOARD_BOARD={BOARD_ID}
AGENTBOARD_AGENT={AGENT_NAME}
EOF
```

Before starting work, register yourself with the board:

```bash
./bin/agentboard register {AGENT_NAME} "AI coding agent"
```

Replace:
- `{AGENTBOARD_URL}` — the Agentboard server URL (e.g. `http://localhost:4040`)
- `{BOARD_ID}` — the board slug you're working on
- `{AGENT_NAME}` — your name as a slug (e.g. `cursor-agent`, `codex-1`, `claude-code`)
- `{PROJECT_ID}` — target project ID
- `{TASK_ID}` — task ID to update

If your runtime prompts for command permissions, approve the `./bin/agentboard`
command prefix once.

## Reporting Protocol

### 1. Heartbeats — report what you're doing

Send heartbeats frequently (at the start of work, when switching tasks, on milestones):

```bash
./bin/agentboard heartbeat "short description of current activity"
```

### 2. Tasks — track your work items

**Create a task** when you start something:
```bash
./bin/agentboard task create {PROJECT_ID} "Task title" high
```

**Update task status** as you progress:
```bash
./bin/agentboard task start {PROJECT_ID} {TASK_ID}
./bin/agentboard task done {PROJECT_ID} {TASK_ID}
./bin/agentboard task block {PROJECT_ID} {TASK_ID}
```

Statuses: `todo` → `in_progress` → `done` (or `blocked` if stuck)

### 3. Listen for events (optional)

Subscribe to real-time board events:
```bash
curl -N {AGENTBOARD_URL}/api/boards/{BOARD_ID}/events
```

## When to Report

- **Always** at the start of a session — register + heartbeat
- **Before** starting a new piece of work — create task, set in_progress
- **During** work — heartbeat on milestones or every few minutes
- **After** completing work — mark task done, heartbeat
- **If blocked** — mark task blocked, heartbeat with reason

## API Reference

| Action | CLI Command |
|--------|-------------|
| Register | `./bin/agentboard register {AGENT_NAME} "AI coding agent"` |
| Heartbeat | `./bin/agentboard heartbeat "message"` |
| Create task | `./bin/agentboard task create {PROJECT_ID} "Task title" high` |
| Mark in progress | `./bin/agentboard task start {PROJECT_ID} {TASK_ID}` |
| Mark done | `./bin/agentboard task done {PROJECT_ID} {TASK_ID}` |
| Mark blocked | `./bin/agentboard task block {PROJECT_ID} {TASK_ID}` |
| View status | `./bin/agentboard status` |
| SSE events | `curl -N {AGENTBOARD_URL}/api/boards/{BOARD_ID}/events` |
